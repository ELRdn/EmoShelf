import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { mono, ui } from "../fonts";
import { color, shadow } from "../theme";
import { Emoji, type EmojiStyle } from "./Emoji";

// Mirrors the v1.2.0 app window (app/src/App.css dark tokens, Concept 2.5 layout).

export type Cell =
  | { kind: "emoji"; e: string; style?: EmojiStyle; flip?: number }
  | { kind: "combo"; es: string[] }
  | { kind: "stamp"; label: string }
  | { kind: "gap" };

export type CellState = {
  selected?: boolean;
  lifted?: boolean;
  dim?: boolean;
  hover?: boolean;
  dx?: number;
  dy?: number;
  scale?: number;
  opacity?: number;
};

const Kbd = ({ children }: { children: ReactNode }) => (
  <span
    style={{
      fontFamily: mono,
      fontSize: 15,
      fontWeight: 600,
      padding: "4px 9px",
      borderRadius: 7,
      border: `1px solid ${color.shelfLineStrong}`,
      color: color.shelfText,
      background: color.shelfSurface,
    }}
  >
    {children}
  </span>
);

const Tab = ({
  label,
  icon,
  active,
}: {
  label: string;
  icon?: ReactNode;
  active?: boolean;
}) => (
  <div
    style={{
      height: 50,
      padding: "0 22px",
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 21,
      fontWeight: 600,
      color: active ? color.shelfText : color.shelfTextSoft,
      background: active ? color.purpleSoft : "transparent",
      border: `1.5px solid ${active ? color.purple : color.shelfLine}`,
      boxShadow: active ? `0 3px 0 ${color.purple}` : undefined,
    }}
  >
    {icon}
    {label}
  </div>
);

export const CELL = 104;

export const ShelfCell = ({
  cell,
  state = {},
  size = CELL,
}: {
  cell: Cell;
  state?: CellState;
  size?: number;
}) => {
  if (cell.kind === "gap") {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 18,
          border: `2px dashed ${color.purple}`,
          background: "rgb(139 124 255 / 8%)",
          boxSizing: "border-box",
          opacity: state.opacity ?? 1,
        }}
      />
    );
  }
  const glyph = size * 0.58;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 18,
        background: state.selected ? "#2C2940" : state.hover ? color.cardHover : color.card,
        border: `1.5px solid ${state.selected ? color.purple : color.shelfLine}`,
        boxShadow: state.lifted
          ? "0 24px 40px rgb(0 0 0 / 55%), 0 0 0 2px rgb(139 124 255 / 70%)"
          : state.selected
            ? shadow.purpleGlow
            : "0 2px 0 rgb(0 0 0 / 35%)",
        transform: state.lifted
          ? "translateY(-14px) rotate(-4deg) scale(1.08)"
          : `translate(${state.dx ?? 0}px, ${(state.dy ?? 0) + (state.hover ? -3 : 0)}px) scale(${state.scale ?? 1})`,
        opacity: (state.dim ? 0.35 : 1) * (state.opacity ?? 1),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        position: "relative",
        perspective: 400,
      }}
    >
      {cell.kind === "emoji" && (
        <div
          style={{
            transform: cell.flip ? `rotateY(${cell.flip}deg)` : undefined,
            backfaceVisibility: "hidden",
            filter: cell.flip ? `brightness(${1 - Math.abs(Math.sin((cell.flip * Math.PI) / 180)) * 0.35})` : undefined,
          }}
        >
          <Emoji e={cell.e} size={glyph} style={cell.style} />
        </div>
      )}
      {cell.kind === "combo" && (
        <div style={{ display: "flex", gap: 2 }}>
          {cell.es.map((e) => (
            <Emoji key={e} e={e} size={glyph * 0.62} />
          ))}
        </div>
      )}
      {cell.kind === "stamp" && (
        <div
          style={{
            fontFamily: mono,
            fontWeight: 600,
            fontSize: size * 0.2,
            color: "#fff",
            padding: "8px 10px",
            borderRadius: 10,
            background: "linear-gradient(135deg, #4BD779, #1F9E8F)",
            transform: "rotate(-6deg)",
            boxShadow: "0 3px 0 rgb(0 0 0 / 30%)",
          }}
        >
          {cell.label}
        </div>
      )}
      {state.selected && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 10,
            height: 10,
            borderRadius: 5,
            background: color.yellow,
          }}
        />
      )}
    </div>
  );
};

export type ShelfTab = "all" | "my" | "reactions" | "work";

