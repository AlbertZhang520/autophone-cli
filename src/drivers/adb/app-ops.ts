import type { AppOpsGetResult } from "../../contracts/index.js";

const KNOWN_APP_OPS_MODES = new Set(["allow", "ignore", "deny", "default", "foreground", "ask"]);

export type ParsedAppOpsGetOutput =
  | {
      ok: true;
      lookup: AppOpsGetResult["lookup"];
      defaultMode: AppOpsGetResult["default_mode"];
      entries: AppOpsGetResult["entries"];
    }
  | {
      ok: false;
      failure: string;
      reason: string;
    };

export function buildAdbAppOpsGetArgs(packageName: string, opName: string, userId?: number | undefined): string[] {
  return [
    "shell",
    "cmd",
    "appops",
    "get",
    ...(userId === undefined ? [] : ["--user", String(userId)]),
    packageName,
    opName
  ];
}

export function parseAppOpsGetOutput(
  stdout: string,
  stderr: string,
  exitCode: number | null,
  packageName: string,
  opName: string,
  userId?: number | undefined
): ParsedAppOpsGetOutput {
  const normalizedStdout = normalizeLineEndings(stdout);
  const normalizedStderr = normalizeLineEndings(stderr);
  const stdoutLines = normalizedStdout
    .split("\n")
    .map((line) => line.replace(/\s+$/u, ""))
    .filter((line) => line.trim().length > 0);
  const stderrLines = normalizedStderr
    .split("\n")
    .map((line) => line.replace(/\s+$/u, ""))
    .filter((line) => line.trim().length > 0);

  const appOpsError = parseAppOpsError(stdoutLines, stderrLines, packageName, userId);
  if (appOpsError !== null) {
    return appOpsError;
  }
  if (stderrLines.length > 0) {
    return { ok: false, failure: "cmd appops get wrote unexpected stderr", reason: "unexpected_stderr" };
  }
  if (exitCode !== 0) {
    return { ok: false, failure: "cmd appops get exited nonzero", reason: "nonzero_exit" };
  }
  if (stdoutLines.length === 0) {
    return { ok: false, failure: "cmd appops get returned empty output", reason: "empty_output" };
  }

  const noOperations = parseNoOperationsOutput(stdoutLines);
  if (noOperations !== null) {
    if (!noOperations.ok) {
      return noOperations;
    }
    return {
      ok: true,
      lookup: resolvedLookup(),
      defaultMode: noOperations.defaultMode,
      entries: []
    };
  }

  const entries: AppOpsGetResult["entries"] = [];
  for (const line of stdoutLines) {
    const parsed = parseAppOpsEntryLine(line, opName);
    if (!parsed.ok) {
      return parsed;
    }
    entries.push(parsed.entry);
  }

  if (entries.length === 0) {
    return { ok: false, failure: "cmd appops get returned no parseable entries", reason: "no_entries" };
  }

  return {
    ok: true,
    lookup: resolvedLookup(),
    defaultMode: null,
    entries
  };
}

