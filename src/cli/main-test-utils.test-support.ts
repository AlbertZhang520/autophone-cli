import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type {
  AndroidDriver,
  DriverAppActivitiesResult,
  DriverAppGraphicsResult,
  DriverAppLinksResult,
  DriverAppOpsGetResult,
  DriverAppPackageInfoResult,
  DriverAppMemoryResult,
  DriverAppListResult,
  DriverDevice,
  DriverDeviceCurrentUserResult,
  DriverDeviceAccessibilityResult,
  DriverDeviceAnimationsResult,
  DriverDeviceAnimationsSetResult,
  DriverDeviceBatteryResult,
  DriverDeviceTimeResult,
  DriverDeviceBrightnessResult,
  DriverDeviceImeResult,
  DriverDeviceLocaleResult,
  DriverDeviceNetworkResult,
  DriverDeviceStorageResult,
  DriverDeviceNotificationsResult,
  DriverDeviceOrientationResult,
  DriverDeviceScreenResult,
  DriverDeviceUsersResult,
  DriverResolveUrlResult,
  DriverRingerGetResult,
  DriverUserRotationPolicy
} from "../core/index.js";
import { DEVICE_VOLUME_STREAMS } from "../core/index.js";
import { runCli } from "./main.js";
import { redactSensitiveError } from "./redaction.js";
import {
  AutophoneError,
  RUNTIME_VERSION,
  type AppCurrentResult,
  type DeviceDetailsResult,
  type DeviceReadyState,
  type Point,
  type Snapshot
} from "../contracts/index.js";

export type AppCurrentStateFixture = Omit<AppCurrentResult, "device_serial"> & {
  device_serial?: string;
};

export function appCurrentState(input?: AppCurrentStateFixture): AppCurrentResult {
  return {
    device_serial: "emulator-5554",
    package: "com.example",
    activity: "com.example.MainActivity",
    focused: true,
    ...input
  };
}

