import { AutophoneError } from "../../contracts/index.js";
import type { FileEntryKind } from "../../contracts/index.js";
import { quoteForDeviceShell } from "./device-shell.js";

const STAT_FORMAT = "%F|%s|%Y";

export type ParsedAdbFileStat =
  | {
      exists: true;
      entry: {
        kind: FileEntryKind;
        bytes: number;
        modifiedUnixMs: number;
      };
      failure?: undefined;
      missing?: undefined;
    }
  | {
      exists: false;
      entry: null;
      missing: string;
      failure?: undefined;
    }
  | {
      failure: string;
      exists?: undefined;
      entry?: undefined;
      missing?: undefined;
    };

export function buildAdbFileStatArgs(remotePath: string): string[] {
  return ["shell", "stat", "-c", quoteForDeviceShell(STAT_FORMAT), "--", quoteForDeviceShell(remotePath)];
}

export function redactFileStatArgs(args: readonly string[], remotePath: string): string[] {
  const quoted = quoteForDeviceShell(remotePath);
  return args.map((arg) => (arg === remotePath || arg === quoted ? "<redacted-path>" : arg));
}

export function parseAdbFileStatOutput(stdout: string, stderr: string, exitCode: number | null): ParsedAdbFileStat {
  const output = `${stdout}\n${stderr}`;
  const failureLine = firstNonEmptyLine(output);

  if (exitCode !== 0) {
    if (isStatMissingFailure(output)) {
      return {
        exists: false,
        entry: null,
        missing: "stat reported no such file"
      };
    }
    return { failure: failureLine ?? "stat command failed" };
  }

  if (stderr.trim().length > 0) {
    return { failure: firstNonEmptyLine(stderr) ?? "stat command wrote stderr" };
  }

  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length !== 1) {
    return { failure: "stat command returned unexpected output" };
  }

  const fields = lines[0]!.split("|");
  if (fields.length !== 3) {
    return { failure: "stat command returned malformed output" };
  }

  const parsed = parseAdbFileStatTriplet(lines[0]!);
  return parsed.failure === undefined ? { exists: true, entry: parsed.entry } : { failure: parsed.failure };
}

export function redactFileStatText(value: string, remotePath: string): string {
  const quoted = quoteForDeviceShell(remotePath);
  return value.replaceAll(quoted, "<redacted-path>").replaceAll(remotePath, "<redacted-path>");
}

export function redactFileStatError(error: AutophoneError, remotePath: string): AutophoneError {
  return new AutophoneError({
    code: error.code,
    message: redactFileStatText(error.message, remotePath),
    retriable: error.retriable,
    details: redactFileStatValue(error.details, remotePath) as Record<string, unknown> | undefined
  });
}

export function fileStatFailure(input: {
  message: string;
  remotePath: string;
  details: Record<string, unknown>;
}): AutophoneError {
  return new AutophoneError({
    code: "FILE_STAT_FAILED",
    message: redactFileStatText(input.message, input.remotePath),
    retriable: false,
    details: redactFileStatValue(input.details, input.remotePath) as Record<string, unknown>
  });
}

export function parseAdbFileStatTriplet(value: string):
  | {
      entry: {
        kind: FileEntryKind;
        bytes: number;
        modifiedUnixMs: number;
      };
      failure?: undefined;
    }
  | { failure: string; entry?: undefined } {
  const fields = value.split("|");
  if (fields.length !== 3) {
    return { failure: "stat command returned malformed output" };
  }

  const [rawKind, rawBytes, rawModifiedUnixSeconds] = fields as [string, string, string];
  const bytes = parseNonNegativeInteger(rawBytes);
  const modifiedUnixSeconds = parseNonNegativeInteger(rawModifiedUnixSeconds);
  if (bytes === null || modifiedUnixSeconds === null || modifiedUnixSeconds > Number.MAX_SAFE_INTEGER / 1000) {
    return { failure: "stat command returned malformed numeric fields" };
  }

  return {
    entry: {
      kind: fileEntryKindFromStat(rawKind),
      bytes,
      modifiedUnixMs: modifiedUnixSeconds * 1000
    }
  };
}

function fileEntryKindFromStat(rawKind: string): FileEntryKind {
  switch (rawKind) {
    case "regular file":
    case "regular empty file":
      return "regular_file";
    case "directory":
      return "directory";
    case "symbolic link":
      return "symlink";
    default:
      return "other";
  }
}

function parseNonNegativeInteger(value: string): number | null {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function firstNonEmptyLine(value: string): string | undefined {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function isStatMissingFailure(output: string): boolean {
  return output
    .split(/\r?\n/)
    .some((line) => /^stat:\s+.+:\s+No such file(?: or directory)?$/i.test(line.trim()));
}

function redactFileStatValue(value: unknown, remotePath: string): unknown {
  if (typeof value === "string") {
    return redactFileStatText(value, remotePath);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactFileStatValue(item, remotePath));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactFileStatValue(entry, remotePath)]));
  }
  return value;
}
