import type { FileMoveRequest, FileMoveResult } from "../contracts/index.js";
import { AutophoneError } from "../contracts/index.js";
import type { AndroidDriver, DriverFileMoveResult, DriverFileStatResult } from "./runtime.js";
import { isTargetDeviceFailure, toEntrySnapshot } from "./file-utils.js";

export async function moveFile(driver: AndroidDriver, request: FileMoveRequest): Promise<FileMoveResult> {
  const beforeSource = await statForMove(driver, {
    deviceSerial: request.device_serial,
    remotePath: request.source_path,
    timeoutMs: request.timeout_ms,
    phase: "pre_source"
  });
  const beforeSourceSnapshot = toEntrySnapshot(beforeSource);
  if (!beforeSource.exists) {
    throw fileMoveWorkflowFailure("files move source path does not exist", {
      phase: "pre_source",
      reason: "missing"
    });
  }
  if (beforeSource.entry?.kind !== "regular_file" && beforeSource.entry?.kind !== "symlink") {
    throw fileMoveWorkflowFailure("files move supports only regular files and symlinks", {
      phase: "pre_source",
      source_kind: beforeSource.entry?.kind ?? null
    });
  }

  const beforeDest = await statForMove(driver, {
    deviceSerial: beforeSource.serial,
    remotePath: request.dest_path,
    timeoutMs: request.timeout_ms,
    phase: "pre_dest"
  });
  const beforeDestSnapshot = toEntrySnapshot(beforeDest);
  if (beforeDest.exists) {
    throw fileMoveWorkflowFailure("files move destination path already exists", {
      phase: "pre_dest",
      dest_kind: beforeDest.entry?.kind ?? null
    });
  }

  const move = await driver.moveFile({
    deviceSerial: beforeDest.serial,
    sourcePath: request.source_path,
    destPath: request.dest_path,
    timeoutMs: request.timeout_ms
  });
  const afterSource = await statForMove(driver, {
    deviceSerial: move.serial,
    remotePath: request.source_path,
    timeoutMs: request.timeout_ms,
    phase: "verify_source"
  });
  const afterDest = await statForMove(driver, {
    deviceSerial: move.serial,
    remotePath: request.dest_path,
    timeoutMs: request.timeout_ms,
    phase: "verify_dest"
  });
  const afterSourceSnapshot = toEntrySnapshot(afterSource);
  const afterDestSnapshot = toEntrySnapshot(afterDest);

  if (afterSource.exists || !afterDest.exists || afterDest.entry?.kind !== beforeSource.entry.kind) {
    throw fileMoveWorkflowFailure("files move did not verify source absence and destination kind after mv", {
      phase: "verify",
      source_exists: afterSource.exists,
      dest_exists: afterDest.exists,
      source_kind: beforeSource.entry.kind,
      dest_kind: afterDest.entry?.kind ?? null
    });
  }
  if (afterDest.entry.bytes !== beforeSource.entry.bytes) {
    throw fileMoveWorkflowFailure("files move destination metadata did not match source metadata after mv", {
      phase: "verify",
      source_kind: beforeSource.entry.kind,
      source_bytes: beforeSource.entry.bytes,
      dest_kind: afterDest.entry.kind,
      dest_bytes: afterDest.entry.bytes
    });
  }

  return {
    device_serial: move.serial,
    requested: {
      source_path: request.source_path,
      dest_path: request.dest_path
    },
    before_source: beforeSourceSnapshot,
    before_dest: beforeDestSnapshot,
    move: toMoveOperation(move),
    after_source: afterSourceSnapshot,
    after_dest: afterDestSnapshot,
    moved: true,
    verify: {
      policy: "source_absent_dest_present_after_move",
      ok: true,
      attempts: 4,
      reason: "post-move stats found the source absent and destination metadata matching the source kind and bytes; the stat-stat-mv-stat-stat sequence is not atomic and is not a content-integrity proof"
    },
    semantics: "single_non_directory_path_non_clobber_move"
  };
}

function toMoveOperation(move: DriverFileMoveResult): FileMoveResult["move"] {
  return {
    method: "device_mv",
    exit_code: move.exitCode,
    command_duration_ms: move.durationMs
  };
}

async function statForMove(
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
    throw fileMoveWorkflowFailure(`files move ${moveStatPhaseLabel(request.phase)} stat failed`, {
      phase: request.phase,
      cause_code: cause?.code ?? "INTERNAL",
      cause_message: cause?.message ?? "stat failed"
    });
  }
}

function moveStatPhaseLabel(phase: "pre_source" | "pre_dest" | "verify_source" | "verify_dest"): string {
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

function fileMoveWorkflowFailure(message: string, details: Record<string, unknown>): AutophoneError {
  return new AutophoneError({
    code: "FILE_MOVE_FAILED",
    message,
    retriable: false,
    details
  });
}
