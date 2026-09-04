// EmoShelf Rust 基盤（UI を持たない部分）
// - 状態の保存 / 復元（state.json、アトミック書き込み）
// - グローバルショートカットでの表示切替
// - クリップボード経由のペースト（Ctrl+V シミュレーション）
// - 二重起動抑止、ウィンドウ状態の自動復元
//
// 仕様の正本は app/docs/persistence.md。

use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::sync::Mutex;
use std::time::Duration;

#[cfg(windows)]
use std::sync::atomic::{AtomicIsize, Ordering};

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt as AutostartManagerExt};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

#[cfg(windows)]
use windows::core::PWSTR;
#[cfg(windows)]
use windows::Win32::Foundation::{CloseHandle, HWND, LPARAM, LRESULT, POINT, RECT, WPARAM};
#[cfg(windows)]
use windows::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MonitorFromWindow, ScreenToClient, MONITORINFOEXW, MONITOR_DEFAULTTONEAREST,
};
#[cfg(windows)]
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};
#[cfg(windows)]
use windows::Win32::UI::HiDpi::GetDpiForWindow;
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::{
    CallWindowProcW, DefWindowProcW, GetClientRect, GetForegroundWindow, GetWindowThreadProcessId,
    SetForegroundWindow, SetWindowLongPtrW, GWLP_WNDPROC, HTCLIENT, HTMAXBUTTON, WM_NCHITTEST,
    WNDPROC,
};

/// 状態ファイル名（appLocalData 直下に保存）。
const STATE_FILE_NAME: &str = "state.json";
/// 状態バックアップ名（本体が壊れていた場合の復旧用）。
const STATE_BACKUP_NAME: &str = "state.json.bak";
/// 一時ファイルの拡張子（アトミック保存用）。
const STATE_TMP_EXTENSION: &str = "json.tmp";
/// ペースト前にフォーカス復帰を待つ時間。
const PASTE_FOCUS_WAIT: Duration = Duration::from_millis(120);
/// 既定のグローバルショートカット（設定読み込み前のフォールバック）。
const DEFAULT_SHORTCUT: &str = "alt+e";
/// Windowsサインイン時はUIを出さずTrayに待機する。
const AUTOSTART_ARG: &str = "--autostart";
/// `.emoshelf` container format and supported application state versions.
const EMOSHELF_FORMAT_VERSION: u32 = 1;
const SUPPORTED_STATE_SCHEMA: u32 = 2;
const MAX_EMOSHELF_BYTES: u64 = 64 * 1024 * 1024;
const MAX_STATE_JSON_BYTES: u64 = 8 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES: usize = 128;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct EmoShelfManifest {
    format: String,
    format_version: u32,
    schema_version: u32,
    exported_at: String,
    app_version: String,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct EmoShelfImportPreview {
    manifest: EmoShelfManifest,
    state_json: String,
    board_count: usize,
    item_count: usize,
}

/// 現在登録中のグローバルショートカット（差し替え時に解除するため保持）。
struct ActiveShortcut(Mutex<Option<Shortcut>>);

/// ショートカットを押す直前に前面だったウィンドウ。フルパスやタイトルは保持しない。
struct PasteTarget(Mutex<Option<isize>>);

#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ForegroundContext {
    executable: String,
    monitor: String,
}

/// アプリ別Board用の直近コンテキスト。フルパスとウィンドウタイトルは保持しない。
struct CapturedContext(Mutex<Option<ForegroundContext>>);

#[derive(Default)]
struct RuntimePreferences {
    per_app_boards_enabled: bool,
    active_monitor_positioning: bool,
}

struct ContextPreferences(Mutex<RuntimePreferences>);

#[cfg(windows)]
static ORIGINAL_WNDPROC: AtomicIsize = AtomicIsize::new(0);

#[cfg(windows)]
fn hwnd_to_isize(hwnd: HWND) -> isize {
    hwnd.0 as isize
}

#[cfg(windows)]
fn isize_to_hwnd(value: isize) -> HWND {
    HWND(value as *mut core::ffi::c_void)
}

fn executable_basename(path: &str) -> Option<String> {
    let name = path
        .rsplit(['/', '\\'])
        .next()
        .map(str::trim)
        .filter(|value| !value.is_empty())?;
    Some(name.to_lowercase())
}

