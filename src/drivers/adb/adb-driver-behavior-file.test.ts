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
  it("pushes one file through adb push with compression argv", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-file-push-"));
    const argsFile = join(dir, "args.txt");
    const localPath = join(dir, "payload.bin");
    const remotePath = "/sdcard/Download/payload.bin";
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$2" = "emulator-5554" ] && [ "$3" = "push" ]; then
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.pushFile({
        deviceSerial: "emulator-5554",
        localPath,
        remotePath,
        compression: "zstd",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      `-s emulator-5554 push -q -z zstd ${localPath} ${remotePath}`
    );
  });

  it("pulls one file through adb pull into the requested local path with disabled compression", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-file-pull-"));
    const argsFile = join(dir, "args.jsonl");
    const localPath = join(dir, "pulled.bin");
    const adbPath = await createFakeAdb(`#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(argsFile)}, JSON.stringify(args) + "\\n");
if (args[2] === "pull") {
  fs.writeFileSync(args[args.length - 1], "pulled bytes");
  process.exit(0);
}
process.exit(9);
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.pullFile({
        deviceSerial: "emulator-5554",
        localPath,
        remotePath: "/sdcard/Download/pulled.bin",
        compression: "disabled",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(localPath, "utf8")).resolves.toBe("pulled bytes");
    const args = JSON.parse((await readFile(argsFile, "utf8")).trim()) as string[];
    expect(args).toEqual([
      "-s",
      "emulator-5554",
      "pull",
      "-q",
      "-Z",
      "/sdcard/Download/pulled.bin",
      localPath
    ]);
  });

  it("redacts file transfer paths from adb failures", async () => {
    const localPath = "/tmp/private/source.txt";
    const remotePath = "/sdcard/Download/private.txt";
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$3" = "push" ]; then
  printf 'adb: failed to copy %s to %s: Permission denied\\n' ${shellQuote(localPath)} ${shellQuote(remotePath)} >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    let caught: unknown;
    try {
      await driver.pushFile({
        deviceSerial: "emulator-5554",
        localPath,
        remotePath,
        compression: "adb_default",
        timeoutMs: 5000
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AutophoneError);
    const error = caught as AutophoneError;
    expect(error).toMatchObject({
      code: "FILE_PUSH_FAILED",
      retriable: false,
      details: {
        method: "adb_push",
        exit_code: 1,
        args: ["-s", "emulator-5554", "push", "-q", "<redacted-path>", "<redacted-path>"]
      }
    });
    expect(error.message).not.toContain(localPath);
    expect(error.message).not.toContain(remotePath);
    expect(JSON.stringify(error.details)).not.toContain(localPath);
    expect(JSON.stringify(error.details)).not.toContain(remotePath);
  });

  it("redacts file transfer paths from adb pull failures", async () => {
    const localPath = "/tmp/private/output.txt";
    const remotePath = "/sdcard/Download/private.txt";
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$3" = "pull" ]; then
  printf 'adb: failed to copy %s to %s: No such file or directory\\n' ${shellQuote(remotePath)} ${shellQuote(localPath)} >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    let caught: unknown;
    try {
      await driver.pullFile({
        deviceSerial: "emulator-5554",
        localPath,
        remotePath,
        compression: "adb_default",
        timeoutMs: 5000
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AutophoneError);
    const error = caught as AutophoneError;
    expect(error).toMatchObject({
      code: "FILE_PULL_FAILED",
      retriable: false,
      details: {
        method: "adb_pull",
        exit_code: 1,
        args: ["-s", "emulator-5554", "pull", "-q", "<redacted-path>", "<redacted-path>"]
      }
    });
    expect(error.message).not.toContain(localPath);
    expect(error.message).not.toContain(remotePath);
    expect(JSON.stringify(error.details)).not.toContain(localPath);
    expect(JSON.stringify(error.details)).not.toContain(remotePath);
  });

  it("stats one device path through toybox stat with device-shell quoting", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-file-stat-"));
    const argsFile = join(dir, "args.txt");
    const remotePath = "/sdcard/Download/a b'$(echo bad);x.txt";
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "stat" ]; then
  printf 'regular empty file|0|1782751000\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.statFile({
        remotePath,
        timeoutMs: 5000
      })
    ).resolves.toEqual({
      serial: "emulator-5554",
      exists: true,
      entry: {
        kind: "regular_file",
        bytes: 0,
        modifiedUnixMs: 1_782_751_000_000
      },
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("devices");
    expect(args).toContain("-s emulator-5554 shell stat -c '%F|%s|%Y' -- '/sdcard/Download/a b'\\''$(echo bad);x.txt'");
  });

  it("returns exists false for missing device paths", async () => {
    const remotePath = "/sdcard/Download/missing.txt";
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "stat" ]; then
  printf 'stat: %s: No such file or directory\\n' ${shellQuote(remotePath)} >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.statFile({
        remotePath,
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      exists: false,
      entry: null,
      exitCode: 1
    });
  });

  it("redacts file stat paths from stat failures", async () => {
    const remotePath = "/sdcard/Download/private.txt";
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "stat" ]; then
  printf 'stat: %s: Permission denied\\n' ${shellQuote(remotePath)} >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    let caught: unknown;
    try {
      await driver.statFile({
        remotePath,
        timeoutMs: 5000
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AutophoneError);
    const error = caught as AutophoneError;
    expect(error).toMatchObject({
      code: "FILE_STAT_FAILED",
      retriable: false,
      details: {
        method: "device_stat",
        exit_code: 1,
        args: ["shell", "stat", "-c", "'%F|%s|%Y'", "--", "<redacted-path>"]
      }
    });
    expect(error.message).not.toContain(remotePath);
    expect(JSON.stringify(error.details)).not.toContain(remotePath);
  });

  it("maps file stat target failures before stat failures", async () => {
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
      driver.statFile({
        remotePath: "/sdcard/Download/private.txt",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("hashes one device file through sha256sum with device-shell quoting", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-file-hash-"));
    const argsFile = join(dir, "args.txt");
    const remotePath = "/sdcard/Download/a b'$(echo bad);x.txt";
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "sha256sum" ]; then
  printf 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  %s\\n' ${shellQuote(remotePath)}
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.hashFile({
        remotePath,
        algorithm: "sha256",
        timeoutMs: 5000
      })
    ).resolves.toEqual({
      serial: "emulator-5554",
      algorithm: "sha256",
      digest: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("devices");
    expect(args).toContain("-s emulator-5554 shell sha256sum -- '/sdcard/Download/a b'\\''$(echo bad);x.txt'");
  });

  it("redacts file hash paths from hash failures", async () => {
    const remotePath = "/sdcard/Download/private.txt";
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "md5sum" ]; then
  printf 'md5sum: %s: No such file or directory\\n' ${shellQuote(remotePath)} >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    let caught: unknown;
    try {
      await driver.hashFile({
        deviceSerial: "emulator-5554",
        remotePath,
        algorithm: "md5",
        timeoutMs: 5000
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AutophoneError);
    const error = caught as AutophoneError;
    expect(error).toMatchObject({
      code: "FILE_HASH_FAILED",
      retriable: false,
      details: {
        method: "device_md5sum",
        algorithm: "md5",
        exit_code: 1,
        args: ["shell", "md5sum", "--", "<redacted-path>"]
      }
    });
    expect(error.message).not.toContain(remotePath);
    expect(JSON.stringify(error.details)).not.toContain(remotePath);
  });

  it("maps missing hash applets to file hash failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "sha256sum" ]; then
  printf 'sha256sum: not found\\n' >&2
  exit 127
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.hashFile({
        deviceSerial: "emulator-5554",
        remotePath: "/sdcard/Download/private.txt",
        algorithm: "sha256",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "FILE_HASH_FAILED",
      message: "sha256sum: not found"
    });
  });

  it("maps file hash target failures before hash failures", async () => {
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
      driver.hashFile({
        remotePath: "/sdcard/Download/private.txt",
        algorithm: "sha256",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("classifies file hash timeouts like read-only adb errors and redacts paths", async () => {
    const remotePath = "/sdcard/Download/private.txt";
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "sha256sum" ]; then
  sleep 1
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    let caught: unknown;
    try {
      await driver.hashFile({
        deviceSerial: "emulator-5554",
        remotePath,
        algorithm: "sha256",
        timeoutMs: 25
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AutophoneError);
    const error = caught as AutophoneError;
    expect(error).toMatchObject({
      code: "ADB_ERROR",
      message: "adb command timed out",
      retriable: true,
      details: {
        timeout_ms: 25
      }
    });
    expect(JSON.stringify(error.details)).not.toContain(remotePath);
  });

  it("removes one device path through toybox rm with device-shell quoting", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-file-rm-"));
    const argsFile = join(dir, "args.txt");
    const remotePath = "/sdcard/Download/a b'$(echo bad);x.txt";
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "rm" ]; then
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.removeFile({
        deviceSerial: "emulator-5554",
        remotePath,
        timeoutMs: 5000
      })
    ).resolves.toEqual({
      serial: "emulator-5554",
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell rm -- '/sdcard/Download/a b'\\''$(echo bad);x.txt'");
  });

  it("redacts file rm paths from rm failures", async () => {
    const remotePath = "/sdcard/Download/private.txt";
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "rm" ]; then
  printf 'rm: %s: Permission denied\\n' ${shellQuote(remotePath)} >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    let caught: unknown;
    try {
      await driver.removeFile({
        deviceSerial: "emulator-5554",
        remotePath,
        timeoutMs: 5000
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AutophoneError);
    const error = caught as AutophoneError;
    expect(error).toMatchObject({
      code: "FILE_RM_FAILED",
      retriable: false,
      details: {
        method: "device_rm",
        exit_code: 1,
        args: ["shell", "rm", "--", "<redacted-path>"]
      }
    });
    expect(error.message).not.toContain(remotePath);
    expect(JSON.stringify(error.details)).not.toContain(remotePath);
  });

  it("maps file rm target failures before rm failures", async () => {
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
      driver.removeFile({
        deviceSerial: "emulator-5554",
        remotePath: "/sdcard/Download/private.txt",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_UNAUTHORIZED",
      retriable: false
    });
  });

  it("creates one device directory through mkdir -p with device-shell quoting", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-file-mkdir-"));
    const argsFile = join(dir, "args.txt");
    const remotePath = "/sdcard/Download/a b'$(echo bad);x";
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "mkdir" ]; then
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.makeDirectory({
        deviceSerial: "emulator-5554",
        remotePath,
        timeoutMs: 5000
      })
    ).resolves.toEqual({
      serial: "emulator-5554",
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell mkdir -p -- '/sdcard/Download/a b'\\''$(echo bad);x'");
  });

  it("redacts file mkdir paths from mkdir failures", async () => {
    const remotePath = "/sdcard/Download/private-dir";
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "mkdir" ]; then
  printf 'mkdir: %s: Permission denied\\n' ${shellQuote(remotePath)} >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    let caught: unknown;
    try {
      await driver.makeDirectory({
        deviceSerial: "emulator-5554",
        remotePath,
        timeoutMs: 5000
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AutophoneError);
    const error = caught as AutophoneError;
    expect(error).toMatchObject({
      code: "FILE_MKDIR_FAILED",
      retriable: false,
      details: {
        method: "device_mkdir",
        exit_code: 1,
        args: ["shell", "mkdir", "-p", "--", "<redacted-path>"]
      }
    });
    expect(error.message).not.toContain(remotePath);
    expect(JSON.stringify(error.details)).not.toContain(remotePath);
  });

  it("maps file mkdir target failures before mkdir failures", async () => {
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
      driver.makeDirectory({
        deviceSerial: "emulator-5554",
        remotePath: "/sdcard/Download/private-dir",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_UNAUTHORIZED",
      retriable: false
    });
  });
});
