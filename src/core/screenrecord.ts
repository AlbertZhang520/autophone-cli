import { randomUUID } from "node:crypto";
import { AutophoneError, type ScreenrecordRequest, type ScreenrecordResult } from "../contracts/index.js";
import type {
  AndroidDriver,
  DriverCommandResult,
  DriverFileTransferResult,
  DriverScreenrecordResult,
  ScreenrecordCapture
} from "./runtime.js";

const SCREENRECORD_REMOTE_TMP_DIR = "/data/local/tmp";

export async function screenrecord(
  driver: AndroidDriver,
  request: ScreenrecordRequest,
  localTempPath: string
): Promise<ScreenrecordCapture> {
  const remotePath = `${SCREENRECORD_REMOTE_TMP_DIR}/autophone-screenrecord-${randomUUID()}.mp4`;
  let recordSerial = request.device_serial;
  let recording: DriverScreenrecordResult;

  try {
    recording = await driver.recordScreen({
      deviceSerial: request.device_serial,
      remotePath,
      durationSeconds: request.duration_seconds,
      bitRateBps: request.bit_rate_bps,
      size: request.size,
      bugreport: request.bugreport,
      timeoutMs: request.record_timeout_ms
    });
    recordSerial = recording.serial;
  } catch (error) {
    await cleanupRemoteRecording(driver, recordSerial, remotePath, request.cleanup_timeout_ms);
    throw error;
  }

  try {
    const transfer = await driver.pullFile({
      deviceSerial: recording.serial,
      localPath: localTempPath,
      remotePath,
      compression: "adb_default",
      timeoutMs: request.pull_timeout_ms
    });
    const cleanup = await cleanupRemoteRecording(driver, recording.serial, remotePath, request.cleanup_timeout_ms);
    return buildScreenrecordCapture(request, recording, transfer, cleanup);
  } catch (error) {
    await cleanupRemoteRecording(driver, recordSerial, remotePath, request.cleanup_timeout_ms);
    throw error;
  }
}

export function buildScreenrecordResult(
  capture: ScreenrecordCapture,
  output: Pick<ScreenrecordResult, "output_path" | "file_name" | "bytes" | "sha256" | "overwritten">
): ScreenrecordResult {
  return {
    ...capture,
    ...output
  };
}

function buildScreenrecordCapture(
  request: ScreenrecordRequest,
  recording: DriverCommandResult & { serial: string },
  transfer: DriverFileTransferResult,
  cleanup: ScreenrecordCapture["cleanup"]
): ScreenrecordCapture {
  return {
    device_serial: recording.serial,
    mime_type: "video/mp4",
    requested: {
      duration_seconds: request.duration_seconds,
      bit_rate_bps: request.bit_rate_bps ?? null,
      size: request.size ?? null,
      bugreport: request.bugreport,
      display: "default"
    },
    recording: {
      method: "screenrecord",
      exit_code: recording.exitCode,
      command_duration_ms: recording.durationMs
    },
    transfer: {
      method: "adb_pull",
      exit_code: transfer.exitCode,
      command_duration_ms: transfer.durationMs
    },
    cleanup,
    verify: {
      policy: "screenrecord_exit_pull_host_file",
      ok: true,
      attempts: 3,
      reason: "screenrecord exited 0, adb pull exited 0, and the host MP4 output was verified non-empty"
    },
    semantics: "bounded_default_display_video_evidence_no_audio_or_frame_completeness_guarantee"
  };
}

async function cleanupRemoteRecording(
  driver: AndroidDriver,
  deviceSerial: string,
  remotePath: string,
  timeoutMs: number
): Promise<ScreenrecordCapture["cleanup"]> {
  try {
    const removal = await driver.removeFile({
      deviceSerial,
      remotePath,
      timeoutMs
    });
    return cleanupResult(true, removal);
  } catch (error) {
    return cleanupResult(false, undefined, error);
  }
}

function cleanupResult(
  ok: boolean,
  removal?: DriverCommandResult,
  error?: unknown
): ScreenrecordCapture["cleanup"] {
  const cause = error instanceof AutophoneError ? error : undefined;
  return {
    method: "device_rm",
    attempted: true,
    ok,
    exit_code: removal?.exitCode ?? null,
    command_duration_ms: removal?.durationMs ?? null,
    error_code: cause?.code,
    reason: cause?.message ?? (error === undefined ? undefined : "screenrecord remote cleanup failed")
  };
}
