import type { ReactNode } from "react";
import type { Lang } from "../copy";
import { ui } from "../fonts";
import { color, shadow } from "../theme";
import { Emoji } from "./Emoji";

// A fictional, brand-free chat app. Never styled after a real product.
type Msg = { who: string; hue: number; text: ReactNode };

const Avatar = ({ who, hue }: { who: string; hue: number }) => (
  <div
    style={{
      width: 44,
      height: 44,
      borderRadius: 14,
      background: `hsl(${hue} 70% 88%)`,
      color: `hsl(${hue} 45% 32%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: 20,
      flex: "none",
    }}
  >
    {who[0]}
  </div>
);

const threads: Record<Lang, Msg[]> = {
  ja: [
    { who: "Aoi", hue: 200, text: "資料、共有フォルダに置いておきました" },
    { who: "Ren", hue: 30, text: "助かります！あとで確認します" },
  ],
  en: [
    { who: "Aoi", hue: 200, text: "Dropped the slides in the shared folder." },
    { who: "Ren", hue: 30, text: "Thanks! I'll take a look later." },
  ],
};

const channel: Record<Lang, string> = { ja: "プロジェクト", en: "project" };

export const ChatWindow = ({
  width = 980,
  lang = "ja",
  thread = threads[lang],
  input,
  inputEmoji,
  sent,
  caret = true,
  dim = false,
  sentIn = 1,
}: {
  width?: number;
  lang?: Lang;
  thread?: Msg[];
  input: string;
  inputEmoji?: string | string[];
  sent?: Msg;
  caret?: boolean;
  dim?: boolean;
  sentIn?: number;
}) => (
  <div
    style={{
      width,
      borderRadius: 22,
      background: dim ? "#F1F1F3" : "#FFFFFF",
      boxShadow: shadow.card,
      border: `1px solid ${color.lineLight}`,
      fontFamily: ui,
      color: color.ink,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        height: 64,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 26px",
        borderBottom: `1px solid ${color.lineLight}`,
        fontSize: 22,
        fontWeight: 700,
      }}
    >
      <span style={{ color: color.inkSoft, fontWeight: 500 }}>#</span>
      {channel[lang]}
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 6, background: "#DAD9E0" }} />
        ))}
      </div>
    </div>
    <div style={{ padding: "22px 26px 8px", display: "flex", flexDirection: "column", gap: 18 }}>
      {[...thread, ...(sent ? [sent] : [])].map((m, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            ...(i === thread.length
              ? { opacity: sentIn, transform: `translateY(${(1 - sentIn) * 24}px)`, maxHeight: 76 * sentIn }
              : {}),
          }}
        >
          <Avatar who={m.who} hue={m.hue} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
              {m.who}
              <span style={{ fontWeight: 400, color: color.inkSoft, marginLeft: 10, fontSize: 15 }}>
                {i === 0 ? "18:02" : i === 1 ? "18:04" : "18:05"}
              </span>
            </div>
            <div style={{ fontSize: 22, display: "flex", alignItems: "center", gap: 6 }}>
              {m.text}
            </div>
          </div>
        </div>
      ))}
    </div>
    <div style={{ padding: "12px 22px 22px" }}>
      <div
        style={{
          height: 68,
          borderRadius: 16,
          border: `2px solid ${caret ? "#CFCBF7" : color.lineLight}`,
          background: "#FAFAFB",
          display: "flex",
          alignItems: "center",
          padding: "0 22px",
          fontSize: 24,
          gap: 6,
        }}
      >
        <span>{input}</span>
        {[inputEmoji ?? []].flat().map((e, i) => <Emoji key={i} e={e} size={32} />)}
        {caret && <span style={{ width: 3, height: 32, background: color.purpleLight, borderRadius: 2 }} />}
        <div
          style={{
            marginLeft: "auto",
            width: 44,
            height: 44,
            borderRadius: 12,
            background: color.purpleLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path d="M3 11.5 21 3l-6.5 18-3-7.5z" fill="#fff" />
          </svg>
        </div>
      </div>
    </div>
  </div>
);
