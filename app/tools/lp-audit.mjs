import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../lp/dist/", import.meta.url));
const site = "https://elrdn.github.io/EmoShelf/";
for (const locale of ["ja", "en"]) {
  const file = locale === "en" ? "en/index.html" : "index.html";
  const html = readFileSync(path.join(root, file), "utf8");
  assert(html.includes(`<html lang="${locale}">`), `${file}: wrong language`);
  assert(
    html.includes('name="robots" content="noindex, nofollow"'),
    `${file}: keep the development preview unindexed until the matching release is published`,
  );
  assert(
    html.includes(
      `rel="canonical" href="${site}${locale === "en" ? "en/" : ""}"`,
    ),
    `${file}: wrong canonical`,
  );
  for (const language of ["ja", "en", "x-default"]) {
    assert(
      html.includes(`hreflang="${language}"`),
      `${file}: missing language alternate ${language}`,
    );
  }
  for (const field of [
    "og:title",
    "og:description",
    "og:url",
    "og:image",
    "og:image:alt",
  ]) {
    assert(html.includes(`property="${field}"`), `${file}: missing ${field}`);
  }
  assert(html.includes('name="twitter:card" content="summary_large_image"'));
  assert(html.includes("<noscript>"), `${file}: missing no-JavaScript help`);
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  assert(
    locale === "en"
      ? title?.includes("Your favorites")
      : title?.includes("いつもの絵文字"),
  );
  for (const [, url] of html.matchAll(
    /(?:src|href)="(\/EmoShelf\/[^"?#]+)"/g,
  )) {
    assert(
      existsSync(path.join(root, url.slice("/EmoShelf/".length))),
      `${file}: missing built asset ${url}`,
    );
  }
}
const png = readFileSync(path.join(root, "social-card.png"));
assert(png.subarray(1, 4).toString() === "PNG", "Social card must be PNG");
assert.equal(png.readUInt32BE(16), 1200, "Social card width");
assert.equal(png.readUInt32BE(20), 630, "Social card height");
console.log(
  "LP audit passed: both languages, canonical/alternates, preview gate, social metadata, assets, and 1200x630 share image.",
);
