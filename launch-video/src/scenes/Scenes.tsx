import type { ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { bouncy, ease, keys, out, smooth, snappy } from "../anim";
import { Backdrop } from "../components/Backdrop";
import { ChatWindow } from "../components/ChatWindow";
import { Cursor } from "../components/Cursor";
import { Emoji, type EmojiStyle } from "../components/Emoji";
import { KeyCombo } from "../components/Keycap";
import { type Cell, type CellState, ShelfWindow, type ShelfTab } from "../components/ShelfWindow";
import { Sfx } from "../components/Sfx";
import { StockPanel } from "../components/StockPanel";
import { TelopText } from "../components/TelopText";
import { attribution, badges, copy, type Lang } from "../copy";
import { catResults, myShelf, split, styleShelf } from "../data";
import { mono, rounded } from "../fonts";
import { color } from "../theme";

export type SceneProps = { lang: Lang };

export const Pos = ({ x, y, children, z }: { x: number; y: number; children: ReactNode; z?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, zIndex: z }}>{children}</div>
);

export const greeting = (lang: Lang) => (lang === "ja" ? "おつかれさま！" : "Great work today!");
export const t = (lang: Lang, ja: string, en: string) => (lang === "ja" ? ja : en);

// Scroll blur follows scroll speed, like a quick flick of the wheel.
const scrollAt = (f: number, k: [number, number][]) => keys(f, k);
const scrollBlur = (f: number, k: [number, number][]) => Math.min(3, Math.abs(scrollAt(f, k) - scrollAt(f - 1, k)) * 0.14);

// ---------------------------------------------------------------------------
// 1. Hook — hunting through the stock emoji panel, then again the next day.
export const S1_FRAMES = 300;
const DAY2 = 195;

export const S1Hook = ({ lang }: SceneProps) => {
  const f = useCurrentFrame();
  const day2 = f >= DAY2;
  const scrollKeys: [number, number][] = day2
    ? [[DAY2 + 6, 0], [DAY2 + 26, 480], [DAY2 + 40, 180], [DAY2 + 62, 620], [DAY2 + 78, 340], [DAY2 + 92, 560]]
    : [[46, 0], [90, 420], [118, 160], [158, 560], [185, 300]];
  const cursorKeys: [number, number, number][] = day2
    ? [[DAY2, 700, 560], [DAY2 + 16, 500, 330], [DAY2 + 32, 710, 380], [DAY2 + 48, 470, 470], [DAY2 + 64, 700, 560], [DAY2 + 80, 520, 420], [DAY2 + 94, 690, 520]]
    : [[30, 820, 700], [64, 520, 330], [94, 720, 380], [124, 480, 470], [154, 690, 560], [185, 560, 420]];
  const cx = keys(f, cursorKeys.map(([k, x]) => [k, x]));
  const cy = keys(f, cursorKeys.map(([k, , y]) => [k, y]));
  const popAt = day2 ? DAY2 + 2 : 38;
  const pop = snappy(f, popAt);
  const exit = ease(f, 284, 300);
  const pressWin = keys(f, day2 ? [[DAY2 - 6, 0], [DAY2 - 4, 1], [DAY2 + 4, 1], [DAY2 + 8, 0]] : [[28, 0], [30, 1], [40, 1], [44, 0]]);
  const pressDot = keys(f, day2 ? [[DAY2 - 2, 0], [DAY2, 1], [DAY2 + 6, 1], [DAY2 + 10, 0]] : [[34, 0], [36, 1], [44, 1], [48, 0]]);
  const bubble = bouncy(f, 96);
  const chip = snappy(f, DAY2);
  const jitter = day2 ? Math.sin(f * 1.3) * 2.5 : Math.sin(f / 14) * 2;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop mode="stress" />
      <Pos x={150} y={470}>
        <ChatWindow width={900} lang={lang} input={greeting(lang)} dim caret={Math.floor(f / 30) % 2 === 0 || f > 38} />
      </Pos>
      <Pos x={330} y={214} z={2}>
        <div
          style={{
            transform: `rotate(${-1.5 - exit * 20}deg) scale(${(0.6 + 0.4 * pop) * (1 - exit * 0.2)})`,
            transformOrigin: "10% 100%",
            opacity: Math.min(1, pop * 2) * (1 - exit),
          }}
        >
          <StockPanel placeholder={t(lang, "検索", "Search")} scroll={scrollAt(f, scrollKeys)} blur={scrollBlur(f, scrollKeys)} scale={1.05} />
        </div>
      </Pos>
      {f > 40 && (
        <div style={{ position: "absolute", zIndex: 4, opacity: 1 - exit }}>
          <Cursor x={cx} y={cy} scale={1.7} />
        </div>
      )}
      <Pos x={860} y={250} z={4}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "18px 28px",
            borderRadius: 28,
            background: "#FFFFFF",
            boxShadow: "0 14px 34px rgb(24 24 27 / 14%)",
            fontFamily: rounded,
            fontWeight: 800,
            fontSize: 44,
            color: color.inkSoft,
            transform: `rotate(${3 + jitter}deg) scale(${bubble})`,
            opacity: Math.min(1, bubble * 2),
          }}
        >
          <Emoji e="🙏" size={72} css={{ opacity: 0.9 }} />
          <span>{t(lang, "どこ…？", "where…?")}</span>
        </div>
      </Pos>
      <Pos x={1300} y={560} z={1}>
        <div style={{ display: "flex", alignItems: "center", gap: 23 }}>
          <KeyCombo keys={[{ label: "Win", wide: 1.3 }]} size={130} tone="grey" pressed={pressWin} />
          <span style={{ fontFamily: mono, fontSize: 44, color: "#8A8994", fontWeight: 600 }}>+</span>
          <KeyCombo keys={[{ label: "." }]} size={130} tone="grey" pressed={pressDot} />
        </div>
      </Pos>
      {day2 && (
        <Pos x={150} y={390} z={5}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 22px",
              borderRadius: 16,
              background: color.ink,
              color: "#fff",
              fontFamily: rounded,
              fontWeight: 800,
              fontSize: 34,
              transform: `translateX(${(1 - chip) * -60}px) rotate(-2deg)`,
              opacity: chip,
            }}
          >
            {t(lang, "次の日", "Next day")}
            <span style={{ fontFamily: mono, fontSize: 26, color: color.yellow }}>▶▶ ×2</span>
          </div>
        </Pos>
      )}
      <TelopText telop={copy[lang].hook} bottom={96} start={-60} />
      <Sfx at={28} name="key" volume={0.7} />
      <Sfx at={34} name="key" volume={0.7} />
      <Sfx at={38} name="popSoft" volume={0.35} />
      <Sfx at={48} name="scroll" volume={0.5} />
      <Sfx at={120} name="scroll" volume={0.45} />
      <Sfx at={96} name="popSoft" volume={0.5} />
      <Sfx at={DAY2 - 5} name="key" volume={0.7} />
      <Sfx at={DAY2 - 1} name="key" volume={0.7} />
      <Sfx at={DAY2 + 6} name="scroll" volume={0.5} />
      <Sfx at={DAY2 + 48} name="scroll" volume={0.45} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 2. Turn — Alt + E slams in, the grey world snaps to light, keys fly to scene 3.
