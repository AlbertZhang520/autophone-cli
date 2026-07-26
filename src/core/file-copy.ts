import type { FileCopyRequest, FileCopyResult } from "../contracts/index.js";
import { AutophoneError } from "../contracts/index.js";
import type { AndroidDriver, DriverFileCopyResult, DriverFileStatResult } from "./runtime.js";
import { isTargetDeviceFailure, toEntrySnapshot } from "./file-utils.js";

export async function copyFile(driver: AndroidDriver, request: FileCopyRequest): Promise<FileCopyResult> {
  const beforeSource = await statForCopy(driver, {
    deviceSerial: request.device_serial,
    remotePath: request.source_path,
    timeoutMs: request.timeout_ms,
    phase: "pre_source"
  });
  const beforeSourceSnapshot = toEntrySnapshot(beforeSource);
  if (!beforeSource.exists) {
    throw fileCopyWorkflowFailure("files copy source path does not exist", {
      phase: "pre_source",
      reason: "missing"
    });
  }
  if (beforeSource.entry?.kind !== "regular_file") {
    throw fileCopyWorkflowFailure("files copy supports only regular files", {
      phase: "pre_source",
      source_kind: beforeSource.entry?.kind ?? null
    });
  }

  const beforeDest = await statForCopy(driver, {
    deviceSerial: beforeSource.serial,
    remotePath: request.dest_path,
    timeoutMs: request.timeout_ms,
    phase: "pre_dest"
  });
  const beforeDestSnapshot = toEntrySnapshot(beforeDest);
  if (beforeDest.exists) {
    throw fileCopyWorkflowFailure("files copy destination path already exists", {
      phase: "pre_dest",
      dest_kind: beforeDest.entry?.kind ?? null
    });
  }

  let copy: DriverFileCopyResult;
  try {
    copy = await driver.copyFile({
      deviceSerial: beforeDest.serial,
      sourcePath: request.source_path,
      destPath: request.dest_path,
      timeoutMs: request.timeout_ms
    });
  } catch (error) {
    throw await copyFailureWithDestinationSnapshot(driver, request, beforeDest.serial, error);
  }

  const afterSource = await statForCopy(driver, {
    deviceSerial: copy.serial,
    remotePath: request.source_path,
    timeoutMs: request.timeout_ms,
    phase: "verify_source"
  });
  const afterDest = await statForCopy(driver, {
    deviceSerial: copy.serial,
    remotePath: request.dest_path,
    timeoutMs: request.timeout_ms,
    phase: "verify_dest"
  });
  const afterSourceSnapshot = toEntrySnapshot(afterSource);
  const afterDestSnapshot = toEntrySnapshot(afterDest);

  if (
    !afterSource.exists ||
    afterSource.entry?.kind !== "regular_file" ||
    !afterDest.exists ||
    afterDest.entry?.kind !== "regular_file"
  ) {
    throw fileCopyWorkflowFailure("files copy did not verify source preservation and regular destination after cp", {
      phase: "verify",
      source_exists: afterSource.exists,
      dest_exists: afterDest.exists,
      source_kind: afterSource.entry?.kind ?? null,
      dest_kind: afterDest.entry?.kind ?? null
    });
  }
  if (afterSource.entry.bytes !== beforeSource.entry.bytes || afterDest.entry.bytes !== beforeSource.entry.bytes) {
    throw fileCopyWorkflowFailure("files copy destination metadata did not match source metadata after cp", {
      phase: "verify",
      before_source_bytes: beforeSource.entry.bytes,
      after_source_bytes: afterSource.entry.bytes,
      dest_bytes: afterDest.entry.bytes
    });
  }

  return {
    device_serial: copy.serial,
    requested: {
      source_path: request.source_path,
      dest_path: request.dest_path
    },
    before_source: beforeSourceSnapshot,
    before_dest: beforeDestSnapshot,
    copy: toCopyOperation(copy),
    after_source: afterSourceSnapshot,
    after_dest: afterDestSnapshot,
    copied: true,
    verify: {
      policy: "source_preserved_dest_present_after_copy",
      ok: true,
      attempts: 4,
      reason: "post-copy stats found the source preserved and destination metadata matching the source kind and bytes; the stat-stat-cp-stat-stat sequence is not atomic and is not a content-integrity proof"
    },
    semantics: "single_regular_file_non_clobber_copy"
  };
}

function toCopyOperation(copy: DriverFileCopyResult): FileCopyResult["copy"] {
  return {
    method: "device_cp_no_clobber",
    exit_code: copy.exitCode,
    command_duration_ms: copy.durationMs
  };
}

async function copyFailureWithDestinationSnapshot(
  driver: AndroidDriver,
  request: FileCopyRequest,
  deviceSerial: string,
  error: unknown
): Promise<AutophoneError> {
  if (error instanceof AutophoneError && isTargetDeviceFailure(error.code)) {
    return error;
  }
  const cause = error instanceof AutophoneError ? error : undefined;
  const destAfterFailure = await bestEffortFailureStat(driver, {
    deviceSerial,
    remotePath: request.dest_path,
    timeoutMs: request.timeout_ms
  });
  return fileCopyWorkflowFailure("files copy command failed; destination cleanup is left to the caller", {
    phase: "copy",
    cause_code: cause?.code ?? "INTERNAL",
    cause_message: cause?.message ?? "copy failed",
    dest_after_failure: destAfterFailure
  });
}

async function bestEffortFailureStat(
  driver: AndroidDriver,
  request: { deviceSerial: string; remotePath: string; timeoutMs: number }
): Promise<{ observed: true; exists: boolean; entry: ReturnType<typeof toEntrySnapshot>["entry"] } | { observed: false; cause_code: string; cause_message: string }> {
  try {
    return { observed: true, ...toEntrySnapshot(await driver.statFile(request)) };
  } catch (error) {
    const cause = error instanceof AutophoneError ? error : undefined;
    return {
      observed: false,
      cause_code: cause?.code ?? "INTERNAL",
      cause_message: cause?.message ?? "destination failure stat failed"
    };
  }
}

async function statForCopy(
  driver: AndroidDriver,
  request: {
    deviceSerial: string;
    remotePath: string;
    timeoutMs: number;
    phase: "pre_source" | "pre_dest" | "verify_source" | "verify_dest";
  }
): Promise<DriverFileStatResult> {
  try {
    return await driver.statFile({
      deviceSerial: request.deviceSerial,
      remotePath: request.remotePath,
      timeoutMs: request.timeoutMs
    });
  } catch (error) {
    if (error instanceof AutophoneError && isTargetDeviceFailure(error.code)) {
      throw error;
    }
    const cause = error instanceof AutophoneError ? error : undefined;
    throw fileCopyWorkflowFailure(`files copy ${copyStatPhaseLabel(request.phase)} stat failed`, {
      phase: request.phase,
      cause_code: cause?.code ?? "INTERNAL",
      cause_message: cause?.message ?? "stat failed"
    });
  }
}

function copyStatPhaseLabel(phase: "pre_source" | "pre_dest" | "verify_source" | "verify_dest"): string {
  switch (phase) {
    case "pre_source":
      return "source pre-check";
    case "pre_dest":
      return "destination pre-check";
    case "verify_source":
      return "source verification";
    case "verify_dest":
      return "destination verification";
  }
}

function fileCopyWorkflowFailure(message: string, details: Record<string, unknown>): AutophoneError {
  return new AutophoneError({
    code: "FILE_COPY_FAILED",
    message,
    retriable: false,
    details
  });
}
