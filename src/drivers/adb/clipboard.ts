import { AutophoneError } from "../../contracts/index.js";
import type {
  DriverClipboardGetRequest,
  DriverClipboardGetResult,
  DriverClipboardSetRequest,
  DriverClipboardSetResult
} from "../../core/index.js";
import type { AdbDriverExecutionContext } from "./adb-driver-context.js";
import { quoteForDeviceShell } from "./device-shell.js";

const CLIPBOARD_UNSUPPORTED_PATTERNS = [
  /unknown command/i,
  /unknown service/i,
  /can't find service/i,
  /not found/i,
  /security exception/i,
  /permission denial/i,
  /cmd:.*clipboard/i,
  /clipboard.*not.*available/i,
  // AOSP ClipboardService 没有实现 shell command handler，Binder 默认 handler
  // 输出这条消息且退出码为 0——不识别它就会把失败当成功。
  /no shell command implementation/i
];

export async function setClipboard(
  context: AdbDriverExecutionContext,
  request: DriverClipboardSetRequest
): Promise<DriverClipboardSetResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const result = await context.runOnDevice(
    serial,
    ["shell", "cmd", "clipboard", "set", "text", quoteForDeviceShell(request.text)],
    request.timeoutMs,
    "ACTION_TIMEOUT",
    false
  );
  if (unsupportedClipboardOutput(result.stdout, result.stderr)) {
    throw clipboardFailure("CLIPBOARD_UNSUPPORTED", "adb clipboard set is unsupported on this device", result, serial);
  }
  if (result.exitCode !== 0) {
    throw clipboardFailure("CLIPBOARD_SET_FAILED", "adb clipboard set command failed", result, serial);
  }
  return { serial, exitCode: result.exitCode, durationMs: result.durationMs };
}

export async function getClipboard(
  context: AdbDriverExecutionContext,
  request: DriverClipboardGetRequest
): Promise<DriverClipboardGetResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const result = await context.runOnDevice(
    serial,
    ["shell", "cmd", "clipboard", "get"],
    request.timeoutMs,
    "ACTION_TIMEOUT",
    false
  );
  if (result.exitCode !== 0) {
    if (unsupportedClipboardOutput(result.stdout, result.stderr)) {
      throw clipboardFailure("CLIPBOARD_UNSUPPORTED", "adb clipboard get is unsupported on this device", result, serial);
    }
    throw clipboardFailure("CLIPBOARD_GET_FAILED", "adb clipboard get command failed", result, serial);
  }
  // AOSP 的 Binder 默认 shell handler 以退出码 0 输出这条消息（与 set 同源）。
  // 只做整串精确匹配：剪贴板内容恰好等于它的概率可忽略，而系统性假成功是必然。
  if (isBareNoShellCommandOutput(result.stdout, result.stderr)) {
    throw clipboardFailure("CLIPBOARD_UNSUPPORTED", "adb clipboard get is unsupported on this device", result, serial);
  }
  const text = normalizeClipboardGetOutput(result.stdout);
  return {
    serial,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    present: text !== null,
    text
  };
}

function unsupportedClipboardOutput(stdout: string, stderr: string): boolean {
  const output = `${stdout}\n${stderr}`;
  return CLIPBOARD_UNSUPPORTED_PATTERNS.some((pattern) => pattern.test(output));
}

function isBareNoShellCommandOutput(stdout: string, stderr: string): boolean {
  const combined = `${stdout}\n${stderr}`.replace(/\r\n/g, "\n").trim();
  return combined === "No shell command implementation.";
}

function normalizeClipboardGetOutput(stdout: string): string | null {
  const trimmed = stdout.replace(/\r\n/g, "\n").trimEnd();
  if (trimmed.length === 0 || /^no primary clip/i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function clipboardFailure(
  code: "CLIPBOARD_GET_FAILED" | "CLIPBOARD_SET_FAILED" | "CLIPBOARD_UNSUPPORTED",
  message: string,
  result: { stdout: string; stderr: string; exitCode: number | null },
  serial: string
): AutophoneError {
  return new AutophoneError({
    code,
    message,
    retriable: false,
    details: {
      device_serial: serial,
      exit_code: result.exitCode,
      stdout: result.stdout.length > 0 ? "<redacted>" : "",
      stderr: result.stderr.length > 0 ? "<redacted>" : ""
    }
  });
}