export const S2_FRAMES = 90;

export const S2AltE = ({ lang }: SceneProps) => {
  const f = useCurrentFrame();
  const slam = snappy(f, 6);
  const pressed = keys(f, [[6, 0], [12, 1], [22, 1], [32, 0.3]]);
  const fly = ease(f, 64, 90, 0, 1, Easing.inOut(Easing.cubic));
  const crumple = ease(f, 0, 26, 0, 1, Easing.in(Easing.quad));
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop mode="shift" glow={{ x: 50, y: 50 }} />
      <AbsoluteFill style={{ opacity: 1 - ease(f, 8, 30) }}>
        <Backdrop mode="stress" />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: fly }}>
        <Backdrop mode="light" glow={{ x: 62, y: 70 }} />
      </AbsoluteFill>
      <Pos x={330} y={214}>
        <div
          style={{
            transform: `translate(${crumple * -240}px, ${crumple * 420}px) rotate(${-22 - crumple * 30}deg) scale(${0.8 - crumple * 0.62})`,
            transformOrigin: "10% 100%",
            opacity: 1 - crumple,
            filter: `grayscale(${crumple}) blur(${crumple * 3}px)`,
          }}
        >
          <StockPanel placeholder={t(lang, "検索", "Search")} scroll={560} />
        </div>
      </Pos>
      {[520, 700, 900].map((d, i) => {
        const r = out(f, 12 + i * 3, 60 + i * 6);
        return (
          <div
            key={d}
            style={{
              position: "absolute",
              left: 960 - d / 2,
              top: 520 - d / 2,
              width: d,
              height: d,
              borderRadius: "50%",
              border: `${4 - i}px solid rgb(116 103 232 / ${36 - i * 11}%)`,
              transform: `scale(${0.4 + 0.75 * r})`,
              opacity: (f >= 12 ? 1 : 0) * (1 - ease(f, 50, 80)),
            }}
          />
        );
      })}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            transform: `translate(${fly * -695}px, ${-20 + fly * 228}px) rotate(${-3 * (1 - fly)}deg) scale(${interpolate(slam, [0, 1], [2.2, 1]) * (1 - fly * 0.616)})`,
            opacity: Math.min(1, slam * 3),
          }}
        >
          <KeyCombo keys={[{ label: "Alt", wide: 1.25 }, { label: "E" }]} size={250} tone="purple" pressed={pressed} />
        </div>
      </AbsoluteFill>
      {[0, 1, 2, 3, 4].map((i) => {
        const s = out(f, 12 + i * 2, 30 + i * 2);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 1420 + i * 26 + (1 - s) * 260,
              top: 330 + i * 70,
              width: 260 - i * 30,
              height: 6,
              borderRadius: 3,
              background: "linear-gradient(90deg, rgb(116 103 232 / 50%), transparent)",
              opacity: s * (1 - ease(f, 56, 72)),
            }}
          />
        );
      })}
      <Sfx at={11} name="impact" volume={0.9} />
      <Sfx at={64} name="whoosh" volume={0.35} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 3. Core — shelf rises, one click, the emoji lands in the chat and is sent.
