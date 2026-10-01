import { AbsoluteFill } from "remotion";
import { color } from "../theme";

export const Backdrop = ({
  mode,
  glow = { x: 50, y: 55 },
}: {
  mode: "stress" | "light" | "shift";
  glow?: { x: number; y: number };
}) => {
  const base = mode === "stress" ? color.stress : color.page;
  const glowLayer =
    mode === "stress"
      ? "radial-gradient(ellipse at 50% 45%, rgb(255 255 255 / 45%), transparent 60%)"
      : `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgb(139 124 255 / ${mode === "shift" ? 30 : 16}%), transparent 55%)`;
  return (
    <AbsoluteFill style={{ background: base }}>
      <AbsoluteFill style={{ background: glowLayer }} />
      {mode === "shift" && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(100deg, ${color.stress} 0%, ${color.stress} 18%, transparent 46%)`,
          }}
        />
      )}
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgb(24 24 27 / 7%) 1.2px, transparent 1.2px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at 50% 50%, black 30%, transparent 85%)",
        }}
      />
      {mode === "stress" && (
        <AbsoluteFill
          style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgb(60 60 70 / 22%))" }}
        />
      )}
    </AbsoluteFill>
  );
};
