import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Emoji } from "./Emoji";

// [emoji, angle (deg, 0 = right, -90 = up), distance, spin]
const PARTICLES: [string, number, number, number][] = [
  ["🙏", -150, 230, -30],
  ["👍", -122, 290, 20],
  ["😂", -100, 250, -12],
  ["✨", -80, 320, 40],
  ["🎉", -58, 270, 24],
  ["🔥", -34, 220, -20],
  ["❤️", -136, 180, 14],
  ["👀", -66, 190, -26],
];

// Favorites pop out of a point (the Alt + E key) and fall away.
// `turn` rotates the whole fan (180 = downward).
export const Burst = ({ x, y, at, size = 54, scale = 1, turn = 0 }: { x: number; y: number; at: number; size?: number; scale?: number; turn?: number }) => {
  const f = useCurrentFrame() - at;
  if (f < 0 || f > 64) return null;
  const p = interpolate(f, [0, 34], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const fall = (f / 64) ** 2 * 140 * scale;
  const fade = interpolate(f, [34, 64], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pop = interpolate(f, [0, 6, 12], [0.3, 1.15, 1], { extrapolateRight: "clamp" });
  return (
    <>
      {PARTICLES.map(([e, deg, dist, spin], i) => {
        const a = ((deg + turn) * Math.PI) / 180;
        const d = dist * scale * p;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + Math.cos(a) * d - size / 2,
              top: y + Math.sin(a) * d + fall - size / 2,
              zIndex: 6,
              opacity: fade,
              transform: `rotate(${spin * p}deg) scale(${pop * (i % 3 === 0 ? 0.8 : 1)})`,
            }}
          >
            <Emoji e={e} size={size} css={{ filter: "drop-shadow(0 8px 14px rgb(40 30 90 / 25%))" }} />
          </div>
        );
      })}
    </>
  );
};
