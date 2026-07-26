import { AutophoneError, type ErrorCode } from "../../contracts/index.js";
import { quoteForDeviceShell } from "./device-shell.js";

export function buildAdbFileMkdirArgs(remotePath: string): string[] {
  return ["shell", "mkdir", "-p", "--", quoteForDeviceShell(remotePath)];
}

export function redactFileMkdirArgs(args: readonly string[], remotePath: string): string[] {
  const quoted = quoteForDeviceShell(remotePath);
  return args.map((arg) => (arg === remotePath || arg === quoted ? "<redacted-path>" : arg));
}

export function parseAdbFileMkdirFailure(stdout: string, stderr: string, exitCode: number | null): string | undefined {
  if (exitCode !== 0) {
    return firstNonEmptyLine(`${stdout}\n${stderr}`) ?? "mkdir command failed";
  }
  if (stderr.trim().length > 0) {
    return firstNonEmptyLine(stderr) ?? "mkdir command wrote stderr";
  }
  if (stdout.trim().length > 0) {
    return firstNonEmptyLine(stdout) ?? "mkdir command wrote stdout";
  }
  return undefined;
}

export function redactFileMkdirText(value: string, remotePath: string): string {
  const quoted = quoteForDeviceShell(remotePath);
  return value.replaceAll(quoted, "<redacted-path>").replaceAll(remotePath, "<redacted-path>");
}

export function redactFileMkdirError(error: AutophoneError, remotePath: string): AutophoneError {
  return new AutophoneError({
    code: error.code,
    message: redactFileMkdirText(error.message, remotePath),
    retriable: error.retriable,
    details: redactFileMkdirValue(error.details, remotePath) as Record<string, unknown> | undefined
  });
}

export function fileMkdirFailure(input: {
  code?: Extract<ErrorCode, "FILE_MKDIR_FAILED">;
  message: string;
  remotePath: string;
  details: Record<string, unknown>;
}): AutophoneError {
  return new AutophoneError({
    code: input.code ?? "FILE_MKDIR_FAILED",
    message: redactFileMkdirText(input.message, input.remotePath),
    retriable: false,
    details: redactFileMkdirValue(input.details, input.remotePath) as Record<string, unknown>
  });
}

function firstNonEmptyLine(value: string): string | undefined {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function redactFileMkdirValue(value: unknown, remotePath: string): unknown {
  if (typeof value === "string") {
    return redactFileMkdirText(value, remotePath);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactFileMkdirValue(item, remotePath));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactFileMkdirValue(entry, remotePath)]));
  }
  return value;
}
