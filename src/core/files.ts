import type {
  FileEntryKind,
  FileHashRequest,
  FileHashResult,
  FileListRequest,
  FileListResult,
  FileMetadata,
  FileMkdirRequest,
  FileMkdirResult,
  FilePullRequest,
  FilePullResult,
  FilePushRequest,
  FilePushResult,
  FileRmRequest,
  FileRmResult,
  FileStatRequest,
  FileStatResult
} from "../contracts/index.js";
import { AutophoneError } from "../contracts/index.js";
import type {
  AndroidDriver,
  DriverFileHashResult,
  DriverFileListEntry,
  DriverFileListResult,
  DriverFileMkdirResult,
  DriverFileRemoveResult,
  DriverFileStatResult,
  DriverFileTransferResult
} from "./runtime.js";
import { isTargetDeviceFailure, toEntrySnapshot, toStatEntry } from "./file-utils.js";

export { copyFile } from "./file-copy.js";
export { moveFile } from "./file-move.js";

export type FilePullTransfer = {
  device_serial: string;
  requested: FilePullResult["requested"];
  transfer: FilePullResult["transfer"];
  verify: FilePullResult["verify"];
};

export async function pushFile(driver: AndroidDriver, request: FilePushRequest): Promise<FilePushResult> {
  const transfer = await driver.pushFile({
    deviceSerial: request.device_serial,
    localPath: request.local_path,
    remotePath: request.remote_path,
    compression: request.compression,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: transfer.serial,
    requested: {
      local: request.local_file,
      remote_path: request.remote_path,
      compression: request.compression
    },
    transfer: toPushTransfer(transfer),
    verify: adbExitSuccessVerify("adb push exited 0; remote file contents were not independently hashed")
  };
}

export async function pullFile(driver: AndroidDriver, request: FilePullRequest, localPath: string): Promise<FilePullTransfer> {
  const transfer = await driver.pullFile({
    deviceSerial: request.device_serial,
    localPath,
    remotePath: request.remote_path,
    compression: request.compression,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: transfer.serial,
    requested: {
      remote_path: request.remote_path,
      compression: request.compression
    },
    transfer: toPullTransfer(transfer),
    verify: adbExitSuccessVerify("adb pull exited 0; remote file contents were not independently hashed")
  };
}

export function buildFilePullResult(
  transfer: FilePullTransfer,
  output: FileMetadata & { overwritten: boolean }
): FilePullResult {
  return {
    ...transfer,
    output
  };
}

export async function statFile(driver: AndroidDriver, request: FileStatRequest): Promise<FileStatResult> {
  const stat = await driver.statFile({
    deviceSerial: request.device_serial,
    remotePath: request.remote_path,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: stat.serial,
    requested: {
      remote_path: request.remote_path
    },
    exists: stat.exists,
    entry: toStatEntry(stat),
    query: {
      method: "device_stat",
      exit_code: stat.exitCode,
      command_duration_ms: stat.durationMs
    },
    verify: {
      policy: "stat_parse",
      ok: true,
      attempts: 1,
      reason: stat.exists
        ? "stat output parsed for one device path"
        : "stat reported the device path does not exist"
    },
    semantics: "read_only_single_path_stat_not_directory_listing"
  };
}

export async function hashFile(driver: AndroidDriver, request: FileHashRequest): Promise<FileHashResult> {
  const target = await statForHash(driver, {
    deviceSerial: request.device_serial,
    remotePath: request.remote_path,
    timeoutMs: request.timeout_ms
  });
  const targetSnapshot = {
    ...toEntrySnapshot(target),
    query: toStatQuery(target)
  };

  if (!target.exists || target.entry?.kind !== "regular_file") {
    return {
      device_serial: target.serial,
      requested: {
        remote_path: request.remote_path,
        algorithm: request.algorithm
      },
      target: targetSnapshot,
      hash: null,
      hashed: false,
      verify: {
        policy: "regular_file_stat_then_digest_parse",
        ok: true,
        attempts: 1,
        reason: !target.exists
          ? "target stat reported the device path does not exist; no digest was computed"
          : "target stat reported the device path is not a regular file; no digest was computed"
      },
      semantics: "read_only_single_regular_file_content_digest_not_atomic"
    };
  }

  const hashed = await runHashCommand(driver, request, target.serial);
  return {
    device_serial: hashed.serial,
    requested: {
      remote_path: request.remote_path,
      algorithm: request.algorithm
    },
    target: targetSnapshot,
    hash: toHashPayload(hashed),
    hashed: true,
    verify: {
      policy: "regular_file_stat_then_digest_parse",
      ok: true,
      attempts: 2,
      reason:
        "pre-hash stat found a regular file and digest output parsed; the stat-hash sequence is not atomic and the timeout applies independently to each adb call"
    },
    semantics: "read_only_single_regular_file_content_digest_not_atomic"
  };
}

export async function makeDirectory(driver: AndroidDriver, request: FileMkdirRequest): Promise<FileMkdirResult> {
  const before = await statForMkdir(driver, {
    deviceSerial: request.device_serial,
    remotePath: request.remote_path,
    timeoutMs: request.timeout_ms,
    phase: "pre_stat"
  });
  const beforeSnapshot = toEntrySnapshot(before);

  if (before.exists) {
    if (before.entry?.kind !== "directory") {
      throw fileMkdirWorkflowFailure("files mkdir target already exists and is not a directory", {
        phase: "pre_stat",
        before_kind: before.entry?.kind ?? null
      });
    }
    return {
      device_serial: before.serial,
      requested: {
        remote_path: request.remote_path
      },
      before: beforeSnapshot,
      mkdir: {
        method: "skipped_directory_exists",
        exit_code: null,
        command_duration_ms: 0
      },
      after: beforeSnapshot,
      created: false,
      verify: {
        policy: "directory_exists_after_mkdir",
        ok: true,
        attempts: 1,
        reason: "pre-mkdir stat found the target path is already a directory"
      },
      semantics: "idempotent_directory_create_with_parents"
    };
  }

  const mkdir = await driver.makeDirectory({
    deviceSerial: before.serial,
    remotePath: request.remote_path,
    timeoutMs: request.timeout_ms
  });
  const after = await statForMkdir(driver, {
    deviceSerial: mkdir.serial,
    remotePath: request.remote_path,
    timeoutMs: request.timeout_ms,
    phase: "verify"
  });
  const afterSnapshot = toEntrySnapshot(after);

  if (!after.exists || after.entry?.kind !== "directory") {
    throw fileMkdirWorkflowFailure("files mkdir did not verify target directory after mkdir", {
      phase: "verify",
      after_exists: after.exists,
      after_kind: after.entry?.kind ?? null
    });
  }

  return {
    device_serial: mkdir.serial,
    requested: {
      remote_path: request.remote_path
    },
    before: beforeSnapshot,
    mkdir: toMkdirOperation(mkdir),
    after: afterSnapshot,
    created: true,
    verify: {
      policy: "directory_exists_after_mkdir",
      ok: true,
      attempts: 2,
      reason: "post-mkdir stat found the target path is a directory; parent creation and pre-existing contents were not separately verified"
    },
    semantics: "idempotent_directory_create_with_parents"
  };
}

export async function removeFile(driver: AndroidDriver, request: FileRmRequest): Promise<FileRmResult> {
  const before = await statForRm(driver, {
    deviceSerial: request.device_serial,
    remotePath: request.remote_path,
    timeoutMs: request.timeout_ms,
    phase: "pre_stat"
  });
  const beforeSnapshot = toEntrySnapshot(before);

  if (!before.exists) {
    if (!request.missing_ok) {
      throw fileRmWorkflowFailure("files rm pre-check found no device path to remove", {
        phase: "pre_stat",
        reason: "missing"
      });
    }
    return {
      device_serial: before.serial,
      requested: {
        remote_path: request.remote_path,
        missing_ok: request.missing_ok
      },
      before: beforeSnapshot,
      remove: {
        method: "skipped_missing_ok",
        exit_code: null,
        command_duration_ms: 0
      },
      removed: false,
      after_exists: false,
      verify: {
        policy: "stat_absent_after_rm",
        ok: true,
        attempts: 1,
        reason: "pre-delete stat reported the device path was already absent"
      },
      semantics: "single_path_non_recursive_remove"
    };
  }

  if (before.entry?.kind === "directory") {
    throw fileRmWorkflowFailure("files rm refuses directories; recursive deletion is out of scope", {
      phase: "pre_stat",
      before_kind: "directory"
    });
  }
  if (before.entry?.kind !== "regular_file" && before.entry?.kind !== "symlink") {
    throw fileRmWorkflowFailure("files rm removes only regular files and symlinks", {
      phase: "pre_stat",
      before_kind: before.entry?.kind ?? null
    });
  }

  const removal = await driver.removeFile({
    deviceSerial: before.serial,
    remotePath: request.remote_path,
    timeoutMs: request.timeout_ms
  });
  const after = await statForRm(driver, {
    deviceSerial: removal.serial,
    remotePath: request.remote_path,
    timeoutMs: request.timeout_ms,
    phase: "verify"
  });

  if (after.exists) {
    throw fileRmWorkflowFailure("files rm did not verify device path absence after deletion", {
      phase: "verify",
      before_kind: before.entry?.kind ?? null,
      after_kind: after.entry?.kind ?? null
    });
  }

  return {
    device_serial: removal.serial,
    requested: {
      remote_path: request.remote_path,
      missing_ok: request.missing_ok
    },
    before: beforeSnapshot,
    remove: toRemoveOperation(removal),
    removed: true,
    after_exists: false,
    verify: {
      policy: "stat_absent_after_rm",
      ok: true,
      attempts: 2,
      reason: "pre-delete stat found one non-directory path, rm exited 0, and post-delete stat reported absence"
    },
    semantics: "single_path_non_recursive_remove"
  };
}

export async function listFiles(driver: AndroidDriver, request: FileListRequest): Promise<FileListResult> {
  const target = await statForList(driver, {
    deviceSerial: request.device_serial,
    remotePath: request.remote_path,
    timeoutMs: request.timeout_ms
  });
  const targetSnapshot = {
    ...toEntrySnapshot(target),
    query: toStatQuery(target)
  };

  if (!target.exists) {
    return {
      device_serial: target.serial,
      requested: {
        remote_path: request.remote_path,
        max_entries: request.max_entries
      },
      target: targetSnapshot,
      list: null,
      verify: {
        policy: "bounded_single_directory_listing",
        ok: true,
        attempts: 1,
        reason: "target stat reported the device path does not exist"
      },
      semantics: "read_only_single_directory_listing_not_recursive"
    };
  }

  if (target.entry?.kind !== "directory") {
    return {
      device_serial: target.serial,
      requested: {
        remote_path: request.remote_path,
        max_entries: request.max_entries
      },
      target: targetSnapshot,
      list: null,
      verify: {
        policy: "bounded_single_directory_listing",
        ok: true,
        attempts: 1,
        reason: "target stat reported the device path is not a directory"
      },
      semantics: "read_only_single_directory_listing_not_recursive"
    };
  }

  const listing = await driver.listDirectory({
    deviceSerial: target.serial,
    remotePath: request.remote_path,
    maxEntries: request.max_entries,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: listing.serial,
    requested: {
      remote_path: request.remote_path,
      max_entries: request.max_entries
    },
    target: targetSnapshot,
    list: toListPayload(listing),
    verify: {
      policy: "bounded_single_directory_listing",
      ok: true,
      attempts: 2,
      reason: listing.truncated
        ? "target stat found a directory and bounded listing returned the first entries with truncation"
        : "target stat found a directory and bounded listing completed"
    },
    semantics: "read_only_single_directory_listing_not_recursive"
  };
}

function toPushTransfer(transfer: DriverFileTransferResult): FilePushResult["transfer"] {
  return {
    method: "adb_push",
    exit_code: transfer.exitCode,
    command_duration_ms: transfer.durationMs
  };
}

function toPullTransfer(transfer: DriverFileTransferResult): FilePullResult["transfer"] {
  return {
    method: "adb_pull",
    exit_code: transfer.exitCode,
    command_duration_ms: transfer.durationMs
  };
}

function toStatQuery(stat: DriverFileStatResult): FileStatResult["query"] {
  return {
    method: "device_stat",
    exit_code: stat.exitCode,
    command_duration_ms: stat.durationMs
  };
}

function toHashPayload(hash: DriverFileHashResult): NonNullable<FileHashResult["hash"]> {
  if (hash.algorithm === "sha256") {
    return {
      algorithm: "sha256",
      method: "device_sha256sum",
      digest: hash.digest,
      exit_code: hash.exitCode,
      command_duration_ms: hash.durationMs
    };
  }

  return {
    algorithm: "md5",
    method: "device_md5sum",
    digest: hash.digest,
    exit_code: hash.exitCode,
    command_duration_ms: hash.durationMs
  };
}

function toListPayload(listing: DriverFileListResult): NonNullable<FileListResult["list"]> {
  return {
    method: "device_find_stat",
    exit_code: listing.exitCode,
    command_duration_ms: listing.durationMs,
    entries: listing.entries.map(toListEntry),
    count: listing.entries.length,
    truncated: listing.truncated
  };
}

function toListEntry(entry: DriverFileListEntry): NonNullable<FileListResult["list"]>["entries"][number] {
  return {
    name: entry.name,
    path: entry.path,
    kind: entry.kind,
    bytes: entry.bytes,
    modified_unix_ms: entry.modifiedUnixMs
  };
}

function toRemoveOperation(removal: DriverFileRemoveResult): FileRmResult["remove"] {
  return {
    method: "device_rm",
    exit_code: removal.exitCode,
    command_duration_ms: removal.durationMs
  };
}

function toMkdirOperation(mkdir: DriverFileMkdirResult): FileMkdirResult["mkdir"] {
  return {
    method: "device_mkdir",
    exit_code: mkdir.exitCode,
    command_duration_ms: mkdir.durationMs
  };
}

function adbExitSuccessVerify(reason: string): FilePushResult["verify"] {
  return {
    policy: "adb_exit_success",
    ok: true,
    attempts: 1,
    reason
  };
}

async function statForRm(
  driver: AndroidDriver,
  request: { deviceSerial: string; remotePath: string; timeoutMs: number; phase: "pre_stat" | "verify" }
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
    throw fileRmWorkflowFailure(
      request.phase === "pre_stat" ? "files rm pre-check stat failed" : "files rm verification stat failed",
      {
        phase: request.phase,
        cause_code: cause?.code ?? "INTERNAL",
        cause_message: cause?.message ?? "stat failed"
      }
    );
  }
}

function fileRmWorkflowFailure(message: string, details: Record<string, unknown>): AutophoneError {
  return new AutophoneError({
    code: "FILE_RM_FAILED",
    message,
    retriable: false,
    details
  });
}

async function statForMkdir(
  driver: AndroidDriver,
  request: { deviceSerial: string; remotePath: string; timeoutMs: number; phase: "pre_stat" | "verify" }
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
    throw fileMkdirWorkflowFailure(
      request.phase === "pre_stat" ? "files mkdir pre-check stat failed" : "files mkdir verification stat failed",
      {
        phase: request.phase,
        cause_code: cause?.code ?? "INTERNAL",
        cause_message: cause?.message ?? "stat failed"
      }
    );
  }
}

function fileMkdirWorkflowFailure(message: string, details: Record<string, unknown>): AutophoneError {
  return new AutophoneError({
    code: "FILE_MKDIR_FAILED",
    message,
    retriable: false,
    details
  });
}

async function statForList(
  driver: AndroidDriver,
  request: { deviceSerial?: string | undefined; remotePath: string; timeoutMs: number }
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
    throw new AutophoneError({
      code: "FILE_LIST_FAILED",
      message: "files list target stat failed",
      retriable: false,
      details: {
        phase: "target_stat",
        cause_code: cause?.code ?? "INTERNAL",
        cause_message: cause?.message ?? "stat failed"
      }
    });
  }
}

async function statForHash(
  driver: AndroidDriver,
  request: { deviceSerial?: string | undefined; remotePath: string; timeoutMs: number }
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
    throw fileHashWorkflowFailure("files hash target stat failed", {
      phase: "target_stat",
      cause_code: cause?.code ?? "INTERNAL",
      cause_message: cause?.message ?? "stat failed"
    });
  }
}

async function runHashCommand(
  driver: AndroidDriver,
  request: FileHashRequest,
  deviceSerial: string
): Promise<DriverFileHashResult> {
  try {
    return await driver.hashFile({
      deviceSerial,
      remotePath: request.remote_path,
      algorithm: request.algorithm,
      timeoutMs: request.timeout_ms
    });
  } catch (error) {
    if (error instanceof AutophoneError && isTargetDeviceFailure(error.code)) {
      throw error;
    }
    const cause = error instanceof AutophoneError ? error : undefined;
    throw fileHashWorkflowFailure("files hash command failed", {
      phase: "hash",
      cause_code: cause?.code ?? "INTERNAL",
      cause_message: cause?.message ?? "hash command failed"
    });
  }
}

function fileHashWorkflowFailure(message: string, details: Record<string, unknown>): AutophoneError {
  return new AutophoneError({
    code: "FILE_HASH_FAILED",
    message,
    retriable: false,
    details
  });
}