export function makeIo() {
  let stdout = "";
  let stderr = "";
  return {
    stdout: {
      write(value: string) {
        stdout += value;
        return true;
      }
    },
    stderr: {
      write(value: string) {
        stderr += value;
        return true;
      }
    },
    stdoutText: () => stdout,
    stderrText: () => stderr
  };
}
export function makeDriver(
  snapshots: Snapshot[],
  appStates: AppCurrentStateFixture[] = [],
  devices: DriverDevice[] = [],
  packageListResult: DriverAppListResult = { serial: "emulator-5554", packages: [] },
  details: DeviceDetailsResult = deviceDetailsFixture(),
  deviceUsersResult: DriverDeviceUsersResult = {
    serial: "emulator-5554",
    users: [{ id: 0, name: "Owner", flagsHex: "13", running: true }],
    exitCode: 0,
    durationMs: 1
  },
  currentUserResult: DriverDeviceCurrentUserResult = {
    serial: "emulator-5554",
    currentUserId: 0,
    exitCode: 0,
    durationMs: 1
  },
  orientationResult: DriverDeviceOrientationResult = orientationDriverResult()
): AndroidDriver & {
  listDevices: ReturnType<typeof vi.fn>;
  listUsers: ReturnType<typeof vi.fn>;
  getCurrentUser: ReturnType<typeof vi.fn>;
  getOrientation: ReturnType<typeof vi.fn>;
  getUserRotationPolicy: ReturnType<typeof vi.fn>;
  setUserRotation: ReturnType<typeof vi.fn>;
  getDeviceDetails: ReturnType<typeof vi.fn>;
  getDeviceScreenState: ReturnType<typeof vi.fn>;
  getDeviceNetworkState: ReturnType<typeof vi.fn>;
  getDeviceStorageState: ReturnType<typeof vi.fn>;
  getDeviceBatteryState: ReturnType<typeof vi.fn>;
  getDeviceTimeState: ReturnType<typeof vi.fn>;
  getDeviceLocaleState: ReturnType<typeof vi.fn>;
  getDeviceImeState: ReturnType<typeof vi.fn>;
  getDeviceBrightnessState: ReturnType<typeof vi.fn>;
  getDeviceAnimationsState: ReturnType<typeof vi.fn>;
  setDeviceAnimationScales: ReturnType<typeof vi.fn>;
  getDeviceAccessibilityState: ReturnType<typeof vi.fn>;
  getDeviceReadyState: ReturnType<typeof vi.fn>;
  wakeDevice: ReturnType<typeof vi.fn>;
  dismissKeyguard: ReturnType<typeof vi.fn>;
  controlStatusBar: ReturnType<typeof vi.fn>;
  getStatusBarIcons: ReturnType<typeof vi.fn>;
  getVolume: ReturnType<typeof vi.fn>;
  getRinger: ReturnType<typeof vi.fn>;
  getNotifications: ReturnType<typeof vi.fn>;
  listPackages: ReturnType<typeof vi.fn>;
  tap: ReturnType<typeof vi.fn>;
  doubleTap: ReturnType<typeof vi.fn>;
  keyEvent: ReturnType<typeof vi.fn>;
  textInput: ReturnType<typeof vi.fn>; clearText: ReturnType<typeof vi.fn>;
  getClipboard: ReturnType<typeof vi.fn>; setClipboard: ReturnType<typeof vi.fn>;
  swipe: ReturnType<typeof vi.fn>;
  drag: ReturnType<typeof vi.fn>;
  screenshot: ReturnType<typeof vi.fn>;
  recordScreen: ReturnType<typeof vi.fn>;
  pushFile: ReturnType<typeof vi.fn>;
  pullFile: ReturnType<typeof vi.fn>;
  removeFile: ReturnType<typeof vi.fn>;
  makeDirectory: ReturnType<typeof vi.fn>;
  moveFile: ReturnType<typeof vi.fn>;
  copyFile: ReturnType<typeof vi.fn>;
  listDirectory: ReturnType<typeof vi.fn>;
  hashFile: ReturnType<typeof vi.fn>;
  statFile: ReturnType<typeof vi.fn>;
  startActivity: ReturnType<typeof vi.fn>;
  launchPackage: ReturnType<typeof vi.fn>;
  clearPackageData: ReturnType<typeof vi.fn>;
  installApk: ReturnType<typeof vi.fn>;
  inspectPackage: ReturnType<typeof vi.fn>;
  setAppPermission: ReturnType<typeof vi.fn>;
  inspectAppPermission: ReturnType<typeof vi.fn>;
  uninstallPackage: ReturnType<typeof vi.fn>;
  getAppActivities: ReturnType<typeof vi.fn>;
  getAppPackageInfo: ReturnType<typeof vi.fn>;
  getAppLinks: ReturnType<typeof vi.fn>;
  getAppOps: ReturnType<typeof vi.fn>;
  getPackagePids: ReturnType<typeof vi.fn>;
  getPackagePidSnapshot: ReturnType<typeof vi.fn>;
  getAppMemorySnapshot: ReturnType<typeof vi.fn>;
  getAppGraphicsSnapshot: ReturnType<typeof vi.fn>;
  dumpLogcat: ReturnType<typeof vi.fn>;
  openUrl: ReturnType<typeof vi.fn>;
  resolveUrl: ReturnType<typeof vi.fn>;
  stopPackage: ReturnType<typeof vi.fn>;
} {
  return {
    listDevices: vi.fn(async () => devices),
    listUsers: vi.fn(async () => deviceUsersResult),
    getCurrentUser: vi.fn(async () => currentUserResult),
    getOrientation: vi.fn(async () => orientationResult),
    getUserRotationPolicy: vi.fn(async () => userRotationPolicy()),
    setUserRotation: vi.fn(async () => ({ exitCode: 0, durationMs: 1 })),
    getDeviceDetails: vi.fn(async () => details),
    getDeviceScreenState: vi.fn(async () => screenDriverResult()),
    getDeviceNetworkState: vi.fn(async () => networkDriverResult()),
    getDeviceStorageState: vi.fn(async () => storageDriverResult()),
    getDeviceBatteryState: vi.fn(async () => batteryDriverResult()),
    getDeviceTimeState: vi.fn(async () => timeDriverResult()),
    getDeviceLocaleState: vi.fn(async () => localeDriverResult()),
    getDeviceImeState: vi.fn(async () => imeDriverResult()),
    getDeviceBrightnessState: vi.fn(async () => brightnessDriverResult()),
    getDeviceAnimationsState: vi.fn(async () => animationsDriverResult()),
    setDeviceAnimationScales: vi.fn(async () => animationsSetDriverResult()),
    getDeviceAccessibilityState: vi.fn(async () => accessibilityDriverResult()),
    getDeviceReadyState: vi.fn(async () => readyState()),
    wakeDevice: vi.fn(async () => ({ exitCode: 0, durationMs: 1 })),
    dismissKeyguard: vi.fn(async () => ({ exitCode: 0, durationMs: 1 })),
    controlStatusBar: vi.fn(async (command) => ({ serial: "emulator-5554", command, exitCode: 0, durationMs: 1 })),
    getStatusBarIcons: vi.fn(async () => ({ serial: "emulator-5554", icons: ["wifi", "battery"], exitCode: 0, durationMs: 1 })),
    getVolume: vi.fn(async () => ({
      serial: "emulator-5554",
      stream: DEVICE_VOLUME_STREAMS.music,
      volume: { index: 0, min: 0, max: 15 },
      exitCode: 0,
      durationMs: 1
    })),
    getRinger: vi.fn(async () => ringerDriverResult()),
    getNotifications: vi.fn(async () => notificationsDriverResult()),
    listPackages: vi.fn(async () => packageListResult),
    observe: vi.fn(async () => {
      const next = snapshots.shift();
      if (next === undefined) {
        throw new Error("missing snapshot");
      }
      return next;
    }),
    tap: vi.fn(async (_point: Point) => undefined),
    doubleTap: vi.fn(async (_point: Point, _intervalMs: number) => undefined),
    keyEvent: vi.fn(async (_keyCode: string) => undefined),
    textInput: vi.fn(async (_encodedText: string) => undefined),
    clearText: vi.fn(async (_maxChars: number) => undefined),
    getClipboard: vi.fn(async () => ({ serial: "emulator-5554", present: true, text: "hello", exitCode: 0, durationMs: 1 })), setClipboard: vi.fn(async () => ({ serial: "emulator-5554", exitCode: 0, durationMs: 1 })),
    swipe: vi.fn(async (_start: Point, _end: Point, _durationMs: number) => undefined),
    drag: vi.fn(async (_start: Point, _end: Point, _durationMs: number) => undefined),
    screenshot: vi.fn(async () => ({ serial: "emulator-5554", png: pngFixture(), durationMs: 1 })),
    recordScreen: vi.fn(async (request) => ({ serial: request.deviceSerial, remotePath: request.remotePath, exitCode: 0, durationMs: 1 })),
    pushFile: vi.fn(async () => ({ serial: "emulator-5554", exitCode: 0, durationMs: 1 })),
    pullFile: vi.fn(async (request) => {
      await writeFile(request.localPath, "pulled bytes");
      return { serial: "emulator-5554", exitCode: 0, durationMs: 1 };
    }),
    removeFile: vi.fn(async () => ({ serial: "emulator-5554", exitCode: 0, durationMs: 1 })),
    makeDirectory: vi.fn(async () => ({ serial: "emulator-5554", exitCode: 0, durationMs: 1 })),
    moveFile: vi.fn(async () => ({ serial: "emulator-5554", exitCode: 0, durationMs: 1 })),
    copyFile: vi.fn(async () => ({ serial: "emulator-5554", exitCode: 0, durationMs: 1 })),
    listDirectory: vi.fn(async () => ({ serial: "emulator-5554", entries: [], truncated: false, exitCode: 0, durationMs: 1 })),
    hashFile: vi.fn(async () => ({
      serial: "emulator-5554",
      algorithm: "sha256" as const,
      digest: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      exitCode: 0,
      durationMs: 1
    })),
    statFile: vi.fn(async () => ({
      serial: "emulator-5554",
      exists: true,
      entry: { kind: "regular_file" as const, bytes: 12, modifiedUnixMs: 1_782_751_000_000 },
      exitCode: 0,
      durationMs: 1
    })),
    currentApp: vi.fn(async () => {
      return appCurrentState(appStates.shift());
    }),
    startActivity: vi.fn(async () => ({ status: "ok", activity: "com.example/.LauncherActivity", exitCode: 0, durationMs: 1 })),
    launchPackage: vi.fn(async () => ({ exitCode: 0, durationMs: 1 })),
    clearPackageData: vi.fn(async () => ({ exitCode: 0, durationMs: 1 })),
    installApk: vi.fn(async () => ({ exitCode: 0, durationMs: 1 })),
    inspectPackage: vi.fn(async () => ({
      serial: "emulator-5554",
      installed: false,
      paths: [],
      exitCode: 1,
      durationMs: 1
    })),
    setAppPermission: vi.fn(async () => ({ exitCode: 0, durationMs: 1 })),
    inspectAppPermission: vi.fn(async () => ({
      serial: "emulator-5554",
      packageFound: true,
      targetSdk: 35,
      manifestRequested: true,
      availableUserIds: [0],
      install: { present: false, granted: null, flags: [] },
      runtime: {
        selectedUserId: 0,
        userPresent: true,
        present: true,
        granted: false,
        flags: ["USER_SET"]
      },
      state: "denied" as const,
      granted: false,
      source: "runtime" as const,
      exitCode: 0,
      durationMs: 1
    })),
    uninstallPackage: vi.fn(async () => ({ exitCode: 0, durationMs: 1 })),
    getAppActivities: vi.fn(async () => appActivitiesDriverResult()),
    getAppPackageInfo: vi.fn(async () => packageInfoDriverResult()),
    getAppLinks: vi.fn(async () => appLinksDriverResult()),
    getAppOps: vi.fn(async () => appOpsDriverResult()),
    getPackagePids: vi.fn(async () => ({ serial: "emulator-5554", pids: [1234], durationMs: 1 })),
    getPackagePidSnapshot: vi.fn(async () => ({ serial: "emulator-5554", pids: [1234], exitCode: 0, durationMs: 1 })),
    getAppMemorySnapshot: vi.fn(async () => memoryDriverResult()),
    getAppGraphicsSnapshot: vi.fn(async () => graphicsDriverResult()),
    dumpLogcat: vi.fn(async (request: { pid: number }) => ({
      pid: request.pid,
      lines: ["06-29 12:00:00.000  1234  1234 I Example: hello"],
      exitCode: 0,
      durationMs: 1
    })),
    openUrl: vi.fn(async () => ({ status: "ok", activity: "com.browser/.MainActivity", exitCode: 0, durationMs: 1 })),
    resolveUrl: vi.fn(async () => resolveUrlDriverResult()),
    stopPackage: vi.fn(async () => ({ exitCode: 0, durationMs: 1 }))
  };
}

