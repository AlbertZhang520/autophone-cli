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
import type { AndroidDriver } from "./types.js";
import { APP_LAUNCH_VERIFY_INTERVAL_MS, APP_STOP_VERIFY_INTERVAL_MS, APP_VERIFY_MAX_ATTEMPTS, APP_VERIFY_SETTLE_MS, DEVICE_READY_VERIFY_INTERVAL_MS, KEYCODES, LOG_DUMP_BUFFERS, LOG_DUMP_MAX_LINE_CHARS, LOG_DUMP_MAX_PID_COUNT, LOG_DUMP_MAX_TOTAL_CHARS, ORIENTATION_SET_VERIFY_MAX_ATTEMPTS, ORIENTATION_SET_VERIFY_SETTLE_MS, SCROLL_VERIFY_SETTLE_MS, TEXT_INPUT_CHARSET, VERIFY_MAX_ATTEMPTS, encodeTextForAdbInput, VERIFY_SETTLE_MS, assertDragDistance, boundNotifications, capLogLines, createLogCapState, describeDeviceReadyReason, describeHttpUrl, getChangedFields, isDeviceAwake, isDeviceReady, isScreenUnlocked, normalizeActivityName, normalizeDisplayPower, planScrollGestureForScope, readPngDimensions, remainingDeviceReadyTimeoutMs, remainingWaitMs, isWaitBudgetPollTimeout, resolveDragEndpoint, resolveSingleUiActionTarget, sleep, sleepUntilNextAttempt, verifyDoubleTap, verifyDrag, verifyLongPress, verifyTap } from "./shared.js";

