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
const installed = Boolean(process.env.EMOSHELF_E2E_BINARY);

export const config = {
  ...(installed
    ? {
        hostname: "127.0.0.1",
        port: Number(process.env.EMOSHELF_E2E_PORT),
        path: "/",
      }
    : {}),
  specs: ["./specs/**/*.e2e.mjs"],
  maxInstances: 1,
  services: installed
    ? []
    : [
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
      browserName: installed ? "wry" : "tauri",
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
};