#[cfg(windows)]
fn monitor_snapshot(hwnd: HWND) -> Option<(String, RECT)> {
    // SAFETY: Windows validates the HWND; nearest-monitor fallback always returns a monitor.
    let monitor = unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST) };
    if monitor.is_invalid() {
        return None;
    }
    let mut info = MONITORINFOEXW::default();
    info.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
    // SAFETY: info has the documented size and remains valid for the duration of the call.
    if !unsafe { GetMonitorInfoW(monitor, &raw mut info.monitorInfo) }.as_bool() {
        return None;
    }
    let end = info
        .szDevice
        .iter()
        .position(|unit| *unit == 0)
        .unwrap_or(info.szDevice.len());
    let name = String::from_utf16_lossy(&info.szDevice[..end]);
    Some((name, info.monitorInfo.rcWork))
}

#[cfg(windows)]
fn foreground_context(hwnd: HWND) -> Option<ForegroundContext> {
    let mut process_id = 0;
    // SAFETY: Windows only writes the process id associated with this HWND.
    if unsafe { GetWindowThreadProcessId(hwnd, Some(&raw mut process_id)) } == 0 || process_id == 0
    {
        return None;
    }
    // SAFETY: The handle requests only limited query access and is closed before returning.
    let process =
        unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id) }.ok()?;
    let mut buffer = vec![0_u16; 32_768];
    let mut size = buffer.len() as u32;
    // SAFETY: buffer is writable for `size` UTF-16 units and process is a valid open handle.
    let query_result = unsafe {
        QueryFullProcessImageNameW(
            process,
            PROCESS_NAME_WIN32,
            PWSTR(buffer.as_mut_ptr()),
            &mut size,
        )
    };
    // SAFETY: process was returned by OpenProcess and is no longer used after this point.
    let _ = unsafe { CloseHandle(process) };
    query_result.ok()?;
    let full_path = String::from_utf16_lossy(&buffer[..size as usize]);
    let executable = executable_basename(&full_path)?;
    let (monitor, _) = monitor_snapshot(hwnd)?;
    Some(ForegroundContext {
        executable,
        monitor,
    })
}

#[cfg(windows)]
fn position_main_window_for_target(app: &tauri::AppHandle, target: HWND) {
    let active_monitor_positioning = app
        .state::<ContextPreferences>()
        .0
        .lock()
        .map(|guard| guard.active_monitor_positioning)
        .unwrap_or(true);
    if !active_monitor_positioning {
        return;
    }
    let Some((_, work_area)) = monitor_snapshot(target) else {
        return;
    };
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let Ok(size) = window.outer_size() else {
        return;
    };
    let width = i32::try_from(size.width).unwrap_or(i32::MAX);
    let height = i32::try_from(size.height).unwrap_or(i32::MAX);
    let work_width = work_area.right.saturating_sub(work_area.left);
    let work_height = work_area.bottom.saturating_sub(work_area.top);
    let x = work_area.left + (work_width.saturating_sub(width)) / 2;
    let y = work_area.top + (work_height.saturating_sub(height)) / 3;
    let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
}

#[cfg(windows)]
fn remember_foreground_target(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let Ok(own_hwnd) = window.hwnd() else {
        return;
    };
    // SAFETY: GetForegroundWindow only reads the current desktop foreground handle.
    let foreground = unsafe { GetForegroundWindow() };
    if foreground.is_invalid() || foreground == own_hwnd {
        return;
    }
    if let Ok(mut guard) = app.state::<PasteTarget>().0.lock() {
        *guard = Some(hwnd_to_isize(foreground));
    }
    position_main_window_for_target(app, foreground);
    let per_app_enabled = app
        .state::<ContextPreferences>()
        .0
        .lock()
        .map(|guard| guard.per_app_boards_enabled)
        .unwrap_or(false);
    let context = if per_app_enabled {
        foreground_context(foreground).filter(|value| value.executable != "emoshelf.exe")
    } else {
        None
    };
    if let Ok(mut guard) = app.state::<CapturedContext>().0.lock() {
        *guard = context;
    }
}

#[cfg(not(windows))]
fn remember_foreground_target(_app: &tauri::AppHandle) {}

