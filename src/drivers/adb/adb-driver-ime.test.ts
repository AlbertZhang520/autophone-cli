import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AdbDriver } from "./adb-driver.js";
import { createFakeAdb } from "./adb-driver-test-utils.test-support.js";

describe("ADB ime behavior", () => {
  it("quotes the ime id and accepts a successful selection message", async () => {
    const callsPath = join(await mkdtemp(join(tmpdir(), "autophone-ime-adb-")), "calls.jsonl");
    const adbPath = await createFakeAdb(`#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
const callsPath = ${JSON.stringify(callsPath)};
const args = process.argv.slice(2);
appendFileSync(callsPath, JSON.stringify(args) + "\\n");
if (args[0] === "devices") {
  process.stdout.write("List of devices attached\\nemulator-5554\\tdevice\\n");
  process.exit(0);
}
if (args[0] === "-s" && args[1] === "emulator-5554" && args[2] === "shell" && args[3] === "ime") {
  process.stdout.write("Input method com.android.adbkeyboard/.AdbIME selected for user #0\\n");
  process.exit(0);
}
process.exit(9);
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.setInputMethod({ imeId: "com.android.adbkeyboard/.AdbIME", timeoutMs: 5_000 })
    ).resolves.toMatchObject({ serial: "emulator-5554", exitCode: 0 });

    const calls = (await readFile(callsPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(calls[1]).toEqual([
      "-s",
      "emulator-5554",
      "shell",
      "ime",
      "set",
      "'com.android.adbkeyboard/.AdbIME'"
    ]);
  });

  it("rejects ime set when the device reports an unknown id despite exit code 0", async () => {
    const adbPath = await createFakeAdb(`#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "devices") {
  process.stdout.write("List of devices attached\\nemulator-5554\\tdevice\\n");
  process.exit(0);
}
if (args[0] === "-s" && args[1] === "emulator-5554" && args[2] === "shell" && args[3] === "ime") {
  process.stdout.write("Error: Unknown id: com.fake/.Ime\\n");
  process.exit(0);
}
process.exit(9);
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.setInputMethod({ imeId: "com.fake/.Ime", timeoutMs: 5_000 })).rejects.toMatchObject({
      code: "DEVICE_IME_FAILED"
    });
  });

  it("runs ime reset without an id argument", async () => {
    const callsPath = join(await mkdtemp(join(tmpdir(), "autophone-ime-reset-adb-")), "calls.jsonl");
    const adbPath = await createFakeAdb(`#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
const callsPath = ${JSON.stringify(callsPath)};
const args = process.argv.slice(2);
appendFileSync(callsPath, JSON.stringify(args) + "\\n");
if (args[0] === "devices") {
  process.stdout.write("List of devices attached\\nemulator-5554\\tdevice\\n");
  process.exit(0);
}
if (args[0] === "-s" && args[1] === "emulator-5554" && args[2] === "shell" && args[3] === "ime") {
  process.stdout.write("Reset current and enabled IMEs for user #0\\n");
  process.exit(0);
}
process.exit(9);
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.resetInputMethod({ timeoutMs: 5_000 })).resolves.toMatchObject({ exitCode: 0 });

    const calls = (await readFile(callsPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(calls[1]).toEqual(["-s", "emulator-5554", "shell", "ime", "reset"]);
  });
});
