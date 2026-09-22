//! A reveal is idempotent: a repeated shortcut must never hide the picker.
//! Run the whole transaction on the window's UI thread, so showing the window
//! finishes before activation. A queued ShowWindowAsync cannot provide this.

trait RevealWindow {
    fn show_restored(&self) -> Result<(), &'static str>;
    fn raise(&self) -> Result<(), &'static str>;
    fn focus(&self) -> Result<(), &'static str>;
    fn ready(&self) -> bool;
    fn release(&self);
}

fn reveal(window: &impl RevealWindow) -> Result<(), &'static str> {
    let result = (|| {
        window.show_restored()?;
        window.raise()?;
        window.focus()?;
        if !window.ready() {
            return Err("focus-denied");
        }
        Ok(())
    })();
    if result.is_err() {
        window.release();
    }
    result
}

pub fn show(window: &tauri::WebviewWindow) -> Result<(), &'static str> {
    reveal(window)
}

impl RevealWindow for tauri::WebviewWindow {
    fn show_restored(&self) -> Result<(), &'static str> {
        if self.is_minimized().map_err(|_| "window-unavailable")? {
            self.unminimize().map_err(|_| "restore-failed")?;
        }
        // Use Tauri to keep its visibility flags in sync with the native window.
        self.show().map_err(|_| "show-failed")
    }

    fn raise(&self) -> Result<(), &'static str> {
        #[cfg(windows)]
        {
            use windows::Win32::UI::WindowsAndMessaging::{
                SetWindowPos, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
            };
            let hwnd = self.hwnd().map_err(|_| "window-unavailable")?;
            // Temporary: WM_ACTIVATE queues release after focus leaves the shelf.
            unsafe {
                SetWindowPos(
                    hwnd,
                    Some(HWND_TOPMOST),
                    0,
                    0,
                    0,
                    0,
                    SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE,
                )
            }
            .map_err(|_| "raise-failed")?;
        }
        Ok(())
    }

    fn focus(&self) -> Result<(), &'static str> {
        #[cfg(windows)]
        {
            use windows::Win32::UI::WindowsAndMessaging::{
                GetForegroundWindow, SetForegroundWindow,
            };
            let hwnd = self.hwnd().map_err(|_| "window-unavailable")?;
            // Check native activation before focusing the WebView. Do not use
            // Tao's synthetic Alt-key fallback to override a foreground refusal.
            unsafe {
                let _ = SetForegroundWindow(hwnd);
                if GetForegroundWindow() != hwnd {
                    return Err("focus-denied");
                }
            }
        }
        self.set_focus().map_err(|_| "focus-failed")
    }

    fn ready(&self) -> bool {
        #[cfg(windows)]
        {
            use windows::Win32::UI::WindowsAndMessaging::{
                GetForegroundWindow, IsIconic, IsWindowVisible,
            };
            self.hwnd().is_ok_and(|hwnd| unsafe {
                GetForegroundWindow() == hwnd
                    && IsWindowVisible(hwnd).as_bool()
                    && !IsIconic(hwnd).as_bool()
            })
        }
        #[cfg(not(windows))]
        {
            self.is_focused().unwrap_or(false)
                && self.is_visible().unwrap_or(false)
                && !self.is_minimized().unwrap_or(true)
        }
    }

    fn release(&self) {
        #[cfg(windows)]
        if let Ok(hwnd) = self.hwnd() {
            release(hwnd);
        }
    }
}

#[cfg(windows)]
pub fn release(hwnd: windows::Win32::Foundation::HWND) {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowPos, GWL_EXSTYLE, HWND_BOTTOM, SWP_NOACTIVATE, SWP_NOMOVE,
        SWP_NOSIZE, WS_EX_TOPMOST,
    };
    // A queued deactivation message must not reorder the window a second time
    // after insertion has already released it and focused the editor.
    if unsafe { GetWindowLongPtrW(hwnd, GWL_EXSTYLE) } & WS_EX_TOPMOST.0 as isize == 0 {
        return;
    }
    // HWND_NOTOPMOST alone places the shelf at the top of the normal band and
    // can still cover the newly focused editor. HWND_BOTTOM also clears topmost
    // while keeping the visible Pinned shelf behind the input target.
    let _ = unsafe {
        SetWindowPos(
            hwnd,
            Some(HWND_BOTTOM),
            0,
            0,
            0,
            0,
            SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE,
        )
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;

    #[derive(Default)]
    struct Window {
        visible: Cell<bool>,
        minimized: Cell<bool>,
        foreground: Cell<bool>,
        topmost: Cell<bool>,
        deny_focus: bool,
        lose_focus: bool,
        fail_show: bool,
    }

    impl RevealWindow for Window {
        fn show_restored(&self) -> Result<(), &'static str> {
            if self.fail_show {
                return Err("show-failed");
            }
            self.minimized.set(false);
            self.visible.set(true);
            Ok(())
        }
        fn raise(&self) -> Result<(), &'static str> {
            self.topmost.set(true);
            Ok(())
        }
        fn focus(&self) -> Result<(), &'static str> {
            // Windows cannot activate a hidden/minimized window. This catches
            // focus-before-show regressions, but does not emulate OS focus policy.
            self.foreground
                .set(self.visible.get() && !self.minimized.get() && !self.deny_focus);
            Ok(())
        }
        fn ready(&self) -> bool {
            self.foreground.get() && !self.lose_focus
        }
        fn release(&self) {
            self.topmost.set(false);
        }
    }

    #[test]
    fn hidden_background_minimized_and_foreground_all_become_selectable() {
        for (visible, minimized, foreground) in [
            (false, false, false),
            (true, false, false),
            (true, true, false),
            (true, false, true),
        ] {
            let window = Window {
                visible: Cell::new(visible),
                minimized: Cell::new(minimized),
                foreground: Cell::new(foreground),
                ..Default::default()
            };
            for _ in 0..3 {
                assert_eq!(reveal(&window), Ok(()));
                assert!(window.visible.get() && window.foreground.get());
                assert!(window.topmost.get());
                assert!(!window.minimized.get());
            }
        }
    }

    #[test]
    fn paste_then_reopen_works_with_or_without_pinned() {
        for keep_open in [false, true] {
            let window = Window::default();
            for _ in 0..30 {
                assert_eq!(reveal(&window), Ok(()));
                window.visible.set(keep_open);
                window.foreground.set(false);
                window.release();
                assert!(!window.topmost.get());
            }
        }
    }

    #[test]
    fn refused_or_lost_focus_is_not_success_and_releases_topmost() {
        for (deny_focus, lose_focus) in [(true, false), (false, true)] {
            let window = Window {
                deny_focus,
                lose_focus,
                ..Default::default()
            };
            assert_eq!(reveal(&window), Err("focus-denied"));
            assert!(!window.topmost.get());
        }
    }

    #[test]
    fn show_failure_does_not_activate_or_leave_topmost() {
        let window = Window {
            fail_show: true,
            topmost: Cell::new(true),
            ..Default::default()
        };
        assert_eq!(reveal(&window), Err("show-failed"));
        assert!(!window.foreground.get());
        assert!(!window.topmost.get());
    }
}