export const S3_FRAMES = 330;
const CLICK = 92;
const LAND = 128;
const SEND = 182;
const CLOSE = 252;

export const S3Core = ({ lang }: SceneProps) => {
  const f = useCurrentFrame();
  const from = { x: 1046, y: 690 };
  const to = { x: 372, y: 367 };
  const ctrl = { x: 760, y: 170 };
  const point = (p: number) => ({
    x: (1 - p) ** 2 * from.x + 2 * (1 - p) * p * ctrl.x + p ** 2 * to.x,
    y: (1 - p) ** 2 * from.y + 2 * (1 - p) * p * ctrl.y + p ** 2 * to.y,
  });
  const hit = point(0.93);
  const arc = `M${from.x} ${from.y} Q ${ctrl.x} ${ctrl.y} ${hit.x} ${hit.y}`;
  const flight = ease(f, CLICK + 8, LAND, 0, 1, Easing.inOut(Easing.quad));
  const flyer = point(flight * 0.93);
  const landed = f >= LAND;
  const sent = f >= SEND;
  const chatIn = out(f, 0, 26);
  const rise = snappy(f, 10);
  const close = ease(f, CLOSE, CLOSE + 34, 0, 1, Easing.in(Easing.cubic));
  const cx = keys(f, [[40, 1560], [84, 1060]]);
  const cy = keys(f, [[40, 1040], [84, 704]]);
  const press = keys(f, [[CLICK, 1], [CLICK + 4, 0.92], [CLICK + 12, 1]]);
  const clickRing = ease(f, CLICK, CLICK + 22, 0, 1, Easing.out(Easing.quad));
  const payoff = bouncy(f, LAND);
  const push = 1 + ease(f, 0, S3_FRAMES, 0, 0.03);
  const states: Record<number, CellState> = {
    0: { selected: f >= CLICK, hover: f >= 72, scale: press },
  };
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop mode="light" glow={{ x: 62, y: 70 }} />
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "30% 40%" }}>
        <Pos x={120} y={96 - (1 - chatIn) * 620}>
          <ChatWindow
            lang={lang}
            width={860}
            input={sent ? "" : greeting(lang)}
            inputEmoji={landed && !sent ? "🙏" : undefined}
            sent={
              sent
                ? { who: "Mio", hue: 280, text: <>{greeting(lang)}<Emoji e="🙏" size={30} /></> }
                : undefined
            }
            sentIn={out(f, SEND, SEND + 20)}
          />
        </Pos>
        <Pos x={930} y={330 + (1 - rise) * 760 + close * 760} z={2}>
          <div
            style={{
              transform: `perspective(1800px) rotateX(${7 + (1 - rise) * 14}deg) rotateY(-9deg) rotateZ(-1.5deg)`,
              transformOrigin: "50% 100%",
            }}
          >
            <ShelfWindow
              cells={myShelf}
              states={states}
              heading="My Shelf"
              count={t(lang, "14 件", "14 items")}
              lang={lang}
              footer={
                f >= 72 ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8, color: color.shelfText }}>
                    <Emoji e="🙏" size={26} />
                    {t(lang, "folded hands · 貼り付け", "folded hands · Paste")}
                  </span>
                ) : undefined
              }
            />
          </div>
        </Pos>
        {f >= 40 && f < CLOSE + 10 && (
          <div style={{ position: "absolute", zIndex: 5, opacity: 1 - ease(f, CLOSE - 10, CLOSE + 6) }}>
            <Cursor x={cx} y={cy + close * 400} scale={1.7} click={f >= CLICK && f < CLICK + 22 ? clickRing : 0} />
          </div>
        )}
        {f >= CLICK + 8 && (
          <svg width={1920} height={1080} style={{ position: "absolute", zIndex: 4, opacity: 1 - ease(f, LAND, LAND + 30) }}>
            <defs>
              <linearGradient id="streak" gradientUnits="userSpaceOnUse" x1={from.x} y1={from.y} x2={hit.x} y2={hit.y}>
                <stop offset="0" stopColor="#8B7CFF" stopOpacity="0" />
                <stop offset="1" stopColor="#8B7CFF" stopOpacity="0.75" />
              </linearGradient>
            </defs>
            <path
              d={arc}
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - flight}
              stroke="url(#streak)"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        )}
        {f >= CLICK + 8 && !landed && (
          <div
            style={{
              position: "absolute",
              left: flyer.x - 44,
              top: flyer.y - 44,
              zIndex: 6,
              transform: `rotate(${-10 * flight}deg) scale(${0.7 + 0.5 * Math.sin(flight * Math.PI) + 0.3 * flight})`,
            }}
          >
            <Emoji e="🙏" size={88} css={{ filter: "drop-shadow(0 10px 16px rgb(116 103 232 / 40%))" }} />
          </div>
        )}
        {landed &&
          [
            [-96, -58, "✨", 38, -12],
            [70, -84, "🙏", 30, 14],
            [104, 6, "✨", 28, 8],
            [-70, 58, "🙏", 26, -18],
            [30, 70, "✨", 22, 0],
          ].map(([dx, dy, e, sz, r], i) => {
            const p = out(f, LAND, LAND + 32);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: hit.x + (dx as number) * (0.4 + p) - (sz as number) / 2,
                  top: hit.y + (dy as number) * (0.4 + p) - (sz as number) / 2,
                  zIndex: 5,
                  transform: `rotate(${(r as number) * p}deg) scale(${0.5 + 0.5 * p})`,
                  opacity: 1 - ease(f, LAND + 20, LAND + 48),
                }}
              >
                <Emoji e={e as string} size={sz as number} />
              </div>
            );
          })}
        <Pos x={130} y={660}>
          <div style={{ fontFamily: rounded, fontWeight: 800, color: color.ink }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 76 }}>
              <KeyCombo keys={[{ label: "Alt", wide: 1.25 }, { label: "E" }]} size={96} tone="purple" pressed={0.3} />
              {lang === "ja" && <span style={{ opacity: out(f, 6, 22) }}>なら</span>}
            </div>
            <div
              style={{
                fontSize: lang === "ja" ? 112 : 92,
                color: color.purpleLight,
                marginTop: 18,
                letterSpacing: "0.01em",
                transformOrigin: "0% 60%",
                transform: `scale(${0.6 + 0.4 * payoff})`,
                opacity: Math.min(1, payoff * 2),
              }}
            >
              {copy[lang].core.at(-1)!.t}
            </div>
          </div>
        </Pos>
      </AbsoluteFill>
      <Sfx at={10} name="whoosh" volume={0.55} />
      <Sfx at={CLICK} name="key" volume={0.8} />
      <Sfx at={CLICK + 8} name="whoosh" volume={0.3} />
      <Sfx at={LAND} name="land" volume={0.9} />
      <Sfx at={SEND} name="send" volume={0.6} />
      <Sfx at={CLOSE} name="whooshDown" volume={0.4} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 4. Arrange — shelves, drag to reorder, saved combos and custom images.
