import { AutophoneError, type ErrorCode } from "../../contracts/index.js";
import { quoteForDeviceShell } from "./device-shell.js";

export function buildAdbFileMoveArgs(sourcePath: string, destPath: string): string[] {
  return ["shell", "mv", "--", quoteForDeviceShell(sourcePath), quoteForDeviceShell(destPath)];
}

export function redactFileMoveArgs(args: readonly string[], paths: readonly string[]): string[] {
  const needles = fileMoveRedactionNeedles(paths);
  return args.map((arg) => (needles.includes(arg) ? "<redacted-path>" : arg));
}

export function parseAdbFileMoveFailure(stdout: string, stderr: string, exitCode: number | null): string | undefined {
  if (exitCode !== 0) {
    return firstNonEmptyLine(`${stdout}\n${stderr}`) ?? "mv command failed";
  }
  if (stderr.trim().length > 0) {
    return firstNonEmptyLine(stderr) ?? "mv command wrote stderr";
  }
  if (stdout.trim().length > 0) {
    return firstNonEmptyLine(stdout) ?? "mv command wrote stdout";
  }
  return undefined;
}

export function redactFileMoveText(value: string, paths: readonly string[]): string {
  return fileMoveRedactionNeedles(paths).reduce(
    (current, needle) => current.replaceAll(needle, "<redacted-path>"),
    value
  );
}

export function redactFileMoveError(error: AutophoneError, paths: readonly string[]): AutophoneError {
  return new AutophoneError({
    code: error.code,
    message: redactFileMoveText(error.message, paths),
    retriable: error.retriable,
    details: redactFileMoveValue(error.details, paths) as Record<string, unknown> | undefined
  });
}

export function fileMoveFailure(input: {
  code?: Extract<ErrorCode, "FILE_MOVE_FAILED">;
  message: string;
  paths: readonly string[];
  details: Record<string, unknown>;
}): AutophoneError {
  return new AutophoneError({
    code: input.code ?? "FILE_MOVE_FAILED",
    message: redactFileMoveText(input.message, input.paths),
    retriable: false,
    details: redactFileMoveValue(input.details, input.paths) as Record<string, unknown>
  });
}

function firstNonEmptyLine(value: string): string | undefined {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function fileMoveRedactionNeedles(paths: readonly string[]): string[] {
  const rawAndQuoted = paths.flatMap((path) => [path, quoteForDeviceShell(path)]);
  return [...new Set(rawAndQuoted)].sort((left, right) => right.length - left.length);
}

function redactFileMoveValue(value: unknown, paths: readonly string[]): unknown {
  if (typeof value === "string") {
    return redactFileMoveText(value, paths);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactFileMoveValue(item, paths));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactFileMoveValue(entry, paths)]));
  }
  return value;
}
