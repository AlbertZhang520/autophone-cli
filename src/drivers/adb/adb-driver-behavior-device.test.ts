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
  it("reads target device details from getprop, wm, and dumpsys battery", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-info-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "getprop" ]; then
  printf '[ro.build.version.release]: [15]\\n'
  printf '[ro.build.version.sdk]: [35]\\n'
  printf '[ro.build.version.codename]: [REL]\\n'
  printf '[ro.product.vendor.manufacturer]: [Google]\\n'
  printf '[ro.product.vendor.brand]: [google]\\n'
  printf '[ro.product.vendor.model]: [sdk_gphone64_arm64]\\n'
  printf '[ro.product.vendor.name]: [sdk_gphone64_arm64]\\n'
  printf '[ro.product.vendor.device]: [emu64]\\n'
  printf '[ro.product.cpu.abilist]: [arm64-v8a,armeabi-v7a]\\n'
  printf '[persist.unrelated]: [secret]\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "wm" ] && [ "$5" = "size" ]; then
  printf 'Physical size: 1080x2400\\nOverride size: 720x1280\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "wm" ] && [ "$5" = "density" ]; then
  printf 'Physical density: 420\\nOverride density: 360\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "battery" ]; then
  printf 'Current Battery Service state:\\n'
  printf '  AC powered: false\\n'
  printf '  USB powered: true\\n'
  printf '  Wireless powered: false\\n'
  printf '  status: 2\\n'
  printf '  level: 44\\n'
  printf '  scale: 50\\n'
  printf '  temperature: 250\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceDetails({ timeoutMs: 5000 })).resolves.toMatchObject({
      device_serial: "emulator-5554",
      android: { release: "15", sdk: 35, codename: "REL" },
      hardware: {
        manufacturer: "Google",
        brand: "google",
        model: "sdk_gphone64_arm64",
        product: "sdk_gphone64_arm64",
        device: "emu64",
        supported_abis: ["arm64-v8a", "armeabi-v7a"]
      },
      display: {
        physical_size: [1080, 2400],
        override_size: [720, 1280],
        physical_density: 420,
        override_density: 360
      },
      battery: {
        level_percent: 88,
        scale: 50,
        status: "charging",
        plugged: "usb",
        temperature_celsius: 25
      },
      properties: {
        "ro.build.version.release": "15",
        "ro.build.version.sdk": "35",
        "ro.product.vendor.model": "sdk_gphone64_arm64"
      }
    });
    await expect(readFile(argsFile, "utf8")).resolves.toContain("-s emulator-5554 shell getprop");
    await expect(readFile(argsFile, "utf8")).resolves.toContain("-s emulator-5554 shell wm size");
    await expect(readFile(argsFile, "utf8")).resolves.toContain("-s emulator-5554 shell wm density");
    await expect(readFile(argsFile, "utf8")).resolves.toContain("-s emulator-5554 shell dumpsys battery");
  });

  it("reads readiness and runs wake and dismiss-keyguard commands", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-ready-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "power" ]; then
  printf 'Power Manager State:\\n  mWakefulness=Asleep\\n  mInteractive=false\\nDisplay Power: state=OFF\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "window" ]; then
  printf 'WINDOW MANAGER POLICY STATE\\n  mDreamingLockscreen=true\\n  mKeyguardSecure=true\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "input" ] && [ "$5" = "keyevent" ]; then
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "wm" ] && [ "$5" = "dismiss-keyguard" ]; then
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceReadyState({ timeoutMs: 5000 })).resolves.toMatchObject({
      device_serial: "emulator-5554",
      awake: false,
      interactive: false,
      keyguard_showing: true,
      keyguard_secure: true
    });
    await expect(driver.wakeDevice({ deviceSerial: "emulator-5554", timeoutMs: 5000 })).resolves.toMatchObject({
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });
    await expect(driver.dismissKeyguard({ deviceSerial: "emulator-5554", timeoutMs: 5000 })).resolves.toMatchObject({
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });
    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell dumpsys power");
    expect(args).toContain("-s emulator-5554 shell dumpsys window");
    expect(args).toContain("-s emulator-5554 shell input keyevent KEYCODE_WAKEUP");
    expect(args).toContain("-s emulator-5554 shell wm dismiss-keyguard");
  });

  it("reads screen state through dumpsys power and window without mutating the device", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-screen-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "power" ]; then
  printf 'Power Manager State:\\n  mWakefulness=Awake\\n  mInteractive=true\\nDisplay Power: state=ON\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "window" ]; then
  printf 'WINDOW MANAGER POLICY STATE\\n  mDreamingLockscreen=false\\n  mKeyguardSecure=false\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceScreenState({ timeoutMs: 5000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      state: {
        device_serial: "emulator-5554",
        awake: true,
        interactive: true,
        display_power_state: "ON",
        keyguard_showing: false,
        keyguard_secure: false
      },
      queries: {
        power: { exitCode: 0, durationMs: expect.any(Number) as number },
        window: { exitCode: 0, durationMs: expect.any(Number) as number }
      }
    });
    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell dumpsys power");
    expect(args).toContain("-s emulator-5554 shell dumpsys window");
    expect(args).not.toContain("keyevent");
    expect(args).not.toContain("dismiss-keyguard");
  });

  it("reads screen state when display power is absent but wakefulness is available", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "power" ]; then
  printf 'Power Manager State:\\n  mWakefulness=Awake\\n  mInteractive=true\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "window" ]; then
  printf 'WINDOW MANAGER POLICY STATE\\n  mDreamingLockscreen=false\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceScreenState({ timeoutMs: 5000 })).resolves.toMatchObject({
      state: {
        wakefulness: "Awake",
        awake: true,
        interactive: true,
        display_power_state: null
      }
    });
  });

  it("fails screen state when dumpsys power exposes no usable screen signal", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "power" ]; then
  printf 'Power Manager State:\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "window" ]; then
  printf 'WINDOW MANAGER POLICY STATE\\n  mDreamingLockscreen=false\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceScreenState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_SCREEN_FAILED",
      retriable: false,
      details: { method: "dumpsys_power" }
    });
  });

  it("maps screen target failures before parse failures", async () => {
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

    await expect(driver.getDeviceScreenState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads network state through settings and dumpsys connectivity without returning identifiers", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-network-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "airplane_mode_on" ]; then
  printf '0\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "wifi_on" ]; then
  printf '1\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "mobile_data" ]; then
  printf 'null\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "connectivity" ]; then
  printf 'Active default network: 101\\nNetworkAgentInfo{network{101} handle{1} ni{WIFI CONNECTED} nc{[ Transports: WIFI Capabilities: NOT_METERED&INTERNET&TRUSTED&NOT_VPN&VALIDATED ]}\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceNetworkState({ timeoutMs: 5000 })).resolves.toEqual({
      serial: "emulator-5554",
      settings: { airplane_mode_on: false, wifi_on: true, mobile_data_on: null },
      active: {
        network_id: 101,
        transports: ["wifi"],
        primary_transport: "wifi",
        internet_capable: true,
        validated: true,
        online: true
      },
      queries: {
        airplaneMode: { exitCode: 0, durationMs: expect.any(Number) as number },
        wifi: { exitCode: 0, durationMs: expect.any(Number) as number },
        mobileData: { exitCode: 0, durationMs: expect.any(Number) as number },
        connectivity: { exitCode: 0, durationMs: expect.any(Number) as number }
      }
    });
    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell settings get global airplane_mode_on");
    expect(args).toContain("-s emulator-5554 shell settings get global wifi_on");
    expect(args).toContain("-s emulator-5554 shell settings get global mobile_data");
    expect(args).toContain("-s emulator-5554 shell dumpsys connectivity");
    expect(args).not.toContain("keyevent");
    expect(args).not.toContain("dismiss-keyguard");
  });

  it("redacts connectivity dumps from network parse failure details", async () => {
    const sensitiveLine = "NetworkAgentInfo{network{101} private-ssid bssid ip-address mac-address}";
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ]; then
  printf '1\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "connectivity" ]; then
  printf 'Active default network: 101\\n${sensitiveLine}\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceNetworkState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_NETWORK_FAILED",
      retriable: false,
      details: {
        method: "settings_and_dumpsys_connectivity",
        connectivity_stdout_chars: expect.any(Number) as number
      }
    });
    try {
      await driver.getDeviceNetworkState({ timeoutMs: 5000 });
    } catch (error) {
      expect(error).toBeInstanceOf(AutophoneError);
      expect(JSON.stringify((error as AutophoneError).details)).not.toContain(sensitiveLine);
    }
  });

  it("maps network target failures before parse failures", async () => {
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

    await expect(driver.getDeviceNetworkState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads device storage state through fixed statfs paths", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-storage-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "stat" ] && [ "$5" = "-f" ]; then
  printf '/data|4096|100|60|70|f2fs\\n/sdcard|4096|100|60|70|0x65735546\\n/data/local/tmp|4096|100|60|70|f2fs\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceStorageState({ timeoutMs: 5000 })).resolves.toEqual({
      serial: "emulator-5554",
      entries: [
        {
          role: "data",
          path: "/data",
          ok: true,
          filesystemType: "f2fs",
          blockSizeBytes: 4096,
          totalBlocks: 100,
          availableBlocks: 60,
          freeBlocks: 70
        },
        {
          role: "shared",
          path: "/sdcard",
          ok: true,
          filesystemType: "0x65735546",
          blockSizeBytes: 4096,
          totalBlocks: 100,
          availableBlocks: 60,
          freeBlocks: 70
        },
        {
          role: "tmp",
          path: "/data/local/tmp",
          ok: true,
          filesystemType: "f2fs",
          blockSizeBytes: 4096,
          totalBlocks: 100,
          availableBlocks: 60,
          freeBlocks: 70
        }
      ],
      paths: ["/data", "/sdcard", "/data/local/tmp"],
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });
    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell stat -f -c '%n|%S|%b|%a|%f|%T' -- '/data' '/sdcard' '/data/local/tmp'");
  });

  it("keeps partial device storage statfs failures as unavailable entries", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "stat" ] && [ "$5" = "-f" ]; then
  printf '/data|4096|100|60|70|f2fs\\n/data/local/tmp|4096|100|60|70|f2fs\\n'
  printf "stat: '/sdcard': No such file or directory\\n" >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceStorageState({ timeoutMs: 5000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      entries: [
        { role: "data", path: "/data", ok: true },
        {
          role: "shared",
          path: "/sdcard",
          ok: false,
          error: { reason: "statfs_failed", message: "No such file or directory" }
        },
        { role: "tmp", path: "/data/local/tmp", ok: true }
      ],
      paths: ["/data", "/sdcard", "/data/local/tmp"],
      exitCode: 1
    });
  });

  it("maps device storage parser failures to DEVICE_STORAGE_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "stat" ] && [ "$5" = "-f" ]; then
  printf 'stat: bad option -- f\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceStorageState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_STORAGE_FAILED",
      retriable: false,
      details: {
        method: "statfs_paths",
        exit_code: 1
      }
    });
  });

  it("maps device storage target failures before statfs parse failures", async () => {
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

    await expect(driver.getDeviceStorageState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads device battery state through dumpsys battery", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-battery-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "battery" ]; then
  printf 'Current Battery Service state:\\n'
  printf '  AC powered: true\\n'
  printf '  USB powered: false\\n'
  printf '  Wireless powered: false\\n'
  printf '  Dock powered: false\\n'
  printf '  Charge counter: 4909000\\n'
  printf '  status: 2\\n'
  printf '  health: 2\\n'
  printf '  present: true\\n'
  printf '  level: 98\\n'
  printf '  scale: 100\\n'
  printf '  voltage: 4373\\n'
  printf '  temperature: 313\\n'
  printf '  technology: Li-poly\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceBatteryState({ timeoutMs: 5000 })).resolves.toMatchObject({
      serial: "emulator-5554",
      battery: {
        level_percent: 98,
        scale: 100,
        status: "charging",
        plugged: "ac",
        temperature_celsius: 31.3,
        health: "good",
        present: true,
        voltage_mv: 4373,
        technology: "Li-poly",
        charge_counter_uah: 4_909_000
      },
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });
    await expect(readFile(argsFile, "utf8")).resolves.toContain("-s emulator-5554 shell dumpsys battery");
  });

  it("maps device battery failures and target failures separately", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "battery" ]; then
  printf 'dumpsys unavailable\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceBatteryState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_BATTERY_FAILED",
      retriable: false,
      details: {
        method: "dumpsys_battery",
        exit_code: 1
      }
    });

    const offlineAdbPath = await createFakeAdb(`#!/bin/sh
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
    const offlineDriver = new AdbDriver({ adbPath: offlineAdbPath });
    await expect(offlineDriver.getDeviceBatteryState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads device time state through date, settings, and getprop", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-time-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "date" ]; then
  printf '1782800012+0800\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "auto_time" ]; then
  printf '1\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "auto_time_zone" ]; then
  printf '1\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "time_zone" ]; then
  printf 'null\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "getprop" ] && [ "$5" = "persist.sys.timezone" ]; then
  printf 'Asia/Shanghai\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceTimeState({ timeoutMs: 5000 })).resolves.toEqual({
      serial: "emulator-5554",
      time: {
        unix_epoch_seconds: 1_782_800_012,
        timezone_offset: "+08:00",
        timezone_offset_minutes: 480
      },
      settings: {
        auto_time: true,
        auto_time_zone: true
      },
      timezoneSources: {
        settings_global_time_zone: null,
        persist_sys_timezone: "Asia/Shanghai"
      },
      queries: {
        date: { exitCode: 0, durationMs: expect.any(Number) as number },
        autoTime: { exitCode: 0, durationMs: expect.any(Number) as number },
        autoTimeZone: { exitCode: 0, durationMs: expect.any(Number) as number },
        settingsTimeZone: { exitCode: 0, durationMs: expect.any(Number) as number },
        persistSysTimeZone: { exitCode: 0, durationMs: expect.any(Number) as number }
      }
    });
    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell date +%s%z");
    expect(args).toContain("-s emulator-5554 shell settings get global auto_time");
    expect(args).toContain("-s emulator-5554 shell settings get global auto_time_zone");
    expect(args).toContain("-s emulator-5554 shell settings get global time_zone");
    expect(args).toContain("-s emulator-5554 shell getprop persist.sys.timezone");
  });

  it("maps device time parser failures and target failures separately", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "date" ]; then
  printf 'bad-date\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ]; then
  printf '1\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "getprop" ]; then
  printf 'Asia/Shanghai\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceTimeState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_TIME_FAILED",
      retriable: false,
      details: {
        method: "device_time_sources"
      }
    });

    const offlineAdbPath = await createFakeAdb(`#!/bin/sh
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
    const offlineDriver = new AdbDriver({ adbPath: offlineAdbPath });
    await expect(offlineDriver.getDeviceTimeState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads device locale sources through settings and getprop", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-locale-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "system_locales" ]; then
  printf 'zh-CN\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "getprop" ] && [ "$5" = "persist.sys.locale" ]; then
  printf 'zh-CN\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "getprop" ] && [ "$5" = "ro.product.locale" ]; then
  printf 'zh-CN\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "getprop" ] && [ "$5" = "ro.product.locale.language" ]; then
  printf '\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "getprop" ] && [ "$5" = "ro.product.locale.region" ]; then
  printf '\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceLocaleState({ timeoutMs: 5000 })).resolves.toEqual({
      serial: "emulator-5554",
      sources: {
        system_locales: "zh-CN",
        persist_sys_locale: "zh-CN",
        ro_product_locale: "zh-CN",
        ro_product_locale_language: null,
        ro_product_locale_region: null
      },
      queries: {
        systemLocales: { exitCode: 0, durationMs: expect.any(Number) as number },
        persistSysLocale: { exitCode: 0, durationMs: expect.any(Number) as number },
        roProductLocale: { exitCode: 0, durationMs: expect.any(Number) as number },
        roProductLocaleLanguage: { exitCode: 0, durationMs: expect.any(Number) as number },
        roProductLocaleRegion: { exitCode: 0, durationMs: expect.any(Number) as number }
      }
    });
    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell settings get system system_locales");
    expect(args).toContain("-s emulator-5554 shell getprop persist.sys.locale");
    expect(args).toContain("-s emulator-5554 shell getprop ro.product.locale");
    expect(args).toContain("-s emulator-5554 shell getprop ro.product.locale.language");
    expect(args).toContain("-s emulator-5554 shell getprop ro.product.locale.region");
  });

  it("maps device locale source failures to DEVICE_LOCALE_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "system_locales" ]; then
  printf 'settings unavailable\\n' >&2
  exit 1
fi
if [ "$1" = "-s" ] && [ "$4" = "getprop" ]; then
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceLocaleState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_LOCALE_FAILED",
      retriable: false,
      details: {
        method: "settings_system_system_locales",
        exit_code: 1
      }
    });
  });

  it("maps device locale target failures before source parse failures", async () => {
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

    await expect(driver.getDeviceLocaleState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads input method state through dumpsys and secure settings without returning raw dumps", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-device-ime-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "input_method" ]; then
  printf 'Input Method Manager Service state:\\n  mCurMethodId=com.example.ime/.ImeService\\n  mRequestedShowExplicitly=false mShowForced=false\\n  mInputShown=false\\n  mInFullscreenMode=false\\n  mSystemReady=true mInteractive=true\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "default_input_method" ]; then
  printf 'com.example.ime/.ImeService\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "enabled_input_methods" ]; then
  printf 'com.example.ime/.ImeService:com.android.adbkeyboard/.AdbIME\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceImeState({ timeoutMs: 5000 })).resolves.toEqual({
      serial: "emulator-5554",
      keyboard: { shown: false, show_requested: false, fullscreen_mode: false },
      service: { system_ready: true, interactive: true },
      ime: {
        current_id: "com.example.ime/.ImeService",
        default_id: "com.example.ime/.ImeService",
        enabled_ids: ["com.example.ime/.ImeService", "com.android.adbkeyboard/.AdbIME"],
        enabled_count: 2
      },
      queries: {
        inputMethod: { exitCode: 0, durationMs: expect.any(Number) as number },
        defaultInputMethod: { exitCode: 0, durationMs: expect.any(Number) as number },
        enabledInputMethods: { exitCode: 0, durationMs: expect.any(Number) as number }
      }
    });
    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell dumpsys input_method");
    expect(args).toContain("-s emulator-5554 shell settings get secure default_input_method");
    expect(args).toContain("-s emulator-5554 shell settings get secure enabled_input_methods");
    expect(args).not.toContain("keyevent");
    expect(args).not.toContain("input text");
  });

  it("redacts input method dumps from IME parse failure details", async () => {
    const sensitiveLine = "mCurFocusedWindow=android.os.BinderProxy@abc client=ClientState{secret}";
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "input_method" ]; then
  printf '${sensitiveLine}\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "default_input_method" ]; then
  printf 'com.example.ime/.ImeService\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "settings" ] && [ "$7" = "enabled_input_methods" ]; then
  printf 'com.example.ime/.ImeService\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(driver.getDeviceImeState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_IME_FAILED",
      retriable: false,
      details: {
        method: "input_method_service_and_secure_settings_parse",
        input_method_stdout_chars: expect.any(Number) as number
      }
    });
    try {
      await driver.getDeviceImeState({ timeoutMs: 5000 });
    } catch (error) {
      expect(error).toBeInstanceOf(AutophoneError);
      expect(JSON.stringify((error as AutophoneError).details)).not.toContain(sensitiveLine);
    }
  });

  it("maps IME target failures before parse failures", async () => {
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

    await expect(driver.getDeviceImeState({ timeoutMs: 5000 })).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });
});
