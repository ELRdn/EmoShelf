import assert from "node:assert/strict";
import test from "node:test";
import { runE2e } from "./run-e2e.mjs";

test("a failed build never starts a desktop session using an old binary", () => {
  const commands = [];
  assert.throws(
    () =>
      runE2e((_command, args) => {
        commands.push(args);
        return { status: 1 };
      }, {}),
    /no tests were started/,
  );
  assert.equal(commands.length, 1);
  assert.equal(commands[0][0], "tauri");
});

test("a successful build runs desktop checks and preserves their failure status", () => {
  const commands = [];
  const code = runE2e((_command, args) => {
    commands.push(args);
    return { status: commands.length === 1 ? 0 : 2 };
  }, {});
  assert.equal(code, 2);
  assert.equal(commands.length, 2);
  assert.equal(commands[1][0], "exec");
});
