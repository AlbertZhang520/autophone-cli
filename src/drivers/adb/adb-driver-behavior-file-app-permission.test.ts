import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AutophoneError } from "../../contracts/index.js";
import {
  AdbDriver,
  parseAdbDevices,
  parseAdbDevicesLong,
  parseAdbInstallOutput,
  parseAdbUninstallOutput,
  parseAmForceStopOutput,
  parseAmStartOutput,
  parseBatteryDetails,
  parseBrightnessFloatSetting,
  parseBrightnessIntSetting,
  parseBrightnessModeSetting,
  parseCurrentUserOutput,
  parseDeviceReadyState,
  parseConnectivityActiveNetwork,
  parseDumpsysInputMethodState,
  parseDumpsysDisplayBrightness,
  parseEnabledInputMethodSetting,
  parseFocus,
  parseGetpropOutput,
  parseLogcatLines,
  parseMonkeyLaunchOutput,
  parseAutoRotate,
  parseDumpsysAudioRingerState,
  parseMediaSessionVolumeGetOutput,
  orientationFromRotationDegrees,
  parseOrientation,
  parseRotationDegrees,
  parseStatusBarIconsOutput,
  parseSettingsBoolean,
  parseInputMethodSetting,
  parseUserRotationPolicy,
  parsePmClearOutput,
  parseDumpsysPackagePermission,
  parsePmPathOutput,
  parsePmPermissionOutput,
  parsePmListPackagesOutput,
  parsePmListUsersOutput,
  parsePidofOutput,
  quoteForDeviceShell,
  redactUrlFromText,
  parseWindowDensityDetails,
  parseWindowSizeDetails,
  parseWindowSize
} from "./adb-driver.js";
import { AdbTransport } from "./transport.js";
import { buildAdbFileCopyArgs, parseAdbFileCopyFailure } from "./file-copy.js";
import { buildAdbFileHashArgs, parseAdbFileHashOutput } from "./file-hash.js";
import { buildAdbFileListArgs, parseAdbFileListOutput } from "./file-list.js";
import { buildAdbFileMkdirArgs, parseAdbFileMkdirFailure } from "./file-mkdir.js";
import { buildAdbFileMoveArgs, parseAdbFileMoveFailure } from "./file-move.js";
import { buildAdbFileRmArgs, parseAdbFileRmFailure } from "./file-rm.js";
import { buildAdbFileStatArgs, parseAdbFileStatOutput } from "./file-stat.js";
import { buildAdbDeviceLocaleSourceArgs, parseDeviceLocaleSourceOutput } from "./device-locale.js";
import { buildAdbDeviceBatteryArgs, parseDeviceBatteryOutput } from "./device-battery.js";
import {
  buildAdbDeviceTimeSourceArgs,
  parseDeviceTimeBooleanOutput,
  parseDeviceTimeDateOutput,
  parseDeviceTimeZoneOutput
} from "./device-time.js";
import { buildAdbDeviceStorageArgs, parseDeviceStorageOutput } from "./device-storage.js";
import {
  buildAdbDeviceAccessibilitySettingArgs,
  parseAccessibilityBooleanSetting,
  parseEnabledAccessibilityServicesSetting
} from "./device-accessibility.js";
import {
  buildAdbDeviceAnimationScaleArgs,
  buildAdbDeviceAnimationScalePutArgs,
  formatDeviceAnimationScaleValue,
  parseDeviceAnimationScaleSetting
} from "./device-animations.js";
import { buildAdbDeviceNotificationsArgs, parseDumpsysNotificationOutput } from "./device-notifications.js";
import { buildAdbAppMemoryArgs, parseAppMemoryOutput } from "./device-memory.js";
import { buildAdbAppGraphicsArgs, parseAppGraphicsOutput } from "./device-graphics.js";
import { buildAdbAppPackageInfoArgs, parseAppPackageInfoOutput } from "./app-package-info.js";
import { buildAdbAppLinksArgs, parseAppLinksOutput } from "./app-links.js";
import { buildAdbAppOpsGetArgs, parseAppOpsGetOutput } from "./app-ops.js";
import { buildAdbAppActivitiesArgs, parseAppActivitiesOutput } from "./app-activities.js";
import { buildAdbAppResolveUrlArgs, parseAppResolveUrlOutput } from "./app-resolve-url.js";
import { buildAdbScreenrecordArgs, parseAdbScreenrecordFailure } from "./device-screenrecord.js";

