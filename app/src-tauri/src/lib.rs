// EmoShelf Rust 基盤（UI を持たない部分）
// - 状態の保存 / 復元（state.json、アトミック書き込み）
// - グローバルショートカットでの表示切替
// - クリップボード経由のペースト（Ctrl+V シミュレーション）
// - 二重起動抑止、ウィンドウ状態の自動復元
//
// 仕様の正本は app/docs/persistence.md。

use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::sync::Mutex;
use std::time::Duration;

use tauri::Manager;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

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

/// 現在登録中のグローバルショートカット（差し替え時に解除するため保持）。
struct ActiveShortcut(Mutex<Option<Shortcut>>);

/// メインウィンドウの表示 / 非表示を切り替える。
fn toggle_main_window(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let visible = window.is_visible().unwrap_or(false);
    if visible {
        let _ = window.hide();
    } else {
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

/// ペイロードをペーストする: クリップボードへ書き込み → 自分を隠す →
/// フォーカス復帰を待つ → Ctrl+V。Tauri の同期コマンドとして実行する
///（ブロッキングプール上で動くため短い sleep は問題ない）。
#[tauri::command]
fn paste_payload(app: tauri::AppHandle, payload: String) -> Result<(), String> {
    if payload.is_empty() {
        return Err("payload must not be empty".to_string());
    }
    app.clipboard()
        .write_text(payload)
        .map_err(|e| e.to_string())?;
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
    std::thread::sleep(PASTE_FOCUS_WAIT);
    press_ctrl_v()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ActiveShortcut(Mutex::new(None)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 二重起動時は既存ウィンドウを前面に出すだけ
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
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
        .setup(|app| {
            // 設定読み込み前のフォールバックとして既定ショートカットを登録する。
            // 登録失敗でも起動は継続し、ActiveShortcut は成功時のみ更新する。
            let shortcut = match parse_shortcut(DEFAULT_SHORTCUT) {
                Ok(shortcut) => shortcut,
                Err(_) => return Ok(()),
            };
            if app.global_shortcut().register(shortcut).is_err() {
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
            paste_payload
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
}