#[cfg(windows)]
unsafe extern "system" fn snap_window_proc(
    hwnd: HWND,
    message: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    let previous = ORIGINAL_WNDPROC.load(Ordering::Relaxed);
    let base_result = if previous == 0 {
        // SAFETY: The values are passed through unchanged from Windows.
        unsafe { DefWindowProcW(hwnd, message, wparam, lparam) }
    } else {
        // SAFETY: SetWindowLongPtrW returned the previous procedure for this exact window.
        let previous_proc: WNDPROC = unsafe { std::mem::transmute(previous) };
        unsafe { CallWindowProcW(previous_proc, hwnd, message, wparam, lparam) }
    };

    if message != WM_NCHITTEST || base_result.0 != HTCLIENT as isize {
        return base_result;
    }

    let packed = lparam.0;
    let mut point = POINT {
        x: (packed as i16) as i32,
        y: ((packed >> 16) as i16) as i32,
    };
    let mut rect = RECT::default();
    // SAFETY: hwnd is the window currently receiving WM_NCHITTEST and both pointers are valid.
    if !unsafe { ScreenToClient(hwnd, &mut point) }.as_bool()
        || unsafe { GetClientRect(hwnd, &mut rect) }.is_err()
    {
        return base_result;
    }

    // CSS titlebar 48px and Windows control width 46px, converted to physical pixels.
    let dpi = unsafe { GetDpiForWindow(hwnd) }.max(96) as i32;
    let title_height = 48 * dpi / 96;
    let control_width = 46 * dpi / 96;
    let max_left = rect.right - control_width * 2;
    let max_right = rect.right - control_width;
    if point.y >= 0 && point.y < title_height && point.x >= max_left && point.x < max_right {
        return LRESULT(HTMAXBUTTON as isize);
    }

    base_result
}

#[cfg(windows)]
fn install_snap_layout_hit_test(window: &tauri::Window) -> Result<(), String> {
    if ORIGINAL_WNDPROC.load(Ordering::Relaxed) != 0 {
        return Ok(());
    }
    let hwnd = window.hwnd().map_err(|error| error.to_string())?;
    // SAFETY: We replace the procedure only for EmoShelf's single main window and keep the old pointer.
    let previous =
        unsafe { SetWindowLongPtrW(hwnd, GWLP_WNDPROC, snap_window_proc as *const () as isize) };
    if previous == 0 {
        return Err("failed to install Windows hit-test procedure".to_string());
    }
    ORIGINAL_WNDPROC.store(previous, Ordering::Relaxed);
    Ok(())
}

#[cfg(not(windows))]
fn install_snap_layout_hit_test(_window: &tauri::Window) -> Result<(), String> {
    Ok(())
}