import {
  ALARM_STREAM,
  MUSIC_STREAM,
  appActivitiesFixture,
  appActivitiesMultiFixture,
  createFakeAdb,
  gfxinfoFixture,
  meminfoFixture,
  packageInfoFixture,
  packageInfoWithHiddenDuplicateFixture,
  shellQuote
} from "./adb-driver-test-utils.test-support.js";describe("adb driver behavior file", () => {

  it("copies one device path through cp -n -T with device-shell quoting", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-file-copy-"));
    const argsFile = join(dir, "args.txt");
    const sourcePath = "/sdcard/Download/a b'$(echo bad);source.txt";
    const destPath = "/sdcard/Download/a b'$(echo bad);dest.txt";
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "cp" ] && [ "$5" = "-n" ] && [ "$6" = "-T" ]; then
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.copyFile({
        deviceSerial: "emulator-5554",
        sourcePath,
        destPath,
        timeoutMs: 5000
      })
    ).resolves.toEqual({
      serial: "emulator-5554",
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    const args = await readFile(argsFile, "utf8");
    expect(args).toContain(
      "-s emulator-5554 shell cp -n -T -- '/sdcard/Download/a b'\\''$(echo bad);source.txt' '/sdcard/Download/a b'\\''$(echo bad);dest.txt'"
    );
  });

  it("redacts file copy source and destination paths from cp failures", async () => {
    const sourcePath = "/sdcard/Download/private";
    const destPath = "/sdcard/Download/private-copied";
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "cp" ]; then
  printf 'cp: %s -> %s failed\\n' ${shellQuote(quoteForDeviceShell(sourcePath))} ${shellQuote(quoteForDeviceShell(destPath))} >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    let caught: unknown;
    try {
      await driver.copyFile({
        deviceSerial: "emulator-5554",
        sourcePath,
        destPath,
        timeoutMs: 5000
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AutophoneError);
    const error = caught as AutophoneError;
    expect(error).toMatchObject({
      code: "FILE_COPY_FAILED",
      retriable: false,
      details: {
        method: "device_cp_no_clobber",
        exit_code: 1,
        args: ["shell", "cp", "-n", "-T", "--", "<redacted-path>", "<redacted-path>"]
      }
    });
    expect(error.message).not.toContain(sourcePath);
    expect(error.message).not.toContain(destPath);
    expect(error.message).not.toContain(quoteForDeviceShell(sourcePath));
    expect(error.message).not.toContain(quoteForDeviceShell(destPath));
    expect(JSON.stringify(error.details)).not.toContain(sourcePath);
    expect(JSON.stringify(error.details)).not.toContain(destPath);
  });

  it("maps file copy target failures before cp failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf 'error: device unauthorized\\n' >&2
exit 1
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.copyFile({
        deviceSerial: "emulator-5554",
        sourcePath: "/sdcard/Download/private.txt",
        destPath: "/sdcard/Download/private-copied.txt",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_UNAUTHORIZED",
      retriable: false
    });
  });

  it("moves one device path through mv with device-shell quoting", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-file-move-"));
    const argsFile = join(dir, "args.txt");
    const sourcePath = "/sdcard/Download/a b'$(echo bad);source.txt";
    const destPath = "/sdcard/Download/a b'$(echo bad);dest.txt";
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "mv" ]; then
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.moveFile({
        deviceSerial: "emulator-5554",
        sourcePath,
        destPath,
        timeoutMs: 5000
      })
    ).resolves.toEqual({
      serial: "emulator-5554",
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    const args = await readFile(argsFile, "utf8");
    expect(args).toContain(
      "-s emulator-5554 shell mv -- '/sdcard/Download/a b'\\''$(echo bad);source.txt' '/sdcard/Download/a b'\\''$(echo bad);dest.txt'"
    );
  });

  it("redacts file move source and destination paths from mv failures", async () => {
    const sourcePath = "/sdcard/Download/private";
    const destPath = "/sdcard/Download/private-moved";
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "mv" ]; then
  printf 'mv: %s -> %s failed\\n' ${shellQuote(quoteForDeviceShell(sourcePath))} ${shellQuote(quoteForDeviceShell(destPath))} >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    let caught: unknown;
    try {
      await driver.moveFile({
        deviceSerial: "emulator-5554",
        sourcePath,
        destPath,
        timeoutMs: 5000
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AutophoneError);
    const error = caught as AutophoneError;
    expect(error).toMatchObject({
      code: "FILE_MOVE_FAILED",
      retriable: false,
      details: {
        method: "device_mv",
        exit_code: 1,
        args: ["shell", "mv", "--", "<redacted-path>", "<redacted-path>"]
      }
    });
    expect(error.message).not.toContain(sourcePath);
    expect(error.message).not.toContain(destPath);
    expect(error.message).not.toContain(quoteForDeviceShell(sourcePath));
    expect(error.message).not.toContain(quoteForDeviceShell(destPath));
    expect(JSON.stringify(error.details)).not.toContain(sourcePath);
    expect(JSON.stringify(error.details)).not.toContain(destPath);
  });

  it("maps file move target failures before mv failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf 'error: device unauthorized\\n' >&2
exit 1
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.moveFile({
        deviceSerial: "emulator-5554",
        sourcePath: "/sdcard/Download/private.txt",
        destPath: "/sdcard/Download/private-moved.txt",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_UNAUTHORIZED",
      retriable: false
    });
  });

  it("lists one device directory through exec-out with a bounded binary protocol", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-file-list-"));
    const argsFile = join(dir, "args.txt");
    const remotePath = "/data/local/tmp/list dir'$(echo bad);x";
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "exec-out" ] && [ "$4" = "sh" ] && [ "$5" = "-c" ]; then
  printf 'AUTOPHONE_LIST_V1\\0'
  printf 'E\\0%s/a file.txt\\0regular file|3|1782751000\\0' ${shellQuote(remotePath)}
  printf 'E\\0%s/link\\0symbolic link|43|1782751001\\0' ${shellQuote(remotePath)}
  printf 'S\\0%s\\0' 0
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.listDirectory({
        deviceSerial: "emulator-5554",
        remotePath,
        maxEntries: 100,
        timeoutMs: 5000
      })
    ).resolves.toEqual({
      serial: "emulator-5554",
      entries: [
        {
          name: "a file.txt",
          path: `${remotePath}/a file.txt`,
          kind: "regular_file",
          bytes: 3,
          modifiedUnixMs: 1_782_751_000_000
        },
        {
          name: "link",
          path: `${remotePath}/link`,
          kind: "symlink",
          bytes: 43,
          modifiedUnixMs: 1_782_751_001_000
        }
      ],
      truncated: false,
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 exec-out sh -c");
    expect(args).toContain("find \"$dir\" -mindepth 1 -maxdepth 1 -print0");
    expect(args).toContain("dir='/data/local/tmp/list dir'\\''$(echo bad);x'");
  });

  it("redacts file list paths and omits child names from failure details", async () => {
    const remotePath = "/data/local/tmp/private-list";
    const childPath = `${remotePath}/secret-child.txt`;
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "exec-out" ]; then
  printf 'AUTOPHONE_LIST_V1\\0'
  printf 'E\\0%s\\0regular file|1|2\\0' ${shellQuote(childPath)}
  printf 'S\\0%s\\0' 0
  printf 'find: %s: Permission denied\\n' ${shellQuote(childPath)} >&2
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    let caught: unknown;
    try {
      await driver.listDirectory({
        deviceSerial: "emulator-5554",
        remotePath,
        maxEntries: 100,
        timeoutMs: 5000
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AutophoneError);
    const error = caught as AutophoneError;
    expect(error).toMatchObject({
      code: "FILE_LIST_FAILED",
      retriable: false,
      message: "directory list command wrote stderr",
      details: {
        method: "device_find_stat",
        exit_code: 0,
        args: ["exec-out", "sh", "-c", expect.stringContaining("<redacted-path>") as string]
      }
    });
    expect(JSON.stringify(error.details)).not.toContain(remotePath);
    expect(JSON.stringify(error.details)).not.toContain("secret-child");
    expect(error.message).not.toContain(remotePath);
    expect(error.message).not.toContain("secret-child");
  });

  it("maps file list target failures before list failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf 'error: device offline\\n' >&2
exit 1
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.listDirectory({
        deviceSerial: "emulator-5554",
        remotePath: "/data/local/tmp/private-list",
        maxEntries: 100,
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("uninstalls one package through adb uninstall with explicit user routing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-uninstall-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$2" = "emulator-5554" ] && [ "$3" = "uninstall" ]; then
  printf 'Success\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.uninstallPackage({
        packageName: "com.example.app",
        userId: 0,
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 uninstall --user 0 com.example.app"
    );
  });

  it("maps adb uninstall failures to APP_UNINSTALL_FAILED with DELETE failure codes", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$3" = "uninstall" ]; then
  printf '%s\\n' 'Failure [DELETE_FAILED_DEVICE_POLICY_MANAGER]'
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.uninstallPackage({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_UNINSTALL_FAILED",
      retriable: false,
      message: "Failure [DELETE_FAILED_DEVICE_POLICY_MANAGER]",
      details: {
        package_name: "com.example.app",
        method: "adb_uninstall",
        exit_code: 1,
        failure_code: "DELETE_FAILED_DEVICE_POLICY_MANAGER"
      }
    });
  });

  it("maps adb uninstall exit 0 without Success to APP_UNINSTALL_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$3" = "uninstall" ]; then
  printf 'Performing uninstall\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.uninstallPackage({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_UNINSTALL_FAILED",
      retriable: false,
      details: {
        method: "adb_uninstall",
        exit_code: 0
      }
    });
  });

  it("maps adb uninstall target failures before generic uninstall failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
printf "adb: device 'emulator-5554' not found\\n" >&2
exit 1
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.uninstallPackage({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "NO_DEVICE",
      retriable: true
    });
  });

  it("rejects unsafe uninstall driver inputs before adb is called", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-uninstall-unsafe-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
exit 0
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.uninstallPackage({
        packageName: "com.example.app;pm clear com.other",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      retriable: false
    });
    await expect(readFile(argsFile, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("grants one runtime permission through pm grant with explicit user routing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-permission-grant-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "grant" ]; then
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.setAppPermission({
        packageName: "com.example.errortracker",
        permissionName: "android.permission.CAMERA",
        operation: "grant",
        userId: 10,
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell pm grant --user 10 com.example.errortracker android.permission.CAMERA"
    );
  });

  it("revokes one runtime permission through pm revoke without user routing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-permission-revoke-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "revoke" ]; then
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.setAppPermission({
        packageName: "com.example.app",
        permissionName: "android.permission.CAMERA",
        operation: "revoke",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      exitCode: 0
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell pm revoke com.example.app android.permission.CAMERA"
    );
  });

  it("maps pm permission command failure text to APP_PERMISSION_FAILED even with exit zero", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "grant" ]; then
  printf '%s\\n' 'Not a changeable permission type: android.permission.INTERNET'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.setAppPermission({
        packageName: "com.example.app",
        permissionName: "android.permission.INTERNET",
        operation: "grant",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_PERMISSION_FAILED",
      retriable: false,
      message: "Not a changeable permission type: android.permission.INTERNET",
      details: {
        package_name: "com.example.app",
        permission_name: "android.permission.INTERNET",
        operation: "grant",
        method: "pm_grant",
        exit_code: 0
      }
    });
  });

  it("does not treat successful permission output with error in the package name as failure", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "grant" ]; then
  printf '%s\\n' 'Granted permission to com.example.errortracker'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.setAppPermission({
        packageName: "com.example.errortracker",
        permissionName: "android.permission.CAMERA",
        operation: "grant",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({ exitCode: 0 });
  });

  it("rejects unsafe permission driver inputs before adb is called", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-permission-unsafe-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
exit 0
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.setAppPermission({
        packageName: "com.example.app",
        permissionName: "android.permission.CAMERA;pm clear com.other",
        operation: "grant",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      retriable: false
    });
    await expect(readFile(argsFile, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("maps app permission target failures before generic permission failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
printf "adb: device 'emulator-5554' not found\\n" >&2
exit 1
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.setAppPermission({
        packageName: "com.example.app",
        permissionName: "android.permission.CAMERA",
        operation: "grant",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "NO_DEVICE",
      retriable: true
    });
  });

  it("inspects one permission through dumpsys package without requiring explicit serial", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-permission-inspect-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "package" ]; then
  cat <<'DUMP'
Package [com.example.app] (abc):
  targetSdk=35
  requested permissions:
    android.permission.CAMERA
  User 0: ceDataInode=688569 installed=true hidden=false suspended=false distractionFlags=0
    runtime permissions:
      android.permission.CAMERA: granted=true, flags=[ USER_SET|USER_SENSITIVE_WHEN_GRANTED ]
DUMP
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.inspectAppPermission({
        packageName: "com.example.app",
        permissionName: "android.permission.CAMERA",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      packageFound: true,
      targetSdk: 35,
      state: "granted",
      granted: true,
      source: "runtime",
      runtime: {
        selectedUserId: 0,
        userPresent: true,
        present: true,
        granted: true,
        flags: ["USER_SET", "USER_SENSITIVE_WHEN_GRANTED"]
      }
    });
    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell dumpsys package com.example.app"
    );
  });

  it("returns package_found false for absent packages during permission inspection", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "package" ]; then
  printf 'Unable to find package: com.example.missing\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.inspectAppPermission({
        packageName: "com.example.missing",
        permissionName: "android.permission.CAMERA",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      packageFound: false,
      state: "unknown",
      granted: null,
      source: "package_absent"
    });
  });

  it("fails permission inspection when an explicit user is absent from parsed dump users", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "package" ]; then
  cat <<'DUMP'
