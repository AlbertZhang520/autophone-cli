import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AdbDriver } from "./adb-driver.js";
import { createFakeAdb } from "./adb-driver-test-utils.test-support.js";

describe("ADB clipboard behavior", () => {
  it("quotes clipboard text before passing it through adb shell", async () => {
    const callsPath = join(await mkdtemp(join(tmpdir(), "autophone-clipboard-adb-")), "calls.jsonl");
    const adbPath = await createFakeAdb(`#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
const callsPath = ${JSON.stringify(callsPath)};
const args = process.argv.slice(2);
appendFileSync(callsPath, JSON.stringify(args) + "\\n");
if (args[0] === "devices") {
  process.stdout.write("List of devices attached\\nemulator-5554\\tdevice\\n");
  process.exit(0);
}
if (args[0] === "-s" && args[1] === "emulator-5554" && args[2] === "shell") {
  process.exit(0);
}
process.exit(9);
`);
    const driver = new AdbDriver({ adbPath });
    const text = "hello world; echo 'owned'";

    await driver.setClipboard({ text, timeoutMs: 5_000 });

    const calls = (await readFile(callsPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(calls[1]).toEqual([
      "-s",
      "emulator-5554",
      "shell",
      "cmd",
      "clipboard",
      "set",
      "text",
      "'hello world; echo '\\''owned'\\'''"
    ]);
  });

  it("rejects clipboard set when the device reports no shell command implementation despite exit code 0", async () => {
    const adbPath = await createFakeAdb(`#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "devices") {
  process.stdout.write("List of devices attached\\nemulator-5554\\tdevice\\n");
  process.exit(0);
}
if (args[0] === "-s" && args[1] === "emulator-5554" && args[2] === "shell") {
  process.stderr.write("No shell command implementation.\\n");
  process.exit(0);
}
process.exit(9);
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.setClipboard({ text: "你好", timeoutMs: 5_000 })).rejects.toMatchObject({
      code: "CLIPBOARD_UNSUPPORTED"
    });
  });

  it("rejects clipboard get when the device reports no shell command implementation despite exit code 0", async () => {
    const adbPath = await createFakeAdb(`#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "devices") {
  process.stdout.write("List of devices attached\\nemulator-5554\\tdevice\\n");
  process.exit(0);
}
if (args[0] === "-s" && args[1] === "emulator-5554" && args[2] === "shell" && args.at(-1) === "get") {
  process.stdout.write("No shell command implementation.\\n");
  process.exit(0);
}
process.exit(9);
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getClipboard({ timeoutMs: 5_000 })).rejects.toMatchObject({
      code: "CLIPBOARD_UNSUPPORTED"
    });
  });

  it("treats successful clipboard get stdout as clipboard text even when it resembles an error", async () => {
    const adbPath = await createFakeAdb(`#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "devices") {
  process.stdout.write("List of devices attached\\nemulator-5554\\tdevice\\n");
  process.exit(0);
}
if (args[0] === "-s" && args[1] === "emulator-5554" && args[2] === "shell" && args.at(-1) === "get") {
  process.stdout.write("password not found\\n");
  process.exit(0);
}
process.exit(9);
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getClipboard({ timeoutMs: 5_000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      present: true,
      text: "password not found"
    });
  });
});
