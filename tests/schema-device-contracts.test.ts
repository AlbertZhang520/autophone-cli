import { describe, expect, it } from "vitest";
import {
  appActivityRecord,
  appGraphicsSummary,
  appMemorySnapshot,
  appPackageInfoRecord,
  createAjv,
  emptyAppGraphicsSummary,
  emptyAppMemorySnapshot,
  join,
  readFile
} from "./schema-test-utils.js";
import {
  AppActivitiesRequestSchema,
  AppActivitiesResultSchema,
  AppClearDataRequestSchema,
  AppClearDataResultSchema,
  AppCurrentResultSchema,
  AppGraphicsRequestSchema,
  AppGraphicsResultSchema,
  AppInstallRequestSchema,
  AppInstallResultSchema,
  AppInspectRequestSchema,
  AppInspectResultSchema,
  AppLaunchResultSchema,
  AppListResultSchema,
  AppLinksRequestSchema,
  AppLinksResultSchema,
  AppOpsGetRequestSchema,
  AppOpsGetResultSchema,
  AppOpenUrlRequestSchema,
  AppOpenUrlResultSchema,
  AppResolveUrlRequestSchema,
  AppResolveUrlResultSchema,
  AppPackageInfoRequestSchema,
  AppPackageInfoResultSchema,
  AppPermissionInspectRequestSchema,
  AppPermissionInspectResultSchema,
  AppPermissionRequestSchema,
  AppPermissionResultSchema,
  AppMemoryRequestSchema,
  AppMemoryResultSchema,
  AppPidsRequestSchema,
  AppPidsResultSchema,
  AppStopResultSchema,
  AppStartResultSchema,
  AppUninstallRequestSchema,
  AppUninstallResultSchema,
  DeviceBatteryGetRequestSchema,
  DeviceBatteryGetResultSchema,
  DeviceTimeGetRequestSchema,
  DeviceTimeGetResultSchema,
  DeviceCurrentUserRequestSchema,
  DeviceCurrentUserResultSchema,
  DeviceAccessibilityGetRequestSchema,
  DeviceAccessibilityGetResultSchema,
  DeviceAnimationsGetRequestSchema,
  DeviceAnimationsGetResultSchema,
  DeviceAnimationsSetRequestSchema,
  DeviceAnimationsSetResultSchema,
  DeviceBrightnessGetRequestSchema,
  DeviceBrightnessGetResultSchema,
  DeviceDetailsResultSchema,
  DeviceEnsureReadyRequestSchema,
  DeviceEnsureReadyResultSchema,
  DeviceImeGetRequestSchema,
  DeviceImeGetResultSchema,
  DeviceLocaleGetRequestSchema,
  DeviceLocaleGetResultSchema,
  DeviceListResultSchema,
  DeviceNetworkGetRequestSchema,
  DeviceNetworkGetResultSchema,
  DeviceStorageGetRequestSchema,
  DeviceStorageGetResultSchema,
  DeviceNotificationsRequestSchema,
  DeviceNotificationsResultSchema,
  DeviceOrientationRequestSchema,
  DeviceOrientationSetRequestSchema,
  DeviceOrientationSetResultSchema,
  DeviceOrientationResultSchema,
  DeviceRingerGetRequestSchema,
  DeviceRingerGetResultSchema,
  DeviceScreenGetRequestSchema,
  DeviceScreenGetResultSchema,
  DeviceStatusBarIconsRequestSchema,
  DeviceStatusBarIconsResultSchema,
  DeviceStatusBarRequestSchema,
  DeviceStatusBarResultSchema,
  DeviceUsersRequestSchema,
  DeviceUsersResultSchema,
  DeviceVolumeGetRequestSchema,
  DeviceVolumeGetResultSchema,
  DoubleTapRequestSchema,
  DoubleTapResultSchema,
  DragRequestSchema,
  DragResultSchema,
  FileCopyRequestSchema,
  FileCopyResultSchema,
  FileHashRequestSchema,
  FileHashResultSchema,
  FileListRequestSchema,
  FileListResultSchema,
  FileMkdirRequestSchema,
  FileMkdirResultSchema,
  FileMoveRequestSchema,
  FileMoveResultSchema,
  FilePullRequestSchema,
  FilePullResultSchema,
  FilePushRequestSchema,
  FilePushResultSchema,
  FileRmRequestSchema,
  FileRmResultSchema,
  FileStatRequestSchema,
  FileStatResultSchema,
  FindResultSchema,
  KeyPressRequestSchema,
  KeyPressResultSchema,
  LongPressRequestSchema,
  LongPressResultSchema,
  LogsDumpRequestSchema,
  LogsDumpResultSchema,
  ObserveResultSchema,
  ResponseEnvelopeSchema,
  ScreenrecordRequestSchema,
  ScreenrecordResultSchema,
  ScreenshotResultSchema,
  ScrollRequestSchema,
  ScrollResultSchema,
  ScrollUntilRequestSchema,
  ScrollUntilResultSchema,
  TapRequestSchema,
  TextClearRequestSchema,
  TextClearResultSchema,
  TextInputRequestSchema,
  TextInputResultSchema,
  WaitAppResultSchema,
  WaitUiRequestSchema,
  WaitUiResultSchema
} from "../src/contracts/index.js";

