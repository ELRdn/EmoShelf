import type { AppLocale } from "../lib/emoji";
import { translate } from "../lib/i18n";
import type { RendererId } from "../lib/state";
import { EmojiArtwork } from "./EmojiArtwork";

interface ComposeTrayProps {
  entries: string[];
  locale: AppLocale;
  renderer: RendererId;
  onClear: () => void;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onSave: () => void;
  onUndo: () => void;
}

export function ComposeTray({
  entries,
  locale,
  renderer,
  onClear,
  onClose,
  onCopy,
  onPaste,
  onSave,
  onUndo,
}: ComposeTrayProps) {
  const payload = entries.join("");
  const occurrences = new Map<string, number>();
  const keyedEntries = entries.map((entry) => {
    const occurrence = (occurrences.get(entry) ?? 0) + 1;
    occurrences.set(entry, occurrence);
    return { entry, key: `${entry}-${occurrence}` };
  });
  return (
    <section
      aria-label={translate(locale, "composeTray")}
      className="compose-tray"
    >
      <header>
        <div>
          <span className="compose-spark" aria-hidden="true">
            ✦
          </span>
          <strong>{translate(locale, "composeTray")}</strong>
          <span className="compose-count">{entries.length}</span>
        </div>
        <button
          aria-label={translate(locale, "closeCompose")}
          className="icon-button"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </header>
      <div className="compose-body">
        {entries.length ? (
          <div aria-live="polite" className="compose-preview">
            {keyedEntries.map(({ entry, key }) => (
              <span className="compose-token" key={key}>
                <EmojiArtwork
                  className="compose-emoji"
                  emoji={entry}
                  locale={locale}
                  renderer={renderer}
                />
              </span>
            ))}
          </div>
        ) : (
          <p className="compose-empty">{translate(locale, "composeEmpty")}</p>
        )}
        <output className="compose-output" title={payload}>
          {payload || "—"}
        </output>
      </div>
      <footer>
        <div className="compose-edit-actions">
          <button disabled={!entries.length} onClick={onUndo} type="button">
            ↶ {translate(locale, "undoLast")}
          </button>
          <button disabled={!entries.length} onClick={onClear} type="button">
            {translate(locale, "clear")}
          </button>
        </div>
        <div className="compose-primary-actions">
          <button disabled={!entries.length} onClick={onSave} type="button">
            ☆ {translate(locale, "saveSequence")}
          </button>
          <button disabled={!entries.length} onClick={onCopy} type="button">
            {translate(locale, "copy")}
          </button>
          <button
            className="primary-button"
            disabled={!entries.length}
            onClick={onPaste}
            type="button"
          >
            {translate(locale, "pasteComposition")}
          </button>
        </div>
      </footer>
    </section>
  );
}
