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

describe("wait runtime", () => {
  it("waits for UI candidates", async () => {
    const driver = makeDriver([snapshot("hash-a", "Loading"), snapshot("hash-b", "Ready")]);

    await expect(
      waitForUi(driver, {
        selector: { text: "Ready" },
        condition: "present",
        wait_timeout_ms: 200,
        interval_ms: 50,
        poll_timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      condition: { type: "ui", selector: { text: "Ready" }, mode: "present" },
      present: true,
      matched_nodes: 1,
      attempts: 2,
      snapshot_id: "snap_hash-b",
      device_serial: "emulator-5554",
      count: 1
    });
  });

  it("waits for a UI selector to become absent across all matching nodes", async () => {
    const driver = makeDriver([snapshot("hash-a", "Loading"), snapshot("hash-b", "Ready")]);

    await expect(
      waitForUi(driver, {
        selector: { text: "Loading" },
        condition: "absent",
        wait_timeout_ms: 200,
        interval_ms: 50,
        poll_timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      condition: { type: "ui", selector: { text: "Loading" }, mode: "absent" },
      present: false,
      matched_nodes: 0,
      attempts: 2,
      snapshot_id: "snap_hash-b",
      count: 0,
      candidates: []
    });
  });

  it("does not treat unusable matching UI nodes as absent", async () => {
    const unusable = {
      ...snapshot("hash-a"),
      elements: [
        {
          source_index: 0,
          text: "Loading",
          resource_id: "id/loading",
          content_desc: "",
          class_name: "android.widget.TextView",
          package_name: "com.example",
          bounds: null,
          enabled: true,
          clickable: false,
          focused: false
        }
      ]
    };
    const driver = makeDriver([unusable, unusable]);

    await expect(
      waitForUi(driver, {
        selector: { text: "Loading" },
        condition: "absent",
        wait_timeout_ms: 60,
        interval_ms: 50,
        poll_timeout_ms: 1000
      })
    ).rejects.toMatchObject({
      code: "WAIT_TIMEOUT",
      details: { condition: "ui", mode: "absent", selector: { text: "Loading" } }
    });
  });

  it("returns WAIT_TIMEOUT when UI condition is not met", async () => {
    const driver = makeDriver([snapshot("hash-a", "Loading"), snapshot("hash-a", "Loading")]);

    await expect(
      waitForUi(driver, {
        selector: { text: "Ready" },
        condition: "present",
        wait_timeout_ms: 60,
        interval_ms: 50,
        poll_timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "WAIT_TIMEOUT", retriable: true, details: { condition: "ui" } });

    const firstPollOptions = driver.observe.mock.calls[0]?.[0] as { timeoutMs?: number } | undefined;
    expect(firstPollOptions?.timeoutMs).toBeLessThanOrEqual(60);
  });

  it("propagates driver errors during wait instead of masking them as WAIT_TIMEOUT", async () => {
    const driver: AndroidDriver = {
      listDevices: vi.fn(async () => []),
      listUsers: vi.fn(async () => ({
        serial: "emulator-5554",
        users: [{ id: 0, name: "Owner", flagsHex: "13", running: true }],
        exitCode: 0,
        durationMs: 1
      })),
      getCurrentUser: vi.fn(async () => ({
        serial: "emulator-5554",
        currentUserId: 0,
        exitCode: 0,
        durationMs: 1
      })),
      getOrientation: vi.fn(async () => orientationDriverResult()),
      getUserRotationPolicy: vi.fn(async () => userRotationPolicy()),
      setUserRotation: vi.fn(async () => ({ exitCode: 0, durationMs: 1 })),
      getDeviceDetails: vi.fn(async () => deviceDetailsFixture()),
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
      listPackages: vi.fn(async () => ({ serial: "emulator-5554", packages: [] })),
      observe: vi.fn(async () => {
        throw new AutophoneError({ code: "NO_DEVICE", message: "no device", retriable: true });
      }),
      tap: vi.fn(async () => undefined),
      doubleTap: vi.fn(async () => undefined),
      keyEvent: vi.fn(async () => undefined),
      textInput: vi.fn(async () => undefined),
      clearText: vi.fn(async () => undefined),
      swipe: vi.fn(async () => undefined),
      drag: vi.fn(async () => undefined),
      screenshot: vi.fn(async () => ({ serial: "emulator-5554", png: pngFixture(), durationMs: 1 })),
      recordScreen: vi.fn(async (request) => ({ serial: request.deviceSerial, remotePath: request.remotePath, exitCode: 0, durationMs: 1 })),
     	      pushFile: vi.fn(async () => ({ serial: "emulator-5554", exitCode: 0, durationMs: 1 })),
	      pullFile: vi.fn(async () => ({ serial: "emulator-5554", exitCode: 0, durationMs: 1 })),
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
      currentApp: vi.fn(async () => appCurrentState({ package: "", activity: "", focused: false })),
      startActivity: vi.fn(async () => ({ exitCode: 0, durationMs: 0 })),
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
      inspectAppPermission: vi.fn(async () => permissionInspectDriverResult()),
      uninstallPackage: vi.fn(async () => ({ exitCode: 0, durationMs: 1 })),
  getAppActivities: vi.fn(async () => appActivitiesDriverResult()),
  getAppPackageInfo: vi.fn(async () => packageInfoDriverResult()),
  getAppLinks: vi.fn(async () => appLinksDriverResult()),
  getAppOps: vi.fn(async () => appOpsDriverResult()),
  getPackagePids: vi.fn(async () => ({ serial: "emulator-5554", pids: [1234], durationMs: 1 })),
      getPackagePidSnapshot: vi.fn(async () => ({ serial: "emulator-5554", pids: [1234], exitCode: 0, durationMs: 1 })),
      getAppMemorySnapshot: vi.fn(async () => memoryDriverResult()),
      getAppGraphicsSnapshot: vi.fn(async () => graphicsDriverResult()),
      dumpLogcat: vi.fn(async () => ({ pid: 1234, lines: [], exitCode: 0, durationMs: 1 })),
      openUrl: vi.fn(async () => ({ status: "ok", activity: "com.browser/.MainActivity", exitCode: 0, durationMs: 1 })),
      resolveUrl: vi.fn(async () => resolveUrlDriverResult()),
      stopPackage: vi.fn(async () => ({ exitCode: 0, durationMs: 1 }))
    };

    await expect(
      waitForUi(driver, {
        selector: { text: "Ready" },
        condition: "present",
        wait_timeout_ms: 100,
        interval_ms: 50,
        poll_timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "NO_DEVICE" });
  });

  it("maps wait-budget-capped UI dump timeouts to WAIT_TIMEOUT", async () => {
    const driver = makeDriver([]);
    driver.observe.mockImplementationOnce(async () => {
      await delay(20);
      throw new AutophoneError({ code: "DUMP_TIMEOUT", message: "adb command timed out", retriable: true });
    });

    await expect(
      waitForUi(driver, {
        selector: { text: "Ready" },
        condition: "present",
        wait_timeout_ms: 10,
        interval_ms: 50,
        poll_timeout_ms: 1000
      })
    ).rejects.toMatchObject({
      code: "WAIT_TIMEOUT",
      retriable: true,
      details: { condition: "ui", mode: "present", attempts: 1 }
    });

    expect(driver.observe).toHaveBeenCalledTimes(1);
    const timeoutMs = driver.observe.mock.calls[0]?.[0].timeoutMs;
    expect(timeoutMs).toBeGreaterThan(0);
    expect(timeoutMs).toBeLessThanOrEqual(10);
  });

  it("maps wait-budget-capped generic adb timeouts to WAIT_TIMEOUT", async () => {
    const driver = makeDriver([]);
    driver.observe.mockImplementationOnce(async () => {
      await delay(20);
      throw new AutophoneError({
        code: "ADB_ERROR",
        message: "adb command timed out",
        retriable: true,
        details: { signal: "SIGTERM" }
      });
    });

    await expect(
      waitForUi(driver, {
        selector: { text: "Ready" },
        condition: "present",
        wait_timeout_ms: 10,
        interval_ms: 50,
        poll_timeout_ms: 1000
      })
    ).rejects.toMatchObject({
      code: "WAIT_TIMEOUT",
      retriable: true,
      details: { condition: "ui", mode: "present", attempts: 1 }
    });

    expect(driver.observe).toHaveBeenCalledTimes(1);
    const timeoutMs = driver.observe.mock.calls[0]?.[0].timeoutMs;
    expect(timeoutMs).toBeGreaterThan(0);
    expect(timeoutMs).toBeLessThanOrEqual(10);
  });

  it("propagates budget-capped generic adb errors with non-timeout messages", async () => {
    const driver = makeDriver([]);
    driver.observe.mockImplementationOnce(async () => {
      await delay(5);
      throw new AutophoneError({
        code: "ADB_ERROR",
        message: "adb stdout exceeded max output size",
        retriable: true
      });
    });

    await expect(
      waitForUi(driver, {
        selector: { text: "Ready" },
        condition: "present",
        wait_timeout_ms: 1,
        interval_ms: 50,
        poll_timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "ADB_ERROR", message: "adb stdout exceeded max output size" });

    expect(driver.observe).toHaveBeenCalledTimes(1);
    const timeoutMs = driver.observe.mock.calls[0]?.[0].timeoutMs;
    expect(timeoutMs).toBeGreaterThanOrEqual(0);
    expect(timeoutMs).toBeLessThanOrEqual(1);
  });

  it("propagates genuine UI dump timeouts before the wait budget is exhausted", async () => {
    const driver = makeDriver([]);
    driver.observe.mockImplementationOnce(async () => {
      throw new AutophoneError({ code: "DUMP_TIMEOUT", message: "adb command timed out", retriable: true });
    });

    await expect(
      waitForUi(driver, {
        selector: { text: "Ready" },
        condition: "present",
        wait_timeout_ms: 1000,
        interval_ms: 50,
        poll_timeout_ms: 10
      })
    ).rejects.toMatchObject({ code: "DUMP_TIMEOUT", retriable: true });

    expect(driver.observe).toHaveBeenCalledTimes(1);
    expect(driver.observe.mock.calls[0]?.[0]).toMatchObject({ timeoutMs: 10 });
  });

  it("maps wait-budget-capped current app timeouts to WAIT_TIMEOUT", async () => {
    const driver = makeDriver([]);
    driver.currentApp.mockImplementationOnce(async () => {
      await delay(20);
      throw new AutophoneError({ code: "ACTION_TIMEOUT", message: "adb command timed out", retriable: true });
    });

    await expect(
      waitForApp(driver, {
        package_name: "com.example",
        wait_timeout_ms: 10,
        interval_ms: 50,
        poll_timeout_ms: 1000
      })
    ).rejects.toMatchObject({
      code: "WAIT_TIMEOUT",
      retriable: true,
      details: { condition: "app", package_name: "com.example", attempts: 1 }
    });

    expect(driver.currentApp).toHaveBeenCalledTimes(1);
    const pollOptions = driver.currentApp.mock.calls[0]?.[0] as { timeoutMs?: number } | undefined;
    expect(pollOptions?.timeoutMs).toBeGreaterThan(0);
    expect(pollOptions?.timeoutMs).toBeLessThanOrEqual(10);
  });

  it("propagates budget-capped generic current app errors with non-timeout messages", async () => {
    const driver = makeDriver([]);
    driver.currentApp.mockImplementationOnce(async () => {
      await delay(5);
      throw new AutophoneError({
        code: "ADB_ERROR",
        message: "adb stdout exceeded max output size",
        retriable: true
      });
    });

    await expect(
      waitForApp(driver, {
        package_name: "com.example",
        wait_timeout_ms: 50,
        interval_ms: 50,
        poll_timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "ADB_ERROR", message: "adb stdout exceeded max output size" });

    expect(driver.currentApp).toHaveBeenCalledTimes(1);
    const timeoutMs = driver.currentApp.mock.calls[0]?.[0].timeoutMs;
    expect(timeoutMs).toBeGreaterThan(0);
    expect(timeoutMs).toBeLessThanOrEqual(50);
  });

  it("propagates genuine current app timeouts before the wait budget is exhausted", async () => {
    const driver = makeDriver([]);
    driver.currentApp.mockImplementationOnce(async () => {
      throw new AutophoneError({ code: "ACTION_TIMEOUT", message: "adb command timed out", retriable: true });
    });

    await expect(
      waitForApp(driver, {
        package_name: "com.example",
        wait_timeout_ms: 1000,
        interval_ms: 50,
        poll_timeout_ms: 10
      })
    ).rejects.toMatchObject({ code: "ACTION_TIMEOUT", retriable: true });

    expect(driver.currentApp).toHaveBeenCalledTimes(1);
    expect(driver.currentApp.mock.calls[0]?.[0]).toMatchObject({ timeoutMs: 10 });
  });

  it("waits for foreground package without requiring exact activity", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.other", activity: "com.other.HomeActivity", focused: true },
        { package: "com.example", activity: "com.example.SplashActivity", focused: true }
      ]
    );

    await expect(
      waitForApp(driver, {
        package_name: "com.example",
        wait_timeout_ms: 200,
        interval_ms: 50,
        poll_timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      condition: { type: "app", package_name: "com.example" },
      attempts: 2,
      current: { package: "com.example", activity: "com.example.SplashActivity" }
    });
  });

  it("waits for exact activity only when requested", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.example", activity: "com.example.SplashActivity", focused: true },
        { package: "com.example", activity: "com.example.MainActivity", focused: true }
      ]
    );

    await expect(
      waitForApp(driver, {
        package_name: "com.example",
        activity: ".MainActivity",
        wait_timeout_ms: 200,
        interval_ms: 50,
        poll_timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      condition: { type: "app", package_name: "com.example", activity: "com.example.MainActivity" },
      attempts: 2
    });
  });

  it("times out when package matches but requested activity never appears", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.example", activity: "com.example.SplashActivity", focused: true },
        { package: "com.example", activity: "com.example.SplashActivity", focused: true },
        { package: "com.example", activity: "com.example.SplashActivity", focused: true }
      ]
    );

    await expect(
      waitForApp(driver, {
        package_name: "com.example",
        activity: ".MainActivity",
        wait_timeout_ms: 60,
        interval_ms: 50,
        poll_timeout_ms: 1000
      })
    ).rejects.toMatchObject({
      code: "WAIT_TIMEOUT",
      retriable: true,
      details: { condition: "app", package_name: "com.example", activity: "com.example.MainActivity" }
    });
  });
});
