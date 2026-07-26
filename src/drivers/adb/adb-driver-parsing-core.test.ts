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

describe("adb driver parsing core/app basics", () => {
  it("parses device table", () => {
    expect(parseAdbDevices("List of devices attached\nemulator-5554\tdevice\nabc\toffline\n")).toEqual([
      { serial: "emulator-5554", state: "device" },
      { serial: "abc", state: "offline" }
    ]);
  });

  it("parses long device table details while skipping adb daemon banners", () => {
    expect(
      parseAdbDevicesLong(
        [
          "* daemon not running; starting now at tcp:5037 *",
          "* daemon started successfully *",
          "List of devices attached",
          "emulator-5554\tdevice product:sdk_gphone64_arm64 model:sdk_gphone64_arm64 device:emu64 transport_id:1",
          "192.168.1.5:5555\tdevice product:pixel model:Pixel_8 device:shiba usb:1-1.4 transport_id:3",
          ""
        ].join("\r\n")
      )
    ).toEqual([
      {
        serial: "emulator-5554",
        state: "device",
        details: {
          product: "sdk_gphone64_arm64",
          model: "sdk_gphone64_arm64",
          device: "emu64",
          transport_id: "1"
        }
      },
      {
        serial: "192.168.1.5:5555",
        state: "device",
        details: {
          product: "pixel",
          model: "Pixel_8",
          device: "shiba",
          usb: "1-1.4",
          transport_id: "3"
        }
      }
    ]);
  });

  it("keeps multi-word adb device states intact", () => {
    expect(
      parseAdbDevicesLong(
        [
          "List of devices attached",
          "usb-1\tno permissions (user in plugdev group); see [http://developer.android.com/tools/device.html]",
          "usb-2\tno permissions usb:1-1 transport_id:4",
          "usb-3\tno permissions see http://developer.android.com/tools/device.html"
        ].join("\n")
      )
    ).toEqual([
      {
        serial: "usb-1",
        state: "no permissions (user in plugdev group); see [http://developer.android.com/tools/device.html]",
        details: {}
      },
      {
        serial: "usb-2",
        state: "no permissions",
        details: { usb: "1-1", transport_id: "4" }
      },
      {
        serial: "usb-3",
        state: "no permissions see http://developer.android.com/tools/device.html",
        details: {}
      }
    ]);
  });

  it("parses package manager package output with CRLF, single-segment packages, and de-duplication", () => {
    expect(
      parsePmListPackagesOutput(
        [
          "package:android\r",
          "package:com.example.app\r",
          "warning: ignored\r",
          "package:com.example.app\r",
          "package:bad-name\r",
          "package:...\r",
          "",
          "error: not a package line"
        ].join("\n")
      )
    ).toEqual(["android", "com.example.app"]);
  });

  it("parses standard non-verbose pm list users output conservatively", () => {
    expect(
      parsePmListUsersOutput(
        [
          "Users:",
          "\tUserInfo{0:Owner:c13} running",
          "    UserInfo{10:Work:30}",
          "UserInfo{11:QA:Profile:10} running",
          ""
        ].join("\n"),
        ""
      )
    ).toEqual({
      users: [
        { id: 0, name: "Owner", flagsHex: "c13", running: true },
        { id: 10, name: "Work", flagsHex: "30", running: false },
        { id: 11, name: "QA:Profile", flagsHex: "10", running: true }
      ],
      failure: undefined,
      unexpectedLines: []
    });

    expect(parsePmListUsersOutput("Users:\nUserInfo{0:Owner:13} current\n", "")).toMatchObject({
      users: [],
      unexpectedLines: ["UserInfo{0:Owner:13} current"]
    });
    expect(parsePmListUsersOutput("UserInfo{0:Owner:13} running\n", "")).toMatchObject({
      users: [],
      unexpectedLines: ["missing Users: header", "UserInfo{0:Owner:13} running"]
    });
    expect(parsePmListUsersOutput("Users:\n", "cmd: unknown command: list users\n")).toMatchObject({
      failure: "cmd: unknown command: list users"
    });
    expect(
      parsePmListUsersOutput(
        "Users:\nUserInfo{0::13} running\nUserInfo{10:Work:30}\nUserInfo{10:Work duplicate:30}\n",
        "* daemon not running; starting now *\n* daemon started successfully *\n"
      )
    ).toMatchObject({
      users: [
        { id: 0, name: "", flagsHex: "13", running: true },
        { id: 10, name: "Work", flagsHex: "30", running: false }
      ],
      failure: undefined,
      unexpectedLines: ["UserInfo{10:Work duplicate:30}"]
    });
    expect(
      parsePmListUsersOutput(`Users:\nUserInfo{0:${"A".repeat(257)}:13} running\n`, "")
    ).toMatchObject({
      users: [],
      unexpectedLines: [`UserInfo{0:${"A".repeat(257)}:13} running`]
    });
  });

  it("parses Activity Manager current user output conservatively", () => {
    expect(parseCurrentUserOutput("0\n", "")).toEqual({ userId: 0, unexpectedLines: [] });
    expect(parseCurrentUserOutput("10\r\n", "")).toEqual({ userId: 10, unexpectedLines: [] });
    expect(parseCurrentUserOutput(" 2147483647 \n", "")).toEqual({ userId: 2_147_483_647, unexpectedLines: [] });
    expect(parseCurrentUserOutput("", "")).toMatchObject({
      failure: "cmd activity get-current-user returned empty output",
      unexpectedLines: []
    });
    expect(parseCurrentUserOutput("Current user: 0\n", "")).toMatchObject({
      failure: "Current user: 0",
      unexpectedLines: ["Current user: 0"]
    });
    expect(parseCurrentUserOutput("0\nwarning\n", "")).toMatchObject({
      failure: "cmd activity get-current-user returned multiple output lines",
      unexpectedLines: ["0", "warning"]
    });
    expect(parseCurrentUserOutput("0\n", "warning\n")).toMatchObject({
      failure: "warning",
      unexpectedLines: ["warning"]
    });
    expect(parseCurrentUserOutput("2147483648\n", "")).toMatchObject({
      failure: "2147483648",
      unexpectedLines: ["2147483648"]
    });
  });

  it("parses pm clear success only from exact Success stdout", () => {
    expect(parsePmClearOutput("Success\n", "")).toEqual({ succeeded: true });
    expect(parsePmClearOutput("Failed\n", "")).toEqual({ succeeded: false, reason: "Failed" });
    expect(parsePmClearOutput("", "Failed\n")).toEqual({ succeeded: false, reason: "Failed" });
    expect(parsePmClearOutput("", "")).toEqual({
      succeeded: false,
      reason: "pm clear did not return Success"
    });
    expect(parsePmClearOutput("Success\nWarning\n", "")).toEqual({
      succeeded: false,
      reason: "Success"
    });
  });

  it("parses pm path package lines and malformed output conservatively", () => {
    expect(parsePmPathOutput("package:/data/app/base.apk\npackage:/data/app/split.apk\n", "")).toEqual({
      paths: ["/data/app/base.apk", "/data/app/split.apk"],
      failure: undefined,
      unexpectedLines: []
    });
    expect(parsePmPathOutput("", "")).toEqual({
      paths: [],
      failure: undefined,
      unexpectedLines: []
    });
    expect(parsePmPathOutput("", "Error: Unknown package: com.example.missing\n")).toEqual({
      paths: [],
      failure: "Error: Unknown package: com.example.missing",
      unexpectedLines: []
    });
    expect(parsePmPathOutput("package:\nWarning: odd output\n", "")).toEqual({
      paths: [],
      failure: undefined,
      unexpectedLines: ["package:", "Warning: odd output"]
    });
  });

  it("parses adb install success and failure lines conservatively", () => {
    expect(parseAdbInstallOutput("Success\n", "")).toEqual({ succeeded: true });
    expect(parseAdbInstallOutput("Performing Streamed Install\nSuccess\n", "")).toEqual({
      succeeded: true
    });
    expect(parseAdbInstallOutput("Successfully did nothing\n", "")).toEqual({
      succeeded: false,
      reason: "Successfully did nothing"
    });
    expect(parseAdbInstallOutput("Failure [INSTALL_FAILED_INVALID_APK: bad]\n", "")).toEqual({
      succeeded: false,
      reason: "Failure [INSTALL_FAILED_INVALID_APK: bad]",
      failureCode: "INSTALL_FAILED_INVALID_APK"
    });
    expect(
      parseAdbInstallOutput(
        "",
        "adb: failed to install /tmp/app.apk: Failure [INSTALL_PARSE_FAILED_NO_CERTIFICATES: Failed]\n"
      )
    ).toEqual({
      succeeded: false,
      reason: "adb: failed to install /tmp/app.apk: Failure [INSTALL_PARSE_FAILED_NO_CERTIFICATES: Failed]",
      failureCode: "INSTALL_PARSE_FAILED_NO_CERTIFICATES"
    });
    expect(parseAdbInstallOutput("", "")).toEqual({
      succeeded: false,
      reason: "adb install did not return Success"
    });
  });

  it("parses adb uninstall success and failure lines conservatively", () => {
    expect(parseAdbUninstallOutput("Success\n", "")).toEqual({ succeeded: true });
    expect(parseAdbUninstallOutput("Success\r\n", "")).toEqual({ succeeded: true });
    expect(parseAdbUninstallOutput("Successfully did nothing\n", "")).toEqual({
      succeeded: false,
      reason: "Successfully did nothing"
    });
    expect(parseAdbUninstallOutput("Failure [DELETE_FAILED_DEVICE_POLICY_MANAGER]\n", "")).toEqual({
      succeeded: false,
      reason: "Failure [DELETE_FAILED_DEVICE_POLICY_MANAGER]",
      failureCode: "DELETE_FAILED_DEVICE_POLICY_MANAGER"
    });
    expect(parseAdbUninstallOutput("", "Error: Unknown package: com.example.missing\n")).toEqual({
      succeeded: false,
      reason: "Error: Unknown package: com.example.missing"
    });
    expect(parseAdbUninstallOutput("Success\n", "Error: policy rejected uninstall\n")).toEqual({
      succeeded: false,
      reason: "Error: policy rejected uninstall"
    });
    expect(parseAdbUninstallOutput("", "")).toEqual({
      succeeded: false,
      reason: "adb uninstall did not return Success"
    });
  });

  it("parses pm permission failures without bare keyword false positives", () => {
    expect(parsePmPermissionOutput("", "")).toEqual({});
    expect(parsePmPermissionOutput("Granted permission to com.example.errortracker\n", "")).toEqual({});
    expect(parsePmPermissionOutput("", "java.lang.SecurityException: Permission denial\n")).toEqual({
      failure: "java.lang.SecurityException: Permission denial"
    });
    expect(parsePmPermissionOutput("Error: Unknown permission: android.permission.NOPE\n", "")).toEqual({
      failure: "Error: Unknown permission: android.permission.NOPE"
    });
    expect(parsePmPermissionOutput("Error: java.lang.IllegalArgumentException: Unknown package: com.example.missing\n", "")).toEqual({
      failure: "Error: java.lang.IllegalArgumentException: Unknown package: com.example.missing"
    });
    expect(parsePmPermissionOutput("Not a changeable permission type: android.permission.INTERNET\n", "")).toEqual({
      failure: "Not a changeable permission type: android.permission.INTERNET"
    });
  });

  it("parses target permission state from dumpsys package output conservatively", () => {
    const dump = `Package [com.example.app] (abc):
  targetSdk=35
  requested permissions:
    android.permission.CAMERA
    android.permission.ACCESS_FINE_LOCATION
    android.permission.INTERNET
  install permissions:
    android.permission.INTERNET: granted=true
  User 0: ceDataInode=688569 installed=true hidden=false suspended=false distractionFlags=0
    runtime permissions:
      android.permission.CAMERA: granted=true, flags=[ USER_SET|USER_SENSITIVE_WHEN_GRANTED ]
  User 10: ceDataInode=123456 installed=true hidden=false suspended=false distractionFlags=0
    runtime permissions:
      android.permission.CAMERA: granted=false
`;

    expect(parseDumpsysPackagePermission(dump, "android.permission.CAMERA", 0)).toMatchObject({
      packageFound: true,
      targetSdk: 35,
      manifestRequested: true,
      availableUserIds: [0, 10],
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
    expect(parseDumpsysPackagePermission(dump, "android.permission.INTERNET", 0)).toMatchObject({
      state: "granted",
      granted: true,
      source: "install",
      install: { present: true, granted: true }
    });
    expect(parseDumpsysPackagePermission(dump, "android.permission.ACCESS_FINE_LOCATION", 0)).toMatchObject({
      state: "denied",
      granted: false,
      source: "manifest_initial",
      runtime: { present: false, userPresent: true }
    });
    expect(parseDumpsysPackagePermission("Unable to find package: com.example.missing\n", "android.permission.CAMERA", 0)).toMatchObject({
      packageFound: false,
      state: "unknown",
      granted: null,
      source: "package_absent"
    });

    const user10OnlyDump = `Package [com.example.app] (abc):
  requested permissions:
    android.permission.CAMERA
  User 10: ceDataInode=123456 installed=true hidden=false suspended=false distractionFlags=0
    runtime permissions:
      android.permission.CAMERA: granted=true
`;
    expect(parseDumpsysPackagePermission(user10OnlyDump, "android.permission.CAMERA", 0)).toMatchObject({
      packageFound: true,
      availableUserIds: [10],
      state: "unknown",
      granted: null,
      source: "unresolved_user",
      runtime: { selectedUserId: 0, userPresent: false, present: false }
    });
  });

  it("parses pidof output as positive unique numeric PIDs", () => {
    expect(parsePidofOutput("1234 5678 1234\n")).toEqual({ pids: [1234, 5678], invalid: [] });
    expect(parsePidofOutput("\n")).toEqual({ pids: [], invalid: [] });
    expect(parsePidofOutput("0 -1 abc 9007199254740993\n")).toEqual({
      pids: [],
      invalid: ["0", "-1", "abc", "9007199254740993"]
    });
  });

  it("builds and parses app memory snapshots from dumpsys meminfo", () => {
    expect(buildAdbAppMemoryArgs("com.example.app")).toEqual(["shell", "dumpsys", "meminfo", "com.example.app"]);
    expect(parseAppMemoryOutput(meminfoFixture(), "", 0, "com.example.app")).toEqual({
      ok: true,
      running: true,
      processes: [{ pid: 1234, process_name: "com.example.app" }],
      memory: {
        units: "kb",
        totals: {
          total_pss_kb: 63_795,
          total_rss_kb: 173_308,
          total_swap_pss_kb: 10_643
        },
        app_summary: {
          java_heap: { pss_kb: 7_336, rss_kb: 23_400 },
          native_heap: { pss_kb: 5_136, rss_kb: 6_396 },
          code: { pss_kb: 15_316, rss_kb: 134_152 },
          stack: { pss_kb: 340, rss_kb: 572 },
          graphics: { pss_kb: 0, rss_kb: 0 },
          private_other: { pss_kb: 6_200, rss_kb: null },
          system: { pss_kb: 29_467, rss_kb: null },
          unknown: { pss_kb: null, rss_kb: 8_788 }
        }
      }
    });

    const noisyDetails = meminfoFixture().replace("\n App Summary", "\n                Code:    99999                          99999\n App Summary");
    const parsedNoisyDetails = parseAppMemoryOutput(noisyDetails, "", 0, "com.example.app");
    expect(parsedNoisyDetails.ok).toBe(true);
    if (parsedNoisyDetails.ok) {
      expect(parsedNoisyDetails.memory.app_summary.code).toEqual({ pss_kb: 15_316, rss_kb: 134_152 });
    }
  });

  it("parses app memory absence and fails malformed meminfo output", () => {
    expect(parseAppMemoryOutput("", "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys meminfo returned empty output"
    });
    expect(parseAppMemoryOutput("No process found for: com.example.app\n", "", 0, "com.example.app")).toMatchObject({
      ok: true,
      running: false,
      processes: [],
      memory: {
        units: "kb",
        totals: { total_pss_kb: null, total_rss_kb: null, total_swap_pss_kb: null }
      }
    });
    expect(parseAppMemoryOutput("No process found for: com.other.app\n", "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys meminfo returned a process-absence result for a different package"
    });
    expect(parseAppMemoryOutput(meminfoFixture().replace("com.example.app", "com.other.app"), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys meminfo process name did not match requested package"
    });
    expect(parseAppMemoryOutput(`${meminfoFixture()}\n${meminfoFixture().replace("pid 1234", "pid 5678")}`, "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys meminfo returned multiple process sections"
    });
    expect(parseAppMemoryOutput(meminfoFixture().replace("TOTAL PSS:", "TOTAL:"), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys meminfo did not return parseable total memory fields"
    });
    expect(parseAppMemoryOutput(meminfoFixture(), "warning\n", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys meminfo wrote unexpected stderr"
    });
    expect(parseAppMemoryOutput(meminfoFixture(), "", 1, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys meminfo exited nonzero"
    });
  });

  it("builds and parses app graphics snapshots from dumpsys gfxinfo", () => {
    expect(buildAdbAppGraphicsArgs("com.example.app")).toEqual(["shell", "dumpsys", "gfxinfo", "com.example.app"]);
    const parsed = parseAppGraphicsOutput(gfxinfoFixture(), "", 0, "com.example.app");
    expect(parsed).toEqual({
      ok: true,
      running: true,
      processes: [{ pid: 1234, process_name: "com.example.app" }],
      graphics: {
        stats_since_ns: "91522723936145",
        total_frames_rendered: 6266,
        janky_frames: { count: 489, percent: 7.8 },
        janky_frames_legacy: { count: 2300, percent: 36.71 },
        percentiles_ms: { p50_ms: 9, p90_ms: 24, p95_ms: 28, p99_ms: 32 },
        slow_counts: {
          missed_vsync: 4,
          high_input_latency: 10359,
          slow_ui_thread: 456,
          slow_bitmap_uploads: 29,
          slow_issue_draw_commands: 66
        },
        frame_deadline_missed: 489,
        frame_deadline_missed_legacy: 517,
        histogram: {
          buckets: [
            { bucket_ms: 5, count: 978 },
            { bucket_ms: 6, count: 458 },
            { bucket_ms: 7, count: 696 }
          ],
          bucket_count: 3,
          truncated: false
        },
        gpu: {
          percentiles_ms: { p50_ms: 4, p90_ms: 7, p95_ms: 8, p99_ms: 11 },
          histogram: {
            buckets: [
              { bucket_ms: 1, count: 365 },
              { bucket_ms: 2, count: 935 }
            ],
            bucket_count: 2,
            truncated: false
          }
        }
      }
    });
    expect(parseAppGraphicsOutput(gfxinfoFixture().replace(/\n/g, "\r\n"), "", 0, "com.example.app")).toMatchObject({
      ok: true,
      running: true,
      processes: [{ pid: 1234, process_name: "com.example.app" }]
    });
  });

  it("parses app graphics absence and fails malformed gfxinfo output", () => {
    expect(parseAppGraphicsOutput("", "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys gfxinfo returned empty output"
    });
    expect(parseAppGraphicsOutput("No process found for: com.example.app\n", "", 0, "com.example.app")).toMatchObject({
      ok: true,
      running: false,
      processes: [],
      graphics: { stats_since_ns: null, total_frames_rendered: null, janky_frames: null }
    });
    expect(parseAppGraphicsOutput("No process found for: com.other.app\n", "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys gfxinfo returned a process-absence result for a different package"
    });
    expect(parseAppGraphicsOutput(gfxinfoFixture().replace("com.example.app", "com.other.app"), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys gfxinfo process name did not match requested package"
    });
    expect(parseAppGraphicsOutput(`${gfxinfoFixture()}\n${gfxinfoFixture().replace("pid 1234", "pid 5678")}`, "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys gfxinfo returned multiple process sections"
    });
    expect(parseAppGraphicsOutput(gfxinfoFixture().replace("Total frames rendered:", "Total frames:"), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys gfxinfo did not return Total frames rendered"
    });
    expect(parseAppGraphicsOutput(gfxinfoFixture().replace("Stats since: 91522723936145ns", "Stats since: 091522723936145ns"), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys gfxinfo did not return parseable stats_since_ns"
    });
    expect(parseAppGraphicsOutput(gfxinfoFixture().replace("7.80%", "7,80%"), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys gfxinfo returned malformed Janky frames"
    });
    expect(parseAppGraphicsOutput(gfxinfoFixture().replace("7ms=696", "bad-token"), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys gfxinfo returned malformed HISTOGRAM"
    });
    expect(parseAppGraphicsOutput(gfxinfoFixture(), "warning\n", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys gfxinfo wrote unexpected stderr"
    });
    expect(parseAppGraphicsOutput(gfxinfoFixture(), "", 1, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys gfxinfo exited nonzero"
    });
  });

  it("parses app graphics optional GPU and legacy fields as nullable", () => {
    const withoutOptional = gfxinfoFixture()
      .replace(/^Janky frames \(legacy\):.*\n/m, "")
      .replace(/^Number Frame deadline missed \(legacy\):.*\n/m, "")
      .replace(/^50th gpu percentile:.*\n/m, "")
      .replace(/^90th gpu percentile:.*\n/m, "")
      .replace(/^95th gpu percentile:.*\n/m, "")
      .replace(/^99th gpu percentile:.*\n/m, "")
      .replace(/^GPU HISTOGRAM:.*\n/m, "");
    const parsed = parseAppGraphicsOutput(withoutOptional, "", 0, "com.example.app");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.graphics.janky_frames_legacy).toBeNull();
      expect(parsed.graphics.frame_deadline_missed_legacy).toBeNull();
      expect(parsed.graphics.gpu).toBeNull();
    }
  });

  it("bounds app graphics histogram output", () => {
    const buckets = Array.from({ length: 260 }, (_, index) => `${index + 1}ms=${index}`).join(" ");
    const parsed = parseAppGraphicsOutput(gfxinfoFixture().replace(/^HISTOGRAM:.*$/m, `HISTOGRAM: ${buckets}`), "", 0, "com.example.app");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.graphics.histogram).toMatchObject({ bucket_count: 256, truncated: true });
    }
    const unsafeBuckets = `${buckets} 999ms=9007199254740993`;
    expect(parseAppGraphicsOutput(gfxinfoFixture().replace(/^HISTOGRAM:.*$/m, `HISTOGRAM: ${unsafeBuckets}`), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys gfxinfo returned unsafe HISTOGRAM"
    });
  });

  it("builds and parses launcher activity queries from cmd package", () => {
    expect(buildAdbAppActivitiesArgs("com.example.app", "launcher")).toEqual([
      "shell",
      "cmd",
      "package",
      "query-activities",
      "--brief",
      "-a",
      "android.intent.action.MAIN",
      "-c",
      "android.intent.category.LAUNCHER",
      "com.example.app"
    ]);
    expect(parseAppActivitiesOutput(appActivitiesFixture(), "", 0, "com.example.app")).toEqual({
      ok: true,
      activities: [
        {
          component: "com.example.app/.MainActivity",
          package_name: "com.example.app",
          activity: "com.example.app.MainActivity",
          relative_activity: ".MainActivity"
        }
      ]
    });
    expect(parseAppActivitiesOutput(appActivitiesMultiFixture(), "", 0, "org.koin.sample.sandbox")).toEqual({
      ok: true,
      activities: [
        {
          component: "org.koin.sample.sandbox/.main.MainActivity",
          package_name: "org.koin.sample.sandbox",
          activity: "org.koin.sample.sandbox.main.MainActivity",
          relative_activity: ".main.MainActivity"
        },
        {
          component: "org.koin.sample.sandbox/leakcanary.internal.activity.LeakLauncherActivity",
          package_name: "org.koin.sample.sandbox",
          activity: "leakcanary.internal.activity.LeakLauncherActivity",
          relative_activity: null
        }
      ]
    });
    expect(parseAppActivitiesOutput(appActivitiesFixture().replace(/\n/g, "\r\n"), "", 0, "com.example.app")).toMatchObject({
      ok: true,
      activities: [{ activity: "com.example.app.MainActivity" }]
    });
  });

  it("parses empty launcher activity results without inferring package absence", () => {
    expect(parseAppActivitiesOutput("No activities found\n", "", 0, "com.example.no.launcher")).toEqual({
      ok: true,
      activities: []
    });
    expect(parseAppActivitiesOutput("0 activities found:\n", "", 0, "com.example.no.launcher")).toEqual({
      ok: true,
      activities: []
    });
  });

  it("fails malformed launcher activity query output", () => {
    expect(parseAppActivitiesOutput("", "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package query-activities returned empty output"
    });
    expect(parseAppActivitiesOutput("wat\n", "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package query-activities returned malformed header"
    });
    expect(parseAppActivitiesOutput("99999999999999999999 activities found:\n", "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package query-activities returned unsafe activity count"
    });
    expect(parseAppActivitiesOutput("0 activities found:\ntrailing line\n", "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package query-activities returned trailing output after zero activities"
    });
    expect(parseAppActivitiesOutput(appActivitiesFixture().replace("1 activities found:", "2 activities found:"), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package query-activities activity block count did not match header"
    });
    expect(parseAppActivitiesOutput(appActivitiesFixture().replace("    com.example.app/.MainActivity", ""), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package query-activities returned malformed activity block"
    });
    expect(parseAppActivitiesOutput(appActivitiesFixture().replace("    com.example.app/.MainActivity", "    com.example.app/.MainActivity\n    com.example.app/.AliasActivity"), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package query-activities returned malformed activity block"
    });
    expect(parseAppActivitiesOutput(appActivitiesFixture().replace("com.example.app/.MainActivity", "com.example.app/9BadActivity"), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package query-activities returned malformed component"
    });
    expect(parseAppActivitiesOutput(appActivitiesFixture().replace("com.example.app/.MainActivity", "com.other.app/.MainActivity"), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package query-activities returned component for a different package"
    });
    expect(parseAppActivitiesOutput(appActivitiesFixture(), "warning\n", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package query-activities wrote unexpected stderr"
    });
    expect(parseAppActivitiesOutput(appActivitiesFixture(), "", 255, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package query-activities exited nonzero"
    });
  });

  it("builds and parses app link domain verification output", () => {
    expect(buildAdbAppLinksArgs("com.example.app")).toEqual([
      "shell",
      "cmd",
      "package",
      "get-app-links",
      "com.example.app"
    ]);
    expect(
      parseAppLinksOutput(
        [
          "  com.example.app:",
          "    ID: 66e3deaf-c2b4-450d-a1b3-d0ad1541a259",
          "    Signatures: [AA:BB]",
          "    Domain verification state:",
          "      example.com: verified",
          "      custom.example.com: 1024",
          "      future.example.com: future_state",
          "    User 0:",
          "      Verification link handling allowed: true",
          "      Selection state:",
          "        Disabled:",
          "          ignored.example.com",
          ""
        ].join("\n"),
        "",
        0,
        "com.example.app"
      )
    ).toEqual({
      ok: true,
      packageFound: true,
      domains: [
        { domain: "example.com", state: { raw: "verified", kind: "known", code: null } },
        { domain: "custom.example.com", state: { raw: "1024", kind: "custom_error", code: 1024 } },
        { domain: "future.example.com", state: { raw: "future_state", kind: "unknown", code: null } }
      ]
    });
  });

  it("distinguishes app link absence, empty domains, and parse failures", () => {
    expect(parseAppLinksOutput("", "Error: package com.example.missing unavailable\n", 1, "com.example.missing")).toEqual({
      ok: true,
      packageFound: false,
      domains: []
    });
    expect(parseAppLinksOutput("", "", 0, "com.example.app")).toEqual({
      ok: true,
      packageFound: true,
      domains: []
    });
    expect(parseAppLinksOutput("  com.other.app:\n    Domain verification state:\n", "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package get-app-links returned a package block for a different package"
    });
    expect(parseAppLinksOutput("  com.example.app:\n    Domain verification state:\n      example.com verified\n", "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package get-app-links returned malformed domain verification entry"
    });
    expect(parseAppLinksOutput("  com.example.app:\n    Domain verification state:\n      example.com: 42\n", "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package get-app-links returned malformed custom domain state"
    });
    expect(parseAppLinksOutput("  com.example.app:\n    Domain verification state:\n      example.com: verified\n", "warning\n", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package get-app-links wrote unexpected stderr"
    });
    expect(parseAppLinksOutput("bad\n", "", 1, "com.example.app")).toEqual({
      ok: false,
      failure: "cmd package get-app-links exited nonzero"
    });
  });

  it("builds and parses single-op appops output", () => {
    expect(buildAdbAppOpsGetArgs("com.example.app", "CAMERA")).toEqual([
      "shell",
      "cmd",
      "appops",
      "get",
      "com.example.app",
      "CAMERA"
    ]);
    expect(buildAdbAppOpsGetArgs("com.example.app", "CAMERA", 10)).toEqual([
      "shell",
      "cmd",
      "appops",
      "get",
      "--user",
      "10",
      "com.example.app",
      "CAMERA"
    ]);

    expect(
      parseAppOpsGetOutput(
        [
          "Uid mode: CAMERA: foreground",
          "CAMERA: allow; time=+480d23h58m28s421ms ago; duration=+1s634ms",
          ""
        ].join("\n"),
        "",
        0,
        "com.example.app",
        "CAMERA"
      )
    ).toEqual({
      ok: true,
      lookup: { status: "resolved", uid_resolved: true, reason: "appops_uid_resolved" },
      defaultMode: null,
      entries: [
        {
          scope: "uid",
          op_name: "CAMERA",
          mode: { raw: "foreground", kind: "foreground" },
          details: { time_raw: null, reject_time_raw: null, duration_raw: null }
        },
        {
          scope: "package",
          op_name: "CAMERA",
          mode: { raw: "allow", kind: "allow" },
          details: { time_raw: "+480d23h58m28s421ms ago", reject_time_raw: null, duration_raw: "+1s634ms" }
        }
      ]
    });
  });

  it("parses appops no_uid and default-mode outputs without claiming package absence", () => {
    expect(parseAppOpsGetOutput("Error: No UID for com.example.missing in user 0\n", "", 0, "com.example.missing", "CAMERA")).toEqual({
      ok: true,
      lookup: { status: "no_uid", uid_resolved: false, reason: "no_appops_uid_for_package_in_queried_user" },
      defaultMode: null,
      entries: []
    });
    expect(parseAppOpsGetOutput("", "Error: No UID for com.example.missing in user 0\n", 255, "com.example.missing", "CAMERA")).toEqual({
      ok: true,
      lookup: { status: "no_uid", uid_resolved: false, reason: "no_appops_uid_for_package_in_queried_user" },
      defaultMode: null,
      entries: []
    });
    expect(parseAppOpsGetOutput("No operations.\nDefault mode: default\n", "", 0, "com.example.app", "WRITE_SETTINGS")).toEqual({
      ok: true,
      lookup: { status: "resolved", uid_resolved: true, reason: "appops_uid_resolved" },
      defaultMode: { raw: "default", kind: "default" },
      entries: []
    });
  });

  it("fails appops explicit-user no_uid, unknown ops, and malformed output", () => {
    expect(parseAppOpsGetOutput("Error: No UID for com.example.app in user 999\n", "", 0, "com.example.app", "CAMERA", 999)).toEqual({
      ok: false,
      failure: "cmd appops get could not resolve a package uid for the explicit Android user",
      reason: "no_uid_explicit_user"
    });
    expect(parseAppOpsGetOutput("Error: Unknown operation string: NOT_A_REAL_OP\n", "", 0, "com.example.app", "NOT_A_REAL_OP")).toEqual({
      ok: false,
      failure: "cmd appops get reported an unknown operation",
      reason: "unknown_operation"
    });
    expect(parseAppOpsGetOutput("", "Error: Unknown operation string: NOT_A_REAL_OP\n", 255, "com.example.app", "NOT_A_REAL_OP")).toEqual({
      ok: false,
      failure: "cmd appops get reported an unknown operation",
      reason: "unknown_operation"
    });
    expect(parseAppOpsGetOutput("READ_CLIPBOARD: future_mode\n", "", 0, "com.example.app", "READ_CLIPBOARD")).toEqual({
      ok: true,
      lookup: { status: "resolved", uid_resolved: true, reason: "appops_uid_resolved" },
      defaultMode: null,
      entries: [
        {
          scope: "package",
          op_name: "READ_CLIPBOARD",
          mode: { raw: "future_mode", kind: "unknown" },
          details: { time_raw: null, reject_time_raw: null, duration_raw: null }
        }
      ]
    });
    expect(parseAppOpsGetOutput("CAMERA: allow\n", "warning\n", 0, "com.example.app", "CAMERA")).toEqual({
      ok: false,
      failure: "cmd appops get wrote unexpected stderr",
      reason: "unexpected_stderr"
    });
    expect(parseAppOpsGetOutput("CAMERA: allow\n", "", 1, "com.example.app", "CAMERA")).toEqual({
      ok: false,
      failure: "cmd appops get exited nonzero",
      reason: "nonzero_exit"
    });
    expect(parseAppOpsGetOutput("CAMERA allow\n", "", 0, "com.example.app", "CAMERA")).toEqual({
      ok: false,
      failure: "cmd appops get returned malformed appops entry",
      reason: "malformed_entry"
    });
    expect(parseAppOpsGetOutput("OTHER_OP: allow\n", "", 0, "com.example.app", "CAMERA")).toEqual({
      ok: false,
      failure: "cmd appops get returned an entry for a different operation",
      reason: "op_mismatch"
    });
  });

  it("builds and parses ACTION_VIEW URL resolution", () => {
    const url = "https://example.com/path?a=1&b=2#frag'";
    expect(buildAdbAppResolveUrlArgs(url)).toEqual([
      "shell",
      "cmd",
      "package",
      "resolve-activity",
      "--brief",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      quoteForDeviceShell(url)
    ]);
    expect(
      parseAppResolveUrlOutput(
        "priority=0 preferredOrder=0 match=0x208000 specificIndex=-1 isDefault=true\ncom.android.browser/.BrowserActivity\n",
        "",
        0
      )
    ).toEqual({
      ok: true,
      resolution: {
        type: "activity",
        component: "com.android.browser/.BrowserActivity",
        package: "com.android.browser",
        activity: "com.android.browser.BrowserActivity",
        is_system_resolver: false
      },
      metadata: {
        priority: 0,
        preferred_order: 0,
        match: { raw: "0x208000", value: 2_129_920 },
        specific_index: -1,
        is_default: true
      }
    });
    expect(parseAppResolveUrlOutput("com.android.browser/.BrowserActivity\n", "", 0)).toMatchObject({
      ok: true,
      resolution: { type: "activity" },
      metadata: null
    });
  });

  it("distinguishes URL resolution no-match and system resolver results", () => {
    expect(parseAppResolveUrlOutput("No activity found\n", "", 0)).toEqual({
      ok: true,
      resolution: {
        type: "none",
        component: null,
        package: null,
        activity: null,
        is_system_resolver: false
      },
      metadata: null
    });
    expect(parseAppResolveUrlOutput("  No activity found  \r\n", "", 0)).toMatchObject({
      ok: true,
      resolution: { type: "none" },
      metadata: null
    });
    expect(
      parseAppResolveUrlOutput(
        "priority=0 preferredOrder=0 match=0x208000 specificIndex=-1 isDefault=false\nandroid/com.android.internal.app.ResolverActivity\n",
        "",
        0
      )
    ).toMatchObject({
      ok: true,
      resolution: {
        type: "resolver",
        package: "android",
        activity: "com.android.internal.app.ResolverActivity",
        is_system_resolver: true
      }
    });
    expect(parseAppResolveUrlOutput("android/com.android.internal.app.ChooserActivity\n", "", 0)).toMatchObject({
      ok: true,
      resolution: {
        type: "resolver",
        package: "android",
        activity: "com.android.internal.app.ChooserActivity",
        is_system_resolver: true
      }
    });
  });

  it("fails malformed ACTION_VIEW URL resolution output conservatively", () => {
    expect(parseAppResolveUrlOutput("", "", 0)).toEqual({
      ok: false,
      failure: "cmd package resolve-activity returned empty output"
    });
    expect(parseAppResolveUrlOutput("warning\ncom.android.browser/.BrowserActivity\n", "", 0)).toEqual({
      ok: false,
      failure: "cmd package resolve-activity returned unrecognized output"
    });
    expect(parseAppResolveUrlOutput("priority=0 preferredOrder=0 match=208000 specificIndex=-1 isDefault=true\ncom.android.browser/.BrowserActivity\n", "", 0)).toEqual({
      ok: false,
      failure: "cmd package resolve-activity returned malformed metadata"
    });
    expect(parseAppResolveUrlOutput("priority=0 preferredOrder=0 match=0x208000 specificIndex=-1 isDefault=true extra=1\ncom.android.browser/.BrowserActivity\n", "", 0)).toEqual({
      ok: false,
      failure: "cmd package resolve-activity returned unsupported metadata fields"
    });
    expect(parseAppResolveUrlOutput("com.android.browser/.BrowserActivity\ncom.other/.OtherActivity\n", "", 0)).toEqual({
      ok: false,
      failure: "cmd package resolve-activity returned an unexpected component count"
    });
    expect(parseAppResolveUrlOutput("com.android.browser/9Bad\n", "", 0)).toEqual({
      ok: false,
      failure: "cmd package resolve-activity returned malformed component"
    });
    expect(parseAppResolveUrlOutput("No activity found\n", "warning\n", 0)).toEqual({
      ok: false,
      failure: "cmd package resolve-activity wrote unexpected stderr"
    });
    expect(parseAppResolveUrlOutput("No activity found\n", "", 1)).toEqual({
      ok: false,
      failure: "cmd package resolve-activity exited nonzero"
    });
  });

  it("builds and parses active app package metadata from dumpsys package", () => {
    expect(buildAdbAppPackageInfoArgs("com.example.app")).toEqual(["shell", "dumpsys", "package", "com.example.app"]);
    expect(parseAppPackageInfoOutput(packageInfoFixture(), "", 0, "com.example.app")).toEqual({
      ok: true,
      installed: true,
      packageInfo: {
        package_name: "com.example.app",
        app_id: 10134,
        code_path: "/data/app/~~hash/com.example.app-base",
        resource_path: "/data/app/~~hash/com.example.app-base",
        native_library_dir: "/data/app/~~hash/com.example.app-base/lib/arm64",
        primary_cpu_abi: "arm64-v8a",
        secondary_cpu_abi: null,
        cpu_abi_override: null,
        version: { code: 42, min_sdk: 23, target_sdk: 35, name: "1.2.3" },
        splits: ["base", "config.arm64_v8a"],
        flags: ["HAS_CODE", "ALLOW_CLEAR_USER_DATA"],
        private_flags: ["PRIVATE_FLAG_ACTIVITIES_RESIZE_MODE_RESIZEABLE", "PRIVATE_FLAG_HAS_DOMAIN_URLS"],
        timestamps: {
          time_stamp: "2026-06-29 12:00:00",
          last_update_time: "2026-06-29 12:30:00"
        },
        installer: {
          package_name: "com.android.vending",
          uid: 10031,
          initiating_package_name: "com.android.vending",
          originating_package_name: null
        },
        package_source: 0,
        install_permissions_fixed: true,
        apex_module_name: null
      }
    });
    expect(parseAppPackageInfoOutput(packageInfoFixture().replace(/\n/g, "\r\n"), "", 0, "com.example.app")).toMatchObject({
      ok: true,
      installed: true
    });
    expect(parseAppPackageInfoOutput(packageInfoFixture().replace("appId=10134", "userId=10134"), "", 0, "com.example.app")).toMatchObject({
      ok: true,
      installed: true,
      packageInfo: { app_id: 10134 }
    });
    expect(parseAppPackageInfoOutput(packageInfoFixture().replace("  Package [com.example.app] (abc):", "  Package [com.example.app]:"), "", 0, "com.example.app")).toMatchObject({
      ok: true,
      installed: true,
      packageInfo: { package_name: "com.example.app" }
    });
    const sameLineFields = packageInfoFixture()
      .replace(
        "    versionCode=42 minSdk=23 targetSdk=35\n    versionName=1.2.3",
        "    versionCode=42 minSdk=23 targetSdk=35 versionName=1.2.3 beta"
      )
      .replace(
        "    splits=[base config.arm64_v8a]\n    flags=[ HAS_CODE ALLOW_CLEAR_USER_DATA ]\n    privateFlags=[ PRIVATE_FLAG_ACTIVITIES_RESIZE_MODE_RESIZEABLE PRIVATE_FLAG_HAS_DOMAIN_URLS ]",
        "    splits=[base config.arm64_v8a] flags=[ HAS_CODE ALLOW_CLEAR_USER_DATA ] privateFlags=[ PRIVATE_FLAG_ACTIVITIES_RESIZE_MODE_RESIZEABLE PRIVATE_FLAG_HAS_DOMAIN_URLS ]"
      );
    const sameLineParsed = parseAppPackageInfoOutput(sameLineFields, "", 0, "com.example.app");
    expect(sameLineParsed).toMatchObject({
      ok: true,
      installed: true,
      packageInfo: {
        version: { name: "1.2.3 beta" },
        splits: ["base", "config.arm64_v8a"],
        flags: ["HAS_CODE", "ALLOW_CLEAR_USER_DATA"]
      }
    });
  });

  it("parses only the active package block and ignores hidden duplicate metadata", () => {
    const parsed = parseAppPackageInfoOutput(packageInfoWithHiddenDuplicateFixture(), "", 0, "com.example.app");

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.installed).toBe(true);
      expect(parsed.packageInfo?.code_path).toBe("/data/app/~~hash/com.example.app-base");
      expect(parsed.packageInfo?.version.code).toBe(42);
    }
    expect(
      parseAppPackageInfoOutput(
        [
          "Packages:",
          "",
          "Hidden system packages:",
          "  Package [com.example.app] (hidden):",
          "    appId=10134",
          "    codePath=/system/app/Example",
          "    versionCode=1 minSdk=21 targetSdk=28",
          ""
        ].join("\n"),
        "",
        0,
        "com.example.app"
      )
    ).toEqual({
      ok: false,
      failure: "dumpsys package did not return an active package block"
    });
  });

  it("parses exact package absence and fails ambiguous package-info output", () => {
    expect(parseAppPackageInfoOutput("Unable to find package: com.example.app\n", "", 0, "com.example.app")).toEqual({
      ok: true,
      installed: false,
      packageInfo: null
    });
    expect(parseAppPackageInfoOutput("Package manager warning\nUnable to find package: com.example.app\n", "", 0, "com.example.app")).toEqual({
      ok: true,
      installed: false,
      packageInfo: null
    });
    expect(parseAppPackageInfoOutput("Unable to find package: com.other.app\n", "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys package returned absence for a different package"
    });
    expect(parseAppPackageInfoOutput("", "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys package returned empty output"
    });
    expect(parseAppPackageInfoOutput("Unknown package: com.example.app\n", "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys package did not return a Packages section"
    });
  });

  it("fails malformed app package metadata instead of using hidden or partial values", () => {
    const duplicateActiveBlock = packageInfoFixture().replace(
      "\nQueries:",
      "\n  Package [com.example.app] (duplicate):\n    appId=10134\n    codePath=/data/app/duplicate\n    versionCode=43 minSdk=23 targetSdk=35\n\nQueries:"
    );
    expect(parseAppPackageInfoOutput(duplicateActiveBlock, "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys package returned duplicate active package blocks"
    });
    expect(parseAppPackageInfoOutput(packageInfoFixture().replace("versionCode=42", "versionCode=bad"), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys package returned malformed versionCode"
    });
    expect(parseAppPackageInfoOutput(packageInfoFixture().replace("codePath=/data/app/~~hash/com.example.app-base\n", ""), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys package did not return codePath"
    });
    expect(parseAppPackageInfoOutput(packageInfoFixture().replace("splits=[base config.arm64_v8a]", "splits=base"), "", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys package returned malformed splits"
    });
    const tabBoundary = packageInfoFixture()
      .replace("    declared permissions:", "\tdeclared permissions:")
      .replace("      com.example.app.permission.PRIVATE: prot=signature", "      versionName=leaked");
    const parsedTabBoundary = parseAppPackageInfoOutput(tabBoundary, "", 0, "com.example.app");
    expect(parsedTabBoundary).toMatchObject({
      ok: true,
      installed: true,
      packageInfo: { version: { name: "1.2.3" } }
    });
    expect(parseAppPackageInfoOutput(packageInfoFixture(), "warning\n", 0, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys package wrote unexpected stderr"
    });
    expect(parseAppPackageInfoOutput(packageInfoFixture(), "", 1, "com.example.app")).toEqual({
      ok: false,
      failure: "dumpsys package exited nonzero"
    });
  });

  it("parses logcat text lines while filtering buffer dividers", () => {
    expect(
      parseLogcatLines(
        [
          "--------- beginning of main",
          "06-29 12:00:00.000  1234  1234 I Example: hello",
          "--------- switch to system",
          "06-29 12:00:00.001  1234  1235 W Example: warn",
          ""
        ].join("\n")
      )
    ).toEqual([
      "06-29 12:00:00.000  1234  1234 I Example: hello",
      "06-29 12:00:00.001  1234  1235 W Example: warn"
    ]);
  });
});
