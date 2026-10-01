// Renders one representative frame per scene from the main timeline, plus the storyboard sheet.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const root = path.resolve(import.meta.dirname, "..");
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ["ja"];
const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts") });

for (const lang of langs) {
  const outDir = path.join(root, "out", "stills", lang);
  mkdirSync(outDir, { recursive: true });
  const inputProps = { lang };
  const main = await selectComposition({ serveUrl, id: `Main-${lang.toUpperCase()}`, inputProps });
  const { frames } = JSON.parse(process.env.STILL_FRAMES ?? "{}");
  const shots = frames ?? [["S1-Hook", 110], ["S2-AltE", 340], ["S3-Core", 536], ["S4-Arrange", 852], ["S5-Search", 1050], ["S6-Style", 1214], ["S7-Real", 1485], ["S8-End", 1730]];
  for (const [name, frame] of shots) {
    const output = path.join(outDir, `${name}.png`);
    await renderStill({ composition: main, serveUrl, output, inputProps, frame });
    console.log(output);
  }
  const board = await selectComposition({ serveUrl, id: "Storyboard", inputProps });
  await renderStill({ composition: board, serveUrl, output: path.join(outDir, "Storyboard.png"), inputProps });
}