/// メインウィンドウの表示 / 非表示を切り替える。
fn toggle_main_window(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let visible = window.is_visible().unwrap_or(false);
    if visible {
        let _ = window.hide();
    } else {
        remember_foreground_target(app);
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn reveal_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// 状態ファイル（本体・バックアップ）のパスを返す。ディレクトリは作成する。
fn state_file_paths(app: &tauri::AppHandle) -> Result<(PathBuf, PathBuf), String> {
    let dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok((dir.join(STATE_FILE_NAME), dir.join(STATE_BACKUP_NAME)))
}

/// 状態を読み込む。ファイルがなければ `None`。
/// 本体が壊れていたらバックアップから復旧を試みる（詳細は persistence.md）。
fn load_state_from_paths(path: &Path, backup: &Path) -> Result<Option<String>, String> {
    for candidate in [path, backup] {
        match std::fs::read_to_string(candidate) {
            Ok(content) => {
                // JSON として壊れていないものだけ採用する
                if serde_json::from_str::<serde_json::Value>(&content).is_ok() {
                    return Ok(Some(content));
                }
            }
            Err(_) => continue,
        }
    }
    Ok(None)
}

/// 状態を保存する。既存ファイルはバックアップに退避し、
/// 一時ファイルへの書き込み + rename でアトミックに置き換える。
fn save_state_to_paths(path: &Path, backup: &Path, content: &str) -> Result<(), String> {
    // 保存前に JSON として正当なことだけ確認する（スキーマ検証はフロント側）
    let value: serde_json::Value = serde_json::from_str(content).map_err(|e| e.to_string())?;
    let pretty = serde_json::to_string_pretty(&value).map_err(|e| e.to_string())?;
    if path.exists() {
        std::fs::copy(path, backup).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension(STATE_TMP_EXTENSION);
    std::fs::write(&tmp, pretty).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, path).map_err(|e| e.to_string())?;
    Ok(())
}

/// 状態を読み込む（Tauri コマンド）。
#[tauri::command]
fn load_state(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (path, backup) = state_file_paths(&app)?;
    load_state_from_paths(&path, &backup)
}

/// 状態を保存する（Tauri コマンド）。
#[tauri::command]
fn save_state(app: tauri::AppHandle, content: String) -> Result<(), String> {
    let (path, backup) = state_file_paths(&app)?;
    save_state_to_paths(&path, &backup, &content)
}

fn state_schema_and_counts(content: &str) -> Result<(u32, usize, usize), String> {
    if content.len() as u64 > MAX_STATE_JSON_BYTES {
        return Err("state.json exceeds the 8 MiB safety limit".to_string());
    }
    let value: serde_json::Value = serde_json::from_str(content).map_err(|e| e.to_string())?;
    let object = value
        .as_object()
        .ok_or_else(|| "state.json must contain an object".to_string())?;
    let schema = object
        .get("schemaVersion")
        .and_then(serde_json::Value::as_u64)
        .and_then(|value| u32::try_from(value).ok())
        .ok_or_else(|| "state.json schemaVersion is missing".to_string())?;
    if schema > SUPPORTED_STATE_SCHEMA {
        return Err(format!(
            "state schema {schema} is newer than supported schema {SUPPORTED_STATE_SCHEMA}"
        ));
    }
    let boards = object
        .get("boards")
        .and_then(serde_json::Value::as_array)
        .ok_or_else(|| "state.json boards must be an array".to_string())?;
    let item_count = boards
        .iter()
        .filter_map(|board| board.get("items")?.as_array())
        .map(Vec::len)
        .sum();
    Ok((schema, boards.len(), item_count))
}

fn normalized_emoshelf_path(path: &Path) -> PathBuf {
    if path.extension().and_then(|value| value.to_str()) == Some("emoshelf") {
        path.to_path_buf()
    } else {
        path.with_extension("emoshelf")
    }
}

fn write_emoshelf_to_path(
    requested_path: &Path,
    state_json: &str,
    exported_at: &str,
) -> Result<PathBuf, String> {
    let (schema_version, _, _) = state_schema_and_counts(state_json)?;
    if schema_version != SUPPORTED_STATE_SCHEMA {
        return Err(format!(
            "only schema {SUPPORTED_STATE_SCHEMA} can be exported"
        ));
    }
    let path = normalized_emoshelf_path(requested_path);
    let parent = path
        .parent()
        .ok_or_else(|| "export destination has no parent directory".to_string())?;
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let temporary = path.with_extension("emoshelf.tmp");
    let backup = path.with_extension("emoshelf.bak");
    if temporary.exists() {
        std::fs::remove_file(&temporary).map_err(|e| e.to_string())?;
    }

    let manifest = EmoShelfManifest {
        format: "emoshelf".to_string(),
        format_version: EMOSHELF_FORMAT_VERSION,
        schema_version,
        exported_at: exported_at.to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
    };
    let manifest_json = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
    let file = std::fs::File::create(&temporary).map_err(|e| e.to_string())?;
    let mut archive = ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o644);
    archive
        .start_file("manifest.json", options)
        .map_err(|e| e.to_string())?;
    archive
        .write_all(manifest_json.as_bytes())
        .map_err(|e| e.to_string())?;
    archive
        .start_file("state.json", options)
        .map_err(|e| e.to_string())?;
    archive
        .write_all(state_json.as_bytes())
        .map_err(|e| e.to_string())?;
    archive.finish().map_err(|e| e.to_string())?;

    let had_existing = path.exists();
    if had_existing {
        if backup.exists() {
            std::fs::remove_file(&backup).map_err(|e| e.to_string())?;
        }
        std::fs::rename(&path, &backup).map_err(|e| e.to_string())?;
    }
    if let Err(error) = std::fs::rename(&temporary, &path) {
        if had_existing {
            let _ = std::fs::rename(&backup, &path);
        }
        return Err(error.to_string());
    }
    if had_existing {
        let _ = std::fs::remove_file(backup);
    }
    Ok(path)
}

fn read_zip_text<R: Read>(reader: &mut R, max_bytes: u64) -> Result<String, String> {
    let mut bytes = Vec::new();
    reader
        .take(max_bytes + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() as u64 > max_bytes {
        return Err("archive entry exceeds its safety limit".to_string());
    }
    String::from_utf8(bytes).map_err(|_| "archive entry is not UTF-8".to_string())
}

fn preview_emoshelf_from_path(path: &Path) -> Result<EmoShelfImportPreview, String> {
    let metadata = std::fs::metadata(path).map_err(|e| e.to_string())?;
    if !metadata.is_file() || metadata.len() > MAX_EMOSHELF_BYTES {
        return Err(".emoshelf file is missing or exceeds 64 MiB".to_string());
    }
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    if archive.len() > MAX_ARCHIVE_ENTRIES {
        return Err(".emoshelf contains too many entries".to_string());
    }

    let mut manifest_json = None;
    let mut state_json = None;
    let mut contains_assets = false;
    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|e| e.to_string())?;
        let enclosed = entry
            .enclosed_name()
            .ok_or_else(|| "unsafe path in .emoshelf archive".to_string())?;
        if entry
            .unix_mode()
            .is_some_and(|mode| mode & 0o170000 == 0o120000)
        {
            return Err("symbolic links are not allowed in .emoshelf".to_string());
        }
        let name = enclosed
            .to_str()
            .ok_or_else(|| "archive path is not valid UTF-8".to_string())?
            .replace('\\', "/");
        match name.as_str() {
            "manifest.json" => {
                if manifest_json.is_some() {
                    return Err("duplicate manifest.json".to_string());
                }
                manifest_json = Some(read_zip_text(&mut entry, 64 * 1024)?);
            }
            "state.json" => {
                if state_json.is_some() {
                    return Err("duplicate state.json".to_string());
                }
                state_json = Some(read_zip_text(&mut entry, MAX_STATE_JSON_BYTES)?);
            }
            _ if name.starts_with("assets/") => {
                if entry.size() > MAX_EMOSHELF_BYTES {
                    return Err("archive asset exceeds its safety limit".to_string());
                }
                contains_assets |= !entry.is_dir();
            }
            _ if name.starts_with("licenses/") => {}
            _ if entry.is_dir() => {}
            _ => return Err(format!("unsupported archive entry: {name}")),
        }
    }

    let manifest: EmoShelfManifest = serde_json::from_str(
        manifest_json
            .as_deref()
            .ok_or_else(|| "manifest.json is missing".to_string())?,
    )
    .map_err(|e| e.to_string())?;
    if manifest.format != "emoshelf" || manifest.format_version != EMOSHELF_FORMAT_VERSION {
        return Err("unsupported .emoshelf format".to_string());
    }
    if manifest.schema_version > SUPPORTED_STATE_SCHEMA {
        return Err(format!(
            "state schema {} is newer than supported schema {SUPPORTED_STATE_SCHEMA}",
            manifest.schema_version
        ));
    }
    if contains_assets {
        return Err("custom assets require EmoShelf v0.4 or newer".to_string());
    }
    let state_json = state_json.ok_or_else(|| "state.json is missing".to_string())?;
    let (schema_version, board_count, item_count) = state_schema_and_counts(&state_json)?;
    let state_value: serde_json::Value =
        serde_json::from_str(&state_json).map_err(|e| e.to_string())?;
    if state_value
        .get("customAssets")
        .and_then(serde_json::Value::as_object)
        .is_some_and(|assets| !assets.is_empty())
    {
        return Err("custom assets require EmoShelf v0.4 or newer".to_string());
    }
    if schema_version != manifest.schema_version {
        return Err("manifest and state schema versions do not match".to_string());
    }
    Ok(EmoShelfImportPreview {
        manifest,
        state_json,
        board_count,
        item_count,
    })
}

