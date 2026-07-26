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
  it("lists packages through pm with mapped flags and a safe filter token", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-app-list-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "list" ] && [ "$6" = "packages" ]; then
  printf 'package:android\\r\\npackage:com.example.app\\r\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.listPackages({
        scope: "third_party",
        state: "disabled",
        includeUninstalled: true,
        filter: "example",
        timeoutMs: 5000
      })
    ).resolves.toEqual({
      serial: "emulator-5554",
      packages: ["android", "com.example.app"]
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell pm list packages -3 -d -u example"
    );
  });

  it("maps package manager list failures to APP_LIST_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "pm" ]; then
  printf 'Error: Unknown option: --bad\\n'
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.listPackages({
        scope: "system",
        state: "enabled",
        includeUninstalled: false,
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_LIST_FAILED",
      retriable: false,
      details: { method: "pm_list_packages", exit_code: 1 }
    });
  });

  it("keeps successful package output when stderr contains non-fatal error-like text", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "pm" ]; then
  printf 'package:android\\n'
  printf 'error: benign platform warning\\n' >&2
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.listPackages({
        scope: "all",
        state: "all",
        includeUninstalled: false,
        timeoutMs: 5000
      })
    ).resolves.toEqual({
      serial: "emulator-5554",
      packages: ["android"]
    });
  });

  it("returns an empty package list for successful empty package manager output", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$4" = "pm" ]; then
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.listPackages({
        scope: "all",
        state: "all",
        includeUninstalled: false,
        filter: "no.match",
        timeoutMs: 5000
      })
    ).resolves.toEqual({
      serial: "emulator-5554",
      packages: []
    });
  });

  it("inspects package presence through pm path with explicit user routing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-app-inspect-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "path" ]; then
  printf 'package:/data/app/com.example/base.apk\\n'
  printf 'package:/data/app/com.example/split_config.apk\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.inspectPackage({
        packageName: "com.example.app",
        userId: 0,
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      installed: true,
      paths: ["/data/app/com.example/base.apk", "/data/app/com.example/split_config.apk"],
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell pm path --user 0 com.example.app"
    );
  });

  it("treats empty pm path output as an absent package instead of a command failure", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "path" ]; then
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.inspectPackage({
        packageName: "com.example.missing",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      installed: false,
      paths: [],
      exitCode: 1
    });
  });

  it("treats known package absence text from pm path as an absent package", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "path" ]; then
  printf 'Error: Unknown package: com.example.missing\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.inspectPackage({
        packageName: "com.example.missing",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      installed: false,
      paths: []
    });
  });

  it("does not treat target-state words in absent package names as adb target failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "path" ]; then
  printf 'Error: Unknown package: %s\\n' "$6" >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.inspectPackage({
        packageName: "com.example.offline",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      installed: false,
      paths: []
    });
    await expect(
      driver.inspectPackage({
        packageName: "com.example.unauthorized",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      installed: false,
      paths: []
    });
  });

  it("maps malformed pm path output to APP_INSPECT_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "path" ]; then
  printf 'Error: Unknown user: 99\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.inspectPackage({
        packageName: "com.example.app",
        userId: 99,
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_INSPECT_FAILED",
      retriable: false,
      details: {
        package_name: "com.example.app",
        user_id: 99,
        method: "pm_path",
        exit_code: 1,
        failure: "Error: Unknown user: 99"
      }
    });
  });

  it("maps pm path target failures before absence parsing", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
printf "adb: device offline\\n" >&2
exit 1
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.inspectPackage({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("rejects unsafe package names before pm path is called", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-app-inspect-unsafe-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
exit 0
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.inspectPackage({
        packageName: "bad;pkg",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      retriable: false
    });
    await expect(readFile(argsFile, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("reads current package PIDs with pidof", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-pidof-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "pidof" ]; then
  printf '1234 5678 1234\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getPackagePids({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      pids: [1234, 5678],
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain(
      "-s emulator-5554 shell pidof com.example.app"
    );
  });

  it("maps empty pidof output to APP_NOT_RUNNING", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pidof" ]; then
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getPackagePids({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_NOT_RUNNING",
      retriable: true,
      details: { package_name: "com.example.app", method: "pidof", exit_code: 1 }
    });
  });

  it("reads a package PID snapshot with pidof", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-pid-snapshot-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "pidof" ]; then
  printf '1234 5678 1234\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getPackagePidSnapshot({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      pids: [1234, 5678],
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain("-s emulator-5554 shell pidof com.example.app");
  });

  it("maps empty pidof snapshot output to a non-running package result", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pidof" ]; then
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getPackagePidSnapshot({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      pids: [],
      exitCode: 1,
      durationMs: expect.any(Number) as number
    });
  });

  it("maps malformed pidof snapshot output to APP_PIDS_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pidof" ]; then
  printf '1234 not-a-pid\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getPackagePidSnapshot({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_PIDS_FAILED",
      retriable: false,
      details: { package_name: "com.example.app", method: "pidof", invalid: ["not-a-pid"] }
    });
  });

  it("maps unavailable pidof snapshot support to APP_PIDS_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pidof" ]; then
  printf 'pidof: not found\\n' >&2
  exit 127
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getPackagePidSnapshot({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_PIDS_FAILED",
      retriable: false,
      details: { package_name: "com.example.app", method: "pidof", exit_code: 127 }
    });
  });

  it("maps successful pidof snapshot stderr to APP_PIDS_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pidof" ]; then
  printf '1234\\n'
  printf 'warning: noisy pidof\\n' >&2
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getPackagePidSnapshot({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_PIDS_FAILED",
      retriable: false,
      details: { package_name: "com.example.app", method: "pidof", stderr: "warning: noisy pidof\n" }
    });
  });

  it("maps missing pidof snapshot exit codes to APP_PIDS_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pidof" ]; then
  kill -TERM $$
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getPackagePidSnapshot({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_PIDS_FAILED",
      retriable: true,
      details: { package_name: "com.example.app", method: "pidof", signal: "SIGTERM" }
    });
  });

  it("classifies offline targets before pid snapshot failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "pidof" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getPackagePidSnapshot({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads app memory snapshots with dumpsys meminfo", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-meminfo-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "meminfo" ]; then
  cat <<'EOF'
