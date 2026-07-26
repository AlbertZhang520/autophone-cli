import { AutophoneError } from "../../contracts/index.js";
import type {
  DriverAdbKeyboardTextInputRequest,
  DriverAdbKeyboardTextInputResult
} from "../../core/index.js";
import type { AdbDriverExecutionContext } from "./adb-driver-context.js";
import { throwIfAdbTargetFailure } from "./adb-driver-parsers-app.js";
import { isBenignAdbStderrLine } from "./adb-driver-parsers-core.js";
import { truncateForErrorDetails } from "./adb-driver-parsers-details.js";

export const ADB_KEYBOARD_PACKAGE = "com.android.adbkeyboard" as const;
export const ADB_KEYBOARD_INPUT_B64_ACTION = "ADB_INPUT_B64" as const;

const BROADCAST_FAILURE_PATTERNS = [
  /securityexception/i,
  /exception occurred while executing/i,
  /unknown option/i,
  /unknown command/i,
  /^error\b/im,
  /^failure\b/im
];

export function buildAdbKeyboardTextInputArgs(text: string): { args: string[]; encodedLength: number; payload: string } {
  const payload = Buffer.from(text, "utf8").toString("base64");
  return {
    args: [
      "shell",
      "am",
      "broadcast",
      "-a",
      ADB_KEYBOARD_INPUT_B64_ACTION,
      "-p",
      ADB_KEYBOARD_PACKAGE,
      "--es",
      "msg",
      payload
    ],
    encodedLength: payload.length,
    payload
  };
}

export async function adbKeyboardTextInput(
  context: AdbDriverExecutionContext,
  request: DriverAdbKeyboardTextInputRequest
): Promise<DriverAdbKeyboardTextInputResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const command = buildAdbKeyboardTextInputArgs(request.text);
  let result;

  try {
    result = await context.runOnDevice(
      serial,
      command.args,
      request.timeoutMs,
      "ACTION_TIMEOUT",
      false
    );
  } catch (error) {
    throw redactAdbKeyboardError(error, request.text, command.payload);
  }

  const output = `${result.stdout}\n${result.stderr}`;
  const safeArgs = redactAdbKeyboardValue(command.args, request.text, command.payload) as string[];
  const safeOutput = redactAdbKeyboardText(output, request.text, command.payload);
  throwIfAdbTargetFailure(safeOutput, result.exitCode, safeArgs);
  const completion = /Broadcast completed:\s*result=(-?\d+)/i.exec(output);
  const resultCode = completion === null ? null : Number.parseInt(completion[1]!, 10);
  const unexpectedStderr = result.stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !isBenignAdbStderrLine(line));
  const failed =
    result.exitCode !== 0 ||
    resultCode !== 0 ||
    unexpectedStderr !== undefined ||
    BROADCAST_FAILURE_PATTERNS.some((pattern) => pattern.test(output));

  if (failed) {
    throw new AutophoneError({
      code: "DEVICE_IME_FAILED",
      message: "ADBKeyboard Unicode broadcast failed",
      retriable: false,
      details: {
        device_serial: serial,
        exit_code: result.exitCode,
        broadcast_result_code: resultCode,
        completion_observed: completion !== null,
        unexpected_stderr: unexpectedStderr === undefined
          ? undefined
          : redactAdbKeyboardText(unexpectedStderr, request.text, command.payload),
        args: safeArgs,
        stdout: truncateForErrorDetails(
          redactAdbKeyboardText(result.stdout, request.text, command.payload),
          512
        ),
        stderr: truncateForErrorDetails(
          redactAdbKeyboardText(result.stderr, request.text, command.payload),
          512
        )
      }
    });
  }

  return {
    serial,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    encodedLength: command.encodedLength
  };
}

export function redactAdbKeyboardError(error: unknown, text: string, payload: string): AutophoneError {
  if (error instanceof AutophoneError) {
    return new AutophoneError({
      code: error.code,
      message: redactAdbKeyboardText(error.message, text, payload),
      retriable: error.retriable,
      details: redactAdbKeyboardValue(error.details, text, payload) as Record<string, unknown> | undefined
    });
  }
  return new AutophoneError({
    code: "ADB_ERROR",
    message: "ADBKeyboard Unicode broadcast command failed",
    retriable: false
  });
}

function redactAdbKeyboardText(value: string, text: string, payload: string): string {
  let redacted = value;
  if (text.length > 0) {
    redacted = redacted.replaceAll(text, "<redacted-text>");
  }
  if (payload.length > 0) {
    redacted = redacted.replaceAll(payload, "<redacted-base64>");
  }
  return redacted;
}

function redactAdbKeyboardValue(value: unknown, text: string, payload: string): unknown {
  if (typeof value === "string") {
    return redactAdbKeyboardText(value, text, payload);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactAdbKeyboardValue(item, text, payload));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, redactAdbKeyboardValue(entry, text, payload)])
    );
  }
  return value;
}
