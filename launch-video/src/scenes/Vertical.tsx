import { AbsoluteFill, Easing, Img, interpolate, Series, staticFile, useCurrentFrame } from "remotion";
import { bouncy, ease, keys, out, snappy } from "../anim";
import { Backdrop } from "../components/Backdrop";
import { ChatWindow } from "../components/ChatWindow";
import { Cursor } from "../components/Cursor";
import { Emoji } from "../components/Emoji";
import { KeyCombo } from "../components/Keycap";
import { type CellState, ShelfWindow } from "../components/ShelfWindow";
import { Sfx } from "../components/Sfx";
import { StockPanel } from "../components/StockPanel";
import { attribution, copy, type Lang, type Telop } from "../copy";
import { myShelf } from "../data";
import { mono, rounded } from "../fonts";
import { color } from "../theme";
import { greeting, Pos, type SceneProps, t } from "./Scenes";

// 9:16 short (1080×1920, 15 s). Key content stays between y≈120 and y≈1500 so the
// platform overlays (captions, buttons) at the bottom and right do not cover it.
export const W = 1080;
export const H = 1920;

// Each telop segment becomes its own centered line.
const StackTelop = ({ telop, top, size, start = 0 }: { telop: Telop; top: number; size: number; start?: number }) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: rounded,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.25,
        color: color.ink,
        textShadow: "0 2px 0 rgb(255 255 255 / 80%)",
      }}
    >
      {telop.map((s, i) => {
        const p = bouncy(f, start + i * 7);
        return (
          <div
            key={s.t}
            style={{
              color: s.hl ? color.purpleLight : undefined,
              whiteSpace: "nowrap",
              opacity: Math.min(1, p * 1.6),
              transform: `translateY(${(1 - p) * 40}px) scale(${0.92 + 0.08 * p})`,
            }}
          >
            {s.t.trim()}
          </div>
        );
      })}
    </div>
  );
};

const telopSize = (lang: Lang) => (lang === "ja" ? 96 : 68);

// ---------------------------------------------------------------------------
// V1. Hook — the stock panel hunt, then the same again the next day.
export const V1_FRAMES = 240;
const V_DAY2 = 128;
// Shift the whole hook down toward the vertical center (bottom stays above y≈1500).
const V1_DY = 140;

