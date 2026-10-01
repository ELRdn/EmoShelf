import { useCurrentFrame } from "remotion";
import { bouncy } from "../anim";
import type { Telop } from "../copy";
import { rounded } from "../fonts";
import { color } from "../theme";

export const TelopText = ({
  telop,
  bottom = 110,
  size = 72,
  tone = "dark",
  left,
  start = 0,
}: {
  telop: Telop;
  bottom?: number;
  size?: number;
  tone?: "dark" | "light";
  left?: number;
  start?: number;
}) => {
  const f = useCurrentFrame();
  return (
  <div
    style={{
      position: "absolute",
      left: left ?? 0,
      right: left === undefined ? 0 : undefined,
      bottom,
      textAlign: left === undefined ? "center" : "left",
      whiteSpace: "nowrap",
      fontFamily: rounded,
      fontWeight: 800,
      fontSize: size,
      letterSpacing: "0.01em",
      color: tone === "dark" ? color.ink : color.shelfText,
      textShadow:
        tone === "dark" ? "0 2px 0 rgb(255 255 255 / 80%)" : "0 2px 12px rgb(0 0 0 / 40%)",
    }}
  >
    {telop.map((s, i) => {
      const p = bouncy(f, start + i * 7);
      return (
        <span
          key={s.t}
          style={{
            color: s.hl ? color.purpleLight : undefined,
            display: "inline-block",
            whiteSpace: "pre",
            opacity: Math.min(1, p * 1.6),
            transform: `translateY(${(1 - p) * 40}px) scale(${0.92 + 0.08 * p})`,
          }}
        >
          {s.t}
        </span>
      );
    })}
  </div>
  );
};