export function resolveUrlDriverResult(overrides: Partial<DriverResolveUrlResult> = {}): DriverResolveUrlResult {
  return {
    serial: "emulator-5554",
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
    },
    exitCode: 0,
    durationMs: 1,
    ...overrides
  };
}

export function packageInfoDriverResult(overrides: Partial<DriverAppPackageInfoResult> = {}): DriverAppPackageInfoResult {
  return {
    serial: "emulator-5554",
    installed: true,
    packageInfo: packageInfoRecord(),
    exitCode: 0,
    durationMs: 5,
    ...overrides
  };
}

export function appLinksDriverResult(overrides: Partial<DriverAppLinksResult> = {}): DriverAppLinksResult {
  return {
    serial: "emulator-5554",
    packageFound: true,
    domains: [{ domain: "example.com", state: { raw: "verified", kind: "known", code: null } }],
    exitCode: 0,
    durationMs: 5,
    ...overrides
  };
}

export function appOpsDriverResult(overrides: Partial<DriverAppOpsGetResult> = {}): DriverAppOpsGetResult {
  return {
    serial: "emulator-5554",
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
        details: { time_raw: "+1h ago", reject_time_raw: null, duration_raw: "+2s" }
      }
    ],
    exitCode: 0,
    durationMs: 5,
    ...overrides
  };
}

