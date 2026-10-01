import { AbsoluteFill, Freeze } from "remotion";
import type { Lang } from "../copy";
import { copy } from "../copy";
import { mono, rounded } from "../fonts";
import { color } from "../theme";
import { scenes } from "./Scenes";

const notes: string[][] = [
  ["入力欄に「おつかれさま！」", "Win + . で小さなパネル → スクロールしても🙏が見つからない", "ジャンプカット「次の日」も倍速で同じ動作"],
  ["パネルがくしゃっと縮んで退場、画面が止まる", "紫の Alt + E が叩き込まれる（カチッ）", "グレー → ライトへ、衝撃リングで一気に切り替え"],
  ["棚が下からスッと出現（奥行きのある傾き）", "🙏をクリック → 弧を描いてチャット欄へ", "着地で小さな粒が弾け、送信。棚は閉じる"],
  ["Work / Reactions の棚が背後に重なる", "😂をドラッグして並べ替え（空き枠が紫の点線）", "👍✨の組み合わせ・自作画像スタンプも同じ棚に"],
  ["All タブで「ねこ」→ 猫の絵文字が並ぶ", "「cat」に打ち替えても同じ結果", "右のカードで ねこ ⇄ cat を対比"],
  ["4 STYLES", "Twemoji → Fluent → Noto → OpenMoji", "反転の波が棚を横切り、スタイルが切り替わる"],
  ["再構築UI → 実アプリの実画面へクロスフェード", "「実際の画面」ラベルで実物であることを明示", "4つの約束をバッジで順に配置"],
  ["サングラス絵文字のアイコンが着地して弾む", "キャッチ・Alt + E・GitHub URL", "下端に絵文字素材の帰属表示"],
];

const telopOf = (i: number, lang: Lang) => {
  const key = ["hook", null, "core", "arrange", "search", "style", null, "catch"][i];
  return key ? copy[lang][key].map((s) => s.t).join("") : "—";
};

const SCALE = 0.42;

export const Storyboard = ({ lang }: { lang: Lang }) => (
  <AbsoluteFill style={{ background: "#ECECF0", fontFamily: rounded, color: color.ink, padding: 60 }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginBottom: 36 }}>
      <div style={{ fontSize: 52, fontWeight: 800 }}>EmoShelf Launch Video — Storyboard</div>
      <div style={{ fontFamily: mono, fontSize: 24, color: color.inkSoft }}>
        16:9 · 30s · 60fps · {lang.toUpperCase()} · animatic v1
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", columnGap: 60, rowGap: 44 }}>
      {scenes.map(({ id, C, time, still }, i) => (
        <div key={id} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span
              style={{
                fontFamily: mono,
                fontWeight: 600,
                fontSize: 24,
                color: "#fff",
                background: color.purpleLight,
                borderRadius: 10,
                padding: "2px 12px",
              }}
            >
              #{i + 1}
            </span>
            <span style={{ fontFamily: mono, fontSize: 24, color: color.inkSoft }}>{time}</span>
            <span style={{ fontSize: 26, fontWeight: 800 }}>{telopOf(i, lang)}</span>
          </div>
          <div
            style={{
              width: 1920 * SCALE,
              height: 1080 * SCALE,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 10px 30px rgb(24 24 27 / 14%)",
              position: "relative",
            }}
          >
            <div style={{ width: 1920, height: 1080, transform: `scale(${SCALE})`, transformOrigin: "top left", position: "relative" }}>
              <Freeze frame={still}>
                <C lang={lang} />
              </Freeze>
            </div>
          </div>
          <ul style={{ margin: 0, paddingLeft: 26, fontSize: 21, fontWeight: 500, lineHeight: 1.55, color: "#3A3942" }}>
            {notes[i].map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);
