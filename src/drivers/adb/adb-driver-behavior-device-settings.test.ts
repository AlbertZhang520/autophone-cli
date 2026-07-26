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
} from "./adb-driver-test-utils.test-support.js";describe("adb driver behavior device", () => {

  it("reads display brightness through settings and dumpsys display without returning raw dumps", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-brightness-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "screen_brightness" ]; then
  printf '128\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "screen_brightness_mode" ]; then
  printf '1\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "screen_auto_brightness_adj" ]; then
  printf '0.0\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "screen_brightness_float" ]; then
  printf 'null\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "display" ]; then
  printf 'Display Brightness=0.5\\nDisplay SdrBrightness=0.5\\nmCachedBrightnessInfo.brightness=0.5\\nmCachedBrightnessInfo.adjustedBrightness=0.4\\nmCachedBrightnessInfo.brightnessMin=0.0\\nmCachedBrightnessInfo.brightnessMax=1.0\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceBrightnessState({ timeoutMs: 5000 })).resolves.toEqual({
      serial: "emulator-5554",
      settings: {
        screen_brightness: { raw: 128, max: 255, normalized: 128 / 255 },
        mode: { raw: 1, value: "automatic" },
        auto_brightness_adjustment: 0,
        screen_brightness_float: null
      },
      display: {
        brightness: 0.5,
        sdr_brightness: 0.5,
        cached_brightness: 0.5,
        cached_adjusted_brightness: 0.4,
        min: 0,
        max: 1
      },
      queries: {
        brightness: { exitCode: 0, durationMs: expect.any(Number) as number },
        mode: { exitCode: 0, durationMs: expect.any(Number) as number },
        autoAdjustment: { exitCode: 0, durationMs: expect.any(Number) as number },
        brightnessFloat: { exitCode: 0, durationMs: expect.any(Number) as number },
        display: { exitCode: 0, durationMs: expect.any(Number) as number }
      }
    });
    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell settings get system screen_brightness");
    expect(args).toContain("-s emulator-5554 shell settings get system screen_brightness_mode");
    expect(args).toContain("-s emulator-5554 shell settings get system screen_auto_brightness_adj");
    expect(args).toContain("-s emulator-5554 shell settings get system screen_brightness_float");
    expect(args).toContain("-s emulator-5554 shell dumpsys display");
    expect(args).not.toContain("settings put");
    expect(args).not.toContain("input keyevent");
  });

  it("redacts display dumps from brightness parse failure details", async () => {
    const sensitiveLine = 'DisplayDeviceInfo{uniqueId="local:secret" deviceProductInfo DeviceProductInfo{name=SecretPanel}}';
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "screen_brightness" ]; then
  printf '128\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "screen_brightness_mode" ]; then
  printf '1\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "screen_auto_brightness_adj" ]; then
  printf '0.0\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "screen_brightness_float" ]; then
  printf 'null\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "display" ]; then
  printf '${sensitiveLine}\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceBrightnessState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_BRIGHTNESS_FAILED",
      retriable: false,
      details: {
        method: "display_brightness_settings_and_dumpsys_parse",
        dumpsys_display_stdout_chars: expect.any(Number) as number
      }
    });
    try {
      await driver.getDeviceBrightnessState({ timeoutMs: 5000 });
    } catch (error) {
      expect(error).toBeInstanceOf(AutophoneError);
      expect(JSON.stringify((error as AutophoneError).details)).not.toContain(sensitiveLine);
    }
  });

  it("maps brightness target failures before parse failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceBrightnessState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("runs statusbar panel commands through cmd statusbar", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-statusbar-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "statusbar" ]; then
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.controlStatusBar("expand-notifications", { timeoutMs: 5000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      command: "expand-notifications",
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });
    await expect(driver.controlStatusBar("collapse", { timeoutMs: 5000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      command: "collapse"
    });

    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell cmd statusbar expand-notifications");
    expect(args).toContain("-s emulator-5554 shell cmd statusbar collapse");
  });

  it("fails statusbar commands on exit-zero usage output", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "statusbar" ]; then
  printf '  Usage: adb shell cmd statusbar <command>\\n'
  printf '    known commands:\\n'
  printf '     media-mute-await\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.controlStatusBar("expand-settings", { timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_STATUSBAR_FAILED",
      retriable: false,
      details: { method: "cmd_statusbar", command: "expand-settings", exit_code: 0 }
    });
  });

  it("fails statusbar commands on nonzero exit with empty output", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "statusbar" ]; then
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.controlStatusBar("collapse", { timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_STATUSBAR_FAILED",
      message: "cmd statusbar command did not complete with clean output",
      retriable: false,
      details: { method: "cmd_statusbar", command: "collapse", exit_code: 1 }
    });
  });

  it("reads ordered statusbar icon slots through cmd statusbar", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-statusbar-icons-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "statusbar" ] && [ "$6" = "get-status-icons" ]; then
  printf 'wifi\\n'
  printf 'battery\\n'
  printf 'clock\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getStatusBarIcons({ timeoutMs: 5000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      icons: ["wifi", "battery", "clock"],
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });
    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell cmd statusbar get-status-icons"
    );
  });

  it("returns an empty statusbar icon list for clean empty output", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "statusbar" ] && [ "$6" = "get-status-icons" ]; then
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getStatusBarIcons({ timeoutMs: 5000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      icons: [],
      exitCode: 0
    });
  });

  it("fails statusbar icon queries on exit-zero usage output", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "statusbar" ] && [ "$6" = "get-status-icons" ]; then
  printf '  Usage: adb shell cmd statusbar <command>\\n'
  printf '    known commands:\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getStatusBarIcons({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_STATUSBAR_FAILED",
      retriable: false,
      details: { method: "cmd_statusbar_get_status_icons", exit_code: 0 }
    });
  });

  it("fails statusbar icon queries on malformed slot lines", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "statusbar" ] && [ "$6" = "get-status-icons" ]; then
  printf 'slot -> StatusBarIcon(icon=wifi)\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getStatusBarIcons({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_STATUSBAR_FAILED",
      retriable: false,
      details: {
        method: "cmd_statusbar_get_status_icons",
        invalid_lines: ["slot -> StatusBarIcon(icon=wifi)"]
      }
    });
  });

  it("classifies target failures before statusbar icon parse failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "statusbar" ] && [ "$6" = "get-status-icons" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getStatusBarIcons({ deviceSerial: "emulator-5554", timeoutMs: 5000 })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads AudioManager stream volume through cmd media_session", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-volume-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "media_session" ] && [ "$6" = "volume" ] && [ "$7" = "--stream" ] && [ "$8" = "4" ] && [ "$9" = "--get" ]; then
  printf '[V] will control stream=4 (STREAM_ALARM)\\n'
  printf '[V] will get volume\\n'
  printf '[V] Connecting to AudioService\\n'
  printf '[V] volume is 12 in range [1..15]\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getVolume({ stream: ALARM_STREAM, timeoutMs: 5000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      stream: ALARM_STREAM,
      volume: { index: 12, min: 1, max: 15 },
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });
    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell cmd media_session volume --stream 4 --get"
    );
  });

  it("fails volume queries on usage and exception output", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "media_session" ] && [ "$6" = "volume" ]; then
  printf 'usage: media_session [subcommand] [options]\\n'
  printf 'java.lang.IllegalArgumentException: Bad stream type 999\\n'
  exit 255
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getVolume({ stream: MUSIC_STREAM, timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_VOLUME_FAILED",
      retriable: false,
      details: { method: "cmd_media_session_volume_get", stream: "music", android_stream_id: 3, exit_code: 255 }
    });
  });

  it("fails volume queries when the controlled stream echo mismatches the request", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "media_session" ] && [ "$6" = "volume" ]; then
  printf '[V] will control stream=2 (STREAM_RING)\\n'
  printf '[V] volume is 0 in range [0..15]\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getVolume({ stream: MUSIC_STREAM, timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_VOLUME_FAILED",
      retriable: false,
      details: {
        method: "cmd_media_session_volume_get",
        failure: "cmd media_session volume output controlled a different stream than requested"
      }
    });
  });

  it("classifies target failures before volume parse failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "media_session" ] && [ "$6" = "volume" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getVolume({ stream: MUSIC_STREAM, deviceSerial: "emulator-5554", timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads AudioService ringer state through dumpsys audio", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-ringer-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "audio" ]; then
  printf 'Ringer mode: \\n'
  printf -- '- mode (internal) = SILENT\\n'
  printf -- '- mode (external) = SILENT\\n'
  printf -- '- zen mode:ZEN_MODE_OFF\\n'
  printf -- '- ringer mode affected streams = 0x126 (STREAM_SYSTEM,STREAM_RING,STREAM_NOTIFICATION,STREAM_DTMF)\\n'
  printf -- '- ringer mode muted streams = 0x126 (STREAM_SYSTEM,STREAM_RING,STREAM_NOTIFICATION,STREAM_DTMF)\\n'
  printf 'Audio mode:\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getRinger({ timeoutMs: 5000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      ringer: {
        internal: { mode: "silent", raw: "SILENT" },
        external: { mode: "silent", raw: "SILENT" }
      },
      zen: { mode: "off", raw: "ZEN_MODE_OFF", source: "dumpsys_audio_ringer_section" },
      affectedStreams: {
        mask_hex: "0x126",
        streams: ["STREAM_SYSTEM", "STREAM_RING", "STREAM_NOTIFICATION", "STREAM_DTMF"],
        residual_tokens: []
      },
      mutedStreams: {
        mask_hex: "0x126",
        streams: ["STREAM_SYSTEM", "STREAM_RING", "STREAM_NOTIFICATION", "STREAM_DTMF"],
        residual_tokens: []
      },
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });
    await expect(readFile(argsFile, "utf8")).resolves.toContain("-s emulator-5554 shell dumpsys audio");
  });

  it("fails ringer queries on malformed dumpsys audio while bounding error details", async () => {
    const longLine = "x".repeat(5000);
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "audio" ]; then
  printf '${longLine}\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getRinger({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_RINGER_FAILED",
      retriable: false,
      details: {
        method: "dumpsys_audio",
        exit_code: 0,
        failure: "dumpsys audio output did not contain exactly one Ringer mode section"
      }
    });
    await driver.getRinger({ timeoutMs: 5000 }).catch((error: unknown) => {
      expect(error).toBeInstanceOf(AutophoneError);
      expect((error as AutophoneError).details?.stdout).toMatch(/truncated/);
    });
  });

  it("classifies target failures before ringer parse failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "audio" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getRinger({ deviceSerial: "emulator-5554", timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads animation scales through global settings without mutating device state", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-animations-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$6" = "global" ] && [ "$7" = "window_animation_scale" ]; then
  printf '1.0\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$6" = "global" ] && [ "$7" = "transition_animation_scale" ]; then
  printf '0.5\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$6" = "global" ] && [ "$7" = "animator_duration_scale" ]; then
  printf 'null\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceAnimationsState({ timeoutMs: 5000 })).resolves.toEqual({
      serial: "emulator-5554",
      settings: {
        window_animation_scale: { raw: "1.0", value: 1 },
        transition_animation_scale: { raw: "0.5", value: 0.5 },
        animator_duration_scale: { raw: null, value: null }
      },
      queries: {
        window: { exitCode: 0, durationMs: expect.any(Number) as number },
        transition: { exitCode: 0, durationMs: expect.any(Number) as number },
        animator: { exitCode: 0, durationMs: expect.any(Number) as number }
      }
    });
    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell settings get global window_animation_scale");
    expect(args).toContain("-s emulator-5554 shell settings get global transition_animation_scale");
    expect(args).toContain("-s emulator-5554 shell settings get global animator_duration_scale");
    expect(args).not.toContain("settings put");
    expect(args).not.toContain("input keyevent");
  });

  it("sets animation scales through global settings puts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-animations-set-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$5" = "put" ] && [ "$6" = "global" ] && [ "$8" = "0.5" ]; then
  case "$7" in
    window_animation_scale|transition_animation_scale|animator_duration_scale) exit 0 ;;
  esac
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.setDeviceAnimationScales({ deviceSerial: "emulator-5554", timeoutMs: 5000, scale: 0.5 })
    ).resolves.toEqual({
      serial: "emulator-5554",
      scale: 0.5,
      commands: {
        window: { exitCode: 0, durationMs: expect.any(Number) as number },
        transition: { exitCode: 0, durationMs: expect.any(Number) as number },
        animator: { exitCode: 0, durationMs: expect.any(Number) as number }
      }
    });
    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell settings put global window_animation_scale 0.5");
    expect(args).toContain("-s emulator-5554 shell settings put global transition_animation_scale 0.5");
    expect(args).toContain("-s emulator-5554 shell settings put global animator_duration_scale 0.5");
    expect(args).not.toContain("settings get");
  });

  it("fails animation scale puts that write unexpected output", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$5" = "put" ]; then
  printf 'ignored\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.setDeviceAnimationScales({ deviceSerial: "emulator-5554", timeoutMs: 5000, scale: 1 })
    ).rejects.toMatchObject({
      code: "DEVICE_ANIMATIONS_SET_FAILED",
      retriable: false,
      details: {
        method: "settings_put_global_window_animation_scale",
        partial_mutation_possible: true,
        rollback_attempted: false
      }
    });
  });

  it("reports the failing animation scale put method after an earlier setting changed", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-animations-set-partial-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$5" = "put" ] && [ "$7" = "window_animation_scale" ]; then
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$5" = "put" ] && [ "$7" = "transition_animation_scale" ]; then
  printf 'Security exception\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.setDeviceAnimationScales({ deviceSerial: "emulator-5554", timeoutMs: 5000, scale: 0 })
    ).rejects.toMatchObject({
      code: "DEVICE_ANIMATIONS_SET_FAILED",
      retriable: false,
      details: {
        method: "settings_put_global_transition_animation_scale",
        partial_mutation_possible: true,
        rollback_attempted: false
      }
    });
    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell settings put global window_animation_scale 0");
    expect(args).toContain("-s emulator-5554 shell settings put global transition_animation_scale 0");
    expect(args).not.toContain("animator_duration_scale");
  });

  it("maps animation scale put target failures before command failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$5" = "put" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.setDeviceAnimationScales({ deviceSerial: "emulator-5554", timeoutMs: 5000, scale: 0 })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("fails animation scale parsing conservatively", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "window_animation_scale" ]; then
  printf 'fast\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "transition_animation_scale" ]; then
  printf '1.0\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "animator_duration_scale" ]; then
  printf '1.0\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceAnimationsState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_ANIMATIONS_FAILED",
      retriable: false,
      details: {
        method: "animation_scale_settings_parse",
        failure: "settings global window_animation_scale returned an invalid animation scale"
      }
    });
  });

  it("maps animation scale target failures before parse failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceAnimationsState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads accessibility state through secure settings", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-accessibility-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$6" = "secure" ] && [ "$7" = "accessibility_enabled" ]; then
  printf '1\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$6" = "secure" ] && [ "$7" = "touch_exploration_enabled" ]; then
  printf '0\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$6" = "secure" ] && [ "$7" = "enabled_accessibility_services" ]; then
  printf 'com.example/.ReaderService:com.android.talkback/com.android.talkback.TalkBackService\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceAccessibilityState({ timeoutMs: 5000 })).resolves.toEqual({
      serial: "emulator-5554",
      settings: {
        accessibility_enabled: { raw: "1", value: true },
        touch_exploration_enabled: { raw: "0", value: false },
        enabled_accessibility_services: {
          raw: "com.example/.ReaderService:com.android.talkback/com.android.talkback.TalkBackService",
          services: ["com.example/.ReaderService", "com.android.talkback/com.android.talkback.TalkBackService"],
          count: 2
        }
      },
      queries: {
        accessibilityEnabled: { exitCode: 0, durationMs: expect.any(Number) as number },
        touchExplorationEnabled: { exitCode: 0, durationMs: expect.any(Number) as number },
        enabledAccessibilityServices: { exitCode: 0, durationMs: expect.any(Number) as number }
      }
    });
    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell settings get secure accessibility_enabled");
    expect(args).toContain("-s emulator-5554 shell settings get secure touch_exploration_enabled");
    expect(args).toContain("-s emulator-5554 shell settings get secure enabled_accessibility_services");
    expect(args).not.toContain("settings put");
    expect(args).not.toContain("dumpsys accessibility");
  });

  it("fails accessibility parsing conservatively", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "accessibility_enabled" ]; then
  printf 'enabled\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "touch_exploration_enabled" ]; then
  printf '0\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "enabled_accessibility_services" ]; then
  printf '\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceAccessibilityState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_ACCESSIBILITY_FAILED",
      retriable: false,
      details: {
        method: "accessibility_secure_settings_parse",
        failure: "settings secure accessibility_enabled returned an unexpected boolean value"
      }
    });
  });

  it("maps accessibility target failures before parse failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceAccessibilityState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads notification records through dumpsys notification --noredact", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-notifications-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "notification" ] && [ "$6" = "--noredact" ]; then
  printf 'Current Notification Manager state:\\n'
  printf '  Notification List:\\n'
  printf '    NotificationRecord(0x01: pkg=com.example.app user=UserHandle{0} id=42 tag=null importance=4 key=0|com.example.app|42|null|10001 bbbc=0: Notification(channel=messages shortcut=null contentView=null vibrate=null sound=null defaults=0 flags=AUTO_CANCEL color=0x00000000 category=msg vis=PRIVATE))\\n'
  printf '      extras={\\n'
  printf '          android.title=String (Alice)\\n'
  printf '          android.text=String (Code 123456)\\n'
  printf '      }\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getNotifications({ timeoutMs: 5000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      notifications: [
        {
          key: "0|com.example.app|42|null|10001",
          package_name: "com.example.app",
          user_id: 0,
          notification_id: 42,
          channel_id: "messages",
          category: "msg",
          visibility: "private",
          flags: ["AUTO_CANCEL"],
          title: "Alice",
          text: "Code 123456"
        }
      ],
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });
    await expect(readFile(argsFile, "utf8")).resolves.toContain("-s emulator-5554 shell dumpsys notification --noredact");
  });

  it("fails notification parsing without leaking raw notification content", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "notification" ]; then
  printf 'Current Notification Manager state:\\n'
  printf '  Notification List:\\n'
  printf '    NotificationRecord(0x01: user=UserHandle{0})\\n'
  printf '          android.text=String (private-secret-code)\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    let caught: unknown;
    try {
      await driver.getNotifications({ timeoutMs: 5000 });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AutophoneError);
    const error = caught as AutophoneError;
    expect(error).toMatchObject({
      code: "DEVICE_NOTIFICATIONS_FAILED",
      retriable: false,
      details: {
        method: "dumpsys_notification_noredact",
        exit_code: 0,
        failure: "notification record header was not parseable"
      }
    });
    expect(JSON.stringify(error.details)).not.toContain("private-secret-code");
  });

  it("classifies target failures before notification parse failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "notification" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getNotifications({ deviceSerial: "emulator-5554", timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("classifies target failures before statusbar command failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "statusbar" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.controlStatusBar("expand-notifications", { deviceSerial: "emulator-5554", timeoutMs: 5000 })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("returns partial device details when optional info commands fail", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "getprop" ]; then
  printf '[ro.build.version.sdk]: [35]\\n'
  printf '[ro.product.cpu.abilist64]: [arm64-v8a]\\n'
  printf '[ro.product.cpu.abilist32]: [armeabi-v7a]\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "wm" ]; then
  printf 'cmd: unknown command\\n' >&2
  exit 1
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "battery" ]; then
  printf '  AC powered: false\\n'
  printf '  USB powered: false\\n'
  printf '  Wireless powered: false\\n'
  printf '  status: 5\\n'
  printf '  level: 100\\n'
  printf '  scale: 100\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceDetails({ timeoutMs: 5000 })).resolves.toMatchObject({
      android: { sdk: 35 },
      hardware: { supported_abis: ["arm64-v8a", "armeabi-v7a"] },
      display: {
        physical_size: null,
        override_size: null,
        physical_density: null,
        override_density: null
      },
      battery: {
        level_percent: 100,
        status: "full",
        plugged: "none"
      }
    });
  });
});
