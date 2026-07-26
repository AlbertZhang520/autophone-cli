import { TextDecoder } from "node:util";
import { AutophoneError } from "../../contracts/index.js";
import type { FileEntryKind } from "../../contracts/index.js";
import { quoteForDeviceShell } from "./device-shell.js";
import { parseAdbFileStatTriplet } from "./file-stat.js";

const PROTOCOL_HEADER = "AUTOPHONE_LIST_V1";
const MAX_ENTRY_BYTES = 4_500;
const BASE_OUTPUT_BYTES = 64_000;
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

export type ParsedAdbFileList =
  | {
      entries: {
        name: string;
        path: string;
        kind: FileEntryKind;
        bytes: number;
        modifiedUnixMs: number;
      }[];
      truncated: boolean;
      failure?: undefined;
    }
  | {
      failure: string;
      entries?: undefined;
      truncated?: undefined;
    };

export function buildAdbFileListArgs(remotePath: string, maxEntries: number): string[] {
  return ["exec-out", "sh", "-c", buildFileListScript(remotePath, maxEntries)];
}

export function fileListMaxOutputBytes(maxEntries: number): number {
  return BASE_OUTPUT_BYTES + (maxEntries + 1) * MAX_ENTRY_BYTES;
}

export function redactFileListArgs(args: readonly string[], remotePath: string): string[] {
  const quoted = quoteForDeviceShell(remotePath);
  return args.map((arg) => redactFileListText(arg, remotePath, quoted));
}

export function parseAdbFileListOutput(stdout: Buffer, stderr: string, exitCode: number | null, remotePath: string): ParsedAdbFileList {
  try {
    if (stderr.trim().length > 0) {
      return { failure: "directory list command wrote stderr" };
    }

    const fields = splitNul(stdout);
    if (fields.length === 0) {
      return { failure: "directory list command returned empty output" };
    }

    const header = decodeUtf8(fields[0]!);
    if (header !== PROTOCOL_HEADER) {
      return { failure: "directory list command returned malformed protocol header" };
    }

    const entries: {
      name: string;
      path: string;
      kind: FileEntryKind;
      bytes: number;
      modifiedUnixMs: number;
    }[] = [];
    let truncated = false;
    let deferredFailure: string | undefined;
    let sawSuccess = false;
    let successStatus = "";
    let index = 1;

    while (index < fields.length) {
      const tag = decodeUtf8(fields[index++]!);
      if (tag.length === 0 && index >= fields.length) {
        break;
      }

      if (tag === "E") {
        const pathField = fields[index++];
        const metaField = fields[index++];
        if (pathField === undefined || metaField === undefined) {
          return { failure: "directory list command returned truncated entry record" };
        }
        const path = decodeUtf8(pathField);
        const meta = decodeUtf8(metaField);
        const entry = parseListEntry(path, meta, remotePath);
        if (entry.failure !== undefined) {
          return { failure: entry.failure };
        }
        entries.push(entry.entry);
        continue;
      }

      if (tag === "T") {
        truncated = true;
        continue;
      }

      if (tag === "F") {
        const messageField = fields[index++];
        const message = messageField === undefined ? "directory list command failed" : decodeUtf8(messageField);
        const failure = message.length > 0 ? message : "directory list command failed";
        if (truncated && failure === "find failed") {
          deferredFailure = failure;
          continue;
        }
        return { failure };
      }

      if (tag === "S") {
        const statusField = fields[index++];
        if (statusField === undefined) {
          return { failure: "directory list command returned truncated success record" };
        }
        sawSuccess = true;
        successStatus = decodeUtf8(statusField);
        continue;
      }

      return { failure: "directory list command returned unknown protocol tag" };
    }

    if (!sawSuccess) {
      return { failure: "directory list command did not report completion" };
    }
    const benignTruncationSigpipe =
      truncated && deferredFailure === "find failed" && (successStatus === "141" || exitCode === 141);
    if (deferredFailure !== undefined && !benignTruncationSigpipe) {
      return { failure: deferredFailure };
    }
    if (!benignTruncationSigpipe && (successStatus !== "0" || exitCode !== 0)) {
      return { failure: `directory list command failed with status ${successStatus || String(exitCode)}` };
    }

    return { entries, truncated };
  } catch (error) {
    if (error instanceof AutophoneError) {
      return { failure: error.message };
    }
    throw error;
  }
}

