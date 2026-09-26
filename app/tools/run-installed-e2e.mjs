import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../", import.meta.url));

async function unusedPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

function stopOwnedProcess(child) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === "win32")
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      windowsHide: true,
      stdio: "ignore",
    });
  else child.kill("SIGTERM");
}

// Production binaries omit tauri-plugin-wdio. Use ordinary WebDriver commands,
// without the Tauri service's browser.execute patch that requires that plugin.
export async function runInstalledE2e() {
  if (!existsSync(process.env.EMOSHELF_E2E_BINARY ?? ""))
    throw new Error("Installed application binary does not exist");
  const port = await unusedPort();
  let nativePort = await unusedPort();
  while (nativePort === port) nativePort = await unusedPort();
  const driver = spawn(
    "tauri-driver",
    ["--port", String(port), "--native-port", String(nativePort)],
    { cwd: appRoot, stdio: "inherit", windowsHide: true },
  );
  let driverFailure;
  driver.once("error", (error) => {
    driverFailure = error;
  });
  driver.once("exit", (code) => {
    driverFailure = new Error(`tauri-driver exited (${code})`);
  });
  let tests;
  const interrupt = () => {
    stopOwnedProcess(tests);
    stopOwnedProcess(driver);
  };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    const deadline = Date.now() + 30_000;
    while (true) {
      if (driverFailure) throw driverFailure;
      if (Date.now() > deadline)
        throw new Error(
          "tauri-driver did not become ready; tests were not started",
        );
      const status = await fetch(`http://127.0.0.1:${port}/status`, {
        signal: AbortSignal.timeout(500),
      }).catch(() => null);
      if (status?.ok) break;
      await delay(100);
    }
    tests = spawn(
      process.execPath,
      [
        path.join(appRoot, "node_modules/@wdio/cli/bin/wdio.js"),
        "run",
        "e2e/wdio.conf.mjs",
      ],
      {
        cwd: appRoot,
        env: { ...process.env, EMOSHELF_E2E_PORT: String(port) },
        stdio: "inherit",
        windowsHide: true,
      },
    );
    return await new Promise((resolve, reject) => {
      tests.once("error", reject);
      tests.once("exit", (code) => resolve(code ?? 1));
    });
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
    interrupt();
  }
}