export async function currentApp(driver: AndroidDriver, request: AppCurrentRequest): Promise<AppCurrentResult> {
  return driver.currentApp({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
}


export async function listApps(driver: AndroidDriver, request: AppListRequest): Promise<AppListResult> {
  const result = await driver.listPackages({
    scope: request.scope,
    state: request.state,
    includeUninstalled: request.include_uninstalled,
    filter: request.filter,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    packages: result.packages,
    count: result.packages.length,
    scope: request.scope,
    state: request.state,
    include_uninstalled: request.include_uninstalled,
    filter: request.filter ?? null
  };
}

export async function inspectApp(driver: AndroidDriver, request: AppInspectRequest): Promise<AppInspectResult> {
  const result = await driver.inspectPackage({
    packageName: request.package_name,
    userId: request.user_id,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    requested: {
      package_name: request.package_name,
      user_id: request.user_id ?? null
    },
    installed: result.installed,
    paths: result.paths,
    path_count: result.paths.length,
    query: {
      method: "pm_path",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "pm_path_presence",
      ok: true,
      attempts: 1,
      reason: result.installed ? "pm path returned package file path entries" : "pm path returned no package file path entries"
    }
  };
}

export async function appActivities(driver: AndroidDriver, request: AppActivitiesRequest): Promise<AppActivitiesResult> {
  const result = await driver.getAppActivities({
    packageName: request.package_name,
    intent: request.intent,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    requested: {
      package_name: request.package_name,
      intent: request.intent
    },
    found: result.activities.length > 0,
    activities: result.activities,
    activity_count: result.activities.length,
    query: {
      method: "cmd_package_query_activities",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "cmd_package_query_activities_parse",
      ok: true,
      attempts: 1,
      reason:
        result.activities.length > 0
          ? "package manager returned intent-scoped activity components"
          : "package manager returned no activities for the requested intent"
    },
    semantics: "read_only_intent_activity_query_not_install_or_launchability_proof"
  };
}

export async function appPackageInfo(driver: AndroidDriver, request: AppPackageInfoRequest): Promise<AppPackageInfoResult> {
  const result = await driver.getAppPackageInfo({
    packageName: request.package_name,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    requested: { package_name: request.package_name },
    installed: result.installed,
    package: result.packageInfo,
    query: {
      method: "dumpsys_package",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "dumpsys_active_package_block",
      ok: true,
      attempts: 1,
      reason: result.installed
        ? "dumpsys package returned the active package metadata block"
        : "dumpsys package reported package absence"
    },
    semantics: "package_dump_active_block_not_hidden_not_permissions_not_signatures"
  };
}

export async function appLinks(driver: AndroidDriver, request: AppLinksRequest): Promise<AppLinksResult> {
  const result = await driver.getAppLinks({
    packageName: request.package_name,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    requested: { package_name: request.package_name },
    package_found: result.packageFound,
    domains: result.domains,
    domain_count: result.domains.length,
    query: {
      method: "cmd_package_get_app_links",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "cmd_package_get_app_links_parse",
      ok: true,
      attempts: 1,
      reason: appLinksReason(result.packageFound, result.domains.length)
    },
    semantics: "read_only_global_domain_verification_state_not_url_resolution_or_per_user_selection_or_signatures"
  };
}

export async function appOpsGet(driver: AndroidDriver, request: AppOpsGetRequest): Promise<AppOpsGetResult> {
  const result = await driver.getAppOps({
    packageName: request.package_name,
    opName: request.op_name,
    userId: request.user_id,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    requested: {
      package_name: request.package_name,
      op_name: request.op_name,
      user_id: request.user_id ?? null
    },
    lookup: result.lookup,
    default_mode: result.defaultMode,
    entries: result.entries,
    entry_count: result.entries.length,
    query: {
      method: "cmd_appops_get",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "cmd_appops_get_single_op_parse",
      ok: true,
      attempts: 1,
      reason: appOpsGetReason(result.lookup.status, result.entries.length, result.defaultMode !== null)
    },
    semantics: "read_only_appops_single_op_snapshot_not_runtime_permission_or_effective_behavior_proof"
  };
}

function appOpsGetReason(
  lookupStatus: AppOpsGetResult["lookup"]["status"],
  entryCount: number,
  hasDefaultMode: boolean
): string {
  if (lookupStatus === "no_uid") {
    return "cmd appops get reported no AppOps UID mapping for the package in the queried user";
  }
  if (entryCount > 0) {
    return "cmd appops get returned explicit AppOps entries for the requested operation";
  }
  if (hasDefaultMode) {
    return "cmd appops get returned the default mode with no explicit AppOps entries";
  }
  return "cmd appops get parsed without explicit entries";
}

function appLinksReason(packageFound: boolean, domainCount: number): string {
  if (!packageFound) {
    return "Package Manager reported the package unavailable for app link domain verification state";
  }
  if (domainCount === 0) {
    return "Package Manager returned no global app link domain verification entries for the package";
  }
  return "Package Manager returned global app link domain verification entries for the package";
}

export async function appPids(driver: AndroidDriver, request: AppPidsRequest): Promise<AppPidsResult> {
  const result = await driver.getPackagePidSnapshot({
    packageName: request.package_name,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    package_name: request.package_name,
    running: result.pids.length > 0,
    pids: result.pids,
    pid_count: result.pids.length,
    query: {
      method: "pidof",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "pidof_process_snapshot",
      ok: true,
      attempts: 1,
      reason:
        result.pids.length > 0
          ? "pidof returned process identifiers for the package"
          : "pidof returned no process identifiers for the package"
    },
    semantics: "read_only_pid_snapshot_not_process_liveness_guarantee"
  };
}

export async function appMemory(driver: AndroidDriver, request: AppMemoryRequest): Promise<AppMemoryResult> {
  const result = await driver.getAppMemorySnapshot({
    packageName: request.package_name,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    requested: { package_name: request.package_name },
    running: result.running,
    processes: result.processes,
    process_count: result.processes.length,
    memory: result.memory,
    query: {
      method: "dumpsys_meminfo",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "dumpsys_meminfo_app_summary_snapshot",
      ok: true,
      attempts: 1,
      reason: result.running
        ? "dumpsys meminfo returned an App Summary memory snapshot for the package process"
        : "dumpsys meminfo reported no running process for the package"
    },
    semantics: "read_only_memory_snapshot_point_in_time_not_sustained_usage_guarantee"
  };
}

export async function appGraphics(driver: AndroidDriver, request: AppGraphicsRequest): Promise<AppGraphicsResult> {
  const result = await driver.getAppGraphicsSnapshot({
    packageName: request.package_name,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    requested: { package_name: request.package_name },
    running: result.running,
    processes: result.processes,
    process_count: result.processes.length,
    graphics: result.graphics,
    query: {
      method: "dumpsys_gfxinfo",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "dumpsys_gfxinfo_frame_summary_snapshot",
      ok: true,
      attempts: 1,
      reason: result.running
        ? "dumpsys gfxinfo returned a graphics frame summary for the package process"
        : "dumpsys gfxinfo reported no running process for the package"
    },
    semantics: "read_only_graphics_summary_since_last_reset_not_sustained_performance_guarantee"
  };
}

export async function dumpLogs(driver: AndroidDriver, request: LogsDumpRequest): Promise<LogsDumpResult> {
  const startedAt = Date.now();
  const pidResult = await driver.getPackagePids({
    packageName: request.package_name,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const dumpedPids = pidResult.pids.slice(0, LOG_DUMP_MAX_PID_COUNT);
  const capState = createLogCapState();
  const processes: LogsDumpResult["processes"] = [];
  let commandDurationMs = pidResult.durationMs;

  for (const pid of dumpedPids) {
    const remaining = remainingWaitMs(startedAt, request.timeout_ms);
    if (remaining <= 0) {
      throw new AutophoneError({
        code: "ACTION_TIMEOUT",
        message: "log dump timed out before all process logs were read",
        retriable: true,
        details: {
          package_name: request.package_name,
          dumped_pids: processes.map((process) => process.pid),
          pending_pid: pid,
          timeout_ms: request.timeout_ms
        }
      });
    }

    const dump = await driver.dumpLogcat({
      deviceSerial: pidResult.serial,
      pid,
      lines: request.lines,
      buffers: LOG_DUMP_BUFFERS,
      timeoutMs: remaining
    });
    commandDurationMs += dump.durationMs;
    const capped = capLogLines(dump.lines, capState);
    processes.push({
      pid,
      line_count: capped.lines.length,
      lines: capped.lines,
      truncated: capped.truncated
    });
  }

  return {
    device_serial: pidResult.serial,
    requested: { package_name: request.package_name },
    pid_selection: {
      method: "pidof",
      all_pids: pidResult.pids,
      dumped_pids: dumpedPids,
      total_pid_count: pidResult.pids.length,
      dumped_pid_count: dumpedPids.length,
      truncated: pidResult.pids.length > dumpedPids.length
    },
    dump: {
      method: "logcat_pid_tail",
      format: "threadtime",
      buffers: [...LOG_DUMP_BUFFERS],
      per_pid_line_limit: request.lines,
      max_line_chars: LOG_DUMP_MAX_LINE_CHARS,
      max_total_chars: LOG_DUMP_MAX_TOTAL_CHARS,
      command_count: processes.length + 1,
      command_duration_ms: commandDurationMs
    },
    processes,
    line_count: processes.reduce((total, process) => total + process.line_count, 0),
    truncated: {
      processes: pidResult.pids.length > dumpedPids.length,
      lines: processes.some((process) => process.truncated.lines),
      chars: processes.some((process) => process.truncated.chars),
      line_chars: processes.some((process) => process.truncated.line_chars)
    },
    semantics: "per_pid_logcat_tail_then_global_cap"
  };
}

export async function clearAppData(driver: AndroidDriver, request: AppClearDataRequest): Promise<AppClearDataResult> {
  const clearResult = await driver.clearPackageData({
    packageName: request.package_name,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    requested: {
      package_name: request.package_name
    },
    clear: {
      method: "pm_clear",
      exit_code: clearResult.exitCode,
      command_duration_ms: clearResult.durationMs
    },
    verify: {
      policy: "package_manager_success",
      ok: true,
      attempts: 1,
      reason: "package manager returned Success for pm clear"
    }
  };
}

export async function installApp(driver: AndroidDriver, request: AppInstallRequest): Promise<AppInstallResult> {
  const installResult = await driver.installApk({
    apkPath: request.apk_path,
    replace: request.replace,
    grantRuntimePermissions: request.grant_runtime_permissions,
    allowTest: request.allow_test,
    allowDowngrade: request.allow_downgrade,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: request.device_serial,
    requested: {
      apk: request.apk,
      replace: request.replace,
      grant_runtime_permissions: request.grant_runtime_permissions,
      allow_test: request.allow_test,
      allow_downgrade: request.allow_downgrade
    },
    install: {
      method: "adb_install",
      exit_code: installResult.exitCode,
      command_duration_ms: installResult.durationMs
    },
    verify: {
      policy: "adb_success",
      ok: true,
      attempts: 1,
      reason: "adb install returned Success; post-install package identity is not independently verified"
    }
  };
}

export async function changeAppPermission(
  driver: AndroidDriver,
  request: AppPermissionRequest
): Promise<AppPermissionResult> {
  const permissionResult = await driver.setAppPermission({
    packageName: request.package_name,
    permissionName: request.permission_name,
    operation: request.operation,
    userId: request.user_id,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const method = request.operation === "grant" ? "pm_grant" : "pm_revoke";

  return {
    device_serial: request.device_serial,
    requested: {
      package_name: request.package_name,
      permission_name: request.permission_name,
      operation: request.operation,
      user_id: request.user_id ?? null
    },
    permission: {
      method,
      exit_code: permissionResult.exitCode,
      command_duration_ms: permissionResult.durationMs
    },
    verify: {
      policy: "pm_command_success",
      ok: true,
      attempts: 1,
      reason: `pm ${request.operation} command completed; permission state is not independently verified`
    }
  };
}

export async function inspectAppPermission(
  driver: AndroidDriver,
  request: AppPermissionInspectRequest
): Promise<AppPermissionInspectResult> {
  const result = await driver.inspectAppPermission({
    packageName: request.package_name,
    permissionName: request.permission_name,
    userId: request.user_id,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    requested: {
      package_name: request.package_name,
      permission_name: request.permission_name,
      user_id: request.user_id ?? null
    },
    package_found: result.packageFound,
    package: {
      target_sdk: result.targetSdk
    },
    permission: {
      state: result.state,
      granted: result.granted,
      source: result.source,
      manifest_requested: result.manifestRequested,
      available_user_ids: result.availableUserIds,
      install: result.install,
      runtime: {
        present: result.runtime.present,
        granted: result.runtime.granted,
        flags: result.runtime.flags,
        selected_user_id: result.runtime.selectedUserId,
        user_present: result.runtime.userPresent
      }
    },
    query: {
      method: "dumpsys_package",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "dumpsys_permission_state",
      ok: true,
      attempts: 1,
      reason: result.packageFound
        ? "dumpsys package permission state parsed; appops and effective app behavior are not evaluated"
        : "package was not found in dumpsys package output"
    },
    semantics: "package_dump_permission_state_not_appops"
  };
}

export async function uninstallApp(driver: AndroidDriver, request: AppUninstallRequest): Promise<AppUninstallResult> {
  const uninstallResult = await driver.uninstallPackage({
    packageName: request.package_name,
    userId: request.user_id,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: request.device_serial,
    requested: {
      package_name: request.package_name,
      user_id: request.user_id ?? null
    },
    uninstall: {
      method: "adb_uninstall",
      exit_code: uninstallResult.exitCode,
      command_duration_ms: uninstallResult.durationMs
    },
    verify: {
      policy: "adb_success",
      ok: true,
      attempts: 1,
      reason: "adb uninstall returned Success; package absence is not independently verified"
    }
  };
}

export async function startApp(driver: AndroidDriver, request: AppStartRequest): Promise<AppStartResult> {
  const normalizedActivity = normalizeActivityName(request.package_name, request.activity);
  const component = `${request.package_name}/${normalizedActivity}`;
  const before = await driver.currentApp({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const deviceSerial = before.device_serial;
  const amStart = await driver.startActivity({
    packageName: request.package_name,
    activity: normalizedActivity,
    component,
    deviceSerial,
    timeoutMs: request.timeout_ms
  });

  if (request.verify === "none") {
    return {
      requested: {
        package_name: request.package_name,
        activity: request.activity,
        normalized_activity: normalizedActivity,
        component
      },
      before,
      after: null,
      am_start: {
        status: amStart.status,
        activity: amStart.activity,
        exit_code: amStart.exitCode,
        duration_ms: amStart.durationMs
      },
      verify: {
        policy: "none",
        ok: true,
        attempts: 0,
        reason: "verification explicitly disabled"
      }
    };
  }

  let after = before;
  for (let attempt = 1; attempt <= APP_VERIFY_MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      await sleep(APP_VERIFY_SETTLE_MS);
    }
    after = await driver.currentApp({
      deviceSerial,
      timeoutMs: request.timeout_ms
    });
    if (after.package === request.package_name) {
      return {
        requested: {
          package_name: request.package_name,
          activity: request.activity,
          normalized_activity: normalizedActivity,
          component
        },
        before,
        after,
        am_start: {
          status: amStart.status,
          activity: amStart.activity,
          exit_code: amStart.exitCode,
          duration_ms: amStart.durationMs
        },
        verify: {
          policy: "package_foreground",
          ok: true,
          attempts: attempt,
          reason: "requested package is foreground"
        }
      };
    }
  }

  throw new AutophoneError({
    code: "VERIFY_FAILED",
    message: "app start completed but requested package did not become foreground",
    retriable: false,
    details: {
      policy: request.verify,
      attempts: APP_VERIFY_MAX_ATTEMPTS,
      package_name: request.package_name,
      requested_activity: normalizedActivity,
      foreground_package: after.package,
      foreground_activity: after.activity,
      am_start: {
        status: amStart.status,
        activity: amStart.activity,
        exit_code: amStart.exitCode
      }
    }
  });
}

export async function launchApp(driver: AndroidDriver, request: AppLaunchRequest): Promise<AppLaunchResult> {
  const before = await driver.currentApp({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const deviceSerial = before.device_serial;
  const launchResult = await driver.launchPackage({
    packageName: request.package_name,
    deviceSerial,
    timeoutMs: request.timeout_ms
  });

  const launch = {
    method: "monkey" as const,
    exit_code: launchResult.exitCode,
    command_duration_ms: launchResult.durationMs
  };

  if (request.verify === "none") {
    return {
      requested: { package_name: request.package_name },
      before,
      after: null,
      launch,
      verify: {
        policy: "none",
        ok: true,
        attempts: 0,
        reason: "verification explicitly disabled"
      }
    };
  }

  const startedAt = Date.now();
  let attempts = 0;
  let after = before;
  while (remainingWaitMs(startedAt, request.timeout_ms) > 0) {
    attempts += 1;
    after = await driver.currentApp({
      deviceSerial,
      timeoutMs: request.timeout_ms
    });
    if (after.package === request.package_name) {
      return {
        requested: { package_name: request.package_name },
        before,
        after,
        launch,
        verify: {
          policy: "package_foreground",
          ok: true,
          attempts,
          reason:
            before.package === request.package_name
              ? "requested package was already foreground or remained foreground after launch"
              : "requested package is foreground"
        }
      };
    }
    await sleepUntilNextAttempt(startedAt, request.timeout_ms, APP_LAUNCH_VERIFY_INTERVAL_MS);
  }

  throw new AutophoneError({
    code: "VERIFY_FAILED",
    message: "app launch completed but requested package did not become foreground",
    retriable: false,
    details: {
      policy: request.verify,
      attempts,
      package_name: request.package_name,
      foreground_package: after.package,
      foreground_activity: after.activity,
      launch
    }
  });
}

export async function openUrl(driver: AndroidDriver, request: AppOpenUrlRequest): Promise<AppOpenUrlResult> {
  const before = await driver.currentApp({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const deviceSerial = before.device_serial;
  const openResult = await driver.openUrl({
    url: request.url,
    deviceSerial,
    timeoutMs: request.timeout_ms
  });

  const open = {
    method: "am_start_view" as const,
    status: openResult.status,
    activity: openResult.activity,
    exit_code: openResult.exitCode,
    command_duration_ms: openResult.durationMs
  };
  const requested = describeHttpUrl(request.url);

  if (request.verify === "none") {
    return {
      requested,
      before,
      after: null,
      open,
      verify: {
        policy: "none",
        ok: true,
        attempts: 0,
        reason: "verification explicitly disabled"
      }
    };
  }

  const after = await driver.currentApp({
    deviceSerial,
    timeoutMs: request.timeout_ms
  });

  return {
    requested,
    before,
    after,
    open,
    verify: {
      policy: "activity_manager_accepted",
      ok: true,
      attempts: 1,
      reason: "Activity Manager accepted ACTION_VIEW intent; URL content load is not verified"
    }
  };
}

export async function resolveUrl(driver: AndroidDriver, request: AppResolveUrlRequest): Promise<AppResolveUrlResult> {
  const result = await driver.resolveUrl({
    url: request.url,
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });

  return {
    device_serial: result.serial,
    requested: describeHttpUrl(request.url),
    resolution: result.resolution,
    metadata: result.metadata,
    query: {
      method: "cmd_package_resolve_activity",
      exit_code: result.exitCode,
      command_duration_ms: result.durationMs
    },
    verify: {
      policy: "package_manager_resolve_activity_parse",
      ok: true,
      attempts: 1,
      reason: resolveUrlReason(result.resolution.type)
    },
    semantics: "read_only_url_intent_resolution_not_launchability_or_network_proof"
  };
}

function resolveUrlReason(type: AppResolveUrlResult["resolution"]["type"]): string {
  if (type === "none") {
    return "Package Manager reported no activity for the ACTION_VIEW URL intent";
  }
  if (type === "resolver") {
    return "Package Manager resolved the ACTION_VIEW URL intent to the Android system chooser, not a concrete app handler";
  }
  return "Package Manager resolved the ACTION_VIEW URL intent to a concrete activity component";
}

export async function stopApp(driver: AndroidDriver, request: AppStopRequest): Promise<AppStopResult> {
  const before = await driver.currentApp({
    deviceSerial: request.device_serial,
    timeoutMs: request.timeout_ms
  });
  const deviceSerial = before.device_serial;
  const stopResult = await driver.stopPackage({
    packageName: request.package_name,
    deviceSerial,
    timeoutMs: request.timeout_ms
  });

  const stop = {
    method: "am_force_stop" as const,
    exit_code: stopResult.exitCode,
    command_duration_ms: stopResult.durationMs
  };

  if (request.verify === "none") {
    return {
      requested: { package_name: request.package_name },
      before,
      after: null,
      stop,
      verify: {
        policy: "none",
        ok: true,
        attempts: 0,
        reason: "verification explicitly disabled"
      }
    };
  }

  const startedAt = Date.now();
  let attempts = 0;
  let after = before;
  while (remainingWaitMs(startedAt, request.timeout_ms) > 0) {
    attempts += 1;
    after = await driver.currentApp({
      deviceSerial,
      timeoutMs: request.timeout_ms
    });
    if (after.package !== request.package_name) {
      return {
        requested: { package_name: request.package_name },
        before,
        after,
        stop,
        verify: {
          policy: "foreground_absent",
          ok: true,
          attempts,
          reason:
            before.package === request.package_name
              ? "requested package is no longer foreground after force-stop"
              : "requested package was not foreground before or after force-stop; background process absence is not directly verified"
        }
      };
    }
    await sleepUntilNextAttempt(startedAt, request.timeout_ms, APP_STOP_VERIFY_INTERVAL_MS);
  }

  throw new AutophoneError({
    code: "VERIFY_FAILED",
    message: "app stop completed but requested package remained foreground",
    retriable: false,
    details: {
      policy: request.verify,
      attempts,
      package_name: request.package_name,
      foreground_package: after.package,
      foreground_activity: after.activity,
      stop
    }
  });
}
