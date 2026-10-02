import { AbsoluteFill, Img, staticFile } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Emoji } from "../components/Emoji";
import { KeyCombo } from "../components/Keycap";
import { ShelfWindow } from "../components/ShelfWindow";
import { copy, type Lang } from "../copy";
import { myShelf } from "../data";
import { mono, rounded } from "../fonts";
import { color } from "../theme";
import { Pos, t } from "./Scenes";

// YouTube thumbnail (1920×1080): the one-click payoff, readable at small sizes.
export const Thumbnail = ({ lang }: { lang: Lang }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <Backdrop mode="light" glow={{ x: 70, y: 55 }} />
    <Pos x={1110} y={340} z={1}>
      <div style={{ transform: "perspective(1800px) rotateY(-14deg) rotateX(6deg) rotateZ(-2deg) scale(1.08)", transformOrigin: "0% 50%" }}>
        <ShelfWindow
          cells={myShelf}
          states={{ 0: { selected: true, hover: true } }}
          heading="My Shelf"
          count={t(lang, "14 件", "14 items")}
          lang={lang}
        />
      </div>
    </Pos>
    <svg width={1920} height={1080} style={{ position: "absolute", zIndex: 2 }}>
      <defs>
        <linearGradient id="arc" gradientUnits="userSpaceOnUse" x1={1236} y1={600} x2={1060} y2={200}>
          <stop offset="0" stopColor="#8B7CFF" stopOpacity="0" />
          <stop offset="1" stopColor="#8B7CFF" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <path d="M1236 600 Q 1220 280 1060 200" stroke="url(#arc)" strokeWidth={14} strokeLinecap="round" fill="none" />
    </svg>
    <Pos x={940} y={70} z={3}>
      <div style={{ transform: "rotate(-10deg)" }}>
        <Emoji e="🙏" size={200} css={{ filter: "drop-shadow(0 20px 30px rgb(116 103 232 / 45%))" }} />
      </div>
    </Pos>
    {[
      [880, 80, "✨", 64, -12],
      [1150, 60, "✨", 48, 10],
    ].map(([x, y, e, s, r], i) => (
      <Pos key={i} x={x as number} y={y as number} z={3}>
        <div style={{ transform: `rotate(${r}deg)` }}>
          <Emoji e={e as string} size={s as number} />
        </div>
      </Pos>
    ))}
    <Pos x={110} y={96} z={4}>
      <div style={{ display: "flex", alignItems: "center", gap: 22, fontFamily: rounded, fontWeight: 800, fontSize: 68, color: color.ink }}>
        <div style={{ width: 104, height: 104, borderRadius: 24, overflow: "hidden", position: "relative", boxShadow: "0 12px 30px rgb(40 30 90 / 30%)" }}>
          <Img src={staticFile("brand/emoshelf-icon-master.png")} style={{ position: "absolute", width: 132, height: 132, left: -14, top: -14 }} />
        </div>
        EmoShelf
      </div>
    </Pos>
    <Pos x={110} y={330} z={4}>
      <div style={{ fontFamily: rounded, fontWeight: 800, color: color.ink }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30, fontSize: 104 }}>
          <KeyCombo keys={[{ label: "Alt", wide: 1.25 }, { label: "E" }]} size={170} tone="purple" pressed={0.3} />
          {lang === "ja" && <span>なら</span>}
        </div>
        <div
          style={{
            marginTop: 30,
            fontSize: lang === "ja" ? 160 : 112,
            lineHeight: 1.1,
            whiteSpace: "nowrap",
            color: color.purpleLight,
            textShadow: "0 4px 0 rgb(255 255 255 / 90%)",
          }}
        >
          {copy[lang].core.at(-1)!.t}
        </div>
      </div>
    </Pos>
    <Pos x={110} y={900} z={4}>
      <div
        style={{
          fontFamily: mono,
          fontWeight: 600,
          fontSize: 34,
          padding: "16px 26px",
          borderRadius: 18,
          background: color.ink,
          color: "#fff",
        }}
      >
        Windows 11 · {t(lang, "無料・オープンソース", "Free & open source")}
      </div>
    </Pos>
  </AbsoluteFill>
);
