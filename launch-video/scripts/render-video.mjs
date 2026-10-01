// Renders the main composition to H.264 MP4.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const root = path.resolve(import.meta.dirname, "..");
const [id = "Main-JA", name = "animatic"] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts") });
const composition = await selectComposition({ serveUrl, id });
mkdirSync(path.join(root, "out", "video"), { recursive: true });
const output = path.join(root, "out", "video", `${name}-${id}.mp4`);
let last = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  crf: 18,
  pixelFormat: "yuv420p",
  colorSpace: "bt709",
  audioCodec: "aac",
  outputLocation: output,
  onProgress: ({ progress }) => {
    const pct = Math.floor(progress * 10) * 10;
    if (pct !== last) console.log(`${pct}%`), (last = pct);
  },
});
console.log(output);