function parseAppOpsError(
  stdoutLines: string[],
  stderrLines: string[],
  packageName: string,
  userId?: number | undefined
): ParsedAppOpsGetOutput | null {
  const stdoutErrors = stdoutLines.filter((line) => line.startsWith("Error:"));
  const stderrErrors = stderrLines.filter((line) => line.startsWith("Error:"));
  if (stdoutErrors.length === 0 && stderrErrors.length === 0) {
    return null;
  }
  if (
    stdoutErrors.length + stderrErrors.length !== 1 ||
    stdoutLines.length + stderrLines.length !== 1
  ) {
    return { ok: false, failure: "cmd appops get mixed error output with data", reason: "mixed_error_output" };
  }

  const error = (stdoutErrors[0] ?? stderrErrors[0])!;
  const noUid = /^Error: No UID for ([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*) in user (\d+)$/.exec(error);
  if (noUid !== null) {
    if (noUid[1] !== packageName) {
      return { ok: false, failure: "cmd appops get reported no uid for a different package", reason: "no_uid_package_mismatch" };
    }
    const reportedUserId = Number(noUid[2]);
    if (!Number.isSafeInteger(reportedUserId) || reportedUserId < 0) {
      return { ok: false, failure: "cmd appops get reported malformed no-uid user id", reason: "malformed_no_uid_user" };
    }
    if (userId !== undefined) {
      return {
        ok: false,
        failure: "cmd appops get could not resolve a package uid for the explicit Android user",
        reason: "no_uid_explicit_user"
      };
    }
    return {
      ok: true,
      lookup: {
        status: "no_uid",
        uid_resolved: false,
        reason: "no_appops_uid_for_package_in_queried_user"
      },
      defaultMode: null,
      entries: []
    };
  }

  if (/^Error: Unknown operation string: [A-Z][A-Z0-9_]*$/.test(error)) {
    return { ok: false, failure: "cmd appops get reported an unknown operation", reason: "unknown_operation" };
  }

  return { ok: false, failure: "cmd appops get returned unrecognized error output", reason: "unrecognized_error" };
}

type NoOperationsResult =
  | {
      ok: true;
      defaultMode: AppOpsGetResult["default_mode"];
    }
  | {
      ok: false;
      failure: string;
      reason: string;
    };

function parseNoOperationsOutput(lines: string[]): NoOperationsResult | null {
  if (!lines.some((line) => line === "No operations." || line.startsWith("Default mode:"))) {
    return null;
  }
  if (lines.length !== 2 || lines[0] !== "No operations.") {
    return { ok: false, failure: "cmd appops get returned malformed no-operations output", reason: "malformed_no_operations" };
  }
  const modeMatch = /^Default mode: ([^\s;:\u0000-\u001f\u007f]+)$/.exec(lines[1]!);
  if (modeMatch === null) {
    return { ok: false, failure: "cmd appops get returned malformed default mode", reason: "malformed_default_mode" };
  }
  return { ok: true, defaultMode: parseAppOpsMode(modeMatch[1]!) };
}

type EntryResult =
  | {
      ok: true;
      entry: AppOpsGetResult["entries"][number];
    }
  | {
      ok: false;
      failure: string;
      reason: string;
    };

function parseAppOpsEntryLine(line: string, opName: string): EntryResult {
  const uidMatch = /^Uid mode: ([A-Z][A-Z0-9_]*): ([^\s;:\u0000-\u001f\u007f]+)(.*)$/.exec(line);
  const packageMatch = /^([A-Z][A-Z0-9_]*): ([^\s;:\u0000-\u001f\u007f]+)(.*)$/.exec(line);
  const match = uidMatch ?? packageMatch;
  if (match === null) {
    return { ok: false, failure: "cmd appops get returned malformed appops entry", reason: "malformed_entry" };
  }

  const parsedOp = match[1]!;
  if (parsedOp !== opName) {
    return { ok: false, failure: "cmd appops get returned an entry for a different operation", reason: "op_mismatch" };
  }
  const details = parseEntryDetails(match[3]!);
  if (!details.ok) {
    return details;
  }

  return {
    ok: true,
    entry: {
      scope: uidMatch === null ? "package" : "uid",
      op_name: parsedOp,
      mode: parseAppOpsMode(match[2]!),
      details: details.details
    }
  };
}

type EntryDetailsResult =
  | {
      ok: true;
      details: AppOpsGetResult["entries"][number]["details"];
    }
  | {
      ok: false;
      failure: string;
      reason: string;
    };

function parseEntryDetails(suffix: string): EntryDetailsResult {
  const details: AppOpsGetResult["entries"][number]["details"] = {
    time_raw: null,
    reject_time_raw: null,
    duration_raw: null
  };
  const trimmed = suffix.trim();
  if (trimmed.length === 0) {
    return { ok: true, details };
  }
  if (!trimmed.startsWith(";")) {
    return { ok: false, failure: "cmd appops get returned malformed appops entry details", reason: "malformed_entry_details" };
  }

  const seen = new Set<string>();
  const attributes = trimmed
    .slice(1)
    .split(";")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  for (const attribute of attributes) {
    const match = /^([A-Za-z][A-Za-z0-9_]{0,31})=(.{1,128})$/.exec(attribute);
    if (match === null) {
      return { ok: false, failure: "cmd appops get returned malformed appops entry attribute", reason: "malformed_entry_attribute" };
    }
    const key = match[1]!;
    if (seen.has(key)) {
      return { ok: false, failure: "cmd appops get returned duplicate appops entry attributes", reason: "duplicate_entry_attribute" };
    }
    seen.add(key);
    const value = match[2]!.trim();
    if (value.length === 0 || /[\u0000-\u001f\u007f]/.test(value)) {
      return { ok: false, failure: "cmd appops get returned malformed appops entry attribute value", reason: "malformed_entry_attribute_value" };
    }
    if (key === "time") {
      details.time_raw = value;
    } else if (key === "rejectTime") {
      details.reject_time_raw = value;
    } else if (key === "duration") {
      details.duration_raw = value;
    }
  }

  return { ok: true, details };
}

function parseAppOpsMode(raw: string): AppOpsGetResult["entries"][number]["mode"] {
  return {
    raw,
    kind: KNOWN_APP_OPS_MODES.has(raw) ? (raw as AppOpsGetResult["entries"][number]["mode"]["kind"]) : "unknown"
  };
}

function resolvedLookup(): AppOpsGetResult["lookup"] {
  return {
    status: "resolved",
    uid_resolved: true,
    reason: "appops_uid_resolved"
  };
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
