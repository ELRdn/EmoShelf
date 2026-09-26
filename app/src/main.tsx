import { isTauri } from "@tauri-apps/api/core";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import {
  AppErrorBoundary,
  StartupRecovery,
} from "./components/AppErrorBoundary";
import { useShelfStore } from "./lib/store";

async function bootstrap() {
  // WebDriverIOのIPC支援はE2Eビルドだけに含め、正式ビルドへ公開しない。
  if (import.meta.env.VITE_EMOSHELF_E2E === "1") {
    await import("@wdio/tauri-plugin");
  }

  // 起動直後に保存済み状態の読み込み＋ショートカット登録を行う（UI 描画と並行）。
  const desktop = isTauri();
  if (desktop) void useShelfStore.getState().initialize();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <AppErrorBoundary>
        {desktop ? <App /> : <StartupRecovery desktopRequired />}
      </AppErrorBoundary>
    </React.StrictMode>,
  );
}

void bootstrap();
