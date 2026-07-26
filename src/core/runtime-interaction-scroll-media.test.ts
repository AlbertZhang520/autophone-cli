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

describe("scroll until runtime", () => {
  it("returns immediately when the selector is already visible", async () => {
    const driver = makeDriver([snapshot("hash-a", "Target")]);

    await expect(
      scrollUntil(driver, {
        selector: { text: "Target" },
        direction: "down",
        amount: "medium",
        max_scrolls: 10,
        duration_ms: 300,
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      found: true,
      reason: "found_initial",
      scrolls: 0,
      count: 1,
      candidates: [{ text: "Target" }],
      last_scroll: null
    });

    expect(driver.observe).toHaveBeenCalledTimes(1);
    expect(driver.swipe).not.toHaveBeenCalled();
  });

  it("scrolls until the selector appears", async () => {
    const driver = makeDriver([
      { ...snapshot("hash-a", "List"), window_size: [100, 200] as [number, number] },
      { ...snapshot("hash-b", "Target"), window_size: [100, 200] as [number, number] }
    ]);

    await expect(
      scrollUntil(driver, {
        selector: { text: "Target" },
        direction: "down",
        amount: "medium",
        max_scrolls: 3,
        duration_ms: 300,
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      found: true,
      reason: "found_after_scroll",
      scrolls: 1,
      count: 1,
      last_scroll: {
        finger_direction: "up",
        start: [50, 135],
        end: [50, 65],
        changed_fields: ["ui_hash"]
      }
    });

    expect(driver.swipe).toHaveBeenCalledWith([50, 135], [50, 65], 300, { timeoutMs: 1000 });
  });

  it("re-resolves the scroll element scope on each scroll-until attempt", async () => {
    const first = {
      ...snapshot("hash-a"),
      window_size: [100, 200] as [number, number],
      elements: [
        {
          source_index: 0,
          text: "List",
          resource_id: "id/list",
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
    const second = {
      ...snapshot("hash-b", "Target"),
      window_size: [100, 200] as [number, number],
      elements: [
        {
          ...first.elements[0]!,
          bounds: [20, 30, 100, 190] as [number, number, number, number]
        },
        ...snapshot("hash-b", "Target").elements
      ]
    };
    const driver = makeDriver([first, second]);

    await expect(
      scrollUntil(driver, {
        selector: { text: "Target" },
        direction: "down",
        amount: "medium",
        within: { resource_id: "id/list" },
        max_scrolls: 2,
        duration_ms: 300,
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      scope: "element",
      within: { resource_id: "id/list" },
      found: true,
      reason: "found_after_scroll",
      scrolls: 1,
      last_scroll: {
        scope: "element",
        within_candidate: { resource_id: "id/list", bounds: [10, 20, 90, 180] },
        start: [50, 128],
        end: [50, 72],
        changed_fields: ["ui_hash"]
      }
    });

    expect(driver.swipe).toHaveBeenCalledWith([50, 128], [50, 72], 300, { timeoutMs: 1000 });
  });

  it("fails scroll-until when the element scope disappears before a later attempt", async () => {
    const first = {
      ...snapshot("hash-a"),
      window_size: [100, 200] as [number, number],
      elements: [
        {
          source_index: 0,
          text: "List",
          resource_id: "id/list",
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
    const driver = makeDriver([
      first,
      { ...snapshot("hash-b", "Still missing"), window_size: [100, 200] as [number, number] }
    ]);

    await expect(
      scrollUntil(driver, {
        selector: { text: "Target" },
        direction: "down",
        amount: "medium",
        within: { resource_id: "id/list" },
        max_scrolls: 2,
        duration_ms: 300,
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "TARGET_NOT_FOUND" });

    expect(driver.swipe).toHaveBeenCalledTimes(1);
  });

  it("reports multiple visible candidates without ambiguity failure", async () => {
    const driver = makeDriver([snapshot("hash-a", "Target", "Target")]);

    await expect(
      scrollUntil(driver, {
        selector: { text: "Target" },
        direction: "down",
        amount: "medium",
        max_scrolls: 2,
        duration_ms: 300,
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      found: true,
      reason: "found_initial",
      count: 2,
      candidates: [{ candidate_index: 0 }, { candidate_index: 1 }]
    });

    expect(driver.swipe).not.toHaveBeenCalled();
  });

  it("stops at end_reached when a scroll produces no changed snapshot", async () => {
    const driver = makeDriver([
      { ...snapshot("hash-a", "List"), window_size: [100, 200] as [number, number] },
      { ...snapshot("hash-a", "List"), window_size: [100, 200] as [number, number] }
    ]);

    await expect(
      scrollUntil(driver, {
        selector: { text: "Missing" },
        direction: "down",
        amount: "medium",
        max_scrolls: 3,
        duration_ms: 300,
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      found: false,
      reason: "end_reached",
      scrolls: 1,
      count: 0,
      last_scroll: { changed_fields: [] }
    });
  });

  it("stops at budget_exhausted after max_scrolls with continued progress", async () => {
    const driver = makeDriver([
      { ...snapshot("hash-a", "List"), window_size: [100, 200] as [number, number] },
      { ...snapshot("hash-b", "More"), window_size: [100, 200] as [number, number] },
      { ...snapshot("hash-c", "More still"), window_size: [100, 200] as [number, number] }
    ]);

    await expect(
      scrollUntil(driver, {
        selector: { text: "Missing" },
        direction: "down",
        amount: "medium",
        max_scrolls: 2,
        duration_ms: 300,
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      found: false,
      reason: "budget_exhausted",
      scrolls: 2,
      count: 0,
      last_scroll: { changed_fields: ["ui_hash"] }
    });

    expect(driver.swipe).toHaveBeenCalledTimes(2);
  });

  it("propagates unavailable window size before scrolling", async () => {
    const driver = makeDriver([{ ...snapshot("hash-a", "List"), window_size: null }]);

    await expect(
      scrollUntil(driver, {
        selector: { text: "Missing" },
        direction: "down",
        amount: "medium",
        max_scrolls: 1,
        duration_ms: 300,
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "WINDOW_SIZE_UNAVAILABLE" });

    expect(driver.swipe).not.toHaveBeenCalled();
  });
});

describe("screenshot runtime", () => {
  it("captures PNG metadata without writing files", async () => {
    const png = pngFixture();
    const driver = makeDriver([]);
    driver.screenshot.mockResolvedValueOnce({ serial: "emulator-5554", png, durationMs: 12 });

    await expect(
      screenshot(driver, {
        output_path: "/tmp/screen.png",
        overwrite: false,
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      device_serial: "emulator-5554",
      output_path: "/tmp/screen.png",
      mime_type: "image/png",
      width_px: 2,
      height_px: 3,
      bytes: png.byteLength,
      sha256: "sha256:b63355f9a1f6274e48ef9c27ab6d683c460bf87cb4eefe3139711bcbea77c75c",
      capture_duration_ms: 12,
      png
    });
  });

  it("rejects non-PNG screenshot bytes", async () => {
    const driver = makeDriver([]);
    driver.screenshot.mockResolvedValueOnce({ serial: "emulator-5554", png: Buffer.from("not a png"), durationMs: 1 });

    await expect(
      screenshot(driver, {
        output_path: "/tmp/screen.png",
        overwrite: false,
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "SCREENSHOT_INVALID", retriable: true });
  });

  it("rejects PNG bytes missing a complete IHDR chunk", async () => {
    const driver = makeDriver([]);
    driver.screenshot.mockResolvedValueOnce({
      serial: "emulator-5554",
      png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      durationMs: 1
    });

    await expect(
      screenshot(driver, {
        output_path: "/tmp/screen.png",
        overwrite: false,
        timeout_ms: 1000
      })
    ).rejects.toMatchObject({ code: "SCREENSHOT_INVALID", retriable: true });
  });
});

describe("screenrecord runtime", () => {
  it("records, pulls, and cleans up a bounded default-display MP4", async () => {
    const driver = makeDriver([]);

    const capture = await screenrecord(
      driver,
      {
        output_path: "/tmp/video.mp4",
        overwrite: false,
        duration_seconds: 2,
        bit_rate_bps: 4_000_000,
        size: "1280x720",
        bugreport: true,
        record_timeout_ms: 17_000,
        pull_timeout_ms: 120_000,
        cleanup_timeout_ms: 10_000,
        device_serial: "emulator-5554"
      },
      "/tmp/.video.tmp"
    );

    const remotePath = driver.recordScreen.mock.calls[0]?.[0].remotePath;
    expect(remotePath).toMatch(/^\/data\/local\/tmp\/autophone-screenrecord-[0-9a-f-]+\.mp4$/);
    expect(driver.recordScreen).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      remotePath,
      durationSeconds: 2,
      bitRateBps: 4_000_000,
      size: "1280x720",
      bugreport: true,
      timeoutMs: 17_000
    });
    expect(driver.pullFile).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      localPath: "/tmp/.video.tmp",
      remotePath,
      compression: "adb_default",
      timeoutMs: 120_000
    });
    expect(driver.removeFile).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      remotePath,
      timeoutMs: 10_000
    });
    expect(capture).toMatchObject({
      device_serial: "emulator-5554",
      mime_type: "video/mp4",
      requested: {
        duration_seconds: 2,
        bit_rate_bps: 4_000_000,
        size: "1280x720",
        bugreport: true,
        display: "default"
      },
      recording: { method: "screenrecord", exit_code: 0 },
      transfer: { method: "adb_pull", exit_code: 0 },
      cleanup: { method: "device_rm", attempted: true, ok: true },
      verify: { policy: "screenrecord_exit_pull_host_file", ok: true, attempts: 3 },
      semantics: "bounded_default_display_video_evidence_no_audio_or_frame_completeness_guarantee"
    });

    expect(
      buildScreenrecordResult(capture, {
        output_path: "/tmp/video.mp4",
        file_name: "video.mp4",
        bytes: 12,
        sha256: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        overwritten: false
      })
    ).toMatchObject({
      output_path: "/tmp/video.mp4",
      file_name: "video.mp4",
      bytes: 12,
      overwritten: false
    });
  });

  it("surfaces cleanup failure without failing a completed recording transfer", async () => {
    const driver = makeDriver([]);
    driver.removeFile.mockRejectedValueOnce(
      new AutophoneError({ code: "FILE_RM_FAILED", message: "rm failed", retriable: false })
    );

    await expect(
      screenrecord(
        driver,
        {
          output_path: "/tmp/video.mp4",
          overwrite: false,
          duration_seconds: 1,
          bugreport: false,
          record_timeout_ms: 16_000,
          pull_timeout_ms: 120_000,
          cleanup_timeout_ms: 10_000,
          device_serial: "emulator-5554"
        },
        "/tmp/.video.tmp"
      )
    ).resolves.toMatchObject({
      cleanup: { attempted: true, ok: false, error_code: "FILE_RM_FAILED", reason: "rm failed" }
    });
  });

  it("cleans up the remote temp file when adb pull fails", async () => {
    const driver = makeDriver([]);
    driver.pullFile.mockRejectedValueOnce(
      new AutophoneError({ code: "FILE_PULL_FAILED", message: "pull failed", retriable: false })
    );

    await expect(
      screenrecord(
        driver,
        {
          output_path: "/tmp/video.mp4",
          overwrite: false,
          duration_seconds: 1,
          bugreport: false,
          record_timeout_ms: 16_000,
          pull_timeout_ms: 120_000,
          cleanup_timeout_ms: 10_000,
          device_serial: "emulator-5554"
        },
        "/tmp/.video.tmp"
      )
    ).rejects.toMatchObject({ code: "FILE_PULL_FAILED" });

    expect(driver.removeFile).toHaveBeenCalledTimes(1);
  });

  it("attempts remote cleanup when screenrecord itself fails after choosing a temp path", async () => {
    const driver = makeDriver([]);
    driver.recordScreen.mockRejectedValueOnce(
      new AutophoneError({ code: "SCREENRECORD_FAILED", message: "screenrecord failed", retriable: false })
    );

    await expect(
      screenrecord(
        driver,
        {
          output_path: "/tmp/video.mp4",
          overwrite: false,
          duration_seconds: 1,
          bugreport: false,
          record_timeout_ms: 16_000,
          pull_timeout_ms: 120_000,
          cleanup_timeout_ms: 10_000,
          device_serial: "emulator-5554"
        },
        "/tmp/.video.tmp"
      )
    ).rejects.toMatchObject({ code: "SCREENRECORD_FAILED" });

    const remotePath = driver.recordScreen.mock.calls[0]?.[0].remotePath;
    expect(driver.removeFile).toHaveBeenCalledTimes(1);
    expect(driver.removeFile).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      remotePath,
      timeoutMs: 10_000
    });
    expect(driver.pullFile).not.toHaveBeenCalled();
  });
});
