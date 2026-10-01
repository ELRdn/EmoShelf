import { ui } from "../fonts";
import { Emoji } from "./Emoji";

// Evokes the size and placement of the built-in Windows emoji panel without copying it:
// no Microsoft glyphs, icons, or exact layout.
const grid = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
  "🙂", "🙃", "🫠", "😉", "😊", "😇", "🥰", "😍",
  "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛",
  "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🫢", "🤫",
  "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "😏",
  "😒", "🙄", "😬", "😮", "🤥", "😌", "😔", "😪",
  "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧",
  "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎",
];

const tabs = ["☺︎", "GIF", ";-)", "Ω", "▤"];

export const StockPanel = ({
  scroll = 0,
  blur = 0,
  scale = 1,
  placeholder = "検索",
}: {
  placeholder?: string;
  scroll?: number;
  blur?: number;
  scale?: number;
}) => (
  <div
    style={{
      width: 392,
      height: 452,
      borderRadius: 10,
      background: "#F6F6F8",
      border: "1px solid #CFCFD6",
      boxShadow: "0 16px 40px rgb(24 24 27 / 22%)",
      fontFamily: ui,
      color: "#3C3B44",
      overflow: "hidden",
      transform: `scale(${scale})`,
      transformOrigin: "top left",
    }}
  >
    <div style={{ display: "flex", gap: 4, padding: "10px 10px 6px" }}>
      {tabs.map((t, i) => (
        <div
          key={t}
          style={{
            flex: 1,
            height: 30,
            borderRadius: 6,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: i === 0 ? "#E4E4EA" : "transparent",
            color: "#6A6973",
          }}
        >
          {t}
        </div>
      ))}
    </div>
    <div
      style={{
        margin: "4px 12px 8px",
        height: 30,
        borderRadius: 6,
        background: "#FFFFFF",
        border: "1px solid #D8D8DE",
        fontSize: 13,
        color: "#8D8C96",
        display: "flex",
        alignItems: "center",
        padding: "0 10px",
      }}
    >
      {placeholder}
    </div>
    <div style={{ display: "flex", gap: 6, padding: "0 12px 6px" }}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          style={{ flex: 1, height: 4, borderRadius: 2, background: i === 1 ? "#8D8C96" : "#DCDCE2" }}
        />
      ))}
    </div>
    <div style={{ position: "relative", height: 340, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 12,
          right: 22,
          top: -scroll,
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          rowGap: 10,
          filter: blur ? `blur(${blur}px)` : undefined,
        }}
      >
        {[...grid, ...grid, ...grid].map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "center" }}>
            <Emoji e={e} size={30} />
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          right: 6,
          top: 10 + (scroll % 260) * 0.5,
          width: 5,
          height: 70,
          borderRadius: 3,
          background: "#A9A8B2",
        }}
      />
    </div>
  </div>
);
