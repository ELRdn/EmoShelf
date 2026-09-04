import type { Emoji } from "emojibase";
import enData from "emojibase-data/en/data.json";
import enMessages from "emojibase-data/en/messages.json";
import enShortcodes from "emojibase-data/en/shortcodes/cldr.json";
import jaData from "emojibase-data/ja/data.json";
import jaMessages from "emojibase-data/ja/messages.json";
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

type MessageSet = typeof enMessages;
type RawEmoji = Emoji & { group?: number };

function toCodepoint(hexcode: string): string {
  return hexcode
    .split("-")
    .map((part) => `U+${part}`)
    .join(" ");
}

function messagesFor(locale: AppLocale): MessageSet {
  return (locale === "ja" ? jaMessages : enMessages) as MessageSet;
}

function dataFor(locale: AppLocale): RawEmoji[] {
  return (locale === "ja" ? jaData : enData) as RawEmoji[];
}

const cache = new Map<AppLocale, CatalogEntry[]>();

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
  const alternateLocale: AppLocale = locale === "ja" ? "en" : "ja";
  const alternateByHex = new Map(
    dataFor(alternateLocale).map((entry) => [entry.hexcode, entry]),
  );
  const groupMessages = messagesFor(locale).groups;
  const alternateGroupMessages = messagesFor(alternateLocale).groups;
  const shortcodes = enShortcodes as Record<string, string | string[]>;
  const result = dataFor(locale)
    .filter((entry) => entry.emoji)
    .map((entry): CatalogEntry => {
      const alternate = alternateByHex.get(entry.hexcode);
      const shortcodeValue = shortcodes[entry.hexcode];
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
