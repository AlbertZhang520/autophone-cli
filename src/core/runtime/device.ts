import {
  AutophoneError,
  type AppActivitiesRequest,
  type AppActivitiesResult,
  type AppClearDataRequest,
  type AppClearDataResult,
  type AppInstallRequest,
  type AppInstallResult,
  type AppInspectRequest,
  type AppInspectResult,
  type AppListRequest,
  type AppListResult,
  type AppListScope,
  type AppListState,
  type AppLinksRequest,
  type AppLinksResult,
  type AppOpsGetRequest,
  type AppOpsGetResult,
  type AppGraphicsRequest,
  type AppGraphicsResult,
  type AppLaunchRequest,
  type AppLaunchResult,
  type AppMemoryRequest,
  type AppMemoryResult,
  type AppCurrentRequest,
  type AppCurrentResult,
  type AppOpenUrlRequest,
  type AppOpenUrlResult,
  type AppResolveUrlRequest,
  type AppResolveUrlResult,
  type AppPackageInfoRequest,
  type AppPackageInfoResult,
  type AppPermissionOperation,
  type AppPermissionInspectRequest,
  type AppPermissionInspectResult,
  type AppPermissionRequest,
  type AppPermissionResult,
  type AppPidsRequest,
  type AppPidsResult,
  type AppStopRequest,
  type AppStopResult,
  type AppStartRequest,
  type AppStartResult,
  type AppUninstallRequest,
  type AppUninstallResult,
  type DeviceBatteryGetRequest,
  type DeviceBatteryGetResult,
  type DeviceTimeGetRequest,
  type DeviceTimeGetResult,
  type DeviceDetailsRequest,
  type DeviceDetailsResult,
  type DeviceCurrentUserRequest,
  type DeviceCurrentUserResult,
  type DeviceAccessibilityGetRequest,
  type DeviceAccessibilityGetResult,
  type DeviceAnimationScaleValue,
  type DeviceAnimationsGetRequest,
  type DeviceAnimationsGetResult,
  type DeviceAnimationsSetRequest,
  type DeviceAnimationsSetResult,
  type DeviceBrightnessGetRequest,
  type DeviceBrightnessGetResult,
  type DeviceEnsureReadyRequest,
  type DeviceEnsureReadyResult,
  type DeviceImeGetRequest,
  type DeviceImeGetResult,
  type DeviceLocaleGetRequest,
  type DeviceLocaleGetResult,
  type DeviceListRequest,
  type DeviceListResult,
  type DeviceNetworkGetRequest,
  type DeviceNetworkGetResult,
  type DeviceNotificationRecord,
  type DeviceNotificationsRequest,
  type DeviceNotificationsResult,
  type DeviceOrientationRequest,
  type DeviceOrientationResult,
  type DeviceOrientationSetRequest,
  type DeviceOrientationSetResult,
  type DeviceRingerGetRequest,
  type DeviceRingerGetResult,
  type DeviceReadyState,
  type DeviceScreenDisplayPower,
  type DeviceScreenGetRequest,
  type DeviceScreenGetResult,
  type DeviceStorageGetRequest,
  type DeviceStorageGetResult,
  type DeviceStatusBarCommand,
  type DeviceStatusBarIconsRequest,
  type DeviceStatusBarIconsResult,
  type DeviceStatusBarRequest,
  type DeviceStatusBarResult,
  type DeviceUsersRequest,
  type DeviceUsersResult,
  type DeviceVolumeGetRequest,
  type DeviceVolumeGetResult,
  type DeviceVolumeStream,
  type DoubleTapRequest,
  type DoubleTapResult,
  type DragGesture,
  type DragRequest,
  type DragResult,
  type FileEntryKind,
  type FileHashAlgorithm,
  type FileTransferCompression,
  type FindRequest,
  type FindResult,
  type KeyName,
  type KeyPressRequest,
  type KeyPressResult,
  type LongPressRequest,
  type LongPressResult,
  type LogsDumpRequest,
  type LogsDumpResult,
  type ObserveResult,
  type Bounds,
  type Point,
  type ScrollAmount,
  type ScrollDirection,
  type ScrollRequest,
  type ScrollResult,
  type ScrollUntilReason,
  type ScrollUntilRequest,
  type ScrollUntilResult,
  type ScreenshotRequest,
  type ScreenshotResult,
  type ScreenrecordRequest,
  type ScreenrecordResult,
  type Snapshot,
  type TapRequest,
  type TapResult,
  type TextClearRequest,
  type TextClearResult,
  type TextInputRequest,
  type TextInputResult,
  type WaitAppRequest,
  type WaitAppResult,
  type WaitUiRequest,
  type WaitUiResult
} from "../../contracts/index.js";
import { DEVICE_VOLUME_STREAMS, type AndroidDriver, type DriverDeviceStorageEntry, type DriverUserRotationPolicy } from "./types.js";
import { APP_LAUNCH_VERIFY_INTERVAL_MS, APP_STOP_VERIFY_INTERVAL_MS, APP_VERIFY_MAX_ATTEMPTS, APP_VERIFY_SETTLE_MS, DEVICE_READY_VERIFY_INTERVAL_MS, KEYCODES, LOG_DUMP_BUFFERS, LOG_DUMP_MAX_LINE_CHARS, LOG_DUMP_MAX_PID_COUNT, LOG_DUMP_MAX_TOTAL_CHARS, ORIENTATION_SET_VERIFY_MAX_ATTEMPTS, ORIENTATION_SET_VERIFY_SETTLE_MS, SCROLL_VERIFY_SETTLE_MS, TEXT_INPUT_CHARSET, VERIFY_MAX_ATTEMPTS, encodeTextForAdbInput, VERIFY_SETTLE_MS, assertDragDistance, boundNotifications, capLogLines, createLogCapState, describeDeviceReadyReason, describeHttpUrl, getChangedFields, isDeviceAwake, isDeviceReady, isScreenUnlocked, normalizeActivityName, normalizeDisplayPower, planScrollGestureForScope, readPngDimensions, remainingDeviceReadyTimeoutMs, remainingWaitMs, isWaitBudgetPollTimeout, resolveDragEndpoint, resolveSingleUiActionTarget, sleep, sleepUntilNextAttempt, verifyDoubleTap, verifyDrag, verifyLongPress, verifyTap } from "./shared.js";

