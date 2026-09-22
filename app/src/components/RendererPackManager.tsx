import type { AppLocale } from "../lib/emoji";
import {
  pickAndInstallRendererPack,
  type RendererPackRecord,
  removeRendererPack,
  setRendererPackEnabled,
} from "../lib/rendererPacks";

interface RendererPackManagerProps {
  locale: AppLocale;
  packs: RendererPackRecord[];
  onChange: () => Promise<void>;
  onError: (message: string) => void;
}

export function RendererPackManager({
  locale,
  packs,
  onChange,
  onError,
}: RendererPackManagerProps) {
  const run = async (operation: () => Promise<unknown>) => {
    try {
      await operation();
      await onChange();
      onError("");
    } catch (error) {
      onError(String(error));
    }
  };

  return (
    <section className="renderer-pack-manager">
      <header>
        <div>
          <strong>
            {locale === "ja"
              ? "追加の絵文字スタイル"
              : "Additional emoji styles"}
          </strong>
          <p>
            {locale === "ja"
              ? "入手済みのEmoShelf用パックを追加できます。"
              : "Add an EmoShelf pack you have already downloaded."}
          </p>
        </div>
        <button
          className="quiet-button renderer-pack-install"
          onClick={() => void run(pickAndInstallRendererPack)}
          type="button"
        >
          + {locale === "ja" ? "パックを追加" : "Install pack"}
        </button>
      </header>
      {packs.length ? (
        <ul>
          {packs.map((pack) => (
            <li key={pack.rendererId}>
              <div>
                <strong>{pack.displayName}</strong>
                <span className="pack-detail">
                  v{pack.version} · {pack.assetCount} SVG · {pack.licenseName}
                </span>
                <small className="pack-attribution">{pack.attribution}</small>
              </div>
              <label className="compact-toggle">
                <input
                  checked={pack.enabled}
                  onChange={(event) =>
                    void run(() =>
                      setRendererPackEnabled(
                        pack.rendererId,
                        event.target.checked,
                      ),
                    )
                  }
                  type="checkbox"
                />
                <span>{locale === "ja" ? "有効" : "Enabled"}</span>
              </label>
              <button
                className="danger-quiet"
                onClick={() =>
                  void run(() => removeRendererPack(pack.rendererId))
                }
                type="button"
              >
                {locale === "ja" ? "削除" : "Remove"}
              </button>
              <details>
                <summary>{locale === "ja" ? "ライセンス" : "License"}</summary>
                <pre>{pack.licenseText}</pre>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pack-empty">
          {locale === "ja"
            ? "追加パックは未導入です。現在はTwemojiとOS標準の絵文字を使えます。"
            : "No additional packs are installed. Twemoji and OS emoji are available now."}
        </p>
      )}
    </section>
  );
}
