import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { EmojiArtwork } from "./components/EmojiArtwork";
import { Onboarding } from "./components/Onboarding";
import { ShelfGrid } from "./components/ShelfGrid";
import { VirtualEmojiGrid } from "./components/VirtualEmojiGrid";
import {
  type AppLocale,
  type CatalogEntry,
  findByEmoji,
  getCatalog,
  getCategories,
  searchCatalog,
  toDisplayMetadata,
} from "./lib/emoji";
import { resolveLocale, translate } from "./lib/i18n";
import { pastePayload } from "./lib/paste";
import type { ShelfItem } from "./lib/state";
import { useShelfStore } from "./lib/store";

type CategoryId = number | "all" | "recent";
type Modal = "new-board" | "rename-board" | "delete-board" | "settings" | null;

interface Selection {
  payload: string;
  name: string;
  codepoint?: string;
  category?: string;
  keywords: string[];
  shortcode?: string;
  hexcode?: string;
  itemId?: string;
  source: "shelf" | "catalog";
}

interface ToastState {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
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
  const payload = item.type === "image" ? "🖼️" : item.payload;
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
    itemId: item.id,
    source: "shelf",
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
          v0.1
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
  return (
    <dialog
      aria-label={title}
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
      open
    >
      <section
        aria-labelledby="modal-title"
        aria-modal="true"
        className="modal-card"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <h2 id="modal-title">{title}</h2>
          <button
            aria-label="Close"
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
  const onboardingCompleted = useShelfStore(
    (state) => state.onboardingCompleted,
  );
  const loadError = useShelfStore((state) => state.loadError);
  const saveError = useShelfStore((state) => state.saveError);
  const persistenceBlocked = useShelfStore((state) => state.persistenceBlocked);
  const locale = resolveLocale(settings.locale);
  const [activeBoardId, setActiveBoardId] = useState<string>();
  const [catalogMode, setCatalogMode] = useState(false);
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
  const [toast, setToast] = useState<ToastState>();
  const toastId = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeBoard =
    boards.find((board) => board.id === activeBoardId) ?? boards[0];
  const catalog = useMemo(() => getCatalog(locale), [locale]);
  const categories = useMemo(() => getCategories(locale), [locale]);
  const catalogEntries = useMemo(() => {
    if (query.trim()) {
      return searchCatalog(query, 1949, locale);
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

  const pasteSelection = useCallback(
    async (current: Selection, forceKeepOpen = false) => {
      const keepOpen =
        forceKeepOpen ||
        settings.pinned ||
        settings.selectionBehavior === "paste-keep-open";
      const outcome = await pastePayload(
        current.payload,
        settings.selectionBehavior,
        keepOpen,
      );
      useShelfStore.getState().recordUse(current.payload);
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
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
        } else if (!settings.pinned) {
          void getCurrentWindow().hide();
        }
        return;
      }
      if (event.key === "Enter" && selection && !modal) {
        event.preventDefault();
        if (event.ctrlKey && selection.source === "catalog" && activeBoard) {
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
    locale,
    modal,
    pasteSelection,
    query,
    selection,
    settings.pinned,
    showToast,
  ]);

  if (!loaded) {
    return (
      <div className="app-shell">
        <TitleBar
          locale={locale}
          onTogglePinned={() => undefined}
          pinned={false}
        />
        <main className="loading-state">
          <span className="loading-orbit" />
          {translate(locale, "loading")}
        </main>
      </div>
    );
  }

  if (!onboardingCompleted) {
    return (
      <div className="app-shell">
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

  const selectShelfItem = (item: ShelfItem) => {
    const next = selectionFromItem(item, locale);
    setSelection(next);
    if (!editMode) {
      void pasteSelection(next);
    }
  };

  const selectCatalogEntry = (entry: CatalogEntry) =>
    setSelection(selectionFromCatalog(entry));

  const addSelectionToBoard = (boardId: string) => {
    if (!selection) {
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

  return (
    <div className="app-shell">
      <TitleBar
        locale={locale}
        onTogglePinned={() =>
          useShelfStore.getState().updateSettings({ pinned: !settings.pinned })
        }
        pinned={settings.pinned}
      />

      <main className="shelf-app">
        {(loadError || saveError) && (
          <div className="error-banner" role="alert">
            <span>!</span>
            <p>{loadError ?? saveError}</p>
            {saveError ? (
              <button
                onClick={() => useShelfStore.getState().clearSaveError()}
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
              setCatalogMode(true);
            }}
            onFocus={() => setCatalogMode(true)}
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
              className={editMode ? "is-active" : ""}
              onClick={() => setEditMode((editing) => !editing)}
              type="button"
            >
              {editMode
                ? translate(locale, "finishEditing")
                : translate(locale, "editShelf")}
            </button>
            {editMode && activeBoard ? (
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
                  {catalogMode
                    ? query
                      ? translate(locale, "searchResults")
                      : categories.find((item) => item.id === category)?.label
                    : activeBoard?.name}
                </strong>
              </div>
              <span>
                {catalogMode
                  ? catalogEntries.length
                  : (activeBoard?.items.length ?? 0)}{" "}
                {translate(locale, "items")}
              </span>
            </header>

            {catalogMode ? (
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
            ) : activeBoard?.items.length ? (
              <ShelfGrid
                editMode={editMode}
                items={activeBoard.items}
                locale={locale}
                onRemove={(itemId) =>
                  useShelfStore
                    .getState()
                    .removeItemFromBoard(activeBoard.id, itemId)
                }
                onReorder={(fromIndex, toIndex) =>
                  useShelfStore
                    .getState()
                    .moveItemWithinBoard(activeBoard.id, fromIndex, toIndex)
                }
                onSelect={selectShelfItem}
                renderer={settings.renderer}
                selectedId={selection?.itemId}
              />
            ) : (
              <div className="empty-state shelf-empty">
                <span aria-hidden="true">✨</span>
                <h2>{translate(locale, "emptyShelf")}</h2>
                <p>{translate(locale, "emptyShelfBody")}</p>
                <button
                  className="primary-button"
                  onClick={() => setCatalogMode(true)}
                  type="button"
                >
                  {translate(locale, "browseEmoji")}
                </button>
              </div>
            )}
          </div>

          <aside className="detail-panel">
            {selection ? (
              <>
                <div className="detail-artwork">
                  <EmojiArtwork
                    className="detail-emoji"
                    emoji={selection.payload}
                    hexcode={selection.hexcode}
                    locale={locale}
                    renderer={settings.renderer}
                  />
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
                    <dd>{selection.codepoint ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>{locale === "ja" ? "キーワード" : "Keywords"}</dt>
                    <dd>{selection.keywords.slice(0, 4).join(", ") || "—"}</dd>
                  </div>
                </dl>
                <div className="detail-actions">
                  {selection.source === "catalog" && activeBoard ? (
                    <button
                      className="shelf-action"
                      onClick={() => addSelectionToBoard(activeBoard.id)}
                      type="button"
                    >
                      <span aria-hidden="true">★</span>
                      {translate(locale, "addToShelf")}
                    </button>
                  ) : null}
                  {selection.source === "shelf" && editMode ? (
                    <button
                      className="danger-quiet"
                      onClick={removeSelection}
                      type="button"
                    >
                      {translate(locale, "removeFromShelf")}
                    </button>
                  ) : null}
                  {boards.length > 1 ? (
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

        <section className="context-footer" aria-label="Selection actions">
          <div className="selection-summary">
            {selection ? (
              <>
                <EmojiArtwork
                  emoji={selection.payload}
                  hexcode={selection.hexcode}
                  locale={locale}
                  renderer={settings.renderer}
                />
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
              {catalogMode
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
            : "Native emoji"}
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
              </select>
            </label>
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
        <div className="toast" role="status">
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
