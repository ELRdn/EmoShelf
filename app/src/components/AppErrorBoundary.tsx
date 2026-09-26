import { Component, type ErrorInfo, type ReactNode } from "react";
import { resolveLocale } from "../lib/i18n";
import { useShelfStore } from "../lib/store";
import "./startup-recovery.css";

export function StartupRecovery({
  desktopRequired = false,
}: {
  desktopRequired?: boolean;
}) {
  const ja = resolveLocale(useShelfStore.getState().settings.locale) === "ja";
  const [title, description] = desktopRequired
    ? ja
      ? [
          "EmoShelfアプリから開いてください",
          "この画面はWindowsアプリ専用です。ブラウザで試す場合は、公開ページの体験デモをご利用ください。",
        ]
      : [
          "Open EmoShelf on Windows",
          "This screen requires the desktop app. To try EmoShelf in a browser, use the demo on the product page.",
        ]
    : ja
      ? [
          "画面を表示できませんでした",
          "保存済みの棚は削除されません。アプリを開き直してください。繰り返す場合は、不具合をご報告ください。",
        ]
      : [
          "We couldn't display your shelf",
          "Your saved shelf has not been deleted. Reopen the app. If this happens again, please report the issue.",
        ];

  return (
    <main className="startup-recovery">
      <span className="recovery-brand" aria-hidden="true">
        😎
      </span>
      <p className="eyebrow">EmoShelf</p>
      <h1>{title}</h1>
      <p>{description}</p>
      {desktopRequired ? (
        <a className="primary-button" href="https://elrdn.github.io/EmoShelf/">
          {ja ? "体験デモを開く" : "Try the browser demo"}
        </a>
      ) : (
        <button
          className="primary-button"
          type="button"
          onClick={() => window.location.reload()}
        >
          {ja ? "画面を再読み込み" : "Reload the app"}
        </button>
      )}
      <p className="recovery-support">github.com/ELRdn/EmoShelf/issues</p>
    </main>
  );
}

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Do not include user content or state in crash diagnostics.
    console.error("EmoShelf: the interface could not be rendered.");
  }

  render() {
    return this.state.failed ? <StartupRecovery /> : this.props.children;
  }
}
