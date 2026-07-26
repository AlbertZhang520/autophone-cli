import { describe, expect, it, vi } from "vitest";
import {
  AutophoneError,
  type AppCurrentResult,
  type DeviceDetailsResult,
  type DeviceReadyState,
  type Point,
  type Snapshot
} from "../contracts/index.js";
import {
  changeAppPermission,
  clearAppData,
  controlStatusBar,
  currentApp,
  currentDeviceUser,
  appActivities,
  appLinks,
  appOpsGet,
  appPackageInfo,
  appGraphics,
  appMemory,
  appPids,
  DEVICE_VOLUME_STREAMS,
  deviceDetails,
  deviceOrientation,
  doubleTap,
  drag,
  dumpLogs,
  encodeTextForAdbInput,
  ensureDeviceReady,
  find,
  getDeviceAccessibility,
  getDeviceAnimations,
  getDeviceBattery,
  getDeviceTime,
  getDeviceBrightness,
  getDeviceIme,
  getDeviceLocale,
  getDeviceNotifications,
  getDeviceRinger,
  getDeviceNetwork,
  getDeviceScreen,
  getDeviceStorage,
  getDeviceVolume,
  installApp,
  inspectApp,
  inspectAppPermission,
  keyPress,
  listDeviceUsers,
  listDevices,
  listApps,
  launchApp,
  longPress,
  openUrl,
  planScrollGesture,
  resolveUrl,
  screenshot,
  scroll,
  scrollUntil,
  setDeviceAnimations,
  setDeviceOrientation,
  startApp,
  statusBarIcons,
  stopApp,
  tap,
  textClear,
  textInput,
  uninstallApp,
  waitForApp,
  waitForUi,
  type AndroidDriver,
  type DriverAppActivitiesResult,
  type DriverAppListResult,
  type DriverAppGraphicsResult,
  type DriverAppLinksResult,
  type DriverAppOpsGetResult,
  type DriverAppPackageInfoResult,
  type DriverAppMemoryResult,
  type DriverPackagePidSnapshotResult,
  type DriverDeviceCurrentUserResult,
  type DriverDeviceAccessibilityResult,
  type DriverDeviceAnimationsResult,
  type DriverDeviceAnimationsSetResult,
  type DriverDeviceBatteryResult,
  type DriverDeviceTimeResult,
  type DriverDeviceBrightnessResult,
  type DriverDeviceImeResult,
  type DriverDeviceLocaleResult,
  type DriverDeviceNetworkResult,
  type DriverDeviceStorageResult,
  type DriverDeviceNotificationsResult,
  type DriverDeviceOrientationResult,
  type DriverDeviceScreenResult,
  type DriverDeviceUsersResult,
  type DriverResolveUrlResult,
  type DriverRingerGetResult,
  type DriverUserRotationPolicy,
  type DriverDevice,
  type DriverAppStartResult,
  type ObserveOptions
} from "./runtime.js";
import { buildFilePullResult, copyFile, hashFile, listFiles, makeDirectory, moveFile, pullFile, pushFile, removeFile, statFile } from "./files.js";
import { buildScreenrecordResult, screenrecord } from "./screenrecord.js";
import {
  accessibilityDriverResult,
  animationsDriverResult,
  animationsSetDriverResult,
  appActivitiesDriverResult,
  appActivityRecord,
  appCurrentState,
  appLinksDriverResult,
  appOpsDriverResult,
  batteryDriverResult,
  brightnessDriverResult,
  delay,
  deviceDetailsFixture,
  emptyGraphicsSummary,
  emptyMemorySnapshot,
  graphicsDriverResult,
  graphicsSummary,
  imeDriverResult,
  localeDriverResult,
  makeDriver,
  memoryDriverResult,
  memorySnapshot,
  networkDriverResult,
  notificationsDriverResult,
  orientationDriverResult,
  packageInfoDriverResult,
  packageInfoRecord,
  permissionInspectDriverResult,
  pngFixture,
  readyState,
  resolveUrlDriverResult,
  ringerDriverResult,
  screenDriverResult,
  snapshot,
  storageDriverResult,
  timeDriverResult,
  userRotationPolicy
} from "./runtime-test-utils.test-support.js";describe("files runtime", () => {

  it("copies one regular file without clobbering and verifies source preservation plus destination metadata", async () => {
    const driver = makeDriver([]);
    driver.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1_782_751_000_000 },
        exitCode: 0,
        durationMs: 2
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: false,
        entry: null,
        exitCode: 1,
        durationMs: 3
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1_782_751_000_000 },
        exitCode: 0,
        durationMs: 4
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1_782_751_001_000 },
        exitCode: 0,
        durationMs: 5
      });
    driver.copyFile.mockResolvedValueOnce({ serial: "resolved-serial", exitCode: 0, durationMs: 6 });

    await expect(
      copyFile(driver, {
        source_path: "/data/local/tmp/source.txt",
        dest_path: "/data/local/tmp/dest.txt",
        timeout_ms: 120_000,
        device_serial: "emulator-5554"
      })
    ).resolves.toEqual({
      device_serial: "resolved-serial",
      requested: {
        source_path: "/data/local/tmp/source.txt",
        dest_path: "/data/local/tmp/dest.txt"
      },
      before_source: {
        exists: true,
        entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1_782_751_000_000 }
      },
      before_dest: { exists: false, entry: null },
      copy: { method: "device_cp_no_clobber", exit_code: 0, command_duration_ms: 6 },
      after_source: {
        exists: true,
        entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1_782_751_000_000 }
      },
      after_dest: {
        exists: true,
        entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1_782_751_001_000 }
      },
      copied: true,
      verify: {
        policy: "source_preserved_dest_present_after_copy",
        ok: true,
        attempts: 4,
        reason: "post-copy stats found the source preserved and destination metadata matching the source kind and bytes; the stat-stat-cp-stat-stat sequence is not atomic and is not a content-integrity proof"
      },
      semantics: "single_regular_file_non_clobber_copy"
    });
    expect(driver.copyFile).toHaveBeenCalledWith({
      deviceSerial: "resolved-serial",
      sourcePath: "/data/local/tmp/source.txt",
      destPath: "/data/local/tmp/dest.txt",
      timeoutMs: 120_000
    });
  });

  it("refuses files copy before cp when source is missing, non-regular, or destination exists", async () => {
    const missing = makeDriver([]);
    missing.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: false,
      entry: null,
      exitCode: 1,
      durationMs: 1
    });
    await expect(
      copyFile(missing, {
        source_path: "/data/local/tmp/missing.txt",
        dest_path: "/data/local/tmp/dest.txt",
        timeout_ms: 120_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({ code: "FILE_COPY_FAILED", details: { phase: "pre_source", reason: "missing" } });
    expect(missing.copyFile).not.toHaveBeenCalled();

    const symlink = makeDriver([]);
    symlink.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: true,
      entry: { kind: "symlink" as const, bytes: 43, modifiedUnixMs: 1 },
      exitCode: 0,
      durationMs: 1
    });
    await expect(
      copyFile(symlink, {
        source_path: "/data/local/tmp/link",
        dest_path: "/data/local/tmp/dest",
        timeout_ms: 120_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({ code: "FILE_COPY_FAILED", details: { phase: "pre_source", source_kind: "symlink" } });
    expect(symlink.copyFile).not.toHaveBeenCalled();

    const destExists = makeDriver([]);
    destExists.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1 },
        exitCode: 0,
        durationMs: 1
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 7, modifiedUnixMs: 1 },
        exitCode: 0,
        durationMs: 1
      });
    await expect(
      copyFile(destExists, {
        source_path: "/data/local/tmp/source.txt",
        dest_path: "/data/local/tmp/existing.txt",
        timeout_ms: 120_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({ code: "FILE_COPY_FAILED", details: { phase: "pre_dest", dest_kind: "regular_file" } });
    expect(destExists.copyFile).not.toHaveBeenCalled();
  });

  it("fails files copy on inconsistent post-copy states", async () => {
    const missingDest = makeDriver([]);
    missingDest.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1 },
        exitCode: 0,
        durationMs: 1
      })
      .mockResolvedValueOnce({ serial: "resolved-serial", exists: false, entry: null, exitCode: 1, durationMs: 1 })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1 },
        exitCode: 0,
        durationMs: 1
      })
      .mockResolvedValueOnce({ serial: "resolved-serial", exists: false, entry: null, exitCode: 1, durationMs: 1 });
    missingDest.copyFile.mockResolvedValueOnce({ serial: "resolved-serial", exitCode: 0, durationMs: 2 });
    await expect(
      copyFile(missingDest, {
        source_path: "/data/local/tmp/source.txt",
        dest_path: "/data/local/tmp/dest.txt",
        timeout_ms: 120_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({
      code: "FILE_COPY_FAILED",
      message: "files copy did not verify source preservation and regular destination after cp",
      details: { phase: "verify", dest_exists: false }
    });

    const bytesMismatch = makeDriver([]);
    bytesMismatch.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1 },
        exitCode: 0,
        durationMs: 1
      })
      .mockResolvedValueOnce({ serial: "resolved-serial", exists: false, entry: null, exitCode: 1, durationMs: 1 })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1 },
        exitCode: 0,
        durationMs: 1
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 13, modifiedUnixMs: 1 },
        exitCode: 0,
        durationMs: 1
      });
    bytesMismatch.copyFile.mockResolvedValueOnce({ serial: "resolved-serial", exitCode: 0, durationMs: 2 });
    await expect(
      copyFile(bytesMismatch, {
        source_path: "/data/local/tmp/source.txt",
        dest_path: "/data/local/tmp/dest.txt",
        timeout_ms: 120_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({
      code: "FILE_COPY_FAILED",
      message: "files copy destination metadata did not match source metadata after cp",
      details: { phase: "verify", before_source_bytes: 12, dest_bytes: 13 }
    });
  });

  it("reports destination state after files copy command failures without cleanup", async () => {
    const driver = makeDriver([]);
    driver.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1 },
        exitCode: 0,
        durationMs: 1
      })
      .mockResolvedValueOnce({ serial: "resolved-serial", exists: false, entry: null, exitCode: 1, durationMs: 1 })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 5, modifiedUnixMs: 2 },
        exitCode: 0,
        durationMs: 1
      });
    driver.copyFile.mockRejectedValueOnce(
      new AutophoneError({
        code: "FILE_COPY_FAILED",
        message: "cp: partial write",
        retriable: false
      })
    );

    await expect(
      copyFile(driver, {
        source_path: "/data/local/tmp/source.txt",
        dest_path: "/data/local/tmp/dest.txt",
        timeout_ms: 120_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({
      code: "FILE_COPY_FAILED",
      message: "files copy command failed; destination cleanup is left to the caller",
      details: {
        phase: "copy",
        cause_code: "FILE_COPY_FAILED",
        dest_after_failure: {
          observed: true,
          exists: true,
          entry: { kind: "regular_file", bytes: 5, modified_unix_ms: 2 }
        }
      }
    });
  });

  it("moves one regular file without clobbering and verifies source absence plus destination metadata", async () => {
    const driver = makeDriver([]);
    driver.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1_782_751_000_000 },
        exitCode: 0,
        durationMs: 2
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: false,
        entry: null,
        exitCode: 1,
        durationMs: 3
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: false,
        entry: null,
        exitCode: 1,
        durationMs: 4
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1_782_751_001_000 },
        exitCode: 0,
        durationMs: 5
      });
    driver.moveFile.mockResolvedValueOnce({ serial: "resolved-serial", exitCode: 0, durationMs: 6 });

    await expect(
      moveFile(driver, {
        source_path: "/data/local/tmp/source.txt",
        dest_path: "/data/local/tmp/dest.txt",
        confirm_source: "/data/local/tmp/source.txt",
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).resolves.toEqual({
      device_serial: "resolved-serial",
      requested: {
        source_path: "/data/local/tmp/source.txt",
        dest_path: "/data/local/tmp/dest.txt"
      },
      before_source: {
        exists: true,
        entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1_782_751_000_000 }
      },
      before_dest: { exists: false, entry: null },
      move: { method: "device_mv", exit_code: 0, command_duration_ms: 6 },
      after_source: { exists: false, entry: null },
      after_dest: {
        exists: true,
        entry: { kind: "regular_file", bytes: 12, modified_unix_ms: 1_782_751_001_000 }
      },
      moved: true,
      verify: {
        policy: "source_absent_dest_present_after_move",
        ok: true,
        attempts: 4,
        reason: "post-move stats found the source absent and destination metadata matching the source kind and bytes; the stat-stat-mv-stat-stat sequence is not atomic and is not a content-integrity proof"
      },
      semantics: "single_non_directory_path_non_clobber_move"
    });
    expect(driver.moveFile).toHaveBeenCalledWith({
      deviceSerial: "resolved-serial",
      sourcePath: "/data/local/tmp/source.txt",
      destPath: "/data/local/tmp/dest.txt",
      timeoutMs: 10_000
    });
  });

  it("moves symlinks as symlinks", async () => {
    const driver = makeDriver([]);
    driver.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "symlink" as const, bytes: 43, modifiedUnixMs: 1_782_751_000_000 },
        exitCode: 0,
        durationMs: 1
      })
      .mockResolvedValueOnce({ serial: "resolved-serial", exists: false, entry: null, exitCode: 1, durationMs: 1 })
      .mockResolvedValueOnce({ serial: "resolved-serial", exists: false, entry: null, exitCode: 1, durationMs: 1 })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "symlink" as const, bytes: 43, modifiedUnixMs: 1_782_751_001_000 },
        exitCode: 0,
        durationMs: 1
      });
    driver.moveFile.mockResolvedValueOnce({ serial: "resolved-serial", exitCode: 0, durationMs: 2 });

    await expect(
      moveFile(driver, {
        source_path: "/data/local/tmp/link",
        dest_path: "/data/local/tmp/link-moved",
        confirm_source: "/data/local/tmp/link",
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).resolves.toMatchObject({
      before_source: { entry: { kind: "symlink", bytes: 43 } },
      after_dest: { entry: { kind: "symlink", bytes: 43 } },
      moved: true
    });
  });

  it("refuses files move before mv when source is missing, a directory, or destination exists", async () => {
    const missing = makeDriver([]);
    missing.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: false,
      entry: null,
      exitCode: 1,
      durationMs: 1
    });
    await expect(
      moveFile(missing, {
        source_path: "/data/local/tmp/missing.txt",
        dest_path: "/data/local/tmp/dest.txt",
        confirm_source: "/data/local/tmp/missing.txt",
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({ code: "FILE_MOVE_FAILED", details: { phase: "pre_source", reason: "missing" } });
    expect(missing.moveFile).not.toHaveBeenCalled();

    const directory = makeDriver([]);
    directory.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: true,
      entry: { kind: "directory" as const, bytes: 3452, modifiedUnixMs: 1 },
      exitCode: 0,
      durationMs: 1
    });
    await expect(
      moveFile(directory, {
        source_path: "/data/local/tmp/dir",
        dest_path: "/data/local/tmp/dest",
        confirm_source: "/data/local/tmp/dir",
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({ code: "FILE_MOVE_FAILED", details: { phase: "pre_source", source_kind: "directory" } });
    expect(directory.moveFile).not.toHaveBeenCalled();

    const destExists = makeDriver([]);
    destExists.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1 },
        exitCode: 0,
        durationMs: 1
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "directory" as const, bytes: 3452, modifiedUnixMs: 1 },
        exitCode: 0,
        durationMs: 1
      });
    await expect(
      moveFile(destExists, {
        source_path: "/data/local/tmp/source.txt",
        dest_path: "/data/local/tmp/existing-dir",
        confirm_source: "/data/local/tmp/source.txt",
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({ code: "FILE_MOVE_FAILED", details: { phase: "pre_dest", dest_kind: "directory" } });
    expect(destExists.moveFile).not.toHaveBeenCalled();
  });

  it("fails files move on inconsistent post-move states", async () => {
    const intoDirectoryRace = makeDriver([]);
    intoDirectoryRace.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1 },
        exitCode: 0,
        durationMs: 1
      })
      .mockResolvedValueOnce({ serial: "resolved-serial", exists: false, entry: null, exitCode: 1, durationMs: 1 })
      .mockResolvedValueOnce({ serial: "resolved-serial", exists: false, entry: null, exitCode: 1, durationMs: 1 })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "directory" as const, bytes: 3452, modifiedUnixMs: 1 },
        exitCode: 0,
        durationMs: 1
      });
    intoDirectoryRace.moveFile.mockResolvedValueOnce({ serial: "resolved-serial", exitCode: 0, durationMs: 2 });
    await expect(
      moveFile(intoDirectoryRace, {
        source_path: "/data/local/tmp/source.txt",
        dest_path: "/data/local/tmp/dest",
        confirm_source: "/data/local/tmp/source.txt",
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({
      code: "FILE_MOVE_FAILED",
      message: "files move did not verify source absence and destination kind after mv",
      details: { phase: "verify", dest_kind: "directory" }
    });

    const bytesMismatch = makeDriver([]);
    bytesMismatch.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1 },
        exitCode: 0,
        durationMs: 1
      })
      .mockResolvedValueOnce({ serial: "resolved-serial", exists: false, entry: null, exitCode: 1, durationMs: 1 })
      .mockResolvedValueOnce({ serial: "resolved-serial", exists: false, entry: null, exitCode: 1, durationMs: 1 })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 13, modifiedUnixMs: 1 },
        exitCode: 0,
        durationMs: 1
      });
    bytesMismatch.moveFile.mockResolvedValueOnce({ serial: "resolved-serial", exitCode: 0, durationMs: 2 });
    await expect(
      moveFile(bytesMismatch, {
        source_path: "/data/local/tmp/source.txt",
        dest_path: "/data/local/tmp/dest.txt",
        confirm_source: "/data/local/tmp/source.txt",
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({
      code: "FILE_MOVE_FAILED",
      message: "files move destination metadata did not match source metadata after mv",
      details: { phase: "verify", source_bytes: 12, dest_bytes: 13 }
    });
  });

  it("removes one non-directory device path and verifies absence", async () => {
    const driver = makeDriver([]);
    driver.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "symlink" as const, bytes: 43, modifiedUnixMs: 1_782_751_000_000 },
        exitCode: 0,
        durationMs: 2
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: false,
        entry: null,
        exitCode: 1,
        durationMs: 3
      });
    driver.removeFile.mockResolvedValueOnce({ serial: "resolved-serial", exitCode: 0, durationMs: 4 });

    await expect(
      removeFile(driver, {
        remote_path: "/sdcard/Download/link.txt",
        confirm_remote: "/sdcard/Download/link.txt",
        missing_ok: false,
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).resolves.toEqual({
      device_serial: "resolved-serial",
      requested: {
        remote_path: "/sdcard/Download/link.txt",
        missing_ok: false
      },
      before: {
        exists: true,
        entry: {
          kind: "symlink",
          bytes: 43,
          modified_unix_ms: 1_782_751_000_000
        }
      },
      remove: {
        method: "device_rm",
        exit_code: 0,
        command_duration_ms: 4
      },
      removed: true,
      after_exists: false,
      verify: {
        policy: "stat_absent_after_rm",
        ok: true,
        attempts: 2,
        reason: "pre-delete stat found one non-directory path, rm exited 0, and post-delete stat reported absence"
      },
      semantics: "single_path_non_recursive_remove"
    });
    expect(driver.removeFile).toHaveBeenCalledWith({
      deviceSerial: "resolved-serial",
      remotePath: "/sdcard/Download/link.txt",
      timeoutMs: 10_000
    });
    expect(driver.statFile).toHaveBeenLastCalledWith({
      deviceSerial: "resolved-serial",
      remotePath: "/sdcard/Download/link.txt",
      timeoutMs: 10_000
    });
  });

  it("treats already missing files rm as success only with missing_ok", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "emulator-5554",
      exists: false,
      entry: null,
      exitCode: 1,
      durationMs: 1
    });

    await expect(
      removeFile(driver, {
        remote_path: "/sdcard/Download/missing.txt",
        confirm_remote: "/sdcard/Download/missing.txt",
        missing_ok: true,
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).resolves.toMatchObject({
      removed: false,
      remove: {
        method: "skipped_missing_ok",
        exit_code: null,
        command_duration_ms: 0
      },
      verify: {
        attempts: 1,
        reason: "pre-delete stat reported the device path was already absent"
      }
    });
    expect(driver.removeFile).not.toHaveBeenCalled();
  });

  it("fails files rm when a path is missing without missing_ok", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "emulator-5554",
      exists: false,
      entry: null,
      exitCode: 1,
      durationMs: 1
    });

    await expect(
      removeFile(driver, {
        remote_path: "/sdcard/Download/missing.txt",
        confirm_remote: "/sdcard/Download/missing.txt",
        missing_ok: false,
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({
      code: "FILE_RM_FAILED",
      details: { phase: "pre_stat", reason: "missing" }
    });
    expect(driver.removeFile).not.toHaveBeenCalled();
  });

  it("refuses directory files rm before adb rm", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "emulator-5554",
      exists: true,
      entry: { kind: "directory" as const, bytes: 3452, modifiedUnixMs: 1_782_751_000_000 },
      exitCode: 0,
      durationMs: 1
    });

    await expect(
      removeFile(driver, {
        remote_path: "/sdcard/Download/dir",
        confirm_remote: "/sdcard/Download/dir",
        missing_ok: false,
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({
      code: "FILE_RM_FAILED",
      message: "files rm refuses directories; recursive deletion is out of scope",
      details: { phase: "pre_stat", before_kind: "directory" }
    });
    expect(driver.removeFile).not.toHaveBeenCalled();
  });

  it("refuses special files rm before adb rm", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "emulator-5554",
      exists: true,
      entry: { kind: "other" as const, bytes: 0, modifiedUnixMs: 1_782_751_000_000 },
      exitCode: 0,
      durationMs: 1
    });

    await expect(
      removeFile(driver, {
        remote_path: "/dev/null",
        confirm_remote: "/dev/null",
        missing_ok: false,
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({
      code: "FILE_RM_FAILED",
      message: "files rm removes only regular files and symlinks",
      details: { phase: "pre_stat", before_kind: "other" }
    });
    expect(driver.removeFile).not.toHaveBeenCalled();
  });

  it("fails files rm when post-delete stat still reports the path", async () => {
    const driver = makeDriver([]);
    driver.statFile
      .mockResolvedValueOnce({
        serial: "emulator-5554",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1_782_751_000_000 },
        exitCode: 0,
        durationMs: 1
      })
      .mockResolvedValueOnce({
        serial: "emulator-5554",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1_782_751_000_000 },
        exitCode: 0,
        durationMs: 1
      });

    await expect(
      removeFile(driver, {
        remote_path: "/sdcard/Download/still-there.txt",
        confirm_remote: "/sdcard/Download/still-there.txt",
        missing_ok: false,
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({
      code: "FILE_RM_FAILED",
      details: { phase: "verify", before_kind: "regular_file", after_kind: "regular_file" }
    });
  });

  it("wraps non-target stat failures during files rm pre-check and verification", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockRejectedValueOnce(
      new AutophoneError({
        code: "FILE_STAT_FAILED",
        message: "stat permission denied for <redacted-path>",
        retriable: false
      })
    );

    await expect(
      removeFile(driver, {
        remote_path: "/sdcard/Download/private.txt",
        confirm_remote: "/sdcard/Download/private.txt",
        missing_ok: false,
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({
      code: "FILE_RM_FAILED",
      message: "files rm pre-check stat failed",
      details: {
        phase: "pre_stat",
        cause_code: "FILE_STAT_FAILED",
        cause_message: "stat permission denied for <redacted-path>"
      }
    });
    expect(driver.removeFile).not.toHaveBeenCalled();

    driver.statFile
      .mockResolvedValueOnce({
        serial: "emulator-5554",
        exists: true,
        entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1_782_751_000_000 },
        exitCode: 0,
        durationMs: 1
      })
      .mockRejectedValueOnce(
        new AutophoneError({
          code: "FILE_STAT_FAILED",
          message: "post stat malformed output for <redacted-path>",
          retriable: false
        })
      );

    await expect(
      removeFile(driver, {
        remote_path: "/sdcard/Download/private.txt",
        confirm_remote: "/sdcard/Download/private.txt",
        missing_ok: false,
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({
      code: "FILE_RM_FAILED",
      message: "files rm verification stat failed",
      details: {
        phase: "verify",
        cause_code: "FILE_STAT_FAILED",
        cause_message: "post stat malformed output for <redacted-path>"
      }
    });
  });

  it("propagates target device failures during files rm stat checks", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockRejectedValueOnce(
      new AutophoneError({
        code: "DEVICE_OFFLINE",
        message: "adb device is offline",
        retriable: true
      })
    );

    await expect(
      removeFile(driver, {
        remote_path: "/sdcard/Download/private.txt",
        confirm_remote: "/sdcard/Download/private.txt",
        missing_ok: false,
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
    expect(driver.removeFile).not.toHaveBeenCalled();
  });
});
