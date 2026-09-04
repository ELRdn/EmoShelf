import { useState } from "react";
import type { AppLocale } from "../lib/emoji";
import { translate } from "../lib/i18n";
import type { AppState } from "../lib/state";
import {
  exportEmoShelf,
  type ImportMode,
  type ImportPreview,
  installEmoShelfAssets,
  openEmoShelfPreview,
} from "../lib/transfer";

interface DataTransferDialogProps {
  locale: AppLocale;
  state: AppState;
  onApply: (state: AppState, mode: ImportMode) => Promise<void>;
}

export function DataTransferDialog({
  locale,
  state,
  onApply,
}: DataTransferDialogProps) {
  const [preview, setPreview] = useState<ImportPreview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  };

  const apply = (mode: ImportMode) => {
    if (!preview) {
      return;
    }
    if (
      mode === "replace" &&
      !window.confirm(translate(locale, "replaceImportConfirm"))
    ) {
      return;
    }
    void run(async () => {
      await installEmoShelfAssets(preview.path);
      await onApply(preview.state, mode);
      setPreview(undefined);
    });
  };

  return (
    <section className="transfer-panel">
      <p>{translate(locale, "transferDescription")}</p>
      <div className="transfer-actions">
        <button
          className="quiet-button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await exportEmoShelf(state);
            })
          }
          type="button"
        >
          ⇧ {translate(locale, "exportData")}
        </button>
        <button
          className="quiet-button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const next = await openEmoShelfPreview();
              if (next) {
                setPreview(next);
              }
            })
          }
          type="button"
        >
          ⇩ {translate(locale, "importData")}
        </button>
      </div>
      {preview ? (
        <article className="import-preview">
          <header>
            <strong>{translate(locale, "importPreview")}</strong>
            <span>schema v{preview.manifest.schemaVersion}</span>
          </header>
          <dl>
            <div>
              <dt>Board</dt>
              <dd>{preview.boardCount}</dd>
            </div>
            <div>
              <dt>{translate(locale, "items")}</dt>
              <dd>{preview.itemCount}</dd>
            </div>
            <div>
              <dt>{locale === "ja" ? "カスタム画像" : "Custom images"}</dt>
              <dd>{preview.assetCount}</dd>
            </div>
            <div>
              <dt>{translate(locale, "exportedAt")}</dt>
              <dd>{new Date(preview.manifest.exportedAt).toLocaleString()}</dd>
            </div>
          </dl>
          <p className="backup-note">{translate(locale, "importBackupNote")}</p>
          <div className="modal-actions">
            <button
              disabled={busy}
              onClick={() => apply("merge")}
              type="button"
            >
              {translate(locale, "mergeImport")}
            </button>
            <button
              className="danger-button"
              disabled={busy}
              onClick={() => apply("replace")}
              type="button"
            >
              {translate(locale, "replaceImport")}
            </button>
          </div>
        </article>
      ) : null}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