export function appActivitiesDriverResult(overrides: Partial<DriverAppActivitiesResult> = {}): DriverAppActivitiesResult {
  return {
    serial: "emulator-5554",
    activities: [appActivityRecord()],
    exitCode: 0,
    durationMs: 5,
    ...overrides
  };
}

export function appActivityRecord(overrides: Partial<DriverAppActivitiesResult["activities"][number]> = {}): DriverAppActivitiesResult["activities"][number] {
  return {
    component: "com.example.app/.MainActivity",
    package_name: "com.example.app",
    activity: "com.example.app.MainActivity",
    relative_activity: ".MainActivity",
    ...overrides
  };
}

export function packageInfoRecord(
  overrides: Partial<NonNullable<DriverAppPackageInfoResult["packageInfo"]>> = {}
): NonNullable<DriverAppPackageInfoResult["packageInfo"]> {
  return {
    package_name: "com.example.app",
    app_id: 10134,
    code_path: "/data/app/~~hash/com.example.app-base",
    resource_path: "/data/app/~~hash/com.example.app-base",
    native_library_dir: "/data/app/~~hash/com.example.app-base/lib/arm64",
    primary_cpu_abi: "arm64-v8a",
    secondary_cpu_abi: null,
    cpu_abi_override: null,
    version: { code: 42, min_sdk: 23, target_sdk: 35, name: "1.2.3" },
    splits: ["base"],
    flags: ["HAS_CODE", "ALLOW_CLEAR_USER_DATA"],
    private_flags: ["PRIVATE_FLAG_ACTIVITIES_RESIZE_MODE_RESIZEABLE"],
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
    apex_module_name: null,
    ...overrides
  };
}

