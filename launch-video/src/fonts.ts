import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// OFL fonts bundled in public/fonts so renders never depend on the network.
export const rounded = "EmoShelf Rounded";
export const mono = "EmoShelf Mono";

for (const [file, weight] of [
  ["MPLUSRounded1c-Medium.ttf", "500"],
  ["MPLUSRounded1c-Bold.ttf", "700"],
  ["MPLUSRounded1c-ExtraBold.ttf", "800"],
] as const) {
  loadFont({ family: rounded, url: staticFile(`fonts/${file}`), weight });
}
loadFont({ family: mono, url: staticFile("fonts/CascadiaMono.ttf"), weight: "200 700" });

export const ui = `"Segoe UI Variable Text", "Segoe UI", "Yu Gothic UI", "${rounded}", sans-serif`;
