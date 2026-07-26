import {
  AutophoneError,
  type Snapshot,
  type TextInputRequest,
  type TextInputResult,
  type TextInputVia
} from "../../contracts/index.js";
import type { AndroidDriver } from "./types.js";
import { assertClipboardTextSupported, codepointLength, utf8ByteLength } from "./text-encoding.js";
import { setDriverClipboard, sha256Text } from "./clipboard.js";
import {
  TEXT_INPUT_CHARSET,
  VERIFY_MAX_ATTEMPTS,
  VERIFY_SETTLE_MS,
  encodeTextForAdbInput,
  getChangedFields,
  sleep
} from "./shared.js";

export const ADB_KEYBOARD_IME_ID = "com.android.adbkeyboard/.AdbIME" as const;

export type DriverAdbKeyboardTextInputRequest = {
  text: string;
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverAdbKeyboardTextInputResult = {
  serial: string;
  exitCode: number | null;
  durationMs: number;
  encodedLength: number;
};

type AndroidAdbKeyboardDriver = {
  adbKeyboardTextInput?: unknown;
};

export async function textInput(
  driver: AndroidDriver,
  request: Omit<TextInputRequest, "via"> & { via?: TextInputVia }
): Promise<TextInputResult> {
  if (request.via === "clipboard") {
    return textInputViaClipboard(driver, request);
  }

  if (request.via === "adb_keyboard") {
    return textInputViaAdbKeyboard(driver, request);
  }

  const encodedText = encodeTextForAdbInput(request.text);
  if (request.verify === "none") {
    await driver.textInput(encodedText, { deviceSerial: request.device_serial, timeoutMs: request.timeout_ms });
    return textInputResult(request, {
      charset: TEXT_INPUT_CHARSET,
      via: "input_text",
      encodedLength: encodedText.length,
      attempts: 0,
      reason: "verification disabled",
      changedFields: []
    });
  }

  if (request.verify === "field_text") {
    const baseline = await captureFocusedFieldText(driver, request);
    await driver.textInput(encodedText, { deviceSerial: request.device_serial, timeoutMs: request.timeout_ms });
    return verifyFieldText(driver, request, {
      charset: TEXT_INPUT_CHARSET,
      via: "input_text",
      encodedLength: encodedText.length
    }, baseline);
  }

  const before = await driver.observe({ deviceSerial: request.device_serial, timeoutMs: request.timeout_ms });
  await driver.textInput(encodedText, { deviceSerial: request.device_serial, timeoutMs: request.timeout_ms });
  let after = before;
  for (let attempt = 1; attempt <= VERIFY_MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      await sleep(VERIFY_SETTLE_MS);
    }
    after = await driver.observe({ deviceSerial: request.device_serial, timeoutMs: request.timeout_ms });
    const changedFields = getChangedFields(before, after);
    if (changedFields.length > 0) {
      return textInputResult(request, {
        charset: TEXT_INPUT_CHARSET,
        via: "input_text",
        encodedLength: encodedText.length,
        attempts: attempt,
        reason: "snapshot hash, package, or activity changed",
        changedFields
      });
    }
  }

  throw new AutophoneError({
    code: "VERIFY_FAILED",
    message: "text input completed but screen_changed verification did not observe a changed snapshot",
    retriable: false,
    details: {
      policy: request.verify,
      attempts: VERIFY_MAX_ATTEMPTS,
      before_snapshot_id: before.snapshot_id,
      after_snapshot_id: after.snapshot_id,
      ui_hash: before.ui_hash,
      text_length: request.text.length,
      encoded_length: encodedText.length,
      codepoint_length: codepointLength(request.text),
      charset: TEXT_INPUT_CHARSET
    }
  });
}

