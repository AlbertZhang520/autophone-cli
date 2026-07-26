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
  deviceDetailsFixture,
  emptyGraphicsSummary,
  emptyMemorySnapshot,
  graphicsDriverResult,
  graphicsSummary,
  imeDriverResult,
  localeDriverResult,
  makeDriver,
  makeIo,
  memoryDriverResult,
  memorySnapshot,
  networkDriverResult,
  notificationsDriverResult,
  orientationDriverResult,
  packageInfoDriverResult,
  packageInfoRecord,
  pngFixture,
  readyState,
  resolveUrlDriverResult,
  ringerDriverResult,
  screenDriverResult,
  snapshot,
  storageDriverResult,
  timeDriverResult,
  userRotationPolicy
} from "./main-test-utils.test-support.js";describe("CLI JSON output", () => {

  it("writes device battery get JSON with telemetry warning", async () => {
    const driver = makeDriver([]);
    driver.getDeviceBatteryState.mockResolvedValueOnce(
      batteryDriverResult({
        serial: "resolved-serial",
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
        },
        exitCode: 0,
        durationMs: 7
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "battery", "get"], {
      io,
      requestIdFactory: () => "req-device-battery-get",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getDeviceBatteryState).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.battery_get",
      device: { serial: "resolved-serial" },
      warnings: [
        "device battery get reports a point-in-time BatteryService snapshot; it does not control charging or calibrate battery health"
      ],
      result: {
        device_serial: "resolved-serial",
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
        },
        query: {
          method: "dumpsys_battery",
          exit_code: 0,
          command_duration_ms: 7
        },
        verify: { policy: "dumpsys_battery_parse", ok: true, attempts: 1 },
        semantics: "read_only_battery_snapshot_not_charge_control_or_health_calibration"
      },
      trace: {
        timeout_ms: 10_000,
        method: "dumpsys battery",
        level_percent: 98,
        present: true
      }
    });
  });

  it("writes device time get JSON with clock warning", async () => {
    const driver = makeDriver([]);
    driver.getDeviceTimeState.mockResolvedValueOnce(
      timeDriverResult({
        serial: "resolved-serial",
        queries: {
          date: { exitCode: 0, durationMs: 1 },
          autoTime: { exitCode: 0, durationMs: 2 },
          autoTimeZone: { exitCode: 0, durationMs: 3 },
          settingsTimeZone: { exitCode: 0, durationMs: 4 },
          persistSysTimeZone: { exitCode: 0, durationMs: 5 }
        }
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "time", "get"], {
      io,
      requestIdFactory: () => "req-device-time-get",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getDeviceTimeState).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.time_get",
      device: { serial: "resolved-serial" },
      warnings: [
        "device time get reports a point-in-time Android clock snapshot; it does not prove NTP sync, alarm delivery, or scheduler behavior"
      ],
      result: {
        device_serial: "resolved-serial",
        time: {
          unix_epoch_seconds: 1_782_800_012,
          timezone_offset: "+08:00",
          timezone_offset_minutes: 480
        },
        settings: {
          auto_time: true,
          auto_time_zone: true
        },
        timezone: {
          id: "Asia/Shanghai",
          source: "persist_sys_timezone",
          sources: {
            settings_global_time_zone: null,
            persist_sys_timezone: "Asia/Shanghai"
          }
        },
        query: {
          sources: [
            { method: "date_unix_epoch_offset", exit_code: 0, command_duration_ms: 1 },
            { method: "settings_global_auto_time", exit_code: 0, command_duration_ms: 2 },
            { method: "settings_global_auto_time_zone", exit_code: 0, command_duration_ms: 3 },
            { method: "settings_global_time_zone", exit_code: 0, command_duration_ms: 4 },
            { method: "getprop_persist_sys_timezone", exit_code: 0, command_duration_ms: 5 }
          ]
        },
        verify: { policy: "device_time_sources_parse", ok: true, attempts: 1 },
        semantics: "read_only_device_time_snapshot_not_ntp_or_scheduler_guarantee"
      },
      trace: {
        timeout_ms: 10_000,
        unix_epoch_seconds: 1_782_800_012,
        timezone_source: "persist_sys_timezone",
        auto_time: true,
        auto_time_zone: true
      }
    });
  });

  it("writes device locale get JSON with source warnings", async () => {
    const driver = makeDriver([]);
    driver.getDeviceLocaleState.mockResolvedValueOnce(
      localeDriverResult({
        sources: {
          system_locales: null,
          persist_sys_locale: "POSIX",
          ro_product_locale: "zh_CN",
          ro_product_locale_language: null,
          ro_product_locale_region: null
        },
        queries: {
          systemLocales: { exitCode: 0, durationMs: 1 },
          persistSysLocale: { exitCode: 0, durationMs: 2 },
          roProductLocale: { exitCode: 0, durationMs: 3 },
          roProductLocaleLanguage: { exitCode: 0, durationMs: 4 },
          roProductLocaleRegion: { exitCode: 0, durationMs: 5 }
        }
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "locale", "get"], {
      io,
      requestIdFactory: () => "req-device-locale-get",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getDeviceLocaleState).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.locale_get",
      device: { serial: "emulator-5554" },
      warnings: [
        "device locale get reports Android system and product locale sources only; it does not prove per-app language, rendered translation, or Locale.getDefault() inside an app"
      ],
      result: {
        device_serial: "emulator-5554",
        locales: [{ tag: "zh-CN", base_name: "zh-CN", language: "zh", script: null, region: "CN" }],
        locales_count: 1,
        primary_locale: { tag: "zh-CN", base_name: "zh-CN", language: "zh", script: null, region: "CN" },
        selected_source: "ro_product_locale",
        sources: {
          system_locales: null,
          persist_sys_locale: "POSIX",
          ro_product_locale: "zh_CN",
          ro_product_locale_language: null,
          ro_product_locale_region: null
        },
        invalid_sources: [
          {
            source: "persist_sys_locale",
            index: null,
            value: "POSIX",
            reason: "legacy locale sentinel is not a BCP 47 locale"
          }
        ],
        query: {
          sources: [
            { method: "settings_system_system_locales", exit_code: 0, command_duration_ms: 1 },
            { method: "getprop_persist_sys_locale", exit_code: 0, command_duration_ms: 2 },
            { method: "getprop_ro_product_locale", exit_code: 0, command_duration_ms: 3 },
            { method: "getprop_ro_product_locale_language", exit_code: 0, command_duration_ms: 4 },
            { method: "getprop_ro_product_locale_region", exit_code: 0, command_duration_ms: 5 }
          ]
        },
        verify: { policy: "locale_sources_parse", ok: true, attempts: 1 },
        semantics: "read_only_locale_state_not_app_language_or_translation"
      },
      trace: {
        timeout_ms: 10_000,
        selected_source: "ro_product_locale",
        locales_count: 1,
        invalid_source_count: 1
      }
    });
  });

  it("writes device ime get JSON without exposing raw input method dumps", async () => {
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
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "ime", "get"], {
      io,
      requestIdFactory: () => "req-device-ime-get",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getDeviceImeState).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "device.ime_get",
      device: { serial: "emulator-5554" },
      warnings: [
        "device ime get reports InputMethodManagerService state only; it does not prove keyboard geometry, focused-field text, or text entry readiness"
      ],
      result: {
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
        verify: { policy: "input_method_service_parse", ok: true, attempts: 1 },
        semantics: "read_only_ime_state_not_keyboard_geometry"
      },
      trace: {
        timeout_ms: 10_000,
        sources: [
          "dumpsys input_method",
          "settings get secure default_input_method",
          "settings get secure enabled_input_methods"
        ]
      }
    });
    expect(io.stdoutText()).not.toContain("mCurFocusedWindow");
    expect(io.stdoutText()).not.toContain("mServedView");
  });

  it("writes device brightness get JSON without exposing raw display dumps", async () => {
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
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "brightness", "get"], {
      io,
      requestIdFactory: () => "req-device-brightness-get",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getDeviceBrightnessState).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "device.brightness_get",
      device: { serial: "emulator-5554" },
      warnings: [
        "device brightness get reports Android brightness settings and display service state only; it does not prove visual luminance, screenshot exposure, or ambient light"
      ],
      result: {
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
        verify: { policy: "display_brightness_state_parse", ok: true, attempts: 1 },
        semantics: "read_only_display_brightness_state_not_visual_luminance"
      },
      trace: {
        timeout_ms: 10_000,
        sources: [
          "settings get system screen_brightness",
          "settings get system screen_brightness_mode",
          "settings get system screen_auto_brightness_adj",
          "settings get system screen_brightness_float",
          "dumpsys display"
        ]
      }
    });
    expect(io.stdoutText()).not.toContain("uniqueId");
    expect(io.stdoutText()).not.toContain("deviceProductInfo");
  });

  it("writes device animations get JSON for global animation scale settings", async () => {
    const driver = makeDriver([]);
    driver.getDeviceAnimationsState.mockResolvedValueOnce(
      animationsDriverResult({
        serial: "resolved-serial",
        settings: {
          window_animation_scale: { raw: "0", value: 0 },
          transition_animation_scale: { raw: "0.0", value: 0 },
          animator_duration_scale: { raw: "0", value: 0 }
        },
        queries: {
          window: { exitCode: 0, durationMs: 1 },
          transition: { exitCode: 0, durationMs: 2 },
          animator: { exitCode: 0, durationMs: 3 }
        }
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "animations", "get"], {
      io,
      requestIdFactory: () => "req-device-animations-get",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getDeviceAnimationsState).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.animations_get",
      request_id: "req-device-animations-get",
      device: { serial: "resolved-serial" },
      warnings: [
        "device animations get reports global Android animation scale settings, not proof of actual app animation timing or rendered motion"
      ],
      result: {
        device_serial: "resolved-serial",
        settings: {
          window_animation_scale: { raw: "0", value: 0 },
          transition_animation_scale: { raw: "0.0", value: 0 },
          animator_duration_scale: { raw: "0", value: 0 }
        },
        animations_disabled: true,
        query: {
          sources: [
            { method: "settings_global_window_animation_scale", exit_code: 0, command_duration_ms: 1 },
            { method: "settings_global_transition_animation_scale", exit_code: 0, command_duration_ms: 2 },
            { method: "settings_global_animator_duration_scale", exit_code: 0, command_duration_ms: 3 }
          ]
        },
        verify: { policy: "animation_scale_settings_parse", ok: true, attempts: 1 },
        semantics: "read_only_animation_scale_settings_not_runtime_animation_state"
      },
      trace: {
        timeout_ms: 10_000,
        sources: [
          "settings get global window_animation_scale",
          "settings get global transition_animation_scale",
          "settings get global animator_duration_scale"
        ]
      }
    });
  });

  it("writes device animations set JSON with readback verification", async () => {
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
            window_animation_scale: { raw: "1", value: 1 },
            transition_animation_scale: { raw: "1.0", value: 1 },
            animator_duration_scale: { raw: "1.0", value: 1 }
          }
        })
      );
    driver.setDeviceAnimationScales.mockResolvedValueOnce(
      animationsSetDriverResult({
        serial: "resolved-serial",
        scale: 1,
        commands: {
          window: { exitCode: 0, durationMs: 1 },
          transition: { exitCode: 0, durationMs: 2 },
          animator: { exitCode: 0, durationMs: 3 }
        }
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "animations", "set", "--scale", "1.0"], {
      io,
      requestIdFactory: () => "req-device-animations-set",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.setDeviceAnimationScales).toHaveBeenCalledWith({
      scale: 1,
      deviceSerial: "resolved-serial",
      timeoutMs: 10_000
    });
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.animations_set",
      request_id: "req-device-animations-set",
      device: { serial: "resolved-serial" },
      warnings: [
        "device animations set mutates device-wide global animation scale settings and does not roll back automatically",
        "if one of the three settings writes fails, earlier settings may already have changed",
        "readback verification confirms stored settings values only; it does not prove actual app animation timing or rendered motion"
      ],
      result: {
        device_serial: "resolved-serial",
        requested: { scale: 1 },
        before: {
          settings: {
            window_animation_scale: { raw: "1.0", value: 1 },
            transition_animation_scale: { raw: "1.0", value: 1 },
            animator_duration_scale: { raw: "1.0", value: 1 }
          },
          animations_disabled: false
        },
        after: {
          settings: {
            window_animation_scale: { raw: "1", value: 1 },
            transition_animation_scale: { raw: "1.0", value: 1 },
            animator_duration_scale: { raw: "1.0", value: 1 }
          },
          animations_disabled: false
        },
        changed: false,
        verify: { policy: "global_animation_scales_readback", ok: true, attempts: 1 },
        semantics: "device_wide_global_animation_scale_settings_not_runtime_animation_state"
      },
      trace: {
        timeout_ms: 10_000,
        method: "settings put global",
        scale: 1,
        verify_policy: "global_animation_scales_readback"
      }
    });
  });

  it("requires explicit serial for device animations set before driver creation", async () => {
    const driverFactory = vi.fn(() => makeDriver([]));
    const io = makeIo();
    const exitCode = await runCli(["device", "animations", "set", "--scale", "1"], {
      io,
      requestIdFactory: () => "req-device-animations-set-missing-serial",
      driverFactory
    });

    expect(exitCode).toBe(2);
    expect(driverFactory).not.toHaveBeenCalled();
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: false,
      command: "device.animations_set",
      request_id: "req-device-animations-set-missing-serial",
      error: {
        code: "INVALID_REQUEST",
        message: "device animations set requires explicit --serial"
      }
    });
  });

  it("writes device accessibility get JSON for secure accessibility settings", async () => {
    const driver = makeDriver([]);
    driver.getDeviceAccessibilityState.mockResolvedValueOnce(
      accessibilityDriverResult({
        serial: "resolved-serial",
        settings: {
          accessibility_enabled: { raw: "1", value: true },
          touch_exploration_enabled: { raw: "0", value: false },
          enabled_accessibility_services: {
            raw: "com.example/.ReaderService:com.android.talkback/com.android.talkback.TalkBackService",
            services: ["com.example/.ReaderService", "com.android.talkback/com.android.talkback.TalkBackService"],
            count: 2
          }
        },
        queries: {
          accessibilityEnabled: { exitCode: 0, durationMs: 1 },
          touchExplorationEnabled: { exitCode: 0, durationMs: 2 },
          enabledAccessibilityServices: { exitCode: 0, durationMs: 3 }
        }
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "accessibility", "get"], {
      io,
      requestIdFactory: () => "req-device-accessibility-get",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getDeviceAccessibilityState).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.accessibility_get",
      request_id: "req-device-accessibility-get",
      device: { serial: "resolved-serial" },
      warnings: [
        "device accessibility get reports stored secure accessibility settings, not proof of live accessibility service health or accessibility node state"
      ],
      result: {
        device_serial: "resolved-serial",
        settings: {
          accessibility_enabled: { raw: "1", value: true },
          touch_exploration_enabled: { raw: "0", value: false },
          enabled_accessibility_services: {
            services: ["com.example/.ReaderService", "com.android.talkback/com.android.talkback.TalkBackService"],
            count: 2
          }
        },
        query: {
          sources: [
            { method: "settings_secure_accessibility_enabled", exit_code: 0, command_duration_ms: 1 },
            { method: "settings_secure_touch_exploration_enabled", exit_code: 0, command_duration_ms: 2 },
            { method: "settings_secure_enabled_accessibility_services", exit_code: 0, command_duration_ms: 3 }
          ]
        },
        verify: { policy: "accessibility_secure_settings_parse", ok: true, attempts: 1 },
        semantics: "read_only_secure_accessibility_settings_not_runtime_accessibility_node_state"
      },
      trace: {
        timeout_ms: 10_000,
        sources: [
          "settings get secure accessibility_enabled",
          "settings get secure touch_exploration_enabled",
          "settings get secure enabled_accessibility_services"
        ]
      }
    });
  });

  it("writes device ensure-ready JSON and skips wake when already ready", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "ensure-ready"], {
      io,
      requestIdFactory: () => "req-device-ready",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getDeviceReadyState).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    expect(driver.wakeDevice).not.toHaveBeenCalled();
    expect(driver.dismissKeyguard).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "device.ensure_ready",
      device: { serial: "emulator-5554" },
      result: {
        device_serial: "emulator-5554",
        wake: { attempted: false, keycode: "KEYCODE_WAKEUP" },
        dismiss_keyguard: { attempted: false, method: "wm_dismiss_keyguard" },
        verify: { ok: true }
      },
      trace: {
        timeout_ms: 10_000,
        dismiss_keyguard_requested: true
      }
    });
  });

  it("maps locked device readiness failures into a JSON envelope", async () => {
    const driver = makeDriver([]);
    driver.getDeviceReadyState.mockResolvedValue(readyState({ keyguard_showing: true, keyguard_secure: true }));
    const io = makeIo();
    const exitCode = await runCli(["--timeout", "50", "device", "ensure-ready", "--no-dismiss-keyguard"], {
      io,
      requestIdFactory: () => "req-device-ready-locked",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.dismissKeyguard).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "device.ensure_ready",
      error: {
        code: "SCREEN_LOCKED",
        details: {
          dismiss_keyguard_requested: false,
          after: { keyguard_showing: true, keyguard_secure: true }
        }
      }
    });
  });
});
