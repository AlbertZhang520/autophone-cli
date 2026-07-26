import { AutophoneError, type ErrorCode } from "../../contracts/index.js";
import { quoteForDeviceShell } from "./device-shell.js";

export type ScreenrecordArgsRequest = {
  remotePath: string;
  durationSeconds: number;
  bitRateBps?: number | undefined;
  size?: string | undefined;
  bugreport: boolean;
};

export function buildAdbScreenrecordArgs(request: ScreenrecordArgsRequest): string[] {
  const args = ["shell", "screenrecord", "--time-limit", String(request.durationSeconds)];
  if (request.bitRateBps !== undefined) {
    args.push("--bit-rate", String(request.bitRateBps));
  }
  if (request.size !== undefined) {
    args.push("--size", request.size);
  }
  if (request.bugreport) {
    args.push("--bugreport");
  }
  args.push(quoteForDeviceShell(request.remotePath));
  return args;
}

export function parseAdbScreenrecordFailure(
  stdout: string,
  stderr: string,
  exitCode: number | null
): string | undefined {
  if (exitCode !== 0) {
    return firstNonEmptyLine(`${stdout}\n${stderr}`) ?? "screenrecord command failed";
  }
  if (stderr.trim().length > 0) {
    return firstNonEmptyLine(stderr) ?? "screenrecord wrote unexpected stderr";
  }
  if (stdout.trim().length > 0) {
    return firstNonEmptyLine(stdout) ?? "screenrecord wrote unexpected stdout";
  }
  return undefined;
}

export function redactScreenrecordArgs(args: readonly string[], remotePath: string): string[] {
  const quoted = quoteForDeviceShell(remotePath);
  return args.map((arg) => (arg === remotePath || arg === quoted ? "<redacted-remote-temp>" : arg));
}

export function redactScreenrecordText(value: string, remotePath: string): string {
  const quoted = quoteForDeviceShell(remotePath);
  return value.replaceAll(quoted, "<redacted-remote-temp>").replaceAll(remotePath, "<redacted-remote-temp>");
}

export function redactScreenrecordError(error: AutophoneError, remotePath: string): AutophoneError {
  return new AutophoneError({
    code: error.code,
    message: redactScreenrecordText(error.message, remotePath),
    retriable: error.retriable,
    details: redactScreenrecordValue(error.details, remotePath) as Record<string, unknown> | undefined
  });
}

export function screenrecordFailure(input: {
  code?: Extract<ErrorCode, "SCREENRECORD_FAILED">;
  message: string;
  remotePath: string;
  details: Record<string, unknown>;
}): AutophoneError {
  return new AutophoneError({
    code: input.code ?? "SCREENRECORD_FAILED",
    message: redactScreenrecordText(input.message, input.remotePath),
    retriable: false,
    details: redactScreenrecordValue(input.details, input.remotePath) as Record<string, unknown>
  });
}

function firstNonEmptyLine(value: string): string | undefined {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function redactScreenrecordValue(value: unknown, remotePath: string): unknown {
  if (typeof value === "string") {
    return redactScreenrecordText(value, remotePath);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactScreenrecordValue(item, remotePath));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactScreenrecordValue(entry, remotePath)]));
  }
  return value;
}
