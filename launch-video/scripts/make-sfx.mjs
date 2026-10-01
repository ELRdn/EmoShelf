// Synthesizes every sound effect used in the video, so no third-party audio is involved.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SR = 48000;
const out = path.resolve(import.meta.dirname, "..", "public", "sfx");
mkdirSync(out, { recursive: true });

// Deterministic noise so re-running the script produces identical files.
let seed = 1234567;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 2 ** 32) * 2 - 1;
};

const buffer = (seconds) => new Float32Array(Math.ceil(seconds * SR));

// RBJ biquad filter, coefficients recomputed per sample so the cutoff can sweep.
const biquad = (type) => {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x, freq, q = 0.8) => {
    const w = (2 * Math.PI * Math.min(freq, SR * 0.45)) / SR;
    const a = Math.sin(w) / (2 * q);
    const c = Math.cos(w);
    let b0, b1, b2;
    if (type === "lp") [b0, b1, b2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
    else if (type === "hp") [b0, b1, b2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
    else [b0, b1, b2] = [a, 0, -a];
    const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
};

const add = (dst, src, at = 0, gain = 1) => {
  const o = Math.round(at * SR);
  for (let i = 0; i < src.length && o + i < dst.length; i++) dst[o + i] += src[i] * gain;
  return dst;
};

// Sine with exponential pitch glide and exponential decay.
const tone = (seconds, f0, f1, decay, attack = 0.002) => {
  const b = buffer(seconds);
  let phase = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const f = f0 * (f1 / f0) ** Math.min(1, t / seconds);
    phase += (2 * Math.PI * f) / SR;
    const env = Math.min(1, t / attack) * Math.exp(-t / decay);
    b[i] = Math.sin(phase) * env;
  }
  return b;
};

const burst = (seconds, type, freq, decay, q = 0.8) => {
  const b = buffer(seconds);
  const f = biquad(type);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = f(noise(), freq, q) * Math.exp(-t / decay);
  }
  return b;
};

const sweep = (seconds, fromHz, toHz, peakAt, q = 1.2) => {
  const b = buffer(seconds);
  const f = biquad("bp");
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const p = t / seconds;
    const env = p < peakAt ? (p / peakAt) ** 2 : ((1 - p) / (1 - peakAt)) ** 1.6;
    b[i] = f(noise(), fromHz * (toHz / fromHz) ** p, q) * env * 3;
  }
  return b;
};

const keyClick = () => {
  const b = buffer(0.12);
  add(b, burst(0.02, "hp", 3500, 0.004), 0, 0.6);
  add(b, tone(0.05, 2100, 1800, 0.012), 0, 0.25);
  add(b, tone(0.1, 190, 150, 0.03), 0.002, 0.7);
  return b;
};

const pop = (f0 = 950, f1 = 320) => {
  const b = buffer(0.2);
  add(b, tone(0.12, f0, f1, 0.035), 0, 0.8);
  add(b, burst(0.01, "hp", 4000, 0.002), 0, 0.25);
  return b;
};

const chime = (notes, spacing, decay, gain = 0.35) => {
  const b = buffer(spacing * notes.length + decay * 5);
  notes.forEach((n, i) => {
    add(b, tone(decay * 5, n, n, decay, 0.004), i * spacing, gain);
    add(b, tone(decay * 5, n * 2, n * 2, decay * 0.5, 0.004), i * spacing, gain * 0.25);
  });
  return b;
};

const tick = (f = 2600) => {
  const b = buffer(0.04);
  add(b, burst(0.03, "bp", f, 0.004, 3), 0, 1.2);
  return b;
};

const sounds = {
  key: keyClick(),
  tick: tick(),
  // Wheel-like ratchet while hunting through the stock panel.
  scroll: (() => {
    const b = buffer(1.3);
    for (let i = 0; i < 26; i++) add(b, tick(1800 + (i % 3) * 300), i * 0.048, 0.35 + 0.2 * Math.sin(i));
    return b;
  })(),
  impact: (() => {
    const b = buffer(1.4);
    add(b, keyClick(), 0, 1);
    add(b, tone(0.9, 70, 38, 0.22, 0.004), 0.005, 1.1);
    add(b, burst(0.4, "lp", 900, 0.08), 0, 0.5);
    add(b, chime([1318.5, 1975.5], 0.0, 0.25, 0.14), 0.02);
    return b;
  })(),
  whoosh: sweep(0.45, 250, 2600, 0.55),
  whooshDown: sweep(0.45, 2400, 220, 0.3),
  pop: pop(),
  popSoft: pop(700, 380),
  land: (() => {
    const b = buffer(1.2);
    add(b, pop(1100, 420), 0, 0.9);
    add(b, chime([1567.98, 2093], 0.06, 0.12, 0.28), 0.015);
    return b;
  })(),
  send: (() => {
    const b = buffer(0.5);
    add(b, sweep(0.22, 600, 3200, 0.7, 2), 0, 0.6);
    add(b, tone(0.14, 1200, 1900, 0.05), 0.12, 0.35);
    return b;
  })(),
  flip: (() => {
    const b = buffer(0.7);
    for (let i = 0; i < 7; i++) add(b, tick(2200 + i * 180), i * (4 / 60), 0.6);
    return b;
  })(),
  thud: (() => {
    const b = buffer(0.8);
    add(b, tone(0.4, 150, 70, 0.08, 0.003), 0, 1);
    add(b, pop(800, 300), 0, 0.5);
    return b;
  })(),
};

const writeWav = (file, samples) => {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const scale = peak > 0 ? 0.89 / peak : 1;
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * scale)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([header, data]));
};

for (const [name, samples] of Object.entries(sounds)) writeWav(path.join(out, `${name}.wav`), samples);
console.log(`wrote ${Object.keys(sounds).length} sounds to ${out}`);
