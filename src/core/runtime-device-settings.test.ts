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

describe("device ime runtime", () => {
  it("returns a read-only input method probe with resolved serial", async () => {
    const driver = makeDriver([]);
    driver.getDeviceImeState.mockResolvedValueOnce(
      imeDriverResult({
        queries: {
          inputMethod: { exitCode: 0, durationMs: 1 },
          defaultInputMethod: { exitCode: 0, durationMs: 2 },
          enabledInputMethods: { exitCode: 0, durationMs: 3 }
        }
      })
    );

    await expect(getDeviceIme(driver, { timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toEqual({
      device_serial: "emulator-5554",
      keyboard: { shown: false, show_requested: false, fullscreen_mode: false },
      service: { system_ready: true, interactive: true },
      ime: {
        current_id: "com.example.ime/.ImeService",
        default_id: "com.example.ime/.ImeService",
        enabled_ids: ["com.example.ime/.ImeService", "com.android.adbkeyboard/.AdbIME"],
        enabled_count: 2
      },
      query: {
        sources: [
          { method: "dumpsys_input_method", exit_code: 0, command_duration_ms: 1 },
          { method: "settings_secure_default_input_method", exit_code: 0, command_duration_ms: 2 },
          { method: "settings_secure_enabled_input_methods", exit_code: 0, command_duration_ms: 3 }
        ]
      },
      verify: {
        policy: "input_method_service_parse",
        ok: true,
        attempts: 1,
        reason: "parsed InputMethodManagerService state and secure IME settings without exposing raw dumpsys output"
      },
      semantics: "read_only_ime_state_not_keyboard_geometry"
    });
    expect(driver.getDeviceImeState).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 1000 });
  });
});

describe("device brightness runtime", () => {
  it("returns a read-only display brightness probe with resolved serial", async () => {
    const driver = makeDriver([]);
    driver.getDeviceBrightnessState.mockResolvedValueOnce(
      brightnessDriverResult({
        queries: {
          brightness: { exitCode: 0, durationMs: 1 },
          mode: { exitCode: 0, durationMs: 2 },
          autoAdjustment: { exitCode: 0, durationMs: 3 },
          brightnessFloat: { exitCode: 0, durationMs: 4 },
          display: { exitCode: 0, durationMs: 5 }
        }
      })
    );

    await expect(getDeviceBrightness(driver, { timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toEqual({
      device_serial: "emulator-5554",
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
      query: {
        sources: [
          { method: "settings_system_screen_brightness", exit_code: 0, command_duration_ms: 1 },
          { method: "settings_system_screen_brightness_mode", exit_code: 0, command_duration_ms: 2 },
          { method: "settings_system_screen_auto_brightness_adj", exit_code: 0, command_duration_ms: 3 },
          { method: "settings_system_screen_brightness_float", exit_code: 0, command_duration_ms: 4 },
          { method: "dumpsys_display", exit_code: 0, command_duration_ms: 5 }
        ]
      },
      verify: {
        policy: "display_brightness_state_parse",
        ok: true,
        attempts: 1,
        reason: "parsed display brightness settings and display service brightness fields without exposing raw dumpsys display output"
      },
      semantics: "read_only_display_brightness_state_not_visual_luminance"
    });
    expect(driver.getDeviceBrightnessState).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });
});

describe("device animations runtime", () => {
  it("returns a read-only animation scale probe with resolved serial", async () => {
    const driver = makeDriver([]);
    driver.getDeviceAnimationsState.mockResolvedValueOnce(
      animationsDriverResult({
        serial: "resolved-serial",
        settings: {
          window_animation_scale: { raw: "1.0", value: 1 },
          transition_animation_scale: { raw: "0.5", value: 0.5 },
          animator_duration_scale: { raw: null, value: null }
        },
        queries: {
          window: { exitCode: 0, durationMs: 1 },
          transition: { exitCode: 0, durationMs: 2 },
          animator: { exitCode: 0, durationMs: 3 }
        }
      })
    );

    await expect(getDeviceAnimations(driver, { timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toEqual({
      device_serial: "resolved-serial",
      settings: {
        window_animation_scale: { raw: "1.0", value: 1 },
        transition_animation_scale: { raw: "0.5", value: 0.5 },
        animator_duration_scale: { raw: null, value: null }
      },
      animations_disabled: false,
      query: {
        sources: [
          { method: "settings_global_window_animation_scale", exit_code: 0, command_duration_ms: 1 },
          { method: "settings_global_transition_animation_scale", exit_code: 0, command_duration_ms: 2 },
          { method: "settings_global_animator_duration_scale", exit_code: 0, command_duration_ms: 3 }
        ]
      },
      verify: {
        policy: "animation_scale_settings_parse",
        ok: true,
        attempts: 1,
        reason: "parsed global Android animation scale settings without writing settings or observing runtime animation behavior"
      },
      semantics: "read_only_animation_scale_settings_not_runtime_animation_state"
    });
    expect(driver.getDeviceAnimationsState).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });

  it("reports animations disabled only when all animation scales are zero", async () => {
    const driver = makeDriver([]);
    driver.getDeviceAnimationsState.mockResolvedValueOnce(
      animationsDriverResult({
        settings: {
          window_animation_scale: { raw: "0", value: 0 },
          transition_animation_scale: { raw: "0", value: 0 },
          animator_duration_scale: { raw: "0.0", value: 0 }
        }
      })
    );

    await expect(getDeviceAnimations(driver, { timeout_ms: 1000 })).resolves.toMatchObject({
      animations_disabled: true
    });
  });

  it("sets animation scales with resolved serial and readback verification", async () => {
    const driver = makeDriver([]);
    driver.getDeviceAnimationsState
      .mockResolvedValueOnce(
        animationsDriverResult({
          serial: "resolved-serial",
          settings: {
            window_animation_scale: { raw: "1.0", value: 1 },
            transition_animation_scale: { raw: "1.0", value: 1 },
            animator_duration_scale: { raw: "1.0", value: 1 }
          }
        })
      )
      .mockResolvedValueOnce(
        animationsDriverResult({
          serial: "resolved-serial",
          settings: {
            window_animation_scale: { raw: "0.0", value: 0 },
            transition_animation_scale: { raw: "0", value: 0 },
            animator_duration_scale: { raw: "0", value: 0 }
          }
        })
      );
    driver.setDeviceAnimationScales.mockResolvedValueOnce(
      animationsSetDriverResult({
        serial: "resolved-serial",
        scale: 0,
        commands: {
          window: { exitCode: 0, durationMs: 1 },
          transition: { exitCode: 0, durationMs: 2 },
          animator: { exitCode: 0, durationMs: 3 }
        }
      })
    );

    await expect(
      setDeviceAnimations(driver, { scale: 0, timeout_ms: 1000, device_serial: "requested-serial" })
    ).resolves.toEqual({
      device_serial: "resolved-serial",
      requested: { scale: 0 },
      before: {
        settings: {
          window_animation_scale: { raw: "1.0", value: 1 },
          transition_animation_scale: { raw: "1.0", value: 1 },
          animator_duration_scale: { raw: "1.0", value: 1 }
        },
        animations_disabled: false
      },
      set: {
        sources: [
          { method: "settings_put_global_window_animation_scale", scale: 0, exit_code: 0, command_duration_ms: 1 },
          { method: "settings_put_global_transition_animation_scale", scale: 0, exit_code: 0, command_duration_ms: 2 },
          { method: "settings_put_global_animator_duration_scale", scale: 0, exit_code: 0, command_duration_ms: 3 }
        ]
      },
      after: {
        settings: {
          window_animation_scale: { raw: "0.0", value: 0 },
          transition_animation_scale: { raw: "0", value: 0 },
          animator_duration_scale: { raw: "0", value: 0 }
        },
        animations_disabled: true
      },
      changed: true,
      verify: {
        policy: "global_animation_scales_readback",
        ok: true,
        attempts: 1,
        reason: "settings get global readback reported the requested scale for all three Android animation settings"
      },
      semantics: "device_wide_global_animation_scale_settings_not_runtime_animation_state"
    });
    expect(driver.setDeviceAnimationScales).toHaveBeenCalledWith({
      scale: 0,
      deviceSerial: "resolved-serial",
      timeoutMs: 1000
    });
    expect(driver.getDeviceAnimationsState).toHaveBeenNthCalledWith(2, {
      deviceSerial: "resolved-serial",
      timeoutMs: 1000
    });
  });

  it("reports no-op animation scale sets as verified but unchanged", async () => {
    const driver = makeDriver([]);
    driver.getDeviceAnimationsState
      .mockResolvedValueOnce(animationsDriverResult({ serial: "resolved-serial" }))
      .mockResolvedValueOnce(animationsDriverResult({ serial: "resolved-serial" }));
    driver.setDeviceAnimationScales.mockResolvedValueOnce(
      animationsSetDriverResult({ serial: "resolved-serial", scale: 1 })
    );

    await expect(setDeviceAnimations(driver, { scale: 1, timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toMatchObject({
      device_serial: "resolved-serial",
      requested: { scale: 1 },
      changed: false,
      verify: { policy: "global_animation_scales_readback", ok: true, attempts: 1 }
    });
  });

  it("fails verification when animation scale readback does not match", async () => {
    const driver = makeDriver([]);
    driver.getDeviceAnimationsState
      .mockResolvedValueOnce(animationsDriverResult({ serial: "resolved-serial" }))
      .mockResolvedValueOnce(
        animationsDriverResult({
          serial: "resolved-serial",
          settings: {
            window_animation_scale: { raw: "1.0", value: 1 },
            transition_animation_scale: { raw: "1.0", value: 1 },
            animator_duration_scale: { raw: "1.0", value: 1 }
          }
        })
      );
    driver.setDeviceAnimationScales.mockResolvedValueOnce(
      animationsSetDriverResult({ serial: "resolved-serial", scale: 0 })
    );

    await expect(
      setDeviceAnimations(driver, { scale: 0, timeout_ms: 1000, device_serial: "emulator-5554" })
    ).rejects.toMatchObject({
      code: "VERIFY_FAILED",
      details: {
        expected: { scale: 0 },
        device_serial: "resolved-serial",
        attempts: 1
      }
    });
  });
});

describe("device accessibility runtime", () => {
  it("returns a read-only accessibility settings probe with resolved serial", async () => {
    const driver = makeDriver([]);
    driver.getDeviceAccessibilityState.mockResolvedValueOnce(
      accessibilityDriverResult({
        serial: "resolved-serial",
        settings: {
          accessibility_enabled: { raw: "1", value: true },
          touch_exploration_enabled: { raw: "0", value: false },
          enabled_accessibility_services: {
            raw: "com.example/.ReaderService",
            services: ["com.example/.ReaderService"],
            count: 1
          }
        },
        queries: {
          accessibilityEnabled: { exitCode: 0, durationMs: 1 },
          touchExplorationEnabled: { exitCode: 0, durationMs: 2 },
          enabledAccessibilityServices: { exitCode: 0, durationMs: 3 }
        }
      })
    );

    await expect(getDeviceAccessibility(driver, { timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toEqual({
      device_serial: "resolved-serial",
      settings: {
        accessibility_enabled: { raw: "1", value: true },
        touch_exploration_enabled: { raw: "0", value: false },
        enabled_accessibility_services: {
          raw: "com.example/.ReaderService",
          services: ["com.example/.ReaderService"],
          count: 1
        }
      },
      query: {
        sources: [
          { method: "settings_secure_accessibility_enabled", exit_code: 0, command_duration_ms: 1 },
          { method: "settings_secure_touch_exploration_enabled", exit_code: 0, command_duration_ms: 2 },
          { method: "settings_secure_enabled_accessibility_services", exit_code: 0, command_duration_ms: 3 }
        ]
      },
      verify: {
        policy: "accessibility_secure_settings_parse",
        ok: true,
        attempts: 1,
        reason: "parsed secure Android accessibility settings without inspecting live accessibility service state or accessibility nodes"
      },
      semantics: "read_only_secure_accessibility_settings_not_runtime_accessibility_node_state"
    });
    expect(driver.getDeviceAccessibilityState).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });
});

describe("device ensure-ready runtime", () => {
  it("returns immediately when the device is already awake and unlocked", async () => {
    const driver = makeDriver([]);

    await expect(
      ensureDeviceReady(driver, {
        dismiss_keyguard: true,
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      device_serial: "emulator-5554",
      wake: { attempted: false },
      dismiss_keyguard: { attempted: false },
      verify: { ok: true, reason: "device was already ready" }
    });
    expect(driver.wakeDevice).not.toHaveBeenCalled();
    expect(driver.dismissKeyguard).not.toHaveBeenCalled();
  });

  it("wakes and dismisses keyguard before reporting readiness", async () => {
    const driver = makeDriver([]);
    driver.getDeviceReadyState
      .mockResolvedValueOnce(readyState({ awake: false, interactive: false, wakefulness: "Asleep", display_power_state: "OFF", keyguard_showing: true }))
      .mockResolvedValueOnce(readyState());

    await expect(
      ensureDeviceReady(driver, {
        dismiss_keyguard: true,
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).resolves.toMatchObject({
      wake: { attempted: true, keycode: "KEYCODE_WAKEUP", command_duration_ms: 1 },
      dismiss_keyguard: { attempted: true, method: "wm_dismiss_keyguard", exit_code: 0 },
      verify: { ok: true, attempts: 1, reason: "device is awake and keyguard is not showing" }
    });
    const wakeOptions = driver.wakeDevice.mock.calls[0]?.[0] as { deviceSerial?: string; timeoutMs: number } | undefined;
    const dismissOptions = driver.dismissKeyguard.mock.calls[0]?.[0] as { deviceSerial?: string; timeoutMs: number } | undefined;
    expect(wakeOptions?.deviceSerial).toBe("emulator-5554");
    expect(dismissOptions?.deviceSerial).toBe("emulator-5554");
    expect(wakeOptions?.timeoutMs).toBeLessThanOrEqual(1000);
    expect(dismissOptions?.timeoutMs).toBeLessThanOrEqual(1000);
  });

  it("passes remaining readiness budget to follow-up adb commands", async () => {
    const driver = makeDriver([]);
    driver.getDeviceReadyState
      .mockImplementationOnce(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 20);
        });
        return readyState({ awake: false, interactive: false, wakefulness: "Asleep", display_power_state: "OFF", keyguard_showing: true });
      })
      .mockResolvedValueOnce(readyState());

    await expect(
      ensureDeviceReady(driver, {
        dismiss_keyguard: false,
        timeout_ms: 800
      })
    ).resolves.toMatchObject({
      wake: { attempted: true },
      dismiss_keyguard: { attempted: false },
      verify: { ok: true }
    });

    const wakeOptions = driver.wakeDevice.mock.calls[0]?.[0] as { timeoutMs: number } | undefined;
    const verifyOptions = driver.getDeviceReadyState.mock.calls[1]?.[0] as { timeoutMs: number } | undefined;
    expect(wakeOptions?.timeoutMs).toBeLessThan(800);
    expect(verifyOptions?.timeoutMs).toBeLessThan(800);
  });

  it("fails clearly when a secure keyguard remains visible", async () => {
    const driver = makeDriver([]);
    driver.getDeviceReadyState.mockResolvedValue(readyState({ keyguard_showing: true, keyguard_secure: true }));

    await expect(
      ensureDeviceReady(driver, {
        dismiss_keyguard: true,
        timeout_ms: 50
      })
    ).rejects.toMatchObject({
      code: "SCREEN_LOCKED",
      retriable: true,
      details: {
        dismiss_keyguard_requested: true,
        after: { keyguard_showing: true, keyguard_secure: true }
      }
    });
  });
});