export function memoryDriverResult(overrides: Partial<DriverAppMemoryResult> = {}): DriverAppMemoryResult {
  return {
    serial: "emulator-5554",
    running: true,
    processes: [{ pid: 1234, process_name: "com.example.app" }],
    memory: memorySnapshot(),
    exitCode: 0,
    durationMs: 5,
    ...overrides
  };
}

export function memorySnapshot(): DriverAppMemoryResult["memory"] {
  return {
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
  };
}

export function emptyMemorySnapshot(): DriverAppMemoryResult["memory"] {
  const emptyMetric = { pss_kb: null, rss_kb: null };
  return {
    units: "kb",
    totals: {
      total_pss_kb: null,
      total_rss_kb: null,
      total_swap_pss_kb: null
    },
    app_summary: {
      java_heap: { ...emptyMetric },
      native_heap: { ...emptyMetric },
      code: { ...emptyMetric },
      stack: { ...emptyMetric },
      graphics: { ...emptyMetric },
      private_other: { ...emptyMetric },
      system: { ...emptyMetric },
      unknown: { ...emptyMetric }
    }
  };
}

export function graphicsDriverResult(overrides: Partial<DriverAppGraphicsResult> = {}): DriverAppGraphicsResult {
  return {
    serial: "emulator-5554",
    running: true,
    processes: [{ pid: 1234, process_name: "com.example.app" }],
    graphics: graphicsSummary(),
    exitCode: 0,
    durationMs: 5,
    ...overrides
  };
}

export function graphicsSummary(): DriverAppGraphicsResult["graphics"] {
  return {
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
        { bucket_ms: 6, count: 458 }
      ],
      bucket_count: 2,
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
  };
}

export function emptyGraphicsSummary(): DriverAppGraphicsResult["graphics"] {
  return {
    stats_since_ns: null,
    total_frames_rendered: null,
    janky_frames: null,
    janky_frames_legacy: null,
    percentiles_ms: null,
    slow_counts: {
      missed_vsync: null,
      high_input_latency: null,
      slow_ui_thread: null,
      slow_bitmap_uploads: null,
      slow_issue_draw_commands: null
    },
    frame_deadline_missed: null,
    frame_deadline_missed_legacy: null,
    histogram: null,
    gpu: null
  };
}

export function readyState(overrides: Partial<DeviceReadyState> = {}): DeviceReadyState {
  return {
    device_serial: "emulator-5554",
    awake: true,
    interactive: true,
    wakefulness: "Awake",
    display_power_state: "ON",
    keyguard_showing: false,
    keyguard_secure: false,
    ...overrides
  };
}

export function screenDriverResult(overrides: Partial<DriverDeviceScreenResult> = {}): DriverDeviceScreenResult {
  return {
    serial: "emulator-5554",
    state: readyState(),
    queries: {
      power: { exitCode: 0, durationMs: 1 },
      window: { exitCode: 0, durationMs: 1 }
    },
    ...overrides
  };
}

