// 絵文字カタログの基盤（データ読み込み・検索）。
// UI は持たない。Shelf 画面・検索画面は v0.1 でこの API の上に作る。
//
// データ源: emojibase-data（Unicode CLDR 由来、英語ラベル＋タグ）。
// 日本語検索の改善は v0.5 の対象で、ここでは英語検索の基盤のみ用意する。

import type { Emoji } from "emojibase";
import rawData from "emojibase-data/en/data.json";
import type { DisplayMetadata } from "./state";

/** カタログ内の絵文字 1 件（検索・表示に必要な最小情報）。 */
export interface CatalogEntry {
  /** 実際にコピーされる Unicode 文字（例: "😭"） */
  emoji: string;
  /** 人間可読名（例: "loudly crying face"） */
  label: string;
  /** コードポイント表記（例: "U+1F62D"） */
  codepoint: string;
  /** 検索用タグ */
  tags: string[];
}

/** hexcode（例: "1F62D" / "1F1E6-1F1E8"）を "U+..." 表記に変換する。 */
function toCodepoint(hexcode: string): string {
  return hexcode
    .split("-")
    .map((part) => `U+${part}`)
    .join(" ");
}

/** emojibase の 1 件を CatalogEntry に変換する。 */
function toEntry(data: Emoji): CatalogEntry {
  return {
    emoji: data.emoji,
    label: data.label,
    codepoint: toCodepoint(data.hexcode),
    tags: data.tags ?? [],
  };
}

let cache: CatalogEntry[] | null = null;

/** カタログ全件を返す（初回のみ変換、以後キャッシュ）。 */
export function getCatalog(): CatalogEntry[] {
  if (cache === null) {
    const data = rawData as Emoji[];
    cache = data
      .filter((entry) => entry.emoji !== undefined && entry.emoji !== "")
      .map(toEntry);
  }
  return cache;
}

/** 検索クエリを正規化する（小文字化・前後空白除去）。 */
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * カタログを検索する。ラベル・タグ・絵文字そのものに部分一致する。
 * 結果は「ラベル前方一致 → ラベル部分一致 → タグ一致」の順で並べる。
 */
export function searchCatalog(query: string, limit = 50): CatalogEntry[] {
  const q = normalizeQuery(query);
  if (q === "") {
    return [];
  }
  const startsWithLabel: CatalogEntry[] = [];
  const containsLabel: CatalogEntry[] = [];
  const tagMatches: CatalogEntry[] = [];
  for (const entry of getCatalog()) {
    const label = entry.label.toLowerCase();
    if (label.startsWith(q)) {
      startsWithLabel.push(entry);
    } else if (label.includes(q) || entry.emoji.includes(q)) {
      containsLabel.push(entry);
    } else if (entry.tags.some((tag) => tag.includes(q))) {
      tagMatches.push(entry);
    }
    if (
      startsWithLabel.length + containsLabel.length + tagMatches.length >=
      limit * 3
    ) {
      break;
    }
  }
  return [...startsWithLabel, ...containsLabel, ...tagMatches].slice(0, limit);
}

/** カタログから絵文字本体で 1 件を引く（詳細表示・Shelf 追加用）。 */
export function findByEmoji(emoji: string): CatalogEntry | undefined {
  return getCatalog().find((entry) => entry.emoji === emoji);
}

/** カタログ情報を ShelfItem 用の表示メタデータに変換する。 */
export function toDisplayMetadata(
  entry: CatalogEntry,
  category?: string,
): DisplayMetadata {
  return {
    name: entry.label,
    unicode: entry.codepoint,
    category,
    keywords: entry.tags,
  };
}
