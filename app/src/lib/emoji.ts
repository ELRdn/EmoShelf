import type { Emoji } from "emojibase";
import type { DisplayMetadata } from "./state";

export type AppLocale = "ja" | "en";

export interface CatalogEntry {
  emoji: string;
  hexcode: string;
  label: string;
  alternateLabel: string;
  codepoint: string;
  tags: string[];
  alternateTags: string[];
  shortcode?: string;
  group?: number;
  category: string;
  categoryKey: string;
}

export interface CategoryMeta {
  id: number | "all" | "recent";
  key: string;
  label: string;
  icon: string;
}

interface GroupMessage {
  key: string;
  message: string;
  order: number;
}

interface MessageSet {
  groups: GroupMessage[];
}

type RawEmoji = Emoji & { group?: number };

interface CatalogData {
  enData: RawEmoji[];
  jaData: RawEmoji[];
  enMessages: MessageSet;
  jaMessages: MessageSet;
  enShortcodes: Record<string, string | string[]>;
}

const CATEGORY_ICONS = [
  "🙂",
  "👋",
  "◐",
  "🐾",
  "🍜",
  "🚀",
  "🎮",
  "💡",
  "✨",
  "🏳️",
];

const DATA_URLS = {
  enData: "/emoji-data/en-data.json",
  jaData: "/emoji-data/ja-data.json",
  enMessages: "/emoji-data/en-messages.json",
  jaMessages: "/emoji-data/ja-messages.json",
  enShortcodes: "/emoji-data/en-shortcodes.json",
} as const;

let catalogData: CatalogData | undefined;
let catalogDataPromise: Promise<void> | undefined;
const cache = new Map<AppLocale, CatalogEntry[]>();

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Emoji catalog request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

/** Load large locale payloads as static assets instead of JavaScript imports. */
export function loadEmojiCatalogData(): Promise<void> {
  if (catalogData) {
    return Promise.resolve();
  }
  if (!catalogDataPromise) {
    catalogDataPromise = Promise.all([
      fetchJson<RawEmoji[]>(DATA_URLS.enData),
      fetchJson<RawEmoji[]>(DATA_URLS.jaData),
      fetchJson<MessageSet>(DATA_URLS.enMessages),
      fetchJson<MessageSet>(DATA_URLS.jaMessages),
      fetchJson<Record<string, string | string[]>>(DATA_URLS.enShortcodes),
    ])
      .then(([enData, jaData, enMessages, jaMessages, enShortcodes]) => {
        catalogData = {
          enData,
          jaData,
          enMessages,
          jaMessages,
          enShortcodes,
        };
        cache.clear();
      })
      .catch((error) => {
        catalogDataPromise = undefined;
        throw error;
      });
  }
  return catalogDataPromise;
}

export function isEmojiCatalogLoaded(): boolean {
  return catalogData !== undefined;
}

function loadedData(): CatalogData {
  if (!catalogData) {
    throw new Error("Emoji catalog has not finished loading");
  }
  return catalogData;
}

function toCodepoint(hexcode: string): string {
  return hexcode
    .split("-")
    .map((part) => `U+${part}`)
    .join(" ");
}

function messagesFor(locale: AppLocale): MessageSet {
  const data = loadedData();
  return locale === "ja" ? data.jaMessages : data.enMessages;
}

function dataFor(locale: AppLocale): RawEmoji[] {
  const data = loadedData();
  return locale === "ja" ? data.jaData : data.enData;
}

export function getCategories(locale: AppLocale): CategoryMeta[] {
  const groups = messagesFor(locale).groups;
  return [
    {
      id: "all",
      key: "all",
      label: locale === "ja" ? "すべて" : "All",
      icon: "▦",
    },
    {
      id: "recent",
      key: "recent",
      label: locale === "ja" ? "最近" : "Recent",
      icon: "◷",
    },
    ...groups.map((group, index) => ({
      id: group.order,
      key: group.key,
      label: group.message,
      icon: CATEGORY_ICONS[index] ?? "•",
    })),
  ];
}

