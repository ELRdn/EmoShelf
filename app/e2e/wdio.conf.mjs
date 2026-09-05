import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const isWindows = process.platform === "win32";
const binaryName = isWindows ? "emoshelf.exe" : "emoshelf";
const profile =
  process.env.EMOSHELF_E2E_PROFILE === "debug" ? "debug" : "release";
const application =
  process.env.EMOSHELF_E2E_BINARY ??
  path.join(appRoot, "src-tauri", "target", profile, binaryName);
function failIfCommandFailed(result, label) {
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

export const config = {
  specs: ["./specs/**/*.e2e.mjs"],
  maxInstances: 1,
  services: [
    [
      "@wdio/tauri-service",
      {
        appBinaryPath: application,
        driverProvider: "embedded",
        embeddedPort: 4445,
        startTimeout: 120_000,
        statusPollTimeout: 10_000,
      },
    ],
  ],
  capabilities: [
    {
      browserName: "tauri",
      maxInstances: 1,
      "tauri:options": { application },
    },
  ],
  logLevel: "info",
  reporters: ["spec"],
  framework: "mocha",
  mochaOpts: { ui: "bdd", timeout: 60_000 },
  waitforTimeout: 15_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 2,
  onPrepare() {
    if (process.env.EMOSHELF_E2E_SKIP_BUILD === "1") {
      return;
    }
    const result = spawnSync(
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
        cwd: appRoot,
        env: {
          ...process.env,
          NODE_ENV: "production",
          VITE_EMOSHELF_E2E: "1",
        },
        shell: true,
        stdio: "inherit",
      },
    );
    failIfCommandFailed(result, "Tauri E2E build");
  },
};
