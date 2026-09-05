import { useMemo, useState } from "react";
import {
  type AppLocale,
  type CatalogEntry,
  findByEmoji,
  getCatalog,
  getCategories,
  searchCatalog,
  toDisplayMetadata,
} from "../lib/emoji";
import { translate } from "../lib/i18n";
import type { NewShelfItem, RendererId } from "../lib/state";
import { EmojiArtwork } from "./EmojiArtwork";
import { VirtualEmojiGrid } from "./VirtualEmojiGrid";

interface OnboardingProps {
  locale: AppLocale;
  renderer: RendererId;
  onFinish: (items: NewShelfItem[]) => void;
}

const STARTER_EMOJIS = ["😂", "😭", "🥹", "💀", "👀", "🔥", "✨", "✅"];

export function Onboarding({ locale, renderer, onFinish }: OnboardingProps) {
  const [step, setStep] = useState<"welcome" | "pick">("welcome");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<number | "all">("all");
  const [picked, setPicked] = useState<Set<string>>(() => {
    const starterHexcodes = new Set(
      STARTER_EMOJIS.map((emoji) => findByEmoji(emoji, locale)?.hexcode).filter(
        (hexcode): hexcode is string => Boolean(hexcode),
      ),
    );
    return new Set(
      getCatalog(locale)
        .filter((entry) => starterHexcodes.has(entry.hexcode))
        .map((entry) => entry.emoji),
    );
  });
  const catalog = useMemo(() => getCatalog(locale), [locale]);
  const categories = useMemo(
    () => getCategories(locale).filter((item) => item.id !== "recent"),
    [locale],
  );
  const visibleEntries = useMemo(() => {
    if (query.trim()) {
      return searchCatalog(query, 1949, locale);
    }
    return category === "all"
      ? catalog
      : catalog.filter((entry) => entry.group === category);
  }, [catalog, category, locale, query]);

  const finish = (selection: Set<string>) => {
    const items: NewShelfItem[] = catalog
      .filter((entry) => selection.has(entry.emoji))
      .map((entry) => ({
        type: "unicode",
        payload: entry.emoji,
        display: toDisplayMetadata(entry),
      }));
    onFinish(items);
  };

  if (step === "welcome") {
    return (
      <main className="onboarding welcome-panel" id="main-content">
        <div className="welcome-mark" aria-hidden="true">
          <div className="welcome-face">😎</div>
          <div className="welcome-shelf" />
        </div>
        <p className="eyebrow">EmoShelf</p>
        <h1>{translate(locale, "welcomeTitle")}</h1>
        <p>{translate(locale, "welcomeBody")}</p>
        <div className="welcome-preview" aria-hidden="true">
          {STARTER_EMOJIS.slice(0, 6).map((emoji) => (
            <EmojiArtwork
              emoji={emoji}
              key={emoji}
              locale={locale}
              renderer={renderer}
            />
          ))}
        </div>
        <div className="onboarding-actions">
          <button
            className="primary-button"
            onClick={() => setStep("pick")}
            type="button"
          >
            {translate(locale, "getStarted")}
          </button>
          <button
            className="text-button"
            onClick={() => finish(new Set())}
            type="button"
          >
            {translate(locale, "skip")}
          </button>
        </div>
      </main>
    );
  }

  const togglePicked = (entry: CatalogEntry) => {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(entry.emoji)) {
        next.delete(entry.emoji);
      } else {
        next.add(entry.emoji);
      }
      return next;
    });
  };

  return (
    <main className="onboarding pick-panel" id="main-content">
      <header className="pick-heading">
        <div>
          <p className="eyebrow">EmoShelf / 01</p>
          <h1>{translate(locale, "pickTitle")}</h1>
          <p>{translate(locale, "pickBody")}</p>
        </div>
        <div className="selection-count" aria-live="polite">
          <strong>{picked.size}</strong>
          <span>{translate(locale, "selectedCount")}</span>
        </div>
      </header>

      <label className="search-field onboarding-search">
        <span aria-hidden="true">⌕</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder={translate(locale, "searchPlaceholder")}
          type="search"
          value={query}
        />
      </label>

      <nav
        aria-label={translate(locale, "categories")}
        className="category-strip"
      >
        {categories.map((item) => (
          <button
            aria-pressed={category === item.id}
            className={category === item.id ? "is-active" : ""}
            key={item.key}
            onClick={() => setCategory(item.id as number | "all")}
            type="button"
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <VirtualEmojiGrid
        className="onboarding-grid"
        entries={visibleEntries}
        locale={locale}
        onSelect={togglePicked}
        picked={picked}
        renderer={renderer}
      />

      <footer className="onboarding-footer">
        <button
          className="text-button"
          onClick={() => setStep("welcome")}
          type="button"
        >
          ← {translate(locale, "cancel")}
        </button>
        <button
          className="primary-button"
          onClick={() => finish(picked)}
          type="button"
        >
          {translate(locale, "createShelf")}
          <span aria-hidden="true">→</span>
        </button>
      </footer>
    </main>
  );
}
