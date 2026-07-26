import { AutophoneError } from "../../contracts/index.js";
import type {
  DriverDeviceStorageEntry,
  DriverDeviceStoragePath,
  DriverDeviceStorageRole
} from "../../core/index.js";
import { quoteForDeviceShell } from "./device-shell.js";

const STATFS_FORMAT = "%n|%S|%b|%a|%f|%T";

export const DEVICE_STORAGE_PROBES = [
  { role: "data", path: "/data" },
  { role: "shared", path: "/sdcard" },
  { role: "tmp", path: "/data/local/tmp" }
] as const satisfies ReadonlyArray<{ role: DriverDeviceStorageRole; path: DriverDeviceStoragePath }>;

export type ParsedDeviceStorage =
  | {
      entries: DriverDeviceStorageEntry[];
      paths: DriverDeviceStoragePath[];
      failure?: undefined;
    }
  | {
      failure: string;
      entries?: undefined;
      paths?: undefined;
    };

export function buildAdbDeviceStorageArgs(): string[] {
  return [
    "shell",
    "stat",
    "-f",
    "-c",
    quoteForDeviceShell(STATFS_FORMAT),
    "--",
    ...DEVICE_STORAGE_PROBES.map((probe) => quoteForDeviceShell(probe.path))
  ];
}

export function parseDeviceStorageOutput(stdout: string, stderr: string, exitCode: number | null): ParsedDeviceStorage {
  const okByPath = new Map<DriverDeviceStoragePath, DriverDeviceStorageEntry>();
  const errorByPath = new Map<DriverDeviceStoragePath, string>();

  for (const line of nonEmptyLines(stdout)) {
    const parsed = parseStorageLine(line);
    if (parsed.failure !== undefined) {
      return { failure: parsed.failure };
    }
    if (okByPath.has(parsed.entry.path)) {
      return { failure: "statfs command returned duplicate storage path records" };
    }
    okByPath.set(parsed.entry.path, parsed.entry);
  }

  for (const line of nonEmptyLines(stderr)) {
    const parsed = parseStatfsErrorLine(line);
    if (parsed === null) {
      return { failure: "statfs command wrote unexpected stderr" };
    }
    if (errorByPath.has(parsed.path)) {
      return { failure: "statfs command returned duplicate storage path errors" };
    }
    errorByPath.set(parsed.path, parsed.message);
  }

  const entries: DriverDeviceStorageEntry[] = [];
  for (const probe of DEVICE_STORAGE_PROBES) {
    const okEntry = okByPath.get(probe.path);
    if (okEntry !== undefined) {
      entries.push(okEntry);
      continue;
    }
    const error = errorByPath.get(probe.path);
    if (error !== undefined) {
      entries.push({
        role: probe.role,
        path: probe.path,
        ok: false,
        error: {
          reason: "statfs_failed",
          message: error
        }
      });
      continue;
    }
    if (exitCode === 0) {
      return { failure: "statfs command did not report every fixed storage path" };
    }
    entries.push({
      role: probe.role,
      path: probe.path,
      ok: false,
      error: {
        reason: "not_reported",
        message: "statfs command did not report this fixed storage path"
      }
    });
  }

  if (!entries.some((entry) => entry.ok)) {
    return { failure: "statfs command did not return any usable storage records" };
  }

  return {
    entries,
    paths: DEVICE_STORAGE_PROBES.map((probe) => probe.path)
  };
}

export function deviceStorageFailure(input: { message: string; details: Record<string, unknown> }): AutophoneError {
  return new AutophoneError({
    code: "DEVICE_STORAGE_FAILED",
    message: input.message,
    retriable: false,
    details: input.details
  });
}

function parseStorageLine(line: string):
  | {
      entry: Extract<DriverDeviceStorageEntry, { ok: true }>;
      failure?: undefined;
    }
  | {
      failure: string;
      entry?: undefined;
    } {
  const fields = line.split("|");
  if (fields.length !== 6) {
    return { failure: "statfs command returned malformed storage record" };
  }

  const [rawPath, rawBlockSize, rawTotalBlocks, rawAvailableBlocks, rawFreeBlocks, filesystemType] = fields as [
    string,
    string,
    string,
    string,
    string,
    string
  ];
  const probe = DEVICE_STORAGE_PROBES.find((candidate) => candidate.path === rawPath);
  if (probe === undefined) {
    return { failure: "statfs command returned an unexpected storage path" };
  }
  if (filesystemType.length === 0) {
    return { failure: "statfs command returned an empty filesystem type" };
  }

  const blockSizeBytes = parsePositiveSafeInteger(rawBlockSize);
  const totalBlocks = parseNonNegativeSafeInteger(rawTotalBlocks);
  const availableBlocks = parseNonNegativeSafeInteger(rawAvailableBlocks);
  const freeBlocks = parseNonNegativeSafeInteger(rawFreeBlocks);
  if (blockSizeBytes === null || totalBlocks === null || availableBlocks === null || freeBlocks === null) {
    return { failure: "statfs command returned malformed numeric fields" };
  }
  if (totalBlocks < freeBlocks || freeBlocks < availableBlocks) {
    return { failure: "statfs command returned inconsistent block counts" };
  }
  if (
    !isSafeProduct(blockSizeBytes, totalBlocks) ||
    !isSafeProduct(blockSizeBytes, availableBlocks) ||
    !isSafeProduct(blockSizeBytes, freeBlocks)
  ) {
    return { failure: "statfs command returned storage values outside safe integer range" };
  }

  return {
    entry: {
      role: probe.role,
      path: probe.path,
      ok: true,
      filesystemType,
      blockSizeBytes,
      totalBlocks,
      availableBlocks,
      freeBlocks
    }
  };
}

function parseStatfsErrorLine(line: string): { path: DriverDeviceStoragePath; message: string } | null {
  const match = /^stat:\s+(?:'([^']+)'|([^:]+)):\s+(.+)$/.exec(line.trim());
  if (match === null) {
    return null;
  }
  const rawPath = (match[1] ?? match[2])?.trim();
  const message = match[3]?.trim();
  const probe = DEVICE_STORAGE_PROBES.find((candidate) => candidate.path === rawPath);
  if (probe === undefined || message === undefined || message.length === 0) {
    return null;
  }
  return { path: probe.path, message };
}

function nonEmptyLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parsePositiveSafeInteger(value: string): number | null {
  const parsed = parseNonNegativeSafeInteger(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function parseNonNegativeSafeInteger(value: string): number | null {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function isSafeProduct(left: number, right: number): boolean {
  return right === 0 || left <= Math.floor(Number.MAX_SAFE_INTEGER / right);
}