export const V1Hook = ({ lang }: SceneProps) => {
  const f = useCurrentFrame();
  const day2 = f >= V_DAY2;
  const scrollKeys: [number, number][] = day2
    ? [[V_DAY2 + 4, 0], [V_DAY2 + 20, 480], [V_DAY2 + 32, 180], [V_DAY2 + 50, 620], [V_DAY2 + 64, 340], [V_DAY2 + 80, 560]]
    : [[34, 0], [64, 420], [84, 160], [110, 560]];
  const scroll = keys(f, scrollKeys);
  const blur = Math.min(3, Math.abs(scroll - keys(f - 1, scrollKeys)) * 0.14);
  const cursorKeys: [number, number, number][] = day2
    ? [[V_DAY2, 860, 1000], [V_DAY2 + 14, 560, 760], [V_DAY2 + 28, 820, 820], [V_DAY2 + 44, 540, 900], [V_DAY2 + 60, 800, 980], [V_DAY2 + 80, 600, 860]]
    : [[24, 900, 1100], [50, 580, 760], [74, 800, 820], [96, 540, 900], [118, 780, 980]];
  const cx = keys(f, cursorKeys.map(([k, x]) => [k, x]));
  const cy = keys(f, cursorKeys.map(([k, , y]) => [k, y]));
  const pop = snappy(f, day2 ? V_DAY2 + 2 : 28);
  const exit = ease(f, 226, 240);
  const pressWin = keys(f, day2 ? [[V_DAY2 - 6, 0], [V_DAY2 - 4, 1], [V_DAY2 + 4, 1], [V_DAY2 + 8, 0]] : [[18, 0], [20, 1], [30, 1], [34, 0]]);
  const pressDot = keys(f, day2 ? [[V_DAY2 - 2, 0], [V_DAY2, 1], [V_DAY2 + 6, 1], [V_DAY2 + 10, 0]] : [[24, 0], [26, 1], [34, 1], [38, 0]]);
  const bubble = bouncy(f, 72);
  const chip = snappy(f, V_DAY2);
  const jitter = day2 ? Math.sin(f * 1.3) * 2.5 : Math.sin(f / 14) * 2;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop mode="stress" />
      <AbsoluteFill style={{ transform: `translateY(${V1_DY}px)` }}>
      <StackTelop telop={copy[lang].hook} top={170} size={telopSize(lang)} start={-60} />
      <Pos x={70} y={480}>
        <ChatWindow width={940} lang={lang} input={greeting(lang)} dim caret={Math.floor(f / 30) % 2 === 0 || f > 28} />
      </Pos>
      <Pos x={400} y={560} z={2}>
        <div
          style={{
            transform: `rotate(${-1.5 - exit * 20}deg) scale(${(0.6 + 0.4 * pop) * (1 - exit * 0.2)})`,
            transformOrigin: "10% 100%",
            opacity: Math.min(1, pop * 2) * (1 - exit),
          }}
        >
          <StockPanel placeholder={t(lang, "検索", "Search")} scroll={scroll} blur={blur} scale={1.25} />
        </div>
      </Pos>
      {f > 30 && (
        <div style={{ position: "absolute", zIndex: 4, opacity: 1 - exit }}>
          <Cursor x={cx} y={cy} scale={1.9} />
        </div>
      )}
      <Pos x={80} y={930} z={4}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "16px 26px",
            borderRadius: 28,
            background: "#FFFFFF",
            boxShadow: "0 14px 34px rgb(24 24 27 / 14%)",
            fontFamily: rounded,
            fontWeight: 800,
            fontSize: 44,
            color: color.inkSoft,
            transform: `rotate(${-3 + jitter}deg) scale(${bubble})`,
            opacity: Math.min(1, bubble * 2),
          }}
        >
          <Emoji e="🙏" size={68} css={{ opacity: 0.9 }} />
          <span>{t(lang, "どこ…？", "where…?")}</span>
        </div>
      </Pos>
      <div style={{ position: "absolute", top: 1220, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <KeyCombo keys={[{ label: "Win", wide: 1.3 }]} size={130} tone="grey" pressed={pressWin} />
          <span style={{ fontFamily: mono, fontSize: 44, color: "#8A8994", fontWeight: 600 }}>+</span>
          <KeyCombo keys={[{ label: "." }]} size={130} tone="grey" pressed={pressDot} />
        </div>
      </div>
      {day2 && (
        <Pos x={70} y={410} z={5}>
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
              fontSize: 36,
              transform: `translateX(${(1 - chip) * -60}px) rotate(-2deg)`,
              opacity: chip,
            }}
          >
            {t(lang, "次の日", "Next day")}
            <span style={{ fontFamily: mono, fontSize: 28, color: color.yellow }}>▶▶ ×2</span>
          </div>
        </Pos>
      )}
      <Sfx at={18} name="key" volume={0.7} />
      <Sfx at={24} name="key" volume={0.7} />
      <Sfx at={28} name="popSoft" volume={0.35} />
      <Sfx at={36} name="scroll" volume={0.5} />
      <Sfx at={72} name="popSoft" volume={0.5} />
      <Sfx at={V_DAY2 - 5} name="key" volume={0.7} />
      <Sfx at={V_DAY2 - 1} name="key" volume={0.7} />
      <Sfx at={V_DAY2 + 4} name="scroll" volume={0.5} />
      <Sfx at={V_DAY2 + 44} name="scroll" volume={0.45} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// V2. Turn — Alt + E slams in the middle, then flies to the top-left headline spot.
export const V2_FRAMES = 90;