export const ShelfWindow = ({
  cells,
  states = {},
  tab = "my",
  query,
  heading,
  count,
  columns = 7,
  footer,
  width,
  lang = "ja",
  css,
  overlay,
}: {
  cells: Cell[];
  states?: Record<number, CellState>;
  tab?: ShelfTab;
  query?: string;
  heading: string;
  count?: string;
  columns?: number;
  footer?: ReactNode;
  width?: number;
  lang?: "ja" | "en";
  css?: CSSProperties;
  overlay?: ReactNode;
}) => {
  const gap = 14;
  const innerWidth = columns * CELL + (columns - 1) * gap;
  const w = width ?? innerWidth + 2 * 28 + 2 * 22;
  const ja = lang === "ja";
  return (
    <div
      style={{
        width: w,
        borderRadius: 22,
        background: color.shelf,
        border: `1px solid ${color.shelfLine}`,
        boxShadow: shadow.shelf,
        fontFamily: ui,
        color: color.shelfText,
        overflow: "hidden",
        position: "relative",
        ...css,
      }}
    >
      {/* title bar */}
      <div style={{ height: 70, display: "flex", alignItems: "center", gap: 14, padding: "0 24px" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, overflow: "hidden", position: "relative" }}>
          <Img
            src={staticFile("brand/emoshelf-icon-master.png")}
            style={{ position: "absolute", width: 48, height: 48, left: -5, top: -5 }}
          />
        </div>
        <span style={{ fontSize: 23, fontWeight: 700 }}>EmoShelf</span>
        <span
          style={{
            fontFamily: mono,
            fontSize: 15,
            padding: "3px 10px",
            borderRadius: 20,
            border: `1px solid ${color.shelfLineStrong}`,
            color: color.purple,
            background: color.purpleSoft,
          }}
        >
          v1.2
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 30, color: color.shelfTextSoft, fontSize: 20 }}>
          <span>—</span>
          <span>☐</span>
          <span>✕</span>
        </div>
      </div>
      {/* search row */}
      <div style={{ padding: "0 24px" }}>
        <div
          style={{
            height: 60,
            borderRadius: 14,
            border: `1.5px solid ${query ? color.purple : color.shelfLine}`,
            background: color.shelfSurface,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 20px",
            fontSize: 23,
            boxShadow: query ? "0 0 0 4px rgb(139 124 255 / 18%)" : undefined,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24">
            <circle cx="13" cy="10" r="7" stroke={color.shelfTextSoft} strokeWidth="2.4" fill="none" />
            <path d="M8 15 3 20" stroke={color.shelfTextSoft} strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          {query ? (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {query}
              <span style={{ width: 3, height: 28, background: color.purple, borderRadius: 2 }} />
            </span>
          ) : (
            <span style={{ color: color.shelfTextSoft }}>{ja ? "絵文字を検索…" : "Search emoji…"}</span>
          )}
          <span style={{ marginLeft: "auto" }}>
            <Kbd>Ctrl F</Kbd>
          </span>
        </div>
      </div>
      {/* tabs */}
      <div style={{ display: "flex", gap: 10, padding: "18px 24px" }}>
        <Tab label="All" active={tab === "all"} icon={<span style={{ fontSize: 18 }}>▦</span>} />
        <Tab label="My Shelf" active={tab === "my"} icon={<Emoji e="✨" size={24} />} />
        <Tab label="Reactions" active={tab === "reactions"} icon={<Emoji e="😂" size={24} />} />
        <Tab label="Work" active={tab === "work"} icon={<Emoji e="💼" size={24} />} />
        <Tab label="+" />
      </div>
      {/* grid */}
      <div style={{ padding: "0 24px" }}>
        <div
          style={{
            borderRadius: 16,
            background: color.shelfSurface,
            border: `1px solid ${color.shelfLine}`,
            padding: "0 22px 24px",
          }}
        >
          <div
            style={{
              height: 56,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 19,
              fontWeight: 700,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 5, background: color.yellow }} />
            {heading}
            {count && (
              <span style={{ marginLeft: "auto", color: color.shelfTextSoft, fontWeight: 500 }}>{count}</span>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, ${CELL}px)`,
              gap,
              justifyContent: "center",
            }}
          >
            {cells.map((c, i) => (
              <ShelfCell key={i} cell={c} state={states[i]} />
            ))}
          </div>
        </div>
      </div>
      {/* action footer */}
      <div
        style={{
          margin: "16px 24px 0",
          height: 62,
          borderRadius: 14,
          border: `1px solid ${color.shelfLine}`,
          background: color.shelfSurface,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 18px",
          fontSize: 17,
          color: color.shelfTextSoft,
        }}
      >
        {footer ?? (ja ? "絵文字を選択" : "Select an emoji")}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <Kbd>Enter</Kbd>
          {ja ? "貼り付け" : "Paste"}
          <span style={{ width: 8 }} />
          <Kbd>Ctrl Enter</Kbd>
          {ja ? "Shelfへ追加" : "Add to shelf"}
        </span>
      </div>
      {/* status bar */}
      <div
        style={{
          height: 54,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 26px",
          fontSize: 16,
          color: color.shelfTextSoft,
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: 5, background: color.green }} />
        {ja ? "貼り付け準備OK" : "Ready to paste"}
        <span style={{ marginLeft: "auto" }}>Twemoji graphics: CC-BY 4.0</span>
      </div>
      {overlay}
    </div>
  );
};
