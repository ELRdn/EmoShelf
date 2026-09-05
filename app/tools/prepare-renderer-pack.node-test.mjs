import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildSourceIndex,
  normalizeHexcode,
  normalizeStaticSvg,
} from "./prepare-renderer-pack.mjs";

test("normalizes renderer hexcodes and variation selectors", () => {
  assert.equal(
    normalizeHexcode("emoji_u1F469_200D_1F4BB.svg"),
    "1f469-200d-1f4bb",
  );
  assert.equal(normalizeHexcode("0023-FE0F-20E3.svg"), "23-fe0f-20e3");
});

test("converts safe presentation styles and rejects active content", () => {
  const normalized = normalizeStaticSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" style="enable-background:new 0 0 1 1"><path style="fill:#fff;stroke:#000;mask-type:alpha"/></svg>',
  );
  assert.match(normalized, /fill="#fff"/);
  assert.match(normalized, /stroke="#000"/);
  assert.match(normalized, /mask-type="alpha"/);
  assert.doesNotMatch(normalized, /style=/);
  assert.throws(
    () => normalizeStaticSvg("<svg><script/></svg>"),
    /not allowed/,
  );
  assert.throws(
    () =>
      normalizeStaticSvg('<svg><use href="https://example.com/a.svg"/></svg>'),
    /external SVG references/,
  );
});

test("indexes Fluent metadata by Unicode", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "emoshelf-fluent-"));
  const emoji = path.join(root, "assets", "Coder");
  const color = path.join(emoji, "Color");
  mkdirSync(color, { recursive: true });
  writeFileSync(
    path.join(emoji, "metadata.json"),
    JSON.stringify({ unicode: "1f9d1 200d 1f4bb" }),
  );
  writeFileSync(path.join(color, "coder_color.svg"), "<svg/>");
  assert.equal(
    buildSourceIndex("fluent", root).get("1f9d1-200d-1f4bb"),
    path.join(color, "coder_color.svg"),
  );
});
