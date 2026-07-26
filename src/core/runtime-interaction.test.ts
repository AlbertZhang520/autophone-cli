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

describe("find runtime", () => {
  it("returns a single usable candidate", async () => {
    const driver = makeDriver([snapshot("hash-a", "Login")]);

    await expect(
      find(driver, {
        selector: { text: "Login" },
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      snapshot_id: "snap_hash-a",
      device_serial: "emulator-5554",
      count: 1,
      usable_only: true,
      candidates: [{ text: "Login", center: [15, 15] }]
    });
  });

  it("returns success with zero candidates", async () => {
    const driver = makeDriver([snapshot("hash-a", "Login")]);

    await expect(
      find(driver, {
        selector: { text: "Missing" },
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      count: 0,
      candidates: []
    });
  });

  it("returns success with multiple candidates for disambiguation", async () => {
    const driver = makeDriver([snapshot("hash-a", "OK", "OK")]);

    await expect(
      find(driver, {
        selector: { text: "OK" },
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      count: 2,
      candidates: [{ resource_id: "id/0" }, { resource_id: "id/1" }]
    });
  });

  it("reports total elements separately from usable candidate count", async () => {
    const base = snapshot("hash-a", "OK", "OK");
    const driver = makeDriver([
      {
        ...base,
        elements: [
          base.elements[0]!,
          {
            ...base.elements[1]!,
            bounds: [200, 200, 220, 220]
          }
        ]
      }
    ]);

    await expect(
      find(driver, {
        selector: { text: "OK" },
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      count: 1,
      total_elements: 2,
      candidates: [{ resource_id: "id/0" }]
    });
  });
});

describe("tap runtime", () => {
  it("rejects ambiguous selectors without tapping", async () => {
    const driver = makeDriver([snapshot("hash-a", "Login", "Login")]);

    await expect(
      tap(driver, {
        selector: { text: "Login" },
        allow_unsafe_raw_point: false,
        verify: "none",
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "AMBIGUOUS_TARGET" });

    expect(driver.tap).not.toHaveBeenCalled();
  });

  it("taps an explicitly indexed candidate from an ambiguous selector", async () => {
    const driver = makeDriver([snapshot("hash-a", "OK", "OK")]);

    await expect(
      tap(driver, {
        selector: { text: "OK" },
        candidate_index: 1,
        allow_unsafe_raw_point: false,
        verify: "none",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      candidate: { text: "OK", candidate_index: 1 },
      point: [15, 35],
      verify: { policy: "none", ok: true, attempts: 0 }
    });

    expect(driver.tap).toHaveBeenCalledWith([15, 35], { timeoutMs: 1000 });
  });

  it("fails indexed tap when the requested candidate_index is absent", async () => {
    const driver = makeDriver([snapshot("hash-a", "OK")]);

    await expect(
      tap(driver, {
        selector: { text: "OK" },
        candidate_index: 1,
        allow_unsafe_raw_point: false,
        verify: "none",
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({
      code: "TARGET_NOT_FOUND",
      retriable: true,
      details: { candidate_index: 1 }
    });

    expect(driver.tap).not.toHaveBeenCalled();
  });

  it("rejects raw coordinates combined with candidate_index before observing", async () => {
    const driver = makeDriver([snapshot("hash-a", "OK")]);

    await expect(
      tap(driver, {
        raw_point: [10, 20],
        candidate_index: 0,
        allow_unsafe_raw_point: true,
        verify: "none",
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });

    expect(driver.observe).not.toHaveBeenCalled();
    expect(driver.tap).not.toHaveBeenCalled();
  });

  it("rejects candidate_index without a selector before observing", async () => {
    const driver = makeDriver([snapshot("hash-a", "OK")]);

    await expect(
      tap(driver, {
        candidate_index: 0,
        allow_unsafe_raw_point: false,
        verify: "none",
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });

    expect(driver.observe).not.toHaveBeenCalled();
    expect(driver.tap).not.toHaveBeenCalled();
  });

  it("rejects raw coordinates unless explicitly unsafe", async () => {
    const driver = makeDriver([snapshot("hash-a", "Login")]);

    await expect(
      tap(driver, {
        raw_point: [10, 20],
        allow_unsafe_raw_point: false,
        verify: "none",
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "UNSAFE_OPERATION" });

    expect(driver.observe).not.toHaveBeenCalled();
  });

  it("fails screen_changed verification when the snapshot is unchanged", async () => {
    const driver = makeDriver([
      snapshot("hash-a", "Login"),
      snapshot("hash-a", "Login"),
      snapshot("hash-a", "Login"),
      snapshot("hash-a", "Login")
    ]);

    await expect(
      tap(driver, {
        selector: { text: "Login" },
        allow_unsafe_raw_point: false,
        verify: "screen_changed",
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "VERIFY_FAILED", retriable: false, details: { attempts: 3 } });

    expect(driver.tap).toHaveBeenCalledWith([15, 15], { timeoutMs: 1000 });
  });

  it("polls verification before failing a slow screen change", async () => {
    const driver = makeDriver([snapshot("hash-a", "Login"), snapshot("hash-a", "Login"), snapshot("hash-b", "Next")]);

    await expect(
      tap(driver, {
        selector: { text: "Login" },
        allow_unsafe_raw_point: false,
        verify: "screen_changed",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      point: [15, 15],
      verify: { ok: true, attempts: 2, changed_fields: ["ui_hash"] }
    });
    expect(driver.tap).toHaveBeenCalledTimes(1);
  });

  it("accepts screen_changed verification when UI hash changes", async () => {
    const driver = makeDriver([snapshot("hash-a", "Login"), snapshot("hash-b", "Next")]);

    await expect(
      tap(driver, {
        selector: { text: "Login" },
        allow_unsafe_raw_point: false,
        verify: "screen_changed",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      point: [15, 15],
      verify: { ok: true, policy: "screen_changed", attempts: 1 }
    });
  });
});

describe("double tap runtime", () => {
  it("double-taps an explicitly indexed candidate without post-observation when verification is disabled", async () => {
    const driver = makeDriver([snapshot("hash-a", "Photo", "Photo")]);

    await expect(
      doubleTap(driver, {
        selector: { text: "Photo" },
        candidate_index: 1,
        allow_unsafe_raw_point: false,
        interval_ms: 80,
        verify: "none",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      candidate: { text: "Photo", candidate_index: 1 },
      point: [15, 35],
      interval_ms: 80,
      verify: { policy: "none", ok: true, attempts: 0 }
    });

    expect(driver.doubleTap).toHaveBeenCalledWith([15, 35], 80, { timeoutMs: 1000 });
    expect(driver.tap).not.toHaveBeenCalled();
  });

  it("rejects ambiguous selectors before double-tapping", async () => {
    const driver = makeDriver([snapshot("hash-a", "Photo", "Photo")]);

    await expect(
      doubleTap(driver, {
        selector: { text: "Photo" },
        allow_unsafe_raw_point: false,
        interval_ms: 80,
        verify: "none",
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "AMBIGUOUS_TARGET" });

    expect(driver.doubleTap).not.toHaveBeenCalled();
  });

  it("rejects unsafe raw double-tap coordinates", async () => {
    const driver = makeDriver([snapshot("hash-a", "Photo")]);

    await expect(
      doubleTap(driver, {
        raw_point: [10, 20],
        allow_unsafe_raw_point: false,
        interval_ms: 80,
        verify: "none",
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "UNSAFE_OPERATION" });

    expect(driver.observe).not.toHaveBeenCalled();
    expect(driver.doubleTap).not.toHaveBeenCalled();
  });

  it("verifies double tap by screen change when requested", async () => {
    const driver = makeDriver([snapshot("hash-a", "Photo"), snapshot("hash-b", "Zoomed")]);

    await expect(
      doubleTap(driver, {
        selector: { text: "Photo" },
        allow_unsafe_raw_point: false,
        interval_ms: 100,
        verify: "screen_changed",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      point: [15, 15],
      interval_ms: 100,
      verify: { policy: "screen_changed", ok: true, attempts: 1, changed_fields: ["ui_hash"] }
    });
  });

  it("fails double tap screen_changed verification when the snapshot is unchanged", async () => {
    const driver = makeDriver([
      snapshot("hash-a", "Photo"),
      snapshot("hash-a", "Photo"),
      snapshot("hash-a", "Photo"),
      snapshot("hash-a", "Photo")
    ]);

    await expect(
      doubleTap(driver, {
        selector: { text: "Photo" },
        allow_unsafe_raw_point: false,
        interval_ms: 80,
        verify: "screen_changed",
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "VERIFY_FAILED", retriable: false, details: { interval_ms: 80, attempts: 3 } });

    expect(driver.doubleTap).toHaveBeenCalledWith([15, 15], 80, { timeoutMs: 1000 });
  });
});

describe("long press runtime", () => {
  it("long-presses a single selector candidate with a zero-distance swipe", async () => {
    const driver = makeDriver([snapshot("hash-a", "More options")]);

    await expect(
      longPress(driver, {
        selector: { text: "More options" },
        allow_unsafe_raw_point: false,
        duration_ms: 800,
        verify: "none",
        timeout_ms: 2000
      })
    ).resolves.toMatchObject({
      candidate: { text: "More options" },
      point: [15, 15],
      duration_ms: 800,
      after: null,
      verify: { policy: "none", ok: true, attempts: 0 }
    });

    expect(driver.swipe).toHaveBeenCalledWith([15, 15], [15, 15], 800, { timeoutMs: 2000 });
    expect(driver.observe).toHaveBeenCalledTimes(1);
    expect(driver.tap).not.toHaveBeenCalled();
  });

  it("uses unsafe raw coordinates before a selector when both are supplied", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item")]);

    await expect(
      longPress(driver, {
        selector: { text: "Item" },
        raw_point: [30, 40],
        allow_unsafe_raw_point: true,
        duration_ms: 800,
        verify: "none",
        timeout_ms: 2000
      })
    ).resolves.toMatchObject({
      candidate: null,
      point: [30, 40],
      verify: { policy: "none", ok: true, attempts: 0 }
    });

    expect(driver.swipe).toHaveBeenCalledWith([30, 40], [30, 40], 800, { timeoutMs: 2000 });
  });

  it("rejects ambiguous selectors without long-pressing", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item", "Item")]);

    await expect(
      longPress(driver, {
        selector: { text: "Item" },
        allow_unsafe_raw_point: false,
        duration_ms: 800,
        verify: "none",
        timeout_ms: 2000
      })
    ).rejects.toMatchObject({ code: "AMBIGUOUS_TARGET" });

    expect(driver.swipe).not.toHaveBeenCalled();
  });

  it("long-presses an explicitly indexed candidate from an ambiguous selector", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item", "Item")]);

    await expect(
      longPress(driver, {
        selector: { text: "Item" },
        candidate_index: 1,
        allow_unsafe_raw_point: false,
        duration_ms: 800,
        verify: "none",
        timeout_ms: 2000
      })
    ).resolves.toMatchObject({
      candidate: { text: "Item", candidate_index: 1 },
      point: [15, 35],
      duration_ms: 800,
      verify: { policy: "none", ok: true, attempts: 0 }
    });

    expect(driver.swipe).toHaveBeenCalledWith([15, 35], [15, 35], 800, { timeoutMs: 2000 });
  });

  it("fails indexed long press when the requested candidate_index is absent", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item")]);

    await expect(
      longPress(driver, {
        selector: { text: "Item" },
        candidate_index: 1,
        allow_unsafe_raw_point: false,
        duration_ms: 800,
        verify: "none",
        timeout_ms: 2000
      })
    ).rejects.toMatchObject({
      code: "TARGET_NOT_FOUND",
      retriable: true,
      details: { candidate_index: 1 }
    });

    expect(driver.swipe).not.toHaveBeenCalled();
  });

  it("rejects raw coordinates combined with candidate_index before long-press observation", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item")]);

    await expect(
      longPress(driver, {
        raw_point: [10, 20],
        candidate_index: 0,
        allow_unsafe_raw_point: true,
        duration_ms: 800,
        verify: "none",
        timeout_ms: 2000
      })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });

    expect(driver.observe).not.toHaveBeenCalled();
    expect(driver.swipe).not.toHaveBeenCalled();
  });

  it("rejects candidate_index without a selector before long-press observation", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item")]);

    await expect(
      longPress(driver, {
        candidate_index: 0,
        allow_unsafe_raw_point: false,
        duration_ms: 800,
        verify: "none",
        timeout_ms: 2000
      })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });

    expect(driver.observe).not.toHaveBeenCalled();
    expect(driver.swipe).not.toHaveBeenCalled();
  });

  it("rejects raw coordinates unless explicitly unsafe", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item")]);

    await expect(
      longPress(driver, {
        raw_point: [10, 20],
        allow_unsafe_raw_point: false,
        duration_ms: 800,
        verify: "none",
        timeout_ms: 2000
      })
    ).rejects.toMatchObject({ code: "UNSAFE_OPERATION" });

    expect(driver.observe).not.toHaveBeenCalled();
    expect(driver.swipe).not.toHaveBeenCalled();
  });

  it("verifies long press by screen change when requested", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item"), snapshot("hash-b", "Context menu")]);

    await expect(
      longPress(driver, {
        selector: { text: "Item" },
        allow_unsafe_raw_point: false,
        duration_ms: 900,
        verify: "screen_changed",
        timeout_ms: 2000
      })
    ).resolves.toMatchObject({
      point: [15, 15],
      duration_ms: 900,
      verify: { policy: "screen_changed", ok: true, attempts: 1, changed_fields: ["ui_hash"] }
    });
  });

  it("fails screen_changed verification when the snapshot is unchanged", async () => {
    const driver = makeDriver([
      snapshot("hash-a", "Item"),
      snapshot("hash-a", "Item"),
      snapshot("hash-a", "Item"),
      snapshot("hash-a", "Item")
    ]);

    await expect(
      longPress(driver, {
        selector: { text: "Item" },
        allow_unsafe_raw_point: false,
        duration_ms: 800,
        verify: "screen_changed",
        timeout_ms: 2000
      })
    ).rejects.toMatchObject({ code: "VERIFY_FAILED", retriable: false, details: { duration_ms: 800, attempts: 3 } });

    expect(driver.swipe).toHaveBeenCalledWith([15, 15], [15, 15], 800, { timeoutMs: 2000 });
  });
});

describe("drag runtime", () => {
  it("drags between unique selector candidates with draganddrop and no post-observation by default", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item", "Target")]);

    await expect(
      drag(driver, {
        from_selector: { text: "Item" },
        to_selector: { text: "Target" },
        gesture: "draganddrop",
        duration_ms: 1000,
        verify: "none",
        timeout_ms: 3000
      })
    ).resolves.toMatchObject({
      from_candidate: { text: "Item", candidate_index: 0 },
      to_candidate: { text: "Target", candidate_index: 0 },
      start: [15, 15],
      end: [15, 35],
      gesture: "draganddrop",
      duration_ms: 1000,
      after: null,
      verify: { policy: "none", ok: true, attempts: 0 }
    });

    expect(driver.observe).toHaveBeenCalledTimes(1);
    expect(driver.drag).toHaveBeenCalledWith(
      [15, 15],
      [15, 35],
      1000,
      "draganddrop",
      expect.objectContaining({ timeoutMs: 3000 })
    );
    expect(driver.swipe).not.toHaveBeenCalled();
  });

  it("supports swipe gesture drags with explicit screen_changed verification", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item", "Target"), snapshot("hash-b", "Item", "Target")]);

    await expect(
      drag(driver, {
        from_selector: { text: "Item" },
        to_selector: { text: "Target" },
        gesture: "swipe",
        duration_ms: 1200,
        verify: "screen_changed",
        timeout_ms: 3000
      })
    ).resolves.toMatchObject({
      gesture: "swipe",
      verify: { policy: "screen_changed", ok: true, attempts: 1, changed_fields: ["ui_hash"] }
    });

    expect(driver.drag).toHaveBeenCalledWith(
      [15, 15],
      [15, 35],
      1200,
      "swipe",
      expect.objectContaining({ timeoutMs: 3000 })
    );
  });

  it("rejects ambiguous drag endpoints before sending the gesture", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item", "Target", "Target")]);

    await expect(
      drag(driver, {
        from_selector: { text: "Item" },
        to_selector: { text: "Target" },
        gesture: "draganddrop",
        duration_ms: 1000,
        verify: "none",
        timeout_ms: 3000
      })
    ).rejects.toMatchObject({ code: "AMBIGUOUS_TARGET" });

    expect(driver.drag).not.toHaveBeenCalled();
  });

  it("rejects drag endpoints that resolve too close together", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item")]);

    await expect(
      drag(driver, {
        from_selector: { text: "Item" },
        to_selector: { text: "Item" },
        gesture: "draganddrop",
        duration_ms: 1000,
        verify: "none",
        timeout_ms: 3000
      })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST", details: { start: [15, 15], end: [15, 15] } });

    expect(driver.drag).not.toHaveBeenCalled();
  });
});

describe("key runtime", () => {
  it("presses a key without observation when verification is disabled", async () => {
    const driver = makeDriver([]);

    await expect(
      keyPress(driver, {
        key: "BACK",
        verify: "none",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      key: "BACK",
      keycode: "KEYCODE_BACK",
      before: null,
      after: null,
      verify: { policy: "none", ok: true, attempts: 0 }
    });

    expect(driver.observe).not.toHaveBeenCalled();
    expect(driver.keyEvent).toHaveBeenCalledWith("KEYCODE_BACK", { timeoutMs: 1000 });
  });

  it("verifies key press by screen change when requested", async () => {
    const driver = makeDriver([snapshot("hash-a", "Home"), snapshot("hash-b", "Back")]);

    await expect(
      keyPress(driver, {
        key: "BACK",
        verify: "screen_changed",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      keycode: "KEYCODE_BACK",
      verify: { policy: "screen_changed", ok: true, attempts: 1, changed_fields: ["ui_hash"] }
    });
  });

  it("retries key screen_changed verification until the snapshot changes", async () => {
    const driver = makeDriver([snapshot("hash-a", "Home"), snapshot("hash-a", "Home"), snapshot("hash-b", "Back")]);

    await expect(
      keyPress(driver, {
        key: "BACK",
        verify: "screen_changed",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      keycode: "KEYCODE_BACK",
      verify: { policy: "screen_changed", ok: true, attempts: 2, changed_fields: ["ui_hash"] }
    });
  });

  it("reports package and activity changed fields for key screen_changed verification", async () => {
    const after = {
      ...snapshot("hash-a", "Home"),
      package: "com.other",
      activity: "com.other.MainActivity"
    };
    const driver = makeDriver([snapshot("hash-a", "Home"), after]);

    await expect(
      keyPress(driver, {
        key: "HOME",
        verify: "screen_changed",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      keycode: "KEYCODE_HOME",
      verify: { policy: "screen_changed", ok: true, attempts: 1, changed_fields: ["package", "activity"] }
    });
  });

  it("maps extended safe key names to Android keycodes", async () => {
    for (const [key, keycode] of [
      ["APP_SWITCH", "KEYCODE_APP_SWITCH"],
      ["MOVE_HOME", "KEYCODE_MOVE_HOME"],
      ["MOVE_END", "KEYCODE_MOVE_END"]
    ] as const) {
      const driver = makeDriver([]);

      await expect(
        keyPress(driver, {
          key,
          verify: "none",
          timeout_ms: 1000
        })
      ).resolves.toMatchObject({
        key,
        keycode,
        verify: { policy: "none", ok: true, attempts: 0 }
      });

      expect(driver.observe).not.toHaveBeenCalled();
      expect(driver.keyEvent).toHaveBeenCalledWith(keycode, { timeoutMs: 1000 });
    }
  });

  it("fails key screen_changed verification when nothing changes", async () => {
    const driver = makeDriver([
      snapshot("hash-a", "Home"),
      snapshot("hash-a", "Home"),
      snapshot("hash-a", "Home"),
      snapshot("hash-a", "Home")
    ]);

    await expect(
      keyPress(driver, {
        key: "DPAD_UP",
        verify: "screen_changed",
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "VERIFY_FAILED", retriable: false, details: { keycode: "KEYCODE_DPAD_UP" } });
  });
});

describe("text input runtime", () => {
  it("encodes spaces for Android input text", () => {
    expect(encodeTextForAdbInput("hello world 42")).toBe("hello%sworld%s42");
  });

  it("escapes printable ASCII punctuation for Android input text", () => {
    expect(encodeTextForAdbInput("p@ss:w0rd! a+b/c?d#e O'Brien (x)")).toBe(
      "p@ss\\:w0rd\\!%sa\\+b\\/c\\?d\\#e%sO\\'Brien%s\\(x\\)"
    );
    expect(encodeTextForAdbInput('$"`&|;<>*[]{}~')).toBe(
      "\\$\\\"\\`\\&\\|\\;\\<\\>\\*\\[\\]\\{\\}\\~"
    );
  });

  it("types text without observation when verification is disabled", async () => {
    const driver = makeDriver([]);

    await expect(
      textInput(driver, {
        text: "hello world",
        verify: "none",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      charset: "adb_shell_printable_ascii",
      text_length: 11,
      encoded_length: 12,
      verify: { policy: "none", ok: true, attempts: 0 }
    });

    expect(driver.observe).not.toHaveBeenCalled();
    expect(driver.textInput).toHaveBeenCalledWith("hello%sworld", { timeoutMs: 1000 });
  });

  it("verifies text input by screen change when requested", async () => {
    const driver = makeDriver([snapshot("hash-a", "Name"), snapshot("hash-b", "Name Alice")]);

    await expect(
      textInput(driver, {
        text: "Alice",
        verify: "screen_changed",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      charset: "adb_shell_printable_ascii",
      text_length: 5,
      verify: { policy: "screen_changed", ok: true, attempts: 1, changed_fields: ["ui_hash"] }
    });
  });

  it("fails text screen_changed verification without returning raw text", async () => {
    const driver = makeDriver([
      snapshot("hash-a", "Name"),
      snapshot("hash-a", "Name"),
      snapshot("hash-a", "Name"),
      snapshot("hash-a", "Name")
    ]);

    await expect(
      textInput(driver, {
        text: "secret",
        verify: "screen_changed",
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({
      code: "VERIFY_FAILED",
      details: { text_length: 6, encoded_length: 6, charset: "adb_shell_printable_ascii" }
    });
  });
});

describe("text clear runtime", () => {
  it("sends a bounded clear sequence without observation when verification is disabled", async () => {
    const driver = makeDriver([]);

    await expect(
      textClear(driver, {
        max_chars: 64,
        verify: "none",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      strategy: "move_end_then_backspace",
      max_chars: 64,
      key_events: { move_end: 1, delete: 64, total: 65 },
      verify: { policy: "none", ok: true, attempts: 0, changed_fields: [] }
    });

    expect(driver.observe).not.toHaveBeenCalled();
    expect(driver.clearText).toHaveBeenCalledWith(64, { timeoutMs: 1000 });
  });

  it("verifies text clear by screen change when requested without returning snapshots", async () => {
    const driver = makeDriver([snapshot("hash-a", "secret"), snapshot("hash-b", "")]);

    await expect(
      textClear(driver, {
        max_chars: 32,
        verify: "screen_changed",
        timeout_ms: 1000
      })
    ).resolves.toEqual({
      strategy: "move_end_then_backspace",
      max_chars: 32,
      key_events: { move_end: 1, delete: 32, total: 33 },
      verify: {
        policy: "screen_changed",
        ok: true,
        attempts: 1,
        reason: "snapshot hash, package, or activity changed; field emptiness is not confirmed",
        changed_fields: ["ui_hash"]
      }
    });
  });

  it("fails text clear screen_changed verification without returning field text", async () => {
    const driver = makeDriver([
      snapshot("hash-a", "secret"),
      snapshot("hash-a", "secret"),
      snapshot("hash-a", "secret"),
      snapshot("hash-a", "secret")
    ]);

    await expect(
      textClear(driver, {
        max_chars: 16,
        verify: "screen_changed",
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({
      code: "VERIFY_FAILED",
      details: {
        strategy: "move_end_then_backspace",
        max_chars: 16,
        key_events: { move_end: 1, delete: 16, total: 17 }
      }
    });
  });
});

describe("scroll runtime", () => {
  it("plans content-direction gestures as inverse finger swipes", () => {
    const base = snapshot("hash-a", "List");
    const wide = { ...base, window_size: [100, 200] as [number, number] };

    expect(planScrollGesture(wide, "down", "medium")).toMatchObject({
      fingerDirection: "up",
      start: [50, 135],
      end: [50, 65]
    });
    expect(planScrollGesture(wide, "up", "medium")).toMatchObject({
      fingerDirection: "down",
      start: [50, 65],
      end: [50, 135]
    });
    expect(planScrollGesture(wide, "right", "medium")).toMatchObject({
      fingerDirection: "left",
      start: [69, 100],
      end: [32, 100]
    });
    expect(planScrollGesture(wide, "left", "medium")).toMatchObject({
      fingerDirection: "right",
      start: [32, 100],
      end: [69, 100]
    });
  });

  it("uses amount to scale gesture distance inside safe insets", () => {
    const base = { ...snapshot("hash-a", "List"), window_size: [100, 200] as [number, number] };

    expect(planScrollGesture(base, "down", "small")).toMatchObject({ start: [50, 122], end: [50, 78] });
    expect(planScrollGesture(base, "down", "large")).toMatchObject({ start: [50, 148], end: [50, 53] });
  });

  it("swipes without post-observation when verification is disabled", async () => {
    const driver = makeDriver([{ ...snapshot("hash-a", "List"), window_size: [100, 200] as [number, number] }]);

    await expect(
      scroll(driver, {
        direction: "down",
        amount: "medium",
        duration_ms: 300,
        verify: "none",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      direction: "down",
      amount: "medium",
      finger_direction: "up",
      start: [50, 135],
      end: [50, 65],
      duration_ms: 300,
      after: null,
      verify: { policy: "none", ok: true, attempts: 0 }
    });

    expect(driver.observe).toHaveBeenCalledTimes(1);
    expect(driver.swipe).toHaveBeenCalledWith([50, 135], [50, 65], 300, { timeoutMs: 1000 });
  });

  it("derives scroll gestures inside a uniquely matched element scope", async () => {
    const before = {
      ...snapshot("hash-a"),
      window_size: [100, 200] as [number, number],
      elements: [
        {
          source_index: 0,
          text: "Container",
          resource_id: "id/container",
          content_desc: "",
          class_name: "android.widget.ScrollView",
          package_name: "com.example",
          bounds: [10, 20, 90, 180] as [number, number, number, number],
          enabled: true,
          clickable: false,
          focused: false
        }
      ]
    };
    const driver = makeDriver([before]);

    await expect(
      scroll(driver, {
        direction: "down",
        amount: "medium",
        within: { resource_id: "id/container" },
        duration_ms: 300,
        verify: "none",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      scope: "element",
      within: {
        selector: { resource_id: "id/container" },
        candidate: { text: "Container", bounds: [10, 20, 90, 180], candidate_index: 0 }
      },
      finger_direction: "up",
      start: [50, 128],
      end: [50, 72],
      verify: { policy: "none", ok: true, attempts: 0 }
    });

    expect(driver.swipe).toHaveBeenCalledWith([50, 128], [50, 72], 300, { timeoutMs: 1000 });
  });

  it("clips partially off-screen element scopes to the observed window before planning", async () => {
    const driver = makeDriver([
      {
        ...snapshot("hash-a"),
        window_size: [100, 200] as [number, number],
        elements: [
          {
            source_index: 0,
            text: "Carousel",
            resource_id: "id/carousel",
            content_desc: "",
            class_name: "android.widget.HorizontalScrollView",
            package_name: "com.example",
            bounds: [-70, 20, 100, 180] as [number, number, number, number],
            enabled: true,
            clickable: false,
            focused: false
          }
        ]
      }
    ]);

    await expect(
      scroll(driver, {
        direction: "right",
        amount: "medium",
        within: { resource_id: "id/carousel" },
        duration_ms: 300,
        verify: "none",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      scope: "element",
      finger_direction: "left",
      start: [69, 100],
      end: [32, 100]
    });

    expect(driver.swipe).toHaveBeenCalledWith([69, 100], [32, 100], 300, { timeoutMs: 1000 });
  });

  it("rejects ambiguous or missing scroll element scopes before swiping", async () => {
    const ambiguous = {
      ...snapshot("hash-a", "Container", "Container"),
      window_size: [100, 200] as [number, number],
      elements: snapshot("hash-a", "Container", "Container").elements.map((node, index) => ({
        ...node,
        bounds: [10, index * 90 + 10, 90, index * 90 + 80] as [number, number, number, number]
      }))
    };
    for (const { candidate, code } of [
      { candidate: ambiguous, code: "AMBIGUOUS_TARGET" },
      { candidate: { ...snapshot("hash-b"), window_size: [100, 200] as [number, number] }, code: "TARGET_NOT_FOUND" }
    ]) {
      const driver = makeDriver([candidate]);

      await expect(
        scroll(driver, {
          direction: "down",
          amount: "medium",
          within: { text: "Container" },
          duration_ms: 300,
          verify: "none",
          timeout_ms: 1000
        })
      ).rejects.toMatchObject({ code });

      expect(driver.swipe).not.toHaveBeenCalled();
    }
  });

  it("rejects too-small scroll element scopes with a distinct error", async () => {
    const driver = makeDriver([
      {
        ...snapshot("hash-a"),
        window_size: [100, 200] as [number, number],
        elements: [
          {
            source_index: 0,
            text: "Tiny",
            resource_id: "id/tiny",
            content_desc: "",
            class_name: "android.widget.ScrollView",
            package_name: "com.example",
            bounds: [10, 20, 50, 80] as [number, number, number, number],
            enabled: true,
            clickable: false,
            focused: false
          }
        ]
      }
    ]);

    await expect(
      scroll(driver, {
        direction: "down",
        amount: "medium",
        within: { text: "Tiny" },
        duration_ms: 300,
        verify: "none",
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "SCROLL_REGION_TOO_SMALL", retriable: true });

    expect(driver.swipe).not.toHaveBeenCalled();
  });

  it("verifies scroll by screen change when requested", async () => {
    const driver = makeDriver([
      { ...snapshot("hash-a", "List"), window_size: [100, 200] as [number, number] },
      { ...snapshot("hash-b", "More"), window_size: [100, 200] as [number, number] }
    ]);

    await expect(
      scroll(driver, {
        direction: "up",
        amount: "small",
        duration_ms: 500,
        verify: "screen_changed",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      direction: "up",
      finger_direction: "down",
      verify: { policy: "screen_changed", ok: true, attempts: 1, changed_fields: ["ui_hash"] }
    });

    expect(driver.swipe).toHaveBeenCalledWith([50, 78], [50, 122], 500, { timeoutMs: 1000 });
  });

  it("rejects missing or too-small window sizes before swiping", async () => {
    for (const windowSize of [null, [40, 200] as [number, number]]) {
      const driver = makeDriver([{ ...snapshot("hash-a", "List"), window_size: windowSize }]);

      await expect(
        scroll(driver, {
          direction: "down",
          amount: "medium",
          duration_ms: 300,
          verify: "none",
          timeout_ms: 1000
        })
      ).rejects.toMatchObject({ code: "WINDOW_SIZE_UNAVAILABLE", retriable: true });

      expect(driver.swipe).not.toHaveBeenCalled();
    }
  });
});
