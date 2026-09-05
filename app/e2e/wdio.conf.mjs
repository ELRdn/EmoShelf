import { spawn, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const isWindows = process.platform === "win32";
const binaryName = isWindows ? "emoshelf.exe" : "emoshelf";
const profile =
  process.env.EMOSHELF_E2E_PROFILE === "release" ? "release" : "debug";
const application =
  process.env.EMOSHELF_E2E_BINARY ??
  path.join(appRoot, "src-tauri", "target", profile, binaryName);
const driverName = isWindows ? "tauri-driver.exe" : "tauri-driver";
const driver =
  process.env.TAURI_DRIVER_BINARY ??
  path.join(os.homedir(), ".cargo", "bin", driverName);

let tauriDriver;
let shuttingDown = false;

function stopDriver() {
  shuttingDown = true;
  tauriDriver?.kill();
  tauriDriver = undefined;
}

function failIfCommandFailed(result, label) {
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

export const config = {
  hostname: "127.0.0.1",
  port: 4444,
  specs: ["./specs/**/*.e2e.mjs"],
  maxInstances: 1,
  capabilities: [
    {
      browserName: "wry",
      maxInstances: 1,
      "wdio:enforceWebDriverClassic": true,
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
        "--debug",
        "--no-bundle",
        "--ci",
        "--config",
        "src-tauri/tauri.e2e.conf.json",
      ],
      { cwd: appRoot, shell: true, stdio: "inherit" },
    );
    failIfCommandFailed(result, "Tauri E2E build");
  },
  beforeSession() {
    shuttingDown = false;
    tauriDriver = spawn(driver, [], {
      cwd: appRoot,
      stdio: ["ignore", "inherit", "inherit"],
    });
    tauriDriver.on("error", (error) => {
      console.error("tauri-driver failed:", error);
      process.exitCode = 1;
    });
    tauriDriver.on("exit", (code) => {
      if (!shuttingDown && code !== 0) {
        console.error(`tauri-driver exited unexpectedly with code ${code}`);
        process.exitCode = 1;
      }
    });
  },
  afterSession() {
    stopDriver();
  },
};

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
  process.on(signal, () => {
    stopDriver();
    process.exit(1);
  });
}
