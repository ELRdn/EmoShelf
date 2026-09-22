//! Desktop insertion is a bounded transaction. Sending input is not proof that a
//! third-party editor accepted it; never read that editor's contents to find out.
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::Manager;

#[derive(Clone, Debug, serde::Serialize)]
pub struct PasteOutcome {
    pub status: &'static str,
    pub reason: Option<&'static str>,
}

impl PasteOutcome {
    pub fn failed(reason: &'static str) -> Self {
        Self {
            status: "failed",
            reason: Some(reason),
        }
    }
    fn copied(reason: &'static str) -> Self {
        Self {
            status: "copied",
            reason: Some(reason),
        }
    }
}

// One transaction for both image and text, including clipboard ownership.
static INSERTION: Mutex<()> = Mutex::new(());

pub fn insert(
    app: &tauri::AppHandle,
    keep_open: bool,
    mut write_clipboard: impl FnMut() -> Result<(), String>,
) -> PasteOutcome {
    let Ok(_transaction) = INSERTION.try_lock() else {
        return PasteOutcome::failed("busy");
    };
    if write_clipboard().is_err() {
        return PasteOutcome::failed("clipboard-unavailable");
    }
    let started = Instant::now();
    let result = send_to_target(app, keep_open, clipboard_sequence());
    // Deliberately exclude payload, window title, executable path and clipboard contents.
    eprintln!(
        "EmoShelf insertion: stage=input result={} elapsed_ms={}",
        result.as_ref().err().copied().unwrap_or("input-sent"),
        started.elapsed().as_millis()
    );
    match result {
        Ok(()) => PasteOutcome {
            status: "input-sent",
            reason: None,
        },
        Err(reason) => {
            // The caller renders a persistent recovery banner. Show it even if
            // the transaction already hid the shelf; don't steal another app's focus.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }
            // Another owner replaced the clipboard while focus was settling.
            // Restore the selected payload for manual recovery, never retry input.
            if reason == "clipboard-changed" && write_clipboard().is_err() {
                return PasteOutcome::failed("clipboard-unavailable");
            }
            PasteOutcome::copied(reason)
        }
    }
}

#[cfg(windows)]
fn clipboard_sequence() -> u32 {
    unsafe { windows::Win32::System::DataExchange::GetClipboardSequenceNumber() }
}
#[cfg(not(windows))]
fn clipboard_sequence() -> u32 {
    0
}

fn clipboard_unchanged(expected: u32, current: u32) -> bool {
    expected != 0 && expected == current
}

