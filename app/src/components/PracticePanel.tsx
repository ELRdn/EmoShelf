import { useRef, useState } from "react";
import type { AppLocale } from "../lib/emoji";

export function PracticePanel({
  locale,
  shortcut,
}: {
  locale: AppLocale;
  shortcut: string;
}) {
  const [value, setValue] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const ja = locale === "ja";
  function insert(emoji: string) {
    const start = field.current?.selectionStart ?? value.length;
    const end = field.current?.selectionEnd ?? start;
    setValue(value.slice(0, start) + emoji + value.slice(end));
    requestAnimationFrame(() => {
      field.current?.focus();
      field.current?.setSelectionRange(
        start + emoji.length,
        start + emoji.length,
      );
    });
  }
  return (
    <section className="practice-panel">
      <p>
        {ja
          ? "まず、絵文字を選んでみましょう。"
          : "Start by choosing an emoji."}
      </p>
      <label htmlFor="practice-text">
        {ja ? "練習用の入力欄" : "Practice editor"}
      </label>
      <textarea
        id="practice-text"
        ref={field}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={ja ? "ここに絵文字が入ります" : "Your emoji appears here"}
      />
      <div className="practice-emojis">
        {["😎", "✨", "🔥", "✅"].map((emoji) => (
          <button
            type="button"
            key={emoji}
            onClick={() => insert(emoji)}
            aria-label={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
      <p className="settings-note">
        {ja
          ? "これはアプリ内の操作練習です。内容は保存・送信されません。"
          : "This is local practice. Nothing is saved or sent."}
      </p>
      <ol>
        <li>
          {ja
            ? "メモ帳など、使いたいアプリの入力欄をクリック"
            : "Click an editor in the app you want to use"}
        </li>
        <li>
          <kbd>{shortcut}</kbd> {ja ? "で棚を呼び出す" : "to open your shelf"}
        </li>
        <li>
          {ja
            ? "絵文字をクリック、または矢印で選んでEnter"
            : "Click an emoji, or use the arrows and Enter"}
        </li>
      </ol>
      <p>
        {ja
          ? "自動で入らない場合は、入力欄に戻ってCtrl+V。設定の「コピーのみ」も確認してください。"
          : "If it doesn't appear, return to your editor and press Ctrl+V. Check the Copy only setting too."}
      </p>
    </section>
  );
}
