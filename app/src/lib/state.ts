// EmoShelf アプリケーション状態モデル（Phase 0 基準）
// ROADMAP.md の「Core data model」に対応する TypeScript 定義。
// v0.1 では ShelfItem.type は "unicode"（Unicode 絵文字）のみが有効。
// 将来 "sequence" / "symbol" / "image" を追加しても破壊的変更にならないよう、
// type フィールドは拡張可能な string リテラル union にしておく。

/** 永続化スキーマのバージョン。破壊的変更時のみ上げる。 */
export const STATE_SCHEMA_VERSION = 1;

/** アプリ全体の状態。起動時に読み込み、変更時に保存する。 */
export interface AppState {
  /** スキーマバージョン（将来のマイグレーション判定用） */
  schemaVersion: number;
  /** ユーザーの Board 一覧（表示順 = 配列順） */
  boards: Board[];
  /** 最近使った絵文字（新しい順、最大 30 件） */
  recent: RecentEntry[];
  /** 各種設定 */
  settings: Settings;
  /** オンボーディング完了済みかどうか */
  onboardingCompleted: boolean;
}

/** 1 枚の Board。フラット構造のみ（ネストなし）。 */
export interface Board {
  /** 安定した一意識別子（nanoid 等を想定） */
  id: string;
  /** 表示名（例: "My Shelf"） */
  name: string;
  /** Board アイコン用絵文字（任意） */
  icon?: string;
  /** Board タブの表示順（0 起点、配列順と一致させる） */
  order: number;
  /** Board 上の絵文字アイテム（表示順 = 配列順） */
  items: ShelfItem[];
}

/** Shelf 上の 1 アイテム。 */
export interface ShelfItem {
  /** 安定した一意識別子 */
  id: string;
  /**
   * アイテム種別。
   * - "unicode": Unicode 絵文字（v0.1 の主役）
   * - "sequence": 複数絵文字の組み合わせ（v0.2 以降）
   * - "symbol": 記号類（将来）
   * - "image": カスタム画像絵文字（v0.4 以降）
   */
  type: "unicode" | "sequence" | "symbol" | "image";
  /**
   * 実際にコピー／ペーストされる内容。
   * レンダラー（Twemoji 等）の見た目とは独立している。
   * 例: "😭" / "😭🙏"
   */
  payload: string;
  /** 表示用メタデータ（名前・読み・分類など） */
  display: DisplayMetadata;
  /** 利用状況メタデータ（ローカルのみ、送信しない） */
  usage: UsageMetadata;
}

/** 表示用メタデータ。検索・詳細パネルで使う。 */
export interface DisplayMetadata {
  /** 人間可読名（例: "Loudly Crying Face"） */
  name: string;
  /** Unicode コードポイント表記（例: "U+1F62D"） */
  unicode?: string;
  /** 所属カテゴリ（例: "Reactions"） */
  category?: string;
  /** 検索用キーワード */
  keywords: string[];
}

/** 利用状況メタデータ。すべてローカルのみ。 */
export interface UsageMetadata {
  /** Board に追加された日時（ISO 8601） */
  addedAt: string;
  /** 最終使用日時（ISO 8601、未使用なら undefined） */
  lastUsedAt?: string;
  /** 累計使用回数 */
  useCount: number;
}

/** 最近使った絵文字 1 件。 */
export interface RecentEntry {
  /** 絵文字ペイロード（例: "😭"） */
  payload: string;
  /** 使った日時（ISO 8601） */
  usedAt: string;
}

/** アプリ設定。 */
export interface Settings {
  /** 見た目レンダラー（v0.1 は "twemoji" 固定、切替は v0.2 以降） */
  renderer: "twemoji" | "fluent" | "noto" | "openmoji" | "native";
  /** テーマ */
  theme: "dark" | "light" | "system";
  /** 選択時の既定動作 */
  selectionBehavior: "paste-close" | "paste-keep-open" | "copy-only";
  /** Pinned（開きっぱなし）モードかどうか */
  pinned: boolean;
  /** グローバルショートカット（例: "Alt+E"） */
  globalShortcut: string;
  /** 既定で開く Board の id（未設定なら先頭 Board） */
  defaultBoardId?: string;
  /** 直近のウィンドウサイズ（復元用） */
  windowSize: { width: number; height: number };
}

/** 初期状態を生成する。初回起動・データリセット時に使う。 */
export function createInitialState(): AppState {
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    boards: [],
    recent: [],
    settings: {
      renderer: "twemoji",
      theme: "system",
      selectionBehavior: "paste-close",
      pinned: false,
      globalShortcut: "Alt+E",
      windowSize: { width: 800, height: 600 },
    },
    onboardingCompleted: false,
  };
}
