import { describe, expect, it, vi } from "vitest";
import { AutophoneError, TextInputRequestSchema } from "../contracts/index.js";
import { ADB_KEYBOARD_IME_ID, clipboardGet, clipboardSet, textClear, textInput } from "./runtime.js";
import { imeDriverResult, makeDriver, snapshot } from "./runtime-test-utils.test-support.js";

function focusedSnapshot(hash: string, text: string) {
  const snap = snapshot(hash, text);
  snap.elements.forEach((element) => {
    element.focused = true;
    element.class_name = "android.widget.EditText";
  });
  return snap;
}

function makeAdbKeyboardDriver(snapshots: ReturnType<typeof snapshot>[]) {
  const adbKeyboardTextInput = vi.fn(async (request: { text: string }) => ({
    serial: "emulator-5554",
    exitCode: 0,
    durationMs: 1,
    encodedLength: Buffer.from(request.text, "utf8").toString("base64").length
  }));
  return Object.assign(makeDriver(snapshots), { adbKeyboardTextInput });
}

describe("runtime v0.3 flows", () => {
  it("accepts Unicode punctuation for the explicit adb_keyboard route", () => {
    expect(
      TextInputRequestSchema.safeParse({
        text: "手机办公 Agent 42% 路径\\测试🙂",
        via: "adb_keyboard",
        verify: "field_text",
        timeout_ms: 1_000
      }).success
    ).toBe(true);
  });

  it("returns clipboard metadata without raw clipboard text", async () => {
    const result = await clipboardGet(makeDriver([]), { timeout_ms: 1_000 });

    expect(result).toMatchObject({
      device_serial: "emulator-5554",
      present: true,
      length: 5,
      charset: "utf8",
      preview_redacted: "<redacted>"
    });
    expect(JSON.stringify(result)).not.toContain("hello");
    expect(result.sha256).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("sets clipboard text as metadata-only result", async () => {
    const driver = makeDriver([]);
    const result = await clipboardSet(driver, { text: "hello-你好", timeout_ms: 1_000 });

    expect(driver.setClipboard).toHaveBeenCalledWith({
      deviceSerial: undefined,
      text: "hello-你好",
      timeoutMs: 1_000
    });
    expect(JSON.stringify(result)).not.toContain("hello-你好");
    expect(result).toMatchObject({ charset: "utf8", codepoint_length: 8, bytes: 12 });
  });

  it("uses clipboard paste for Unicode text input", async () => {
    const driver = makeDriver([]);
    const result = await textInput(driver, {
      text: "你好",
      via: "clipboard",
      verify: "none",
      timeout_ms: 1_000
    });

    expect(driver.setClipboard).toHaveBeenCalledWith({
      deviceSerial: undefined,
      text: "你好",
      timeoutMs: 1_000
    });
    expect(driver.keyEvent).toHaveBeenCalledWith("KEYCODE_PASTE", { deviceSerial: undefined, timeoutMs: 1_000 });
    expect(result).toMatchObject({
      charset: "clipboard_utf8",
      via: "clipboard",
      text_length: 2,
      codepoint_length: 2,
      encoded_length: 6,
      verify: { ok: true, reason: "clipboard paste dispatched; inserted field content is not independently verified" }
    });
  });

  it("commits mixed Unicode through ADBKeyboard and verifies exact focused-field text", async () => {
    const text = "手机办公 Agent 42% 路径\\测试🙂";
    const driver = makeAdbKeyboardDriver([focusedSnapshot("before", ""), focusedSnapshot("after", text)]);
    const imeState = imeDriverResult();
    imeState.ime.current_id = ADB_KEYBOARD_IME_ID;
    imeState.ime.default_id = ADB_KEYBOARD_IME_ID;
    driver.getDeviceImeState.mockResolvedValue(imeState);

    const result = await textInput(driver, {
      text,
      via: "adb_keyboard",
      verify: "field_text",
      timeout_ms: 1_000
    });

    expect(driver.adbKeyboardTextInput).toHaveBeenCalledWith({
      text,
      deviceSerial: "emulator-5554",
      timeoutMs: 1_000
    });
    expect(driver.observe).toHaveBeenNthCalledWith(1, {
      deviceSerial: "emulator-5554",
      timeoutMs: 1_000
    });
    expect(driver.observe).toHaveBeenNthCalledWith(2, {
      deviceSerial: "emulator-5554",
      timeoutMs: 1_000
    });
    expect(driver.textInput).not.toHaveBeenCalled();
    expect(driver.setClipboard).not.toHaveBeenCalled();
    expect(driver.keyEvent).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      charset: "adb_keyboard_utf8",
      via: "adb_keyboard",
      codepoint_length: Array.from(text).length,
      encoded_length: Buffer.from(text, "utf8").toString("base64").length,
      verify: { policy: "field_text", ok: true, attempts: 1 }
    });
  });

  it("refuses adb_keyboard input before dispatch when ADBKeyboard is not current", async () => {
    const text = "不可泄露的中文探针";
    const driver = makeAdbKeyboardDriver([]);

    const failure = await textInput(driver, {
      text,
      via: "adb_keyboard",
      verify: "none",
      timeout_ms: 1_000
    }).then(
      () => null,
      (error: unknown) => error as AutophoneError
    );

    expect(failure).toMatchObject({
      code: "DEVICE_IME_FAILED",
      details: {
        required_current_id: ADB_KEYBOARD_IME_ID,
        current_id: "com.example.ime/.ImeService",
        adb_keyboard_enabled: true
      }
    });
    expect(JSON.stringify(failure)).not.toContain(text);
    expect(driver.adbKeyboardTextInput).not.toHaveBeenCalled();
    expect(driver.observe).not.toHaveBeenCalled();
  });

  it("does not dispatch paste when clipboard write is rejected as unsupported", async () => {
    const driver = makeDriver([]);
    driver.setClipboard.mockRejectedValue(
      new AutophoneError({
        code: "CLIPBOARD_UNSUPPORTED",
        message: "adb clipboard set is unsupported on this device",
        retriable: false
      })
    );

    await expect(
      textInput(driver, { text: "你好", via: "clipboard", verify: "none", timeout_ms: 1_000 })
    ).rejects.toMatchObject({ code: "CLIPBOARD_UNSUPPORTED" });
    expect(driver.keyEvent).not.toHaveBeenCalled();
  });

  it("verifies clipboard input against the focused field content with field_text", async () => {
    const driver = makeDriver([focusedSnapshot("before", ""), focusedSnapshot("after", "你好")]);

    const result = await textInput(driver, {
      text: "你好",
      via: "clipboard",
      verify: "field_text",
      timeout_ms: 1_000
    });

    expect(driver.keyEvent).toHaveBeenCalledWith("KEYCODE_PASTE", { deviceSerial: undefined, timeoutMs: 1_000 });
    expect(result.verify).toMatchObject({
      policy: "field_text",
      ok: true,
      attempts: 1,
      reason: "focused field text equals the expected text"
    });
  });

  it("accepts app-decorated fields where the baseline prefix is retained", async () => {
    // 某些 app 的空搜索框自带语义前缀，输入后前缀保留在实际输入之前
    const driver = makeDriver([focusedSnapshot("before", "srch"), focusedSnapshot("after", "srch你好")]);

    const result = await textInput(driver, {
      text: "你好",
      via: "clipboard",
      verify: "field_text",
      timeout_ms: 1_000
    });

    expect(result.verify).toMatchObject({
      policy: "field_text",
      ok: true,
      attempts: 1,
      reason: "focused field text equals its pre-input baseline plus the expected text (app-decorated or appended field)"
    });
  });

  it("fails field_text verification without leaking the actual field content", async () => {
    const snapshots = [
      focusedSnapshot("before", ""),
      ...["s1", "s2", "s3"].map((hash) => focusedSnapshot(hash, "old-clipboard-secret"))
    ];
    const driver = makeDriver(snapshots);

    const failure = await textInput(driver, {
      text: "你好",
      via: "clipboard",
      verify: "field_text",
      timeout_ms: 1_000
    }).then(
      () => null,
      (error: unknown) => error as AutophoneError
    );

    expect(failure).toBeInstanceOf(AutophoneError);
    expect(failure?.code).toBe("VERIFY_FAILED");
    expect(failure?.details).toMatchObject({
      policy: "field_text",
      focused_element_observed: true,
      expected_codepoint_length: 2,
      baseline_codepoint_length: 0,
      actual_codepoint_length: 20
    });
    const serialized = JSON.stringify(failure?.details);
    expect(serialized).not.toContain("old-clipboard-secret");
    expect(serialized).not.toContain("sha256");
  });

  it("fails field_text verification when no focused element is observed", async () => {
    const snapshots = ["b0", "n1", "n2", "n3"].map((hash) => snapshot(hash, "你好"));
    const driver = makeDriver(snapshots);

    await expect(
      textInput(driver, { text: "你好", via: "clipboard", verify: "field_text", timeout_ms: 1_000 })
    ).rejects.toMatchObject({
      code: "VERIFY_FAILED",
      details: { policy: "field_text", focused_element_observed: false, actual_codepoint_length: null, baseline_codepoint_length: null }
    });
  });

  it("verifies clear emptiness with field_text when the focused field text becomes empty", async () => {
    const driver = makeDriver([focusedSnapshot("before", "pinyin"), focusedSnapshot("after", "")]);

    const result = await textClear(driver, { max_chars: 64, verify: "field_text", timeout_ms: 1_000 });

    expect(result.verify).toMatchObject({
      policy: "field_text",
      ok: true,
      attempts: 1,
      reason: "focused field accessibility text is empty after clear"
    });
  });

  it("fails clear verification when emptiness cannot be proven, flagging possible hint text", async () => {
    // 装饰字段场景：清空后可访问文本回到 4 字符语义前缀。空值证明失败必须是命令失败
    // （全局不变量），细节用 possible_app_hint_text 说明非空文本未必是残留输入。
    const snapshots = [
      focusedSnapshot("before", "srch你好"),
      ...["c1", "c2", "c3"].map((hash) => focusedSnapshot(hash, "srch"))
    ];
    const driver = makeDriver(snapshots);

    const failure = await textClear(driver, { max_chars: 64, verify: "field_text", timeout_ms: 1_000 }).then(
      () => null,
      (error: unknown) => error as AutophoneError
    );

    expect(failure).toBeInstanceOf(AutophoneError);
    expect(failure?.code).toBe("VERIFY_FAILED");
    expect(failure?.details).toMatchObject({
      policy: "field_text",
      possible_app_hint_text: true,
      baseline_codepoint_length: 6,
      final_codepoint_length: 4,
      focused_element_observed: true
    });
    const serialized = JSON.stringify(failure?.details);
    expect(serialized).not.toContain("srch");
    expect(serialized).not.toContain("sha256");
  });
});
