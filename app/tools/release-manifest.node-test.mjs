import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createChecksums, createLatestJson } from "./release-manifest.mjs";

test("latest.json contains both signed Windows architectures", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "emoshelf-release-"));
  const x64 = path.join(root, "EmoShelf-x64.exe");
  const arm64 = path.join(root, "EmoShelf-arm64.exe");
  for (const file of [x64, arm64]) {
    writeFileSync(file, "installer");
    writeFileSync(`${file}.sig`, `signature-${path.basename(file)}`);
  }
  const manifest = createLatestJson({
    version: "1.0.0",
    notes: "Stable release",
    pubDate: "2026-09-05T00:00:00.000Z",
    baseUrl: "https://github.com/ELRdn/EmoShelf/releases/download/v1.0.0",
    x64File: x64,
    arm64File: arm64,
  });
  assert.equal(
    manifest.platforms["windows-x86_64"].signature,
    "signature-EmoShelf-x64.exe",
  );
  assert.match(
    manifest.platforms["windows-aarch64"].url,
    /EmoShelf-arm64\.exe$/,
  );
});

test("checksums are deterministic and exclude the destination", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "emoshelf-checksum-"));
  mkdirSync(path.join(root, "nested"));
  writeFileSync(path.join(root, "b.txt"), "b");
  writeFileSync(path.join(root, "nested", "a.txt"), "a");
  const output = path.join(root, "SHA256SUMS.txt");
  writeFileSync(output, "stale");
  const checksums = createChecksums(root, output).split("\n");
  assert.equal(checksums.length, 2);
  assert.match(checksums[0], /b\.txt|nested\/a\.txt/);
  assert.ok(checksums.every((line) => !line.includes("SHA256SUMS.txt")));
});
