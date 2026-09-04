import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_JAVASCRIPT_BYTES = 500 * 1024;
const assetsDirectory = fileURLToPath(
  new URL("../dist/assets/", import.meta.url),
);
const files = await readdir(assetsDirectory);
const oversized = [];

for (const file of files.filter((name) => name.endsWith(".js"))) {
  const filePath = join(assetsDirectory, file);
  const { size } = await stat(filePath);
  if (size > MAX_JAVASCRIPT_BYTES) {
    oversized.push(`${file} (${size} bytes)`);
  }
}

if (oversized.length > 0) {
  throw new Error(
    `JavaScript bundle limit exceeded (500 KiB):\n${oversized.join("\n")}`,
  );
}

console.log("Bundle size gate passed: every JavaScript chunk is <= 500 KiB.");
