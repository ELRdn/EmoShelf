import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  timingSafeEqual,
  verify,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const FORBIDDEN_ELEMENTS = [
  "script",
  "foreignobject",
  "animate",
  "animatetransform",
  "animatemotion",
  "animatecolor",
  "set",
  "discard",
  "image",
  "feimage",
  "style",
  "audio",
  "video",
  "iframe",
  "mpath",
];
const STYLE_PROPERTIES = new Set([
  "clip-path",
  "clip-rule",
  "color",
  "fill",
  "fill-opacity",
  "fill-rule",
  "flood-color",
  "flood-opacity",
  "mask-type",
  "mix-blend-mode",
  "opacity",
  "overflow",
  "display",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
]);

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

function filesBelow(root, predicate) {
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      result.push(...filesBelow(absolute, predicate));
    } else if (entry.isFile() && predicate(absolute)) {
      result.push(absolute);
    }
  }
  return result.sort((left, right) => left.localeCompare(right, "en"));
}

export function normalizeHexcode(value) {
  const normalized = value
    .toLowerCase()
    .replace(/^emoji_u/, "")
    .replace(/\.svg$/, "")
    .replaceAll("_", "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const parts = normalized.split("-");
  if (
    !parts.length ||
    parts.some(
      (part) =>
        !/^[0-9a-f]{1,6}$/.test(part) ||
        Number.parseInt(part, 16) > 0x10ffff ||
        (Number.parseInt(part, 16) >= 0xd800 &&
          Number.parseInt(part, 16) <= 0xdfff),
    )
  ) {
    throw new Error(`invalid Unicode hexcode: ${value}`);
  }
  return parts.map((part) => Number.parseInt(part, 16).toString(16)).join("-");
}

function withoutVariationSelector(hexcode) {
  return hexcode
    .split("-")
    .filter((part) => part !== "fe0f" && part !== "fe0e")
    .join("-");
}

function styleToAttributes(style) {
  const attributes = [];
  for (const declaration of style.split(";")) {
    const trimmed = declaration.trim();
    if (!trimmed) {
      continue;
    }
    const separator = trimmed.indexOf(":");
    if (separator < 1) {
      throw new Error(`malformed SVG style declaration: ${trimmed}`);
    }
    const name = trimmed.slice(0, separator).trim().toLowerCase();
    const value = trimmed.slice(separator + 1).trim();
    if (name === "enable-background") {
      continue;
    }
    if (!STYLE_PROPERTIES.has(name) || !value) {
      throw new Error(`unsupported SVG style property: ${name}`);
    }
    if (
      /["'&<>]/.test(value) ||
      /(?:javascript:|data:|https?:|file:)/i.test(value)
    ) {
      throw new Error(`unsafe SVG style value for ${name}`);
    }
    attributes.push(`${name}="${value}"`);
  }
  return attributes.length ? ` ${attributes.join(" ")}` : "";
}

export function normalizeStaticSvg(input) {
  let svg = input.replace(/^\uFEFF/, "");
  svg = svg.replace(
    /\sstyle=("([^"]*)"|'([^']*)')/gi,
    (_match, _quoted, double, single) =>
      styleToAttributes(double ?? single ?? ""),
  );
  const lower = svg.toLowerCase();
  if (!/<svg(?:\s|\/?>)/i.test(svg)) {
    throw new Error("SVG root is missing");
  }
  if (/<!doctype/i.test(svg) || /<\?xml-stylesheet/i.test(svg)) {
    throw new Error("external XML declarations are not allowed");
  }
  for (const element of FORBIDDEN_ELEMENTS) {
    if (new RegExp(`<\\s*${element}(?:\\s|/?>)`, "i").test(svg)) {
      throw new Error(`element <${element}> is not allowed`);
    }
  }
  if (/\son[a-z0-9_-]+\s*=/i.test(svg)) {
    throw new Error("SVG event handler attributes are not allowed");
  }
  if (/\s(?:href|xlink:href|src)\s*=\s*["'](?!\s*#)[^"']+["']/i.test(svg)) {
    throw new Error("external SVG references are not allowed");
  }
  for (const match of lower.matchAll(/url\(([^)]*)\)/g)) {
    const target = match[1].trim().replace(/^['"]|['"]$/g, "");
    if (!target.startsWith("#")) {
      throw new Error("external url() reference is not allowed");
    }
  }
  if (Buffer.byteLength(svg) > 256 * 1024) {
    throw new Error("SVG exceeds the 256 KiB pack limit");
  }
  return svg;
}

function addIndexEntry(index, hexcode, svgPath) {
  const canonical = normalizeHexcode(hexcode);
  for (const key of [canonical, withoutVariationSelector(canonical)]) {
    if (key && !index.has(key)) {
      index.set(key, svgPath);
    }
  }
}

export function buildSourceIndex(rendererId, sourceRoot) {
  const index = new Map();
  if (rendererId === "fluent") {
    for (const metadataPath of filesBelow(
      sourceRoot,
      (file) => path.basename(file) === "metadata.json",
    )) {
      const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
      const colorDirectory = path.join(path.dirname(metadataPath), "Color");
      if (!existsSync(colorDirectory)) {
        continue;
      }
      const svg = readdirSync(colorDirectory)
        .filter((name) => name.toLowerCase().endsWith(".svg"))
        .sort()[0];
      if (svg && typeof metadata.unicode === "string") {
        addIndexEntry(index, metadata.unicode, path.join(colorDirectory, svg));
      }
    }
    return index;
  }
  const sourceDirectory =
    rendererId === "noto"
      ? path.join(sourceRoot, "svg")
      : path.join(sourceRoot, "color", "svg");
  for (const svgPath of filesBelow(sourceDirectory, (file) =>
    file.toLowerCase().endsWith(".svg"),
  )) {
    addIndexEntry(index, path.basename(svgPath), svgPath);
  }
  return index;
}

function rawEd25519PublicKey(privateKey) {
  const der = createPublicKey(privateKey).export({
    type: "spki",
    format: "der",
  });
  if (der.length < 32) {
    throw new Error(
      "renderer signing key did not produce an Ed25519 public key",
    );
  }
  return Buffer.from(der).subarray(-32);
}

export function preparePack({
  rendererId,
  sourceRoot,
  outputRoot,
  catalog,
  config,
  privateKeyPem,
  passphrase,
}) {
  const source = config.sources[rendererId];
  if (!source) {
    throw new Error(`unsupported renderer: ${rendererId}`);
  }
  const privateKey = createPrivateKey({
    key: privateKeyPem,
    format: "pem",
    passphrase,
  });
  if (privateKey.asymmetricKeyType !== "ed25519") {
    throw new Error("renderer private key must be Ed25519 PKCS#8 PEM");
  }
  const expectedPublicKey = process.env.EMOSHELF_RENDERER_PUBLIC_KEY_BASE64;
  if (expectedPublicKey) {
    const expected = Buffer.from(expectedPublicKey, "base64");
    const actual = rawEd25519PublicKey(privateKey);
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new Error("renderer private/public key pair does not match");
    }
  }
  const sourceIndex = buildSourceIndex(rendererId, sourceRoot);
  const emojiRoot = path.join(outputRoot, "emoji");
  mkdirSync(emojiRoot, { recursive: true });
  const assets = [];
  const desired = [
    ...new Set(catalog.map((entry) => normalizeHexcode(entry.hexcode))),
  ].sort();
  for (const hexcode of desired) {
    const sourcePath =
      sourceIndex.get(hexcode) ??
      sourceIndex.get(withoutVariationSelector(hexcode));
    if (!sourcePath) {
      continue;
    }
    const normalizedSvg = normalizeStaticSvg(readFileSync(sourcePath, "utf8"));
    const bytes = Buffer.from(normalizedSvg, "utf8");
    const relativePath = `emoji/${hexcode}.svg`;
    writeFileSync(path.join(outputRoot, relativePath), bytes);
    assets.push({
      hexcode,
      path: relativePath,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      byteLength: bytes.length,
    });
  }
  if (assets.length < source.minimumCoverage || assets.length > 2048) {
    throw new Error(
      `${rendererId} coverage ${assets.length} is outside ${source.minimumCoverage}..2048`,
    );
  }
  const manifest = {
    format: "emoshelf-renderer",
    formatVersion: 1,
    rendererId,
    version: config.packVersion,
    displayName: source.displayName,
    attribution: `${source.attribution} Source: ${source.repository}/tree/${source.commit}`,
    licenseName: source.licenseName,
    licensePath: "LICENSE.txt",
    keyId: config.keyId,
    minAppVersion: config.minAppVersion,
    maxAppVersionExclusive: config.maxAppVersionExclusive,
    assets,
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest), "utf8");
  const signature = sign(null, manifestBytes, privateKey);
  if (signature.length !== 64) {
    throw new Error("renderer signature must contain exactly 64 bytes");
  }
  if (!verify(null, manifestBytes, createPublicKey(privateKey), signature)) {
    throw new Error("renderer signature self-verification failed");
  }
  writeFileSync(path.join(outputRoot, "manifest.json"), manifestBytes);
  writeFileSync(path.join(outputRoot, "signature.ed25519"), signature);
  writeFileSync(
    path.join(outputRoot, "LICENSE.txt"),
    readFileSync(path.join(sourceRoot, source.licensePath)),
  );
  return {
    rendererId,
    assetCount: assets.length,
    publicKeyBase64: rawEd25519PublicKey(privateKey).toString("base64"),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rendererId = required(args, "renderer");
  const sourceRoot = path.resolve(required(args, "source"));
  const outputRoot = path.resolve(required(args, "output"));
  const config = JSON.parse(readFileSync(required(args, "config"), "utf8"));
  const catalog = JSON.parse(readFileSync(required(args, "catalog"), "utf8"));
  const privateKeyPem = process.env.EMOSHELF_RENDERER_PRIVATE_KEY;
  if (!privateKeyPem) {
    throw new Error("EMOSHELF_RENDERER_PRIVATE_KEY is required");
  }
  if (!statSync(sourceRoot).isDirectory()) {
    throw new Error("renderer source must be a directory");
  }
  mkdirSync(outputRoot, { recursive: true });
  const result = preparePack({
    rendererId,
    sourceRoot,
    outputRoot,
    catalog,
    config,
    privateKeyPem,
    passphrase: process.env.EMOSHELF_RENDERER_PRIVATE_KEY_PASSWORD,
  });
  console.log(JSON.stringify(result));
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