export const V2AltE = ({ lang }: SceneProps) => {
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
        <Backdrop mode="light" glow={{ x: 50, y: 70 }} />
      </AbsoluteFill>
      <Pos x={400} y={560}>
        <div
          style={{
            transform: `translate(${crumple * -200}px, ${crumple * 520}px) rotate(${-22 - crumple * 30}deg) scale(${0.8 - crumple * 0.62})`,
            transformOrigin: "10% 100%",
            opacity: 1 - crumple,
            filter: `grayscale(${crumple}) blur(${crumple * 3}px)`,
          }}
        >
          <StockPanel placeholder={t(lang, "検索", "Search")} scroll={560} scale={1.25} />
        </div>
      </Pos>
      {[560, 760, 980].map((d, i) => {
        const r = out(f, 12 + i * 3, 60 + i * 6);
        return (
          <div
            key={d}
            style={{
              position: "absolute",
              left: W / 2 - d / 2,
              top: 900 - d / 2,
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
            transform: `translate(${fly * -301}px, ${-60 - fly * 707}px) rotate(${-3 * (1 - fly)}deg) scale(${interpolate(slam, [0, 1], [2.2, 1]) * (1 - fly * 0.52)})`,
            opacity: Math.min(1, slam * 3),
          }}
        >
          <KeyCombo keys={[{ label: "Alt", wide: 1.25 }, { label: "E" }]} size={220} tone="purple" pressed={pressed} />
        </div>
      </AbsoluteFill>
      <Sfx at={11} name="impact" volume={0.9} />
      <Sfx at={64} name="whoosh" volume={0.35} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// V3. Core — the shelf rises under the chat; 🙏 then 👍 fly in, and the message is sent.
export const V3_FRAMES = 330;
const SHELF = { x: 84, y: 860 };
// Cell centers inside ShelfWindow (7 columns, 104 px cells, 14 px gap).
const cell = (i: number) => ({ x: SHELF.x + 102 + (i % 7) * 118, y: SHELF.y + 324 + Math.floor(i / 7) * 118 });
const PICKS = [
  { index: 0, e: "🙏", click: 70, land: 100, to: { x: 312, y: 696 } },
  { index: 1, e: "👍", click: 132, land: 158, to: { x: 350, y: 696 } },
];
const V_SEND = 196;
const V_CLOSE = 262;

export const V3Core = ({ lang }: SceneProps) => {
  const f = useCurrentFrame();
  const chatIn = out(f, 0, 24);
  const rise = snappy(f, 6);
  const close = ease(f, V_CLOSE, V_CLOSE + 34, 0, 1, Easing.in(Easing.cubic));
  const sent = f >= V_SEND;
  const landed = PICKS.filter((p) => f >= p.land).map((p) => p.e);
  const [a, b] = PICKS.map((p) => cell(p.index));
  const cx = keys(f, [[30, 900], [62, a.x + 20], [116, a.x + 20], [128, b.x + 20]]);
  const cy = keys(f, [[30, 1500], [62, a.y + 26], [116, a.y + 26], [128, b.y + 26]]);
  const clickAt = PICKS.find((p) => f >= p.click && f < p.click + 22);
  const payoff = bouncy(f, PICKS[0].land);
  const push = 1 + ease(f, 0, V3_FRAMES, 0, 0.03);
  const states: Record<number, CellState> = Object.fromEntries(
    PICKS.map((p) => [
      p.index,
      { selected: f >= p.click && (p.index === 1 || f < PICKS[1].click), hover: f >= p.click - 10, scale: keys(f, [[p.click, 1], [p.click + 4, 0.92], [p.click + 12, 1]]) },
    ]),
  );
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop mode="light" glow={{ x: 50, y: 70 }} />
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "50% 40%" }}>
        <Pos x={90} y={140}>
          <div style={{ fontFamily: rounded, fontWeight: 800, color: color.ink }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 76 }}>
              <KeyCombo keys={[{ label: "Alt", wide: 1.25 }, { label: "E" }]} size={106} tone="purple" pressed={0.3} />
              {lang === "ja" && <span style={{ opacity: out(f, 6, 22) }}>なら</span>}
            </div>
            <div
              style={{
                fontSize: lang === "ja" ? 120 : 96,
                color: color.purpleLight,
                marginTop: 10,
                whiteSpace: "nowrap",
                transformOrigin: "0% 60%",
                transform: `scale(${0.6 + 0.4 * payoff})`,
                opacity: Math.min(1, payoff * 2),
              }}
            >
              {copy[lang].core.at(-1)!.t}
            </div>
          </div>
        </Pos>
        <Pos x={70} y={420 - (1 - chatIn) * 500}>
          <ChatWindow
            lang={lang}
            width={940}
            input={sent ? "" : greeting(lang)}
            inputEmoji={sent ? undefined : landed}
            sent={
              sent
                ? { who: "Mio", hue: 280, text: <>{greeting(lang)}<Emoji e="🙏" size={30} /><Emoji e="👍" size={30} /></> }
                : undefined
            }
            sentIn={out(f, V_SEND, V_SEND + 20)}
          />
        </Pos>
        <Pos x={SHELF.x} y={SHELF.y + (1 - rise) * 900 + close * 900} z={2}>
          <ShelfWindow
            cells={myShelf}
            states={states}
            heading="My Shelf"
            count={t(lang, "14 件", "14 items")}
            lang={lang}
            footer={
              f >= 60 ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8, color: color.shelfText }}>
                  <Emoji e={f >= PICKS[1].click - 10 ? "👍" : "🙏"} size={26} />
                  {f >= PICKS[1].click - 10
                    ? t(lang, "thumbs up · 貼り付け", "thumbs up · Paste")
                    : t(lang, "folded hands · 貼り付け", "folded hands · Paste")}
                </span>
              ) : undefined
            }
          />
        </Pos>
        {f >= 30 && f < V_CLOSE + 10 && (
          <div style={{ position: "absolute", zIndex: 5, opacity: 1 - ease(f, V_CLOSE - 10, V_CLOSE + 6) }}>
            <Cursor x={cx} y={cy + close * 500} scale={1.9} click={clickAt ? ease(f, clickAt.click, clickAt.click + 22, 0, 1, Easing.out(Easing.quad)) : 0} />
          </div>
        )}
        {PICKS.map((pick) => {
          // The pasted emoji sit right after the greeting, which is longer in English.
          const p = { ...pick, to: { x: pick.to.x + (lang === "ja" ? -16 : 26), y: pick.to.y - 6 } };
          const from = cell(p.index);
          const ctrl = { x: (from.x + p.to.x) / 2 + 260, y: (from.y + p.to.y) / 2 - 120 };
          const fl = ease(f, p.click + 6, p.land, 0, 1, Easing.inOut(Easing.quad));
          const at = {
            x: (1 - fl) ** 2 * from.x + 2 * (1 - fl) * fl * ctrl.x + fl ** 2 * p.to.x,
            y: (1 - fl) ** 2 * from.y + 2 * (1 - fl) * fl * ctrl.y + fl ** 2 * p.to.y,
          };
          if (f < p.click + 6) return null;
          return (
            <div key={p.e}>
              {f < p.land && (
                <div
                  style={{
                    position: "absolute",
                    left: at.x - 44,
                    top: at.y - 44,
                    zIndex: 6,
                    transform: `rotate(${-10 * fl}deg) scale(${0.7 + 0.5 * Math.sin(fl * Math.PI) + 0.3 * fl})`,
                  }}
                >
                  <Emoji e={p.e} size={88} css={{ filter: "drop-shadow(0 10px 16px rgb(116 103 232 / 40%))" }} />
                </div>
              )}
              {f >= p.land &&
                [
                  [-80, -50, "✨", 34, -12],
                  [60, -70, p.e, 28, 14],
                  [90, 6, "✨", 26, 8],
                  [-60, 50, "✨", 22, -18],
                ].map(([dx, dy, e, sz, r], i) => {
                  const q = out(f, p.land, p.land + 30);
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: p.to.x + (dx as number) * (0.4 + q) - (sz as number) / 2,
                        top: p.to.y + (dy as number) * (0.4 + q) - (sz as number) / 2,
                        zIndex: 5,
                        transform: `rotate(${(r as number) * q}deg) scale(${0.5 + 0.5 * q})`,
                        opacity: 1 - ease(f, p.land + 18, p.land + 44),
                      }}
                    >
                      <Emoji e={e as string} size={sz as number} />
                    </div>
                  );
                })}
            </div>
          );
        })}
      </AbsoluteFill>
      <Sfx at={6} name="whoosh" volume={0.55} />
      {PICKS.map((p) => (
        <Sfx key={`k${p.e}`} at={p.click} name="key" volume={0.8} />
      ))}
      {PICKS.map((p) => (
        <Sfx key={`l${p.e}`} at={p.land} name="land" volume={0.8} />
      ))}
      <Sfx at={V_SEND} name="send" volume={0.6} />
      <Sfx at={V_CLOSE} name="whooshDown" volume={0.4} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// V4. End — the icon lands, then name, catch, Alt + E and the repository.