export function networkDriverResult(overrides: Partial<DriverDeviceNetworkResult> = {}): DriverDeviceNetworkResult {
  return {
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
      airplaneMode: { exitCode: 0, durationMs: 1 },
      wifi: { exitCode: 0, durationMs: 1 },
      mobileData: { exitCode: 0, durationMs: 1 },
      connectivity: { exitCode: 0, durationMs: 1 }
    },
    ...overrides
  };
}

export function storageDriverResult(overrides: Partial<DriverDeviceStorageResult> = {}): DriverDeviceStorageResult {
  return {
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
    durationMs: 1,
    ...overrides
  };
}

export function batteryDriverResult(overrides: Partial<DriverDeviceBatteryResult> = {}): DriverDeviceBatteryResult {
  return {
    serial: "emulator-5554",
    battery: {
      level_percent: 88,
      scale: 100,
      status: "charging",
      plugged: "usb",
      temperature_celsius: 25,
      health: "good",
      present: true,
      voltage_mv: 4200,
      technology: "Li-ion",
      charge_counter_uah: 3_000_000
    },
    exitCode: 0,
    durationMs: 1,
    ...overrides
  };
}

export function timeDriverResult(overrides: Partial<DriverDeviceTimeResult> = {}): DriverDeviceTimeResult {
  return {
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
      date: { exitCode: 0, durationMs: 1 },
      autoTime: { exitCode: 0, durationMs: 1 },
      autoTimeZone: { exitCode: 0, durationMs: 1 },
      settingsTimeZone: { exitCode: 0, durationMs: 1 },
      persistSysTimeZone: { exitCode: 0, durationMs: 1 }
    },
    ...overrides
  };
}

export function localeDriverResult(overrides: Partial<DriverDeviceLocaleResult> = {}): DriverDeviceLocaleResult {
  return {
    serial: "emulator-5554",
    sources: {
      system_locales: "zh-CN",
      persist_sys_locale: "zh-CN",
      ro_product_locale: "zh-CN",
      ro_product_locale_language: null,
      ro_product_locale_region: null
    },
    queries: {
      systemLocales: { exitCode: 0, durationMs: 1 },
      persistSysLocale: { exitCode: 0, durationMs: 1 },
      roProductLocale: { exitCode: 0, durationMs: 1 },
      roProductLocaleLanguage: { exitCode: 0, durationMs: 1 },
      roProductLocaleRegion: { exitCode: 0, durationMs: 1 }
    },
    ...overrides
  };
}

export function imeDriverResult(overrides: Partial<DriverDeviceImeResult> = {}): DriverDeviceImeResult {
  return {
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
      inputMethod: { exitCode: 0, durationMs: 1 },
      defaultInputMethod: { exitCode: 0, durationMs: 1 },
      enabledInputMethods: { exitCode: 0, durationMs: 1 }
    },
    ...overrides
  };
}

export function brightnessDriverResult(overrides: Partial<DriverDeviceBrightnessResult> = {}): DriverDeviceBrightnessResult {
  return {
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
      brightness: { exitCode: 0, durationMs: 1 },
      mode: { exitCode: 0, durationMs: 1 },
      autoAdjustment: { exitCode: 0, durationMs: 1 },
      brightnessFloat: { exitCode: 0, durationMs: 1 },
      display: { exitCode: 0, durationMs: 1 }
    },
    ...overrides
  };
}

export function animationsDriverResult(overrides: Partial<DriverDeviceAnimationsResult> = {}): DriverDeviceAnimationsResult {
  return {
    serial: "emulator-5554",
    settings: {
      window_animation_scale: { raw: "1.0", value: 1 },
      transition_animation_scale: { raw: "1.0", value: 1 },
      animator_duration_scale: { raw: "1.0", value: 1 }
    },
    queries: {
      window: { exitCode: 0, durationMs: 1 },
      transition: { exitCode: 0, durationMs: 1 },
      animator: { exitCode: 0, durationMs: 1 }
    },
    ...overrides
  };
}

export function animationsSetDriverResult(
  overrides: Partial<DriverDeviceAnimationsSetResult> = {}
): DriverDeviceAnimationsSetResult {
  return {
    serial: "emulator-5554",
    scale: 1,
    commands: {
      window: { exitCode: 0, durationMs: 1 },
      transition: { exitCode: 0, durationMs: 1 },
      animator: { exitCode: 0, durationMs: 1 }
    },
    ...overrides
  };
}

