import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function parseArgs(values) {
  const args = new Map();
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`invalid argument near ${key ?? "<end>"}`);
    }
    args.set(key.slice(2), value);
  }
  return args;
}

function required(args, key) {
  const value = args.get(key);
  if (!value) {
    throw new Error(`--${key} is required`);
  }
  return value;
}

function releaseUrl(baseUrl, file) {
  return `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(path.basename(file))}`;
}

export function createLatestJson({
  version,
  notes,
  pubDate,
  baseUrl,
  x64File,
  arm64File,
}) {
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error("version must be valid SemVer without a leading v");
  }
  const platforms = {};
  for (const [platform, file] of [
    ["windows-x86_64", x64File],
    ["windows-aarch64", arm64File],
  ]) {
    if (!existsSync(file) || !existsSync(`${file}.sig`)) {
      throw new Error(
        `signed updater artifact or signature is missing: ${file}`,
      );
    }
    const signature = readFileSync(`${file}.sig`, "utf8").trim();
    if (!signature) {
      throw new Error(`empty updater signature: ${file}.sig`);
    }
    platforms[platform] = { signature, url: releaseUrl(baseUrl, file) };
  }
  return {
    version,
    notes: notes.trim(),
    pub_date: pubDate,
    platforms,
  };
}

function filesBelow(root) {
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      result.push(...filesBelow(absolute));
    } else if (entry.isFile()) {
      result.push(absolute);
    }
  }
  return result;
}

export function createChecksums(directory, output) {
  const outputAbsolute = path.resolve(output);
  return filesBelow(directory)
    .filter((file) => path.resolve(file) !== outputAbsolute)
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((file) => {
      const digest = createHash("sha256")
        .update(readFileSync(file))
        .digest("hex");
      const relative = path.relative(directory, file).replaceAll("\\", "/");
      return `${digest}  ${relative}`;
    })
    .join("\n");
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (command === "latest-json") {
    const notesFile = required(args, "notes-file");
    const value = createLatestJson({
      version: required(args, "version"),
      notes: readFileSync(notesFile, "utf8"),
      pubDate: args.get("pub-date") ?? new Date().toISOString(),
      baseUrl: required(args, "base-url"),
      x64File: required(args, "x64-file"),
      arm64File: required(args, "arm64-file"),
    });
    writeFileSync(
      required(args, "output"),
      `${JSON.stringify(value, null, 2)}\n`,
    );
    return;
  }
  if (command === "checksums") {
    const directory = required(args, "directory");
    const output = required(args, "output");
    if (!statSync(directory).isDirectory()) {
      throw new Error("--directory must be a directory");
    }
    writeFileSync(output, `${createChecksums(directory, output)}\n`);
    return;
  }
  throw new Error("expected command: latest-json or checksums");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
