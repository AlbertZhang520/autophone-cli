import { describe, expect, it, vi } from "vitest";
import { runCli } from "./main.js";
import { imeDriverResult, makeDriver, makeIo } from "./main-test-utils.test-support.js";

describe("CLI ADBKeyboard Unicode input", () => {
  it("writes metadata-only JSON without using clipboard or echoing text", async () => {
    const adbKeyboardTextInput = vi.fn(async (request: { text: string }) => ({
      serial: "emulator-5554",
      exitCode: 0,
      durationMs: 1,
      encodedLength: Buffer.from(request.text, "utf8").toString("base64").length
    }));
    const driver = Object.assign(makeDriver([]), { adbKeyboardTextInput });
    const imeState = imeDriverResult();
    imeState.ime.current_id = "com.android.adbkeyboard/.AdbIME";
    imeState.ime.default_id = "com.android.adbkeyboard/.AdbIME";
    driver.getDeviceImeState.mockResolvedValue(imeState);
    const text = "手机办公 Agent 42%🙂";
    const payload = Buffer.from(text, "utf8").toString("base64");
    const io = makeIo();

    const exitCode = await runCli(["text", "input", "--text", text, "--via", "adb_keyboard"], {
      io,
      requestIdFactory: () => "req-text-adb-keyboard",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(adbKeyboardTextInput).toHaveBeenCalledWith({
      text,
      deviceSerial: "emulator-5554",
      timeoutMs: 10000
    });
    expect(driver.textInput).not.toHaveBeenCalled();
    expect(driver.setClipboard).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(text);
    expect(io.stdoutText()).not.toContain(payload);
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "text.input",
      result: {
        charset: "adb_keyboard_utf8",
        via: "adb_keyboard",
        encoded_length: payload.length,
        verify: { policy: "none", ok: true }
      },
      warnings: [
        "adb_keyboard dispatch does not confirm inserted field content; use --verify field_text for exact verification"
      ],
      trace: { text_length: text.length, via: "adb_keyboard" }
    });
  });

  it("rejects malformed Unicode before IME inspection or dispatch", async () => {
    const adbKeyboardTextInput = vi.fn();
    const driver = Object.assign(makeDriver([]), { adbKeyboardTextInput });
    const text = "private\u0085probe";
    const io = makeIo();

    const exitCode = await runCli(["text", "input", "--text", text, "--via", "adb_keyboard"], {
      io,
      requestIdFactory: () => "req-text-adb-keyboard-control",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.getDeviceImeState).not.toHaveBeenCalled();
    expect(adbKeyboardTextInput).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(text);
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: false,
      command: "text.input",
      error: { code: "INVALID_REQUEST" },
      trace: { argv: ["text", "input", "--text", "<redacted>", "--via", "adb_keyboard"] }
    });
  });
});
