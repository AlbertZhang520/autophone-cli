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

describe("generated JSON schemas: device golden responses", () => {
  it("validates a golden device info response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-info-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceDetailsResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-info",
      ok: true,
      command: "device.info",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
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
      },
      error: null,
      warnings: [],
      trace: { sources: ["getprop", "wm size", "wm density", "dumpsys battery"] }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device list response without a selected device", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-list-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceListResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-list",
      ok: true,
      command: "device.list",
      duration_ms: 1,
      result: {
        devices: [
          {
            serial: "emulator-5554",
            state: "device",
            online: true,
            details: {
              model: "sdk_gphone64_arm64",
              transport_id: "1"
            }
          },
          {
            serial: "usb-1",
            state: "no permissions",
            online: false,
            details: {}
          }
        ],
        count: 2,
        online_count: 1,
        unauthorized_count: 0,
        offline_count: 0,
        other_count: 1,
        state_counts: {
          device: 1,
          "no permissions": 1
        },
        default_serial: "emulator-5554"
      },
      error: null,
      warnings: [],
      trace: { timeout_ms: 10_000 }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device current-user response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-current-user-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceCurrentUserResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-current-user",
      ok: true,
      command: "device.current_user",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        current_user_id: 10,
        query: {
          method: "cmd_activity_get_current_user",
          exit_code: 0,
          command_duration_ms: 4
        },
        verify: {
          policy: "activity_manager_current_user",
          ok: true,
          attempts: 1,
          reason: "Activity Manager current user id parsed"
        },
        semantics: "activity_manager_reported_current_user_id"
      },
      error: null,
      warnings: ["device current-user reports Activity Manager's current user id only; it does not infer profile visibility"],
      trace: { timeout_ms: 10_000, source: "cmd activity get-current-user" }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device orientation response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-orientation-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceOrientationResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-orientation",
      ok: true,
      command: "device.orientation_get",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        window_size: [1080, 2400],
        orientation: "landscape",
        rotation_degrees: 90,
        auto_rotate: null,
        query: {
          window_size: {
            method: "wm_size",
            exit_code: 0,
            command_duration_ms: 2
          },
          rotation: {
            method: "dumpsys_window",
            exit_code: 0,
            command_duration_ms: 3
          },
          auto_rotate: {
            method: "settings_get_accelerometer_rotation",
            exit_code: 0,
            command_duration_ms: 1
          }
        },
        verify: {
          policy: "actual_display_rotation_parse",
          ok: true,
          attempts: 1,
          reason: "actual display rotation parsed from dumpsys window"
        },
        semantics: "actual_display_rotation_without_ui_dump"
      },
      error: null,
      warnings: [],
      trace: {
        timeout_ms: 10_000,
        sources: ["wm size", "dumpsys window", "settings get system accelerometer_rotation"]
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device orientation set response", async () => {
    const schema = JSON.parse(
      await readFile(join(process.cwd(), "schemas/device-orientation-set-response.schema.json"), "utf8")
    );
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const orientation = DeviceOrientationResultSchema.parse({
      device_serial: "emulator-5554",
      window_size: [1080, 2400],
      orientation: "portrait",
      rotation_degrees: 0,
      auto_rotate: false,
      query: {
        window_size: {
          method: "wm_size",
          exit_code: 0,
          command_duration_ms: 2
        },
        rotation: {
          method: "dumpsys_window",
          exit_code: 0,
          command_duration_ms: 3
        },
        auto_rotate: {
          method: "settings_get_accelerometer_rotation",
          exit_code: 0,
          command_duration_ms: 1
        }
      },
      verify: {
        policy: "actual_display_rotation_parse",
        ok: true,
        attempts: 1,
        reason: "actual display rotation parsed from dumpsys window"
      },
      semantics: "actual_display_rotation_without_ui_dump"
    });
    const envelope = ResponseEnvelopeSchema(DeviceOrientationSetResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-orientation-set",
      ok: true,
      command: "device.orientation_set",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        requested: {
          mode: "lock",
          rotation_degrees: 90
        },
        before: {
          orientation,
          user_rotation: { mode: "lock", rotation_degrees: 0 }
        },
        set: {
          method: "wm_user_rotation",
          mode: "lock",
          rotation_degrees: 90,
          exit_code: 0,
          command_duration_ms: 2
        },
        after: {
          orientation,
          user_rotation: { mode: "lock", rotation_degrees: 90 }
        },
        verify: {
          policy: "user_rotation_policy_applied",
          ok: true,
          attempts: 1,
          reason: "wm user-rotation policy matched requested state"
        },
        semantics: "device_wide_user_rotation_policy"
      },
      error: null,
      warnings: [
        "device orientation set mutates device-wide user rotation policy and does not roll back automatically",
        "user rotation policy can be overridden by foreground app orientation preferences"
      ],
      trace: {
        timeout_ms: 10_000,
        method: "wm user-rotation",
        verify_policy: "user_rotation_policy_applied"
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device statusbar response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-statusbar-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceStatusBarResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-statusbar",
      ok: true,
      command: "device.statusbar",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        action: "expand_notifications",
        statusbar: {
          method: "cmd_statusbar",
          command: "expand-notifications",
          exit_code: 0,
          command_duration_ms: 2
        },
        verify: {
          policy: "cmd_statusbar_clean_exit",
          ok: true,
          attempts: 1,
          reason: "cmd statusbar exited 0 with no usage, help, or error output; panel state is not independently verified"
        },
        semantics: "systemui_statusbar_panel_command"
      },
      error: null,
      warnings: ["statusbar command success does not independently prove the requested panel is visible"],
      trace: {
        timeout_ms: 10_000,
        method: "cmd statusbar",
        action: "expand_notifications"
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device statusbar icons response", async () => {
    const schema = JSON.parse(
      await readFile(join(process.cwd(), "schemas/device-statusbar-icons-response.schema.json"), "utf8")
    );
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceStatusBarIconsResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-statusbar-icons",
      ok: true,
      command: "device.statusbar_icons",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        icons: ["wifi", "battery", "clock"],
        count: 3,
        query: {
          method: "cmd_statusbar_get_status_icons",
          exit_code: 0,
          command_duration_ms: 2
        },
        verify: {
          policy: "cmd_statusbar_icons_parse",
          ok: true,
          attempts: 1,
          reason: "cmd statusbar get-status-icons output parsed as ordered SystemUI icon slots"
        },
        semantics: "systemui_statusbar_icon_slots"
      },
      error: null,
      warnings: ["statusbar icons are SystemUI icon slots, not proof that each icon is currently visible or active"],
      trace: {
        timeout_ms: 10_000,
        method: "cmd statusbar get-status-icons"
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device volume get response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-volume-get-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceVolumeGetResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-volume-get",
      ok: true,
      command: "device.volume_get",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        stream: {
          name: "alarm",
          android_stream_id: 4,
          android_stream_name: "STREAM_ALARM"
        },
        volume: {
          index: 12,
          min: 1,
          max: 15
        },
        query: {
          method: "cmd_media_session_volume_get",
          exit_code: 0,
          command_duration_ms: 6
        },
        verify: {
          policy: "media_session_volume_parse",
          ok: true,
          attempts: 1,
          reason: "cmd media_session volume output parsed one AudioManager stream index/range and matched the requested stream id/name"
        },
        semantics: "audio_manager_stream_volume_index"
      },
      error: null,
      warnings: [
        "device volume get reports an AudioManager stream index, not perceived loudness, mute/DND state, audio route, or playback state",
        "ring and notification streams may be aliased by Android/OEM policy"
      ],
      trace: {
        timeout_ms: 10_000,
        method: "cmd media_session volume --get",
        stream: "alarm"
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device ringer get response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-ringer-get-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceRingerGetResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-ringer-get",
      ok: true,
      command: "device.ringer_get",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        ringer: {
          internal: { mode: "silent", raw: "SILENT" },
          external: { mode: "silent", raw: "SILENT" }
        },
        zen: { mode: "off", raw: "ZEN_MODE_OFF", source: "dumpsys_audio_ringer_section" },
        affected_streams: {
          mask_hex: "0x126",
          streams: ["STREAM_SYSTEM", "STREAM_RING", "STREAM_NOTIFICATION", "STREAM_DTMF"],
          residual_tokens: []
        },
        muted_streams: {
          mask_hex: "0x126",
          streams: ["STREAM_SYSTEM", "STREAM_RING", "STREAM_NOTIFICATION", "STREAM_DTMF"],
          residual_tokens: []
        },
        query: {
          method: "dumpsys_audio",
          exit_code: 0,
          command_duration_ms: 7
        },
        verify: {
          policy: "dumpsys_audio_ringer_state_parse",
          ok: true,
          attempts: 1,
          reason: "dumpsys audio Ringer mode section parsed internal/external ringer mode, optional zen mode, and ringer stream masks"
        },
        semantics: "audio_service_ringer_zen_state_not_effective_audibility"
      },
      error: null,
      warnings: [
        "device ringer get reports AudioService ringer and zen state, not proof of actual audible output, notification delivery, audio route, playback state, or app behavior"
      ],
      trace: {
        timeout_ms: 10_000,
        method: "dumpsys audio"
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device users response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-users-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceUsersResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-users",
      ok: true,
      command: "device.users",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
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
      },
      error: null,
      warnings: ["device users parses standard non-verbose pm list users output; it does not decode user flags"],
      trace: { timeout_ms: 10_000, package_manager: "pm", query: "list_users" }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device ensure-ready response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-ensure-ready-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const ready = {
      device_serial: "emulator-5554",
      awake: true,
      interactive: true,
      wakefulness: "Awake",
      display_power_state: "ON",
      keyguard_showing: false,
      keyguard_secure: false
    };
    const envelope = ResponseEnvelopeSchema(DeviceEnsureReadyResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-ready",
      ok: true,
      command: "device.ensure_ready",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        before: ready,
        after: ready,
        wake: {
          attempted: false,
          keycode: "KEYCODE_WAKEUP",
          command_duration_ms: null
        },
        dismiss_keyguard: {
          attempted: false,
          method: "wm_dismiss_keyguard",
          exit_code: null,
          command_duration_ms: null
        },
        verify: {
          ok: true,
          attempts: 1,
          reason: "device was already ready"
        }
      },
      error: null,
      warnings: [],
      trace: { timeout_ms: 10_000 }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device screen get response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-screen-get-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const state = {
      device_serial: "emulator-5554",
      awake: true,
      interactive: true,
      wakefulness: "Awake",
      display_power_state: "ON",
      keyguard_showing: false,
      keyguard_secure: false
    };
    const envelope = ResponseEnvelopeSchema(DeviceScreenGetResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-screen-get",
      ok: true,
      command: "device.screen_get",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        state,
        screen: {
          display_power: "on",
          screen_unlocked: true
        },
        keyguard: {
          showing: false,
          secure: false
        },
        query: {
          sources: [
            { method: "dumpsys_power", exit_code: 0, command_duration_ms: 3 },
            { method: "dumpsys_window", exit_code: 0, command_duration_ms: 4 }
          ]
        },
        verify: {
          policy: "screen_keyguard_state_parse",
          ok: true,
          attempts: 1,
          reason: "parsed display power and keyguard state without waking or dismissing keyguard"
        },
        semantics: "read_only_screen_keyguard_probe_not_readiness_mutation"
      },
      error: null,
      warnings: [],
      trace: { timeout_ms: 10_000, sources: ["dumpsys power", "dumpsys window"] }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device network get response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-network-get-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceNetworkGetResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-network-get",
      ok: true,
      command: "device.network_get",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        settings: {
          airplane_mode_on: false,
          wifi_on: true,
          mobile_data_on: null
        },
        active: {
          network_id: 101,
          transports: ["wifi"],
          primary_transport: "wifi",
          internet_capable: true,
          validated: true,
          online: true
        },
        query: {
          sources: [
            { method: "settings_global_airplane_mode_on", exit_code: 0, command_duration_ms: 1 },
            { method: "settings_global_wifi_on", exit_code: 0, command_duration_ms: 2 },
            { method: "settings_global_mobile_data", exit_code: 0, command_duration_ms: 3 },
            { method: "dumpsys_connectivity", exit_code: 0, command_duration_ms: 4 }
          ]
        },
        verify: {
          policy: "settings_and_connectivity_service_parse",
          ok: true,
          attempts: 1,
          reason: "parsed global connectivity settings and ConnectivityService active default network without exposing identifiers"
        },
        semantics: "read_only_connectivity_state_not_remote_reachability"
      },
      error: null,
      warnings: [
        "device network get reports Android connectivity state only; it does not prove any remote host is reachable"
      ],
      trace: {
        timeout_ms: 10_000,
        sources: [
          "settings get global airplane_mode_on",
          "settings get global wifi_on",
          "settings get global mobile_data",
          "dumpsys connectivity"
        ]
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device storage response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-storage-get-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceStorageGetResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-storage",
      ok: true,
      command: "device.storage",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
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
            error: {
              reason: "statfs_failed",
              message: "No such file or directory"
            }
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
      },
      error: null,
      warnings: [
        "device storage reports a point-in-time filesystem capacity snapshot; it does not prove app quota or write permission",
        "storage roles may refer to the same underlying volume; do not sum entries as total device capacity"
      ],
      trace: {
        timeout_ms: 10_000,
        method: "statfs_paths",
        ok_count: 2,
        unavailable_count: 1
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device battery get response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-battery-get-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceBatteryGetResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-battery-get",
      ok: true,
      command: "device.battery_get",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
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
      },
      error: null,
      warnings: [
        "device battery get reports a point-in-time BatteryService snapshot; it does not control charging or calibrate battery health"
      ],
      trace: {
        timeout_ms: 10_000,
        method: "dumpsys battery",
        level_percent: 98,
        present: true
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device time get response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-time-get-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceTimeGetResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-time-get",
      ok: true,
      command: "device.time_get",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
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
      },
      error: null,
      warnings: [
        "device time get reports a point-in-time Android clock snapshot; it does not prove NTP sync, alarm delivery, or scheduler behavior"
      ],
      trace: {
        timeout_ms: 10_000,
        unix_epoch_seconds: 1_782_800_012,
        timezone_source: "persist_sys_timezone",
        auto_time: true,
        auto_time_zone: true
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device locale get response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-locale-get-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const locale = { tag: "zh-CN", base_name: "zh-CN", language: "zh", script: null, region: "CN" };
    const envelope = ResponseEnvelopeSchema(DeviceLocaleGetResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-locale-get",
      ok: true,
      command: "device.locale_get",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        locales: [locale],
        locales_count: 1,
        primary_locale: locale,
        selected_source: "system_locales",
        sources: {
          system_locales: "zh-CN",
          persist_sys_locale: "zh-CN",
          ro_product_locale: "zh_CN",
          ro_product_locale_language: null,
          ro_product_locale_region: null
        },
        invalid_sources: [],
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
      },
      error: null,
      warnings: [
        "device locale get reports Android system and product locale sources only; it does not prove per-app language, rendered translation, or Locale.getDefault() inside an app"
      ],
      trace: {
        timeout_ms: 10_000,
        selected_source: "system_locales",
        locales_count: 1,
        invalid_source_count: 0
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device ime get response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-ime-get-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceImeGetResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-ime-get",
      ok: true,
      command: "device.ime_get",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        keyboard: {
          shown: false,
          show_requested: false,
          fullscreen_mode: false
        },
        service: {
          system_ready: true,
          interactive: true
        },
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
      },
      error: null,
      warnings: [
        "device ime get reports InputMethodManagerService state only; it does not prove keyboard geometry, focused-field text, or text entry readiness"
      ],
      trace: {
        timeout_ms: 10_000,
        sources: [
          "dumpsys input_method",
          "settings get secure default_input_method",
          "settings get secure enabled_input_methods"
        ]
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device brightness get response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-brightness-get-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceBrightnessGetResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-brightness-get",
      ok: true,
      command: "device.brightness_get",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
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
        verify: {
          policy: "display_brightness_state_parse",
          ok: true,
          attempts: 1,
          reason: "parsed display brightness settings and display service brightness fields without exposing raw dumpsys display output"
        },
        semantics: "read_only_display_brightness_state_not_visual_luminance"
      },
      error: null,
      warnings: [
        "device brightness get reports Android brightness settings and display service state only; it does not prove visual luminance, screenshot exposure, or ambient light"
      ],
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

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device animations get response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-animations-get-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceAnimationsGetResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-animations-get",
      ok: true,
      command: "device.animations_get",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        settings: {
          window_animation_scale: { raw: "1.0", value: 1 },
          transition_animation_scale: { raw: "0.5", value: 0.5 },
          animator_duration_scale: { raw: "0", value: 0 }
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
      },
      error: null,
      warnings: [
        "device animations get reports global Android animation scale settings, not proof of actual app animation timing or rendered motion"
      ],
      trace: {
        timeout_ms: 10_000,
        sources: [
          "settings get global window_animation_scale",
          "settings get global transition_animation_scale",
          "settings get global animator_duration_scale"
        ]
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device animations set response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-animations-set-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceAnimationsSetResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-animations-set",
      ok: true,
      command: "device.animations_set",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        requested: { scale: 1 },
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
            { method: "settings_put_global_window_animation_scale", scale: 1, exit_code: 0, command_duration_ms: 1 },
            { method: "settings_put_global_transition_animation_scale", scale: 1, exit_code: 0, command_duration_ms: 2 },
            { method: "settings_put_global_animator_duration_scale", scale: 1, exit_code: 0, command_duration_ms: 3 }
          ]
        },
        after: {
          settings: {
            window_animation_scale: { raw: "1.0", value: 1 },
            transition_animation_scale: { raw: "1.0", value: 1 },
            animator_duration_scale: { raw: "1.0", value: 1 }
          },
          animations_disabled: false
        },
        changed: false,
        verify: {
          policy: "global_animation_scales_readback",
          ok: true,
          attempts: 1,
          reason: "settings get global readback reported the requested scale for all three Android animation settings"
        },
        semantics: "device_wide_global_animation_scale_settings_not_runtime_animation_state"
      },
      error: null,
      warnings: [
        "device animations set mutates device-wide global animation scale settings and does not roll back automatically",
        "if one of the three settings writes fails, earlier settings may already have changed",
        "readback verification confirms stored settings values only; it does not prove actual app animation timing or rendered motion"
      ],
      trace: {
        timeout_ms: 10_000,
        method: "settings put global",
        scale: 1,
        verify_policy: "global_animation_scales_readback"
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden device accessibility get response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/device-accessibility-get-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(DeviceAccessibilityGetResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-accessibility-get",
      ok: true,
      command: "device.accessibility_get",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
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
      },
      error: null,
      warnings: [
        "device accessibility get reports stored secure accessibility settings, not proof of live accessibility service health or accessibility node state"
      ],
      trace: {
        timeout_ms: 10_000,
        sources: [
          "settings get secure accessibility_enabled",
          "settings get secure touch_exploration_enabled",
          "settings get secure enabled_accessibility_services"
        ]
      }
    });

    expect(validate(envelope)).toBe(true);
  });
});
