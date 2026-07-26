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

describe("device list runtime", () => {
  it("summarizes adb device states and exposes the single online default serial", async () => {
    const driver = makeDriver([], [], undefined, [
      { serial: "emulator-5554", state: "device", details: { model: "sdk_gphone64_arm64" } },
      { serial: "phone-1", state: "unauthorized", details: {} },
      { serial: "phone-2", state: "offline", details: {} },
      { serial: "usb-1", state: "no permissions", details: { usb: "1-1" } }
    ]);

    await expect(listDevices(driver, { timeout_ms: 1000 })).resolves.toEqual({
      devices: [
        {
          serial: "emulator-5554",
          state: "device",
          online: true,
          details: { model: "sdk_gphone64_arm64" }
        },
        { serial: "phone-1", state: "unauthorized", online: false, details: {} },
        { serial: "phone-2", state: "offline", online: false, details: {} },
        { serial: "usb-1", state: "no permissions", online: false, details: { usb: "1-1" } }
      ],
      count: 4,
      online_count: 1,
      unauthorized_count: 1,
      offline_count: 1,
      other_count: 1,
      state_counts: {
        device: 1,
        unauthorized: 1,
        offline: 1,
        "no permissions": 1
      },
      default_serial: "emulator-5554"
    });
    expect(driver.listDevices).toHaveBeenCalledWith({ timeoutMs: 1000 });
  });

  it("does not choose a default serial when multiple devices are online", async () => {
    const driver = makeDriver([], [], undefined, [
      { serial: "emulator-5554", state: "device", details: {} },
      { serial: "192.168.1.5:5555", state: "device", details: {} }
    ]);

    await expect(listDevices(driver, { timeout_ms: 1000 })).resolves.toMatchObject({
      online_count: 2,
      other_count: 0,
      default_serial: null
    });
  });
});

describe("device users runtime", () => {
  it("maps Android users from the driver into the public contract", async () => {
    const driver = makeDriver([], [], undefined, [], undefined, undefined, {
      serial: "emulator-5554",
      users: [
        { id: 0, name: "Owner", flagsHex: "13", running: true },
        { id: 10, name: "Work", flagsHex: "30", running: false }
      ],
      exitCode: 0,
      durationMs: 7
    });

    await expect(listDeviceUsers(driver, { timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toEqual({
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
        command_duration_ms: 7
      },
      verify: {
        policy: "pm_list_users_parse",
        ok: true,
        attempts: 1,
        reason: "standard pm list users output parsed"
      },
      semantics: "standard_pm_list_users_non_verbose"
    });
    expect(driver.listUsers).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 1000 });
  });
});