#[cfg(windows)]
mod win {
    use super::*;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, MapVirtualKeyW, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT,
        KEYEVENTF_KEYUP, KEYEVENTF_SCANCODE, MAPVK_VK_TO_VSC, VIRTUAL_KEY, VK_CONTROL, VK_LWIN,
        VK_MENU, VK_RETURN, VK_RWIN, VK_SHIFT, VK_V,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetGUIThreadInfo, GetWindowThreadProcessId, IsWindow,
        SetForegroundWindow, GUITHREADINFO,
    };

    #[derive(Clone, Copy, Debug, PartialEq, Eq)]
    struct Target {
        hwnd: isize,
        pid: u32,
    }
    static TARGET: Mutex<Option<Target>> = Mutex::new(None);

    fn identity(hwnd: HWND) -> Option<Target> {
        let mut pid = 0;
        // SAFETY: Windows validates the handle and writes into a live local value.
        if !unsafe { IsWindow(Some(hwnd)) }.as_bool()
            || unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) } == 0
            || pid == 0
            || pid == std::process::id()
        {
            return None;
        }
        Some(Target {
            hwnd: hwnd.0 as isize,
            pid,
        })
    }

    pub fn capture(hwnd: HWND) {
        if let Some(target) = identity(hwnd) {
            if let Ok(mut saved) = TARGET.lock() {
                *saved = Some(target);
            }
        }
    }

    fn foreground() -> HWND {
        unsafe { GetForegroundWindow() }
    }

    fn keys_down() -> bool {
        [VK_CONTROL, VK_MENU, VK_SHIFT, VK_LWIN, VK_RWIN, VK_RETURN]
            .iter()
            .any(|key| unsafe { GetAsyncKeyState(key.0 as i32) } < 0)
    }

    pub fn send(
        app: &tauri::AppHandle,
        keep_open: bool,
        clipboard: u32,
    ) -> Result<(), &'static str> {
        let target = TARGET
            .lock()
            .ok()
            .and_then(|saved| *saved)
            .ok_or("no-target")?;
        let hwnd = HWND(target.hwnd as *mut core::ffi::c_void);
        if identity(hwnd) != Some(target) {
            return Err("target-closed");
        }
        let window = app.get_webview_window("main").ok_or("window-unavailable")?;
        let own = window.hwnd().map_err(|_| "window-unavailable")?;
        let initial = foreground();
        if initial != own && initial != hwnd {
            return Err("focus-changed");
        }
        // Wait for the physical Enter/Alt/Ctrl release before synthesizing Ctrl+V.
        let deadline = Instant::now() + Duration::from_millis(700);
        while keys_down() {
            if foreground() != initial {
                return Err("focus-changed");
            }
            if Instant::now() >= deadline {
                return Err("keys-held");
            }
            std::thread::sleep(Duration::from_millis(8));
        }
        if foreground() != initial {
            return Err("focus-changed");
        }
        // Finish z-order changes before restoring the editor. A late demotion
        // can otherwise race its control-focus restoration and the input batch.
        // This runs on the UI thread outside Tao's activation/window-state lock.
        let (released, completion) = std::sync::mpsc::sync_channel(1);
        let release_window = window.clone();
        window
            .run_on_main_thread(move || {
                let result = release_window
                    .hwnd()
                    .map(crate::activation::release)
                    .map_err(|_| "window-unavailable");
                let _ = released.send(result);
            })
            .map_err(|_| "window-unavailable")?;
        completion
            .recv_timeout(Duration::from_millis(500))
            .map_err(|_| "window-unavailable")??;
        if foreground() != initial {
            return Err("focus-changed");
        }
        if !keep_open {
            window.hide().map_err(|_| "window-unavailable")?;
        }
        // SAFETY: identity was checked and is rechecked again before sending.
        let accepted = unsafe { SetForegroundWindow(hwnd) }.as_bool();
        if !accepted && foreground() != hwnd {
            return Err("focus-denied");
        }
        let deadline = Instant::now() + Duration::from_millis(500);
        let mut ready_focus = None;
        loop {
            let current = foreground();
            if current == hwnd {
                let mut gui = GUITHREADINFO {
                    cbSize: std::mem::size_of::<GUITHREADINFO>() as u32,
                    ..Default::default()
                };
                // A foreground HWND alone can precede focus restoration inside WinUI/WebView editors.
                if unsafe { GetGUIThreadInfo(0, &mut gui) }.is_ok() && !gui.hwndFocus.is_invalid() {
                    if ready_focus == Some(gui.hwndFocus) {
                        break;
                    }
                    ready_focus = Some(gui.hwndFocus);
                } else {
                    ready_focus = None;
                }
            } else {
                ready_focus = None;
            }
            if current != hwnd && current != own && !current.is_invalid() {
                return Err("focus-changed");
            }
            if Instant::now() >= deadline {
                return Err("focus-timeout");
            }
            std::thread::sleep(Duration::from_millis(8));
        }
        if identity(hwnd) != Some(target) {
            return Err("target-closed");
        }
        if foreground() != hwnd || keys_down() {
            return Err("focus-changed");
        }
        if !clipboard_unchanged(clipboard, clipboard_sequence()) {
            return Err("clipboard-changed");
        }
        let key = |vk: VIRTUAL_KEY, up| INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(0),
                    wScan: unsafe { MapVirtualKeyW(vk.0 as u32, MAPVK_VK_TO_VSC) } as u16,
                    dwFlags: KEYEVENTF_SCANCODE
                        | if up {
                            KEYEVENTF_KEYUP
                        } else {
                            Default::default()
                        },
                    ..Default::default()
                },
            },
        };
        // One batch prevents interleaving our Ctrl/V presses with each other.
        let inputs = [
            key(VK_CONTROL, false),
            key(VK_V, false),
            key(VK_V, true),
            key(VK_CONTROL, true),
        ];
        let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };
        if sent != inputs.len() as u32 {
            // Release only synthetic keys; never retry the paste (could duplicate input).
            if sent > 0 {
                let releases = [key(VK_V, true), key(VK_CONTROL, true)];
                unsafe {
                    SendInput(&releases, std::mem::size_of::<INPUT>() as i32);
                }
            }
            return Err("input-denied");
        }
        Ok(())
    }
}

#[cfg(windows)]
pub use win::capture;
#[cfg(windows)]
fn send_to_target(
    app: &tauri::AppHandle,
    keep_open: bool,
    clipboard: u32,
) -> Result<(), &'static str> {
    win::send(app, keep_open, clipboard)
}
#[cfg(not(windows))]
fn send_to_target(
    _app: &tauri::AppHandle,
    _keep_open: bool,
    _clipboard: u32,
) -> Result<(), &'static str> {
    Err("unsupported-platform")
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn delivery_outcomes_do_not_claim_editor_insertion() {
        let value = serde_json::to_value(PasteOutcome::copied("focus-denied")).unwrap();
        assert_eq!(value["status"], "copied");
        assert_eq!(value["reason"], "focus-denied");
        assert_eq!(
            serde_json::to_value(PasteOutcome::failed("busy")).unwrap()["status"],
            "failed"
        );
    }
    #[test]
    fn replaced_or_unavailable_clipboard_must_not_be_sent() {
        assert!(clipboard_unchanged(71, 71));
        assert!(!clipboard_unchanged(71, 72));
        assert!(!clipboard_unchanged(0, 0));
        assert!(!clipboard_unchanged(u32::MAX, 0));
    }
}
