import { z } from "zod";

/** 永続化スキーマ。v1 は Phase 0、v2 は v1.0 系機能の拡張可能な土台。 */
export const STATE_SCHEMA_VERSION = 2;

export type ItemType = "unicode" | "sequence" | "symbol" | "image";
export type RendererId = "twemoji" | "fluent" | "noto" | "openmoji" | "native";
export type LocalePreference = "system" | "ja" | "en";

export interface UsageMetadata {
  addedAt: string;
  lastUsedAt?: string;
  useCount: number;
}

export interface DisplayMetadata {
  name: string;
  unicode?: string;
  category?: string;
  keywords: string[];
}

interface ShelfItemBase {
  id: string;
  display: DisplayMetadata;
  usage: UsageMetadata;
}

export interface TextShelfItem extends ShelfItemBase {
  type: "unicode" | "sequence" | "symbol";
  payload: string;
}

export interface ImageShelfItem extends ShelfItemBase {
  type: "image";
  assetId: string;
}

export type ShelfItem = TextShelfItem | ImageShelfItem;
export type NewShelfItem =
  | Omit<TextShelfItem, "id" | "usage">
  | Omit<ImageShelfItem, "id" | "usage">;

export interface Board {
  id: string;
  name: string;
  icon?: string;
  order: number;
  items: ShelfItem[];
}

export interface RecentEntry {
  id: string;
  type: ItemType;
  payload?: string;
  assetId?: string;
  usedAt: string;
}

export interface CustomAsset {
  id: string;
  fileName: string;
  mediaType: "image/png" | "image/webp";
  width: number;
  height: number;
  byteLength: number;
  sha256: string;
  addedAt: string;
}

export interface Settings {
  renderer: RendererId;
  theme: "dark" | "light" | "system";
  locale: LocalePreference;
  selectionBehavior: "paste-close" | "paste-keep-open" | "copy-only";
  pinned: boolean;
  globalShortcut: string;
  defaultBoardId?: string;
  windowSize: { width: number; height: number };
  reducedMotion: boolean;
  autostart: boolean;
  usageTrackingEnabled: boolean;
  shelfGlow: boolean;
  perAppBoardsEnabled: boolean;
  popupPositionBehavior: "active-monitor" | "remember-last";
}

export interface AppState {
  schemaVersion: typeof STATE_SCHEMA_VERSION;
  boards: Board[];
  recent: RecentEntry[];
  settings: Settings;
  onboardingCompleted: boolean;
  appBoardMappings: Record<string, string>;
  customAssets: Record<string, CustomAsset>;
  /** 同一schemaの未知フィールドを捨てずに次回保存へ持ち越す。 */
  extensions: Record<string, unknown>;
}

const usageSchema = z
  .object({
    addedAt: z.string(),
    lastUsedAt: z.string().optional(),
    useCount: z.number().int().nonnegative(),
  })
  .strict();

const displaySchema = z
  .object({
    name: z.string(),
    unicode: z.string().optional(),
    category: z.string().optional(),
    keywords: z.array(z.string()),
  })
  .strict();

const textItemFields = {
  id: z.string().min(1),
  payload: z.string().min(1),
  display: displaySchema,
  usage: usageSchema,
};

const shelfItemSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("unicode"), ...textItemFields }).strict(),
  z.object({ type: z.literal("sequence"), ...textItemFields }).strict(),
  z.object({ type: z.literal("symbol"), ...textItemFields }).strict(),
  z
    .object({
      type: z.literal("image"),
      id: z.string().min(1),
      assetId: z.string().min(1),
      display: displaySchema,
      usage: usageSchema,
    })
    .strict(),
]);

const boardSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(48),
    icon: z.string().optional(),
    order: z.number().int().nonnegative(),
    items: z.array(shelfItemSchema),
  })
  .strict();

const recentSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["unicode", "sequence", "symbol", "image"]),
    payload: z.string().optional(),
    assetId: z.string().optional(),
    usedAt: z.string(),
  })
  .superRefine((entry, context) => {
    if (entry.type === "image" && entry.assetId === undefined) {
      context.addIssue({
        code: "custom",
        message: "image recent requires assetId",
      });
    }
    if (entry.type !== "image" && !entry.payload) {
      context.addIssue({
        code: "custom",
        message: "text recent requires payload",
      });
    }
  });

