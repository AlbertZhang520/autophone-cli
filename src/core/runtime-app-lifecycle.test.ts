import { describe, expect, it, vi } from "vitest";
import {
  AutophoneError,
  type AppCurrentResult,
  type DeviceDetailsResult,
  type DeviceReadyState,
  type Point,
  type Snapshot
} from "../contracts/index.js";
import {
  changeAppPermission,
  clearAppData,
  controlStatusBar,
  currentApp,
  currentDeviceUser,
  appActivities,
  appLinks,
  appOpsGet,
  appPackageInfo,
  appGraphics,
  appMemory,
  appPids,
  DEVICE_VOLUME_STREAMS,
  deviceDetails,
  deviceOrientation,
  doubleTap,
  drag,
  dumpLogs,
  encodeTextForAdbInput,
  ensureDeviceReady,
  find,
  getDeviceAccessibility,
  getDeviceAnimations,
  getDeviceBattery,
  getDeviceTime,
  getDeviceBrightness,
  getDeviceIme,
  getDeviceLocale,
  getDeviceNotifications,
  getDeviceRinger,
  getDeviceNetwork,
  getDeviceScreen,
  getDeviceStorage,
  getDeviceVolume,
  installApp,
  inspectApp,
  inspectAppPermission,
  keyPress,
  listDeviceUsers,
  listDevices,
  listApps,
  launchApp,
  longPress,
  openUrl,
  planScrollGesture,
  resolveUrl,
  screenshot,
  scroll,
  scrollUntil,
  setDeviceAnimations,
  setDeviceOrientation,
  startApp,
  statusBarIcons,
  stopApp,
  tap,
  textClear,
  textInput,
  uninstallApp,
  waitForApp,
  waitForUi,
  type AndroidDriver,
  type DriverAppActivitiesResult,
  type DriverAppListResult,
  type DriverAppGraphicsResult,
  type DriverAppLinksResult,
  type DriverAppOpsGetResult,
  type DriverAppPackageInfoResult,
  type DriverAppMemoryResult,
  type DriverPackagePidSnapshotResult,
  type DriverDeviceCurrentUserResult,
  type DriverDeviceAccessibilityResult,
  type DriverDeviceAnimationsResult,
  type DriverDeviceAnimationsSetResult,
  type DriverDeviceBatteryResult,
  type DriverDeviceTimeResult,
  type DriverDeviceBrightnessResult,
  type DriverDeviceImeResult,
  type DriverDeviceLocaleResult,
  type DriverDeviceNetworkResult,
  type DriverDeviceStorageResult,
  type DriverDeviceNotificationsResult,
  type DriverDeviceOrientationResult,
  type DriverDeviceScreenResult,
  type DriverDeviceUsersResult,
  type DriverResolveUrlResult,
  type DriverRingerGetResult,
  type DriverUserRotationPolicy,
  type DriverDevice,
  type DriverAppStartResult,
  type ObserveOptions
} from "./runtime.js";
import { buildFilePullResult, copyFile, hashFile, listFiles, makeDirectory, moveFile, pullFile, pushFile, removeFile, statFile } from "./files.js";
import { buildScreenrecordResult, screenrecord } from "./screenrecord.js";
import {
  accessibilityDriverResult,
  animationsDriverResult,
  animationsSetDriverResult,
  appActivitiesDriverResult,
  appActivityRecord,
  appCurrentState,
  appLinksDriverResult,
  appOpsDriverResult,
  batteryDriverResult,
  brightnessDriverResult,
  delay,
  deviceDetailsFixture,
  emptyGraphicsSummary,
  emptyMemorySnapshot,
  graphicsDriverResult,
  graphicsSummary,
  imeDriverResult,
  localeDriverResult,
  makeDriver,
  memoryDriverResult,
  memorySnapshot,
  networkDriverResult,
  notificationsDriverResult,
  orientationDriverResult,
  packageInfoDriverResult,
  packageInfoRecord,
  permissionInspectDriverResult,
  pngFixture,
  readyState,
  resolveUrlDriverResult,
  ringerDriverResult,
  screenDriverResult,
  snapshot,
  storageDriverResult,
  timeDriverResult,
  userRotationPolicy
} from "./runtime-test-utils.test-support.js";