export const V4_FRAMES = 240;
const V_LANDING = 22;

export const V4End = ({ lang }: SceneProps) => {
  const f = useCurrentFrame();
  const fall = ease(f, 4, V_LANDING, 0, 1, Easing.in(Easing.quad));
  const bounce = keys(f, [[V_LANDING, 0], [V_LANDING + 11, -56], [V_LANDING + 22, 0]], Easing.inOut(Easing.quad));
  const y = f <= V_LANDING ? interpolate(fall, [0, 1], [-900, 0]) : bounce;
  const squash = keys(f, [[V_LANDING - 1, 1], [V_LANDING + 2, 0.86], [V_LANDING + 7, 1.04], [V_LANDING + 12, 1], [V_LANDING + 21, 1], [V_LANDING + 23, 0.95], [V_LANDING + 28, 1]]);
  const height = Math.min(1, Math.abs(y) / 500);
  const word = out(f, 30, 50);
  const cta = bouncy(f, 66);
  const meta = out(f, 80, 100);
  const credit = out(f, 92, 116);
  const press = keys(f, [[120, 0], [125, 1], [134, 1], [142, 0]]);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop mode="light" glow={{ x: 50, y: 30 }} />
      <Pos x={W / 2 - 190} y={190}>
        <div style={{ position: "relative", width: 380, height: 430 }}>
          <div
            style={{
              position: "absolute",
              left: 50 + height * 50,
              top: 396,
              width: 280 - height * 100,
              height: 30,
              borderRadius: "50%",
              background: `rgb(40 30 90 / ${22 - height * 14}%)`,
              filter: "blur(10px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 380,
              height: 380,
              borderRadius: 80,
              overflow: "hidden",
              transform: `translateY(${y}px) rotate(${-4 + height * 10}deg) scale(${2 - squash}, ${squash})`,
              transformOrigin: "50% 100%",
              boxShadow: "0 30px 70px rgb(40 30 90 / 35%)",
            }}
          >
            <Img
              src={staticFile("brand/emoshelf-icon-master.png")}
              style={{ position: "absolute", width: 479, height: 479, left: -50, top: -50 }}
            />
          </div>
        </div>
      </Pos>
      <div
        style={{
          position: "absolute",
          top: 680,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: rounded,
          fontWeight: 800,
          fontSize: 150,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: color.ink,
          opacity: word,
          transform: `translateY(${(1 - word) * 40}px)`,
        }}
      >
        EmoShelf
      </div>
      <StackTelop telop={copy[lang].catch} top={870} size={lang === "ja" ? 76 : 80} start={46} />
      <div
        style={{
          position: "absolute",
          top: 1120,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 26,
          transform: `scale(${cta})`,
          opacity: Math.min(1, cta * 2),
        }}
      >
        <KeyCombo keys={[{ label: "Alt", wide: 1.25 }, { label: "E" }]} size={96} tone="purple" pressed={press} />
        <div
          style={{
            fontFamily: mono,
            fontWeight: 600,
            fontSize: 38,
            padding: "18px 30px",
            borderRadius: 20,
            background: color.ink,
            color: "#fff",
          }}
        >
          github.com/ELRdn/EmoShelf
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 1390,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: mono,
          fontSize: 26,
          lineHeight: 1.5,
          color: color.inkSoft,
          opacity: meta,
        }}
      >
        v1.2.0 · Windows 11 (x64 / ARM64)
        <br />
        {t(lang, "無料・オープンソース", "Free & open source")}
      </div>
      <div
        style={{
          position: "absolute",
          top: 1500,
          left: 60,
          right: 60,
          textAlign: "center",
          fontFamily: mono,
          fontSize: 17,
          lineHeight: 1.6,
          color: color.inkSoft,
          opacity: credit,
        }}
      >
        {attribution.replace(" · Noto", "\nNoto")
          .split("\n")
          .map((line) => (
            <div key={line}>{line}</div>
          ))}
      </div>
      <Sfx at={4} name="whooshDown" volume={0.3} />
      <Sfx at={V_LANDING} name="thud" volume={0.8} />
      <Sfx at={V_LANDING + 22} name="popSoft" volume={0.35} />
      <Sfx at={66} name="pop" volume={0.45} />
      <Sfx at={123} name="key" volume={0.7} />
    </AbsoluteFill>
  );
};

export const verticalScenes = [
  { id: "V1-Hook", C: V1Hook, frames: V1_FRAMES, time: "0:00–0:04", still: 100 },
  { id: "V2-AltE", C: V2AltE, frames: V2_FRAMES, time: "0:04–0:05.5", still: 30 },
  { id: "V3-Core", C: V3Core, frames: V3_FRAMES, time: "0:05.5–0:11", still: 176 },
  { id: "V4-End", C: V4End, frames: V4_FRAMES, time: "0:11–0:15", still: 200 },
];

export const SHORT_FRAMES = verticalScenes.reduce((n, s) => n + s.frames, 0);

export const Short = ({ lang }: { lang: Lang }) => (
  <AbsoluteFill style={{ background: "#F4F4F6" }}>
    <Series>
      {verticalScenes.map(({ id, C, frames }) => (
        <Series.Sequence key={id} durationInFrames={frames} name={id} premountFor={30}>
          <C lang={lang} />
        </Series.Sequence>
      ))}
    </Series>
  </AbsoluteFill>
);
