import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const repositoryRoot = path.resolve(appRoot, "..");
const failures = [];
const privateKeyHeaders = [
  ["-----BEGIN", "PRIVATE KEY-----"].join(" "),
  ["-----BEGIN", "ENCRYPTED PRIVATE KEY-----"].join(" "),
].map((value) => Buffer.from(value));

function fail(message) {
  failures.push(message);
}

function text(relative) {
  return readFileSync(path.join(repositoryRoot, relative), "utf8");
}

function requireFile(relative) {
  if (!existsSync(path.join(repositoryRoot, relative))) {
    fail(`required release file is missing: ${relative}`);
  }
}

for (const file of [
  "README.md",
  "PRIVACY.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CODE_SIGNING_POLICY.md",
  "RELEASE_NOTES.md",
  "THIRD_PARTY_NOTICES.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/release.yml",
  ".signpath/policies/emoshelf/release-signing.yml",
  "images/brand/emoshelf-icon-master.png",
  "images/screenshots/emoshelf-v1-shelf.png",
]) {
  requireFile(file);
}

const packageJson = JSON.parse(text("app/package.json"));
const tauriConfig = JSON.parse(text("app/src-tauri/tauri.conf.json"));
const cargoVersion = text("app/src-tauri/Cargo.toml").match(
  /^version = "([^"]+)"/m,
)?.[1];
for (const [name, version] of [
  ["package.json", packageJson.version],
  ["tauri.conf.json", tauriConfig.version],
  ["Cargo.toml", cargoVersion],
]) {
  if (version !== "1.0.0") {
    fail(`${name} must declare version 1.0.0`);
  }
}
if (tauriConfig.bundle?.publisher !== "ELRdn + Contributors") {
  fail("Tauri publisher must be ELRdn + Contributors");
}

const indexHtml = text("app/index.html");
if (
  /vite\.svg|tauri\.svg/i.test(indexHtml) ||
  !/favicon\.png/.test(indexHtml)
) {
  fail(
    "index.html still uses template branding or lacks the production favicon",
  );
}
const readme = text("README.md");
if (/Planning \/ pre-alpha|will be added once/i.test(readme)) {
  fail("README still contains pre-alpha placeholders");
}
if (
  !text("CODE_SIGNING_POLICY.md").includes(
    "Free code signing provided by SignPath.io, certificate by SignPath Foundation",
  )
) {
  fail(
    "CODE_SIGNING_POLICY.md is missing the required SignPath Foundation attribution",
  );
}

const ci = text(".github/workflows/ci.yml");
if (!ci.includes("windows-11-arm") || !ci.includes("pnpm test:e2e")) {
  fail(
    "CI must exercise native ARM64 packaging and real Tauri WebDriverIO E2E",
  );
}
const releaseWorkflow = text(".github/workflows/release.yml");
for (const marker of [
  "signpath/github-action-submit-signing-request@v2",
  "gitleaks/gitleaks-action@v2",
  "Get-AuthenticodeSignature",
  "Require successful CI for the exact release commit",
  "Embed the target installer type before Authenticode signing",
  "Tauri mutated the Authenticode-signed application executable",
  "cargo install rsign2 --locked --version 0.6.6",
  "release:latest-json",
  "EMOSHELF_UPDATER_PRIVATE_KEY",
  "EMOSHELF_RENDERER_PRIVATE_KEY",
]) {
  if (!releaseWorkflow.includes(marker)) {
    fail(`release workflow is missing required gate: ${marker}`);
  }
}

const sourceConfig = JSON.parse(text("app/renderer-sources.json"));
const rendererSources = sourceConfig.sources ?? {};
for (const renderer of ["fluent", "noto", "openmoji"]) {
  if (!rendererSources[renderer]) {
    fail(`renderer source is missing: ${renderer}`);
  }
}
if (Object.keys(rendererSources).length !== 3) {
  fail("renderer source set must contain exactly Fluent, Noto, and OpenMoji");
}
for (const [renderer, source] of Object.entries(rendererSources)) {
  if (!/^[0-9a-f]{40}$/.test(source.commit ?? "")) {
    fail(`${renderer} renderer source must be pinned to a full Git commit`);
  }
}

const tracked = execFileSync("git", ["ls-files", "-z"], {
  cwd: repositoryRoot,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
for (const file of tracked) {
  const normalized = file.replaceAll("\\", "/");
  if (/(^|\/)(node_modules|\.pnpm-store|dist|target)(\/|$)/.test(normalized)) {
    fail(`generated dependency/build output is tracked: ${file}`);
  }
  if (/\.(?:pfx|p12|key|pem)$/i.test(file) && !/public/i.test(file)) {
    fail(`private key-like file is tracked: ${file}`);
  }
  const absolute = path.join(repositoryRoot, file);
  // `git ls-files` keeps unstaged deletions in the index. They cannot contain
  // secrets in the release candidate and should not make a pre-stage audit fail.
  if (!existsSync(absolute)) {
    continue;
  }
  try {
    const bytes = readFileSync(absolute);
    if (privateKeyHeaders.some((header) => bytes.includes(header))) {
      fail(`private key material is tracked: ${file}`);
    }
  } catch {
    fail(`tracked file cannot be audited: ${file}`);
  }
}

if (failures.length) {
  console.error("EmoShelf release audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `EmoShelf release audit passed (${tracked.length} tracked files checked).`,
  );
}
