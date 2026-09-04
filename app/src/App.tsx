import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { ComposeTray } from "./components/ComposeTray";
import { CustomAssetArtwork } from "./components/CustomAssetArtwork";
import { CustomAssetGrid } from "./components/CustomAssetGrid";
import { DataTransferDialog } from "./components/DataTransferDialog";
import { EmojiArtwork } from "./components/EmojiArtwork";
import { Onboarding } from "./components/Onboarding";
import { RendererPackManager } from "./components/RendererPackManager";
import { ShelfGrid } from "./components/ShelfGrid";
import { VirtualEmojiGrid } from "./components/VirtualEmojiGrid";
import {
  copyCustomAsset,
  dragCustomAsset,
  pasteCustomAsset,
  pickAndImportCustomAsset,
} from "./lib/customAssets";
import {
  type AppLocale,
  type CatalogEntry,
  findByEmoji,
  getCatalog,
  getCategories,
  isEmojiCatalogLoaded,
  loadEmojiCatalogData,
  searchCatalog,
  toDisplayMetadata,
} from "./lib/emoji";
import { resolveLocale, translate } from "./lib/i18n";
import { copyPayload, pastePayload } from "./lib/paste";
import {
  type ClientPerformanceSnapshot,
  getClientPerformanceSnapshot,
  measureCatalogSearch,
  recordCatalogReady,
} from "./lib/performance";
import {
  listRendererPacks,
  type RendererPackRecord,
} from "./lib/rendererPacks";
import type { CustomAsset, ShelfItem } from "./lib/state";
import {
  countAssetBoardReferences,
  getFrequentItems,
  snapshotState,
  useShelfStore,
} from "./lib/store";
import {
  type AvailableUpdate,
  checkForUpdate,
  installAvailableUpdate,
} from "./lib/updates";

type CategoryId = number | "all" | "recent";
type Modal =
  | "new-board"
  | "rename-board"
  | "delete-board"
  | "save-sequence"
  | "edit-sequence"
  | "settings"
  | null;

interface Selection {
  payload: string;
  name: string;
  codepoint?: string;
  category?: string;
  keywords: string[];
  shortcode?: string;
  hexcode?: string;
  assetId?: string;
  itemId?: string;
  itemType?: ShelfItem["type"];
  useCount?: number;
  source: "shelf" | "catalog" | "library";
}

interface ForegroundContext {
  executable: string;
  monitor: string;
}

interface ToastState {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

interface NativePerformanceSnapshot {
  hotkeyShowSamples: number;
  hotkeyShowP95Ms: number | null;
}

function selectionFromCatalog(entry: CatalogEntry): Selection {
  return {
    payload: entry.emoji,
    name: entry.label,
    codepoint: entry.codepoint,
    category: entry.category,
    keywords: entry.tags,
    shortcode: entry.shortcode,
    hexcode: entry.hexcode,
    source: "catalog",
  };
}

function selectionFromItem(item: ShelfItem, locale: AppLocale): Selection {
  const payload = item.type === "image" ? "" : item.payload;
  const catalog =
    item.type === "unicode" ? findByEmoji(item.payload, locale) : undefined;
  return {
    payload,
    name: catalog?.label ?? item.display.name,
    codepoint: item.display.unicode,
    category: catalog?.category ?? item.display.category,
    keywords: catalog?.tags ?? item.display.keywords,
    shortcode: catalog?.shortcode,
    hexcode: catalog?.hexcode,
    assetId: item.type === "image" ? item.assetId : undefined,
    itemId: item.id,
    itemType: item.type,
    useCount: item.usage.useCount,
    source: "shelf",
  };
}

function selectionFromAsset(asset: CustomAsset, locale: AppLocale): Selection {
  return {
    payload: "",
    name: locale === "ja" ? "カスタム画像" : "Custom image",
    category: locale === "ja" ? "カスタム" : "Custom",
    keywords: ["custom", "image"],
    assetId: asset.id,
    itemType: "image",
    source: "library",
  };
}

function TitleBar({
  locale,
  pinned,
  onTogglePinned,
}: {
  locale: AppLocale;
  pinned: boolean;
  onTogglePinned: () => void;
}) {
  const appWindow = getCurrentWindow();
  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="brand" data-tauri-drag-region>
        <span className="brand-mark" aria-hidden="true">
          <span>😎</span>
        </span>
        <strong data-tauri-drag-region>EmoShelf</strong>
        <span className="version-pill" data-tauri-drag-region>
          v0.5
        </span>
      </div>
      <div className="window-controls">
        <button
          aria-label={
            pinned ? translate(locale, "unpin") : translate(locale, "pin")
          }
          className={pinned ? "pin-button is-active" : "pin-button"}
          onClick={onTogglePinned}
          title={pinned ? translate(locale, "unpin") : translate(locale, "pin")}
          type="button"
        >
          {pinned ? "◆" : "◇"}
        </button>
        <button
          aria-label={translate(locale, "minimize")}
          onClick={() => void appWindow.minimize()}
          type="button"
        >
          <span aria-hidden="true">—</span>
        </button>
        <button
          aria-label={translate(locale, "maximize")}
          className="maximize-button"
          onClick={() => void appWindow.toggleMaximize()}
          type="button"
        >
          <span aria-hidden="true">□</span>
        </button>
        <button
          aria-label={translate(locale, "close")}
          className="close-button"
          onClick={() => void appWindow.hide()}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </header>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus();
    return () => previousFocus?.focus();
  }, []);

  return (
    <dialog
      aria-labelledby="modal-title"
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
          return;
        }
        if (event.key === "Tab") {
          const focusable = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
            ),
          );
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (!first || !last) {
            return;
          }
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
      open
      ref={dialogRef}
    >
      <section className="modal-card">
        <header>
          <h2 id="modal-title">{title}</h2>
          <button
            aria-label={`Close / 閉じる: ${title}`}
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>
        {children}
      </section>
    </dialog>
  );
}

