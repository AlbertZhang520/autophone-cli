import { AutophoneError, type ErrorCode } from "../../contracts/index.js";
import { quoteForDeviceShell } from "./device-shell.js";

export function buildAdbFileCopyArgs(sourcePath: string, destPath: string): string[] {
  return ["shell", "cp", "-n", "-T", "--", quoteForDeviceShell(sourcePath), quoteForDeviceShell(destPath)];
}

export function redactFileCopyArgs(args: readonly string[], paths: readonly string[]): string[] {
  const needles = fileCopyRedactionNeedles(paths);
  return args.map((arg) => (needles.includes(arg) ? "<redacted-path>" : arg));
}

export function parseAdbFileCopyFailure(stdout: string, stderr: string, exitCode: number | null): string | undefined {
  if (exitCode !== 0) {
    return firstNonEmptyLine(`${stdout}\n${stderr}`) ?? "cp command failed";
  }
  if (stderr.trim().length > 0) {
    return firstNonEmptyLine(stderr) ?? "cp command wrote stderr";
  }
  if (stdout.trim().length > 0) {
    return firstNonEmptyLine(stdout) ?? "cp command wrote stdout";
  }
  return undefined;
}

export function redactFileCopyText(value: string, paths: readonly string[]): string {
  return fileCopyRedactionNeedles(paths).reduce(
    (current, needle) => current.replaceAll(needle, "<redacted-path>"),
    value
  );
}

export function redactFileCopyError(error: AutophoneError, paths: readonly string[]): AutophoneError {
  return new AutophoneError({
    code: error.code,
    message: redactFileCopyText(error.message, paths),
    retriable: error.retriable,
    details: redactFileCopyValue(error.details, paths) as Record<string, unknown> | undefined
  });
}

export function fileCopyFailure(input: {
  code?: Extract<ErrorCode, "FILE_COPY_FAILED">;
  message: string;
  paths: readonly string[];
  details: Record<string, unknown>;
}): AutophoneError {
  return new AutophoneError({
    code: input.code ?? "FILE_COPY_FAILED",
    message: redactFileCopyText(input.message, input.paths),
    retriable: false,
    details: redactFileCopyValue(input.details, input.paths) as Record<string, unknown>
  });
}

function firstNonEmptyLine(value: string): string | undefined {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function fileCopyRedactionNeedles(paths: readonly string[]): string[] {
  const rawAndQuoted = paths.flatMap((path) => [path, quoteForDeviceShell(path)]);
  return [...new Set(rawAndQuoted)].sort((left, right) => right.length - left.length);
}

function redactFileCopyValue(value: unknown, paths: readonly string[]): unknown {
  if (typeof value === "string") {
    return redactFileCopyText(value, paths);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactFileCopyValue(item, paths));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactFileCopyValue(entry, paths)]));
  }
  return value;
}