const customAssetSchema = z
  .object({
    id: z.string().min(1),
    fileName: z.string().min(1),
    mediaType: z.enum(["image/png", "image/webp"]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    byteLength: z.number().int().nonnegative(),
    sha256: z.string().min(1),
    addedAt: z.string(),
  })
  .strict();

const settingsSchema = z
  .object({
    renderer: z.enum(["twemoji", "fluent", "noto", "openmoji", "native"]),
    theme: z.enum(["dark", "light", "system"]),
    locale: z.enum(["system", "ja", "en"]),
    selectionBehavior: z.enum(["paste-close", "paste-keep-open", "copy-only"]),
    pinned: z.boolean(),
    globalShortcut: z.string().min(1),
    defaultBoardId: z.string().optional(),
    windowSize: z
      .object({ width: z.number().positive(), height: z.number().positive() })
      .strict(),
    reducedMotion: z.boolean(),
    autostart: z.boolean(),
    usageTrackingEnabled: z.boolean(),
    shelfGlow: z.boolean(),
    perAppBoardsEnabled: z.boolean(),
    popupPositionBehavior: z.enum(["active-monitor", "remember-last"]),
  })
  .strict();

const stateV2Schema = z
  .object({
    schemaVersion: z.literal(STATE_SCHEMA_VERSION),
    boards: z.array(boardSchema),
    recent: z.array(recentSchema).max(30),
    settings: settingsSchema,
    onboardingCompleted: z.boolean(),
    appBoardMappings: z.record(z.string(), z.string()),
    customAssets: z.record(z.string(), customAssetSchema),
    extensions: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export class FutureStateVersionError extends Error {
  constructor(readonly version: number) {
    super(
      `state schema ${version} is newer than supported schema ${STATE_SCHEMA_VERSION}`,
    );
    this.name = "FutureStateVersionError";
  }
}

export function createInitialState(): AppState {
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    boards: [],
    recent: [],
    settings: {
      renderer: "twemoji",
      theme: "system",
      locale: "system",
      selectionBehavior: "paste-close",
      pinned: false,
      globalShortcut: "Alt+E",
      windowSize: { width: 880, height: 660 },
      reducedMotion: false,
      autostart: false,
      usageTrackingEnabled: true,
      shelfGlow: false,
      perAppBoardsEnabled: false,
      popupPositionBehavior: "active-monitor",
    },
    onboardingCompleted: false,
    appBoardMappings: {},
    customAssets: {},
    extensions: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function migrateV1(raw: Record<string, unknown>): AppState {
  const base = createInitialState();
  const settings = isRecord(raw.settings) ? raw.settings : {};
  const boards = Array.isArray(raw.boards) ? raw.boards : [];
  const recent = Array.isArray(raw.recent)
    ? raw.recent.flatMap((entry): RecentEntry[] => {
        if (
          !isRecord(entry) ||
          typeof entry.payload !== "string" ||
          typeof entry.usedAt !== "string"
        ) {
          return [];
        }
        return [
          {
            id: `unicode:${entry.payload}`,
            type: "unicode",
            payload: entry.payload,
            usedAt: entry.usedAt,
          },
        ];
      })
    : [];
  const known = new Set([
    "schemaVersion",
    "boards",
    "recent",
    "settings",
    "onboardingCompleted",
  ]);
  const extensions = Object.fromEntries(
    Object.entries(raw).filter(([key]) => !known.has(key)),
  );

  return stateV2Schema.parse({
    ...base,
    boards,
    recent,
    settings: { ...base.settings, ...settings },
    onboardingCompleted: raw.onboardingCompleted === true,
    extensions,
  }) as AppState;
}

/** 保存データを検証し、v1だけを決定的にv2へ移行する。 */
export function parseAppState(raw: unknown): AppState {
  if (!isRecord(raw)) {
    throw new Error("state must be an object");
  }
  const version = raw.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    throw new Error("state schemaVersion is missing");
  }
  if (version > STATE_SCHEMA_VERSION) {
    throw new FutureStateVersionError(version);
  }
  if (version === 1) {
    return migrateV1(raw);
  }
  if (version !== STATE_SCHEMA_VERSION) {
    throw new Error(`unsupported state schema ${version}`);
  }

  const parsed = stateV2Schema.parse(raw);
  const known = new Set([
    "schemaVersion",
    "boards",
    "recent",
    "settings",
    "onboardingCompleted",
    "appBoardMappings",
    "customAssets",
    "extensions",
  ]);
  const extra = Object.fromEntries(
    Object.entries(parsed).filter(([key]) => !known.has(key)),
  );
  const {
    schemaVersion,
    boards,
    recent,
    settings,
    onboardingCompleted,
    appBoardMappings,
    customAssets,
  } = parsed;
  return {
    schemaVersion,
    boards,
    recent,
    settings,
    onboardingCompleted,
    appBoardMappings,
    customAssets,
    extensions: { ...parsed.extensions, ...extra },
  } as AppState;
}
