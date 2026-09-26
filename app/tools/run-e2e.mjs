import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInstalledE2e } from "./run-installed-e2e.mjs";

const appRoot = fileURLToPath(new URL("../", import.meta.url));

// WDIO logs and continues after a user onPrepare hook fails. Build before
// starting the launcher so a failed build can never test a stale executable.
export function runE2e(run = spawnSync, env = process.env) {
  const options = {
    cwd: appRoot,
    env,
    shell: process.platform === "win32",
    stdio: "inherit",
  };
  if (env.EMOSHELF_E2E_SKIP_BUILD !== "1") {
    const built = run(
      "pnpm",
      [
        "tauri",
        "build",
        "--no-bundle",
        "--ci",
        "--config",
        "src-tauri/tauri.e2e.conf.json",
        "--features",
        "wdio",
      ],
      {
        ...options,
        env: { ...env, NODE_ENV: "production", VITE_EMOSHELF_E2E: "1" },
      },
    );
    if (built.error) throw built.error;
    if (built.status !== 0)
      throw new Error(
        `Tauri E2E build failed (${built.status ?? built.signal}); no tests were started.`,
      );
  }
  const tested = run(
    "pnpm",
    ["exec", "wdio", "run", "e2e/wdio.conf.mjs"],
    options,
  );
  if (tested.error) throw tested.error;
  return tested.status ?? 1;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.exitCode = process.env.EMOSHELF_E2E_BINARY
      ? await runInstalledE2e()
      : runE2e();
  } catch (error) {
    console.error(String(error));
    process.exitCode = 1;
  }
}
