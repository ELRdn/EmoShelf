import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { codepoints, styleShelf, twemoji, twemojiName } from "./emoji-list.mjs";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "public", "emoji");
const sources = JSON.parse(
  readFileSync(path.join(root, "..", "app", "renderer-sources.json"), "utf8"),
).sources;

const twemojiDir = path.join(root, "node_modules", "@twemoji", "svg");
mkdirSync(path.join(out, "twemoji"), { recursive: true });
// Also pick up every emoji literal used in the compositions.
const used = readdirSync(path.join(root, "src"), { recursive: true })
  .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
  .flatMap((f) => readFileSync(path.join(root, "src", f), "utf8").match(/\p{RGI_Emoji}/gv) ?? []);
for (const emoji of new Set([...twemoji, ...styleShelf.map(([e]) => e), ...used])) {
  if (!existsSync(path.join(twemojiDir, `${twemojiName(emoji)}.svg`))) continue;
  const name = `${twemojiName(emoji)}.svg`;
  copyFileSync(path.join(twemojiDir, name), path.join(out, "twemoji", name));
}

const raw = (id, file) =>
  `${sources[id].repository.replace("github.com", "raw.githubusercontent.com")}/${sources[id].commit}/${file}`;

const styleUrls = (emoji, fluentName) => {
  const cps = codepoints(emoji);
  const bare = cps.filter((c) => c !== "fe0f");
  const snake = fluentName.toLowerCase().replaceAll(" ", "_");
  return {
    fluent: [raw("fluent", `assets/${encodeURIComponent(fluentName)}/Color/${snake}_color.svg`)],
    noto: [raw("noto", `svg/emoji_u${bare.join("_")}.svg`)],
    openmoji: [
      raw("openmoji", `color/svg/${cps.join("-").toUpperCase()}.svg`),
      raw("openmoji", `color/svg/${bare.join("-").toUpperCase()}.svg`),
    ],
  };
};

for (const [emoji, fluentName] of styleShelf) {
  for (const [style, urls] of Object.entries(styleUrls(emoji, fluentName))) {
    const dest = path.join(out, style, `${twemojiName(emoji)}.svg`);
    if (existsSync(dest)) continue;
    mkdirSync(path.dirname(dest), { recursive: true });
    let saved = false;
    for (const url of urls) {
      const res = await fetch(url);
      if (res.ok) {
        writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
        saved = true;
        break;
      }
    }
    if (!saved) throw new Error(`missing ${style} artwork for ${emoji}: ${urls.join(", ")}`);
  }
}
console.log("emoji assets ready");