describe("logs dump runtime", () => {
  it("dumps bounded logcat lines for each current package PID", async () => {
    const driver = makeDriver([]);
    driver.getPackagePids.mockResolvedValueOnce({ serial: "emulator-5554", pids: [1234, 5678], durationMs: 3 });
    driver.dumpLogcat
      .mockResolvedValueOnce({
        pid: 1234,
        lines: ["06-29 12:00:00.000  1234  1234 I Example: main"],
        exitCode: 0,
        durationMs: 4
      })
      .mockResolvedValueOnce({
        pid: 5678,
        lines: ["06-29 12:00:00.001  5678  5678 W Example: remote"],
        exitCode: 0,
        durationMs: 5
      });

    await expect(
      dumpLogs(driver, {
        package_name: "com.example.app",
        lines: 25,
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).resolves.toMatchObject({
      device_serial: "emulator-5554",
      requested: { package_name: "com.example.app" },
      pid_selection: {
        method: "pidof",
        all_pids: [1234, 5678],
        dumped_pids: [1234, 5678],
        truncated: false
      },
      dump: {
        method: "logcat_pid_tail",
        format: "threadtime",
        buffers: ["main", "system", "crash"],
        per_pid_line_limit: 25,
        command_count: 3,
        command_duration_ms: 12
      },
      processes: [
        {
          pid: 1234,
          line_count: 1,
          lines: ["06-29 12:00:00.000  1234  1234 I Example: main"],
          truncated: { lines: false, chars: false, line_chars: false }
        },
        {
          pid: 5678,
          line_count: 1,
          lines: ["06-29 12:00:00.001  5678  5678 W Example: remote"],
          truncated: { lines: false, chars: false, line_chars: false }
        }
      ],
      line_count: 2,
      truncated: { processes: false, lines: false, chars: false, line_chars: false }
    });
    expect(driver.getPackagePids).toHaveBeenCalledWith({
      packageName: "com.example.app",
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
    expect(driver.dumpLogcat).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      pid: 1234,
      lines: 25,
      buffers: ["main", "system", "crash"],
      timeoutMs: expect.any(Number) as number
    });
  });

  it("caps very long log lines before returning JSON", async () => {
    const driver = makeDriver([]);
    driver.getPackagePids.mockResolvedValueOnce({ serial: "emulator-5554", pids: [1234], durationMs: 1 });
    driver.dumpLogcat.mockResolvedValueOnce({
      pid: 1234,
      lines: [`06-29 12:00:00.000  1234  1234 I Example: ${"x".repeat(3000)}`],
      exitCode: 0,
      durationMs: 1
    });

    const result = await dumpLogs(driver, {
      package_name: "com.example.app",
      lines: 1,
      timeout_ms: 1000
    });

    expect(result.processes[0]!.lines[0]!.length).toBe(2000);
    expect(result.processes[0]!.truncated).toMatchObject({ line_chars: true });
    expect(result.truncated).toMatchObject({ line_chars: true });
  });

  it("caps the shared total log character budget across processes", async () => {
    const driver = makeDriver([]);
    driver.getPackagePids.mockResolvedValueOnce({ serial: "emulator-5554", pids: [1234, 5678], durationMs: 1 });
    driver.dumpLogcat
      .mockResolvedValueOnce({
        pid: 1234,
        lines: Array.from({ length: 100 }, () => "x".repeat(2000)),
        exitCode: 0,
        durationMs: 1
      })
      .mockResolvedValueOnce({
        pid: 5678,
        lines: ["second process line"],
        exitCode: 0,
        durationMs: 1
      });

    const result = await dumpLogs(driver, {
      package_name: "com.example.app",
      lines: 1000,
      timeout_ms: 1000
    });

    expect(result.processes[0]).toMatchObject({
      pid: 1234,
      line_count: 100,
      truncated: { lines: false, chars: false, line_chars: false }
    });
    expect(result.processes[1]).toMatchObject({
      pid: 5678,
      line_count: 0,
      truncated: { lines: true, chars: true }
    });
    expect(result.truncated).toMatchObject({ lines: true, chars: true });
  });

  it("caps the number of package PIDs dumped in one response", async () => {
    const driver = makeDriver([]);
    const pids = Array.from({ length: 17 }, (_value, index) => index + 1000);
    driver.getPackagePids.mockResolvedValueOnce({ serial: "emulator-5554", pids, durationMs: 1 });
    driver.dumpLogcat.mockImplementation(async (request: { pid: number }) => ({
      pid: request.pid,
      lines: [`line for ${request.pid}`],
      exitCode: 0,
      durationMs: 1
    }));

    const result = await dumpLogs(driver, {
      package_name: "com.example.app",
      lines: 1,
      timeout_ms: 1000
    });

    expect(driver.dumpLogcat).toHaveBeenCalledTimes(16);
    expect(result.pid_selection).toMatchObject({
      all_pids: pids,
      dumped_pids: pids.slice(0, 16),
      total_pid_count: 17,
      dumped_pid_count: 16,
      truncated: true
    });
    expect(result.truncated.processes).toBe(true);
  });
});

describe("app runtime", () => {
  it("returns current foreground app", async () => {
    const driver = makeDriver([], [{ package: "com.example", activity: "com.example.MainActivity", focused: true }]);

    await expect(currentApp(driver, { timeout_ms: 1000 })).resolves.toEqual({
      device_serial: "emulator-5554",
      package: "com.example",
      activity: "com.example.MainActivity",
      focused: true
    });
  });

  it("launches an app by package and verifies package foreground", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.other", activity: "com.other.HomeActivity", focused: true },
        { package: "com.example", activity: "com.example.MainActivity", focused: true }
      ]
    );

    await expect(
      launchApp(driver, {
        package_name: "com.example",
        verify: "package_foreground",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      requested: { package_name: "com.example" },
      before: { package: "com.other" },
      after: { package: "com.example" },
      launch: { method: "monkey", exit_code: 0, command_duration_ms: 1 },
      verify: { policy: "package_foreground", ok: true, attempts: 1 }
    });
    expect(driver.launchPackage).toHaveBeenCalledWith({
      packageName: "com.example",
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });

  it("treats already-foreground package launch as package_foreground success", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.example", activity: "com.example.MainActivity", focused: true },
        { package: "com.example", activity: "com.example.MainActivity", focused: true }
      ]
    );

    await expect(
      launchApp(driver, {
        package_name: "com.example",
        verify: "package_foreground",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      before: { package: "com.example" },
      after: { package: "com.example" },
      verify: {
        policy: "package_foreground",
        ok: true,
        attempts: 1,
        reason: "requested package was already foreground or remained foreground after launch"
      }
    });
  });

  it("launches an app without verification when requested", async () => {
    const driver = makeDriver(
      [],
      [{ package: "com.other", activity: "com.other.HomeActivity", focused: true }]
    );

    await expect(
      launchApp(driver, {
        package_name: "com.example",
        verify: "none",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      after: null,
      verify: { policy: "none", ok: true, attempts: 0 }
    });

    expect(driver.currentApp).toHaveBeenCalledTimes(1);
    expect(driver.launchPackage).toHaveBeenCalledTimes(1);
  });

  it("fails app launch verification when package never becomes foreground", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.other", activity: "com.other.HomeActivity", focused: true },
        { package: "com.other", activity: "com.other.HomeActivity", focused: true },
        { package: "com.other", activity: "com.other.HomeActivity", focused: true }
      ]
    );

    await expect(
      launchApp(driver, {
        package_name: "com.example",
        verify: "package_foreground",
        timeout_ms: 60
      })
    ).rejects.toMatchObject({ code: "VERIFY_FAILED", retriable: false, details: { package_name: "com.example" } });
  });

  it("resolves a URL handler without opening the URL", async () => {
    const driver = makeDriver([]);
    driver.resolveUrl.mockResolvedValueOnce(
      resolveUrlDriverResult({
        serial: "resolved-serial",
        durationMs: 5
      })
    );

    await expect(
      resolveUrl(driver, {
        url: "https://example.com/path?token=secret#section",
        timeout_ms: 1000,
        device_serial: "requested-serial"
      })
    ).resolves.toEqual({
      device_serial: "resolved-serial",
      requested: {
        scheme: "https",
        hostname: "example.com",
        port: null,
        path_present: true,
        query_present: true,
        fragment_present: true,
        url_length: 45
      },
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
      query: { method: "cmd_package_resolve_activity", exit_code: 0, command_duration_ms: 5 },
      verify: {
        policy: "package_manager_resolve_activity_parse",
        ok: true,
        attempts: 1,
        reason: "Package Manager resolved the ACTION_VIEW URL intent to a concrete activity component"
      },
      semantics: "read_only_url_intent_resolution_not_launchability_or_network_proof"
    });
    expect(driver.resolveUrl).toHaveBeenCalledWith({
      url: "https://example.com/path?token=secret#section",
      deviceSerial: "requested-serial",
      timeoutMs: 1000
    });
    expect(driver.openUrl).not.toHaveBeenCalled();
    expect(driver.currentApp).not.toHaveBeenCalled();
  });

  it("reports system chooser URL resolution distinctly from concrete app handlers", async () => {
    const driver = makeDriver([]);
    driver.resolveUrl.mockResolvedValueOnce(
      resolveUrlDriverResult({
        resolution: {
          type: "resolver",
          component: "android/com.android.internal.app.ResolverActivity",
          package: "android",
          activity: "com.android.internal.app.ResolverActivity",
          is_system_resolver: true
        },
        metadata: { priority: 0, preferred_order: 0, match: { raw: "0x208000", value: 2_129_920 }, specific_index: -1, is_default: false }
      })
    );

    await expect(resolveUrl(driver, { url: "https://example.com", timeout_ms: 1000 })).resolves.toMatchObject({
      resolution: { type: "resolver", is_system_resolver: true },
      verify: {
        reason: "Package Manager resolved the ACTION_VIEW URL intent to the Android system chooser, not a concrete app handler"
      }
    });
  });

  it("reports URL resolution absence as a parsed read-only success", async () => {
    const driver = makeDriver([]);
    driver.resolveUrl.mockResolvedValueOnce(
      resolveUrlDriverResult({
        resolution: {
          type: "none",
          component: null,
          package: null,
          activity: null,
          is_system_resolver: false
        },
        metadata: null
      })
    );

    await expect(resolveUrl(driver, { url: "https://example.com", timeout_ms: 1000 })).resolves.toMatchObject({
      resolution: { type: "none" },
      metadata: null,
      verify: { reason: "Package Manager reported no activity for the ACTION_VIEW URL intent" }
    });
  });

  it("opens an http URL through Android ACTION_VIEW without returning the full URL", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.launcher", activity: "com.launcher.HomeActivity", focused: true },
        { package: "com.browser", activity: "com.browser.MainActivity", focused: true }
      ]
    );
    driver.openUrl.mockResolvedValueOnce({
      status: "ok",
      activity: "com.browser/.MainActivity",
      exitCode: 0,
      durationMs: 14
    });

    await expect(
      openUrl(driver, {
        url: "https://example.com/path?token=secret#section",
        verify: "activity_manager_accepted",
        timeout_ms: 1000
      })
    ).resolves.toEqual({
      requested: {
        scheme: "https",
        hostname: "example.com",
        port: null,
        path_present: true,
        query_present: true,
        fragment_present: true,
        url_length: 45
      },
      before: { device_serial: "emulator-5554", package: "com.launcher", activity: "com.launcher.HomeActivity", focused: true },
      after: { device_serial: "emulator-5554", package: "com.browser", activity: "com.browser.MainActivity", focused: true },
      open: {
        method: "am_start_view",
        status: "ok",
        activity: "com.browser/.MainActivity",
        exit_code: 0,
        command_duration_ms: 14
      },
      verify: {
        policy: "activity_manager_accepted",
        ok: true,
        attempts: 1,
        reason: "Activity Manager accepted ACTION_VIEW intent; URL content load is not verified"
      }
    });
    expect(driver.openUrl).toHaveBeenCalledWith({
      url: "https://example.com/path?token=secret#section",
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });

  it("opens a URL without after-state observation when verification is disabled", async () => {
    const driver = makeDriver(
      [],
      [{ package: "com.launcher", activity: "com.launcher.HomeActivity", focused: true }]
    );

    await expect(
      openUrl(driver, {
        url: "http://example.com",
        verify: "none",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      requested: {
        scheme: "http",
        hostname: "example.com",
        path_present: false,
        query_present: false,
        fragment_present: false
      },
      after: null,
      verify: { policy: "none", ok: true, attempts: 0 }
    });

    expect(driver.currentApp).toHaveBeenCalledTimes(1);
    expect(driver.openUrl).toHaveBeenCalledTimes(1);
  });

  it("force-stops an app and verifies the package is no longer foreground", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.example", activity: "com.example.MainActivity", focused: true },
        { package: "com.launcher", activity: "com.launcher.HomeActivity", focused: true }
      ]
    );

    await expect(
      stopApp(driver, {
        package_name: "com.example",
        verify: "foreground_absent",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      requested: { package_name: "com.example" },
      before: { package: "com.example" },
      after: { package: "com.launcher" },
      stop: { method: "am_force_stop", exit_code: 0, command_duration_ms: 1 },
      verify: {
        policy: "foreground_absent",
        ok: true,
        attempts: 1,
        reason: "requested package is no longer foreground after force-stop"
      }
    });
    expect(driver.stopPackage).toHaveBeenCalledWith({
      packageName: "com.example",
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });

  it("retries app stop foreground_absent verification until the foreground package changes", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.example", activity: "com.example.MainActivity", focused: true },
        { package: "com.example", activity: "com.example.MainActivity", focused: true },
        { package: "com.launcher", activity: "com.launcher.HomeActivity", focused: true }
      ]
    );

    await expect(
      stopApp(driver, {
        package_name: "com.example",
        verify: "foreground_absent",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      after: { package: "com.launcher" },
      verify: { policy: "foreground_absent", ok: true, attempts: 2 }
    });
  });

  it("reports foreground absence honestly when target was already backgrounded", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.other", activity: "com.other.HomeActivity", focused: true },
        { package: "com.other", activity: "com.other.HomeActivity", focused: true }
      ]
    );

    await expect(
      stopApp(driver, {
        package_name: "com.example",
        verify: "foreground_absent",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      before: { package: "com.other" },
      after: { package: "com.other" },
      verify: {
        policy: "foreground_absent",
        ok: true,
        reason: "requested package was not foreground before or after force-stop; background process absence is not directly verified"
      }
    });
  });

  it("force-stops an app without verification when requested", async () => {
    const driver = makeDriver(
      [],
      [{ package: "com.example", activity: "com.example.MainActivity", focused: true }]
    );

    await expect(
      stopApp(driver, {
        package_name: "com.example",
        verify: "none",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      after: null,
      verify: { policy: "none", ok: true, attempts: 0 }
    });

    expect(driver.currentApp).toHaveBeenCalledTimes(1);
    expect(driver.stopPackage).toHaveBeenCalledTimes(1);
  });

  it("fails app stop verification when the package remains foreground", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.example", activity: "com.example.MainActivity", focused: true },
        { package: "com.example", activity: "com.example.MainActivity", focused: true },
        { package: "com.example", activity: "com.example.MainActivity", focused: true }
      ]
    );

    await expect(
      stopApp(driver, {
        package_name: "com.example",
        verify: "foreground_absent",
        timeout_ms: 60
      })
    ).rejects.toMatchObject({ code: "VERIFY_FAILED", retriable: false, details: { package_name: "com.example" } });
  });

  it("starts an app and accepts package foreground after trampoline activity", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.other", activity: "com.other.HomeActivity", focused: true },
        { package: "com.example", activity: "com.example.SplashActivity", focused: true }
      ],
      { status: "ok", activity: "com.example/.LauncherActivity", exitCode: 0, durationMs: 123 }
    );

    await expect(
      startApp(driver, {
        package_name: "com.example",
        activity: ".LauncherActivity",
        verify: "package_foreground",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      requested: {
        package_name: "com.example",
        activity: ".LauncherActivity",
        normalized_activity: "com.example.LauncherActivity",
        component: "com.example/com.example.LauncherActivity"
      },
      after: {
        package: "com.example",
        activity: "com.example.SplashActivity"
      },
      verify: {
        policy: "package_foreground",
        ok: true,
        attempts: 1
      }
    });
  });

  it("normalizes bare activity names before building the component", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.other", activity: "com.other.HomeActivity", focused: true },
        { package: "com.example", activity: "com.example.MainActivity", focused: true }
      ],
      { status: "ok", activity: "com.example/com.example.MainActivity", exitCode: 0, durationMs: 123 }
    );

    await expect(
      startApp(driver, {
        package_name: "com.example",
        activity: "MainActivity",
        verify: "package_foreground",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      requested: {
        normalized_activity: "com.example.MainActivity",
        component: "com.example/com.example.MainActivity"
      }
    });
    expect(driver.startActivity).toHaveBeenCalledWith({
      packageName: "com.example",
      activity: "com.example.MainActivity",
      component: "com.example/com.example.MainActivity",
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });

  it("fails app start verification when package never becomes foreground", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.other", activity: "com.other.HomeActivity", focused: true },
        { package: "com.other", activity: "com.other.HomeActivity", focused: true },
        { package: "com.other", activity: "com.other.HomeActivity", focused: true },
        { package: "com.other", activity: "com.other.HomeActivity", focused: true },
        { package: "com.other", activity: "com.other.HomeActivity", focused: true },
        { package: "com.other", activity: "com.other.HomeActivity", focused: true }
      ],
      { status: "ok", activity: "com.example/.MainActivity", exitCode: 0, durationMs: 123 }
    );

    await expect(
      startApp(driver, {
        package_name: "com.example",
        activity: ".MainActivity",
        verify: "package_foreground",
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "VERIFY_FAILED", retriable: false, details: { attempts: 5 } });
  });
});
