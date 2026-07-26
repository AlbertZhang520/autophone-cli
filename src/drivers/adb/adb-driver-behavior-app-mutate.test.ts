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
} from "./adb-driver-test-utils.test-support.js";describe("adb driver behavior app", () => {

  it("reads launcher activity components with cmd package query-activities", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-activities-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "package" ] && [ "$6" = "query-activities" ]; then
  cat <<'EOF'
${appActivitiesFixture()}
EOF
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppActivities({
        packageName: "com.example.app",
        intent: "launcher",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      activities: [{ component: "com.example.app/.MainActivity", activity: "com.example.app.MainActivity" }],
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell cmd package query-activities --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER com.example.app"
    );
  });

  it("maps no launcher activities to an empty activity list", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "package" ] && [ "$6" = "query-activities" ]; then
  printf 'No activities found\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppActivities({
        packageName: "com.example.no.launcher",
        intent: "launcher",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      activities: [],
      exitCode: 0
    });
  });

  it("maps malformed launcher activity output to APP_ACTIVITIES_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "package" ] && [ "$6" = "query-activities" ]; then
  printf '1 activities found:\\n  Activity #0:\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppActivities({
        packageName: "com.example.app",
        intent: "launcher",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_ACTIVITIES_FAILED",
      retriable: false,
      details: { package_name: "com.example.app", intent: "launcher", method: "cmd_package_query_activities", exit_code: 0 }
    });
  });

  it("classifies offline targets before app activities parse failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "package" ] && [ "$6" = "query-activities" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppActivities({
        packageName: "com.example.app",
        intent: "launcher",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads active app package metadata with dumpsys package", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-package-info-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "package" ]; then
  cat <<'EOF'
${packageInfoFixture()}
EOF
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppPackageInfo({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      installed: true,
      packageInfo: {
        package_name: "com.example.app",
        app_id: 10134,
        version: { code: 42, min_sdk: 23, target_sdk: 35, name: "1.2.3" }
      },
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain("-s emulator-5554 shell dumpsys package com.example.app");
  });

  it("maps exact app package absence to an installed false result", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "package" ]; then
  printf 'Unable to find package: com.example.app\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppPackageInfo({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      installed: false,
      packageInfo: null,
      exitCode: 0
    });
  });

  it("maps malformed app package metadata to APP_PACKAGE_INFO_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "package" ]; then
  printf 'Packages:\\n  Package [com.example.app] (abc):\\n    appId=10134\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppPackageInfo({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_PACKAGE_INFO_FAILED",
      retriable: false,
      details: { package_name: "com.example.app", method: "dumpsys_package", exit_code: 0 }
    });
  });

  it("classifies offline targets before app package-info parse failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "package" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppPackageInfo({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads app link domain verification state with cmd package get-app-links", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-app-links-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "package" ] && [ "$6" = "get-app-links" ]; then
  cat <<'EOF'
  com.example.app:
    ID: 66e3deaf-c2b4-450d-a1b3-d0ad1541a259
    Signatures: [AA:BB]
    Domain verification state:
      example.com: verified
      api.example.com: system_configured
EOF
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppLinks({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      packageFound: true,
      domains: [
        { domain: "example.com", state: { raw: "verified", kind: "known", code: null } },
        { domain: "api.example.com", state: { raw: "system_configured", kind: "known", code: null } }
      ],
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell cmd package get-app-links com.example.app"
    );
  });

  it("maps app link unavailable packages to packageFound false", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "package" ] && [ "$6" = "get-app-links" ]; then
  printf 'Error: package com.example.missing unavailable\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppLinks({
        packageName: "com.example.missing",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      packageFound: false,
      domains: [],
      exitCode: 1
    });
  });

  it("maps malformed app link output to APP_LINKS_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "package" ] && [ "$6" = "get-app-links" ]; then
  printf '  com.example.app:\\n    Domain verification state:\\n      bad line\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppLinks({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_LINKS_FAILED",
      retriable: false,
      details: { package_name: "com.example.app", method: "cmd_package_get_app_links", exit_code: 0 }
    });
  });

  it("classifies offline targets before app link parse failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "package" ] && [ "$6" = "get-app-links" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppLinks({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads one appops operation with cmd appops get", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-appops-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "appops" ] && [ "$6" = "get" ]; then
  cat <<'EOF'
