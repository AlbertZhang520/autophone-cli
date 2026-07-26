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
  it("lists all adb devices without selecting a target serial", async () => {
    const driver = makeDriver([], [], [
      { serial: "emulator-5554", state: "device", details: { model: "sdk_gphone64_arm64" } },
      { serial: "phone-1", state: "unauthorized", details: {} }
    ]);
    const io = makeIo();
    const exitCode = await runCli(["--serial", "ignored-serial", "device", "list"], {
      io,
      requestIdFactory: () => "req-device-list",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.listDevices).toHaveBeenCalledWith({ timeoutMs: 10_000 });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed.device).toBeUndefined();
    expect(parsed).toMatchObject({
      ok: true,
      command: "device.list",
      request_id: "req-device-list",
      warnings: ["device list ignores --serial and returns all adb devices"],
      result: {
        count: 2,
        online_count: 1,
        unauthorized_count: 1,
        offline_count: 0,
        other_count: 0,
        default_serial: "emulator-5554",
        devices: [
          { serial: "emulator-5554", state: "device", online: true },
          { serial: "phone-1", state: "unauthorized", online: false }
        ]
      },
      trace: {
        timeout_ms: 10_000,
        serial_filter: "ignored"
      }
    });
  });

  it("lists Android users for the selected device", async () => {
    const driver = makeDriver([], [], [], undefined, undefined, {
      serial: "emulator-5554",
      users: [
        { id: 0, name: "Owner", flagsHex: "13", running: true },
        { id: 10, name: "Work", flagsHex: "30", running: false }
      ],
      exitCode: 0,
      durationMs: 7
    });
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "users"], {
      io,
      requestIdFactory: () => "req-device-users",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.listUsers).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 10_000 });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "device.users",
      request_id: "req-device-users",
      device: { serial: "emulator-5554" },
      warnings: ["device users parses standard non-verbose pm list users output; it does not decode user flags"],
      result: {
        device_serial: "emulator-5554",
        count: 2,
        running_user_ids: [0],
        users: [
          { id: 0, name: "Owner", flags_hex: "13", running: true },
          { id: 10, name: "Work", flags_hex: "30", running: false }
        ],
        query: { method: "pm_list_users", exit_code: 0, command_duration_ms: 7 },
        verify: { policy: "pm_list_users_parse", ok: true, attempts: 1 },
        semantics: "standard_pm_list_users_non_verbose"
      },
      trace: {
        timeout_ms: 10_000,
        package_manager: "pm",
        query: "list_users"
      }
    });
  });

  it("returns the Activity Manager current Android user for the selected device", async () => {
    const driver = makeDriver([], [], [], undefined, undefined, undefined, {
      serial: "emulator-5554",
      currentUserId: 10,
      exitCode: 0,
      durationMs: 4
    });
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "current-user"], {
      io,
      requestIdFactory: () => "req-device-current-user",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getCurrentUser).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 10_000 });
    expect(driver.listUsers).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "device.current_user",
      request_id: "req-device-current-user",
      device: { serial: "emulator-5554" },
      warnings: [
        "device current-user reports Activity Manager's current user id only; it does not infer profile visibility"
      ],
      result: {
        device_serial: "emulator-5554",
        current_user_id: 10,
        query: { method: "cmd_activity_get_current_user", exit_code: 0, command_duration_ms: 4 },
        verify: { policy: "activity_manager_current_user", ok: true, attempts: 1 },
        semantics: "activity_manager_reported_current_user_id"
      },
      trace: {
        timeout_ms: 10_000,
        source: "cmd activity get-current-user"
      }
    });
  });

  it("returns target display orientation without observing UI", async () => {
    const driver = makeDriver([], [], [], undefined, undefined, undefined, undefined, orientationDriverResult());
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "orientation", "get"], {
      io,
      requestIdFactory: () => "req-device-orientation",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getOrientation).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 10_000 });
    expect(driver.observe).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "device.orientation_get",
      request_id: "req-device-orientation",
      device: { serial: "emulator-5554" },
      result: {
        device_serial: "emulator-5554",
        window_size: [1080, 2400],
        orientation: "landscape",
        rotation_degrees: 90,
        auto_rotate: true,
        query: {
          window_size: { method: "wm_size", exit_code: 0, command_duration_ms: 2 },
          rotation: { method: "dumpsys_window", exit_code: 0, command_duration_ms: 3 },
          auto_rotate: { method: "settings_get_accelerometer_rotation", exit_code: 0, command_duration_ms: 1 }
        },
        verify: { policy: "actual_display_rotation_parse", ok: true, attempts: 1 },
        semantics: "actual_display_rotation_without_ui_dump"
      },
      trace: {
        timeout_ms: 10_000,
        sources: ["wm size", "dumpsys window", "settings get system accelerometer_rotation"]
      }
    });
  });

  it("warns when device orientation falls back after unparseable wm size output", async () => {
    const driver = makeDriver(
      [],
      [],
      [],
      undefined,
      undefined,
      undefined,
      undefined,
      orientationDriverResult({ windowSize: null })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "orientation", "get"], {
      io,
      requestIdFactory: () => "req-device-orientation-warning",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "device.orientation_get",
      warnings: [
        "device orientation fell back to rotation-only orientation inference because wm size output was unparseable"
      ],
      result: {
        window_size: null,
        rotation_degrees: 90
      }
    });
  });

  it("sets device orientation policy with explicit serial", async () => {
    const driver = makeDriver([]);
    driver.getUserRotationPolicy
      .mockResolvedValueOnce(userRotationPolicy({ mode: "lock", rotationDegrees: 0 }))
      .mockResolvedValueOnce(userRotationPolicy({ mode: "lock", rotationDegrees: 90 }));
    const io = makeIo();
    const exitCode = await runCli(
      ["--serial", "emulator-5554", "device", "orientation", "set", "--mode", "lock", "--rotation", "90"],
      {
        io,
        requestIdFactory: () => "req-device-orientation-set",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.setUserRotation).toHaveBeenCalledWith({
      mode: "lock",
      rotationDegrees: 90,
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "device.orientation_set",
      device: { serial: "emulator-5554" },
      warnings: [
        "device orientation set mutates device-wide user rotation policy and does not roll back automatically",
        "user rotation policy can be overridden by foreground app orientation preferences"
      ],
      result: {
        device_serial: "emulator-5554",
        requested: { mode: "lock", rotation_degrees: 90 },
        after: { user_rotation: { mode: "lock", rotation_degrees: 90 } },
        verify: { policy: "user_rotation_policy_applied", ok: true }
      },
      trace: { method: "wm user-rotation" }
    });
  });

  it("rejects device orientation set without explicit serial before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["device", "orientation", "set", "--mode", "auto"], {
      io,
      requestIdFactory: () => "req-device-orientation-set-no-serial",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.setUserRotation).not.toHaveBeenCalled();
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: false,
      command: "device.orientation_set",
      error: {
        code: "INVALID_REQUEST",
        message: "device orientation set requires explicit --serial"
      }
    });
  });

  it("rejects invalid device orientation set mode and rotation combinations", async () => {
    for (const argv of [
      ["--serial", "emulator-5554", "device", "orientation", "set", "--mode", "auto", "--rotation", "90"],
      ["--serial", "emulator-5554", "device", "orientation", "set", "--mode", "lock"],
      ["--serial", "emulator-5554", "device", "orientation", "set", "--mode", "lock", "--rotation", "45"]
    ]) {
      const driver = makeDriver([]);
      const io = makeIo();
      const exitCode = await runCli(argv, {
        io,
        requestIdFactory: () => "req-device-orientation-set-invalid",
        driverFactory: () => driver
      });

      expect(exitCode).toBe(2);
      expect(driver.setUserRotation).not.toHaveBeenCalled();
      expect(JSON.parse(io.stdoutText())).toMatchObject({ ok: false, command: "device.orientation_set" });
    }
  });

  it("controls device statusbar panels with resolved serial metadata", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "statusbar", "expand-notifications"], {
      io,
      requestIdFactory: () => "req-device-statusbar",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.controlStatusBar).toHaveBeenCalledWith("expand-notifications", {
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.statusbar",
      request_id: "req-device-statusbar",
      device: { serial: "emulator-5554" },
      warnings: ["statusbar command success does not independently prove the requested panel is visible"],
      result: {
        device_serial: "emulator-5554",
        action: "expand_notifications",
        statusbar: {
          method: "cmd_statusbar",
          command: "expand-notifications",
          exit_code: 0,
          command_duration_ms: 1
        },
        verify: { policy: "cmd_statusbar_clean_exit", ok: true, attempts: 1 },
        semantics: "systemui_statusbar_panel_command"
      },
      trace: { timeout_ms: 10_000, method: "cmd statusbar", action: "expand_notifications" }
    });
  });

  it("maps device statusbar collapse to the collapse command", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["device", "statusbar", "collapse"], {
      io,
      requestIdFactory: () => "req-device-statusbar-collapse",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.controlStatusBar).toHaveBeenCalledWith("collapse", {
      deviceSerial: undefined,
      timeoutMs: 10_000
    });
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.statusbar",
      warnings: ["statusbar command success does not independently prove the requested panel is collapsed"],
      result: {
        action: "collapse",
        statusbar: { command: "collapse" }
      }
    });
  });

  it("maps device statusbar expand-settings to the quick settings command", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["device", "statusbar", "expand-settings"], {
      io,
      requestIdFactory: () => "req-device-statusbar-settings",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.controlStatusBar).toHaveBeenCalledWith("expand-settings", {
      deviceSerial: undefined,
      timeoutMs: 10_000
    });
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.statusbar",
      warnings: ["statusbar command success does not independently prove the requested panel is visible"],
      result: {
        action: "expand_settings",
        statusbar: { command: "expand-settings" }
      },
      trace: { action: "expand_settings" }
    });
  });

  it("returns statusbar icon slots as a read-only statusbar query", async () => {
    const driver = makeDriver([]);
    driver.getStatusBarIcons.mockResolvedValueOnce({
      serial: "emulator-5554",
      icons: ["wifi", "battery", "clock"],
      exitCode: 0,
      durationMs: 4
    });
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "statusbar", "icons"], {
      io,
      requestIdFactory: () => "req-device-statusbar-icons",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getStatusBarIcons).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 10_000 });
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.statusbar_icons",
      request_id: "req-device-statusbar-icons",
      device: { serial: "emulator-5554" },
      warnings: ["statusbar icons are SystemUI icon slots, not proof that each icon is currently visible or active"],
      result: {
        device_serial: "emulator-5554",
        icons: ["wifi", "battery", "clock"],
        count: 3,
        query: {
          method: "cmd_statusbar_get_status_icons",
          exit_code: 0,
          command_duration_ms: 4
        },
        verify: { policy: "cmd_statusbar_icons_parse", ok: true, attempts: 1 },
        semantics: "systemui_statusbar_icon_slots"
      },
      trace: { timeout_ms: 10_000, method: "cmd statusbar get-status-icons" }
    });
  });

  it("returns AudioManager stream volume as a read-only device query", async () => {
    const driver = makeDriver([]);
    driver.getVolume.mockResolvedValueOnce({
      serial: "emulator-5554",
      stream: DEVICE_VOLUME_STREAMS.alarm,
      volume: { index: 12, min: 1, max: 15 },
      exitCode: 0,
      durationMs: 6
    });
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "volume", "get", "--stream", "alarm"], {
      io,
      requestIdFactory: () => "req-device-volume-get",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getVolume).toHaveBeenCalledWith({
      stream: DEVICE_VOLUME_STREAMS.alarm,
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.volume_get",
      request_id: "req-device-volume-get",
      device: { serial: "emulator-5554" },
      warnings: [
        "device volume get reports an AudioManager stream index, not perceived loudness, mute/DND state, audio route, or playback state",
        "ring and notification streams may be aliased by Android/OEM policy"
      ],
      result: {
        device_serial: "emulator-5554",
        stream: {
          name: "alarm",
          android_stream_id: 4,
          android_stream_name: "STREAM_ALARM"
        },
        volume: { index: 12, min: 1, max: 15 },
        query: {
          method: "cmd_media_session_volume_get",
          exit_code: 0,
          command_duration_ms: 6
        },
        verify: { policy: "media_session_volume_parse", ok: true, attempts: 1 },
        semantics: "audio_manager_stream_volume_index"
      },
      trace: { timeout_ms: 10_000, method: "cmd media_session volume --get", stream: "alarm" }
    });
  });

  it("rejects invalid device volume streams before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["device", "volume", "get", "--stream", "assistant"], {
      io,
      requestIdFactory: () => "req-device-volume-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.getVolume).not.toHaveBeenCalled();
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: false,
      command: "unknown",
      error: {
        code: "INVALID_REQUEST",
        message:
          "error: option '--stream <stream>' argument 'assistant' is invalid. must be music, ring, alarm, notification, system, or voice-call"
      }
    });
  });

  it("returns AudioService ringer and zen state as a read-only device query", async () => {
    const driver = makeDriver([]);
    driver.getRinger.mockResolvedValueOnce(ringerDriverResult({ durationMs: 7 }));
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "ringer", "get"], {
      io,
      requestIdFactory: () => "req-device-ringer-get",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getRinger).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 10_000 });
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.ringer_get",
      request_id: "req-device-ringer-get",
      device: { serial: "emulator-5554" },
      warnings: [
        "device ringer get reports AudioService ringer and zen state, not proof of actual audible output, notification delivery, audio route, playback state, or app behavior"
      ],
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
        verify: { policy: "dumpsys_audio_ringer_state_parse", ok: true, attempts: 1 },
        semantics: "audio_service_ringer_zen_state_not_effective_audibility"
      },
      trace: { timeout_ms: 10_000, method: "dumpsys audio" }
    });
  });

  it("returns bounded notification state as sensitive read-only device query", async () => {
    const driver = makeDriver([]);
    driver.getNotifications.mockResolvedValueOnce(
      notificationsDriverResult({
        serial: "resolved-serial",
        notifications: [
          {
            key: "0|com.example.app|42|null|10001",
            package_name: "com.example.app",
            user_id: 0,
            notification_id: 42,
            tag: null,
            channel_id: "messages",
            importance: 4,
            group_key: "conversation",
            category: "msg",
            visibility: "private",
            flags: ["AUTO_CANCEL"],
            title: "Alice",
            text: "Code 123456",
            sub_text: null,
            big_text: "Use code 123456 to continue"
          }
        ],
        durationMs: 6
      })
    );
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "device",
        "notifications",
        "get",
        "--max-notifications",
        "1",
        "--max-field-chars",
        "16",
        "--max-total-chars",
        "20"
      ],
      {
        io,
        requestIdFactory: () => "req-device-notifications-get",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.getNotifications).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 10_000 });
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.notifications_get",
      request_id: "req-device-notifications-get",
      device: { serial: "resolved-serial" },
      warnings: [
        "device notifications get returns bounded but unredacted notification content; treat result fields as sensitive",
        "notification absence is only a point-in-time dumpsys observation, not proof that a notification was never posted",
        "dumpsys notification formats vary by Android/OEM build; unparseable dumps fail closed"
      ],
      result: {
        device_serial: "resolved-serial",
        requested: {
          max_notifications: 1,
          max_field_chars: 16,
          max_total_chars: 20
        },
        notifications: [
          {
            package_name: "com.example.app",
            title: "Alice",
            text: "Code 123456",
            big_text: "Use ",
            truncated: true
          }
        ],
        counts: { total_seen: 1, returned: 1, dropped_by_limit: 0 },
        truncated: { notifications: false, chars: true, fields: true },
        sensitive: true,
        query: { method: "dumpsys_notification_noredact", exit_code: 0, command_duration_ms: 6 },
        verify: { policy: "notification_dump_parse", ok: true, attempts: 1 },
        semantics: "read_only_notification_snapshot_sensitive_bounded"
      },
      trace: {
        timeout_ms: 10_000,
        method: "dumpsys notification --noredact",
        max_notifications: 1,
        max_field_chars: 16,
        max_total_chars: 20,
        returned: 1,
        total_seen: 1,
        sensitive: true
      }
    });
  });

  it("returns target device details with selected device metadata", async () => {
    const details = deviceDetailsFixture();
    const driver = makeDriver([], [], [], undefined, details);
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "info"], {
      io,
      requestIdFactory: () => "req-device-info",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getDeviceDetails).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "device.info",
      device: { serial: "emulator-5554" },
      result: {
        device_serial: "emulator-5554",
        android: { sdk: 35 },
        battery: { level_percent: 88, plugged: "usb" }
      },
      trace: {
        timeout_ms: 10_000,
        sources: ["getprop", "wm size", "wm density", "dumpsys battery"]
      }
    });
  });

  it("writes device screen get JSON without waking or dismissing keyguard", async () => {
    const driver = makeDriver([]);
    driver.getDeviceScreenState.mockResolvedValueOnce(
      screenDriverResult({
        queries: { power: { exitCode: 0, durationMs: 3 }, window: { exitCode: 0, durationMs: 4 } }
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "screen", "get"], {
      io,
      requestIdFactory: () => "req-device-screen-get",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getDeviceScreenState).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    expect(driver.wakeDevice).not.toHaveBeenCalled();
    expect(driver.dismissKeyguard).not.toHaveBeenCalled();
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.screen_get",
      device: { serial: "emulator-5554" },
      result: {
        device_serial: "emulator-5554",
        state: { display_power_state: "ON", keyguard_showing: false },
        screen: { display_power: "on", screen_unlocked: true },
        keyguard: { showing: false, secure: false },
        query: {
          sources: [
            { method: "dumpsys_power", exit_code: 0, command_duration_ms: 3 },
            { method: "dumpsys_window", exit_code: 0, command_duration_ms: 4 }
          ]
        },
        verify: { policy: "screen_keyguard_state_parse", ok: true, attempts: 1 },
        semantics: "read_only_screen_keyguard_probe_not_readiness_mutation"
      },
      trace: {
        timeout_ms: 10_000,
        sources: ["dumpsys power", "dumpsys window"]
      }
    });
  });

  it("writes device network get JSON without exposing network identifiers", async () => {
    const driver = makeDriver([]);
    driver.getDeviceNetworkState.mockResolvedValueOnce(
      networkDriverResult({
        queries: {
          airplaneMode: { exitCode: 0, durationMs: 1 },
          wifi: { exitCode: 0, durationMs: 2 },
          mobileData: { exitCode: 0, durationMs: 3 },
          connectivity: { exitCode: 0, durationMs: 4 }
        }
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "network", "get"], {
      io,
      requestIdFactory: () => "req-device-network-get",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getDeviceNetworkState).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "device.network_get",
      device: { serial: "emulator-5554" },
      warnings: [
        "device network get reports Android connectivity state only; it does not prove any remote host is reachable"
      ],
      result: {
        device_serial: "emulator-5554",
        settings: { airplane_mode_on: false, wifi_on: true, mobile_data_on: null },
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
        verify: { policy: "settings_and_connectivity_service_parse", ok: true, attempts: 1 },
        semantics: "read_only_connectivity_state_not_remote_reachability"
      },
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
    expect(io.stdoutText()).not.toContain("ssid");
    expect(io.stdoutText()).not.toContain("bssid");
  });

  it("writes device storage JSON with capacity warnings", async () => {
    const driver = makeDriver([]);
    driver.getDeviceStorageState.mockResolvedValueOnce(
      storageDriverResult({
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
            ok: false,
            error: { reason: "statfs_failed", message: "No such file or directory" }
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
        exitCode: 1,
        durationMs: 8
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "device", "storage"], {
      io,
      requestIdFactory: () => "req-device-storage",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getDeviceStorageState).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.storage",
      device: { serial: "emulator-5554" },
      warnings: [
        "device storage reports a point-in-time filesystem capacity snapshot; it does not prove app quota or write permission",
        "storage roles may refer to the same underlying volume; do not sum entries as total device capacity"
      ],
      result: {
        device_serial: "emulator-5554",
        entry_count: 3,
        ok_count: 2,
        unavailable_count: 1,
        entries: [
          {
            role: "data",
            path: "/data",
            ok: true,
            filesystem_type: "f2fs",
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
          { role: "tmp", path: "/data/local/tmp", ok: true }
        ],
        query: {
          method: "statfs_paths",
          paths: ["/data", "/sdcard", "/data/local/tmp"],
          exit_code: 1,
          command_duration_ms: 8
        },
        verify: { policy: "statfs_storage_parse", ok: true, attempts: 1 },
        semantics: "read_only_storage_capacity_snapshot_not_quota_or_write_permission"
      },
      trace: {
        timeout_ms: 10_000,
        method: "statfs_paths",
        ok_count: 2,
        unavailable_count: 1
      }
    });
  });
});