function App() {
  const loaded = useShelfStore((state) => state.loaded);
  const boards = useShelfStore((state) => state.boards);
  const recent = useShelfStore((state) => state.recent);
  const settings = useShelfStore((state) => state.settings);
  const appBoardMappings = useShelfStore((state) => state.appBoardMappings);
  const customAssets = useShelfStore((state) => state.customAssets);
  const onboardingCompleted = useShelfStore(
    (state) => state.onboardingCompleted,
  );
  const loadError = useShelfStore((state) => state.loadError);
  const saveError = useShelfStore((state) => state.saveError);
  const persistenceBlocked = useShelfStore((state) => state.persistenceBlocked);
  const recoveredFromBackup = useShelfStore(
    (state) => state.recoveredFromBackup,
  );
  const locale = resolveLocale(settings.locale);
  const [activeBoardId, setActiveBoardId] = useState<string>();
  const [catalogMode, setCatalogMode] = useState(false);
  const [frequentMode, setFrequentMode] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId>("all");
  const [selection, setSelection] = useState<Selection>();
  const [editMode, setEditMode] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [boardName, setBoardName] = useState("");
  const [boardIcon, setBoardIcon] = useState("✨");
  const [shortcutDraft, setShortcutDraft] = useState(settings.globalShortcut);
  const [shortcutError, setShortcutError] = useState("");
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composition, setComposition] = useState<string[]>([]);
  const [sequenceName, setSequenceName] = useState("");
  const [sequenceDraft, setSequenceDraft] = useState("");
  const [toast, setToast] = useState<ToastState>();
  const [foregroundContext, setForegroundContext] =
    useState<ForegroundContext>();
  const [integrationError, setIntegrationError] = useState("");
  const [rendererPacks, setRendererPacks] = useState<RendererPackRecord[]>([]);
  const [catalogReady, setCatalogReady] = useState(isEmojiCatalogLoaded);
  const [catalogError, setCatalogError] = useState("");
  const [updaterConfigured, setUpdaterConfigured] = useState(false);
  const [updatePhase, setUpdatePhase] = useState<
    "idle" | "checking" | "current" | "available" | "installing" | "error"
  >("idle");
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdate>();
  const [clientPerformance, setClientPerformance] =
    useState<ClientPerformanceSnapshot>();
  const [nativePerformance, setNativePerformance] =
    useState<NativePerformanceSnapshot>();
  const toastId = useRef(0);
  const updateCheckStarted = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (catalogReady) {
      return;
    }
    void loadEmojiCatalogData()
      .then(() => setCatalogReady(true))
      .catch((error) => setCatalogError(String(error)));
  }, [catalogReady]);

  useEffect(() => {
    if (loaded && catalogReady) {
      recordCatalogReady();
    }
  }, [catalogReady, loaded]);

  const refreshRendererPacks = useCallback(async () => {
    try {
      const packs = await listRendererPacks();
      setRendererPacks(packs);
      const renderer = useShelfStore.getState().settings.renderer;
      if (
        !["twemoji", "native"].includes(renderer) &&
        !packs.some((pack) => pack.rendererId === renderer && pack.enabled)
      ) {
        useShelfStore.getState().updateSettings({ renderer: "twemoji" });
      }
    } catch (error) {
      setIntegrationError(String(error));
    }
  }, []);

  const activeBoard =
    boards.find((board) => board.id === activeBoardId) ?? boards[0];
  const frequentItems = useMemo(() => getFrequentItems(boards), [boards]);
  const customAssetList = useMemo(
    () =>
      Object.values(customAssets).sort((left, right) =>
        right.addedAt.localeCompare(left.addedAt),
      ),
    [customAssets],
  );
  const customAssetReferences = useMemo(
    () =>
      new Map(
        customAssetList.map((asset) => [
          asset.id,
          countAssetBoardReferences({ boards }, asset.id),
        ]),
      ),
    [boards, customAssetList],
  );
  const activeRendererPack = rendererPacks.find(
    (pack) => pack.rendererId === settings.renderer && pack.enabled,
  );
  const displayedShelfItems = frequentMode
    ? frequentItems
    : (activeBoard?.items ?? []);
  const catalog = useMemo(
    () => (catalogReady ? getCatalog(locale) : []),
    [catalogReady, locale],
  );
  const categories = useMemo(
    () => (catalogReady ? getCategories(locale) : []),
    [catalogReady, locale],
  );
  const catalogEntries = useMemo(() => {
    if (query.trim()) {
      return measureCatalogSearch(() => searchCatalog(query, 1949, locale));
    }
    if (category === "recent") {
      return recent.flatMap((entry) => {
        if (!entry.payload) {
          return [];
        }
        const found = findByEmoji(entry.payload, locale);
        return found ? [found] : [];
      });
    }
    return category === "all"
      ? catalog
      : catalog.filter((entry) => entry.group === category);
  }, [catalog, category, locale, query, recent]);

  const refreshPerformance = useCallback(async () => {
    setClientPerformance(getClientPerformanceSnapshot());
    try {
      setNativePerformance(
        await invoke<NativePerformanceSnapshot>("get_performance_snapshot"),
      );
    } catch (error) {
      setIntegrationError(String(error));
    }
  }, []);
  const navigableSelections = useMemo(() => {
    if (!catalogReady) {
      return [];
    }
    return customMode
      ? customAssetList.map((asset) => selectionFromAsset(asset, locale))
      : catalogMode
        ? catalogEntries.map(selectionFromCatalog)
        : displayedShelfItems.map((item) => selectionFromItem(item, locale));
  }, [
    catalogEntries,
    catalogReady,
    catalogMode,
    customAssetList,
    customMode,
    displayedShelfItems,
    locale,
  ]);

  const showToast = useCallback(
    (message: string, action?: ToastState["action"]) => {
      toastId.current += 1;
      const next = { id: toastId.current, message, action };
      setToast(next);
      window.setTimeout(
        () =>
          setToast((current) =>
            current?.id === next.id ? undefined : current,
          ),
        4200,
      );
    },
    [],
  );

  const installUpdate = useCallback(async () => {
    if (!window.confirm(translate(locale, "updatePermission"))) {
      return;
    }
    setUpdatePhase("installing");
    try {
      await installAvailableUpdate();
    } catch (error) {
      setUpdatePhase("error");
      setIntegrationError(
        `${translate(locale, "updateFailed")}: ${String(error)}`,
      );
    }
  }, [locale]);

  const checkUpdates = useCallback(
    async (silent = false) => {
      if (!silent) {
        setUpdatePhase("checking");
      }
      try {
        const update = await checkForUpdate();
        setAvailableUpdate(update ?? undefined);
        setUpdatePhase(update ? "available" : "current");
        if (update && silent) {
          showToast(
            translate(locale, "updateAvailable").replace(
              "{version}",
              update.version,
            ),
            {
              label: translate(locale, "installUpdate"),
              run: () => void installUpdate(),
            },
          );
        }
      } catch (error) {
        setUpdatePhase("error");
        if (!silent) {
          setIntegrationError(
            `${translate(locale, "updateFailed")}: ${String(error)}`,
          );
        }
      }
    },
    [installUpdate, locale, showToast],
  );

  useEffect(() => {
    if (!loaded || updateCheckStarted.current) {
      return;
    }
    updateCheckStarted.current = true;
    let cancelled = false;
    let timer: number | undefined;
    void invoke<boolean>("updater_available")
      .then((configured) => {
        if (cancelled) {
          return;
        }
        setUpdaterConfigured(configured);
        if (configured) {
          timer = window.setTimeout(() => void checkUpdates(true), 5000);
        }
      })
      .catch(() => setUpdaterConfigured(false));
    return () => {
      cancelled = true;
      updateCheckStarted.current = false;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [checkUpdates, loaded]);

  useEffect(() => {
    if (!activeBoardId || !boards.some((board) => board.id === activeBoardId)) {
      setActiveBoardId(settings.defaultBoardId ?? boards[0]?.id);
    }
  }, [activeBoardId, boards, settings.defaultBoardId]);

  useEffect(() => {
    setShortcutDraft(settings.globalShortcut);
  }, [settings.globalShortcut]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.lang = locale;
    document.documentElement.dataset.reducedMotion = settings.reducedMotion
      ? "true"
      : "false";
  }, [locale, settings.reducedMotion, settings.theme]);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    void invoke("set_context_preferences", {
      perAppBoardsEnabled: settings.perAppBoardsEnabled,
      popupPositionBehavior: settings.popupPositionBehavior,
    }).catch((error) => setIntegrationError(String(error)));
    if (!settings.perAppBoardsEnabled) {
      setForegroundContext(undefined);
    }
  }, [loaded, settings.perAppBoardsEnabled, settings.popupPositionBehavior]);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    void invoke<boolean>("get_autostart")
      .then((enabled) => {
        if (
          typeof enabled === "boolean" &&
          enabled !== useShelfStore.getState().settings.autostart
        ) {
          useShelfStore.getState().updateSettings({ autostart: enabled });
        }
      })
      .catch((error) => setIntegrationError(String(error)));
  }, [loaded]);

  useEffect(() => {
    if (loaded) {
      void refreshRendererPacks();
    }
  }, [loaded, refreshRendererPacks]);

  const refreshForegroundContext = useCallback(async () => {
    if (!settings.perAppBoardsEnabled) {
      return;
    }
    try {
      const context = await invoke<ForegroundContext | null>(
        "get_foreground_context",
      );
      setForegroundContext(context ?? undefined);
      const mappedBoardId = context
        ? appBoardMappings[context.executable]
        : undefined;
      if (mappedBoardId && boards.some((board) => board.id === mappedBoardId)) {
        setActiveBoardId(mappedBoardId);
        setFrequentMode(false);
        setCustomMode(false);
        setCatalogMode(false);
        setQuery("");
        setSelection(undefined);
      }
      setIntegrationError("");
    } catch (error) {
      setIntegrationError(String(error));
    }
  }, [appBoardMappings, boards, settings.perAppBoardsEnabled]);

  useEffect(() => {
    if (!loaded || !settings.perAppBoardsEnabled) {
      return;
    }
    const onFocus = () => void refreshForegroundContext();
    void refreshForegroundContext();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loaded, refreshForegroundContext, settings.perAppBoardsEnabled]);

  const pasteSelection = useCallback(
    async (current: Selection, forceKeepOpen = false) => {
      const keepOpen =
        forceKeepOpen ||
        settings.pinned ||
        settings.selectionBehavior === "paste-keep-open";
      if (current.itemType === "image" && current.assetId) {
        try {
          if (settings.selectionBehavior === "copy-only") {
            await copyCustomAsset(current.assetId);
            showToast(translate(locale, "copied"));
          } else {
            await pasteCustomAsset(current.assetId, keepOpen);
          }
          const selectedItem = current.itemId
            ? useShelfStore
                .getState()
                .boards.flatMap((board) => board.items)
                .find((item) => item.id === current.itemId)
            : undefined;
          if (selectedItem) {
            useShelfStore.getState().recordItemUse(selectedItem);
          }
          setIntegrationError("");
        } catch (error) {
          setIntegrationError(String(error));
        }
        return;
      }
      const outcome = await pastePayload(
        current.payload,
        settings.selectionBehavior,
        keepOpen,
      );
      const store = useShelfStore.getState();
      const selectedItem = current.itemId
        ? store.boards
            .flatMap((board) => board.items)
            .find((item) => item.id === current.itemId)
        : undefined;
      if (selectedItem) {
        store.recordItemUse(selectedItem);
      } else if (current.itemType !== "image") {
        store.recordUse(
          current.payload,
          current.itemType === "sequence" || current.itemType === "symbol"
            ? current.itemType
            : "unicode",
        );
      }
      if (outcome === "copied") {
        showToast(
          settings.selectionBehavior === "copy-only"
            ? translate(locale, "copied")
            : translate(locale, "pasteFailed"),
        );
      }
    },
    [locale, settings.pinned, settings.selectionBehavior, showToast],
  );

  const pasteComposition = useCallback(
    async (forceKeepOpen = false) => {
      const payload = composition.join("");
      if (!payload) {
        return;
      }
      const keepOpen =
        forceKeepOpen ||
        settings.pinned ||
        settings.selectionBehavior === "paste-keep-open";
      const outcome = await pastePayload(
        payload,
        settings.selectionBehavior,
        keepOpen,
      );
      useShelfStore.getState().recordUse(payload, "sequence");
      if (outcome === "copied") {
        showToast(translate(locale, "copied"));
      }
    },
    [
      composition,
      locale,
      settings.pinned,
      settings.selectionBehavior,
      showToast,
    ],
  );

  const moveKeyboardSelection = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      if (!navigableSelections.length) {
        return;
      }
      const currentIndex = navigableSelections.findIndex((entry) =>
        selection?.itemId
          ? entry.itemId === selection.itemId
          : entry.payload === selection?.payload,
      );
      const columns = Math.max(
        4,
        Math.floor(Math.max(320, window.innerWidth - 290) / 72),
      );
      const delta =
        direction === "left"
          ? -1
          : direction === "right"
            ? 1
            : direction === "up"
              ? -columns
              : columns;
      const nextIndex = Math.max(
        0,
        Math.min(
          navigableSelections.length - 1,
          currentIndex < 0 ? 0 : currentIndex + delta,
        ),
      );
      setSelection(navigableSelections[nextIndex]);
    },
    [navigableSelections, selection],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFrequentMode(false);
        setCustomMode(false);
        setCatalogMode(true);
        searchRef.current?.focus();
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setActionMenuOpen((open) => !open);
        return;
      }
      if (event.ctrlKey && /^[1-9]$/.test(event.key)) {
        const board = boards[Number(event.key) - 1];
        if (board) {
          event.preventDefault();
          setActiveBoardId(board.id);
          setFrequentMode(false);
          setCustomMode(false);
          setCatalogMode(false);
          setQuery("");
        }
        return;
      }
      if (event.key === "Escape") {
        if (modal) {
          setModal(null);
        } else if (actionMenuOpen) {
          setActionMenuOpen(false);
        } else if (query) {
          setQuery("");
        } else if (catalogMode) {
          setCatalogMode(false);
        } else if (customMode) {
          setCustomMode(false);
        } else if (!settings.pinned) {
          void getCurrentWindow().hide();
        }
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      const direction =
        event.key === "ArrowLeft"
          ? "left"
          : event.key === "ArrowRight"
            ? "right"
            : event.key === "ArrowUp"
              ? "up"
              : event.key === "ArrowDown"
                ? "down"
                : null;
      if (direction && !modal) {
        event.preventDefault();
        moveKeyboardSelection(direction);
        return;
      }
      if (event.key === "Enter" && !modal) {
        if (composeOpen && composition.length && !event.ctrlKey) {
          event.preventDefault();
          void pasteComposition();
          return;
        }
        if (!selection) {
          return;
        }
        event.preventDefault();
        if (
          event.ctrlKey &&
          selection.source === "library" &&
          selection.assetId &&
          activeBoard
        ) {
          const asset = customAssets[selection.assetId];
          if (asset) {
            const added = useShelfStore
              .getState()
              .addItemToBoard(activeBoard.id, {
                type: "image",
                assetId: asset.id,
                display: {
                  name: selection.name,
                  category: selection.category,
                  keywords: selection.keywords,
                },
              });
            showToast(
              added
                ? translate(locale, "addedToShelf")
                : translate(locale, "saved"),
            );
          }
        } else if (
          event.ctrlKey &&
          selection.source === "catalog" &&
          activeBoard
        ) {
          const entry = findByEmoji(selection.payload, locale);
          if (entry) {
            const added = useShelfStore
              .getState()
              .addItemToBoard(activeBoard.id, {
                type: "unicode",
                payload: entry.emoji,
                display: toDisplayMetadata(entry),
              });
            showToast(
              added
                ? translate(locale, "addedToShelf")
                : translate(locale, "saved"),
            );
          }
        } else {
          void pasteSelection(selection, event.ctrlKey);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    actionMenuOpen,
    activeBoard,
    boards,
    catalogMode,
    customMode,
    composeOpen,
    composition.length,
    customAssets,
    locale,
    modal,
    moveKeyboardSelection,
    pasteComposition,
    pasteSelection,
    query,
    selection,
    settings.pinned,
    showToast,
  ]);

  if (!loaded || !catalogReady) {
    return (
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          {translate(locale, "skipToContent")}
        </a>
        <TitleBar
          locale={locale}
          onTogglePinned={() => undefined}
          pinned={false}
        />
        <main className="loading-state" id="main-content">
          <span aria-hidden="true" className="loading-orbit" />
          {catalogError || translate(locale, "loading")}
        </main>
      </div>
    );
  }

  if (!onboardingCompleted) {
    return (
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          {translate(locale, "skipToContent")}
        </a>
        <TitleBar
          locale={locale}
          onTogglePinned={() =>
            useShelfStore
              .getState()
              .updateSettings({ pinned: !settings.pinned })
          }
          pinned={settings.pinned}
        />
        <Onboarding
          locale={locale}
          onFinish={(items) => {
            const id = useShelfStore.getState().finishOnboarding(items);
            setActiveBoardId(id);
          }}
          renderer={settings.renderer}
        />
      </div>
    );
  }

  const addPayloadToComposition = (payload: string) => {
    setComposeOpen(true);
    setComposition((current) =>
      current.length >= 32 ? current : [...current, payload],
    );
  };

  const selectShelfItem = (item: ShelfItem) => {
    const next = selectionFromItem(item, locale);
    setSelection(next);
    if (composeOpen && item.type !== "image") {
      addPayloadToComposition(item.payload);
      return;
    }
    if (!editMode) {
      void pasteSelection(next);
    }
  };

  const selectCatalogEntry = (entry: CatalogEntry) => {
    setSelection(selectionFromCatalog(entry));
    if (composeOpen) {
      addPayloadToComposition(entry.emoji);
    }
  };

  const selectCustomAsset = (asset: CustomAsset) => {
    setSelection(selectionFromAsset(asset, locale));
  };

  const importCustomAsset = async () => {
    try {
      const asset = await pickAndImportCustomAsset();
      if (!asset) {
        return;
      }
      useShelfStore.getState().registerCustomAsset(asset);
      setCustomMode(true);
      setCatalogMode(false);
      setFrequentMode(false);
      setSelection(selectionFromAsset(asset, locale));
      setIntegrationError("");
      showToast(locale === "ja" ? "画像を取り込みました" : "Image imported");
    } catch (error) {
      setIntegrationError(String(error));
    }
  };

  const removeCustomAsset = async (asset: CustomAsset) => {
    try {
      await useShelfStore.getState().removeCustomAsset(asset.id);
      if (selection?.assetId === asset.id) {
        setSelection(undefined);
      }
      showToast(locale === "ja" ? "画像を削除しました" : "Image deleted");
    } catch (error) {
      setIntegrationError(String(error));
    }
  };

  const startAssetDrag = async (assetId: string) => {
    try {
      await dragCustomAsset(assetId);
      setIntegrationError("");
    } catch (error) {
      try {
        await copyCustomAsset(assetId);
        showToast(
          locale === "ja"
            ? "ドラッグできなかったため画像をコピーしました"
            : "Drag failed, so the image was copied",
        );
      } catch {
        setIntegrationError(String(error));
      }
    }
  };

  const addSelectionToBoard = (boardId: string) => {
    if (!selection) {
      return;
    }
    if (selection.itemType === "image" && selection.assetId) {
      const asset = customAssets[selection.assetId];
      if (!asset) {
        return;
      }
      const added = useShelfStore.getState().addItemToBoard(boardId, {
        type: "image",
        assetId: asset.id,
        display: {
          name: selection.name,
          category: selection.category,
          keywords: selection.keywords,
        },
      });
      showToast(
        added ? translate(locale, "addedToShelf") : translate(locale, "saved"),
      );
      return;
    }
    const entry = findByEmoji(selection.payload, locale);
    if (!entry) {
      return;
    }
    const added = useShelfStore.getState().addItemToBoard(boardId, {
      type: "unicode",
      payload: entry.emoji,
      display: toDisplayMetadata(entry),
    });
    showToast(
      added ? translate(locale, "addedToShelf") : translate(locale, "saved"),
    );
  };

  const removeSelection = () => {
    if (activeBoard && selection?.itemId) {
      useShelfStore
        .getState()
        .removeItemFromBoard(activeBoard.id, selection.itemId);
      setSelection(undefined);
    }
  };

  const deleteActiveBoard = () => {
    if (!activeBoard || boards.length <= 1) {
      return;
    }
    const deleted = activeBoard;
    const index = boards.findIndex((board) => board.id === deleted.id);
    useShelfStore.getState().removeBoard(deleted.id);
    setModal(null);
    setSelection(undefined);
    showToast(translate(locale, "boardDeleted"), {
      label: translate(locale, "undo"),
      run: () => {
        useShelfStore.getState().restoreBoard(deleted, index);
        setActiveBoardId(deleted.id);
      },
    });
  };

  const openSaveSequence = () => {
    const payload = composition.join("");
    if (!payload) {
      return;
    }
    setSequenceDraft(payload);
    setSequenceName("");
    setModal("save-sequence");
  };

  const openEditSequence = () => {
    if (selection?.itemType !== "sequence") {
      return;
    }
    setSequenceDraft(selection.payload);
    setSequenceName(selection.name);
    setModal("edit-sequence");
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {translate(locale, "skipToContent")}
      </a>
      <TitleBar
        locale={locale}
        onTogglePinned={() =>
          useShelfStore.getState().updateSettings({ pinned: !settings.pinned })
        }
        pinned={settings.pinned}
      />

      <main className="shelf-app" id="main-content">
        {recoveredFromBackup ? (
          <div className="recovery-banner" role="status">
            <span aria-hidden="true">✓</span>
            <p>{translate(locale, "recoveredBackup")}</p>
            <button
              aria-label={translate(locale, "dismiss")}
              onClick={() => useShelfStore.getState().clearRecoveryNotice()}
              type="button"
            >
              ×
            </button>
          </div>
        ) : null}
        {(loadError || saveError || integrationError) && (
          <div className="error-banner" role="alert">
            <span aria-hidden="true">!</span>
            <p>{loadError ?? saveError ?? integrationError}</p>
            {saveError ? (
              <button
                onClick={() => {
                  void useShelfStore
                    .getState()
                    .persistNow()
                    .catch(() => undefined);
                }}
                type="button"
              >
                {translate(locale, "retrySave")}
              </button>
            ) : null}
            {saveError || integrationError ? (
              <button
                aria-label={translate(locale, "dismiss")}
                onClick={() => {
                  useShelfStore.getState().clearSaveError();
                  setIntegrationError("");
                }}
                type="button"
              >
                ×
              </button>
            ) : null}
          </div>
        )}

        <label className="search-field main-search">
          <span aria-hidden="true">⌕</span>
          <input
            onChange={(event) => {
              setQuery(event.target.value);
              setFrequentMode(false);
              setCustomMode(false);
              setCatalogMode(true);
            }}
            onFocus={() => {
              setFrequentMode(false);
              setCustomMode(false);
              setCatalogMode(true);
            }}
            placeholder={translate(locale, "searchPlaceholder")}
            ref={searchRef}
            type="search"
            value={query}
          />
          {query ? (
            <button
              aria-label="Clear search"
              onClick={() => setQuery("")}
              type="button"
            >
              ×
            </button>
          ) : (
            <kbd>Ctrl F</kbd>
          )}
        </label>

        <div className="board-row">
          <nav aria-label="Boards" className="board-tabs">
            {boards.map((board, index) => (
              <div className="board-tab-wrap" key={board.id}>
                <button
                  aria-current={
                    activeBoard?.id === board.id ? "page" : undefined
                  }
                  className={
                    activeBoard?.id === board.id
                      ? "board-tab is-active"
                      : "board-tab"
                  }
                  onClick={() => {
                    setActiveBoardId(board.id);
                    setFrequentMode(false);
                    setCustomMode(false);
                    setCatalogMode(false);
                    setQuery("");
                    setSelection(undefined);
                  }}
                  type="button"
                >
                  <span aria-hidden="true">{board.icon ?? "▦"}</span>
                  <span>{board.name}</span>
                  {index < 9 ? <kbd>{index + 1}</kbd> : null}
                </button>
                {editMode && (
                  <span className="board-reorder-controls">
                    <button
                      aria-label={`${board.name} ←`}
                      disabled={index === 0}
                      onClick={() =>
                        useShelfStore.getState().reorderBoards(index, index - 1)
                      }
                      type="button"
                    >
                      ←
                    </button>
                    <button
                      aria-label={`${board.name} →`}
                      disabled={index === boards.length - 1}
                      onClick={() =>
                        useShelfStore.getState().reorderBoards(index, index + 1)
                      }
                      type="button"
                    >
                      →
                    </button>
                  </span>
                )}
              </div>
            ))}
            <button
              aria-label={translate(locale, "newBoard")}
              className="new-board-button"
              onClick={() => {
                setBoardName("");
                setModal("new-board");
              }}
              type="button"
            >
              +
            </button>
          </nav>
          <div className="shelf-tools">
            <button
              aria-pressed={frequentMode}
              className={
                frequentMode ? "frequent-toggle is-active" : "frequent-toggle"
              }
              onClick={() => {
                setFrequentMode(true);
                setCustomMode(false);
                setCatalogMode(false);
                setEditMode(false);
                setQuery("");
                setSelection(undefined);
              }}
              type="button"
            >
              ★ {translate(locale, "frequent")}
            </button>
            <button
              aria-pressed={customMode}
              className={
                customMode ? "custom-toggle is-active" : "custom-toggle"
              }
              onClick={() => {
                setCustomMode(true);
                setFrequentMode(false);
                setCatalogMode(false);
                setEditMode(false);
                setQuery("");
                setSelection(undefined);
              }}
              type="button"
            >
              ▧ {locale === "ja" ? "画像" : "Images"}
              {customAssetList.length ? (
                <span className="tool-count">{customAssetList.length}</span>
              ) : null}
            </button>
            <button
              aria-pressed={composeOpen}
              className={
                composeOpen ? "compose-toggle is-active" : "compose-toggle"
              }
              onClick={() => setComposeOpen((open) => !open)}
              type="button"
            >
              ✦ {translate(locale, "compose")}
              {composition.length ? (
                <span className="tool-count">{composition.length}</span>
              ) : null}
            </button>
            <button
              className={editMode ? "is-active" : ""}
              disabled={frequentMode || customMode}
              onClick={() => setEditMode((editing) => !editing)}
              type="button"
            >
              {editMode
                ? translate(locale, "finishEditing")
                : translate(locale, "editShelf")}
            </button>
            {editMode && !frequentMode && !customMode && activeBoard ? (
              <button
                aria-label={translate(locale, "actions")}
                className="icon-button"
                onClick={() => setActionMenuOpen((open) => !open)}
                type="button"
              >
                •••
              </button>
            ) : null}
          </div>
        </div>

        {actionMenuOpen && activeBoard ? (
          <div className="action-popover board-actions" role="menu">
            <button
              onClick={() => {
                setBoardName(activeBoard.name);
                setBoardIcon(activeBoard.icon ?? "✨");
                setModal("rename-board");
                setActionMenuOpen(false);
              }}
              role="menuitem"
              type="button"
            >
              ✎ {translate(locale, "rename")}
            </button>
            <button
              className="danger-action"
              disabled={boards.length <= 1}
              onClick={() => {
                setModal("delete-board");
                setActionMenuOpen(false);
              }}
              role="menuitem"
              type="button"
            >
              ⌫ {translate(locale, "delete")}
            </button>
          </div>
        ) : null}

        {catalogMode ? (
          <nav
            aria-label={translate(locale, "categories")}
            className="category-strip catalog-categories"
          >
            {categories.map((item) => (
              <button
                aria-pressed={category === item.id}
                className={category === item.id ? "is-active" : ""}
                key={item.key}
                onClick={() => setCategory(item.id)}
                title={item.label}
                type="button"
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        ) : null}

        <section className="content-split">
          <div className="main-panel">
            <header className="panel-label">
              <div>
                <span className="shelf-dot" />
                <strong>
                  {customMode
                    ? locale === "ja"
                      ? "カスタム画像"
                      : "Custom images"
                    : catalogMode
                      ? query
                        ? translate(locale, "searchResults")
                        : categories.find((item) => item.id === category)?.label
                      : frequentMode
                        ? translate(locale, "frequent")
                        : activeBoard?.name}
                </strong>
              </div>
              {customMode ? (
                <button
                  className="asset-import-button"
                  onClick={() => void importCustomAsset()}
                  type="button"
                >
                  + {locale === "ja" ? "画像を追加" : "Add image"}
                </button>
              ) : null}
              <span>
                {customMode
                  ? customAssetList.length
                  : catalogMode
                    ? catalogEntries.length
                    : displayedShelfItems.length}{" "}
                {translate(locale, "items")}
              </span>
            </header>

            {customMode ? (
              customAssetList.length ? (
                <CustomAssetGrid
                  assets={customAssetList}
                  locale={locale}
                  onDelete={(asset) => void removeCustomAsset(asset)}
                  onSelect={selectCustomAsset}
                  referenceCounts={customAssetReferences}
                  selectedId={selection?.assetId}
                />
              ) : (
                <div className="empty-state shelf-empty">
                  <span aria-hidden="true">▧</span>
                  <h2>
                    {locale === "ja"
                      ? "カスタム画像はまだありません"
                      : "No custom images yet"}
                  </h2>
                  <p>
                    {locale === "ja"
                      ? "PNG・WebP・SVGを安全に取り込み、Shelfへ追加できます。"
                      : "Safely import PNG, WebP, or SVG files and add them to a Shelf."}
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => void importCustomAsset()}
                    type="button"
                  >
                    {locale === "ja" ? "画像を取り込む" : "Import image"}
                  </button>
                </div>
              )
            ) : catalogMode ? (
              catalogEntries.length ? (
                <VirtualEmojiGrid
                  entries={catalogEntries}
                  locale={locale}
                  onSelect={selectCatalogEntry}
                  renderer={settings.renderer}
                  selectedEmoji={selection?.payload}
                />
              ) : (
                <div className="empty-state">
                  <span aria-hidden="true">⌕</span>
                  <h2>{translate(locale, "noResults")}</h2>
                  <p>{translate(locale, "noResultsBody")}</p>
                </div>
              )
            ) : displayedShelfItems.length ? (
              <ShelfGrid
                editMode={editMode && !frequentMode}
                items={displayedShelfItems}
                locale={locale}
                onRemove={(itemId) => {
                  if (activeBoard && !frequentMode) {
                    useShelfStore
                      .getState()
                      .removeItemFromBoard(activeBoard.id, itemId);
                  }
                }}
                onReorder={(fromIndex, toIndex) => {
                  if (activeBoard && !frequentMode) {
                    useShelfStore
                      .getState()
                      .moveItemWithinBoard(activeBoard.id, fromIndex, toIndex);
                  }
                }}
                onSelect={selectShelfItem}
                renderer={settings.renderer}
                selectedId={selection?.itemId}
                shelfGlow={settings.shelfGlow}
              />
            ) : (
              <div className="empty-state shelf-empty">
                <span aria-hidden="true">{frequentMode ? "★" : "✨"}</span>
                <h2>
                  {translate(
                    locale,
                    frequentMode ? "emptyFrequent" : "emptyShelf",
                  )}
                </h2>
                <p>
                  {translate(
                    locale,
                    frequentMode ? "emptyFrequentBody" : "emptyShelfBody",
                  )}
                </p>
                {!frequentMode ? (
                  <button
                    className="primary-button"
                    onClick={() => setCatalogMode(true)}
                    type="button"
                  >
                    {translate(locale, "browseEmoji")}
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <aside className="detail-panel">
            {selection ? (
              <>
                <div className="detail-artwork">
                  {selection.itemType === "image" && selection.assetId ? (
                    <CustomAssetArtwork
                      assetId={selection.assetId}
                      className="detail-emoji custom-detail-image"
                    />
                  ) : (
                    <EmojiArtwork
                      className="detail-emoji"
                      emoji={selection.payload}
                      hexcode={selection.hexcode}
                      locale={locale}
                      renderer={settings.renderer}
                    />
                  )}
                </div>
                <h2>{selection.name}</h2>
                {selection.shortcode ? (
                  <code>:{selection.shortcode}:</code>
                ) : null}
                <dl className="detail-list">
                  <div>
                    <dt>{locale === "ja" ? "カテゴリ" : "Category"}</dt>
                    <dd>{selection.category ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Unicode</dt>
                    <dd>
                      {selection.itemType === "image"
                        ? locale === "ja"
                          ? "ローカル画像"
                          : "Local image"
                        : (selection.codepoint ?? "—")}
                    </dd>
                  </div>
                  <div>
                    <dt>{locale === "ja" ? "キーワード" : "Keywords"}</dt>
                    <dd>{selection.keywords.slice(0, 4).join(", ") || "—"}</dd>
                  </div>
                  {selection.useCount !== undefined ? (
                    <div>
                      <dt>{translate(locale, "usageCount")}</dt>
                      <dd>{selection.useCount}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="detail-actions">
                  {selection.itemType !== "image" ? (
                    <button
                      className="compose-action"
                      onClick={() => addPayloadToComposition(selection.payload)}
                      type="button"
                    >
                      ✦ {translate(locale, "addToCompose")}
                    </button>
                  ) : null}
                  {selection.itemType === "image" && selection.assetId ? (
                    <>
                      <button
                        className="quiet-button"
                        onClick={() =>
                          void copyCustomAsset(selection.assetId ?? "").then(
                            () => showToast(translate(locale, "copied")),
                          )
                        }
                        type="button"
                      >
                        {locale === "ja" ? "画像をコピー" : "Copy image"}
                      </button>
                      <button
                        className="quiet-button"
                        onPointerDown={() =>
                          void startAssetDrag(selection.assetId ?? "")
                        }
                        type="button"
                      >
                        {locale === "ja" ? "外へドラッグ" : "Drag out"}
                      </button>
                    </>
                  ) : null}
                  {selection.source === "shelf" &&
                  selection.itemType === "sequence" ? (
                    <button
                      className="quiet-button"
                      onClick={openEditSequence}
                      type="button"
                    >
                      {translate(locale, "editSequence")}
                    </button>
                  ) : null}
                  {(selection.source === "catalog" ||
                    selection.source === "library") &&
                  activeBoard ? (
                    <button
                      className="shelf-action"
                      onClick={() => addSelectionToBoard(activeBoard.id)}
                      type="button"
                    >
                      <span aria-hidden="true">★</span>
                      {translate(locale, "addToShelf")}
                    </button>
                  ) : null}
                  {selection.source === "shelf" && editMode && !frequentMode ? (
                    <button
                      className="danger-quiet"
                      onClick={removeSelection}
                      type="button"
                    >
                      {translate(locale, "removeFromShelf")}
                    </button>
                  ) : null}
                  {boards.length > 1 && !frequentMode ? (
                    <label className="board-target-field">
                      <span>
                        {selection.source === "shelf"
                          ? translate(locale, "moveTo")
                          : translate(locale, "copyTo")}
                      </span>
                      <select
                        defaultValue=""
                        onChange={(event) => {
                          const targetId = event.target.value;
                          if (!targetId || !activeBoard) {
                            return;
                          }
                          if (
                            selection.source === "shelf" &&
                            selection.itemId
                          ) {
                            useShelfStore
                              .getState()
                              .moveItemToBoard(
                                activeBoard.id,
                                targetId,
                                selection.itemId,
                              );
                            setSelection(undefined);
                          } else {
                            addSelectionToBoard(targetId);
                          }
                          event.target.value = "";
                        }}
                      >
                        <option value="">—</option>
                        {boards
                          .filter((board) => board.id !== activeBoard?.id)
                          .map((board) => (
                            <option key={board.id} value={board.id}>
                              {board.icon} {board.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="detail-placeholder">
                <span aria-hidden="true">☝</span>
                <p>
                  {locale === "ja"
                    ? "絵文字を選ぶと、ここに詳しい情報を表示します。"
                    : "Select an emoji to see its details."}
                </p>
              </div>
            )}
          </aside>
        </section>

        {composeOpen ? (
          <ComposeTray
            entries={composition}
            locale={locale}
            onClear={() => setComposition([])}
            onClose={() => setComposeOpen(false)}
            onCopy={() =>
              void copyPayload(composition.join(""))
                .then(() => showToast(translate(locale, "copied")))
                .catch((error) => showToast(String(error)))
            }
            onPaste={() => void pasteComposition()}
            onSave={openSaveSequence}
            onUndo={() => setComposition((current) => current.slice(0, -1))}
            renderer={settings.renderer}
          />
        ) : null}

        <section className="context-footer" aria-label="Selection actions">
          <div className="selection-summary">
            {selection ? (
              <>
                {selection.itemType === "image" && selection.assetId ? (
                  <CustomAssetArtwork assetId={selection.assetId} />
                ) : (
                  <EmojiArtwork
                    emoji={selection.payload}
                    hexcode={selection.hexcode}
                    locale={locale}
                    renderer={settings.renderer}
                  />
                )}
                <strong>{selection.name}</strong>
              </>
            ) : (
              <span>
                {locale === "ja" ? "絵文字を選択" : "Select an emoji"}
              </span>
            )}
          </div>
          <div className="shortcut-hints">
            <span>
              <kbd>Enter</kbd>
              {translate(locale, "paste")}
            </span>
            <span>
              <kbd>Ctrl Enter</kbd>
              {catalogMode || customMode
                ? translate(locale, "addToShelf")
                : translate(locale, "pinnedMode")}
            </span>
            <span>
              <kbd>Ctrl K</kbd>
              {translate(locale, "actions")}
            </span>
          </div>
        </section>
      </main>

      <footer className="utility-footer">
        <div>
          <span className="ready-dot" />
          {persistenceBlocked
            ? translate(locale, "dataReadOnly")
            : translate(locale, "ready")}
        </div>
        <span>•</span>
        <span>{translate(locale, "freeOpenSource")}</span>
        <span className="utility-spacer" />
        <span className="renderer-label">
          {settings.renderer === "twemoji"
            ? translate(locale, "attribution")
            : settings.renderer === "native"
              ? "Native emoji"
              : (activeRendererPack?.attribution ?? "Twemoji fallback")}
        </span>
        <button
          aria-label={translate(locale, "settings")}
          className="settings-button"
          onClick={() => setModal("settings")}
          type="button"
        >
          ⚙
        </button>
      </footer>

      {modal === "new-board" ? (
        <ModalShell
          onClose={() => setModal(null)}
          title={translate(locale, "newBoard")}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const id = useShelfStore
                .getState()
                .addBoard(boardName, boardIcon);
              setActiveBoardId(id);
              setModal(null);
            }}
          >
            <label className="form-field">
              <span>{translate(locale, "boardName")}</span>
              <input
                maxLength={48}
                onChange={(event) => setBoardName(event.target.value)}
                required
                value={boardName}
              />
            </label>
            <label className="form-field icon-field">
              <span>Icon</span>
              <input
                maxLength={4}
                onChange={(event) => setBoardIcon(event.target.value)}
                value={boardIcon}
              />
            </label>
            <div className="modal-actions">
              <button
                className="quiet-button"
                onClick={() => setModal(null)}
                type="button"
              >
                {translate(locale, "cancel")}
              </button>
              <button className="primary-button" type="submit">
                {translate(locale, "create")}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {modal === "rename-board" && activeBoard ? (
        <ModalShell
          onClose={() => setModal(null)}
          title={translate(locale, "rename")}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              useShelfStore.getState().renameBoard(activeBoard.id, boardName);
              useShelfStore
                .getState()
                .setBoardIcon(activeBoard.id, boardIcon || undefined);
              setModal(null);
            }}
          >
            <label className="form-field">
              <span>{translate(locale, "boardName")}</span>
              <input
                maxLength={48}
                onChange={(event) => setBoardName(event.target.value)}
                required
                value={boardName}
              />
            </label>
            <label className="form-field icon-field">
              <span>Icon</span>
              <input
                maxLength={4}
                onChange={(event) => setBoardIcon(event.target.value)}
                value={boardIcon}
              />
            </label>
            <div className="modal-actions">
              <button
                className="quiet-button"
                onClick={() => setModal(null)}
                type="button"
              >
                {translate(locale, "cancel")}
              </button>
              <button className="primary-button" type="submit">
                {translate(locale, "saved")}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {modal === "delete-board" && activeBoard ? (
        <ModalShell
          onClose={() => setModal(null)}
          title={translate(locale, "deleteBoard")}
        >
          <p>{translate(locale, "deleteConfirm")}</p>
          <div className="modal-actions">
            <button
              className="quiet-button"
              onClick={() => setModal(null)}
              type="button"
            >
              {translate(locale, "cancel")}
            </button>
            <button
              className="danger-button"
              onClick={deleteActiveBoard}
              type="button"
            >
              {translate(locale, "delete")}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {modal === "save-sequence" && activeBoard ? (
        <ModalShell
          onClose={() => setModal(null)}
          title={translate(locale, "saveSequence")}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const itemId = useShelfStore
                .getState()
                .saveSequence(activeBoard.id, sequenceDraft, sequenceName);
              if (itemId) {
                showToast(translate(locale, "saved"));
                setModal(null);
              }
            }}
          >
            <label className="form-field">
              <span>{translate(locale, "sequenceName")}</span>
              <input
                maxLength={48}
                onChange={(event) => setSequenceName(event.target.value)}
                placeholder={sequenceDraft}
                value={sequenceName}
              />
            </label>
            <label className="form-field">
              <span>{translate(locale, "sequenceContents")}</span>
              <textarea
                maxLength={256}
                onChange={(event) => setSequenceDraft(event.target.value)}
                required
                rows={3}
                value={sequenceDraft}
              />
            </label>
            <div className="modal-actions">
              <button onClick={() => setModal(null)} type="button">
                {translate(locale, "cancel")}
              </button>
              <button className="primary-button" type="submit">
                {translate(locale, "saveSequence")}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {modal === "edit-sequence" && activeBoard && selection?.itemId ? (
        <ModalShell
          onClose={() => setModal(null)}
          title={translate(locale, "editSequence")}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const changed = useShelfStore
                .getState()
                .editSequence(
                  activeBoard.id,
                  selection.itemId ?? "",
                  sequenceDraft,
                  sequenceName,
                );
              if (changed) {
                setSelection({
                  ...selection,
                  payload: sequenceDraft.trim(),
                  name: sequenceName.trim() || sequenceDraft.trim(),
                });
                showToast(translate(locale, "saved"));
                setModal(null);
              }
            }}
          >
            <label className="form-field">
              <span>{translate(locale, "sequenceName")}</span>
              <input
                maxLength={48}
                onChange={(event) => setSequenceName(event.target.value)}
                value={sequenceName}
              />
            </label>
            <label className="form-field">
              <span>{translate(locale, "sequenceContents")}</span>
              <textarea
                maxLength={256}
                onChange={(event) => setSequenceDraft(event.target.value)}
                required
                rows={3}
                value={sequenceDraft}
              />
            </label>
            <div className="modal-actions">
              <button onClick={() => setModal(null)} type="button">
                {translate(locale, "cancel")}
              </button>
              <button className="primary-button" type="submit">
                {translate(locale, "saved")}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {modal === "settings" ? (
        <ModalShell
          onClose={() => setModal(null)}
          title={translate(locale, "settings")}
        >
          <div className="settings-grid">
            <label className="form-field">
              <span>{translate(locale, "language")}</span>
              <select
                onChange={(event) =>
                  useShelfStore.getState().updateSettings({
                    locale: event.target.value as typeof settings.locale,
                  })
                }
                value={settings.locale}
              >
                <option value="system">{translate(locale, "system")}</option>
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="form-field">
              <span>{translate(locale, "theme")}</span>
              <select
                onChange={(event) =>
                  useShelfStore.getState().updateSettings({
                    theme: event.target.value as typeof settings.theme,
                  })
                }
                value={settings.theme}
              >
                <option value="system">{translate(locale, "system")}</option>
                <option value="dark">{translate(locale, "dark")}</option>
                <option value="light">{translate(locale, "light")}</option>
              </select>
            </label>
            <label className="form-field">
              <span>{translate(locale, "renderer")}</span>
              <select
                onChange={(event) =>
                  useShelfStore.getState().updateSettings({
                    renderer: event.target.value as typeof settings.renderer,
                  })
                }
                value={settings.renderer}
              >
                <option value="twemoji">Twemoji</option>
                <option value="native">Native / System</option>
                <option
                  disabled={
                    !rendererPacks.some(
                      (pack) => pack.rendererId === "fluent" && pack.enabled,
                    )
                  }
                  value="fluent"
                >
                  Fluent Emoji
                </option>
                <option
                  disabled={
                    !rendererPacks.some(
                      (pack) => pack.rendererId === "noto" && pack.enabled,
                    )
                  }
                  value="noto"
                >
                  Noto Emoji
                </option>
                <option
                  disabled={
                    !rendererPacks.some(
                      (pack) => pack.rendererId === "openmoji" && pack.enabled,
                    )
                  }
                  value="openmoji"
                >
                  OpenMoji
                </option>
              </select>
            </label>
            <details className="renderer-attributions">
              <summary>{translate(locale, "rendererAttributions")}</summary>
              <ul>
                <li>Twemoji — CC BY 4.0 / package code MIT</li>
                <li>Native / System — operating system fonts</li>
                {(["fluent", "noto", "openmoji"] as const).map((rendererId) => {
                  const pack = rendererPacks.find(
                    (candidate) => candidate.rendererId === rendererId,
                  );
                  const label = {
                    fluent: "Fluent Emoji",
                    noto: "Noto Emoji",
                    openmoji: "OpenMoji",
                  }[rendererId];
                  return (
                    <li key={rendererId}>
                      {pack
                        ? `${label} — ${pack.licenseName} · v${pack.version} · ${pack.enabled ? "enabled" : "disabled"}`
                        : `${label} — external pack, not installed`}
                    </li>
                  );
                })}
              </ul>
            </details>
            <RendererPackManager
              locale={locale}
              onChange={refreshRendererPacks}
              onError={setIntegrationError}
              packs={rendererPacks}
            />
            <label className="form-field">
              <span>{translate(locale, "behavior")}</span>
              <select
                onChange={(event) =>
                  useShelfStore.getState().updateSettings({
                    selectionBehavior: event.target
                      .value as typeof settings.selectionBehavior,
                  })
                }
                value={settings.selectionBehavior}
              >
                <option value="paste-close">
                  {translate(locale, "pasteClose")}
                </option>
                <option value="paste-keep-open">
                  {translate(locale, "pasteKeepOpen")}
                </option>
                <option value="copy-only">
                  {translate(locale, "copyOnly")}
                </option>
              </select>
            </label>
            <label className="toggle-field">
              <input
                checked={settings.pinned}
                onChange={(event) =>
                  useShelfStore
                    .getState()
                    .updateSettings({ pinned: event.target.checked })
                }
                type="checkbox"
              />
              <span>{translate(locale, "pinnedMode")}</span>
            </label>
            <label className="toggle-field">
              <input
                checked={settings.reducedMotion}
                onChange={(event) =>
                  useShelfStore
                    .getState()
                    .updateSettings({ reducedMotion: event.target.checked })
                }
                type="checkbox"
              />
              <span>{translate(locale, "reducedMotion")}</span>
            </label>
            <section
              className="settings-section"
              aria-labelledby="usage-settings-title"
            >
              <h3 id="usage-settings-title">
                {translate(locale, "usageIntelligence")}
              </h3>
              <label className="toggle-field">
                <input
                  checked={settings.usageTrackingEnabled}
                  onChange={(event) =>
                    useShelfStore.getState().updateSettings({
                      usageTrackingEnabled: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
                <span>{translate(locale, "usageTracking")}</span>
              </label>
              <label className="toggle-field">
                <input
                  checked={settings.shelfGlow}
                  disabled={!settings.usageTrackingEnabled}
                  onChange={(event) =>
                    useShelfStore
                      .getState()
                      .updateSettings({ shelfGlow: event.target.checked })
                  }
                  type="checkbox"
                />
                <span>{translate(locale, "shelfGlow")}</span>
              </label>
              <button
                className="quiet-button settings-inline-action"
                onClick={() => {
                  if (window.confirm(translate(locale, "resetUsageConfirm"))) {
                    useShelfStore.getState().resetUsageStatistics();
                    setSelection(undefined);
                    showToast(translate(locale, "usageReset"));
                  }
                }}
                type="button"
              >
                {translate(locale, "resetUsage")}
              </button>
            </section>
            <section
              className="settings-section"
              aria-labelledby="context-settings-title"
            >
              <h3 id="context-settings-title">
                {translate(locale, "contextAware")}
              </h3>
              <label className="toggle-field">
                <input
                  checked={settings.perAppBoardsEnabled}
                  onChange={(event) =>
                    useShelfStore.getState().updateSettings({
                      perAppBoardsEnabled: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
                <span>{translate(locale, "perAppBoards")}</span>
              </label>
              <p className="settings-note">
                {translate(locale, "perAppBoardsDescription")}
              </p>
              {settings.perAppBoardsEnabled ? (
                <div className="application-mapping-card">
                  {foregroundContext ? (
                    <>
                      <div className="application-context-row">
                        <span>{translate(locale, "currentApplication")}</span>
                        <code>{foregroundContext.executable}</code>
                      </div>
                      <div className="application-context-row">
                        <span>{translate(locale, "currentMonitor")}</span>
                        <code>{foregroundContext.monitor}</code>
                      </div>
                      <label className="form-field">
                        <span>{translate(locale, "mapToBoard")}</span>
                        <select
                          onChange={(event) => {
                            const boardId = event.target.value || undefined;
                            useShelfStore
                              .getState()
                              .setAppBoardMapping(
                                foregroundContext.executable,
                                boardId,
                              );
                          }}
                          value={
                            appBoardMappings[foregroundContext.executable] ?? ""
                          }
                        >
                          <option value="">
                            {translate(locale, "automaticBoard")}
                          </option>
                          {boards.map((board) => (
                            <option key={board.id} value={board.id}>
                              {board.icon} {board.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : (
                    <p>{translate(locale, "applicationUnavailable")}</p>
                  )}
                  <button
                    className="quiet-button settings-inline-action"
                    onClick={() => void refreshForegroundContext()}
                    type="button"
                  >
                    {translate(locale, "refresh")}
                  </button>
                </div>
              ) : null}
            </section>
            <section
              className="settings-section"
              aria-labelledby="windows-settings-title"
            >
              <h3 id="windows-settings-title">
                {translate(locale, "windowsIntegration")}
              </h3>
              <label className="toggle-field">
                <input
                  checked={settings.autostart}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    setIntegrationError("");
                    void useShelfStore
                      .getState()
                      .setAutostart(enabled)
                      .then(
                        () => showToast(translate(locale, "saved")),
                        (error) => setIntegrationError(String(error)),
                      );
                  }}
                  type="checkbox"
                />
                <span>{translate(locale, "startWithWindows")}</span>
              </label>
              <label className="form-field">
                <span>{translate(locale, "popupPosition")}</span>
                <select
                  onChange={(event) =>
                    useShelfStore.getState().updateSettings({
                      popupPositionBehavior: event.target
                        .value as typeof settings.popupPositionBehavior,
                    })
                  }
                  value={settings.popupPositionBehavior}
                >
                  <option value="active-monitor">
                    {translate(locale, "activeMonitor")}
                  </option>
                  <option value="remember-last">
                    {translate(locale, "rememberLast")}
                  </option>
                </select>
              </label>
              <p className="settings-note">{translate(locale, "trayHint")}</p>
            </section>
            <form
              className="shortcut-form"
              onSubmit={(event) => {
                event.preventDefault();
                setShortcutError("");
                void useShelfStore
                  .getState()
                  .setGlobalShortcut(shortcutDraft)
                  .then(
                    () => showToast(translate(locale, "saved")),
                    () =>
                      setShortcutError(translate(locale, "shortcutConflict")),
                  );
              }}
            >
              <label className="form-field">
                <span>{translate(locale, "shortcut")}</span>
                <input
                  onChange={(event) => setShortcutDraft(event.target.value)}
                  value={shortcutDraft}
                />
              </label>
              <button className="quiet-button" type="submit">
                {translate(locale, "saveShortcut")}
              </button>
              {shortcutError ? (
                <p className="field-error" role="alert">
                  {shortcutError}
                </p>
              ) : null}
            </form>
            <DataTransferDialog
              locale={locale}
              onApply={async (state, mode) => {
                await useShelfStore.getState().applyImportedState(state, mode);
                setActiveBoardId(
                  useShelfStore.getState().settings.defaultBoardId ??
                    useShelfStore.getState().boards[0]?.id,
                );
                setSelection(undefined);
                showToast(translate(locale, "importComplete"));
              }}
              state={snapshotState(useShelfStore.getState())}
            />
            <section
              aria-labelledby="backup-settings-title"
              className="settings-section"
            >
              <h3 id="backup-settings-title">
                {translate(locale, "settingsBackup")}
              </h3>
              <div className="settings-button-row">
                <button
                  className="quiet-button"
                  onClick={() => {
                    void useShelfStore
                      .getState()
                      .createSettingsBackup()
                      .then(
                        () =>
                          showToast(translate(locale, "settingsBackupCreated")),
                        (error) => setIntegrationError(String(error)),
                      );
                  }}
                  type="button"
                >
                  {translate(locale, "createSettingsBackup")}
                </button>
                <button
                  className="quiet-button"
                  onClick={() => {
                    void useShelfStore
                      .getState()
                      .restoreSettingsBackup()
                      .then(
                        (restored) =>
                          showToast(
                            translate(
                              locale,
                              restored
                                ? "settingsBackupRestored"
                                : "settingsBackupMissing",
                            ),
                          ),
                        (error) => setIntegrationError(String(error)),
                      );
                  }}
                  type="button"
                >
                  {translate(locale, "restoreSettingsBackup")}
                </button>
              </div>
            </section>
            <section
              aria-labelledby="update-settings-title"
              className="settings-section"
            >
              <h3 id="update-settings-title">{translate(locale, "updates")}</h3>
              <p className="settings-note">
                {updaterConfigured
                  ? translate(locale, "updatePermission")
                  : translate(locale, "updateUnavailableBuild")}
              </p>
              <div className="settings-button-row">
                <button
                  className="quiet-button"
                  disabled={
                    !updaterConfigured ||
                    updatePhase === "checking" ||
                    updatePhase === "installing"
                  }
                  onClick={() => void checkUpdates(false)}
                  type="button"
                >
                  {updatePhase === "checking"
                    ? translate(locale, "checkingUpdates")
                    : translate(locale, "checkUpdates")}
                </button>
                {availableUpdate ? (
                  <button
                    className="primary-button"
                    disabled={updatePhase === "installing"}
                    onClick={() => void installUpdate()}
                    type="button"
                  >
                    {updatePhase === "installing"
                      ? translate(locale, "installingUpdate")
                      : translate(locale, "installUpdate")}
                  </button>
                ) : null}
              </div>
              {updatePhase === "current" ? (
                <p className="settings-note" role="status">
                  {translate(locale, "upToDate")}
                </p>
              ) : null}
              {availableUpdate ? (
                <p className="settings-note" role="status">
                  {translate(locale, "updateAvailable").replace(
                    "{version}",
                    availableUpdate.version,
                  )}
                </p>
              ) : null}
            </section>
            <section
              aria-labelledby="performance-settings-title"
              className="settings-section"
            >
              <h3 id="performance-settings-title">
                {translate(locale, "diagnostics")}
              </h3>
              <dl className="performance-metrics">
                <div>
                  <dt>{translate(locale, "startupMetric")}</dt>
                  <dd>
                    {clientPerformance?.startupToReadyMs === undefined
                      ? translate(locale, "noSamples")
                      : `${clientPerformance.startupToReadyMs.toFixed(1)} ms`}
                  </dd>
                </div>
                <div>
                  <dt>{translate(locale, "searchMetric")}</dt>
                  <dd>
                    {clientPerformance?.searchP95Ms === undefined
                      ? translate(locale, "noSamples")
                      : `${clientPerformance.searchP95Ms.toFixed(1)} ms (${clientPerformance.searchSamples})`}
                  </dd>
                </div>
                <div>
                  <dt>{translate(locale, "hotkeyMetric")}</dt>
                  <dd>
                    {nativePerformance?.hotkeyShowP95Ms == null
                      ? translate(locale, "noSamples")
                      : `${nativePerformance.hotkeyShowP95Ms.toFixed(1)} ms (${nativePerformance.hotkeyShowSamples})`}
                  </dd>
                </div>
                <div>
                  <dt>{translate(locale, "memoryMetric")}</dt>
                  <dd>
                    {clientPerformance?.usedJavaScriptHeapMb === undefined
                      ? translate(locale, "noSamples")
                      : `${clientPerformance.usedJavaScriptHeapMb.toFixed(1)} MiB`}
                  </dd>
                </div>
              </dl>
              <button
                className="quiet-button settings-inline-action"
                onClick={() => void refreshPerformance()}
                type="button"
              >
                {translate(locale, "refreshDiagnostics")}
              </button>
            </section>
            <div className="settings-danger-zone">
              <button
                className="quiet-button"
                onClick={() => {
                  useShelfStore.getState().resetOnboarding();
                  setModal(null);
                }}
                type="button"
              >
                {translate(locale, "resetOnboarding")}
              </button>
              <button
                className="danger-quiet"
                onClick={() => {
                  if (window.confirm(translate(locale, "resetDataConfirm"))) {
                    useShelfStore.getState().resetAll();
                    setModal(null);
                  }
                }}
                type="button"
              >
                {translate(locale, "resetData")}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {toast ? (
        <div aria-atomic="true" className="toast" role="status">
          <span>{toast.message}</span>
          {toast.action ? (
            <button
              onClick={() => {
                toast.action?.run();
                setToast(undefined);
              }}
              type="button"
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default App;