Uid mode: CAMERA: foreground
CAMERA: allow; time=+1h ago; duration=+2s
EOF
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppOps({
        packageName: "com.example.app",
        opName: "CAMERA",
        userId: 0,
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      lookup: { status: "resolved", uid_resolved: true },
      defaultMode: null,
      entries: [
        { scope: "uid", op_name: "CAMERA", mode: { raw: "foreground", kind: "foreground" } },
        {
          scope: "package",
          op_name: "CAMERA",
          mode: { raw: "allow", kind: "allow" },
          details: { time_raw: "+1h ago", duration_raw: "+2s" }
        }
      ],
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell cmd appops get --user 0 com.example.app CAMERA"
    );
  });

  it("maps appops no_uid default-user output to uid_resolved false", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "appops" ] && [ "$6" = "get" ]; then
  printf 'Error: No UID for com.example.missing in user 0\\n' >&2
  exit 255
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppOps({
        packageName: "com.example.missing",
        opName: "CAMERA",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      lookup: { status: "no_uid", uid_resolved: false },
      defaultMode: null,
      entries: [],
      exitCode: 255
    });
  });

  it("maps appops explicit-user no_uid and unknown operations to APP_OPS_FAILED", async () => {
    const explicitUserAdb = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "appops" ] && [ "$6" = "get" ]; then
  printf 'Error: No UID for com.example.app in user 999\\n'
  exit 0
fi
exit 9
`);
    const explicitUserDriver = new AdbDriver({ adbPath: explicitUserAdb });
    await expect(
      explicitUserDriver.getAppOps({
        packageName: "com.example.app",
        opName: "CAMERA",
        userId: 999,
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_OPS_FAILED",
      retriable: false,
      details: { package_name: "com.example.app", op_name: "CAMERA", user_id: 999, reason: "no_uid_explicit_user" }
    });

    const unknownOpAdb = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "appops" ] && [ "$6" = "get" ]; then
  printf 'Error: Unknown operation string: NOT_A_REAL_OP\\n' >&2
  exit 255
fi
exit 9
`);
    const unknownOpDriver = new AdbDriver({ adbPath: unknownOpAdb });
    await expect(
      unknownOpDriver.getAppOps({
        packageName: "com.example.app",
        opName: "NOT_A_REAL_OP",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_OPS_FAILED",
      retriable: false,
      details: { package_name: "com.example.app", op_name: "NOT_A_REAL_OP", reason: "unknown_operation" }
    });
  });

  it("classifies offline targets before appops parse failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "cmd" ] && [ "$5" = "appops" ] && [ "$6" = "get" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppOps({
        packageName: "com.example.app",
        opName: "CAMERA",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("dumps logcat for one PID with explicit bounded options", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-logcat-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "logcat" ]; then
  printf '%s\\n' '--------- beginning of main'
  printf '%s\\n' '06-29 12:00:00.000  1234  1234 I Example: hello'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.dumpLogcat({
        deviceSerial: "emulator-5554",
        pid: 1234,
        lines: 25,
        buffers: ["main", "system", "crash"],
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      pid: 1234,
      lines: ["06-29 12:00:00.000  1234  1234 I Example: hello"],
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell logcat -d -t 25 --pid 1234 -v threadtime -b main,system,crash"
    );
  });

  it("maps unsupported logcat pid filtering to LOGS_UNAVAILABLE without echoing stdout", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "logcat" ]; then
  printf '%s\\n' '06-29 12:00:00.000  9999  9999 I Other: secret-ish stdout'
  printf '%s\\n' 'logcat: unknown option -- pid' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.dumpLogcat({
        deviceSerial: "emulator-5554",
        pid: 1234,
        lines: 25,
        buffers: ["main", "system", "crash"],
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "LOGS_UNAVAILABLE",
      message: "logcat: unknown option -- pid",
      retriable: false,
      details: {
        method: "logcat_pid_tail",
        pid: 1234,
        exit_code: 1,
        stderr: "logcat: unknown option -- pid\n"
      }
    });
  });

  it("keeps successful logcat output when stderr contains a benign warning", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "logcat" ]; then
  printf '%s\\n' '06-29 12:00:00.000  1234  1234 I Example: hello'
  printf '%s\\n' 'warning: read_logs policy note' >&2
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.dumpLogcat({
        deviceSerial: "emulator-5554",
        pid: 1234,
        lines: 25,
        buffers: ["main", "system", "crash"],
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      pid: 1234,
      lines: ["06-29 12:00:00.000  1234  1234 I Example: hello"],
      exitCode: 0
    });
  });

  it("clears app data through pm clear with argv tokens", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-clear-data-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "clear" ]; then
  printf 'Success\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.clearPackageData({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell pm clear com.example.app"
    );
  });

  it("maps pm clear non-Success output to APP_CLEAR_DATA_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "clear" ]; then
  printf 'Failed\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.clearPackageData({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_CLEAR_DATA_FAILED",
      message: "Failed",
      retriable: false,
      details: { package_name: "com.example.app", method: "pm_clear", exit_code: 0 }
    });
  });

  it("maps pm clear adb target failures before package-manager failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
printf "adb: device 'emulator-5554' not found\\n" >&2
exit 1
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.clearPackageData({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "NO_DEVICE",
      retriable: true
    });
  });

  it("installs one APK through adb install with explicit serial and flags before the path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-install-"));
    const argsFile = join(dir, "args.txt");
    const apkPath = join(dir, "app-debug.apk");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$2" = "emulator-5554" ] && [ "$3" = "install" ]; then
  printf 'Performing Streamed Install\\nSuccess\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.installApk({
        apkPath,
        replace: true,
        grantRuntimePermissions: true,
        allowTest: true,
        allowDowngrade: true,
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      `-s emulator-5554 install -r -g -t -d ${apkPath}`
    );
  });

  it("maps adb install failures to APP_INSTALL_FAILED without leaking the local path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-install-failure-"));
    const apkPath = join(dir, "app-debug.apk");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$3" = "install" ]; then
  printf '%s\\n' "adb: failed to install ${apkPath}: Failure [INSTALL_FAILED_INVALID_APK: bad]" >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    let caught: unknown;
    try {
      await driver.installApk({
        apkPath,
        replace: false,
        grantRuntimePermissions: false,
        allowTest: false,
        allowDowngrade: false,
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AutophoneError);
    const error = caught as AutophoneError;
    expect(error).toMatchObject({
      code: "APP_INSTALL_FAILED",
      retriable: false,
      details: {
        method: "adb_install",
        exit_code: 1,
        failure_code: "INSTALL_FAILED_INVALID_APK"
      }
    });
    expect(error.message).not.toContain(apkPath);
    expect(JSON.stringify(error.details)).not.toContain(apkPath);
    expect(JSON.stringify(error.details)).toContain("<apk-path>");
  });

  it("maps adb install exit 0 without Success to APP_INSTALL_FAILED", async () => {
    const apkPath = "/tmp/private/app-debug.apk";
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$3" = "install" ]; then
  printf 'Performing Streamed Install\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.installApk({
        apkPath,
        replace: false,
        grantRuntimePermissions: false,
        allowTest: false,
        allowDowngrade: false,
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_INSTALL_FAILED",
      retriable: false,
      details: {
        method: "adb_install",
        exit_code: 0
      }
    });
  });

  it("keeps INSTALL_FAILED output classified as install failure even when the reason mentions offline", async () => {
    const apkPath = "/tmp/private/app-debug.apk";
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$3" = "install" ]; then
  printf '%s\\n' 'Failure [INSTALL_FAILED_INVALID_APK: package metadata said offline mode]' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.installApk({
        apkPath,
        replace: false,
        grantRuntimePermissions: false,
        allowTest: false,
        allowDowngrade: false,
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_INSTALL_FAILED",
      retriable: false,
      details: {
        failure_code: "INSTALL_FAILED_INVALID_APK"
      }
    });
  });

  it("maps adb install target failures before install parser failures and redacts argv paths", async () => {
    const apkPath = "/tmp/private/app-debug.apk";
    const adbPath = await createFakeAdb(`#!/bin/sh
printf "adb: device 'emulator-5554' not found\\n" >&2
exit 1
`);
    const driver = new AdbDriver({ adbPath });

    let caught: unknown;
    try {
      await driver.installApk({
        apkPath,
        replace: true,
        grantRuntimePermissions: false,
        allowTest: false,
        allowDowngrade: false,
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AutophoneError);
    const error = caught as AutophoneError;
    expect(error).toMatchObject({
      code: "NO_DEVICE",
      retriable: true,
      details: {
        args: ["install", "-r", "<apk-path>"],
        exit_code: 1
      }
    });
    expect(JSON.stringify(error.details)).not.toContain(apkPath);
  });
});
