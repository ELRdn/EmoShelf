import { Easing, interpolate, spring } from "remotion";

export const FPS = 60;
export const sec = (s: number) => Math.round(s * FPS);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const ease = (f: number, from: number, to: number, a = 0, b = 1, easing = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [from, to], [a, b], { ...clamp, easing });

export const out = (f: number, from: number, to: number, a = 0, b = 1) =>
  ease(f, from, to, a, b, Easing.out(Easing.cubic));

// Piecewise interpolation through [frame, value] keys.
export const keys = (f: number, k: [number, number][], easing = Easing.inOut(Easing.cubic)) =>
  interpolate(
    f,
    k.map(([t]) => t),
    k.map(([, v]) => v),
    { ...clamp, easing },
  );

export const snappy = (f: number, at: number) =>
  spring({ frame: f - at, fps: FPS, config: { damping: 20, stiffness: 200 } });

export const bouncy = (f: number, at: number) =>
  spring({ frame: f - at, fps: FPS, config: { damping: 11, stiffness: 160 } });

export const smooth = (f: number, at: number, durationInFrames?: number) =>
  spring({ frame: f - at, fps: FPS, config: { damping: 200 }, durationInFrames });