export async function listDevices(driver: AndroidDriver, request: DeviceListRequest): Promise<DeviceListResult> {
  const devices = (await driver.listDevices({ timeoutMs: request.timeout_ms })).map((device) => ({
    serial: device.serial,
    state: device.state,
    online: device.state === "device",
    details: device.details
  }));
  const stateCounts = devices.reduce<Record<string, number>>((counts, device) => {
    counts[device.state] = (counts[device.state] ?? 0) + 1;
    return counts;
  }, {});
  const onlineDevices = devices.filter((device) => device.online);
  const unauthorizedCount = stateCounts.unauthorized ?? 0;
  const offlineCount = stateCounts.offline ?? 0;
  const onlineCount = stateCounts.device ?? 0;
  const knownCount = onlineCount + unauthorizedCount + offlineCount;

  return {
    devices,
    count: devices.length,
    online_count: onlineCount,
    unauthorized_count: unauthorizedCount,
    offline_count: offlineCount,
    other_count: devices.length - knownCount,
    state_counts: stateCounts,
    default_serial: onlineDevices.length === 1 ? onlineDevices[0]!.serial : null
  };
}

export async function listDeviceUsers(driver: AndroidDriver, request: DeviceUsersRequest): Promise<DeviceUsersResult> {
  const result = await driver.listUsers({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const users = result.users.map((user) => ({
    id: user.id,
    name: user.name,
    flags_hex: user.flagsHex,
    running: user.running
  }));

  return {
    device_serial: result.serial,
    users,
    count: users.length,
    running_user_ids: users.filter((user) => user.running).map((user) => user.id),
    query: {
      method: "pm_list_users",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "pm_list_users_parse",
      ok: true,
      attempts: 1,
      reason: "standard pm list users output parsed"
    },
    semantics: "standard_pm_list_users_non_verbose"
  };
}

export async function currentDeviceUser(
  driver: AndroidDriver,
  request: DeviceCurrentUserRequest
): Promise<DeviceCurrentUserResult> {
  const result = await driver.getCurrentUser({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    current_user_id: result.currentUserId,
    query: {
      method: "cmd_activity_get_current_user",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "activity_manager_current_user",
      ok: true,
      attempts: 1,
      reason: "Activity Manager current user id parsed"
    },
    semantics: "activity_manager_reported_current_user_id"
  };
}

export async function deviceOrientation(
  driver: AndroidDriver,
  request: DeviceOrientationRequest
): Promise<DeviceOrientationResult> {
  const result = await driver.getOrientation({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    window_size: result.windowSize,
    orientation: result.orientation,
    rotation_degrees: result.rotationDegrees,
    auto_rotate: result.autoRotate,
    query: {
      window_size: {
        method: "wm_size",
        exit_code: result.queries.windowSize.exitCode,
        command_duration_ms: result.queries.windowSize.durationMs
      },
      rotation: {
        method: "dumpsys_window",
        exit_code: result.queries.rotation.exitCode,
        command_duration_ms: result.queries.rotation.durationMs
      },
      auto_rotate: {
        method: "settings_get_accelerometer_rotation",
        exit_code: result.queries.autoRotate.exitCode,
        command_duration_ms: result.queries.autoRotate.durationMs
      }
    },
    verify: {
      policy: "actual_display_rotation_parse",
      ok: true,
      attempts: 1,
      reason: "actual display rotation parsed from dumpsys window"
    },
    semantics: "actual_display_rotation_without_ui_dump"
  };
}

export async function setDeviceOrientation(
  driver: AndroidDriver,
  request: DeviceOrientationSetRequest
): Promise<DeviceOrientationSetResult> {
  const requestedPolicy = requestedUserRotationPolicy(request);
  const before = {
    orientation: await deviceOrientation(driver, {
      device_serial: request.device_serial,
      timeout_ms: request.timeout_ms
    }),
    user_rotation: mapUserRotationPolicy(
      await driver.getUserRotationPolicy({
        deviceSerial: request.device_serial,
        timeoutMs: request.timeout_ms
      })
    )
  };

  const set = await driver.setUserRotation({
    mode: requestedPolicy.mode,
    rotationDegrees: requestedPolicy.rotationDegrees ?? undefined,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  let afterPolicy: DeviceOrientationSetResult["after"]["user_rotation"] | undefined;
  let attempts = 0;
  for (let attempt = 1; attempt <= ORIENTATION_SET_VERIFY_MAX_ATTEMPTS; attempt += 1) {
    attempts = attempt;
    if (attempt > 1) {
      await sleep(ORIENTATION_SET_VERIFY_SETTLE_MS);
    }
    afterPolicy = mapUserRotationPolicy(
      await driver.getUserRotationPolicy({
        deviceSerial: request.device_serial,
        timeoutMs: request.timeout_ms
      })
    );
    if (userRotationPolicyMatches(afterPolicy, requestedPolicy)) {
      break;
    }
  }

  if (afterPolicy === undefined || !userRotationPolicyMatches(afterPolicy, requestedPolicy)) {
    throw new AutophoneError({
      code: "VERIFY_FAILED",
      message: "device orientation policy was not applied",
      retriable: false,
      details: {
        expected: requestedPolicy,
        actual: afterPolicy ?? null,
        attempts
      }
    });
  }

  const after = {
    orientation: await deviceOrientation(driver, {
      device_serial: request.device_serial,
      timeout_ms: request.timeout_ms
    }),
    user_rotation: afterPolicy
  };

  return {
    device_serial: request.device_serial,
    requested: {
      mode: request.mode,
      rotation_degrees: request.mode === "lock" ? request.rotation_degrees ?? null : null
    },
    before,
    set: {
      method: "wm_user_rotation",
      mode: requestedPolicy.mode,
      rotation_degrees: requestedPolicy.rotationDegrees,
      exit_code: set.exitCode,
      command_duration_ms: set.durationMs
    },
    after,
    verify: {
      policy: "user_rotation_policy_applied",
      ok: true,
      attempts,
      reason:
        request.mode === "auto"
          ? "wm user-rotation reports free mode"
          : "wm user-rotation reports the requested locked rotation"
    },
    semantics: "device_wide_user_rotation_policy"
  };
}

function requestedUserRotationPolicy(request: DeviceOrientationSetRequest): {
  mode: "free" | "lock";
  rotationDegrees: DeviceOrientationSetResult["set"]["rotation_degrees"];
} {
  if (request.mode === "auto") {
    return { mode: "free", rotationDegrees: null };
  }
  return { mode: "lock", rotationDegrees: request.rotation_degrees ?? null };
}

function mapUserRotationPolicy(policy: DriverUserRotationPolicy): DeviceOrientationSetResult["after"]["user_rotation"] {
  return {
    mode: policy.mode,
    rotation_degrees: policy.mode === "lock" ? policy.rotationDegrees : null
  };
}

function userRotationPolicyMatches(
  actual: DeviceOrientationSetResult["after"]["user_rotation"],
  expected: { mode: "free" | "lock"; rotationDegrees: DeviceOrientationSetResult["set"]["rotation_degrees"] }
): boolean {
  if (actual.mode !== expected.mode) {
    return false;
  }
  if (expected.mode === "free") {
    return true;
  }
  return actual.rotation_degrees === expected.rotationDegrees;
}

export async function controlStatusBar(
  driver: AndroidDriver,
  request: DeviceStatusBarRequest
): Promise<DeviceStatusBarResult> {
  const result = await driver.controlStatusBar(statusBarActionToCommand(request.action), {
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    action: request.action,
    statusbar: {
      method: "cmd_statusbar",
      command: result.command,
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "cmd_statusbar_clean_exit",
      ok: true,
      attempts: 1,
      reason: "cmd statusbar exited 0 with no usage, help, or error output; panel state is not independently verified"
    },
    semantics: "systemui_statusbar_panel_command"
  };
}

function statusBarActionToCommand(action: DeviceStatusBarRequest["action"]): DeviceStatusBarCommand {
  switch (action) {
    case "expand_notifications":
      return "expand-notifications";
    case "expand_settings":
      return "expand-settings";
    case "collapse":
      return "collapse";
  }
}

export async function statusBarIcons(
  driver: AndroidDriver,
  request: DeviceStatusBarIconsRequest
): Promise<DeviceStatusBarIconsResult> {
  const result = await driver.getStatusBarIcons({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    icons: result.icons,
    count: result.icons.length,
    query: {
      method: "cmd_statusbar_get_status_icons",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "cmd_statusbar_icons_parse",
      ok: true,
      attempts: 1,
      reason: "cmd statusbar get-status-icons output parsed as ordered SystemUI icon slots"
    },
    semantics: "systemui_statusbar_icon_slots"
  };
}

export async function getDeviceVolume(
  driver: AndroidDriver,
  request: DeviceVolumeGetRequest
): Promise<DeviceVolumeGetResult> {
  const result = await driver.getVolume({
    stream: DEVICE_VOLUME_STREAMS[request.stream],
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    stream: {
      name: result.stream.name,
      android_stream_id: result.stream.androidStreamId,
      android_stream_name: result.stream.androidStreamName
    },
    volume: result.volume,
    query: {
      method: "cmd_media_session_volume_get",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "media_session_volume_parse",
      ok: true,
      attempts: 1,
      reason: "cmd media_session volume output parsed one AudioManager stream index/range and matched the requested stream id/name"
    },
    semantics: "audio_manager_stream_volume_index"
  };
}

export async function getDeviceRinger(
  driver: AndroidDriver,
  request: DeviceRingerGetRequest
): Promise<DeviceRingerGetResult> {
  const result = await driver.getRinger({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    ringer: result.ringer,
    zen: result.zen,
    affected_streams: result.affectedStreams,
    muted_streams: result.mutedStreams,
    query: {
      method: "dumpsys_audio",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "dumpsys_audio_ringer_state_parse",
      ok: true,
      attempts: 1,
      reason: "dumpsys audio Ringer mode section parsed internal/external ringer mode, optional zen mode, and ringer stream masks"
    },
    semantics: "audio_service_ringer_zen_state_not_effective_audibility"
  };
}

export async function getDeviceNotifications(
  driver: AndroidDriver,
  request: DeviceNotificationsRequest
): Promise<DeviceNotificationsResult> {
  const result = await driver.getNotifications({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const bounded = boundNotifications(result.notifications, request);

  return {
    device_serial: result.serial,
    requested: {
      max_notifications: request.max_notifications,
      max_field_chars: request.max_field_chars,
      max_total_chars: request.max_total_chars
    },
    notifications: bounded.notifications,
    counts: {
      total_seen: result.notifications.length,
      returned: bounded.notifications.length,
      dropped_by_limit: result.notifications.length - bounded.notifications.length
    },
    truncated: bounded.truncated,
    sensitive: true,
    query: {
      method: "dumpsys_notification_noredact",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "notification_dump_parse",
      ok: true,
      attempts: 1,
      reason: "dumpsys notification output parsed into a bounded point-in-time notification snapshot; notification content is sensitive and may be truncated"
    },
    semantics: "read_only_notification_snapshot_sensitive_bounded"
  };
}

export async function deviceDetails(driver: AndroidDriver, request: DeviceDetailsRequest): Promise<DeviceDetailsResult> {
  return driver.getDeviceDetails({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
}

export async function getDeviceScreen(
  driver: AndroidDriver,
  request: DeviceScreenGetRequest
): Promise<DeviceScreenGetResult> {
  const result = await driver.getDeviceScreenState({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  return {
    device_serial: result.serial,
    state: result.state,
    screen: {
      display_power: normalizeDisplayPower(result.state),
      screen_unlocked: isScreenUnlocked(result.state)
    },
    keyguard: {
      showing: result.state.keyguard_showing,
      secure: result.state.keyguard_secure
    },
    query: {
      sources: [
        {
          method: "dumpsys_power",
          exit_code: result.queries.power.exitCode,
          command_duration_ms: result.queries.power.durationMs
        },
        {
          method: "dumpsys_window",
          exit_code: result.queries.window.exitCode,
          command_duration_ms: result.queries.window.durationMs
        }
      ]
    },
    verify: {
      policy: "screen_keyguard_state_parse",
      ok: true,
      attempts: 1,
      reason: "parsed display power and keyguard state without waking or dismissing keyguard"
    },
    semantics: "read_only_screen_keyguard_probe_not_readiness_mutation"
  };
}

export async function getDeviceNetwork(
  driver: AndroidDriver,
  request: DeviceNetworkGetRequest
): Promise<DeviceNetworkGetResult> {
  const result = await driver.getDeviceNetworkState({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  return {
    device_serial: result.serial,
    settings: result.settings,
    active: result.active,
    query: {
      sources: [
        {
          method: "settings_global_airplane_mode_on",
          exit_code: result.queries.airplaneMode.exitCode,
          command_duration_ms: result.queries.airplaneMode.durationMs
        },
        {
          method: "settings_global_wifi_on",
          exit_code: result.queries.wifi.exitCode,
          command_duration_ms: result.queries.wifi.durationMs
        },
        {
          method: "settings_global_mobile_data",
          exit_code: result.queries.mobileData.exitCode,
          command_duration_ms: result.queries.mobileData.durationMs
        },
        {
          method: "dumpsys_connectivity",
          exit_code: result.queries.connectivity.exitCode,
          command_duration_ms: result.queries.connectivity.durationMs
        }
      ]
    },
    verify: {
      policy: "settings_and_connectivity_service_parse",
      ok: true,
      attempts: 1,
      reason: "parsed global connectivity settings and ConnectivityService active default network without exposing identifiers"
    },
    semantics: "read_only_connectivity_state_not_remote_reachability"
  };
}

export async function getDeviceStorage(
  driver: AndroidDriver,
  request: DeviceStorageGetRequest
): Promise<DeviceStorageGetResult> {
  const result = await driver.getDeviceStorageState({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const entries = result.entries.map(toDeviceStorageEntry);
  const okCount = entries.filter((entry) => entry.ok).length;
  return {
    device_serial: result.serial,
    entries,
    entry_count: entries.length,
    ok_count: okCount,
    unavailable_count: entries.length - okCount,
    query: {
      method: "statfs_paths",
      paths: result.paths,
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "statfs_storage_parse",
      ok: true,
      attempts: 1,
      reason:
        okCount === entries.length
          ? "parsed statfs capacity for all fixed storage roles"
          : "parsed statfs capacity for at least one fixed storage role; unavailable roles carry per-entry errors"
    },
    semantics: "read_only_storage_capacity_snapshot_not_quota_or_write_permission"
  };
}

function toDeviceStorageEntry(entry: DriverDeviceStorageEntry): DeviceStorageGetResult["entries"][number] {
  if (!entry.ok) {
    return entry;
  }
  const totalBytes = entry.totalBlocks * entry.blockSizeBytes;
  const availableBytes = entry.availableBlocks * entry.blockSizeBytes;
  const freeBytes = entry.freeBlocks * entry.blockSizeBytes;
  return {
    role: entry.role,
    path: entry.path,
    ok: true,
    filesystem_type: entry.filesystemType,
    block_size_bytes: entry.blockSizeBytes,
    total_blocks: entry.totalBlocks,
    available_blocks: entry.availableBlocks,
    free_blocks: entry.freeBlocks,
    total_bytes: totalBytes,
    available_bytes: availableBytes,
    free_bytes: freeBytes,
    used_bytes: totalBytes - freeBytes
  };
}

export async function getDeviceBattery(
  driver: AndroidDriver,
  request: DeviceBatteryGetRequest
): Promise<DeviceBatteryGetResult> {
  const result = await driver.getDeviceBatteryState({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  return {
    device_serial: result.serial,
    battery: result.battery,
    query: {
      method: "dumpsys_battery",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "dumpsys_battery_parse",
      ok: true,
      attempts: 1,
      reason:
        result.battery.present === false
          ? "parsed dumpsys battery snapshot; device reports battery not present"
          : "parsed dumpsys battery snapshot without changing charge state"
    },
    semantics: "read_only_battery_snapshot_not_charge_control_or_health_calibration"
  };
}

export async function getDeviceTime(driver: AndroidDriver, request: DeviceTimeGetRequest): Promise<DeviceTimeGetResult> {
  const result = await driver.getDeviceTimeState({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const timezone = selectDeviceTimeZone(result.timezoneSources);
  return {
    device_serial: result.serial,
    time: result.time,
    settings: result.settings,
    timezone: {
      ...timezone,
      sources: result.timezoneSources
    },
    query: {
      sources: [
        {
          method: "date_unix_epoch_offset",
          exit_code: result.queries.date.exitCode,
          command_duration_ms: result.queries.date.durationMs
        },
        {
          method: "settings_global_auto_time",
          exit_code: result.queries.autoTime.exitCode,
          command_duration_ms: result.queries.autoTime.durationMs
        },
        {
          method: "settings_global_auto_time_zone",
          exit_code: result.queries.autoTimeZone.exitCode,
          command_duration_ms: result.queries.autoTimeZone.durationMs
        },
        {
          method: "settings_global_time_zone",
          exit_code: result.queries.settingsTimeZone.exitCode,
          command_duration_ms: result.queries.settingsTimeZone.durationMs
        },
        {
          method: "getprop_persist_sys_timezone",
          exit_code: result.queries.persistSysTimeZone.exitCode,
          command_duration_ms: result.queries.persistSysTimeZone.durationMs
        }
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
}

function selectDeviceTimeZone(
  sources: DeviceTimeGetResult["timezone"]["sources"]
): Pick<DeviceTimeGetResult["timezone"], "id" | "source"> {
  if (sources.settings_global_time_zone !== null) {
    return { id: sources.settings_global_time_zone, source: "settings_global_time_zone" };
  }
  if (sources.persist_sys_timezone !== null) {
    return { id: sources.persist_sys_timezone, source: "persist_sys_timezone" };
  }
  return { id: null, source: null };
}

export async function getDeviceLocale(
  driver: AndroidDriver,
  request: DeviceLocaleGetRequest
): Promise<DeviceLocaleGetResult> {
  const result = await driver.getDeviceLocaleState({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const localeState = selectDeviceLocale(result.sources);
  return {
    device_serial: result.serial,
    ...localeState,
    sources: result.sources,
    query: {
      sources: [
        {
          method: "settings_system_system_locales",
          exit_code: result.queries.systemLocales.exitCode,
          command_duration_ms: result.queries.systemLocales.durationMs
        },
        {
          method: "getprop_persist_sys_locale",
          exit_code: result.queries.persistSysLocale.exitCode,
          command_duration_ms: result.queries.persistSysLocale.durationMs
        },
        {
          method: "getprop_ro_product_locale",
          exit_code: result.queries.roProductLocale.exitCode,
          command_duration_ms: result.queries.roProductLocale.durationMs
        },
        {
          method: "getprop_ro_product_locale_language",
          exit_code: result.queries.roProductLocaleLanguage.exitCode,
          command_duration_ms: result.queries.roProductLocaleLanguage.durationMs
        },
        {
          method: "getprop_ro_product_locale_region",
          exit_code: result.queries.roProductLocaleRegion.exitCode,
          command_duration_ms: result.queries.roProductLocaleRegion.durationMs
        }
      ]
    },
    verify: {
      policy: "locale_sources_parse",
      ok: true,
      attempts: 1,
      reason:
        localeState.locales.length > 0
          ? "parsed Android system locale sources without inferring app-specific language"
          : "no Android locale source reported a usable locale"
    },
    semantics: "read_only_locale_state_not_app_language_or_translation"
  };
}

type DeviceLocaleEntry = DeviceLocaleGetResult["locales"][number];
type DeviceLocaleInvalidSource = DeviceLocaleGetResult["invalid_sources"][number];
type DeviceLocaleSelectedSource = NonNullable<DeviceLocaleGetResult["selected_source"]>;
type DeviceLocaleSourceInput = {
  source: DeviceLocaleSelectedSource;
  raw: string | null;
  allowList: boolean;
};
type DeviceLocaleParseInput = {
  source: DeviceLocaleSelectedSource;
  raw: string;
  allowList: boolean;
};

const MAX_LOCALES_PER_SOURCE = 16;
const LEGACY_LOCALE_SENTINEL_RE = /^(?:c|posix|root)$/i;

function selectDeviceLocale(sources: DeviceLocaleGetResult["sources"]): Pick<
  DeviceLocaleGetResult,
  "locales" | "locales_count" | "primary_locale" | "selected_source" | "invalid_sources"
> {
  const candidates: DeviceLocaleSourceInput[] = [
    { source: "system_locales", raw: sources.system_locales, allowList: true },
    { source: "persist_sys_locale", raw: sources.persist_sys_locale, allowList: false },
    { source: "ro_product_locale", raw: sources.ro_product_locale, allowList: false }
  ];
  const languageRegion = combineLocaleLanguageRegion(
    sources.ro_product_locale_language,
    sources.ro_product_locale_region
  );
  if (languageRegion.raw !== null) {
    candidates.push({ source: "ro_product_locale_language_region", raw: languageRegion.raw, allowList: false });
  }

  const invalidSources: DeviceLocaleInvalidSource[] = [];
  let sawNonEmptySource = false;
  if (languageRegion.invalid !== null) {
    sawNonEmptySource = true;
    invalidSources.push(languageRegion.invalid);
  }

  for (const candidate of candidates) {
    const raw = candidate.raw;
    if (raw === null) {
      continue;
    }
    sawNonEmptySource = true;
    const parsed = parseLocaleCandidate({ ...candidate, raw });
    invalidSources.push(...parsed.invalidSources);
    if (parsed.locales.length > 0) {
      return {
        locales: parsed.locales,
        locales_count: parsed.locales.length,
        primary_locale: parsed.locales[0]!,
        selected_source: candidate.source,
        invalid_sources: invalidSources
      };
    }
  }

  if (sawNonEmptySource && invalidSources.length > 0) {
    throw new AutophoneError({
      code: "DEVICE_LOCALE_FAILED",
      message: "Android locale sources did not contain a parseable locale",
      retriable: false,
      details: {
        invalid_sources: invalidSources
      }
    });
  }

  return {
    locales: [],
    locales_count: 0,
    primary_locale: null,
    selected_source: null,
    invalid_sources: []
  };
}

function combineLocaleLanguageRegion(
  language: string | null,
  region: string | null
): { raw: string | null; invalid: DeviceLocaleInvalidSource | null } {
  if (language === null) {
    if (region !== null) {
      return {
        raw: null,
        invalid: {
          source: "ro_product_locale_language_region",
          index: null,
          value: region,
          reason: "ro.product.locale.region was reported without ro.product.locale.language"
        }
      };
    }
    return { raw: null, invalid: null };
  }
  return {
    raw: region === null ? language : `${language}-${region}`,
    invalid: null
  };
}

function parseLocaleCandidate(candidate: DeviceLocaleParseInput): {
  locales: DeviceLocaleEntry[];
  invalidSources: DeviceLocaleInvalidSource[];
} {
  const rawValues = candidate.allowList ? candidate.raw.split(",") : [candidate.raw];
  if (rawValues.length > MAX_LOCALES_PER_SOURCE) {
    return {
      locales: [],
      invalidSources: [
        {
          source: candidate.source,
          index: null,
          value: candidate.raw.slice(0, 128),
          reason: "locale source reported too many locales"
        }
      ]
    };
  }

  const locales: DeviceLocaleEntry[] = [];
  const invalidSources: DeviceLocaleInvalidSource[] = [];
  const seenTags = new Set<string>();
  rawValues.forEach((rawValue, index) => {
    const value = rawValue.trim();
    if (value.length === 0) {
      invalidSources.push({
        source: candidate.source,
        index: candidate.allowList ? index : null,
        value: "<empty>",
        reason: "locale entry was empty"
      });
      return;
    }
    const parsed = parseLocaleTag(value);
    if (parsed.locale === null) {
      invalidSources.push({
        source: candidate.source,
        index: candidate.allowList ? index : null,
        value: value.slice(0, 128),
        reason: parsed.reason
      });
      return;
    }
    if (!seenTags.has(parsed.locale.tag)) {
      locales.push(parsed.locale);
      seenTags.add(parsed.locale.tag);
    }
  });

  return { locales, invalidSources };
}

function parseLocaleTag(value: string): { locale: DeviceLocaleEntry; reason?: undefined } | { locale: null; reason: string } {
  if (value.length > 128) {
    return { locale: null, reason: "locale tag was too long" };
  }
  if (LEGACY_LOCALE_SENTINEL_RE.test(value)) {
    return { locale: null, reason: "legacy locale sentinel is not a BCP 47 locale" };
  }
  try {
    const locale = new Intl.Locale(value.replace(/_/g, "-"));
    return {
      locale: {
        tag: locale.toString(),
        base_name: locale.baseName,
        language: locale.language,
        script: locale.script ?? null,
        region: locale.region ?? null
      }
    };
  } catch {
    return { locale: null, reason: "locale tag was not parseable as BCP 47" };
  }
}

export async function getDeviceIme(driver: AndroidDriver, request: DeviceImeGetRequest): Promise<DeviceImeGetResult> {
  const result = await driver.getDeviceImeState({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  return {
    device_serial: result.serial,
    keyboard: result.keyboard,
    service: result.service,
    ime: result.ime,
    query: {
      sources: [
        {
          method: "dumpsys_input_method",
          exit_code: result.queries.inputMethod.exitCode,
          command_duration_ms: result.queries.inputMethod.durationMs
        },
        {
          method: "settings_secure_default_input_method",
          exit_code: result.queries.defaultInputMethod.exitCode,
          command_duration_ms: result.queries.defaultInputMethod.durationMs
        },
        {
          method: "settings_secure_enabled_input_methods",
          exit_code: result.queries.enabledInputMethods.exitCode,
          command_duration_ms: result.queries.enabledInputMethods.durationMs
        }
      ]
    },
    verify: {
      policy: "input_method_service_parse",
      ok: true,
      attempts: 1,
      reason: "parsed InputMethodManagerService state and secure IME settings without exposing raw dumpsys output"
    },
    semantics: "read_only_ime_state_not_keyboard_geometry"
  };
}

export async function getDeviceBrightness(
  driver: AndroidDriver,
  request: DeviceBrightnessGetRequest
): Promise<DeviceBrightnessGetResult> {
  const result = await driver.getDeviceBrightnessState({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  return {
    device_serial: result.serial,
    settings: result.settings,
    display: result.display,
    query: {
      sources: [
        {
          method: "settings_system_screen_brightness",
          exit_code: result.queries.brightness.exitCode,
          command_duration_ms: result.queries.brightness.durationMs
        },
        {
          method: "settings_system_screen_brightness_mode",
          exit_code: result.queries.mode.exitCode,
          command_duration_ms: result.queries.mode.durationMs
        },
        {
          method: "settings_system_screen_auto_brightness_adj",
          exit_code: result.queries.autoAdjustment.exitCode,
          command_duration_ms: result.queries.autoAdjustment.durationMs
        },
        {
          method: "settings_system_screen_brightness_float",
          exit_code: result.queries.brightnessFloat.exitCode,
          command_duration_ms: result.queries.brightnessFloat.durationMs
        },
        {
          method: "dumpsys_display",
          exit_code: result.queries.display.exitCode,
          command_duration_ms: result.queries.display.durationMs
        }
      ]
    },
    verify: {
      policy: "display_brightness_state_parse",
      ok: true,
      attempts: 1,
      reason: "parsed display brightness settings and display service brightness fields without exposing raw dumpsys display output"
    },
    semantics: "read_only_display_brightness_state_not_visual_luminance"
  };
}

export async function getDeviceAnimations(
  driver: AndroidDriver,
  request: DeviceAnimationsGetRequest
): Promise<DeviceAnimationsGetResult> {
  const result = await driver.getDeviceAnimationsState({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const values = [
    result.settings.window_animation_scale.value,
    result.settings.transition_animation_scale.value,
    result.settings.animator_duration_scale.value
  ];

  return {
    device_serial: result.serial,
    settings: result.settings,
    animations_disabled: values.every((value) => value === 0),
    query: {
      sources: [
        {
          method: "settings_global_window_animation_scale",
          exit_code: result.queries.window.exitCode,
          command_duration_ms: result.queries.window.durationMs
        },
        {
          method: "settings_global_transition_animation_scale",
          exit_code: result.queries.transition.exitCode,
          command_duration_ms: result.queries.transition.durationMs
        },
        {
          method: "settings_global_animator_duration_scale",
          exit_code: result.queries.animator.exitCode,
          command_duration_ms: result.queries.animator.durationMs
        }
      ]
    },
    verify: {
      policy: "animation_scale_settings_parse",
      ok: true,
      attempts: 1,
      reason: "parsed global Android animation scale settings without writing settings or observing runtime animation behavior"
    },
    semantics: "read_only_animation_scale_settings_not_runtime_animation_state"
  };
}

export async function setDeviceAnimations(
  driver: AndroidDriver,
  request: DeviceAnimationsSetRequest
): Promise<DeviceAnimationsSetResult> {
  const beforeRead = await driver.getDeviceAnimationsState({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const deviceSerial = beforeRead.serial;
  const before = buildDeviceAnimationsSnapshot(beforeRead.settings);
  const set = await driver.setDeviceAnimationScales({
    scale: request.scale,
    deviceSerial,
    timeoutMs: request.timeout_ms
  });
  const afterRead = await driver.getDeviceAnimationsState({
    deviceSerial,
    timeoutMs: request.timeout_ms
  });
  const after = buildDeviceAnimationsSnapshot(afterRead.settings);

  if (!deviceAnimationScalesMatch(after, request.scale)) {
    throw new AutophoneError({
      code: "VERIFY_FAILED",
      message: "device animation scales were not applied",
      retriable: false,
      details: {
        expected: { scale: request.scale },
        actual: after.settings,
        device_serial: deviceSerial,
        attempts: 1
      }
    });
  }

  return {
    device_serial: deviceSerial,
    requested: {
      scale: request.scale
    },
    before,
    set: {
      sources: [
        {
          method: "settings_put_global_window_animation_scale",
          scale: set.scale,
          exit_code: set.commands.window.exitCode,
          command_duration_ms: set.commands.window.durationMs
        },
        {
          method: "settings_put_global_transition_animation_scale",
          scale: set.scale,
          exit_code: set.commands.transition.exitCode,
          command_duration_ms: set.commands.transition.durationMs
        },
        {
          method: "settings_put_global_animator_duration_scale",
          scale: set.scale,
          exit_code: set.commands.animator.exitCode,
          command_duration_ms: set.commands.animator.durationMs
        }
      ]
    },
    after,
    changed: !deviceAnimationScalesMatch(before, request.scale),
    verify: {
      policy: "global_animation_scales_readback",
      ok: true,
      attempts: 1,
      reason: "settings get global readback reported the requested scale for all three Android animation settings"
    },
    semantics: "device_wide_global_animation_scale_settings_not_runtime_animation_state"
  };
}

function buildDeviceAnimationsSnapshot(
  settings: DeviceAnimationsGetResult["settings"]
): DeviceAnimationsSetResult["before"] {
  const values = [
    settings.window_animation_scale.value,
    settings.transition_animation_scale.value,
    settings.animator_duration_scale.value
  ];
  return {
    settings,
    animations_disabled: values.every((value) => value === 0)
  };
}

function deviceAnimationScalesMatch(
  snapshot: DeviceAnimationsSetResult["before"],
  scale: DeviceAnimationScaleValue
): boolean {
  return [
    snapshot.settings.window_animation_scale.value,
    snapshot.settings.transition_animation_scale.value,
    snapshot.settings.animator_duration_scale.value
  ].every((value) => value === scale);
}

export async function getDeviceAccessibility(
  driver: AndroidDriver,
  request: DeviceAccessibilityGetRequest
): Promise<DeviceAccessibilityGetResult> {
  const result = await driver.getDeviceAccessibilityState({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    settings: result.settings,
    query: {
      sources: [
        {
          method: "settings_secure_accessibility_enabled",
          exit_code: result.queries.accessibilityEnabled.exitCode,
          command_duration_ms: result.queries.accessibilityEnabled.durationMs
        },
        {
          method: "settings_secure_touch_exploration_enabled",
          exit_code: result.queries.touchExplorationEnabled.exitCode,
          command_duration_ms: result.queries.touchExplorationEnabled.durationMs
        },
        {
          method: "settings_secure_enabled_accessibility_services",
          exit_code: result.queries.enabledAccessibilityServices.exitCode,
          command_duration_ms: result.queries.enabledAccessibilityServices.durationMs
        }
      ]
    },
    verify: {
      policy: "accessibility_secure_settings_parse",
      ok: true,
      attempts: 1,
      reason: "parsed secure Android accessibility settings without inspecting live accessibility service state or accessibility nodes"
    },
    semantics: "read_only_secure_accessibility_settings_not_runtime_accessibility_node_state"
  };
}

export async function ensureDeviceReady(
  driver: AndroidDriver,
  request: DeviceEnsureReadyRequest
): Promise<DeviceEnsureReadyResult> {
  const startedAt = Date.now();
  const before = await driver.getDeviceReadyState({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  let wake: DeviceEnsureReadyResult["wake"] = {
    attempted: false,
    keycode: "KEYCODE_WAKEUP",
    command_duration_ms: null
  };
  let dismissKeyguard: DeviceEnsureReadyResult["dismiss_keyguard"] = {
    attempted: false,
    method: "wm_dismiss_keyguard",
    exit_code: null,
    command_duration_ms: null
  };

  if (!isDeviceReady(before)) {
    if (!isDeviceAwake(before)) {
      const wakeResult = await driver.wakeDevice({
        deviceSerial: before.device_serial,
        timeoutMs: remainingDeviceReadyTimeoutMs(startedAt, request.timeout_ms, {
          before,
          after: before,
          stage: "wake"
        })
      });
      wake = {
        attempted: true,
        keycode: "KEYCODE_WAKEUP",
        command_duration_ms: wakeResult.durationMs
      };
      await sleepUntilNextAttempt(startedAt, request.timeout_ms, DEVICE_READY_VERIFY_INTERVAL_MS);
    }

    if (request.dismiss_keyguard) {
      const dismissResult = await driver.dismissKeyguard({
        deviceSerial: before.device_serial,
        timeoutMs: remainingDeviceReadyTimeoutMs(startedAt, request.timeout_ms, {
          before,
          after: before,
          wake,
          stage: "dismiss_keyguard"
        })
      });
      dismissKeyguard = {
        attempted: true,
        method: "wm_dismiss_keyguard",
        exit_code: dismissResult.exitCode,
        command_duration_ms: dismissResult.durationMs
      };
      await sleepUntilNextAttempt(startedAt, request.timeout_ms, DEVICE_READY_VERIFY_INTERVAL_MS);
    }
  }

  let attempts = 0;
  let after = before;
  while (remainingWaitMs(startedAt, request.timeout_ms) > 0) {
    attempts += 1;
    after = await driver.getDeviceReadyState({
      deviceSerial: before.device_serial,
      timeoutMs: remainingDeviceReadyTimeoutMs(startedAt, request.timeout_ms, {
        before,
        after,
        wake,
        dismiss_keyguard: dismissKeyguard,
        attempts,
        stage: "verify"
      })
    });
    if (isDeviceReady(after)) {
      return {
        device_serial: after.device_serial,
        before,
        after,
        wake,
        dismiss_keyguard: dismissKeyguard,
        verify: {
          ok: true,
          attempts,
          reason: isDeviceReady(before) ? "device was already ready" : describeDeviceReadyReason(after)
        }
      };
    }
    await sleepUntilNextAttempt(startedAt, request.timeout_ms, DEVICE_READY_VERIFY_INTERVAL_MS);
  }

  const details = {
    before,
    after,
    wake,
    dismiss_keyguard: dismissKeyguard,
    attempts,
    dismiss_keyguard_requested: request.dismiss_keyguard
  };
  if (after.keyguard_showing === true) {
    throw new AutophoneError({
      code: "SCREEN_LOCKED",
      message:
        after.keyguard_secure === true
          ? "device is awake but still behind a secure keyguard"
          : "device is awake but keyguard is still showing",
      retriable: true,
      details
    });
  }
  throw new AutophoneError({
    code: "DEVICE_NOT_READY",
    message: "device did not become ready before timeout",
    retriable: true,
    details
  });
}