describe("generated JSON schemas: device contracts", () => {
  it("defaults device ensure-ready request safety flags", () => {
    expect(DeviceEnsureReadyRequestSchema.parse({})).toMatchObject({
      dismiss_keyguard: true,
      timeout_ms: 10_000
    });
    expect(
      DeviceEnsureReadyRequestSchema.parse({
        dismiss_keyguard: false,
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).toEqual({
      dismiss_keyguard: false,
      timeout_ms: 1000,
      device_serial: "emulator-5554"
    });
    expect(() => DeviceEnsureReadyRequestSchema.parse({ timeout_ms: 0 })).toThrow();
  });

  it("defaults device screen get request routing", () => {
    expect(DeviceScreenGetRequestSchema.parse({})).toEqual({ timeout_ms: 10_000 });
    expect(DeviceScreenGetRequestSchema.parse({ device_serial: "emulator-5554", timeout_ms: 1000 })).toEqual({
      device_serial: "emulator-5554",
      timeout_ms: 1000
    });
    expect(() => DeviceScreenGetRequestSchema.parse({ timeout_ms: 0 })).toThrow();
    expect(() => DeviceScreenGetRequestSchema.parse({ device_serial: "" })).toThrow();
  });

  it("defaults device network get request routing", () => {
    expect(DeviceNetworkGetRequestSchema.parse({})).toEqual({ timeout_ms: 10_000 });
    expect(DeviceNetworkGetRequestSchema.parse({ device_serial: "emulator-5554", timeout_ms: 1000 })).toEqual({
      device_serial: "emulator-5554",
      timeout_ms: 1000
    });
    expect(() => DeviceNetworkGetRequestSchema.parse({ timeout_ms: 0 })).toThrow();
    expect(() => DeviceNetworkGetRequestSchema.parse({ device_serial: "" })).toThrow();
  });

  it("defaults device storage get request routing", () => {
    expect(DeviceStorageGetRequestSchema.parse({})).toEqual({ timeout_ms: 10_000 });
    expect(DeviceStorageGetRequestSchema.parse({ device_serial: "emulator-5554", timeout_ms: 1000 })).toEqual({
      device_serial: "emulator-5554",
      timeout_ms: 1000
    });
    expect(() => DeviceStorageGetRequestSchema.parse({ timeout_ms: 0 })).toThrow();
    expect(() => DeviceStorageGetRequestSchema.parse({ device_serial: "" })).toThrow();
  });

  it("validates device storage result structure and statfs byte math", () => {
    const result = {
      device_serial: "emulator-5554",
      entries: [
        {
          role: "data",
          path: "/data",
          ok: true,
          filesystem_type: "f2fs",
          block_size_bytes: 4096,
          total_blocks: 100,
          available_blocks: 60,
          free_blocks: 70,
          total_bytes: 409_600,
          available_bytes: 245_760,
          free_bytes: 286_720,
          used_bytes: 122_880
        },
        {
          role: "shared",
          path: "/sdcard",
          ok: false,
          error: { reason: "statfs_failed", message: "No such file or directory" }
        },
        {
          role: "tmp",
          path: "/data/local/tmp",
          ok: true,
          filesystem_type: "0x65735546",
          block_size_bytes: 4096,
          total_blocks: 100,
          available_blocks: 60,
          free_blocks: 70,
          total_bytes: 409_600,
          available_bytes: 245_760,
          free_bytes: 286_720,
          used_bytes: 122_880
        }
      ],
      entry_count: 3,
      ok_count: 2,
      unavailable_count: 1,
      query: {
        method: "statfs_paths",
        paths: ["/data", "/sdcard", "/data/local/tmp"],
        exit_code: 1,
        command_duration_ms: 8
      },
      verify: {
        policy: "statfs_storage_parse",
        ok: true,
        attempts: 1,
        reason: "parsed statfs capacity for at least one fixed storage role; unavailable roles carry per-entry errors"
      },
      semantics: "read_only_storage_capacity_snapshot_not_quota_or_write_permission"
    };

    expect(DeviceStorageGetResultSchema.parse(result)).toMatchObject({
      entry_count: 3,
      ok_count: 2,
      unavailable_count: 1
    });
    expect(() =>
      DeviceStorageGetResultSchema.parse({
        ...result,
        entries: [
          { ...result.entries[0], total_bytes: 1 },
          result.entries[1],
          result.entries[2]
        ]
      })
    ).toThrow();
    expect(() =>
      DeviceStorageGetResultSchema.parse({
        ...result,
        entries: [
          { ...result.entries[0], path: "/sdcard" },
          result.entries[1],
          result.entries[2]
        ]
      })
    ).toThrow();
    expect(() => DeviceStorageGetResultSchema.parse({ ...result, ok_count: 3 })).toThrow();
  });

  it("defaults device battery get request routing", () => {
    expect(DeviceBatteryGetRequestSchema.parse({})).toEqual({ timeout_ms: 10_000 });
    expect(DeviceBatteryGetRequestSchema.parse({ device_serial: "emulator-5554", timeout_ms: 1000 })).toEqual({
      device_serial: "emulator-5554",
      timeout_ms: 1000
    });
    expect(() => DeviceBatteryGetRequestSchema.parse({ timeout_ms: 0 })).toThrow();
    expect(() => DeviceBatteryGetRequestSchema.parse({ device_serial: "" })).toThrow();
  });

  it("validates device battery get result structure", () => {
    const result = {
      device_serial: "emulator-5554",
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
      verify: {
        policy: "dumpsys_battery_parse",
        ok: true,
        attempts: 1,
        reason: "parsed dumpsys battery snapshot without changing charge state"
      },
      semantics: "read_only_battery_snapshot_not_charge_control_or_health_calibration"
    };

    expect(DeviceBatteryGetResultSchema.parse(result)).toMatchObject({
      device_serial: "emulator-5554",
      battery: { level_percent: 98, health: "good", voltage_mv: 4373 }
    });
    expect(() => DeviceBatteryGetResultSchema.parse({ ...result, battery: { ...result.battery, level_percent: 101 } })).toThrow();
    expect(() => DeviceBatteryGetResultSchema.parse({ ...result, battery: { ...result.battery, health: "excellent" } })).toThrow();
  });

  it("defaults device time get request routing", () => {
    expect(DeviceTimeGetRequestSchema.parse({})).toEqual({ timeout_ms: 10_000 });
    expect(DeviceTimeGetRequestSchema.parse({ device_serial: "emulator-5554", timeout_ms: 1000 })).toEqual({
      device_serial: "emulator-5554",
      timeout_ms: 1000
    });
    expect(() => DeviceTimeGetRequestSchema.parse({ timeout_ms: 0 })).toThrow();
    expect(() => DeviceTimeGetRequestSchema.parse({ device_serial: "" })).toThrow();
  });

  it("validates device time get result structure", () => {
    const result = {
      device_serial: "emulator-5554",
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
      verify: {
        policy: "device_time_sources_parse",
        ok: true,
        attempts: 1,
        reason: "parsed Android wall-clock, timezone offset, and time settings without changing clock state"
      },
      semantics: "read_only_device_time_snapshot_not_ntp_or_scheduler_guarantee"
    };

    expect(DeviceTimeGetResultSchema.parse(result)).toMatchObject({
      time: { timezone_offset_minutes: 480 },
      timezone: { id: "Asia/Shanghai", source: "persist_sys_timezone" }
    });
    expect(() =>
      DeviceTimeGetResultSchema.parse({
        ...result,
        timezone: { ...result.timezone, id: null }
      })
    ).toThrow();
    expect(() =>
      DeviceTimeGetResultSchema.parse({
        ...result,
        timezone: { ...result.timezone, source: "settings_global_time_zone" }
      })
    ).toThrow();
    expect(() =>
      DeviceTimeGetResultSchema.parse({
        ...result,
        timezone: { ...result.timezone, id: "Europe/Paris" }
      })
    ).toThrow();
    expect(() =>
      DeviceTimeGetResultSchema.parse({
        ...result,
        time: { ...result.time, timezone_offset: "+0800" }
      })
    ).toThrow();
  });

  it("defaults device locale get request routing", () => {
    expect(DeviceLocaleGetRequestSchema.parse({})).toEqual({ timeout_ms: 10_000 });
    expect(DeviceLocaleGetRequestSchema.parse({ device_serial: "emulator-5554", timeout_ms: 1000 })).toEqual({
      device_serial: "emulator-5554",
      timeout_ms: 1000
    });
    expect(() => DeviceLocaleGetRequestSchema.parse({ timeout_ms: 0 })).toThrow();
    expect(() => DeviceLocaleGetRequestSchema.parse({ device_serial: "" })).toThrow();
  });

  it("validates device locale result structure and derived primary locale", () => {
    const locale = { tag: "zh-Hant-TW", base_name: "zh-Hant-TW", language: "zh", script: "Hant", region: "TW" };
    const result = {
      device_serial: "emulator-5554",
      locales: [locale],
      locales_count: 1,
      primary_locale: locale,
      selected_source: "system_locales",
      sources: {
        system_locales: "zh-Hant-TW",
        persist_sys_locale: "zh-CN",
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
      verify: {
        policy: "locale_sources_parse",
        ok: true,
        attempts: 1,
        reason: "parsed Android system locale sources without inferring app-specific language"
      },
      semantics: "read_only_locale_state_not_app_language_or_translation"
    };

    expect(DeviceLocaleGetResultSchema.parse(result)).toMatchObject({
      locales_count: 1,
      primary_locale: locale,
      selected_source: "system_locales"
    });
    expect(() => DeviceLocaleGetResultSchema.parse({ ...result, locales_count: 2 })).toThrow();
    expect(() =>
      DeviceLocaleGetResultSchema.parse({
        ...result,
        primary_locale: { ...locale, tag: "zh-CN", base_name: "zh-CN", script: null, region: "CN" }
      })
    ).toThrow();
    expect(() => DeviceLocaleGetResultSchema.parse({ ...result, selected_source: null })).toThrow();
    expect(
      DeviceLocaleGetResultSchema.parse({
        ...result,
        locales: [],
        locales_count: 0,
        primary_locale: null,
        selected_source: null
      })
    ).toMatchObject({ locales_count: 0, primary_locale: null, selected_source: null });
  });

  it("defaults device ime get request routing", () => {
    expect(DeviceImeGetRequestSchema.parse({})).toEqual({ timeout_ms: 10_000 });
    expect(DeviceImeGetRequestSchema.parse({ device_serial: "emulator-5554", timeout_ms: 1000 })).toEqual({
      device_serial: "emulator-5554",
      timeout_ms: 1000
    });
    expect(() => DeviceImeGetRequestSchema.parse({ timeout_ms: 0 })).toThrow();
    expect(() => DeviceImeGetRequestSchema.parse({ device_serial: "" })).toThrow();
  });

  it("defaults device brightness get request routing", () => {
    expect(DeviceBrightnessGetRequestSchema.parse({})).toEqual({ timeout_ms: 10_000 });
    expect(DeviceBrightnessGetRequestSchema.parse({ device_serial: "emulator-5554", timeout_ms: 1000 })).toEqual({
      device_serial: "emulator-5554",
      timeout_ms: 1000
    });
    expect(() => DeviceBrightnessGetRequestSchema.parse({ timeout_ms: 0 })).toThrow();
    expect(() => DeviceBrightnessGetRequestSchema.parse({ device_serial: "" })).toThrow();
  });

  it("defaults device animations get request routing", () => {
    expect(DeviceAnimationsGetRequestSchema.parse({})).toEqual({ timeout_ms: 10_000 });
    expect(DeviceAnimationsGetRequestSchema.parse({ device_serial: "emulator-5554", timeout_ms: 1000 })).toEqual({
      device_serial: "emulator-5554",
      timeout_ms: 1000
    });
    expect(() => DeviceAnimationsGetRequestSchema.parse({ timeout_ms: 0 })).toThrow();
    expect(() => DeviceAnimationsGetRequestSchema.parse({ device_serial: "" })).toThrow();
  });

  it("enforces device animations set request semantics", () => {
    expect(DeviceAnimationsSetRequestSchema.parse({ scale: 0.5, device_serial: "emulator-5554" })).toEqual({
      scale: 0.5,
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });
    expect(
      DeviceAnimationsSetRequestSchema.parse({
        scale: 0,
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).toEqual({
      scale: 0,
      timeout_ms: 1000,
      device_serial: "emulator-5554"
    });
    for (const request of [
      { scale: 1 },
      { scale: 0.25, device_serial: "emulator-5554" },
      { scale: 2, device_serial: "emulator-5554" },
      { scale: 1, timeout_ms: 0, device_serial: "emulator-5554" },
      { scale: 1, device_serial: "" }
    ]) {
      expect(() => DeviceAnimationsSetRequestSchema.parse(request)).toThrow();
    }
  });

  it("defaults device accessibility get request routing", () => {
    expect(DeviceAccessibilityGetRequestSchema.parse({})).toEqual({ timeout_ms: 10_000 });
    expect(DeviceAccessibilityGetRequestSchema.parse({ device_serial: "emulator-5554", timeout_ms: 1000 })).toEqual({
      device_serial: "emulator-5554",
      timeout_ms: 1000
    });
    expect(() => DeviceAccessibilityGetRequestSchema.parse({ timeout_ms: 0 })).toThrow();
    expect(() => DeviceAccessibilityGetRequestSchema.parse({ device_serial: "" })).toThrow();
  });

  it("defaults device current-user request routing", () => {
    expect(DeviceCurrentUserRequestSchema.parse({})).toEqual({ timeout_ms: 10_000 });
    expect(DeviceCurrentUserRequestSchema.parse({ device_serial: "emulator-5554", timeout_ms: 1000 })).toEqual({
      device_serial: "emulator-5554",
      timeout_ms: 1000
    });
    expect(() => DeviceCurrentUserRequestSchema.parse({ timeout_ms: 0 })).toThrow();
  });

  it("defaults device orientation request routing", () => {
    expect(DeviceOrientationRequestSchema.parse({})).toEqual({ timeout_ms: 10_000 });
    expect(DeviceOrientationRequestSchema.parse({ device_serial: "emulator-5554", timeout_ms: 1000 })).toEqual({
      device_serial: "emulator-5554",
      timeout_ms: 1000
    });
    expect(() => DeviceOrientationRequestSchema.parse({ timeout_ms: 0 })).toThrow();
  });

  it("enforces device orientation set request semantics", () => {
    expect(DeviceOrientationSetRequestSchema.parse({ mode: "auto", device_serial: "emulator-5554" })).toEqual({
      mode: "auto",
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });
    expect(
      DeviceOrientationSetRequestSchema.parse({
        mode: "lock",
        rotation_degrees: 90,
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).toEqual({
      mode: "lock",
      rotation_degrees: 90,
      timeout_ms: 1000,
      device_serial: "emulator-5554"
    });
    for (const request of [
      { mode: "auto" },
      { mode: "auto", rotation_degrees: 90, device_serial: "emulator-5554" },
      { mode: "lock", device_serial: "emulator-5554" },
      { mode: "lock", rotation_degrees: 45, device_serial: "emulator-5554" },
      { mode: "free", device_serial: "emulator-5554" },
      { mode: "lock", rotation_degrees: 90, timeout_ms: 0, device_serial: "emulator-5554" }
    ]) {
      expect(() => DeviceOrientationSetRequestSchema.parse(request)).toThrow();
    }
  });

  it("defaults device statusbar request routing and action semantics", () => {
    expect(DeviceStatusBarRequestSchema.parse({ action: "expand_notifications" })).toEqual({
      action: "expand_notifications",
      timeout_ms: 10_000
    });
    expect(
      DeviceStatusBarRequestSchema.parse({
        action: "collapse",
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).toEqual({
      action: "collapse",
      timeout_ms: 1000,
      device_serial: "emulator-5554"
    });
    for (const request of [
      {},
      { action: "expand-notifications" },
      { action: "expand_settings", timeout_ms: 0 },
      { action: "collapse", device_serial: "" }
    ]) {
      expect(() => DeviceStatusBarRequestSchema.parse(request)).toThrow();
    }
  });

  it("defaults device statusbar icons request routing", () => {
    expect(DeviceStatusBarIconsRequestSchema.parse({})).toEqual({ timeout_ms: 10_000 });
    expect(DeviceStatusBarIconsRequestSchema.parse({ timeout_ms: 1000, device_serial: "emulator-5554" })).toEqual({
      timeout_ms: 1000,
      device_serial: "emulator-5554"
    });
    for (const request of [{ timeout_ms: 0 }, { device_serial: "" }]) {
      expect(() => DeviceStatusBarIconsRequestSchema.parse(request)).toThrow();
    }
  });

  it("defaults device volume get request routing and stream semantics", () => {
    expect(DeviceVolumeGetRequestSchema.parse({})).toEqual({ stream: "music", timeout_ms: 10_000 });
    expect(
      DeviceVolumeGetRequestSchema.parse({ stream: "voice_call", timeout_ms: 1000, device_serial: "emulator-5554" })
    ).toEqual({
      stream: "voice_call",
      timeout_ms: 1000,
      device_serial: "emulator-5554"
    });
    for (const request of [{ stream: "voice-call" }, { stream: "assistant" }, { timeout_ms: 0 }, { device_serial: "" }]) {
      expect(() => DeviceVolumeGetRequestSchema.parse(request)).toThrow();
    }
  });

  it("defaults device ringer get request routing", () => {
    expect(DeviceRingerGetRequestSchema.parse({})).toEqual({ timeout_ms: 10_000 });
    expect(DeviceRingerGetRequestSchema.parse({ timeout_ms: 1000, device_serial: "emulator-5554" })).toEqual({
      timeout_ms: 1000,
      device_serial: "emulator-5554"
    });
    for (const request of [{ timeout_ms: 0 }, { device_serial: "" }]) {
      expect(() => DeviceRingerGetRequestSchema.parse(request)).toThrow();
    }
  });

  it("defaults and bounds device notifications get request routing", () => {
    expect(DeviceNotificationsRequestSchema.parse({})).toEqual({
      max_notifications: 20,
      max_field_chars: 256,
      max_total_chars: 4096,
      timeout_ms: 10_000
    });
    expect(
      DeviceNotificationsRequestSchema.parse({
        max_notifications: 1,
        max_field_chars: 32,
        max_total_chars: 128,
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).toEqual({
      max_notifications: 1,
      max_field_chars: 32,
      max_total_chars: 128,
      timeout_ms: 1000,
      device_serial: "emulator-5554"
    });
    for (const request of [
      { max_notifications: 0 },
      { max_notifications: 51 },
      { max_field_chars: 0 },
      { max_field_chars: 1025 },
      { max_total_chars: 0 },
      { max_total_chars: 20_001 },
      { timeout_ms: 0 },
      { device_serial: "" }
    ]) {
      expect(() => DeviceNotificationsRequestSchema.parse(request)).toThrow();
    }
  });

  it("validates device animations get result shape", () => {
    expect(
      DeviceAnimationsGetResultSchema.parse({
        device_serial: "emulator-5554",
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
      })
    ).toMatchObject({
      settings: {
        animator_duration_scale: { raw: null, value: null }
      },
      animations_disabled: false
    });
    expect(() =>
      DeviceAnimationsGetResultSchema.parse({
        device_serial: "emulator-5554",
        settings: {
          window_animation_scale: { raw: "-1", value: -1 },
          transition_animation_scale: { raw: "1.0", value: 1 },
          animator_duration_scale: { raw: "1.0", value: 1 }
        },
        animations_disabled: false,
        query: { sources: [] },
        verify: { policy: "animation_scale_settings_parse", ok: true, attempts: 1, reason: "bad" },
        semantics: "read_only_animation_scale_settings_not_runtime_animation_state"
      })
    ).toThrow();
  });

  it("validates device animations set result shape", () => {
    const result = DeviceAnimationsSetResultSchema.parse({
      device_serial: "emulator-5554",
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
        reason: "readback matched"
      },
      semantics: "device_wide_global_animation_scale_settings_not_runtime_animation_state"
    });

    expect(result.after.animations_disabled).toBe(true);
    expect(() =>
      DeviceAnimationsSetResultSchema.parse({
        ...result,
        requested: { scale: 0.25 }
      })
    ).toThrow();
  });

  it("validates device accessibility get result shape", () => {
    expect(
      DeviceAccessibilityGetResultSchema.parse({
        device_serial: "emulator-5554",
        settings: {
          accessibility_enabled: { raw: "1", value: true },
          touch_exploration_enabled: { raw: "0", value: false },
          enabled_accessibility_services: {
            raw: "com.example/.ReaderService:com.android.talkback/com.android.talkback.TalkBackService",
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
        verify: {
          policy: "accessibility_secure_settings_parse",
          ok: true,
          attempts: 1,
          reason: "parsed secure Android accessibility settings without inspecting live accessibility service state or accessibility nodes"
        },
        semantics: "read_only_secure_accessibility_settings_not_runtime_accessibility_node_state"
      })
    ).toMatchObject({
      settings: {
        accessibility_enabled: { value: true },
        enabled_accessibility_services: { count: 2 }
      }
    });
    expect(() =>
      DeviceAccessibilityGetResultSchema.parse({
        device_serial: "emulator-5554",
        settings: {
          accessibility_enabled: { raw: "2", value: true },
          touch_exploration_enabled: { raw: "0", value: false },
          enabled_accessibility_services: { raw: "bad", services: ["bad"], count: 1 }
        },
        query: { sources: [] },
        verify: { policy: "accessibility_secure_settings_parse", ok: true, attempts: 1, reason: "bad" },
        semantics: "read_only_secure_accessibility_settings_not_runtime_accessibility_node_state"
      })
    ).toThrow();
  });

  it("validates device notifications get result shape", () => {
    expect(
      DeviceNotificationsResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          max_notifications: 20,
          max_field_chars: 256,
          max_total_chars: 4096
        },
        notifications: [
          {
            key: "-1|android|26|null|1000",
            package_name: "android",
            user_id: -1,
            notification_id: 26,
            tag: null,
            channel_id: "DEVELOPER_IMPORTANT",
            importance: 4,
            group_key: null,
            category: null,
            visibility: "public",
            flags: ["ONGOING_EVENT", "CAN_COLORIZE"],
            title: "USB debugging connected",
            text: "Tap to disable USB debugging.",
            sub_text: null,
            big_text: null,
            truncated: false
          }
        ],
        counts: {
          total_seen: 1,
          returned: 1,
          dropped_by_limit: 0
        },
        truncated: {
          notifications: false,
          chars: false,
          fields: false
        },
        sensitive: true,
        query: {
          method: "dumpsys_notification_noredact",
          exit_code: 0,
          command_duration_ms: 6
        },
        verify: {
          policy: "notification_dump_parse",
          ok: true,
          attempts: 1,
          reason: "parsed"
        },
        semantics: "read_only_notification_snapshot_sensitive_bounded"
      })
    ).toMatchObject({
      sensitive: true,
      counts: { returned: 1 },
      notifications: [{ package_name: "android", user_id: -1 }]
    });
    for (const result of [
      {
        device_serial: "emulator-5554",
        requested: { max_notifications: 20, max_field_chars: 256, max_total_chars: 4096 },
        notifications: [],
        counts: { total_seen: 0, returned: 0, dropped_by_limit: 0 },
        truncated: { notifications: false, chars: false, fields: false },
        sensitive: false,
        query: { method: "dumpsys_notification_noredact", exit_code: 0, command_duration_ms: 1 },
        verify: { policy: "notification_dump_parse", ok: true, attempts: 1, reason: "bad" },
        semantics: "read_only_notification_snapshot_sensitive_bounded"
      },
      {
        device_serial: "emulator-5554",
        requested: { max_notifications: 20, max_field_chars: 256, max_total_chars: 4096 },
        notifications: [
          {
            key: "bad",
            package_name: "bad package",
            user_id: 0,
            notification_id: 1,
            tag: null,
            channel_id: null,
            importance: null,
            group_key: null,
            category: null,
            visibility: "private",
            flags: [],
            title: null,
            text: null,
            sub_text: null,
            big_text: null,
            truncated: false
          }
        ],
        counts: { total_seen: 1, returned: 1, dropped_by_limit: 0 },
        truncated: { notifications: false, chars: false, fields: false },
        sensitive: true,
        query: { method: "dumpsys_notification_noredact", exit_code: 0, command_duration_ms: 1 },
        verify: { policy: "notification_dump_parse", ok: true, attempts: 1, reason: "bad" },
        semantics: "read_only_notification_snapshot_sensitive_bounded"
      }
    ]) {
      expect(() => DeviceNotificationsResultSchema.parse(result)).toThrow();
    }
  });

  it("enforces device users read-only result semantics", () => {
    expect(DeviceUsersRequestSchema.parse({})).toEqual({ timeout_ms: 10_000 });
    expect(DeviceUsersRequestSchema.parse({ device_serial: "emulator-5554", timeout_ms: 1000 })).toEqual({
      device_serial: "emulator-5554",
      timeout_ms: 1000
    });
    expect(
      DeviceUsersResultSchema.parse({
        device_serial: "emulator-5554",
        users: [
          { id: 0, name: "Owner", flags_hex: "13", running: true },
          { id: 10, name: "Work", flags_hex: "30", running: false }
        ],
        count: 2,
        running_user_ids: [0],
        query: {
          method: "pm_list_users",
          exit_code: 0,
          command_duration_ms: 4
        },
        verify: {
          policy: "pm_list_users_parse",
          ok: true,
          attempts: 1,
          reason: "standard pm list users output parsed"
        },
        semantics: "standard_pm_list_users_non_verbose"
      })
    ).toMatchObject({
      count: 2,
      running_user_ids: [0],
      verify: { policy: "pm_list_users_parse", ok: true }
    });
    expect(() =>
      DeviceUsersResultSchema.parse({
        device_serial: "emulator-5554",
        users: [{ id: -1, name: "Owner", flags_hex: "13", running: true }],
        count: 1,
        running_user_ids: [],
        query: { method: "pm_list_users", exit_code: 0, command_duration_ms: 1 },
        verify: { policy: "pm_list_users_parse", ok: true, attempts: 1, reason: "bad" },
        semantics: "standard_pm_list_users_non_verbose"
      })
    ).toThrow();
    expect(() =>
      DeviceUsersResultSchema.parse({
        device_serial: "emulator-5554",
        users: [{ id: 0, name: "Owner", flags_hex: "zz", running: true }],
        count: 1,
        running_user_ids: [0],
        query: { method: "pm_list_users", exit_code: 0, command_duration_ms: 1 },
        verify: { policy: "pm_list_users_parse", ok: true, attempts: 1, reason: "bad" },
        semantics: "standard_pm_list_users_non_verbose"
      })
    ).toThrow();
  });
});