describe("device current-user runtime", () => {
  it("maps Activity Manager current user output into the public contract", async () => {
    const driver = makeDriver([], [], undefined, [], undefined, undefined, undefined, {
      serial: "emulator-5554",
      currentUserId: 10,
      exitCode: 0,
      durationMs: 5
    });

    await expect(currentDeviceUser(driver, { timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toEqual({
      device_serial: "emulator-5554",
      current_user_id: 10,
      query: {
        method: "cmd_activity_get_current_user",
        exit_code: 0,
        command_duration_ms: 5
      },
      verify: {
        policy: "activity_manager_current_user",
        ok: true,
        attempts: 1,
        reason: "Activity Manager current user id parsed"
      },
      semantics: "activity_manager_reported_current_user_id"
    });
    expect(driver.getCurrentUser).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 1000 });
    expect(driver.listUsers).not.toHaveBeenCalled();
  });
});

describe("device orientation runtime", () => {
  it("maps display orientation metadata from the driver into the public contract", async () => {
    const driver = makeDriver([], [], undefined, [], undefined, undefined, undefined, undefined, orientationDriverResult());

    await expect(deviceOrientation(driver, { timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toEqual({
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
      verify: {
        policy: "actual_display_rotation_parse",
        ok: true,
        attempts: 1,
        reason: "actual display rotation parsed from dumpsys window"
      },
      semantics: "actual_display_rotation_without_ui_dump"
    });
    expect(driver.getOrientation).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 1000 });
    expect(driver.observe).not.toHaveBeenCalled();
  });

  it("sets locked user-rotation policy without requiring matching actual rotation", async () => {
    const driver = makeDriver([], [], undefined, [], undefined, undefined, undefined, undefined, orientationDriverResult({ rotationDegrees: 0 }));
    driver.getUserRotationPolicy
      .mockResolvedValueOnce(userRotationPolicy({ mode: "lock", rotationDegrees: 0 }))
      .mockResolvedValueOnce(userRotationPolicy({ mode: "lock", rotationDegrees: 90 }));

    await expect(
      setDeviceOrientation(driver, {
        mode: "lock",
        rotation_degrees: 90,
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).resolves.toMatchObject({
      device_serial: "emulator-5554",
      requested: { mode: "lock", rotation_degrees: 90 },
      set: { method: "wm_user_rotation", mode: "lock", rotation_degrees: 90 },
      after: {
        user_rotation: { mode: "lock", rotation_degrees: 90 },
        orientation: { rotation_degrees: 0 }
      },
      verify: { policy: "user_rotation_policy_applied", ok: true, attempts: 1 },
      semantics: "device_wide_user_rotation_policy"
    });
    expect(driver.setUserRotation).toHaveBeenCalledWith({
      mode: "lock",
      rotationDegrees: 90,
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });

  it("sets auto user-rotation policy and verifies free mode", async () => {
    const driver = makeDriver([]);
    driver.getUserRotationPolicy
      .mockResolvedValueOnce(userRotationPolicy({ mode: "lock", rotationDegrees: 0 }))
      .mockResolvedValueOnce(userRotationPolicy({ mode: "free", rotationDegrees: null }));

    await expect(
      setDeviceOrientation(driver, {
        mode: "auto",
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).resolves.toMatchObject({
      requested: { mode: "auto", rotation_degrees: null },
      set: { mode: "free", rotation_degrees: null },
      after: { user_rotation: { mode: "free", rotation_degrees: null } },
      verify: { reason: "wm user-rotation reports free mode" }
    });
    expect(driver.setUserRotation).toHaveBeenCalledWith({
      mode: "free",
      rotationDegrees: undefined,
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });

  it("fails when user-rotation policy verification does not match after retries", async () => {
    const driver = makeDriver([]);
    driver.getUserRotationPolicy.mockResolvedValue(userRotationPolicy({ mode: "lock", rotationDegrees: 0 }));

    await expect(
      setDeviceOrientation(driver, {
        mode: "lock",
        rotation_degrees: 90,
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).rejects.toMatchObject({
      code: "VERIFY_FAILED",
      retriable: false,
      details: { attempts: 3 }
    });
  });
});

describe("device statusbar runtime", () => {
  it("runs statusbar panel commands with clean-exit verification semantics", async () => {
    const driver = makeDriver([]);

    await expect(
      controlStatusBar(driver, {
        action: "expand_notifications",
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).resolves.toEqual({
      device_serial: "emulator-5554",
      action: "expand_notifications",
      statusbar: {
        method: "cmd_statusbar",
        command: "expand-notifications",
        exit_code: 0,
        command_duration_ms: 1
      },
      verify: {
        policy: "cmd_statusbar_clean_exit",
        ok: true,
        attempts: 1,
        reason: "cmd statusbar exited 0 with no usage, help, or error output; panel state is not independently verified"
      },
      semantics: "systemui_statusbar_panel_command"
    });

    await controlStatusBar(driver, { action: "expand_settings", timeout_ms: 1000 });
    await controlStatusBar(driver, { action: "collapse", timeout_ms: 1000 });

    expect(driver.controlStatusBar).toHaveBeenNthCalledWith(1, "expand-notifications", {
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
    expect(driver.controlStatusBar).toHaveBeenNthCalledWith(2, "expand-settings", {
      deviceSerial: undefined,
      timeoutMs: 1000
    });
    expect(driver.controlStatusBar).toHaveBeenNthCalledWith(3, "collapse", {
      deviceSerial: undefined,
      timeoutMs: 1000
    });
  });

  it("returns ordered statusbar icon slots with parse verification semantics", async () => {
    const driver = makeDriver([]);
    driver.getStatusBarIcons.mockResolvedValueOnce({
      serial: "emulator-5554",
      icons: ["wifi", "battery", "clock"],
      exitCode: 0,
      durationMs: 4
    });

    await expect(
      statusBarIcons(driver, {
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).resolves.toEqual({
      device_serial: "emulator-5554",
      icons: ["wifi", "battery", "clock"],
      count: 3,
      query: {
        method: "cmd_statusbar_get_status_icons",
        exit_code: 0,
        command_duration_ms: 4
      },
      verify: {
        policy: "cmd_statusbar_icons_parse",
        ok: true,
        attempts: 1,
        reason: "cmd statusbar get-status-icons output parsed as ordered SystemUI icon slots"
      },
      semantics: "systemui_statusbar_icon_slots"
    });
    expect(driver.getStatusBarIcons).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });
});

describe("device volume runtime", () => {
  it("returns one AudioManager stream volume with parse verification semantics", async () => {
    const driver = makeDriver([]);
    driver.getVolume.mockResolvedValueOnce({
      serial: "emulator-5554",
      stream: DEVICE_VOLUME_STREAMS.music,
      volume: { index: 0, min: 0, max: 15 },
      exitCode: 0,
      durationMs: 5
    });

    await expect(
      getDeviceVolume(driver, {
        stream: "music",
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).resolves.toEqual({
      device_serial: "emulator-5554",
      stream: {
        name: "music",
        android_stream_id: 3,
        android_stream_name: "STREAM_MUSIC"
      },
      volume: { index: 0, min: 0, max: 15 },
      query: {
        method: "cmd_media_session_volume_get",
        exit_code: 0,
        command_duration_ms: 5
      },
      verify: {
        policy: "media_session_volume_parse",
        ok: true,
        attempts: 1,
        reason: "cmd media_session volume output parsed one AudioManager stream index/range and matched the requested stream id/name"
      },
      semantics: "audio_manager_stream_volume_index"
    });
    expect(driver.getVolume).toHaveBeenCalledWith({
      stream: DEVICE_VOLUME_STREAMS.music,
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });
});

describe("device ringer runtime", () => {
  it("returns AudioService ringer and zen state with parse verification semantics", async () => {
    const driver = makeDriver([]);
    driver.getRinger.mockResolvedValueOnce(
      ringerDriverResult({
        durationMs: 7
      })
    );

    await expect(getDeviceRinger(driver, { timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toEqual({
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
    });
    expect(driver.getRinger).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 1000 });
  });
});

describe("device notifications runtime", () => {
  it("returns a bounded sensitive notification snapshot with resolved serial", async () => {
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
            tag: "private-tag-value",
            channel_id: "messages",
            importance: 4,
            group_key: "conversation",
            category: "msg",
            visibility: "private",
            flags: ["AUTO_CANCEL"],
            title: "Very long sender",
            text: "123456",
            sub_text: null,
            big_text: "Use 123456 to continue"
          },
          {
            key: "0|android|26|null|1000",
            package_name: "android",
            user_id: -1,
            notification_id: 26,
            tag: null,
            channel_id: "DEVELOPER_IMPORTANT",
            importance: 4,
            group_key: null,
            category: null,
            visibility: "public",
            flags: ["ONGOING_EVENT"],
            title: "USB debugging connected",
            text: "Tap to disable USB debugging",
            sub_text: null,
            big_text: null
          }
        ],
        durationMs: 7
      })
    );

    await expect(
      getDeviceNotifications(driver, {
        max_notifications: 1,
        max_field_chars: 8,
        max_total_chars: 12,
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).resolves.toMatchObject({
      device_serial: "resolved-serial",
      requested: { max_notifications: 1, max_field_chars: 8, max_total_chars: 12 },
      notifications: [
        {
          key: "0|com.ex",
          package_name: "com.example.app",
          tag: "private-",
          title: "Very lon",
          text: "1234",
          big_text: null,
          truncated: true
        }
      ],
      counts: { total_seen: 2, returned: 1, dropped_by_limit: 1 },
      truncated: { notifications: true, chars: true, fields: true },
      sensitive: true,
      query: { method: "dumpsys_notification_noredact", exit_code: 0, command_duration_ms: 7 },
      verify: { policy: "notification_dump_parse", ok: true, attempts: 1 },
      semantics: "read_only_notification_snapshot_sensitive_bounded"
    });
    expect(driver.getNotifications).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 1000 });
  });
});

describe("device info runtime", () => {
  it("returns target device details from the driver", async () => {
    const details = deviceDetailsFixture();
    const driver = makeDriver([], [], undefined, [], undefined, details);

    await expect(deviceDetails(driver, { timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toEqual(details);
    expect(driver.getDeviceDetails).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });
});

describe("device screen runtime", () => {
  it("returns a read-only screen and keyguard probe with resolved serial", async () => {
    const driver = makeDriver([]);
    driver.getDeviceScreenState.mockResolvedValueOnce(
      screenDriverResult({
        queries: { power: { exitCode: 0, durationMs: 3 }, window: { exitCode: 0, durationMs: 4 } }
      })
    );

    await expect(getDeviceScreen(driver, { timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toEqual({
      device_serial: "emulator-5554",
      state: readyState(),
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
    });
    expect(driver.getDeviceScreenState).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 1000 });
    expect(driver.wakeDevice).not.toHaveBeenCalled();
    expect(driver.dismissKeyguard).not.toHaveBeenCalled();
  });

  it("conservatively reports dozing or unknown-keyguard states as not unlocked", async () => {
    const driver = makeDriver([]);
    driver.getDeviceScreenState.mockResolvedValueOnce(
      screenDriverResult({
        state: readyState({
          awake: false,
          interactive: false,
          wakefulness: "Dozing",
          display_power_state: "DOZE",
          keyguard_showing: null,
          keyguard_secure: true
        })
      })
    );

    await expect(getDeviceScreen(driver, { timeout_ms: 1000 })).resolves.toMatchObject({
      screen: { display_power: "doze", screen_unlocked: false },
      keyguard: { showing: null, secure: true }
    });
  });

  it("normalizes display power from wakefulness when raw display power is absent", async () => {
    const driver = makeDriver([]);
    driver.getDeviceScreenState.mockResolvedValueOnce(
      screenDriverResult({
        state: readyState({ display_power_state: null, wakefulness: "Awake", awake: true, interactive: true })
      })
    );

    await expect(getDeviceScreen(driver, { timeout_ms: 1000 })).resolves.toMatchObject({
      state: { display_power_state: null, wakefulness: "Awake" },
      screen: { display_power: "on", screen_unlocked: true }
    });
  });
});

describe("device network runtime", () => {
  it("returns a read-only connectivity probe with resolved serial", async () => {
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

    await expect(getDeviceNetwork(driver, { timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toEqual({
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
      verify: {
        policy: "settings_and_connectivity_service_parse",
        ok: true,
        attempts: 1,
        reason: "parsed global connectivity settings and ConnectivityService active default network without exposing identifiers"
      },
      semantics: "read_only_connectivity_state_not_remote_reachability"
    });
    expect(driver.getDeviceNetworkState).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 1000 });
  });
});

describe("device storage runtime", () => {
  it("returns statfs-derived storage capacity with resolved serial and byte math", async () => {
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
        exitCode: 0,
        durationMs: 9
      })
    );

    await expect(getDeviceStorage(driver, { timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toEqual({
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
        },
        {
          role: "tmp",
          path: "/data/local/tmp",
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
        }
      ],
      entry_count: 3,
      ok_count: 3,
      unavailable_count: 0,
      query: {
        method: "statfs_paths",
        paths: ["/data", "/sdcard", "/data/local/tmp"],
        exit_code: 0,
        command_duration_ms: 9
      },
      verify: {
        policy: "statfs_storage_parse",
        ok: true,
        attempts: 1,
        reason: "parsed statfs capacity for all fixed storage roles"
      },
      semantics: "read_only_storage_capacity_snapshot_not_quota_or_write_permission"
    });
    expect(driver.getDeviceStorageState).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 1000 });
  });

  it("keeps partial statfs failures as per-entry unavailable records", async () => {
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
        exitCode: 1
      })
    );

    await expect(getDeviceStorage(driver, { timeout_ms: 1000 })).resolves.toMatchObject({
      device_serial: "emulator-5554",
      entry_count: 3,
      ok_count: 2,
      unavailable_count: 1,
      entries: [
        { role: "data", ok: true },
        {
          role: "shared",
          path: "/sdcard",
          ok: false,
          error: { reason: "statfs_failed", message: "No such file or directory" }
        },
        { role: "tmp", ok: true }
      ],
      query: { method: "statfs_paths", exit_code: 1 },
      verify: {
        reason: "parsed statfs capacity for at least one fixed storage role; unavailable roles carry per-entry errors"
      }
    });
  });
});

describe("device battery runtime", () => {
  it("returns a read-only battery snapshot with resolved serial", async () => {
    const driver = makeDriver([]);
    driver.getDeviceBatteryState.mockResolvedValueOnce(
      batteryDriverResult({
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

    await expect(getDeviceBattery(driver, { timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toEqual({
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
    });
    expect(driver.getDeviceBatteryState).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 1000 });
  });

  it("keeps absent batteries successful with a narrower verify reason", async () => {
    const driver = makeDriver([]);
    driver.getDeviceBatteryState.mockResolvedValueOnce(
      batteryDriverResult({
        battery: {
          ...batteryDriverResult().battery,
          level_percent: null,
          present: false,
          charge_counter_uah: null
        }
      })
    );

    await expect(getDeviceBattery(driver, { timeout_ms: 1000 })).resolves.toMatchObject({
      device_serial: "emulator-5554",
      battery: { level_percent: null, present: false, charge_counter_uah: null },
      verify: {
        reason: "parsed dumpsys battery snapshot; device reports battery not present"
      }
    });
  });
});

describe("device time runtime", () => {
  it("returns a read-only time snapshot with resolved serial and selected timezone source", async () => {
    const driver = makeDriver([]);
    driver.getDeviceTimeState.mockResolvedValueOnce(
      timeDriverResult({
        queries: {
          date: { exitCode: 0, durationMs: 1 },
          autoTime: { exitCode: 0, durationMs: 2 },
          autoTimeZone: { exitCode: 0, durationMs: 3 },
          settingsTimeZone: { exitCode: 0, durationMs: 4 },
          persistSysTimeZone: { exitCode: 0, durationMs: 5 }
        }
      })
    );

    await expect(getDeviceTime(driver, { timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toEqual({
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
    });
    expect(driver.getDeviceTimeState).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 1000 });
  });

  it("prefers settings timezone and keeps missing timezone sources nullable", async () => {
    const settingsDriver = makeDriver([]);
    settingsDriver.getDeviceTimeState.mockResolvedValueOnce(
      timeDriverResult({
        timezoneSources: {
          settings_global_time_zone: "Europe/Paris",
          persist_sys_timezone: "Asia/Shanghai"
        }
      })
    );
    await expect(getDeviceTime(settingsDriver, { timeout_ms: 1000 })).resolves.toMatchObject({
      timezone: { id: "Europe/Paris", source: "settings_global_time_zone" }
    });

    const nullDriver = makeDriver([]);
    nullDriver.getDeviceTimeState.mockResolvedValueOnce(
      timeDriverResult({
        timezoneSources: {
          settings_global_time_zone: null,
          persist_sys_timezone: null
        }
      })
    );
    await expect(getDeviceTime(nullDriver, { timeout_ms: 1000 })).resolves.toMatchObject({
      timezone: { id: null, source: null }
    });
  });
});

describe("device locale runtime", () => {
  it("selects the highest-priority parseable locale source and reports invalid skipped entries", async () => {
    const driver = makeDriver([]);
    driver.getDeviceLocaleState.mockResolvedValueOnce(
      localeDriverResult({
        sources: {
          system_locales: "@@bad, zh-Hant-TW, en_US, zh-Hant-TW",
          persist_sys_locale: "zh-CN",
          ro_product_locale: "en-US",
          ro_product_locale_language: "en",
          ro_product_locale_region: "US"
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

    await expect(getDeviceLocale(driver, { timeout_ms: 1000, device_serial: "emulator-5554" })).resolves.toEqual({
      device_serial: "emulator-5554",
      locales: [
        { tag: "zh-Hant-TW", base_name: "zh-Hant-TW", language: "zh", script: "Hant", region: "TW" },
        { tag: "en-US", base_name: "en-US", language: "en", script: null, region: "US" }
      ],
      locales_count: 2,
      primary_locale: { tag: "zh-Hant-TW", base_name: "zh-Hant-TW", language: "zh", script: "Hant", region: "TW" },
      selected_source: "system_locales",
      sources: {
        system_locales: "@@bad, zh-Hant-TW, en_US, zh-Hant-TW",
        persist_sys_locale: "zh-CN",
        ro_product_locale: "en-US",
        ro_product_locale_language: "en",
        ro_product_locale_region: "US"
      },
      invalid_sources: [
        {
          source: "system_locales",
          index: 0,
          value: "@@bad",
          reason: "locale tag was not parseable as BCP 47"
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
    });
    expect(driver.getDeviceLocaleState).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 1000 });
  });

  it("falls back to product language/region and succeeds empty when all locale sources are absent", async () => {
    const driver = makeDriver([]);
    driver.getDeviceLocaleState.mockResolvedValueOnce(
      localeDriverResult({
        sources: {
          system_locales: null,
          persist_sys_locale: "POSIX",
          ro_product_locale: null,
          ro_product_locale_language: "en",
          ro_product_locale_region: "US"
        }
      })
    );

    await expect(getDeviceLocale(driver, { timeout_ms: 1000 })).resolves.toMatchObject({
      locales: [{ tag: "en-US", language: "en", region: "US" }],
      locales_count: 1,
      selected_source: "ro_product_locale_language_region",
      invalid_sources: [
        {
          source: "persist_sys_locale",
          index: null,
          value: "POSIX",
          reason: "legacy locale sentinel is not a BCP 47 locale"
        }
      ]
    });

    driver.getDeviceLocaleState.mockResolvedValueOnce(
      localeDriverResult({
        sources: {
          system_locales: null,
          persist_sys_locale: null,
          ro_product_locale: null,
          ro_product_locale_language: null,
          ro_product_locale_region: null
        }
      })
    );
    await expect(getDeviceLocale(driver, { timeout_ms: 1000 })).resolves.toMatchObject({
      locales: [],
      locales_count: 0,
      primary_locale: null,
      selected_source: null,
      invalid_sources: [],
      verify: { reason: "no Android locale source reported a usable locale" }
    });
  });

  it("fails when every non-empty locale source is malformed", async () => {
    const driver = makeDriver([]);
    driver.getDeviceLocaleState.mockResolvedValueOnce(
      localeDriverResult({
        sources: {
          system_locales: "C",
          persist_sys_locale: "@@bad",
          ro_product_locale: null,
          ro_product_locale_language: null,
          ro_product_locale_region: "US"
        }
      })
    );

    await expect(getDeviceLocale(driver, { timeout_ms: 1000 })).rejects.toMatchObject({
      code: "DEVICE_LOCALE_FAILED",
      retriable: false,
      details: {
        invalid_sources: expect.arrayContaining([
          expect.objectContaining({ source: "system_locales", value: "C" }),
          expect.objectContaining({ source: "persist_sys_locale", value: "@@bad" }),
          expect.objectContaining({ source: "ro_product_locale_language_region", value: "US" })
        ]) as unknown
      }
    });

    driver.getDeviceLocaleState.mockResolvedValueOnce(
      localeDriverResult({
        sources: {
          system_locales: Array.from({ length: 17 }, () => "en-US").join(","),
          persist_sys_locale: null,
          ro_product_locale: null,
          ro_product_locale_language: null,
          ro_product_locale_region: null
        }
      })
    );

    await expect(getDeviceLocale(driver, { timeout_ms: 1000 })).rejects.toMatchObject({
      code: "DEVICE_LOCALE_FAILED",
      details: {
        invalid_sources: [
          {
            source: "system_locales",
            index: null,
            value: expect.any(String) as string,
            reason: "locale source reported too many locales"
          }
        ]
      }
    });
  });
});
