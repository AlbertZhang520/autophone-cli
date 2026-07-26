import { createHash } from "node:crypto";
import type {
  ClipboardGetRequest,
  ClipboardGetResult,
  ClipboardSetRequest,
  ClipboardSetResult
} from "../../contracts/index.js";
import type {
  AndroidDriver,
} from "./types.js";
import type {
  DriverClipboardGetRequest,
  DriverClipboardGetResult,
  DriverClipboardSetRequest,
  DriverClipboardSetResult
} from "./clipboard-types.js";
import { codepointLength, utf8ByteLength } from "./text-encoding.js";

export type AndroidClipboardDriver = {
  getClipboard?: unknown;
  setClipboard?: unknown;
};

export async function clipboardGet(driver: AndroidDriver, request: ClipboardGetRequest): Promise<ClipboardGetResult> {
  const result = await getDriverClipboard(driver as AndroidClipboardDriver, {
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const text = result.text ?? "";
  return {
    device_serial: result.serial,
    present: result.present,
    length: result.present ? codepointLength(text) : 0,
    sha256: result.present ? sha256Text(text) : null,
    charset: result.present ? "utf8" : null,
    preview_redacted: "<redacted>"
  };
}

export async function clipboardSet(driver: AndroidDriver, request: ClipboardSetRequest): Promise<ClipboardSetResult> {
  const result = await setDriverClipboard(driver as AndroidClipboardDriver, {
    deviceSerial: request.device_serial,
    text: request.text,
    timeoutMs: request.timeout_ms
  });
  return {
    device_serial: result.serial,
    charset: "utf8",
    text_length: request.text.length,
    codepoint_length: codepointLength(request.text),
    bytes: utf8ByteLength(request.text),
    sha256: sha256Text(request.text),
    verify: {
      policy: "clipboard_command_accepted",
      ok: true,
      attempts: 1,
      reason: "adb clipboard set command completed; clipboard content was not read back"
    }
  };
}

export function sha256Text(text: string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

export async function getDriverClipboard(
  driver: AndroidClipboardDriver,
  request: DriverClipboardGetRequest
): Promise<DriverClipboardGetResult> {
  if (typeof driver.getClipboard !== "function") {
    throw new Error("driver does not implement clipboard get");
  }
  return (await driver.getClipboard(request)) as DriverClipboardGetResult;
}

export async function setDriverClipboard(
  driver: AndroidClipboardDriver,
  request: DriverClipboardSetRequest
): Promise<DriverClipboardSetResult> {
  if (typeof driver.setClipboard !== "function") {
    throw new Error("driver does not implement clipboard set");
  }
  return (await driver.setClipboard(request)) as DriverClipboardSetResult;
}