async function textInputViaAdbKeyboard(
  driver: AndroidDriver,
  request: Omit<TextInputRequest, "via"> & { via?: TextInputVia }
): Promise<TextInputResult> {
  const options = { deviceSerial: request.device_serial, timeoutMs: request.timeout_ms };
  const imeState = await driver.getDeviceImeState(options);
  if (imeState.ime.current_id !== ADB_KEYBOARD_IME_ID) {
    throw new AutophoneError({
      code: "DEVICE_IME_FAILED",
      message: "adb_keyboard text input requires ADBKeyboard to be the current input method",
      retriable: false,
      details: {
        required_current_id: ADB_KEYBOARD_IME_ID,
        current_id: imeState.ime.current_id,
        adb_keyboard_enabled: imeState.ime.enabled_ids.includes(ADB_KEYBOARD_IME_ID),
        remediation: `run device ime set --id ${ADB_KEYBOARD_IME_ID} with an explicit --serial, then retry`
      }
    });
  }

  const pinnedRequest = { ...request, device_serial: imeState.serial };
  const encodedLength = Buffer.from(request.text, "utf8").toString("base64").length;
  const dispatch = async (): Promise<void> => {
    await callAdbKeyboardTextInput(driver, {
      text: request.text,
      deviceSerial: imeState.serial,
      timeoutMs: request.timeout_ms
    });
  };

  if (request.verify === "none") {
    await dispatch();
    return textInputResult(request, {
      charset: "adb_keyboard_utf8",
      via: "adb_keyboard",
      encodedLength,
      attempts: 0,
      reason: "ADBKeyboard Unicode broadcast dispatched; inserted field content is not independently verified",
      changedFields: []
    });
  }

  if (request.verify === "field_text") {
    const baseline = await captureFocusedFieldText(driver, pinnedRequest);
    await dispatch();
    return verifyFieldText(
      driver,
      pinnedRequest,
      { charset: "adb_keyboard_utf8", via: "adb_keyboard", encodedLength },
      baseline
    );
  }

  const before = await driver.observe({ deviceSerial: imeState.serial, timeoutMs: request.timeout_ms });
  await dispatch();
  let after = before;
  for (let attempt = 1; attempt <= VERIFY_MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      await sleep(VERIFY_SETTLE_MS);
    }
    after = await driver.observe({ deviceSerial: imeState.serial, timeoutMs: request.timeout_ms });
    const changedFields = getChangedFields(before, after);
    if (changedFields.length > 0) {
      return textInputResult(request, {
        charset: "adb_keyboard_utf8",
        via: "adb_keyboard",
        encodedLength,
        attempts: attempt,
        reason: "ADBKeyboard Unicode broadcast dispatched and snapshot changed; inserted field content is not independently verified",
        changedFields
      });
    }
  }

  throw new AutophoneError({
    code: "VERIFY_FAILED",
    message: "adb_keyboard text input completed but screen_changed verification did not observe a changed snapshot",
    retriable: false,
    details: {
      policy: request.verify,
      attempts: VERIFY_MAX_ATTEMPTS,
      before_snapshot_id: before.snapshot_id,
      after_snapshot_id: after.snapshot_id,
      ui_hash: before.ui_hash,
      text_length: request.text.length,
      encoded_length: encodedLength,
      codepoint_length: codepointLength(request.text),
      charset: "adb_keyboard_utf8"
    }
  });
}

async function callAdbKeyboardTextInput(
  driver: AndroidDriver,
  request: DriverAdbKeyboardTextInputRequest
): Promise<DriverAdbKeyboardTextInputResult> {
  const candidate = (driver as AndroidAdbKeyboardDriver).adbKeyboardTextInput;
  if (typeof candidate !== "function") {
    throw new Error("driver does not implement adbKeyboardTextInput");
  }
  return (await candidate.call(driver, request)) as DriverAdbKeyboardTextInputResult;
}

async function textInputViaClipboard(
  driver: AndroidDriver,
  request: Omit<TextInputRequest, "via"> & { via?: TextInputVia }
): Promise<TextInputResult> {
  assertClipboardTextSupported(request.text);
  const encodedLength = utf8ByteLength(request.text);
  if (request.verify === "none") {
    await pasteClipboardText(driver, request);
    return textInputResult(request, {
      charset: "clipboard_utf8",
      via: "clipboard",
      encodedLength,
      attempts: 0,
      reason: "clipboard paste dispatched; inserted field content is not independently verified",
      changedFields: []
    });
  }

  if (request.verify === "field_text") {
    const baseline = await captureFocusedFieldText(driver, request);
    await pasteClipboardText(driver, request);
    return verifyFieldText(driver, request, {
      charset: "clipboard_utf8",
      via: "clipboard",
      encodedLength
    }, baseline);
  }

  const before = await driver.observe({ deviceSerial: request.device_serial, timeoutMs: request.timeout_ms });
  await pasteClipboardText(driver, request);
  let after = before;
  for (let attempt = 1; attempt <= VERIFY_MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      await sleep(VERIFY_SETTLE_MS);
    }
    after = await driver.observe({ deviceSerial: request.device_serial, timeoutMs: request.timeout_ms });
    const changedFields = getChangedFields(before, after);
    if (changedFields.length > 0) {
      return textInputResult(request, {
        charset: "clipboard_utf8",
        via: "clipboard",
        encodedLength,
        attempts: attempt,
        reason: "clipboard paste dispatched and snapshot changed; inserted field content is not independently verified",
        changedFields
      });
    }
  }

  throw new AutophoneError({
    code: "VERIFY_FAILED",
    message: "clipboard text input completed but screen_changed verification did not observe a changed snapshot",
    retriable: false,
    details: {
      policy: request.verify,
      attempts: VERIFY_MAX_ATTEMPTS,
      before_snapshot_id: before.snapshot_id,
      after_snapshot_id: after.snapshot_id,
      ui_hash: before.ui_hash,
      text_length: request.text.length,
      encoded_length: encodedLength,
      codepoint_length: codepointLength(request.text),
      charset: "clipboard_utf8",
      text_sha256: sha256Text(request.text)
    }
  });
}