export function accessibilityDriverResult(overrides: Partial<DriverDeviceAccessibilityResult> = {}): DriverDeviceAccessibilityResult {
  return {
    serial: "emulator-5554",
    settings: {
      accessibility_enabled: { raw: "0", value: false },
      touch_exploration_enabled: { raw: "0", value: false },
      enabled_accessibility_services: { raw: "", services: [], count: 0 }
    },
    queries: {
      accessibilityEnabled: { exitCode: 0, durationMs: 1 },
      touchExplorationEnabled: { exitCode: 0, durationMs: 1 },
      enabledAccessibilityServices: { exitCode: 0, durationMs: 1 }
    },
    ...overrides
  };
}

export function pngFixture(extra: readonly number[] = []): Buffer {
  const buffer = Buffer.alloc(33 + extra.length);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(2, 16);
  buffer.writeUInt32BE(3, 20);
  buffer[24] = 8;
  buffer[25] = 6;
  buffer.set(extra, 33);
  return buffer;
}

export function deviceDetailsFixture(): DeviceDetailsResult {
  return {
    device_serial: "emulator-5554",
    android: {
      release: "15",
      sdk: 35,
      codename: "REL"
    },
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
      override_size: null,
      physical_density: 420,
      override_density: null
    },
    battery: {
      level_percent: 88,
      scale: 100,
      status: "charging",
      plugged: "usb",
      temperature_celsius: 25
    },
    properties: {
      "ro.build.version.release": "15",
      "ro.build.version.sdk": "35"
    }
  };
}

export function orientationDriverResult(overrides: Partial<DriverDeviceOrientationResult> = {}): DriverDeviceOrientationResult {
  return {
    serial: "emulator-5554",
    windowSize: [1080, 2400],
    orientation: "landscape",
    rotationDegrees: 90,
    autoRotate: true,
    queries: {
      windowSize: { exitCode: 0, durationMs: 2 },
      rotation: { exitCode: 0, durationMs: 3 },
      autoRotate: { exitCode: 0, durationMs: 1 }
    },
    ...overrides
  };
}

export function ringerDriverResult(overrides: Partial<DriverRingerGetResult> = {}): DriverRingerGetResult {
  return {
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
    durationMs: 1,
    ...overrides
  };
}

export function notificationsDriverResult(
  overrides: Partial<DriverDeviceNotificationsResult> = {}
): DriverDeviceNotificationsResult {
  return {
    serial: "emulator-5554",
    notifications: [
      {
        key: "0|com.example.app|42|null|10001",
        package_name: "com.example.app",
        user_id: 0,
        notification_id: 42,
        tag: null,
        channel_id: "messages",
        importance: 4,
        group_key: "messages",
        category: "msg",
        visibility: "private",
        flags: ["AUTO_CANCEL"],
        title: "Alice",
        text: "Code 123456",
        sub_text: null,
        big_text: "Use code 123456 to continue"
      }
    ],
    exitCode: 0,
    durationMs: 1,
    ...overrides
  };
}

export function userRotationPolicy(overrides: Partial<DriverUserRotationPolicy> = {}): DriverUserRotationPolicy {
  return {
    mode: "lock",
    rotationDegrees: 0,
    exitCode: 0,
    durationMs: 1,
    ...overrides
  };
}

export function snapshot(hash: string, ...texts: string[]): Snapshot {
  return {
    snapshot_id: `snap_${hash}`,
    created_at: "2026-06-28T00:00:00.000Z",
    device_serial: "emulator-5554",
    package: "com.example",
    activity: "com.example.MainActivity",
    window_size: [100, 100],
    orientation: "portrait",
    rotation_degrees: 0,
    auto_rotate: false,
    ui_hash: `sha256:${hash}`,
    elements: texts.map((text, index) => ({
      source_index: index,
      text,
      resource_id: `id/${index}`,
      content_desc: "",
      class_name: "android.widget.Button",
      package_name: "com.example",
      bounds: [10, index * 20 + 10, 20, index * 20 + 20],
      enabled: true,
      clickable: true,
      focused: false
    }))
  };
}
