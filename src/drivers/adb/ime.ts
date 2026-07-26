import { AutophoneError } from "../../contracts/index.js";
import type {
  DriverImeCommandRequest,
  DriverImeCommandResult,
  DriverImeResetRequest
} from "../../core/index.js";
import type { AdbDriverExecutionContext } from "./adb-driver-context.js";
import { truncateForErrorDetails } from "./adb-driver-parsers-details.js";
import { quoteForDeviceShell } from "./device-shell.js";

// `ime` 成功输出形如 "Input method <id> ... selected/enabled"，不会命中这些 pattern。
// 与剪贴板同款教训：退出码 0 不等于成功，输出也要甄别。
const IME_COMMAND_ERROR_PATTERNS = [
  /unknown id/i,
  /^error\b/im,
  /exception/i,
  /unknown command/i,
  /no shell command implementation/i
];

export async function enableInputMethod(
  context: AdbDriverExecutionContext,
  request: DriverImeCommandRequest
): Promise<DriverImeCommandResult> {
  return runImeCommand(context, request, ["enable", quoteForDeviceShell(request.imeId)], "adb ime enable command failed");
}

export async function setInputMethod(
  context: AdbDriverExecutionContext,
  request: DriverImeCommandRequest
): Promise<DriverImeCommandResult> {
  return runImeCommand(context, request, ["set", quoteForDeviceShell(request.imeId)], "adb ime set command failed");
}

export async function resetInputMethod(
  context: AdbDriverExecutionContext,
  request: DriverImeResetRequest
): Promise<DriverImeCommandResult> {
  return runImeCommand(context, request, ["reset"], "adb ime reset command failed");
}

async function runImeCommand(
  context: AdbDriverExecutionContext,
  request: { deviceSerial?: string | undefined; timeoutMs: number },
  imeArgs: string[],
  failureMessage: string
): Promise<DriverImeCommandResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const result = await context.runOnDevice(serial, ["shell", "ime", ...imeArgs], request.timeoutMs, "ACTION_TIMEOUT", false);
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.exitCode !== 0 || IME_COMMAND_ERROR_PATTERNS.some((pattern) => pattern.test(output))) {
    throw new AutophoneError({
      code: "DEVICE_IME_FAILED",
      message: failureMessage,
      retriable: false,
      details: {
        device_serial: serial,
        exit_code: result.exitCode,
        stdout: truncateForErrorDetails(result.stdout, 256),
        stderr: truncateForErrorDetails(result.stderr, 256)
      }
    });
  }
  return { serial, exitCode: result.exitCode, durationMs: result.durationMs };
}