Package [com.example.app] (abc):
  requested permissions:
    android.permission.CAMERA
  User 0: ceDataInode=688569 installed=true hidden=false suspended=false distractionFlags=0
    runtime permissions:
      android.permission.CAMERA: granted=false
DUMP
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.inspectAppPermission({
        packageName: "com.example.app",
        permissionName: "android.permission.CAMERA",
        userId: 10,
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_PERMISSION_INSPECT_FAILED",
      retriable: false,
      details: { user_id: 10, available_user_ids: [0] }
    });
  });

  it("fails permission inspection for explicit user zero when only another dump user is present", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "package" ]; then
  cat <<'DUMP'
Package [com.example.app] (abc):
  requested permissions:
    android.permission.CAMERA
  User 10: ceDataInode=123456 installed=true hidden=false suspended=false distractionFlags=0
    runtime permissions:
      android.permission.CAMERA: granted=true
DUMP
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.inspectAppPermission({
        packageName: "com.example.app",
        permissionName: "android.permission.CAMERA",
        userId: 0,
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_PERMISSION_INSPECT_FAILED",
      retriable: false,
      details: { user_id: 0, available_user_ids: [10] }
    });
  });

  it("fails permission inspection for explicit users when no dump user blocks are parseable", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "package" ]; then
  cat <<'DUMP'
Package [com.example.app] (abc):
  requested permissions:
    android.permission.CAMERA
DUMP
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.inspectAppPermission({
        packageName: "com.example.app",
        permissionName: "android.permission.CAMERA",
        userId: 99,
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_PERMISSION_INSPECT_FAILED",
      retriable: false,
      details: { user_id: 99, available_user_ids: [] }
    });
  });

  it("rejects unsafe permission inspection inputs before adb is called", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-permission-inspect-unsafe-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
exit 0
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.inspectAppPermission({
        packageName: "com.example.app",
        permissionName: "android.permission.CAMERA;pm clear com.other",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      retriable: false
    });
    await expect(readFile(argsFile, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("lists devices with adb devices -l without resolving a target serial", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-list-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "devices" ] && [ "$2" = "-l" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice model:sdk transport_id:1\\nphone-1\\tunauthorized transport_id:2\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.listDevices({ timeoutMs: 5000 })).resolves.toEqual([
      { serial: "emulator-5554", state: "device", details: { model: "sdk", transport_id: "1" } },
      { serial: "phone-1", state: "unauthorized", details: { transport_id: "2" } }
    ]);
    await expect(readFile(argsFile, "utf8")).resolves.toBe("devices -l\n");
  });
});
