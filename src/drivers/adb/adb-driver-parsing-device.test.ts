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

describe("adb driver parsing device state", () => {
  it("parses selected getprop, display, and battery details", () => {
    expect(
      parseGetpropOutput(
        [
          "[ro.build.version.release]: [15]",
          "[ro.product.vendor.model]: [Pixel 9]",
          "[ro.product.cpu.abilist]: [arm64-v8a,armeabi-v7a]",
          "[debug.secret]: [ignored]"
        ].join("\n")
      )
    ).toMatchObject({
      "ro.build.version.release": "15",
      "ro.product.vendor.model": "Pixel 9",
      "ro.product.cpu.abilist": "arm64-v8a,armeabi-v7a",
      "debug.secret": "ignored"
    });

    expect(parseWindowSizeDetails("Physical size: 1080x2400\nOverride size: 720x1280\n")).toEqual({
      physical_size: [1080, 2400],
      override_size: [720, 1280]
    });
    expect(parseWindowDensityDetails("Physical density: 420\nOverride density: 360\n")).toEqual({
      physical_density: 420,
      override_density: 360
    });
    expect(parseWindowSizeDetails("Physical size: 0x0\nOverride size: 720x0\n")).toEqual({
      physical_size: null,
      override_size: null
    });
    expect(parseWindowDensityDetails("Physical density: 0\nOverride density: 0\n")).toEqual({
      physical_density: null,
      override_density: null
    });
    expect(
      parseBatteryDetails(
        [
          "Current Battery Service state:",
          "  AC powered: false",
          "  USB powered: true",
          "  Wireless powered: false",
          "  status: 2",
          "  level: 44",
          "  scale: 50",
          "  temperature: 250"
        ].join("\n")
      )
    ).toEqual({
      level_percent: 88,
      scale: 50,
      status: "charging",
      plugged: "usb",
      temperature_celsius: 25
    });
  });

  it("parses missing device detail fields as null values", () => {
    expect(parseWindowSizeDetails("")).toEqual({ physical_size: null, override_size: null });
    expect(parseWindowDensityDetails("")).toEqual({ physical_density: null, override_density: null });
    expect(parseBatteryDetails("")).toEqual({
      level_percent: null,
      scale: null,
      status: null,
      plugged: null,
      temperature_celsius: null
    });
    expect(
      parseBatteryDetails(
        [
          "  AC powered: false",
          "  USB powered: false",
          "  Wireless powered: false",
          "  Dock powered: false",
          "  status: 5",
          "  level: 100",
          "  scale: 100"
        ].join("\n")
      )
    ).toMatchObject({
      level_percent: 100,
      status: "full",
      plugged: "none"
    });
  });

  it("parses strict device battery output with extended telemetry", () => {
    expect(buildAdbDeviceBatteryArgs()).toEqual(["shell", "dumpsys", "battery"]);
    expect(
      parseDeviceBatteryOutput(
        [
          "Current Battery Service state:",
          "  AC powered: true",
          "  USB powered: false",
          "  Wireless powered: false",
          "  Dock powered: false",
          "  Charge counter: 4909000",
          "  status: 2",
          "  health: 2",
          "  present: true",
          "  level: 98",
          "  scale: 100",
          "  voltage: 4373",
          "  temperature: 313",
          "  technology: Li-poly"
        ].join("\n"),
        "",
        0
      )
    ).toEqual({
      ok: true,
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
      }
    });
  });

  it("keeps absent optional battery fields nullable while preserving no-battery state", () => {
    expect(
      parseDeviceBatteryOutput(
        [
          "Current Battery Service state:",
          "  AC powered: false",
          "  USB powered: false",
          "  Wireless powered: false",
          "  Dock powered: false",
          "  present: false"
        ].join("\n"),
        "",
        0
      )
    ).toEqual({
      ok: true,
      battery: {
        level_percent: null,
        scale: null,
        status: null,
        plugged: "none",
        temperature_celsius: null,
        health: null,
        present: false,
        voltage_mv: null,
        technology: null,
        charge_counter_uah: null
      }
    });
  });

  it("decodes battery status and health enums while preserving unknown codes as null", () => {
    const statusCases = [
      ["1", "unknown"],
      ["2", "charging"],
      ["3", "discharging"],
      ["4", "not_charging"],
      ["5", "full"],
      ["99", null]
    ] as const;
    for (const [code, status] of statusCases) {
      expect(parseDeviceBatteryOutput(`status: ${code}\npresent: true\n`, "", 0)).toMatchObject({
        ok: true,
        battery: { status }
      });
    }

    const healthCases = [
      ["1", "unknown"],
      ["2", "good"],
      ["3", "overheat"],
      ["4", "dead"],
      ["5", "over_voltage"],
      ["6", "unspecified_failure"],
      ["7", "cold"],
      ["99", null]
    ] as const;
    for (const [code, health] of healthCases) {
      expect(parseDeviceBatteryOutput(`health: ${code}\npresent: true\n`, "", 0)).toMatchObject({
        ok: true,
        battery: { health }
      });
    }
  });

  it("fails strict battery parsing on command failure or malformed known fields", () => {
    expect(parseDeviceBatteryOutput("", "service unavailable", 0)).toEqual({
      ok: false,
      failure: "dumpsys battery wrote unexpected stderr"
    });
    expect(parseDeviceBatteryOutput("", "", 1)).toEqual({
      ok: false,
      failure: "dumpsys battery exited nonzero"
    });
    expect(parseDeviceBatteryOutput("not a battery dump\n", "", 0)).toEqual({
      ok: false,
      failure: "dumpsys battery did not return battery fields"
    });
    expect(parseDeviceBatteryOutput("level: nope\nscale: 100\n", "", 0)).toEqual({
      ok: false,
      failure: "dumpsys battery returned malformed level"
    });
    expect(parseDeviceBatteryOutput("level: 1\nscale: 0\n", "", 0)).toEqual({
      ok: false,
      failure: "dumpsys battery returned non-positive scale"
    });
    expect(parseDeviceBatteryOutput("present: maybe\n", "", 0)).toEqual({
      ok: false,
      failure: "dumpsys battery returned malformed present"
    });
  });

  it("parses device time source outputs conservatively", () => {
    expect(buildAdbDeviceTimeSourceArgs("date")).toEqual(["shell", "date", "+%s%z"]);
    expect(buildAdbDeviceTimeSourceArgs("autoTime")).toEqual(["shell", "settings", "get", "global", "auto_time"]);
    expect(buildAdbDeviceTimeSourceArgs("autoTimeZone")).toEqual([
      "shell",
      "settings",
      "get",
      "global",
      "auto_time_zone"
    ]);
    expect(buildAdbDeviceTimeSourceArgs("settingsTimeZone")).toEqual([
      "shell",
      "settings",
      "get",
      "global",
      "time_zone"
    ]);
    expect(buildAdbDeviceTimeSourceArgs("persistSysTimeZone")).toEqual(["shell", "getprop", "persist.sys.timezone"]);
    expect(parseDeviceTimeDateOutput("1782800012+0800\n", "", 0, "date_unix_epoch_offset")).toEqual({
      ok: true,
      time: {
        unix_epoch_seconds: 1_782_800_012,
        timezone_offset: "+08:00",
        timezone_offset_minutes: 480
      }
    });
    expect(parseDeviceTimeDateOutput("1782800012-0330\n", "", 0, "date_unix_epoch_offset")).toMatchObject({
      ok: true,
      time: { timezone_offset: "-03:30", timezone_offset_minutes: -210 }
    });
    expect(parseDeviceTimeDateOutput("1782800012 +0800\n", "", 0, "date_unix_epoch_offset")).toMatchObject({
      ok: true,
      time: { timezone_offset: "+08:00", timezone_offset_minutes: 480 }
    });
    expect(parseDeviceTimeBooleanOutput("1\n", "", 0, "settings_global_auto_time")).toEqual({ ok: true, value: true });
    expect(parseDeviceTimeBooleanOutput("0\n", "", 0, "settings_global_auto_time")).toEqual({ ok: true, value: false });
    expect(parseDeviceTimeBooleanOutput("null\n", "", 0, "settings_global_auto_time")).toEqual({
      ok: true,
      value: null
    });
    expect(parseDeviceTimeZoneOutput("Asia/Shanghai\n", "", 0, "getprop_persist_sys_timezone")).toEqual({
      ok: true,
      value: "Asia/Shanghai"
    });
    expect(parseDeviceTimeZoneOutput("null\n", "", 0, "settings_global_time_zone")).toEqual({ ok: true, value: null });
  });

  it("fails malformed device time source outputs", () => {
    expect(parseDeviceTimeDateOutput("", "", 0, "date_unix_epoch_offset")).toEqual({
      ok: false,
      failure: "date_unix_epoch_offset returned empty output"
    });
    expect(parseDeviceTimeDateOutput("1782800012+2460\n", "", 0, "date_unix_epoch_offset")).toEqual({
      ok: false,
      failure: "date_unix_epoch_offset returned epoch/offset values outside supported range"
    });
    expect(parseDeviceTimeDateOutput("not-a-date\n", "", 0, "date_unix_epoch_offset")).toEqual({
      ok: false,
      failure: "date_unix_epoch_offset returned malformed epoch/offset output"
    });
    expect(parseDeviceTimeBooleanOutput("yes\n", "", 0, "settings_global_auto_time")).toEqual({
      ok: false,
      failure: "settings_global_auto_time returned malformed boolean setting"
    });
    expect(parseDeviceTimeZoneOutput("Asia Shanghai\n", "", 0, "getprop_persist_sys_timezone")).toEqual({
      ok: false,
      failure: "getprop_persist_sys_timezone returned malformed timezone id"
    });
    expect(parseDeviceTimeZoneOutput("Asia/Shanghai\nOther/Zone\n", "", 0, "getprop_persist_sys_timezone")).toEqual({
      ok: false,
      failure: "getprop_persist_sys_timezone returned multiple non-empty lines"
    });
    expect(parseDeviceTimeZoneOutput("Asia/Shanghai\n", "warning\n", 0, "getprop_persist_sys_timezone")).toEqual({
      ok: false,
      failure: "getprop_persist_sys_timezone wrote unexpected stderr"
    });
    expect(parseDeviceTimeZoneOutput("", "", 1, "getprop_persist_sys_timezone")).toEqual({
      ok: false,
      failure: "getprop_persist_sys_timezone exited nonzero"
    });
  });

  it("parses device readiness from dumpsys power and window output", () => {
    expect(
      parseDeviceReadyState(
        "emulator-5554",
        "Power Manager State:\n  mWakefulness=Awake\n  mInteractive=true\nDisplay Power: state=ON\n",
        "WINDOW MANAGER POLICY STATE\n  mDreamingLockscreen=false\n  mKeyguardSecure=false\n"
      )
    ).toEqual({
      device_serial: "emulator-5554",
      awake: true,
      interactive: true,
      wakefulness: "Awake",
      display_power_state: "ON",
      keyguard_showing: false,
      keyguard_secure: false
    });
    expect(
      parseDeviceReadyState(
        "emulator-5554",
        "Power Manager State:\n  mWakefulness=Asleep\n  mInteractive=false\nDisplay Power: state=OFF\n",
        "WINDOW MANAGER POLICY STATE\n  mDreamingLockscreen=true\n  mKeyguardSecure=true\n"
      )
    ).toMatchObject({
      awake: false,
      interactive: false,
      display_power_state: "OFF",
      keyguard_showing: true,
      keyguard_secure: true
    });
    expect(
      parseDeviceReadyState(
        "emulator-5554",
        "Power Manager State:\n  mWakefulness=Awake\n  mInteractive=true\nDisplay Power: state=ON\n",
        "WINDOW MANAGER POLICY STATE\n  mDreamingLockscreen=true\n  isKeyguardShowing=false\n  mKeyguardSecure=false\n"
      )
    ).toMatchObject({
      awake: true,
      interactive: true,
      keyguard_showing: false,
      keyguard_secure: false
    });
    expect(
      parseDeviceReadyState(
        "emulator-5554",
        "Power Manager State:\n  mWakefulness=Dozing\n  mInteractive=false\nDisplay Power: state=DOZE\n",
        "WINDOW MANAGER POLICY STATE\n"
      )
    ).toMatchObject({
      awake: false,
      interactive: false,
      wakefulness: "Dozing",
      display_power_state: "DOZE",
      keyguard_showing: null,
      keyguard_secure: null
    });
  });

  it("parses settings booleans from nullable global settings", () => {
    expect(parseSettingsBoolean("1\n", "", "wifi_on")).toEqual({ value: true });
    expect(parseSettingsBoolean("0\n", "", "wifi_on")).toEqual({ value: false });
    expect(parseSettingsBoolean("null\n", "", "mobile_data")).toEqual({ value: null });
    expect(parseSettingsBoolean("\n", "", "mobile_data")).toEqual({ value: null });
    expect(parseSettingsBoolean("enabled\n", "", "wifi_on")).toEqual({
      failure: "settings global wifi_on returned unexpected boolean value"
    });
    expect(parseSettingsBoolean("1\n", "warning\n", "wifi_on")).toEqual({
      failure: "settings global wifi_on wrote unexpected stderr"
    });
  });

  it("parses active default network connectivity state without returning identifiers", () => {
    expect(
      parseConnectivityActiveNetwork(
        [
          "NetworkFactories for:",
          "Active default network: 101",
          "NetworkAgentInfo{network{101} handle{123456} ni{WIFI CONNECTED} nc{[ Transports: WIFI Capabilities: NOT_METERED&INTERNET&NOT_RESTRICTED&TRUSTED&NOT_VPN&VALIDATED ]}",
          "NetworkAgentInfo{network{102} handle{654321} ni{MOBILE CONNECTED} nc{[ Transports: CELLULAR Capabilities: IMS&NOT_RESTRICTED&TRUSTED ]}"
        ].join("\n"),
        ""
      )
    ).toEqual({
      value: {
        network_id: 101,
        transports: ["wifi"],
        primary_transport: "wifi",
        internet_capable: true,
        validated: true,
        online: true
      }
    });
    expect(
      parseConnectivityActiveNetwork(
        [
          "Active default network: 42",
          "NetworkAgentInfo{network{42} handle{1} ni{MOBILE CONNECTED} nc{[ Transports: CELLULAR Capabilities: INTERNET&TRUSTED&NOT_VPN ]}"
        ].join("\n"),
        ""
      )
    ).toEqual({
      value: {
        network_id: 42,
        transports: ["cellular"],
        primary_transport: "cellular",
        internet_capable: true,
        validated: false,
        online: false
      }
    });
    expect(parseConnectivityActiveNetwork("Active default network: none\n", "")).toEqual({
      value: {
        network_id: null,
        transports: [],
        primary_transport: null,
        internet_capable: false,
        validated: false,
        online: false
      }
    });
    expect(parseConnectivityActiveNetwork("", "")).toEqual({
      failure: "dumpsys connectivity did not expose exactly one active default network line"
    });
    expect(parseConnectivityActiveNetwork("Active default network: abc\n", "")).toEqual({
      failure: "dumpsys connectivity returned an unexpected active default network value"
    });
    expect(parseConnectivityActiveNetwork("Active default network: 101\n", "")).toEqual({
      failure: "dumpsys connectivity did not include details for the active default network"
    });
    expect(parseConnectivityActiveNetwork("Active default network: 101\n", "warning\n")).toEqual({
      failure: "dumpsys connectivity wrote unexpected stderr"
    });
  });

  it("parses input method service and secure IME settings", () => {
    expect(
      parseDumpsysInputMethodState(
        [
          "Input Method Manager Service state:",
          "  mCurMethodId=com.example.ime/.ImeService",
          "  mCurId=com.example.ime/.ImeService mHaveConnection=true mBoundToMethod=true",
          "  mRequestedShowExplicitly=false mShowForced=false",
          "  mInputShown=false",
          "  mInFullscreenMode=false",
          "  mSystemReady=true mInteractive=true"
        ].join("\n"),
        ""
      )
    ).toEqual({
      value: {
        keyboard: { shown: false, show_requested: false, fullscreen_mode: false },
        service: { system_ready: true, interactive: true },
        currentId: "com.example.ime/.ImeService"
      }
    });
    expect(
      parseDumpsysInputMethodState(
        [
          "Input Method Manager Service state:",
          "  mSystemReady=true",
          "  mInteractive=true",
          "  UserId=0",
          "    mBindingController:",
          "      mSelectedMethodId=com.example.ime/.ImeService",
          "      mCurId=com.example.ime/.ImeService",
          "    mVisibilityStateComputer:",
          "      mInputShown=true",
          "    mInFullscreenMode=false"
        ].join("\n"),
        ""
      )
    ).toMatchObject({
      value: {
        keyboard: { shown: true, fullscreen_mode: false },
        service: { system_ready: true, interactive: true },
        currentId: "com.example.ime/.ImeService"
      }
    });
    expect(parseDumpsysInputMethodState("", "")).toEqual({
      failure: "dumpsys input_method did not expose parseable IME state"
    });
    expect(parseDumpsysInputMethodState("mCurId=not-an-ime\n", "")).toEqual({
      failure: "dumpsys input_method returned an invalid current input method id"
    });
    expect(parseDumpsysInputMethodState("mInputShown=false\n", "warning\n")).toEqual({
      failure: "dumpsys input_method wrote unexpected stderr"
    });

    expect(parseInputMethodSetting("com.example.ime/.ImeService\n", "", "default_input_method")).toEqual({
      value: "com.example.ime/.ImeService"
    });
    expect(parseInputMethodSetting("null\n", "", "default_input_method")).toEqual({ value: null });
    expect(parseInputMethodSetting("bad\n", "", "default_input_method")).toEqual({
      failure: "settings secure default_input_method returned an invalid input method id"
    });
    expect(parseInputMethodSetting(`${"com.example".repeat(30)}/.ImeService\n`, "", "default_input_method")).toEqual({
      failure: "settings secure default_input_method returned an invalid input method id"
    });
    expect(parseEnabledInputMethodSetting("com.example.ime/.ImeService:com.android.adbkeyboard/.AdbIME;subtype\n", "")).toEqual({
      value: ["com.example.ime/.ImeService", "com.android.adbkeyboard/.AdbIME"]
    });
    expect(parseEnabledInputMethodSetting("null\n", "")).toEqual({ value: [] });
    expect(parseEnabledInputMethodSetting("bad\n", "")).toEqual({
      failure: "settings secure enabled_input_methods returned an invalid input method id"
    });
  });

  it("parses display brightness settings and display service fields", () => {
    expect(parseBrightnessIntSetting("128\n", "", "screen_brightness")).toEqual({ value: 128 });
    expect(parseBrightnessIntSetting("null\n", "", "screen_brightness")).toEqual({ value: null });
    expect(parseBrightnessIntSetting("300\n", "", "screen_brightness")).toEqual({
      failure: "settings system screen_brightness returned an out-of-range brightness value"
    });
    expect(parseBrightnessIntSetting("abc\n", "", "screen_brightness")).toEqual({
      failure: "settings system screen_brightness returned an invalid integer"
    });
    expect(parseBrightnessModeSetting("0\n", "")).toEqual({ value: { raw: 0, value: "manual" } });
    expect(parseBrightnessModeSetting("1\n", "")).toEqual({ value: { raw: 1, value: "automatic" } });
    expect(parseBrightnessModeSetting("7\n", "")).toEqual({ value: { raw: 7, value: "unknown" } });
    expect(parseBrightnessModeSetting("null\n", "")).toEqual({ value: { raw: null, value: "unknown" } });
    expect(parseBrightnessFloatSetting("0.25\n", "", "screen_brightness_float", 0, 1)).toEqual({ value: 0.25 });
    expect(parseBrightnessFloatSetting("null\n", "", "screen_brightness_float", 0, 1)).toEqual({ value: null });
    expect(parseBrightnessFloatSetting("1.5\n", "", "screen_brightness_float", 0, 1)).toEqual({
      failure: "settings system screen_brightness_float returned an out-of-range value"
    });
    expect(parseBrightnessFloatSetting("-0.5\n", "", "screen_auto_brightness_adj", -1, 1)).toEqual({ value: -0.5 });
    expect(parseDeviceAnimationScaleSetting("1.0\n", "", "window_animation_scale")).toEqual({
      ok: true,
      scale: { raw: "1.0", value: 1 }
    });
    expect(parseDeviceAnimationScaleSetting("0\n", "", "transition_animation_scale")).toEqual({
      ok: true,
      scale: { raw: "0", value: 0 }
    });
    expect(parseDeviceAnimationScaleSetting("null\n", "", "animator_duration_scale")).toEqual({
      ok: true,
      scale: { raw: null, value: null }
    });
    expect(parseDeviceAnimationScaleSetting("\n", "", "window_animation_scale")).toEqual({
      ok: false,
      failure: "settings global window_animation_scale returned empty output"
    });
    expect(parseDeviceAnimationScaleSetting("-1\n", "", "window_animation_scale")).toEqual({
      ok: false,
      failure: "settings global window_animation_scale returned an invalid animation scale"
    });
    expect(parseDeviceAnimationScaleSetting("1.0\n", "warning\n", "window_animation_scale")).toEqual({
      ok: false,
      failure: "settings global window_animation_scale wrote unexpected stderr"
    });
    expect(parseAccessibilityBooleanSetting("0\n", "", "accessibility_enabled")).toEqual({
      ok: true,
      setting: { raw: "0", value: false }
    });
    expect(parseAccessibilityBooleanSetting("1\r\n", "", "touch_exploration_enabled")).toEqual({
      ok: true,
      setting: { raw: "1", value: true }
    });
    expect(parseAccessibilityBooleanSetting("null\n", "", "accessibility_enabled")).toEqual({
      ok: true,
      setting: { raw: null, value: null }
    });
    expect(parseAccessibilityBooleanSetting("\n", "", "accessibility_enabled")).toEqual({
      ok: false,
      failure: "settings secure accessibility_enabled returned empty output"
    });
    expect(parseAccessibilityBooleanSetting("2\n", "", "accessibility_enabled")).toEqual({
      ok: false,
      failure: "settings secure accessibility_enabled returned an unexpected boolean value"
    });
    expect(parseAccessibilityBooleanSetting("0\n", "warning\n", "accessibility_enabled")).toEqual({
      ok: false,
      failure: "settings secure accessibility_enabled wrote unexpected stderr"
    });
    expect(parseEnabledAccessibilityServicesSetting("\n", "")).toEqual({
      ok: true,
      setting: { raw: "", services: [], count: 0 }
    });
    expect(parseEnabledAccessibilityServicesSetting("null\n", "")).toEqual({
      ok: true,
      setting: { raw: null, services: [], count: 0 }
    });
    expect(
      parseEnabledAccessibilityServicesSetting(
        "com.example/.ReaderService:com.android.talkback/com.android.talkback.TalkBackService\n",
        ""
      )
    ).toEqual({
      ok: true,
      setting: {
        raw: "com.example/.ReaderService:com.android.talkback/com.android.talkback.TalkBackService",
        services: ["com.example/.ReaderService", "com.android.talkback/com.android.talkback.TalkBackService"],
        count: 2
      }
    });
    expect(parseEnabledAccessibilityServicesSetting("bad\n", "")).toEqual({
      ok: false,
      failure: "settings secure enabled_accessibility_services returned an invalid component name"
    });
    expect(parseEnabledAccessibilityServicesSetting(`${"x".repeat(4097)}\n`, "")).toEqual({
      ok: false,
      failure: "settings secure enabled_accessibility_services returned too much data"
    });
    expect(
      parseEnabledAccessibilityServicesSetting(
        Array.from({ length: 129 }, (_value, index) => `com.example/.Service${index}`).join(":"),
        ""
      )
    ).toEqual({
      ok: false,
      failure: "settings secure enabled_accessibility_services returned too many services"
    });
    expect(parseEnabledAccessibilityServicesSetting("com.example/.Svc\n", "warning\n")).toEqual({
      ok: false,
      failure: "settings secure enabled_accessibility_services wrote unexpected stderr"
    });
    expect(parseDumpsysDisplayBrightness("Display Brightness=0.5\nDisplay SdrBrightness=0.4\nmCachedBrightnessInfo.brightness=0.6\nmCachedBrightnessInfo.adjustedBrightness=0.3\nmCachedBrightnessInfo.brightnessMin=0.0\nmCachedBrightnessInfo.brightnessMax=1.0\n", "")).toEqual({
      value: {
        brightness: 0.5,
        sdr_brightness: 0.4,
        cached_brightness: 0.6,
        cached_adjusted_brightness: 0.3,
        min: 0,
        max: 1
      }
    });
    expect(parseDumpsysDisplayBrightness("Display Brightness=NaN\n", "")).toEqual({
      failure: "dumpsys display did not expose parseable brightness fields"
    });
    expect(parseDumpsysDisplayBrightness("Display Brightness=0.5\n", "warning\n")).toEqual({
      failure: "dumpsys display wrote unexpected stderr"
    });
  });

  it("parses window metadata", () => {
    expect(parseWindowSize("Physical size: 1080x2400\n")).toEqual([1080, 2400]);
    expect(parseRotationDegrees("DisplayRotation\n  mCurrentRotation=ROTATION_90\n")).toBe(90);
    expect(parseRotationDegrees("DisplayFrames w=720 h=1600 r=3\n")).toBe(270);
    expect(parseRotationDegrees("mDisplayContent=Display{#0 state=ON size=1220x2712 ROTATION_180}\n")).toBe(180);
    expect(parseRotationDegrees("DisplayRotation\n  mRotation=0 mDeferredRotationPauseCount=0\n")).toBe(0);
    expect(parseRotationDegrees("DisplayRotation\n  mCurrentRotation=ROTATION_UNKNOWN\n")).toBeNull();
    expect(parseAutoRotate("1\n")).toBe(true);
    expect(parseAutoRotate("0\n")).toBe(false);
    expect(parseAutoRotate("null\n")).toBeNull();
    expect(parseUserRotationPolicy("free\n")).toEqual({ mode: "free", rotationDegrees: null });
    expect(parseUserRotationPolicy("lock 0\n")).toEqual({ mode: "lock", rotationDegrees: 0 });
    expect(parseUserRotationPolicy("lock 3\n")).toEqual({ mode: "lock", rotationDegrees: 270 });
    expect(parseUserRotationPolicy("Window manager (window) commands:\n")).toBeNull();
    expect(parseUserRotationPolicy("lock 4\n")).toBeNull();
    expect(parseStatusBarIconsOutput("wifi\r\nbattery\nclock\n", "")).toEqual({
      icons: ["wifi", "battery", "clock"],
      invalidLines: []
    });
    expect(parseStatusBarIconsOutput("wifi\nwifi\nbattery\n\n", "")).toEqual({
      icons: ["wifi", "wifi", "battery"],
      invalidLines: []
    });
    expect(parseStatusBarIconsOutput("", "")).toEqual({ icons: [], invalidLines: [] });
    expect(parseStatusBarIconsOutput("  Usage: adb shell cmd statusbar <command>\n", "")).toMatchObject({
      failure: "Usage: adb shell cmd statusbar <command>",
      invalidLines: ["Usage: adb shell cmd statusbar <command>"]
    });
    expect(parseStatusBarIconsOutput("Error\n", "")).toMatchObject({
      failure: "Error",
      invalidLines: ["Error"]
    });
    expect(parseStatusBarIconsOutput("helpful_slot\n", "")).toEqual({
      icons: ["helpful_slot"],
      invalidLines: []
    });
    expect(parseStatusBarIconsOutput(`${"x".repeat(129)}\n`, "")).toMatchObject({
      failure: "cmd statusbar get-status-icons returned malformed icon slot lines",
      invalidLines: ["x".repeat(129)]
    });
    expect(parseStatusBarIconsOutput("slot -> StatusBarIcon(icon=wifi)\n", "")).toMatchObject({
      failure: "cmd statusbar get-status-icons returned malformed icon slot lines",
      invalidLines: ["slot -> StatusBarIcon(icon=wifi)"]
    });
    expect(parseStatusBarIconsOutput("wifi\n", "warning\n")).toMatchObject({
      icons: [],
      failure: "warning"
    });
    const musicOutput = [
      "[V] will control stream=3 (STREAM_MUSIC)",
      "[V] will get volume",
      "[V] Connecting to AudioService",
      "[V] volume is 0 in range [0..15]",
      ""
    ].join("\n");
    expect(parseMediaSessionVolumeGetOutput(musicOutput, "", MUSIC_STREAM)).toEqual({
      volume: { index: 0, min: 0, max: 15 }
    });
    expect(
      parseMediaSessionVolumeGetOutput(
        [
          "[V] will control stream=4 (STREAM_ALARM)",
          "[V] will get volume",
          "[V] volume is 12 in range [1..15]",
          ""
        ].join("\r\n"),
        "",
        ALARM_STREAM
      )
    ).toEqual({ volume: { index: 12, min: 1, max: 15 } });
    expect(
      parseMediaSessionVolumeGetOutput(
        ["[V] will control stream=3 (STREAM_MUSIC)", "[V] volume is 7 in range [7..7]"].join("\n"),
        "",
        MUSIC_STREAM
      )
    ).toEqual({ volume: { index: 7, min: 7, max: 7 } });
    expect(
      parseMediaSessionVolumeGetOutput(
        ["[V] will control stream=3 (STREAM_MUSIC)", "[V] volume is 15 in range [0..15]"].join("\n"),
        "",
        MUSIC_STREAM
      )
    ).toEqual({ volume: { index: 15, min: 0, max: 15 } });
    for (const output of [
      "[V] volume is 0 in range [0..15]\n",
      `${musicOutput}[V] volume is 1 in range [0..15]\n`,
      "[V] will control stream=3 (STREAM_MUSIC)\n",
      "[V] will control stream=3 (STREAM_MUSIC)\n[V] volume is 16 in range [0..15]\n",
      "[V] will control stream=3 (STREAM_MUSIC)\n[V] volume is 4 in range [7..3]\n",
      "[V] will control stream=2 (STREAM_RING)\n[V] volume is 0 in range [0..15]\n",
      "[V] will control stream=3 (STREAM_MUSIC)\n[V] volume is 0 in range [0..15]\n[V] unexpected diagnostic\n",
      "[V] will control stream=3 (STREAM_MUSIC)\n[V] volume is 0 in range [0..15]\nextra\n"
    ]) {
      expect(parseMediaSessionVolumeGetOutput(output, "", MUSIC_STREAM)).toMatchObject({ failure: expect.any(String) });
    }
    expect(
      parseMediaSessionVolumeGetOutput("usage: media_session [subcommand]\njava.lang.IllegalArgumentException\n", "", MUSIC_STREAM)
    ).toMatchObject({
      failure: "usage: media_session [subcommand]"
    });
    expect(parseMediaSessionVolumeGetOutput("No shell command implementation.\n", "", MUSIC_STREAM)).toMatchObject({
      failure: "No shell command implementation."
    });
    expect(parseMediaSessionVolumeGetOutput(musicOutput, "warning\n", MUSIC_STREAM)).toMatchObject({
      failure: "warning"
    });
    const ringerDump = [
      "Audio Service State:",
      "Ringer mode: ",
      "- mode (internal) = SILENT",
      "- mode (external) = SILENT",
      "- zen mode:ZEN_MODE_OFF",
      "- ringer mode affected streams = 0x126 (STREAM_SYSTEM,STREAM_RING,STREAM_NOTIFICATION,STREAM_DTMF)",
      "- ringer mode muted streams = 0x126 (STREAM_SYSTEM,STREAM_RING,STREAM_NOTIFICATION,STREAM_DTMF)",
      "- delegate = ZenModeHelper",
      "Audio mode:",
      "- Requested mode = MODE_NORMAL",
      ""
    ].join("\n");
    expect(parseDumpsysAudioRingerState(ringerDump, "")).toEqual({
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
      }
    });
    expect(
      parseDumpsysAudioRingerState(
        [
          "Ringer mode:",
          "- mode (internal) = NORMAL",
          "- mode (external) = VIBRATE",
          "- zen mode:ZEN_MODE_IMPORTANT_INTERRUPTIONS",
          "- ringer mode affected streams = 0x0",
          "- ringer mode muted streams = 0x0",
          "Audio mode:"
        ].join("\n"),
        ""
      )
    ).toMatchObject({
      ringer: {
        internal: { mode: "normal", raw: "NORMAL" },
        external: { mode: "vibrate", raw: "VIBRATE" }
      },
      zen: {
        mode: "important_interruptions",
        raw: "ZEN_MODE_IMPORTANT_INTERRUPTIONS",
        source: "dumpsys_audio_ringer_section"
      },
      affectedStreams: { mask_hex: "0x0", streams: [], residual_tokens: [] },
      mutedStreams: { mask_hex: "0x0", streams: [], residual_tokens: [] }
    });
    expect(
      parseDumpsysAudioRingerState(
        [
          "Ringer mode:",
          "- mode (internal) = OEM_CUSTOM",
          "- mode (external) = NORMAL",
          "- zen mode:ZEN_MODE_ALARMS",
          "- ringer mode affected streams = 0x2 (STREAM_RING)",
          "- ringer mode muted streams = 0x2 (STREAM_RING)",
          "Audio mode:"
        ].join("\n"),
        ""
      )
    ).toMatchObject({
      ringer: { internal: { mode: "unknown", raw: "OEM_CUSTOM" } },
      zen: { mode: "alarms", raw: "ZEN_MODE_ALARMS", source: "dumpsys_audio_ringer_section" }
    });
    expect(
      parseDumpsysAudioRingerState(
        [
          "Ringer mode:",
          "- mode (internal) = NORMAL",
          "- mode (external) = NORMAL",
          "- zen mode:ZEN_MODE_NO_INTERRUPTIONS",
          "- ringer mode affected streams = 0x2 (STREAM_RING)",
          "- ringer mode muted streams = 0x2 (STREAM_RING)",
          "Audio mode:"
        ].join("\n"),
        ""
      )
    ).toMatchObject({
      zen: { mode: "no_interruptions", raw: "ZEN_MODE_NO_INTERRUPTIONS", source: "dumpsys_audio_ringer_section" }
    });
    expect(parseDumpsysAudioRingerState(ringerDump.replace("- zen mode:ZEN_MODE_OFF\n", ""), "")).toMatchObject({
      zen: { mode: "unknown", raw: null, source: "not_reported" }
    });
    expect(
      parseDumpsysAudioRingerState(
        ringerDump.replace(
          "0x126 (STREAM_SYSTEM,STREAM_RING,STREAM_NOTIFICATION,STREAM_DTMF)",
          "0x1126 (STREAM_SYSTEM,STREAM_RING,STREAM_NOTIFICATION,STREAM_DTMF,4096)"
        ),
        ""
      )
    ).toMatchObject({
      affectedStreams: {
        mask_hex: "0x1126",
        streams: ["STREAM_SYSTEM", "STREAM_RING", "STREAM_NOTIFICATION", "STREAM_DTMF"],
        residual_tokens: ["4096"]
      }
    });
    for (const output of [
      "",
      "Ringer mode:\nAudio mode:\n",
      `${ringerDump}\nRinger mode:\n`,
      ringerDump.replace("- mode (internal) = SILENT\n", ""),
      ringerDump.replace("- zen mode:ZEN_MODE_OFF\n", "- zen mode:ZEN_MODE_OFF\n- zen mode:ZEN_MODE_ALARMS\n"),
      ringerDump.replace("(STREAM_SYSTEM,STREAM_RING,STREAM_NOTIFICATION,STREAM_DTMF)", "(bad)"),
      ringerDump.replace("(STREAM_SYSTEM,STREAM_RING,STREAM_NOTIFICATION,STREAM_DTMF)", "(STREAM_RING,123456789012345678901234567890123)"),
      ringerDump.replace("0x126 (STREAM_SYSTEM,STREAM_RING,STREAM_NOTIFICATION,STREAM_DTMF)", "0x126")
    ]) {
      expect(parseDumpsysAudioRingerState(output, "")).toMatchObject({ failure: expect.any(String) });
    }
    expect(parseDumpsysAudioRingerState(ringerDump, "warning\n")).toMatchObject({ failure: "warning" });
    expect(parseOrientation("DisplayRotation\n  mCurrentRotation=ROTATION_90\n")).toBe("landscape");
    expect(parseOrientation("DisplayRotation\n  mCurrentRotation=ROTATION_180\n")).toBe("portrait");
    expect(orientationFromRotationDegrees(0, [2560, 1600])).toBe("landscape");
    expect(orientationFromRotationDegrees(90, [2560, 1600])).toBe("portrait");
    expect(orientationFromRotationDegrees(0, [1080, 2400])).toBe("portrait");
    expect(orientationFromRotationDegrees(90, [1080, 2400])).toBe("landscape");
    expect(orientationFromRotationDegrees(null, [2560, 1600])).toBe("landscape");
    expect(parseFocus("mCurrentFocus=Window{abc u0 com.example/.MainActivity}\n")).toEqual({
      packageName: "com.example",
      activity: "com.example.MainActivity"
    });
  });

  it("skips non-app focus lines when parsing foreground app", () => {
    expect(
      parseFocus(
        [
          "mCurrentFocus=Window{abc u0 NavigationBar0}",
          "mFocusedApp=ActivityRecord{def u0 com.example/.MainActivity t12}"
        ].join("\n")
      )
    ).toEqual({
      packageName: "com.example",
      activity: "com.example.MainActivity"
    });
  });

  it("parses am start output without treating benign warnings as errors", () => {
    expect(
      parseAmStartOutput("Status: ok\nActivity: com.example/.MainActivity\nWarning: Activity not started, its current task has been brought to the front\n")
    ).toEqual({
      status: "ok",
      activity: "com.example/.MainActivity",
      error: undefined
    });
    expect(parseAmStartOutput("Error: Activity class {com.example/com.example.Nope} does not exist.\n")).toEqual({
      status: undefined,
      activity: undefined,
      error: "Activity class {com.example/com.example.Nope} does not exist."
    });
    expect(parseAmStartOutput("java.lang.SecurityException: Permission Denial: starting Intent\n")).toEqual({
      status: undefined,
      activity: undefined,
      error: "java.lang.SecurityException: Permission Denial: starting Intent"
    });
  });

  it("parses monkey launch failure output", () => {
    expect(parseMonkeyLaunchOutput("** No activities found to run, monkey aborted.\n")).toEqual({
      failed: true,
      reason: "no launcher activity found for package"
    });
    expect(parseMonkeyLaunchOutput("** Error: SecurityException while injecting event.\n")).toEqual({
      failed: true,
      reason: "permission denied starting launcher activity"
    });
    expect(parseMonkeyLaunchOutput("Events injected: 1\n")).toEqual({ failed: false });
  });

  it("parses am force-stop failure output", () => {
    expect(parseAmForceStopOutput("")).toEqual({ failed: false });
    expect(parseAmForceStopOutput("Error: Unknown option: --bad\n")).toEqual({
      failed: true,
      reason: "Error: Unknown option: --bad"
    });
    expect(parseAmForceStopOutput("java.lang.SecurityException: Permission Denial\n")).toEqual({
      failed: true,
      reason: "java.lang.SecurityException: Permission Denial"
    });
  });

  it("quotes and redacts URL strings for device shell commands", () => {
    const url = "https://example.com/path?a=1&b=2#frag'";
    expect(quoteForDeviceShell(url)).toBe("'https://example.com/path?a=1&b=2#frag'\\'''");
    expect(redactUrlFromText(`Starting ${quoteForDeviceShell(url)} and ${url}`, url)).toBe(
      "Starting <redacted-url> and <redacted-url>"
    );
  });
});