export const S4_FRAMES = 240;
const CELL_X = (i: number) => 554 + (i % 7) * 118;
const CELL_Y = (i: number) => 343 + Math.floor(i / 7) * 118;

const GhostShelf = ({ x, y, label, rotate, emoji }: { x: number; y: number; label: string; rotate: number; emoji: string }) => (
  <Pos x={x} y={y}>
    <div
      style={{
        width: 720,
        height: 520,
        borderRadius: 22,
        background: "#1B1B1F",
        border: `1px solid ${color.shelfLine}`,
        boxShadow: "0 30px 60px rgb(40 30 90 / 20%)",
        transform: `rotate(${rotate}deg)`,
        padding: 26,
        boxSizing: "border-box",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        fontFamily: rounded,
        fontWeight: 700,
        fontSize: 24,
        color: color.shelfTextSoft,
      }}
    >
      <Emoji e={emoji} size={30} />
      {label}
    </div>
  </Pos>
);

const arrangedShelf: Cell[] = (() => {
  const cells: Cell[] = [...myShelf];
  cells.splice(5, 1, { kind: "combo", es: ["👍", "✨"] });
  cells.splice(12, 1, { kind: "stamp", label: "LGTM" });
  return cells;
})();
const reactions: Cell[] = styleShelf.map((e) => ({ kind: "emoji", e }));
const work: Cell[] = split("✅📌📝📅🚀☕💡⚠️📎🔗💬📣👀🙇").map((e) => ({ kind: "emoji", e }));

const GRAB = 100;
const SWAP = 118;
const DROP = 150;