async function pasteClipboardText(driver: AndroidDriver, request: Omit<TextInputRequest, "via">): Promise<void> {
  await setDriverClipboard(driver as Parameters<typeof setDriverClipboard>[0], { deviceSerial: request.device_serial, text: request.text, timeoutMs: request.timeout_ms });
  await driver.keyEvent("KEYCODE_PASTE", { deviceSerial: request.device_serial, timeoutMs: request.timeout_ms });
}

// 输入前先取一次聚焦字段的可访问文本作为基线（应用可能把语义前缀
// 组合进 accessibility 文本，空字段也可能显示 hint，基线是区分它们的唯一办法）。
async function captureFocusedFieldText(
  driver: AndroidDriver,
  request: Omit<TextInputRequest, "via">
): Promise<string | null> {
  const before = await driver.observe({ deviceSerial: request.device_serial, timeoutMs: request.timeout_ms });
  const focused = before.elements.find((element) => element.focused === true);
  return focused === undefined ? null : focused.text;
}

// 意图边界验证：聚焦字段文本必须等于期望文本（hint 被替换的常规字段），
// 或等于输入前基线 + 期望文本（保留语义前缀/追加输入的装饰字段）。
// 失败详情只带长度和摘要，不带字段原文——字段里可能是旧剪贴板等敏感内容。
async function verifyFieldText(
  driver: AndroidDriver,
  request: Omit<TextInputRequest, "via">,
  meta: { charset: TextInputResult["charset"]; via: TextInputVia; encodedLength: number },
  baseline: string | null
): Promise<TextInputResult> {
  let focusedObserved = false;
  let lastFocusedText: string | null = null;
  let after: Snapshot | null = null;
  for (let attempt = 1; attempt <= VERIFY_MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      await sleep(VERIFY_SETTLE_MS);
    }
    after = await driver.observe({ deviceSerial: request.device_serial, timeoutMs: request.timeout_ms });
    const focused = after.elements.filter((element) => element.focused === true);
    const firstFocused = focused[0];
    if (firstFocused !== undefined) {
      focusedObserved = true;
      lastFocusedText = firstFocused.text;
    }
    const exact = focused.some((element) => element.text === request.text);
    const baselinePrefixed =
      !exact && baseline !== null && baseline.length > 0 && focused.some((element) => element.text === baseline + request.text);
    if (exact || baselinePrefixed) {
      return textInputResult(request, {
        charset: meta.charset,
        via: meta.via,
        encodedLength: meta.encodedLength,
        attempts: attempt,
        reason: exact
          ? "focused field text equals the expected text"
          : "focused field text equals its pre-input baseline plus the expected text (app-decorated or appended field)",
        changedFields: []
      });
    }
  }

  throw new AutophoneError({
    code: "VERIFY_FAILED",
    message: focusedObserved
      ? "field_text verification failed: focused field content does not equal the expected text (alone or appended to its pre-input baseline)"
      : "field_text verification failed: no focused element was observed",
    retriable: false,
    details: {
      policy: "field_text",
      attempts: VERIFY_MAX_ATTEMPTS,
      focused_element_observed: focusedObserved,
      // 只报长度与匹配状态，不报字段内容的任何摘要：验证码/PIN 等低熵内容的
      // 无盐 SHA-256 可离线穷举（codex review P2 security）。
      expected_codepoint_length: codepointLength(request.text),
      baseline_codepoint_length: baseline === null ? null : codepointLength(baseline),
      actual_codepoint_length: lastFocusedText === null ? null : codepointLength(lastFocusedText),
      after_snapshot_id: after === null ? null : after.snapshot_id,
      charset: meta.charset
    }
  });
}

function textInputResult(
  request: Omit<TextInputRequest, "via">,
  input: {
    charset: TextInputResult["charset"];
    via: TextInputVia;
    encodedLength: number;
    attempts: number;
    reason: string;
    changedFields: TextInputResult["verify"]["changed_fields"];
  }
): TextInputResult {
  return {
    charset: input.charset,
    via: input.via,
    text_length: request.text.length,
    encoded_length: input.encodedLength,
    codepoint_length: codepointLength(request.text),
    verify: {
      policy: request.verify,
      ok: true,
      attempts: input.attempts,
      reason: input.reason,
      changed_fields: input.changedFields
    }
  };
}
