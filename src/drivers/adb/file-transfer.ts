import { AutophoneError, type ErrorCode } from "../../contracts/index.js";
import type { FileTransferCompression } from "../../contracts/index.js";

export type AdbFileTransferKind = "push" | "pull";

export function buildAdbFileTransferArgs(input: {
  kind: AdbFileTransferKind;
  serial: string;
  localPath: string;
  remotePath: string;
  compression: FileTransferCompression;
}): string[] {
  const args = ["-s", input.serial, input.kind, "-q"];
  if (input.compression === "disabled") {
    args.push("-Z");
  } else if (input.compression !== "adb_default") {
    args.push("-z", input.compression);
  }
  if (input.kind === "push") {
    args.push(input.localPath, input.remotePath);
  } else {
    args.push(input.remotePath, input.localPath);
  }
  return args;
}

export function redactFileTransferArgs(args: readonly string[], paths: readonly string[]): string[] {
  return args.map((arg) => (paths.includes(arg) ? "<redacted-path>" : arg));
}

export function parseAdbFileTransferFailure(output: string): string | undefined {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .find((line) =>
      /^(adb:\s*)?(error:|failed\b|failure\b|cannot\b|couldn't\b|remote\b.*failed\b|read-only file system|no space left|permission denied|no such file|is a directory|not a directory)/i.test(
        line
      )
    );
}

export function redactFileTransferText(value: string, paths: readonly string[]): string {
  return paths.reduce((current, path) => (path.length === 0 ? current : current.replaceAll(path, "<redacted-path>")), value);
}

export function redactFileTransferError(error: AutophoneError, paths: readonly string[]): AutophoneError {
  return new AutophoneError({
    code: error.code,
    message: redactFileTransferText(error.message, paths),
    retriable: error.retriable,
    details: redactFileTransferValue(error.details, paths) as Record<string, unknown> | undefined
  });
}

export function fileTransferFailure(input: {
  code: Extract<ErrorCode, "FILE_PUSH_FAILED" | "FILE_PULL_FAILED">;
  message: string;
  paths: readonly string[];
  details: Record<string, unknown>;
}): AutophoneError {
  return new AutophoneError({
    code: input.code,
    message: redactFileTransferText(input.message, input.paths),
    retriable: false,
    details: redactFileTransferValue(input.details, input.paths) as Record<string, unknown>
  });
}

function redactFileTransferValue(value: unknown, paths: readonly string[]): unknown {
  if (typeof value === "string") {
    return redactFileTransferText(value, paths);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactFileTransferValue(item, paths));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, redactFileTransferValue(entry, paths)])
    );
  }
  return value;
}