export const S4Arrange = ({ lang }: SceneProps) => {
  const f = useCurrentFrame();
  const enter = out(f, 0, 16);
  const fan = bouncy(f, 6);
  const tab: ShelfTab = f < 24 ? "my" : f < 44 ? "reactions" : f < 64 ? "work" : "my";
  const switchedAt = f < 24 ? -99 : f < 44 ? 24 : f < 64 ? 44 : 64;
  const pulse = out(f, switchedAt, switchedAt + 10);
  const base = tab === "reactions" ? reactions : tab === "work" ? work : arrangedShelf;
  const dragging = tab === "my" && f >= GRAB && f < DROP + 10;
  const done = f >= DROP + 10;
  const swap = ease(f, SWAP, SWAP + 20);

  const cells: Cell[] = [...base];
  const states: Record<number, CellState> = {};
  base.forEach((_, i) => (states[i] = { scale: 0.9 + 0.1 * pulse, opacity: 0.5 + 0.5 * pulse }));
  if (tab === "my") {
    if (dragging) {
      cells[2] = { kind: "gap" };
      states[1] = { dx: 118 * swap };
      states[2] = { dx: -118 * swap };
    }
    if (done) {
      cells[1] = arrangedShelf[2];
      cells[2] = arrangedShelf[1];
    }
    if (f >= 176) states[5] = { selected: true, hover: true, scale: keys(f, [[176, 1], [182, 0.94], [192, 1]]) };
  }

  const cx = keys(f, [[70, 1150], [95, CELL_X(2) + 40], [SWAP, CELL_X(2) + 30], [DROP, CELL_X(1) + 40], [DROP + 16, CELL_X(1) + 44], [176, CELL_X(5) + 50]]);
  const cy = keys(f, [[70, 700], [95, CELL_Y(2) + 44], [SWAP, CELL_Y(2) + 34], [DROP, CELL_Y(1) + 44], [DROP + 16, CELL_Y(1) + 50], [176, CELL_Y(5) + 54]]);
  const settle = out(f, DROP, DROP + 10);
  const tileX = interpolate(settle, [0, 1], [cx - 70, CELL_X(1) - 4]);
  const tileY = interpolate(settle, [0, 1], [cy - 70, CELL_Y(1) - 4]);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop mode="light" glow={{ x: 50, y: 40 }} />
      <div style={{ opacity: enter }}>
        <GhostShelf x={380 + (1 - fan) * 124} y={40 + (1 - fan) * 30} label="Work" rotate={-5 * fan} emoji="💼" />
        <GhostShelf x={820 - (1 - fan) * 316} y={30 + (1 - fan) * 40} label="Reactions" rotate={4 * fan} emoji="😂" />
      </div>
      <Pos x={504} y={70} z={2}>
        <div style={{ transform: `scale(${0.94 + 0.06 * enter})`, opacity: enter }}>
          <ShelfWindow
            cells={cells}
            states={states}
            tab={tab}
            heading={tab === "my" ? "My Shelf" : tab === "reactions" ? "Reactions" : "Work"}
            count={t(lang, "14 件", "14 items")}
            lang={lang}
          />
        </div>
      </Pos>
      {dragging && (
        <Pos x={tileX} y={tileY} z={3}>
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: 18,
              background: color.cardHover,
              border: `1.5px solid ${color.purple}`,
              boxShadow: `0 ${30 - settle * 24}px ${50 - settle * 40}px rgb(0 0 0 / 45%), 0 0 0 3px rgb(139 124 255 / ${45 - settle * 45}%)`,
              transform: `rotate(${-7 * (1 - settle)}deg) scale(${1.08 - settle * 0.15})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Emoji e="😂" size={66} />
          </div>
        </Pos>
      )}
      {f >= 70 && (
        <div style={{ position: "absolute", zIndex: 4 }}>
          <Cursor x={cx} y={cy} scale={1.7} />
        </div>
      )}
      <TelopText telop={copy[lang].arrange} bottom={96} start={16} />
      <Sfx at={0} name="whoosh" volume={0.35} />
      <Sfx at={24} name="tick" volume={0.6} />
      <Sfx at={44} name="tick" volume={0.6} />
      <Sfx at={64} name="tick" volume={0.6} />
      <Sfx at={GRAB} name="popSoft" volume={0.5} />
      <Sfx at={SWAP} name="tick" volume={0.35} />
      <Sfx at={DROP} name="pop" volume={0.6} />
      <Sfx at={176} name="popSoft" volume={0.5} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 5. Search — the same results for ねこ and cat.
export const S5_FRAMES = 210;
const RETYPE = 108;

export const S5Search = ({ lang }: SceneProps) => {
  const f = useCurrentFrame();
  const order = lang === "ja" ? ["ねこ", "cat"] : ["cat", "ねこ"];
  const typed = (word: string, at: number) => {
    const g = split(word);
    const n = Math.max(0, Math.min(g.length, Math.floor((f - at) / 7) + 1));
    return g.slice(0, n).join("");
  };
  const second = f >= RETYPE;
  const query = second ? typed(order[1], RETYPE + 6) : typed(order[0], 14);
  const firstDone = 14 + 7 * (split(order[0]).length - 1);
  const secondDone = RETYPE + 6 + 7 * (split(order[1]).length - 1);
  const showAt = second ? secondDone + 4 : firstDone + 4;
  const clearing = ease(f, RETYPE - 4, RETYPE + 2);
  const slide = out(f, 0, 22);
  const card = bouncy(f, 34);
  const states: Record<number, CellState> = {};
  catResults.forEach((_, i) => {
    const p = bouncy(f, showAt + i * 2);
    const gone = second || f < RETYPE - 4 ? 1 : 1 - clearing;
    states[i] = { scale: p * gone, opacity: Math.min(1, p * 2) * gone, selected: i === 0 && f >= showAt + 30 };
  });
  const active = query.length > 0 && f >= showAt ? query : second ? order[1] : order[0];
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop mode="light" glow={{ x: 45, y: 40 }} />
      <Pos x={504 - 174 * slide} y={70} z={2}>
        <ShelfWindow
          cells={catResults}
          states={states}
          tab="all"
          query={query || " "}
          heading={t(lang, "検索結果", "Results")}
          lang={lang}
        />
      </Pos>
      <Pos x={1300 + (1 - card) * 120} y={150} z={3}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            padding: 22,
            borderRadius: 26,
            background: "#FFFFFF",
            boxShadow: "0 20px 50px rgb(24 24 27 / 14%)",
            transform: `rotate(${3 * card}deg)`,
            opacity: Math.min(1, card * 2),
            fontFamily: rounded,
          }}
        >
          {["ねこ", "cat"].map((q) => {
            const on = active === q;
            return (
              <div
                key={q}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "12px 22px",
                  borderRadius: 18,
                  background: on ? color.purpleLight : "#F1F0F6",
                  color: on ? "#fff" : color.ink,
                  fontWeight: 800,
                  fontSize: 40,
                  transform: `scale(${on ? 1.04 : 1})`,
                }}
              >
                <span style={{ minWidth: 100 }}>{q}</span>
                <span style={{ fontSize: 30, opacity: 0.7 }}>→</span>
                <Emoji e="🐱" size={52} />
              </div>
            );
          })}
        </div>
      </Pos>
      <TelopText telop={copy[lang].search} bottom={96} start={18} />
      <Sfx at={0} name="tick" volume={0.5} />
      {split(order[0]).map((_, i) => (
        <Sfx key={`a${i}`} at={14 + i * 7} name="tick" volume={0.45} />
      ))}
      <Sfx at={firstDone + 4} name="popSoft" volume={0.45} />
      {split(order[1]).map((_, i) => (
        <Sfx key={`b${i}`} at={RETYPE + 6 + i * 7} name="tick" volume={0.45} />
      ))}
      <Sfx at={secondDone + 4} name="popSoft" volume={0.45} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 6. Emoji styles — flip waves sweep the shelf through each style.
export const S6_FRAMES = 180;
const styleNames: { id: EmojiStyle; label: string }[] = [
  { id: "twemoji", label: "Twemoji" },
  { id: "fluent", label: "Fluent" },
  { id: "noto", label: "Noto" },
  { id: "openmoji", label: "OpenMoji" },
];
const WAVES = [30, 78, 126];
const WAVE_STEP = 4;
const FLIP = 14;

export const S6Style = ({ lang }: SceneProps) => {
  const f = useCurrentFrame();
  const enter = out(f, 0, 14);
  const cells: Cell[] = styleShelf.map((e, i) => {
    const col = i % 7;
    let styleIndex = 0;
    let flip = 0;
    WAVES.forEach((w, wi) => {
      const p = ease(f, w + col * WAVE_STEP, w + col * WAVE_STEP + FLIP);
      if (p >= 0.5) styleIndex = wi + 1;
      if (p > 0 && p < 1) flip = p < 0.5 ? p * 180 : (p - 1) * 180;
    });
    return { kind: "emoji", e, style: styleNames[styleIndex].id, flip };
  });
  const activeWave = WAVES.findLastIndex((w) => f >= w);
  const activeStyle = activeWave + 1;
  const waveF = activeWave >= 0 ? f - WAVES[activeWave] : -1;
  const sweepVisible = waveF >= 0 && waveF <= 7 * WAVE_STEP + FLIP;
  const badge = bouncy(f, 8);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop mode="light" glow={{ x: 50, y: 50 }} />
      <Pos x={504} y={150} z={2}>
        <div style={{ transform: `scale(${0.96 + 0.04 * enter})`, opacity: enter }}>
          <ShelfWindow
            cells={cells}
            tab="reactions"
            heading="Reactions"
            lang={lang}
            overlay={
              sweepVisible && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 40 + (waveF / WAVE_STEP) * 118 - 60,
                    width: 260,
                    background:
                      "linear-gradient(90deg, transparent, rgb(139 124 255 / 20%) 45%, rgb(255 255 255 / 16%) 50%, rgb(139 124 255 / 20%) 55%, transparent)",
                    transform: "skewX(-12deg)",
                    pointerEvents: "none",
                  }}
                />
              )
            }
          />
        </div>
      </Pos>
      <Pos x={0} y={44} z={3}>
        <div style={{ width: 1920, display: "flex", justifyContent: "center", opacity: enter }}>
          <div
            style={{
              display: "flex",
              gap: 6,
              padding: 8,
              borderRadius: 22,
              background: "#FFFFFF",
              boxShadow: "0 14px 34px rgb(24 24 27 / 12%)",
              fontFamily: rounded,
              fontWeight: 800,
              fontSize: 30,
            }}
          >
            {styleNames.map((s, i) => {
              const on = i === activeStyle;
              const lit = on ? out(f, activeWave >= 0 ? WAVES[activeWave] - 4 : 0, (activeWave >= 0 ? WAVES[activeWave] : 0) + 6) : 0;
              return (
                <div
                  key={s.id}
                  style={{
                    padding: "12px 28px",
                    borderRadius: 16,
                    background: on ? `rgb(116 103 232 / ${lit * 100}%)` : "transparent",
                    color: on && lit > 0.5 ? "#fff" : i < activeStyle ? color.inkSoft : color.ink,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    transform: `scale(${1 + 0.05 * lit * (1 - out(f, (WAVES[activeWave] ?? 0) + 6, (WAVES[activeWave] ?? 0) + 20))})`,
                  }}
                >
                  <Emoji e="😂" size={36} style={s.id} />
                  {s.label}
                </div>
              );
            })}
          </div>
        </div>
      </Pos>
      <Pos x={1470} y={170} z={3}>
        <div
          style={{
            fontFamily: mono,
            fontSize: 22,
            fontWeight: 600,
            padding: "8px 16px",
            borderRadius: 12,
            background: color.yellow,
            color: color.ink,
            transform: `rotate(${6 * badge}deg) scale(${badge})`,
          }}
        >
          4 STYLES
        </div>
      </Pos>
      <TelopText telop={copy[lang].style} bottom={96} start={14} />
      <Sfx at={8} name="popSoft" volume={0.4} />
      {WAVES.map((w) => (
        <Sfx key={w} at={w} name="flip" volume={0.6} />
      ))}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 7. The real thing — a real screenshot plus the promises.
export const S7_FRAMES = 195;
const badgeEmoji = ["🎁", "🙌", "💻", "🪟"];
const BADGE_AT = [44, 62, 80, 98];

export const S7Real = ({ lang }: SceneProps) => {
  const f = useCurrentFrame();
  const b = badges[lang];
  const settle = smooth(f, 0, 50);
  const label = bouncy(f, 26);
  const push = 1 + ease(f, 0, S7_FRAMES, 0, 0.035);
  const spots = [
    { x: 70, y: 200, r: -4 },
    { x: 110, y: 700, r: 3 },
    { x: 1450, y: 250, r: 4 },
    { x: 1480, y: 740, r: -3 },
  ];
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop mode="light" glow={{ x: 50, y: 50 }} />
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <Pos x={480} y={110} z={2}>
          <div
            style={{
              transform: `perspective(2200px) rotateY(${-7 - 10 * (1 - settle)}deg) rotateX(${3 + 4 * (1 - settle)}deg) scale(${1.06 - 0.06 * settle})`,
            }}
          >
            <Img
              src={staticFile(`screens/emoshelf-${lang}.png`)}
              style={{
                width: 960,
                borderRadius: 20,
                boxShadow:
                  "0 2px 4px rgb(17 17 19 / 10%), 0 18px 40px rgb(17 17 19 / 18%), 0 60px 120px rgb(40 30 90 / 30%)",
                display: "block",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 26,
                top: -30,
                fontFamily: mono,
                fontSize: 22,
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: 12,
                background: color.ink,
                color: "#fff",
                transform: `scale(${label})`,
              }}
            >
              {t(lang, "実際の画面", "Actual app")}
            </div>
          </div>
        </Pos>
        {b.map((text, i) => {
          const p = bouncy(f, BADGE_AT[i]);
          return (
            <Pos key={text} x={spots[i].x} y={spots[i].y + (1 - p) * 40} z={3}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "18px 28px",
                  borderRadius: 24,
                  background: "#FFFFFF",
                  border: `1px solid ${color.lineLight}`,
                  boxShadow: "0 16px 36px rgb(24 24 27 / 14%)",
                  transform: `rotate(${spots[i].r * p}deg) scale(${p})`,
                  opacity: Math.min(1, p * 2),
                  fontFamily: rounded,
                  fontWeight: 800,
                  fontSize: 34,
                  whiteSpace: "nowrap",
                  color: color.ink,
                }}
              >
                <Emoji e={badgeEmoji[i]} size={44} />
                {text}
              </div>
            </Pos>
          );
        })}
      </AbsoluteFill>
      <Sfx at={26} name="tick" volume={0.4} />
      {BADGE_AT.map((a, i) => (
        <Sfx key={a} at={a} name="popSoft" volume={0.4 + i * 0.05} />
      ))}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 8. End card — the icon drops onto the stage and the call to action builds up.
export const S8_FRAMES = 270;
const LANDING = 24;

export const S8End = ({ lang }: SceneProps) => {
  const f = useCurrentFrame();
  const drop = keys(f, [[4, -760], [LANDING, 0], [LANDING + 11, -64], [LANDING + 22, 0]], Easing.inOut(Easing.quad));
  const fall = ease(f, 4, LANDING, 0, 1, Easing.in(Easing.quad));
  const y = f <= LANDING ? interpolate(fall, [0, 1], [-760, 0]) : drop;
  const squash = keys(f, [[LANDING - 1, 1], [LANDING + 2, 0.86], [LANDING + 7, 1.04], [LANDING + 12, 1], [LANDING + 21, 1], [LANDING + 23, 0.95], [LANDING + 28, 1]]);
  const height = Math.min(1, Math.abs(y) / 500);
  const word = out(f, 34, 54);
  const cta = bouncy(f, 72);
  const meta = out(f, 88, 108);
  const credit = out(f, 100, 124);
  const press = keys(f, [[128, 0], [133, 1], [142, 1], [150, 0]]);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop mode="light" glow={{ x: 30, y: 50 }} />
      <Pos x={230} y={250}>
        <div style={{ position: "relative", width: 440, height: 480 }}>
          <div
            style={{
              position: "absolute",
              left: 60 + height * 60,
              top: 440,
              width: 320 - height * 120,
              height: 34,
              borderRadius: "50%",
              background: `rgb(40 30 90 / ${22 - height * 14}%)`,
              filter: "blur(10px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 10,
              top: 0,
              width: 420,
              height: 420,
              borderRadius: 88,
              overflow: "hidden",
              transform: `translateY(${y}px) rotate(${-4 + height * 10}deg) scale(${2 - squash}, ${squash})`,
              transformOrigin: "50% 100%",
              boxShadow: "0 30px 70px rgb(40 30 90 / 35%)",
            }}
          >
            <Img
              src={staticFile("brand/emoshelf-icon-master.png")}
              style={{ position: "absolute", width: 529, height: 529, left: -55, top: -55 }}
            />
          </div>
        </div>
      </Pos>
      <Pos x={800} y={250}>
        <div style={{ fontFamily: rounded, color: color.ink }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 150,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              opacity: word,
              transform: `translateX(${(1 - word) * 60}px)`,
            }}
          >
            EmoShelf
          </div>
          <div style={{ position: "relative", height: 100, marginTop: 30 }}>
            <TelopText telop={copy[lang].catch} bottom={0} left={0} size={lang === "ja" ? 60 : 64} start={50} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              marginTop: 46,
              transform: `scale(${cta})`,
              transformOrigin: "0% 50%",
              opacity: Math.min(1, cta * 2),
            }}
          >
            <KeyCombo keys={[{ label: "Alt", wide: 1.25 }, { label: "E" }]} size={84} tone="purple" pressed={press} />
            <div
              style={{
                fontFamily: mono,
                fontWeight: 600,
                fontSize: 32,
                padding: "18px 26px",
                borderRadius: 20,
                background: color.ink,
                color: "#fff",
              }}
            >
              github.com/ELRdn/EmoShelf
            </div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 24, color: color.inkSoft, marginTop: 28, opacity: meta }}>
            v1.2.0 · Windows 11 (x64 / ARM64) · {t(lang, "無料・オープンソース", "Free & open source")}
          </div>
        </div>
      </Pos>
      <div
        style={{
          position: "absolute",
          bottom: 34,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: mono,
          fontSize: 17,
          color: color.inkSoft,
          opacity: credit,
        }}
      >
        {attribution}
      </div>
      <Sfx at={4} name="whooshDown" volume={0.3} />
      <Sfx at={LANDING} name="thud" volume={0.8} />
      <Sfx at={LANDING + 22} name="popSoft" volume={0.35} />
      <Sfx at={72} name="pop" volume={0.45} />
      <Sfx at={131} name="key" volume={0.7} />
    </AbsoluteFill>
  );
};

export const scenes = [
  { id: "S1-Hook", C: S1Hook, frames: S1_FRAMES, time: "0:00–0:05", still: 110 },
  { id: "S2-AltE", C: S2AltE, frames: S2_FRAMES, time: "0:05–0:06.5", still: 40 },
  { id: "S3-Core", C: S3Core, frames: S3_FRAMES, time: "0:06.5–0:12", still: 146 },
  { id: "S4-Arrange", C: S4Arrange, frames: S4_FRAMES, time: "0:12–0:16", still: 132 },
  { id: "S5-Search", C: S5Search, frames: S5_FRAMES, time: "0:16–0:19.5", still: 90 },
  { id: "S6-Style", C: S6Style, frames: S6_FRAMES, time: "0:19.5–0:22.5", still: 44 },
  { id: "S7-Real", C: S7Real, frames: S7_FRAMES, time: "0:22.5–0:25.5", still: 150 },
  { id: "S8-End", C: S8End, frames: S8_FRAMES, time: "0:25.5–0:30", still: 200 },
];

export const TRANSITION_S6_S7 = 15;