#[tauri::command]
fn export_emoshelf(
    path: String,
    state_json: String,
    exported_at: String,
) -> Result<String, String> {
    write_emoshelf_to_path(Path::new(&path), &state_json, &exported_at)
        .map(|path| path.to_string_lossy().into_owned())
}

#[tauri::command]
fn preview_emoshelf(path: String) -> Result<EmoShelfImportPreview, String> {
    preview_emoshelf_from_path(Path::new(&path))
}

#[tauri::command]
fn get_foreground_context(app: tauri::AppHandle) -> Result<Option<ForegroundContext>, String> {
    app.state::<CapturedContext>()
        .0
        .lock()
        .map(|guard| guard.clone())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn set_context_preferences(
    app: tauri::AppHandle,
    per_app_boards_enabled: bool,
    popup_position_behavior: String,
) -> Result<(), String> {
    let active_monitor_positioning = match popup_position_behavior.as_str() {
        "active-monitor" => true,
        "remember-last" => false,
        _ => return Err("unsupported popup position behavior".to_string()),
    };
    let preferences_state = app.state::<ContextPreferences>();
    let mut preferences = preferences_state
        .0
        .lock()
        .map_err(|error| error.to_string())?;
    preferences.per_app_boards_enabled = per_app_boards_enabled;
    preferences.active_monitor_positioning = active_monitor_positioning;
    drop(preferences);
    if !per_app_boards_enabled {
        let context_state = app.state::<CapturedContext>();
        let mut context = context_state.0.lock().map_err(|error| error.to_string())?;
        *context = None;
    }
    Ok(())
}

#[tauri::command]
fn get_autostart(app: tauri::AppHandle) -> Result<bool, String> {
    app.autolaunch()
        .is_enabled()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    if enabled {
        app.autolaunch().enable()
    } else {
        app.autolaunch().disable()
    }
    .map_err(|error| error.to_string())
}

/// 文字列をショートカットへ変換する（"Alt+E" のような表示形式も受理）。
fn parse_shortcut(input: &str) -> Result<Shortcut, String> {
    let normalized = input.trim().to_lowercase();
    if normalized.is_empty() {
        return Err("shortcut must not be empty".to_string());
    }
    Shortcut::from_str(&normalized).map_err(|e| e.to_string())
}

/// グローバルショートカットを差し替える（設定変更時にフロントから呼ぶ）。
/// 表記は "Alt+E" のような表示形式を受け付ける。
#[tauri::command]
fn set_global_shortcut(app: tauri::AppHandle, shortcut: String) -> Result<(), String> {
    let parsed = parse_shortcut(&shortcut)?;
    let state = app.state::<ActiveShortcut>();
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    // 同じショートカットなら二重登録せず成功扱いにする
    if guard.as_ref() == Some(&parsed) {
        return Ok(());
    }
    // 新キーを先に登録する（失敗時は旧キーを維持）
    app.global_shortcut()
        .register(parsed)
        .map_err(|e| e.to_string())?;
    // 旧キーを解除する。失敗時は新キーを解除して旧キーを維持するロールバックを試みる
    if let Some(prev) = guard.take() {
        if let Err(e) = app.global_shortcut().unregister(prev) {
            let _ = app.global_shortcut().unregister(parsed);
            *guard = Some(prev);
            return Err(format!("failed to unregister previous shortcut: {e}"));
        }
    }
    *guard = Some(parsed);
    Ok(())
}

/// Ctrl+V を押下する（フォアグラウンドアプリへのペースト用）。
fn press_ctrl_v() -> Result<(), String> {
    use enigo::{Direction, Enigo, Key, Keyboard, Settings};
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    enigo
        .key(Key::Control, Direction::Press)
        .map_err(|e| e.to_string())?;
    let result = enigo
        .key(Key::Unicode('v'), Direction::Click)
        .map_err(|e| e.to_string());
    let _ = enigo.key(Key::Control, Direction::Release);
    result
}

#[cfg(windows)]
fn focus_paste_target(app: &tauri::AppHandle) {
    let target = app
        .state::<PasteTarget>()
        .0
        .lock()
        .ok()
        .and_then(|guard| *guard);
    if let Some(target) = target {
        // SAFETY: The handle was captured from GetForegroundWindow. Windows validates stale handles.
        let _ = unsafe { SetForegroundWindow(isize_to_hwnd(target)) };
    }
}

#[cfg(not(windows))]
fn focus_paste_target(_app: &tauri::AppHandle) {}

/// ペイロードをペーストする: クリップボードへ書き込み → 自分を隠す →
/// フォーカス復帰を待つ → Ctrl+V。Tauri の同期コマンドとして実行する
///（ブロッキングプール上で動くため短い sleep は問題ない）。
#[tauri::command]
fn paste_payload(
    app: tauri::AppHandle,
    payload: String,
    keep_open: Option<bool>,
) -> Result<(), String> {
    if payload.is_empty() {
        return Err("payload must not be empty".to_string());
    }
    app.clipboard()
        .write_text(payload)
        .map_err(|e| e.to_string())?;
    if !keep_open.unwrap_or(false) {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.hide();
        }
    }
    focus_paste_target(&app);
    std::thread::sleep(PASTE_FOCUS_WAIT);
    press_ctrl_v()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ActiveShortcut(Mutex::new(None)))
        .manage(PasteTarget(Mutex::new(None)))
        .manage(CapturedContext(Mutex::new(None)))
        .manage(ContextPreferences(Mutex::new(RuntimePreferences {
            per_app_boards_enabled: false,
            active_monitor_positioning: true,
        })))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![AUTOSTART_ARG]),
        ))
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::POSITION
                        | tauri_plugin_window_state::StateFlags::MAXIMIZED,
                )
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 二重起動で呼び出した前面アプリも、貼り付け先として保持する。
            remember_foreground_target(app);
            reveal_main_window(app);
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        toggle_main_window(app);
                    }
                })
                .build(),
        )
        .on_page_load(|window, _payload| {
            if let Err(error) = install_snap_layout_hit_test(&window.window()) {
                eprintln!("EmoShelf: native Snap Layout integration unavailable: {error}");
            }
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "Open EmoShelf", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;
            let mut tray = TrayIconBuilder::with_id("main")
                .tooltip("EmoShelf — Alt+E")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        remember_foreground_target(app);
                        reveal_main_window(app);
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        remember_foreground_target(tray.app_handle());
                        reveal_main_window(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;

            if std::env::args().any(|argument| argument == AUTOSTART_ARG) {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            // 設定読み込み前のフォールバックとして既定ショートカットを登録する。
            // 登録失敗でも起動は継続し、ActiveShortcut は成功時のみ更新する。
            let shortcut = match parse_shortcut(DEFAULT_SHORTCUT) {
                Ok(shortcut) => shortcut,
                Err(_) => return Ok(()),
            };
            if let Err(error) = app.global_shortcut().register(shortcut) {
                eprintln!("EmoShelf: default shortcut registration failed: {error}");
                return Ok(());
            }
            let state = app.state::<ActiveShortcut>();
            if let Ok(mut guard) = state.0.lock() {
                *guard = Some(shortcut);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            set_global_shortcut,
            paste_payload,
            export_emoshelf,
            preview_emoshelf,
            get_foreground_context,
            set_context_preferences,
            get_autostart,
            set_autostart
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    /// テスト用の一時ディレクトリ。標準ライブラリだけで衝突しない名前を生成し、
    /// ドロップ時に自分が作ったディレクトリだけを削除する。
    struct TempDir(PathBuf);

    impl TempDir {
        fn new(name: &str) -> Self {
            let unique = format!(
                "emoshelf-test-{}-{}-{}",
                std::process::id(),
                name,
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .expect("system time before epoch")
                    .as_nanos()
            );
            let dir = std::env::temp_dir().join(unique);
            std::fs::create_dir_all(&dir).expect("create temp dir");
            TempDir(dir)
        }

        fn path(&self) -> &Path {
            &self.0
        }
    }

    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    const VALID_JSON: &str = r#"{"schemaVersion":1,"boards":[]}"#;
    const VALID_V2_JSON: &str = r#"{"schemaVersion":2,"boards":[{"id":"a","items":[{"id":"x"}]}]}"#;

    fn write_test_archive(path: &Path, entries: &[(&str, &str)]) {
        let file = std::fs::File::create(path).expect("create test archive");
        let mut archive = ZipWriter::new(file);
        let options = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);
        for (name, content) in entries {
            archive.start_file(*name, options).expect("start entry");
            archive.write_all(content.as_bytes()).expect("write entry");
        }
        archive.finish().expect("finish archive");
    }

    #[test]
    fn load_returns_none_when_no_state_file() {
        let dir = TempDir::new("no-state");
        let path = dir.path().join(STATE_FILE_NAME);
        let backup = dir.path().join(STATE_BACKUP_NAME);
        assert_eq!(load_state_from_paths(&path, &backup), Ok(None));
    }

    #[test]
    fn save_then_load_roundtrips() {
        let dir = TempDir::new("roundtrip");
        let path = dir.path().join(STATE_FILE_NAME);
        let backup = dir.path().join(STATE_BACKUP_NAME);
        save_state_to_paths(&path, &backup, VALID_JSON).expect("save should succeed");
        let loaded = load_state_from_paths(&path, &backup)
            .expect("load should succeed")
            .expect("state should exist");
        let value: serde_json::Value = serde_json::from_str(&loaded).expect("loaded json");
        assert_eq!(value["schemaVersion"], 1);
    }

    #[test]
    fn second_save_keeps_previous_content_in_backup() {
        let dir = TempDir::new("backup");
        let path = dir.path().join(STATE_FILE_NAME);
        let backup = dir.path().join(STATE_BACKUP_NAME);
        let first = r#"{"schemaVersion":1,"boards":[],"note":"first"}"#;
        let second = r#"{"schemaVersion":1,"boards":[],"note":"second"}"#;
        save_state_to_paths(&path, &backup, first).expect("first save");
        save_state_to_paths(&path, &backup, second).expect("second save");
        let bak: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&backup).expect("backup exists"))
                .expect("backup is json");
        assert_eq!(bak["note"], "first");
        let main: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&path).expect("main exists"))
                .expect("main is json");
        assert_eq!(main["note"], "second");
    }

    #[test]
    fn recovers_from_backup_when_main_is_corrupted() {
        let dir = TempDir::new("recover");
        let path = dir.path().join(STATE_FILE_NAME);
        let backup = dir.path().join(STATE_BACKUP_NAME);
        // 2 回保存してバックアップを作ってから、本体だけを破損させる
        save_state_to_paths(&path, &backup, VALID_JSON).expect("first save");
        save_state_to_paths(&path, &backup, VALID_JSON).expect("second save");
        std::fs::write(&path, "not json at all").expect("corrupt main");
        let loaded = load_state_from_paths(&path, &backup)
            .expect("load should succeed")
            .expect("should recover from backup");
        let value: serde_json::Value = serde_json::from_str(&loaded).expect("recovered json");
        assert_eq!(value["schemaVersion"], 1);
    }

    #[test]
    fn rejects_invalid_json_without_touching_existing_main() {
        let dir = TempDir::new("reject");
        let path = dir.path().join(STATE_FILE_NAME);
        let backup = dir.path().join(STATE_BACKUP_NAME);
        save_state_to_paths(&path, &backup, VALID_JSON).expect("save valid");
        let result = save_state_to_paths(&path, &backup, "not json");
        assert!(result.is_err());
        let main: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&path).expect("main still exists"))
                .expect("main unchanged");
        assert_eq!(main["schemaVersion"], 1);
        // 不正 JSON はバックアップ退避前に拒否されるため、バックアップは作られない
        assert!(!backup.exists());
    }

    #[test]
    fn parse_accepts_valid_shortcuts() {
        assert!(parse_shortcut("alt+e").is_ok());
        assert!(parse_shortcut("Alt+E").is_ok());
        assert!(parse_shortcut("ctrl+shift+p").is_ok());
    }

    #[test]
    fn parse_rejects_empty_shortcut() {
        assert!(parse_shortcut("").is_err());
        assert!(parse_shortcut("   ").is_err());
    }

    #[test]
    fn executable_context_keeps_only_a_lowercase_basename() {
        assert_eq!(
            executable_basename(r"C:\\Program Files\\Discord\\Discord.exe"),
            Some("discord.exe".to_string())
        );
        assert_eq!(
            executable_basename("/usr/bin/code"),
            Some("code".to_string())
        );
        assert_eq!(executable_basename(""), None);
    }

    #[test]
    fn parse_rejects_invalid_shortcut() {
        assert!(parse_shortcut("not-a-shortcut").is_err());
        assert!(parse_shortcut("alt").is_err());
    }

    #[test]
    fn same_shortcut_parses_to_same_value() {
        assert_eq!(
            parse_shortcut("alt+e").expect("lowercase"),
            parse_shortcut("Alt+E").expect("display form")
        );
    }

    #[test]
    fn emoshelf_export_roundtrips_through_preview() {
        let dir = TempDir::new("emoshelf-roundtrip");
        let requested = dir.path().join("backup");
        let written = write_emoshelf_to_path(&requested, VALID_V2_JSON, "2026-09-04T00:00:00.000Z")
            .expect("export should succeed");

        assert_eq!(
            written.extension().and_then(|value| value.to_str()),
            Some("emoshelf")
        );
        let preview = preview_emoshelf_from_path(&written).expect("preview should succeed");
        assert_eq!(preview.manifest.format, "emoshelf");
        assert_eq!(preview.manifest.schema_version, 2);
        assert_eq!(preview.board_count, 1);
        assert_eq!(preview.item_count, 1);
        assert_eq!(preview.state_json, VALID_V2_JSON);
    }

    #[test]
    fn emoshelf_preview_rejects_future_schema() {
        let dir = TempDir::new("emoshelf-future");
        let path = dir.path().join("future.emoshelf");
        let manifest = r#"{"format":"emoshelf","formatVersion":1,"schemaVersion":3,"exportedAt":"2026-09-04T00:00:00Z","appVersion":"3.0.0"}"#;
        write_test_archive(
            &path,
            &[
                ("manifest.json", manifest),
                ("state.json", r#"{"schemaVersion":3,"boards":[]}"#),
            ],
        );

        let error = preview_emoshelf_from_path(&path).expect_err("future schema must fail");
        assert!(error.contains("newer than supported"));
    }

    #[test]
    fn emoshelf_preview_rejects_path_traversal() {
        let dir = TempDir::new("emoshelf-traversal");
        let path = dir.path().join("unsafe.emoshelf");
        write_test_archive(&path, &[("../state.json", VALID_V2_JSON)]);

        let error = preview_emoshelf_from_path(&path).expect_err("unsafe path must fail");
        assert!(error.contains("unsafe path"));
    }
}