${meminfoFixture()}
EOF
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppMemorySnapshot({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      running: true,
      processes: [{ pid: 1234, process_name: "com.example.app" }],
      memory: { totals: { total_pss_kb: 63_795, total_rss_kb: 173_308, total_swap_pss_kb: 10_643 } },
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    await expect(readFile(argsFile, "utf8")).resolves.toContain("-s emulator-5554 shell dumpsys meminfo com.example.app");
  });

  it("maps app memory no-process output to a non-running result", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "meminfo" ]; then
  printf 'No process found for: com.example.app\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppMemorySnapshot({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      running: false,
      processes: [],
      memory: { totals: { total_pss_kb: null, total_rss_kb: null, total_swap_pss_kb: null } },
      exitCode: 0
    });
  });

  it("maps malformed app memory output to APP_MEMORY_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "meminfo" ]; then
  printf '** MEMINFO in pid 1234 [com.example.app] **\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppMemorySnapshot({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_MEMORY_FAILED",
      retriable: false,
      details: { package_name: "com.example.app", method: "dumpsys_meminfo", exit_code: 0 }
    });
  });

  it("classifies offline targets before app memory failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "meminfo" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppMemorySnapshot({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });

  it("reads app graphics snapshots with dumpsys gfxinfo", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-adb-gfxinfo-"));
    const argsFile = join(dir, "args.txt");
    const adbPath = await createFakeAdb(`#!/bin/sh
printf '%s\\n' "$*" >> ${shellQuote(argsFile)}
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "gfxinfo" ]; then
  cat <<'EOF'
${gfxinfoFixture()}
EOF
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppGraphicsSnapshot({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      running: true,
      processes: [{ pid: 1234, process_name: "com.example.app" }],
      graphics: { total_frames_rendered: 6266, janky_frames: { count: 489, percent: 7.8 } },
      exitCode: 0,
      durationMs: expect.any(Number) as number
    });

    const args = await readFile(argsFile, "utf8");
    expect(args).toContain("-s emulator-5554 shell dumpsys gfxinfo com.example.app");
    expect(args).not.toContain("framestats");
    expect(args).not.toContain("reset");
  });

  it("maps app graphics no-process output to a non-running result", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "gfxinfo" ]; then
  printf 'No process found for: com.example.app\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppGraphicsSnapshot({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).resolves.toMatchObject({
      serial: "emulator-5554",
      running: false,
      processes: [],
      graphics: { stats_since_ns: null, total_frames_rendered: null, janky_frames: null },
      exitCode: 0
    });
  });

  it("maps malformed app graphics output to APP_GRAPHICS_FAILED", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "gfxinfo" ]; then
  printf '** Graphics info for pid 1234 [com.example.app] **\\n'
  exit 0
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppGraphicsSnapshot({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "APP_GRAPHICS_FAILED",
      retriable: false,
      details: { package_name: "com.example.app", method: "dumpsys_gfxinfo", exit_code: 0 }
    });
  });

  it("classifies offline targets before app graphics failures", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "-s" ] && [ "$4" = "dumpsys" ] && [ "$5" = "gfxinfo" ]; then
  printf 'error: device offline\\n' >&2
  exit 1
fi
exit 9
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.getAppGraphicsSnapshot({
        packageName: "com.example.app",
        deviceSerial: "emulator-5554",
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
      retriable: true
    });
  });
});
