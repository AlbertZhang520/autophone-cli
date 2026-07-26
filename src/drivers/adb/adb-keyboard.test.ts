import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AutophoneError } from "../../contracts/index.js";
import { AdbDriver } from "./adb-driver.js";
import { createFakeAdb, shellQuote } from "./adb-driver-test-utils.test-support.js";

describe("ADBKeyboard Unicode transport", () => {
  it("sends a package-scoped Base64 broadcast", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-keyboard-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
printf 'Broadcast completed: result=0\\n'
exit 0
`);
    const driver = new AdbDriver({ adbPath });
    const text = "中文 Agent🙂";
    const payload = Buffer.from(text, "utf8").toString("base64");

    await expect(driver.adbKeyboardTextInput({ text, timeoutMs: 5000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      exitCode: 0,
      encodedLength: payload.length
    });
    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      `-s emulator-5554 shell am broadcast -a ADB_INPUT_B64 -p com.android.adbkeyboard --es msg ${payload}`
    );
  });

  it("redacts raw and Base64 payloads when the broadcast fails", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf 'error: %s\\n' "$*" >&2
exit 1
`);
    const driver = new AdbDriver({ adbPath });
    const text = "不可泄露的中文探针";
    const payload = Buffer.from(text, "utf8").toString("base64");

    const failure = await driver.adbKeyboardTextInput({ text, timeoutMs: 5000 }).then(
      () => null,
      (error: unknown) => error as AutophoneError
    );
    const serialized = JSON.stringify(failure);

    expect(failure).toMatchObject({ code: "DEVICE_IME_FAILED" });
    expect(serialized).not.toContain(text);
    expect(serialized).not.toContain(payload);
    expect(serialized).toContain("<redacted-base64>");
  });

  it("preserves target-device failure classification", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf 'error: device offline\\n' >&2
exit 1
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.adbKeyboardTextInput({ text: "中文", timeoutMs: 5000 })
    ).rejects.toMatchObject({ code: "DEVICE_OFFLINE", retriable: true });
  });

  it("rejects unexpected stderr even when am reports result zero", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf 'Broadcast completed: result=0\\n'
printf 'receiver unavailable\\n' >&2
exit 0
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.adbKeyboardTextInput({ text: "中文", timeoutMs: 5000 })
    ).rejects.toMatchObject({ code: "DEVICE_IME_FAILED", retriable: false });
  });
});