export function redactFileListText(value: string, remotePath: string, quoted = quoteForDeviceShell(remotePath)): string {
  return value.replaceAll(quoted, "<redacted-path>").replaceAll(remotePath, "<redacted-path>");
}

export function redactFileListError(error: AutophoneError, remotePath: string): AutophoneError {
  return new AutophoneError({
    code: error.code,
    message: redactFileListText(error.message, remotePath),
    retriable: error.retriable,
    details: redactFileListValue(error.details, remotePath) as Record<string, unknown> | undefined
  });
}

export function fileListFailure(input: {
  message: string;
  remotePath: string;
  details: Record<string, unknown>;
}): AutophoneError {
  return new AutophoneError({
    code: "FILE_LIST_FAILED",
    message: redactFileListText(input.message, input.remotePath),
    retriable: false,
    details: redactFileListValue(input.details, input.remotePath) as Record<string, unknown>
  });
}

function buildFileListScript(remotePath: string, maxEntries: number): string {
  return [
    `dir=${quoteForDeviceShell(remotePath)}`,
    `max=${maxEntries}`,
    "count=0",
    `printf '${PROTOCOL_HEADER}\\0'`,
    "find \"$dir\" -mindepth 1 -maxdepth 1 -print0 2>/dev/null | while IFS= read -r -d '' p; do",
    "if [ \"$count\" -ge \"$max\" ]; then printf 'T\\0'; break; fi",
    "meta=$(stat -c '%F|%s|%Y' -- \"$p\" 2>/dev/null) || { printf 'F\\0stat failed\\0'; exit 70; }",
    "printf 'E\\0%s\\0%s\\0' \"$p\" \"$meta\"",
    "count=$((count + 1))",
    "done",
    "pipeline_status=${PIPESTATUS[*]}",
    "find_status=${pipeline_status%% *}",
    "loop_status=${pipeline_status##* }",
    "# find may report SIGPIPE when max_entries closes the pipe after emitting T.",
    "if [ \"$find_status\" != \"0\" ] && [ \"$find_status\" != \"141\" ]; then printf 'F\\0find failed\\0'; status=\"$find_status\"; else status=\"$loop_status\"; fi",
    "printf 'S\\0%s\\0' \"$status\"",
    "exit \"$status\""
  ].join("\n");
}

function parseListEntry(
  path: string,
  meta: string,
  remotePath: string
):
  | {
      entry: {
        name: string;
        path: string;
        kind: FileEntryKind;
        bytes: number;
        modifiedUnixMs: number;
      };
      failure?: undefined;
    }
  | { failure: string; entry?: undefined } {
  const name = childName(remotePath, path);
  if (name === null) {
    return { failure: "directory list command returned a path outside the requested directory" };
  }

  const parsed = parseAdbFileStatTriplet(meta);
  if (parsed.failure !== undefined) {
    return { failure: parsed.failure };
  }

  return {
    entry: {
      name,
      path,
      kind: parsed.entry.kind,
      bytes: parsed.entry.bytes,
      modifiedUnixMs: parsed.entry.modifiedUnixMs
    }
  };
}

function childName(remotePath: string, path: string): string | null {
  const prefix = remotePath === "/" ? "/" : `${remotePath}/`;
  if (!path.startsWith(prefix)) {
    return null;
  }
  const name = path.slice(prefix.length);
  if (name.length === 0 || name.includes("/") || name.includes("\0")) {
    return null;
  }
  return name;
}

function splitNul(buffer: Buffer): Buffer[] {
  const fields: Buffer[] = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] === 0) {
      fields.push(buffer.subarray(start, index));
      start = index + 1;
    }
  }
  if (start < buffer.length) {
    fields.push(buffer.subarray(start));
  }
  return fields;
}

function decodeUtf8(buffer: Buffer): string {
  try {
    return utf8Decoder.decode(buffer);
  } catch {
    throw new AutophoneError({
      code: "FILE_LIST_FAILED",
      message: "directory list command returned a non-UTF-8 path",
      retriable: false
    });
  }
}

function redactFileListValue(value: unknown, remotePath: string): unknown {
  if (typeof value === "string") {
    return redactFileListText(value, remotePath);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactFileListValue(item, remotePath));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactFileListValue(entry, remotePath)]));
  }
  return value;
}
