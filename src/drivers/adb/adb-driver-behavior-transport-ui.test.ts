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
} from "./adb-driver-test-utils.test-support.js";

describe("adb driver behavior transport and UI", () => {
  it("lists Android users through pm list users without requiring explicit serial", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-users-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "list" ] && [ "$6" = "users" ]; then
  cat <<'USERS'
Users:
	UserInfo{0:Owner:13} running
	UserInfo{10:Work:30}
USERS
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.listUsers({ timeoutMs: 5000 })).resolves.toEqual({
      serial: "emulator-5554",
      users: [
        { id: 0, name: "Owner", flagsHex: "13", running: true },
        { id: 10, name: "Work", flagsHex: "30", running: false }
      ],
      exitCode: 0,
      durationMs: expect.any(Number)
    });
    await expect(readFile(argsFile, "utf8")).resolves.toContain("-s emulator-5554 shell pm list users");
  });

  it("reads current Android user through Activity Manager without requiring explicit serial", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-current-user-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "activity" ] && [ "$6" = "get-current-user" ]; then
  printf '10\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getCurrentUser({ timeoutMs: 5000 })).resolves.toEqual({
      serial: "emulator-5554",
      currentUserId: 10,
      exitCode: 0,
      durationMs: expect.any(Number)
    });
    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell cmd activity get-current-user"
    );
  });

  it("fails current Android user query on malformed Activity Manager output", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "activity" ] && [ "$6" = "get-current-user" ]; then
  printf 'Current user: 0\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getCurrentUser({ deviceSerial: "emulator-5554", timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_CURRENT_USER_FAILED",
      retriable: false,
      details: {
        method: "cmd_activity_get_current_user",
        unexpected_lines: ["Current user: 0"]
      }
    });
  });

  it("fails current Android user query on non-target Activity Manager failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "activity" ] && [ "$6" = "get-current-user" ]; then
  printf 'Error: unknown command get-current-user\\n' >&2
  exit 20
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getCurrentUser({ deviceSerial: "emulator-5554", timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_CURRENT_USER_FAILED",
      retriable: false,
      message: "Error: unknown command get-current-user",
      details: { method: "cmd_activity_get_current_user", exit_code: 20 }
    });
  });

  it("maps current Android user target failures before parse failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
printf "adb: device 'emulator-5554' not found\\n" >&2
exit 1
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getCurrentUser({ deviceSerial: "emulator-5554", timeoutMs: 5000 })).rejects.toMatchObject({
      code: "NO_DEVICE",
      retriable: true
    });
  });

  it("fails Android user listing on malformed pm list users output", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "list" ] && [ "$6" = "users" ]; then
  printf '0 users:\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.listUsers({ deviceSerial: "emulator-5554", timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_USERS_FAILED",
      retriable: false,
      details: { method: "pm_list_users", unexpected_lines: ["missing Users: header", "0 users:"] }
    });
  });

  it("fails Android user listing on non-target command failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "list" ] && [ "$6" = "users" ]; then
  printf 'Users:\\n'
  printf 'cmd: unknown command: list users\\n' >&2
  exit 20
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.listUsers({ deviceSerial: "emulator-5554", timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_USERS_FAILED",
      retriable: false,
      message: "cmd: unknown command: list users",
      details: { method: "pm_list_users", exit_code: 20 }
    });
  });

  it("maps Android user listing target failures before command failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
printf "adb: device 'emulator-5554' not found\\n" >&2
exit 1
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.listUsers({ deviceSerial: "emulator-5554", timeoutMs: 5000 })).rejects.toMatchObject({
      code: "NO_DEVICE",
      retriable: true
    });
  });

  it("maps multiple online devices before running device commands", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\nphone-1\\tdevice\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.observe({ timeoutMs: 5000 })).rejects.toMatchObject({ code: "MULTIPLE_DEVICES" });
  });

  it("terminates a timed out adb process", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
while :; do
  :
done
`);
    const transport = new AdbTransport({ adbPath, killGraceMs: 100 });

    await expect(transport.run(["devices"], { timeoutMs: 200, timeoutCode: "DUMP_TIMEOUT" })).rejects.toMatchObject({
      code: "DUMP_TIMEOUT",
      details: {
        signal: expect.stringMatching(/^SIG(TERM|KILL)$/)
      }
    });
  });

  it("terminates an adb process after stdout overflow", async () => {
    const adbPath = await createFakeAdb(`#!/usr/bin/env node
process.on("SIGTERM", () => {});
const chunk = "x".repeat(1024);
setInterval(() => {
  process.stdout.write(chunk);
}, 1);
`);
    const transport = new AdbTransport({ adbPath, killGraceMs: 20 });

    await expect(
      transport.run(["flood"], { timeoutMs: 5000, maxOutputBytes: 2048, timeoutCode: "DUMP_TIMEOUT" })
    ).rejects.toMatchObject({
      code: "ADB_ERROR",
      message: "adb stdout exceeded max output size",
      details: {
        signal: expect.stringMatching(/^SIG(TERM|KILL)$/)
      }
    });
  });

  it("maps adb no-device stderr to NO_DEVICE", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
printf 'error: no devices/emulators found\\n' >&2
exit 1
`);
    const transport = new AdbTransport({ adbPath });

    await expect(transport.run(["devices"], { timeoutMs: 5000 })).rejects.toMatchObject({
      code: "NO_DEVICE",
      retriable: true
    });
  });

  it("preserves binary stdout in runBuffer", async () => {
    const adbPath = await createFakeAdb(`#!/usr/bin/env node
const size = 1024 * 1024 + 123;
const buffer = Buffer.alloc(size, 0xab);
buffer.set(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 0);
process.stdout.write(buffer);
`);
    const transport = new AdbTransport({ adbPath });

    const result = await transport.runBuffer(["binary"], { timeoutMs: 5000, maxOutputBytes: 2 * 1024 * 1024 });

    expect(result.stdout).toBeInstanceOf(Buffer);
    expect(result.stdout.byteLength).toBe(1024 * 1024 + 123);
    expect([...result.stdout.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it("returns current foreground app from dumpsys window", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ]; then
  printf 'mCurrentFocus=Window{abc u0 com.example/.MainActivity}\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.currentApp({ timeoutMs: 5000 })).resolves.toEqual({
      device_serial: "emulator-5554",
      package: "com.example",
      activity: "com.example.MainActivity",
      focused: true
    });
  });

  it("observes UI using actual dumpsys rotation and auto-rotate state", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-observe-rotation-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "uiautomator" ]; then
  printf '<hierarchy rotation="0"><node index="0" text="OK" resource-id="id/ok" content-desc="" class="android.widget.TextView" package="com.example" bounds="[1,2][21,22]" enabled="true" clickable="false" focused="false" /></hierarchy>\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "wm" ] && [ "$5" = "size" ]; then
  printf 'Physical size: 1080x2400\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "accelerometer_rotation" ]; then
  printf '1\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "window" ]; then
  printf 'mCurrentFocus=Window{abc u0 com.example/.MainActivity}\\n'
  printf 'DisplayRotation\\n'
  printf '  mCurrentRotation=ROTATION_90\\n'
  printf '  mUserRotationMode=USER_ROTATION_FREE mUserRotation=ROTATION_0\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.observe({ timeoutMs: 5000 })).resolves.toMatchObject({
      device_serial: "emulator-5554",
      package: "com.example",
      activity: "com.example.MainActivity",
      window_size: [1080, 2400],
      orientation: "landscape",
      rotation_degrees: 90,
      auto_rotate: true,
      elements: [{ text: "OK" }]
    });

    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 exec-out uiautomator dump /dev/tty");
    expect(args).toContain("-s emulator-5554 shell wm size");
    expect(args).toContain("-s emulator-5554 shell settings get system accelerometer_rotation");
    expect(args).toContain("-s emulator-5554 shell dumpsys window");
    expect(args).not.toContain("user_rotation");
  });

  it("gets display orientation without dumping the UI hierarchy", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-orientation-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "wm" ] && [ "$5" = "size" ]; then
  printf 'Physical size: 2560x1600\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "accelerometer_rotation" ]; then
  printf 'null\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "window" ]; then
  printf 'DisplayRotation\\n'
  printf '  mCurrentRotation=ROTATION_90\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getOrientation({ timeoutMs: 5000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      windowSize: [2560, 1600],
      orientation: "portrait",
      rotationDegrees: 90,
      autoRotate: null,
      queries: {
        windowSize: { exitCode: 0, durationMs: expect.any(Number) as number },
        rotation: { exitCode: 0, durationMs: expect.any(Number) as number },
        autoRotate: { exitCode: 0, durationMs: expect.any(Number) as number }
      }
    });

    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell wm size");
    expect(args).toContain("-s emulator-5554 shell settings get system accelerometer_rotation");
    expect(args).toContain("-s emulator-5554 shell dumpsys window");
    expect(args).not.toContain("uiautomator");
    expect(args).not.toContain("user_rotation");
  });

  it("gets user-rotation policy through wm user-rotation", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-user-rotation-get-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "wm" ] && [ "$5" = "user-rotation" ]; then
  printf 'lock 1\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getUserRotationPolicy({ timeoutMs: 5000 })).resolves.toMatchObject({
      mode: "lock",
      rotationDegrees: 90,
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain("-s emulator-5554 shell wm user-rotation");
  });

  it("fails user-rotation policy query on usage output even when wm exits zero", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "wm" ] && [ "$5" = "user-rotation" ]; then
  printf 'Window manager (window) commands:\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getUserRotationPolicy({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_ORIENTATION_SET_FAILED",
      retriable: false,
      details: { method: "wm_user_rotation_query", exit_code: 0 }
    });
  });

  it("sets user-rotation policy through wm user-rotation", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-user-rotation-set-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "wm" ] && [ "$5" = "user-rotation" ]; then
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.setUserRotation({
        mode: "lock",
        rotationDegrees: 270,
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });
    await expect(
      driver.setUserRotation({
        mode: "free",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell wm user-rotation lock 3");
    expect(args).toContain("-s emulator-5554 shell wm user-rotation free");
  });

  it("fails user-rotation set on usage output even when wm exits zero", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "wm" ] && [ "$5" = "user-rotation" ]; then
  printf 'Window manager (window) commands:\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.setUserRotation({
        mode: "lock",
        rotationDegrees: 90,
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_ORIENTATION_SET_FAILED",
      retriable: false,
      details: { method: "wm_user_rotation_set", mode: "lock", rotation_degrees: 90, exit_code: 0 }
    });
  });

  it("classifies offline target failures before user-rotation set failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "wm" ] && [ "$5" = "user-rotation" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.setUserRotation({
        mode: "free",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("fails orientation lookup when actual display rotation is not parseable", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "wm" ] && [ "$5" = "size" ]; then
  printf 'Physical size: 1080x2400\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "accelerometer_rotation" ]; then
  printf '1\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "window" ]; then
  printf 'DisplayRotation\\n'
  printf '  mCurrentRotation=ROTATION_UNKNOWN\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getOrientation({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_ORIENTATION_FAILED",
      retriable: false,
      details: { method: "dumpsys_window", exit_code: 0 }
    });
  });

  it("keeps orientation lookup successful when auto-rotate setting read fails", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "wm" ] && [ "$5" = "size" ]; then
  printf 'Physical size: 1080x2400\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "accelerometer_rotation" ]; then
  printf 'settings unavailable\\n' >&2
  exit 1
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "window" ]; then
  printf 'DisplayRotation\\n'
  printf '  mCurrentRotation=ROTATION_90\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getOrientation({ timeoutMs: 5000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      windowSize: [1080, 2400],
      orientation: "landscape",
      rotationDegrees: 90,
      autoRotate: null,
      queries: {
        autoRotate: { exitCode: 1, durationMs: expect.any(Number) as number }
      }
    });
  });

  it("fails orientation lookup when a required orientation source exits nonzero", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "wm" ] && [ "$5" = "size" ]; then
  printf 'wm size failed\\n' >&2
  exit 1
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "accelerometer_rotation" ]; then
  printf '1\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "window" ]; then
  printf 'DisplayRotation\\n'
  printf '  mCurrentRotation=ROTATION_90\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getOrientation({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_ORIENTATION_FAILED",
      retriable: false,
      details: { method: "wm_size", exit_code: 1 }
    });
  });

  it("classifies offline target failures before orientation source failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "wm" ] && [ "$5" = "size" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "accelerometer_rotation" ]; then
  printf '1\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "window" ]; then
  printf 'DisplayRotation\\n'
  printf '  mCurrentRotation=ROTATION_90\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getOrientation({ deviceSerial: "emulator-5554", timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("maps am start stdout failure on nonzero exit to ACTIVITY_RESOLVE_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "am" ]; then
  printf 'Error: Activity class {com.example/com.example.Nope} does not exist.\\n'
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.startActivity({
        packageName: "com.example",
        activity: "com.example.Nope",
        component: "com.example/.Nope",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({ code: "ACTIVITY_RESOLVE_FAILED" });
  });

  it("launches packages through monkey with argv tokens", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-launch-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "monkey" ]; then
  printf 'Events injected: 1\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.launchPackage({ packageName: "com.example", timeoutMs: 5000 })).resolves.toMatchObject({
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell monkey -p com.example -c android.intent.category.LAUNCHER 1"
    );
  });

  it("maps monkey no-launcher output to APP_LAUNCH_FAILED even on zero exit", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "monkey" ]; then
  printf '** No activities found to run, monkey aborted.\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.launchPackage({ packageName: "com.example.service", timeoutMs: 5000 })).rejects.toMatchObject({
      code: "APP_LAUNCH_FAILED",
      retriable: false,
      details: { package_name: "com.example.service", method: "monkey", exit_code: 0 }
    });
  });

  it("opens URLs through am start ACTION_VIEW with a device-shell-quoted URL token", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-open-url-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "am" ] && [ "$5" = "start" ]; then
  printf 'Status: ok\\nActivity: com.browser/.MainActivity\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });
    const url = "https://example.com/path?a=1&b=2#frag'";

    await expect(driver.openUrl({ url, timeoutMs: 5000 })).resolves.toMatchObject({
      status: "ok",
      activity: "com.browser/.MainActivity",
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      `-s emulator-5554 shell am start -W -a android.intent.action.VIEW -d ${quoteForDeviceShell(url)}`
    );
  });

  it("resolves URL handlers through package manager without starting activities", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-resolve-url-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "package" ] && [ "$6" = "resolve-activity" ]; then
  printf 'priority=0 preferredOrder=0 match=0x208000 specificIndex=-1 isDefault=true\\n'
  printf 'com.android.browser/.BrowserActivity\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });
    const url = "https://example.com/path?a=1&b=2#frag'";

    await expect(driver.resolveUrl({ url, timeoutMs: 5000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      resolution: {
        type: "activity",
        component: "com.android.browser/.BrowserActivity",
        package: "com.android.browser",
        activity: "com.android.browser.BrowserActivity"
      },
      metadata: {
        match: { raw: "0x208000", value: 2_129_920 },
        is_default: true
      },
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    const args = await readFile(argsFile, "utf8");
    expect(args).toContain(
      `-s emulator-5554 shell cmd package resolve-activity --brief -a android.intent.action.VIEW -d ${quoteForDeviceShell(url)}`
    );
    expect(args).not.toContain("am start");
  });

  it("maps URL resolution no-match to a successful none result", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "package" ] && [ "$6" = "resolve-activity" ]; then
  printf 'No activity found\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.resolveUrl({ url: "https://example.com/", timeoutMs: 5000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      resolution: { type: "none", component: null, package: null, activity: null },
      metadata: null,
      exitCode: 0
    });
  });

  it("redacts URLs from resolve-url package manager failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "package" ] && [ "$6" = "resolve-activity" ]; then
  printf 'bad https://example.com/path?token=secret\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });
    const url = "https://example.com/path?token=secret";

    await expect(driver.resolveUrl({ url, timeoutMs: 5000 })).rejects.toMatchObject({
      code: "APP_RESOLVE_URL_FAILED",
      details: {
        method: "cmd_package_resolve_activity",
        stdout: "bad <redacted-url>\n"
      }
    });
    await driver.resolveUrl({ url, timeoutMs: 5000 }).catch((error: unknown) => {
      const detailsJson = JSON.stringify((error as AutophoneError).details);
      expect(detailsJson).not.toContain(url);
      expect(detailsJson).not.toContain(quoteForDeviceShell(url));
    });
  });

  it("maps resolve-url target failures before parse failures with URL redacted", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "package" ] && [ "$6" = "resolve-activity" ]; then
  printf 'error: device offline https://example.com/path?token=secret\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });
    const url = "https://example.com/path?token=secret";

    await expect(driver.resolveUrl({ url, timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
    await driver.resolveUrl({ url, timeoutMs: 5000 }).catch((error: unknown) => {
      const detailsJson = JSON.stringify((error as AutophoneError).details);
      expect(detailsJson).not.toContain(url);
      expect(detailsJson).not.toContain(quoteForDeviceShell(url));
    });
  });

  it("maps open-url am start errors to APP_OPEN_URL_FAILED with URL redacted", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "am" ] && [ "$5" = "start" ]; then
  printf 'Error: Activity not started, unable to resolve Intent { act=android.intent.action.VIEW dat=https://example.com/path?token=secret }\\n'
  printf 'stderr https://example.com/path?token=secret\\n' >&2
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });
    const url = "https://example.com/path?token=secret";

    await expect(driver.openUrl({ url, timeoutMs: 5000 })).rejects.toMatchObject({
      code: "APP_OPEN_URL_FAILED",
      message: expect.not.stringContaining(url),
      retriable: false,
      details: {
        method: "am_start_view",
        url: {
          scheme: "https",
          hostname: "example.com",
          query_present: true
        },
        exit_code: 0,
        stdout: expect.not.stringContaining(url),
        stderr: expect.not.stringContaining(url)
      }
    });
  });

  it("redacts open-url timeout args from transport errors", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "am" ] && [ "$5" = "start" ]; then
  sleep 1
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });
    const url = "https://example.com/path?token=secret#frag";

    let error: unknown;
    try {
      await driver.openUrl({ url, deviceSerial: "emulator-5554", timeoutMs: 10 });
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({
      code: "ACTION_TIMEOUT",
      message: "adb command timed out",
      retriable: true,
      details: {
        args: expect.arrayContaining(["<redacted-url>"]),
        timeout_ms: 10
      }
    });
    const detailsJson = JSON.stringify((error as { details?: unknown }).details);
    expect(detailsJson).toContain("<redacted-url>");
    expect(detailsJson).not.toContain(url);
    expect(detailsJson).not.toContain(quoteForDeviceShell(url));
  });

  it("force-stops packages with argv tokens", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-stop-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "am" ] && [ "$5" = "force-stop" ]; then
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.stopPackage({ packageName: "com.example", timeoutMs: 5000 })).resolves.toMatchObject({
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell am force-stop com.example"
    );
  });

  it("maps force-stop output failure to APP_STOP_FAILED even on zero exit", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "am" ] && [ "$5" = "force-stop" ]; then
  printf 'Error: Unknown option: --bad\\n' >&2
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.stopPackage({ packageName: "com.example", timeoutMs: 5000 })).rejects.toMatchObject({
      code: "APP_STOP_FAILED",
      retriable: false,
      details: { package_name: "com.example", method: "am_force_stop", exit_code: 0 }
    });
  });

  it("sends key events with argv tokens", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-key-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
exit 0
`);
    const driver = new AdbDriver({ adbPath });

    await driver.keyEvent("KEYCODE_BACK", { timeoutMs: 5000 });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell input keyevent KEYCODE_BACK"
    );
  });

  it("sends encoded text input with argv tokens", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-text-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
exit 0
`);
    const driver = new AdbDriver({ adbPath });

    await driver.textInput("hello%sworld", { timeoutMs: 5000 });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell input text hello%sworld"
    );
  });

  it("sends focused text clear as one batched keyevent argv sequence", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-text-clear-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
exit 0
`);
    const driver = new AdbDriver({ adbPath });

    await driver.clearText(3, { timeoutMs: 5000 });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell input keyevent KEYCODE_MOVE_END KEYCODE_DEL KEYCODE_DEL KEYCODE_DEL"
    );
  });

  it("sends swipe gestures with argv tokens", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-swipe-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
exit 0
`);
    const driver = new AdbDriver({ adbPath });

    await driver.swipe([50, 135], [50, 65], 300, { timeoutMs: 5000 });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell input swipe 50 135 50 65 300"
    );
  });

  it("sends double tap as one device-side shell script with bounded interval", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-double-tap-"));
    const argsFile = join(dir, "args.txt");
    const tapsFile = join(dir, "taps.txt");
    const adbPath = await createFakeAdb(`#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "devices") {
  process.stdout.write("List of devices attached\\nemulator-5554\\tdevice\\n");
  process.exit(0);
}
fs.appendFileSync(${JSON.stringify(argsFile)}, args.join(" ") + "\\n");
if (args[0] === "-s" && args[2] === "shell" && args.length === 4) {
  const commands = args[3].split(" && ");
  let taps = 0;
  for (const command of commands) {
    if (/^input tap \\d+ \\d+$/.test(command)) {
      taps += 1;
      continue;
    }
    if (/^sleep 0\\.080$/.test(command)) {
      continue;
    }
    process.exit(9);
  }
  fs.writeFileSync(${JSON.stringify(tapsFile)}, String(taps));
  process.exit(0);
}
process.exit(9);
`);
    const driver = new AdbDriver({ adbPath });

    await driver.doubleTap([10, 20], 80, { timeoutMs: 5000 });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell input tap 10 20 && sleep 0.080 && input tap 10 20"
    );
    await expect(readFile(tapsFile, "utf8")).resolves.toBe("2");
  });

  it("sends drag gestures with argv tokens", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-drag-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
exit 0
`);
    const driver = new AdbDriver({ adbPath });

    await driver.drag([10, 20], [30, 40], 1000, "draganddrop", { timeoutMs: 5000 });
    await driver.drag([50, 135], [50, 65], 300, "swipe", { timeoutMs: 5000 });

    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell input draganddrop 10 20 30 40 1000");
    expect(args).toContain("-s emulator-5554 shell input swipe 50 135 50 65 300");
  });

  it("captures screenshots with exec-out and a high binary output cap", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-screenshot-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "devices") {
  process.stdout.write("List of devices attached\\nemulator-5554\\tdevice\\n");
  process.exit(0);
}
fs.appendFileSync(${JSON.stringify(argsFile)}, args.join(" ") + "\\n");
if (args[0] === "-s" && args[2] === "exec-out" && args[3] === "screencap" && args[4] === "-p") {
  const size = 11 * 1024 * 1024;
  const buffer = Buffer.alloc(size, 0);
  buffer.set(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 0);
  fs.writeSync(1, buffer);
  process.exit(0);
}
process.exit(9);
`);
    const driver = new AdbDriver({ adbPath });

    const result = await driver.screenshot({ timeoutMs: 5000 });

    expect(result.serial).toBe("emulator-5554");
    expect(result.png.byteLength).toBe(11 * 1024 * 1024);
    expect([...result.png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 exec-out screencap -p"
    );
  });

  it("builds and parses screenrecord commands", () => {
    expect(
      buildAdbScreenrecordArgs({
        remotePath: "/data/local/tmp/autophone-screenrecord-test.mp4",
        durationSeconds: 3,
        bitRateBps: 4_000_000,
        size: "1280x720",
        bugreport: true
      })
    ).toEqual([
      "shell",
      "screenrecord",
      "--time-limit",
      "3",
      "--bit-rate",
      "4000000",
      "--size",
      "1280x720",
      "--bugreport",
      "'/data/local/tmp/autophone-screenrecord-test.mp4'"
    ]);
    expect(parseAdbScreenrecordFailure("", "", 0)).toBeUndefined();
    expect(parseAdbScreenrecordFailure("", "Encoder failed\n", 0)).toBe("Encoder failed");
    expect(parseAdbScreenrecordFailure("usage: screenrecord\n", "", 0)).toBe("usage: screenrecord");
    expect(parseAdbScreenrecordFailure("", "", 1)).toBe("screenrecord command failed");
  });

  it("records screens through Android screenrecord", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-screenrecord-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "devices") {
  process.stdout.write("List of devices attached\\nemulator-5554\\tdevice\\n");
  process.exit(0);
}
fs.appendFileSync(${JSON.stringify(argsFile)}, args.join(" ") + "\\n");
if (args[0] === "-s" && args[2] === "shell" && args[3] === "screenrecord") {
  process.exit(0);
}
process.exit(9);
`);
    const driver = new AdbDriver({ adbPath });

    const result = await driver.recordScreen({
      deviceSerial: "emulator-5554",
      remotePath: "/data/local/tmp/autophone-screenrecord-test.mp4",
      durationSeconds: 2,
      bitRateBps: 8_000_000,
      size: "1280x720",
      bugreport: true,
      timeoutMs: 20_000
    });

    expect(result).toMatchObject({
      serial: "emulator-5554",
      remotePath: "/data/local/tmp/autophone-screenrecord-test.mp4",
      exitCode: 0
    });
    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell screenrecord --time-limit 2 --bit-rate 8000000 --size 1280x720 --bugreport '/data/local/tmp/autophone-screenrecord-test.mp4'"
    );
  });

  it("maps screenrecord failures and target failures precisely", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-screenrecord-failure-"));
    const adbPath = await createFakeAdb(`#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "devices") {
  process.stdout.write("List of devices attached\\nemulator-5554\\tdevice\\n");
  process.exit(0);
}
if (args[0] === "-s" && args[2] === "shell" && args[3] === "screenrecord") {
  process.stderr.write("Encoder failed\\n");
  process.exit(0);
}
process.exit(9);
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.recordScreen({
        deviceSerial: "emulator-5554",
        remotePath: "/data/local/tmp/autophone-screenrecord-test.mp4",
        durationSeconds: 2,
        bugreport: false,
        timeoutMs: 20_000
      })
    ).rejects.toMatchObject({
      code: "SCREENRECORD_FAILED",
      message: "Encoder failed",
      details: { method: "screenrecord", exit_code: 0, duration_seconds: 2 }
    });

    const offlineAdbPath = await createFakeAdb(`#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "devices") {
  process.stdout.write("List of devices attached\\nemulator-5554\\tdevice\\n");
  process.exit(0);
}
if (args[0] === "-s" && args[2] === "shell" && args[3] === "screenrecord") {
  process.stderr.write("error: device offline\\nEncoder failed\\n");
  process.exit(1);
}
process.exit(9);
`);
    const offlineDriver = new AdbDriver({ adbPath: offlineAdbPath });

    await expect(
      offlineDriver.recordScreen({
        deviceSerial: "emulator-5554",
        remotePath: "/data/local/tmp/autophone-screenrecord-test.mp4",
        durationSeconds: 2,
        bugreport: false,
        timeoutMs: 20_000
      })
    ).rejects.toMatchObject({ code: "DEVICE_OFFLINE" });
  });
});
