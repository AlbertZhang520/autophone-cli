import type { FileStatResult } from "../contracts/index.js";
import type { DriverFileStatResult } from "./runtime.js";

export function toStatEntry(stat: DriverFileStatResult): FileStatResult["entry"] {
  if (stat.entry === null) {
    return null;
  }
  return {
    kind: stat.entry.kind,
    bytes: stat.entry.bytes,
    modified_unix_ms: stat.entry.modifiedUnixMs
  };
}

export function toEntrySnapshot(stat: DriverFileStatResult): { exists: boolean; entry: FileStatResult["entry"] } {
  return {
    exists: stat.exists,
    entry: toStatEntry(stat)
  };
}

export function isTargetDeviceFailure(code: string): boolean {
  return code === "NO_DEVICE" || code === "MULTIPLE_DEVICES" || code === "DEVICE_OFFLINE" || code === "DEVICE_UNAUTHORIZED";
}