export function getCatalog(locale: AppLocale = "en"): CatalogEntry[] {
  const existing = cache.get(locale);
  if (existing) {
    return existing;
  }
  const data = loadedData();
  const alternateLocale: AppLocale = locale === "ja" ? "en" : "ja";
  const alternateByHex = new Map(
    dataFor(alternateLocale).map((entry) => [entry.hexcode, entry]),
  );
  const groupMessages = messagesFor(locale).groups;
  const alternateGroupMessages = messagesFor(alternateLocale).groups;
  const result = dataFor(locale)
    .filter((entry) => entry.emoji)
    .map((entry): CatalogEntry => {
      const alternate = alternateByHex.get(entry.hexcode);
      const shortcodeValue = data.enShortcodes[entry.hexcode];
      const group = entry.group;
      const groupMessage =
        group === undefined
          ? undefined
          : groupMessages.find((item) => item.order === group);
      const alternateGroup =
        group === undefined
          ? undefined
          : alternateGroupMessages.find((item) => item.order === group);
      return {
        emoji: entry.emoji,
        hexcode: entry.hexcode.toLowerCase(),
        label: entry.label,
        alternateLabel: alternate?.label ?? entry.label,
        codepoint: toCodepoint(entry.hexcode),
        tags: entry.tags ?? [],
        alternateTags: alternate?.tags ?? [],
        shortcode: Array.isArray(shortcodeValue)
          ? shortcodeValue[0]
          : shortcodeValue,
        group,
        category:
          groupMessage?.message ??
          alternateGroup?.message ??
          (locale === "ja" ? "その他" : "Other"),
        categoryKey: groupMessage?.key ?? alternateGroup?.key ?? "other",
      };
    })
    .sort((left, right) => (left.group ?? 99) - (right.group ?? 99));
  cache.set(locale, result);
  return result;
}

function normalizeQuery(query: string): string {
  return query.trim().toLocaleLowerCase().replace(/_/g, " ");
}

function normalizeEmoji(emoji: string): string {
  return emoji.replace(/[\uFE0E\uFE0F]/g, "");
}

export function searchCatalog(
  query: string,
  limit = 120,
  locale: AppLocale = "en",
): CatalogEntry[] {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return [];
  }
  const startsWith: CatalogEntry[] = [];
  const contains: CatalogEntry[] = [];
  const metadataMatches: CatalogEntry[] = [];
  for (const entry of getCatalog(locale)) {
    const labels = [entry.label, entry.alternateLabel].map(normalizeQuery);
    const tags = [...entry.tags, ...entry.alternateTags].map(normalizeQuery);
    const shortcode = normalizeQuery(entry.shortcode ?? "");
    if (labels.some((label) => label.startsWith(normalized))) {
      startsWith.push(entry);
    } else if (
      labels.some((label) => label.includes(normalized)) ||
      entry.emoji.includes(normalized)
    ) {
      contains.push(entry);
    } else if (
      tags.some((tag) => tag.includes(normalized)) ||
      shortcode.includes(normalized) ||
      entry.codepoint.toLowerCase().includes(normalized)
    ) {
      metadataMatches.push(entry);
    }
  }
  return [...startsWith, ...contains, ...metadataMatches].slice(0, limit);
}

export function findByEmoji(
  emoji: string,
  locale: AppLocale = "en",
): CatalogEntry | undefined {
  const target = normalizeEmoji(emoji);
  return getCatalog(locale).find(
    (entry) => normalizeEmoji(entry.emoji) === target,
  );
}

export function toDisplayMetadata(entry: CatalogEntry): DisplayMetadata {
  return {
    name: entry.label,
    unicode: entry.codepoint,
    category: entry.category,
    keywords: [...new Set([...entry.tags, ...entry.alternateTags])],
  };
}
