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
  it("pushes one local file through the driver with adb-exit verification semantics", async () => {
    const driver = makeDriver([]);

    await expect(
      pushFile(driver, {
        local_path: "/tmp/private/empty.txt",
        local_file: {
          file_name: "empty.txt",
          bytes: 0,
          sha256: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        },
        remote_path: "/sdcard/Download/empty.txt",
        compression: "zstd",
        timeout_ms: 120_000,
        device_serial: "emulator-5554"
      })
    ).resolves.toEqual({
      device_serial: "emulator-5554",
      requested: {
        local: {
          file_name: "empty.txt",
          bytes: 0,
          sha256: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        },
        remote_path: "/sdcard/Download/empty.txt",
        compression: "zstd"
      },
      transfer: {
        method: "adb_push",
        exit_code: 0,
        command_duration_ms: 1
      },
      verify: {
        policy: "adb_exit_success",
        ok: true,
        attempts: 1,
        reason: "adb push exited 0; remote file contents were not independently hashed"
      }
    });
    expect(driver.pushFile).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      localPath: "/tmp/private/empty.txt",
      remotePath: "/sdcard/Download/empty.txt",
      compression: "zstd",
      timeoutMs: 120_000
    });
  });

  it("pulls one device file through the driver and builds the final output metadata separately", async () => {
    const driver = makeDriver([]);
    const transfer = await pullFile(
      driver,
      {
        remote_path: "/sdcard/Download/report.txt",
        output_path: "/tmp/private/report.txt",
        overwrite: false,
        compression: "adb_default",
        timeout_ms: 120_000,
        device_serial: "emulator-5554"
      },
      "/tmp/private/.report.txt.tmp"
    );

    expect(transfer).toEqual({
      device_serial: "emulator-5554",
      requested: {
        remote_path: "/sdcard/Download/report.txt",
        compression: "adb_default"
      },
      transfer: {
        method: "adb_pull",
        exit_code: 0,
        command_duration_ms: 1
      },
      verify: {
        policy: "adb_exit_success",
        ok: true,
        attempts: 1,
        reason: "adb pull exited 0; remote file contents were not independently hashed"
      }
    });
    expect(driver.pullFile).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      localPath: "/tmp/private/.report.txt.tmp",
      remotePath: "/sdcard/Download/report.txt",
      compression: "adb_default",
      timeoutMs: 120_000
    });
    expect(
      buildFilePullResult(transfer, {
        file_name: "report.txt",
        bytes: 12,
        sha256: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        overwritten: false
      })
    ).toMatchObject({
      output: {
        file_name: "report.txt",
        bytes: 12,
        overwritten: false
      }
    });
  });

  it("stats one device path through the driver with read-only parse semantics", async () => {
    const driver = makeDriver([]);

    await expect(
      statFile(driver, {
        remote_path: "/sdcard/Download/report.txt",
        timeout_ms: 10_000
      })
    ).resolves.toEqual({
      device_serial: "emulator-5554",
      requested: {
        remote_path: "/sdcard/Download/report.txt"
      },
      exists: true,
      entry: {
        kind: "regular_file",
        bytes: 12,
        modified_unix_ms: 1_782_751_000_000
      },
      query: {
        method: "device_stat",
        exit_code: 0,
        command_duration_ms: 1
      },
      verify: {
        policy: "stat_parse",
        ok: true,
        attempts: 1,
        reason: "stat output parsed for one device path"
      },
      semantics: "read_only_single_path_stat_not_directory_listing"
    });
    expect(driver.statFile).toHaveBeenCalledWith({
      deviceSerial: undefined,
      remotePath: "/sdcard/Download/report.txt",
      timeoutMs: 10_000
    });
  });

  it("returns a successful absent stat result when the driver reports missing", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "emulator-5554",
      exists: false,
      entry: null,
      exitCode: 1,
      durationMs: 1
    });

    await expect(
      statFile(driver, {
        remote_path: "/sdcard/Download/missing.txt",
        timeout_ms: 10_000
      })
    ).resolves.toMatchObject({
      exists: false,
      entry: null,
      verify: {
        policy: "stat_parse",
        ok: true,
        reason: "stat reported the device path does not exist"
      }
    });
  });

  it("hashes one regular file after target stat resolves the device serial", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: true,
      entry: { kind: "regular_file" as const, bytes: 0, modifiedUnixMs: 1_782_751_000_000 },
      exitCode: 0,
      durationMs: 2
    });
    driver.hashFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      algorithm: "sha256",
      digest: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      exitCode: 0,
      durationMs: 6
    });

    await expect(
      hashFile(driver, {
        remote_path: "/sdcard/Download/empty.txt",
        algorithm: "sha256",
        timeout_ms: 10_000
      })
    ).resolves.toEqual({
      device_serial: "resolved-serial",
      requested: {
        remote_path: "/sdcard/Download/empty.txt",
        algorithm: "sha256"
      },
      target: {
        exists: true,
        entry: {
          kind: "regular_file",
          bytes: 0,
          modified_unix_ms: 1_782_751_000_000
        },
        query: {
          method: "device_stat",
          exit_code: 0,
          command_duration_ms: 2
        }
      },
      hash: {
        algorithm: "sha256",
        method: "device_sha256sum",
        digest: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        exit_code: 0,
        command_duration_ms: 6
      },
      hashed: true,
      verify: {
        policy: "regular_file_stat_then_digest_parse",
        ok: true,
        attempts: 2,
        reason:
          "pre-hash stat found a regular file and digest output parsed; the stat-hash sequence is not atomic and the timeout applies independently to each adb call"
      },
      semantics: "read_only_single_regular_file_content_digest_not_atomic"
    });
    expect(driver.statFile).toHaveBeenCalledWith({
      deviceSerial: undefined,
      remotePath: "/sdcard/Download/empty.txt",
      timeoutMs: 10_000
    });
    expect(driver.hashFile).toHaveBeenCalledWith({
      deviceSerial: "resolved-serial",
      remotePath: "/sdcard/Download/empty.txt",
      algorithm: "sha256",
      timeoutMs: 10_000
    });
  });

  it("returns hash null for missing and non-regular file hash targets without running hash command", async () => {
    const missing = makeDriver([]);
    missing.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: false,
      entry: null,
      exitCode: 1,
      durationMs: 2
    });
    await expect(
      hashFile(missing, {
        remote_path: "/sdcard/Download/missing.txt",
        algorithm: "sha256",
        timeout_ms: 10_000
      })
    ).resolves.toMatchObject({
      device_serial: "resolved-serial",
      hashed: false,
      hash: null,
      target: { exists: false, entry: null },
      verify: { attempts: 1 }
    });
    expect(missing.hashFile).not.toHaveBeenCalled();

    const directory = makeDriver([]);
    directory.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: true,
      entry: { kind: "directory" as const, bytes: 3452, modifiedUnixMs: 1_782_751_000_000 },
      exitCode: 0,
      durationMs: 2
    });
    await expect(
      hashFile(directory, {
        remote_path: "/sdcard/Download",
        algorithm: "md5",
        timeout_ms: 10_000
      })
    ).resolves.toMatchObject({
      device_serial: "resolved-serial",
      requested: { algorithm: "md5" },
      hashed: false,
      hash: null,
      target: { exists: true, entry: { kind: "directory" } },
      verify: { attempts: 1 }
    });
    expect(directory.hashFile).not.toHaveBeenCalled();
  });

  it("wraps non-target files hash command failures and preserves target failures", async () => {
    const failedHash = makeDriver([]);
    failedHash.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: true,
      entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1_782_751_000_000 },
      exitCode: 0,
      durationMs: 2
    });
    failedHash.hashFile.mockRejectedValueOnce(
      new AutophoneError({
        code: "FILE_HASH_FAILED",
        message: "sha256sum: not found",
        retriable: false
      })
    );
    await expect(
      hashFile(failedHash, {
        remote_path: "/sdcard/Download/report.txt",
        algorithm: "sha256",
        timeout_ms: 10_000
      })
    ).rejects.toMatchObject({
      code: "FILE_HASH_FAILED",
      message: "files hash command failed",
      details: {
        phase: "hash",
        cause_code: "FILE_HASH_FAILED",
        cause_message: "sha256sum: not found"
      }
    });

    const targetFailure = makeDriver([]);
    targetFailure.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: true,
      entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1_782_751_000_000 },
      exitCode: 0,
      durationMs: 2
    });
    targetFailure.hashFile.mockRejectedValueOnce(
      new AutophoneError({
        code: "DEVICE_OFFLINE",
        message: "device offline",
        retriable: true
      })
    );
    await expect(
      hashFile(targetFailure, {
        remote_path: "/sdcard/Download/report.txt",
        algorithm: "sha256",
        timeout_ms: 10_000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("lists one directory after target stat resolves the device serial", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: true,
      entry: { kind: "directory" as const, bytes: 3452, modifiedUnixMs: 1_782_751_000_000 },
      exitCode: 0,
      durationMs: 2
    });
    driver.listDirectory.mockResolvedValueOnce({
      serial: "resolved-serial",
      entries: [
        {
          name: "a file.txt",
          path: "/data/local/tmp/list/a file.txt",
          kind: "regular_file",
          bytes: 3,
          modifiedUnixMs: 1_782_751_001_000
        }
      ],
      truncated: false,
      exitCode: 0,
      durationMs: 4
    });

    await expect(
      listFiles(driver, {
        remote_path: "/data/local/tmp/list",
        max_entries: 100,
        timeout_ms: 10_000
      })
    ).resolves.toEqual({
      device_serial: "resolved-serial",
      requested: {
        remote_path: "/data/local/tmp/list",
        max_entries: 100
      },
      target: {
        exists: true,
        entry: {
          kind: "directory",
          bytes: 3452,
          modified_unix_ms: 1_782_751_000_000
        },
        query: {
          method: "device_stat",
          exit_code: 0,
          command_duration_ms: 2
        }
      },
      list: {
        method: "device_find_stat",
        exit_code: 0,
        command_duration_ms: 4,
        entries: [
          {
            name: "a file.txt",
            path: "/data/local/tmp/list/a file.txt",
            kind: "regular_file",
            bytes: 3,
            modified_unix_ms: 1_782_751_001_000
          }
        ],
        count: 1,
        truncated: false
      },
      verify: {
        policy: "bounded_single_directory_listing",
        ok: true,
        attempts: 2,
        reason: "target stat found a directory and bounded listing completed"
      },
      semantics: "read_only_single_directory_listing_not_recursive"
    });
    expect(driver.statFile).toHaveBeenCalledWith({
      deviceSerial: undefined,
      remotePath: "/data/local/tmp/list",
      timeoutMs: 10_000
    });
    expect(driver.listDirectory).toHaveBeenCalledWith({
      deviceSerial: "resolved-serial",
      remotePath: "/data/local/tmp/list",
      maxEntries: 100,
      timeoutMs: 10_000
    });
  });

  it("propagates files list failures after the target stat succeeds", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: true,
      entry: { kind: "directory" as const, bytes: 3452, modifiedUnixMs: 1_782_751_000_000 },
      exitCode: 0,
      durationMs: 2
    });
    driver.listDirectory.mockRejectedValueOnce(
      new AutophoneError({
        code: "FILE_LIST_FAILED",
        message: "directory list command wrote stderr",
        retriable: false
      })
    );

    await expect(
      listFiles(driver, {
        remote_path: "/data/local/tmp/list",
        max_entries: 100,
        timeout_ms: 10_000
      })
    ).rejects.toMatchObject({
      code: "FILE_LIST_FAILED",
      message: "directory list command wrote stderr"
    });
    expect(driver.listDirectory).toHaveBeenCalledWith({
      deviceSerial: "resolved-serial",
      remotePath: "/data/local/tmp/list",
      maxEntries: 100,
      timeoutMs: 10_000
    });
  });

  it("returns files list observations for missing and non-directory targets without listing", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "emulator-5554",
      exists: false,
      entry: null,
      exitCode: 1,
      durationMs: 1
    });

    await expect(
      listFiles(driver, {
        remote_path: "/data/local/tmp/missing",
        max_entries: 100,
        timeout_ms: 10_000
      })
    ).resolves.toMatchObject({
      target: { exists: false, entry: null },
      list: null,
      verify: {
        attempts: 1,
        reason: "target stat reported the device path does not exist"
      }
    });

    driver.statFile.mockResolvedValueOnce({
      serial: "emulator-5554",
      exists: true,
      entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1_782_751_000_000 },
      exitCode: 0,
      durationMs: 1
    });

    await expect(
      listFiles(driver, {
        remote_path: "/data/local/tmp/file.txt",
        max_entries: 100,
        timeout_ms: 10_000
      })
    ).resolves.toMatchObject({
      target: { exists: true, entry: { kind: "regular_file" } },
      list: null,
      verify: {
        attempts: 1,
        reason: "target stat reported the device path is not a directory"
      }
    });
    expect(driver.listDirectory).not.toHaveBeenCalled();
  });

  it("wraps non-target target stat failures for files list", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockRejectedValueOnce(
      new AutophoneError({
        code: "FILE_STAT_FAILED",
        message: "stat permission denied for <redacted-path>",
        retriable: false
      })
    );

    await expect(
      listFiles(driver, {
        remote_path: "/data/local/tmp/private",
        max_entries: 100,
        timeout_ms: 10_000
      })
    ).rejects.toMatchObject({
      code: "FILE_LIST_FAILED",
      message: "files list target stat failed",
      details: {
        phase: "target_stat",
        cause_code: "FILE_STAT_FAILED",
        cause_message: "stat permission denied for <redacted-path>"
      }
    });
  });

  it("creates one missing directory path and verifies it with the resolved serial", async () => {
    const driver = makeDriver([]);
    driver.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: false,
        entry: null,
        exitCode: 1,
        durationMs: 2
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "directory" as const, bytes: 3452, modifiedUnixMs: 1_782_751_000_000 },
        exitCode: 0,
        durationMs: 3
      });
    driver.makeDirectory.mockResolvedValueOnce({ serial: "resolved-serial", exitCode: 0, durationMs: 4 });

    await expect(
      makeDirectory(driver, {
        remote_path: "/data/local/tmp/new-dir",
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).resolves.toEqual({
      device_serial: "resolved-serial",
      requested: {
        remote_path: "/data/local/tmp/new-dir"
      },
      before: {
        exists: false,
        entry: null
      },
      mkdir: {
        method: "device_mkdir",
        exit_code: 0,
        command_duration_ms: 4
      },
      after: {
        exists: true,
        entry: {
          kind: "directory",
          bytes: 3452,
          modified_unix_ms: 1_782_751_000_000
        }
      },
      created: true,
      verify: {
        policy: "directory_exists_after_mkdir",
        ok: true,
        attempts: 2,
        reason: "post-mkdir stat found the target path is a directory; parent creation and pre-existing contents were not separately verified"
      },
      semantics: "idempotent_directory_create_with_parents"
    });
    expect(driver.makeDirectory).toHaveBeenCalledWith({
      deviceSerial: "resolved-serial",
      remotePath: "/data/local/tmp/new-dir",
      timeoutMs: 10_000
    });
    expect(driver.statFile).toHaveBeenNthCalledWith(2, {
      deviceSerial: "resolved-serial",
      remotePath: "/data/local/tmp/new-dir",
      timeoutMs: 10_000
    });
  });

  it("skips files mkdir when the target is already a directory", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: true,
      entry: { kind: "directory" as const, bytes: 3452, modifiedUnixMs: 1_782_751_000_000 },
      exitCode: 0,
      durationMs: 2
    });

    await expect(
      makeDirectory(driver, {
        remote_path: "/data/local/tmp/existing",
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).resolves.toMatchObject({
      device_serial: "resolved-serial",
      mkdir: { method: "skipped_directory_exists", exit_code: null, command_duration_ms: 0 },
      created: false,
      verify: { policy: "directory_exists_after_mkdir", attempts: 1 },
      semantics: "idempotent_directory_create_with_parents"
    });
    expect(driver.makeDirectory).not.toHaveBeenCalled();
  });

  it("refuses files mkdir when the target already exists but is not a directory", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: true,
      entry: { kind: "symlink" as const, bytes: 43, modifiedUnixMs: 1_782_751_000_000 },
      exitCode: 0,
      durationMs: 2
    });

    await expect(
      makeDirectory(driver, {
        remote_path: "/data/local/tmp/link",
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({
      code: "FILE_MKDIR_FAILED",
      message: "files mkdir target already exists and is not a directory",
      details: {
        phase: "pre_stat",
        before_kind: "symlink"
      }
    });
    expect(driver.makeDirectory).not.toHaveBeenCalled();
  });

  it("fails files mkdir when post-mkdir stat does not verify a directory", async () => {
    const driver = makeDriver([]);
    driver.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: false,
        entry: null,
        exitCode: 1,
        durationMs: 2
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: false,
        entry: null,
        exitCode: 1,
        durationMs: 3
      });
    driver.makeDirectory.mockResolvedValueOnce({ serial: "resolved-serial", exitCode: 0, durationMs: 4 });

    await expect(
      makeDirectory(driver, {
        remote_path: "/data/local/tmp/racy",
        timeout_ms: 10_000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({
      code: "FILE_MKDIR_FAILED",
      message: "files mkdir did not verify target directory after mkdir",
      details: {
        phase: "verify",
        after_exists: false,
        after_kind: null
      }
    });
  });
});
