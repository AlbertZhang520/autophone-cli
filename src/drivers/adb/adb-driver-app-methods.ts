import { AutophoneError, type AppCurrentResult, type DeviceDetailsResult, type DeviceReadyState, type Point, type Snapshot } from "../../contracts/index.js";
import type {
  AndroidDriver,
  DriverAppClearDataRequest,
  DriverAppClearDataResult,
  DriverAppActivitiesRequest,
  DriverAppActivitiesResult,
  DriverAppGraphicsRequest,
  DriverAppGraphicsResult,
  DriverAppInstallRequest,
  DriverAppInstallResult,
  DriverAppInspectRequest,
  DriverAppInspectResult,
  DriverAppMemoryRequest,
  DriverAppMemoryResult,
  DriverAppLinksRequest,
  DriverAppLinksResult,
  DriverAppOpsGetRequest,
  DriverAppOpsGetResult,
  DriverAppPackageInfoRequest,
  DriverAppPackageInfoResult,
  DriverAppPermissionRequest,
  DriverAppPermissionInspectRequest,
  DriverAppPermissionInspectResult,
  DriverAppPermissionResult,
  DriverAppUninstallRequest,
  DriverAppUninstallResult,
  DriverCommandResult,
  DeviceDetailsOptions,
  DeviceListOptions,
  DriverDeviceCurrentUserResult,
  DriverDeviceAccessibilityResult,
  DriverDeviceAnimationsResult,
  DriverDeviceAnimationsSetRequest,
  DriverDeviceAnimationsSetResult,
  DriverDeviceBrightnessResult,
  DriverDeviceImeResult,
  DriverDeviceLocaleResult,
  DriverDeviceNetworkResult,
  DriverDeviceStorageResult,
  DriverDeviceBatteryResult,
  DriverDeviceTimeResult,
  DriverDeviceNotificationsResult,
  DriverDeviceOrientationResult,
  DriverDeviceScreenResult,
  DriverSetUserRotationRequest,
  DriverDoubleTapOptions,
  DriverDismissKeyguardResult,
  DriverAppListRequest,
  DriverAppListResult,
  DriverAppLaunchRequest,
  DriverAppLaunchResult,
  DriverLogcatDumpRequest,
  DriverLogcatDumpResult,
  DriverOpenUrlRequest,
  DriverOpenUrlResult,
  DriverResolveUrlRequest,
  DriverResolveUrlResult,
  DriverPackagePidSnapshotRequest,
  DriverPackagePidSnapshotResult,
  DriverPackagePidsRequest,
  DriverPackagePidsResult,
  DriverAppStopRequest,
  DriverAppStopResult,
  DriverAppStartRequest,
  DriverAppStartResult,
  DriverKeyOptions,
  DriverScreenrecordRequest,
  DriverScreenrecordResult,
  DriverScreenshotOptions,
  DriverScreenshotResult,
  DriverStatusBarIconsResult,
  DriverStatusBarResult,
  DriverDevice,
  DriverDeviceUsersResult,
  DriverDragOptions,
  DriverFileCopyRequest,
  DriverFileCopyResult,
  DriverFileHashRequest,
  DriverFileHashResult,
  DriverFileListRequest,
  DriverFileListResult,
  DriverFileMkdirRequest,
  DriverFileMkdirResult,
  DriverFileMoveRequest,
  DriverFileMoveResult,
  DriverFileRemoveRequest,
  DriverFileRemoveResult,
  DriverFileStatRequest,
  DriverFileStatResult,
  DriverFileTransferRequest,
  DriverFileTransferResult,
  DriverSwipeOptions,
  DriverTapOptions,
  DriverTextClearOptions,
  DriverTextInputOptions,
  DriverRingerGetResult,
  DriverUserRotationPolicy,
  DriverVolumeGetRequest,
  DriverVolumeGetResult,
  ObserveOptions
} from "../../core/index.js";
import {
  buildAdbFileTransferArgs,
  fileTransferFailure,
  parseAdbFileTransferFailure,
  redactFileTransferArgs,
  redactFileTransferError,
  redactFileTransferText,
  type AdbFileTransferKind
} from "./file-transfer.js";
import {
  buildAdbFileCopyArgs,
  fileCopyFailure,
  parseAdbFileCopyFailure,
  redactFileCopyArgs,
  redactFileCopyError,
  redactFileCopyText
} from "./file-copy.js";
import {
  buildAdbFileHashArgs,
  fileHashFailure,
  fileHashMethod,
  parseAdbFileHashOutput,
  redactFileHashArgs,
  redactFileHashError,
  redactFileHashText
} from "./file-hash.js";
import {
  buildAdbFileListArgs,
  fileListFailure,
  fileListMaxOutputBytes,
  parseAdbFileListOutput,
  redactFileListArgs,
  redactFileListError,
  redactFileListText
} from "./file-list.js";
import {
  buildAdbFileMkdirArgs,
  fileMkdirFailure,
  parseAdbFileMkdirFailure,
  redactFileMkdirArgs,
  redactFileMkdirError,
  redactFileMkdirText
} from "./file-mkdir.js";
import {
  buildAdbFileMoveArgs,
  fileMoveFailure,
  parseAdbFileMoveFailure,
  redactFileMoveArgs,
  redactFileMoveError,
  redactFileMoveText
} from "./file-move.js";
import {
  buildAdbFileRmArgs,
  fileRmFailure,
  parseAdbFileRmFailure,
  redactFileRmArgs,
  redactFileRmError,
  redactFileRmText
} from "./file-rm.js";
import {
  buildAdbFileStatArgs,
  fileStatFailure,
  parseAdbFileStatOutput,
  redactFileStatArgs,
  redactFileStatError,
  redactFileStatText
} from "./file-stat.js";
import { buildAdbAppPackageInfoArgs, parseAppPackageInfoOutput } from "./app-package-info.js";
import { buildAdbAppLinksArgs, parseAppLinksOutput } from "./app-links.js";
import { buildAdbAppOpsGetArgs, parseAppOpsGetOutput } from "./app-ops.js";
import { buildAdbAppActivitiesArgs, parseAppActivitiesOutput } from "./app-activities.js";
import { buildAdbAppResolveUrlArgs, parseAppResolveUrlOutput } from "./app-resolve-url.js";
import {
  buildAdbScreenrecordArgs,
  parseAdbScreenrecordFailure,
  redactScreenrecordArgs,
  redactScreenrecordError,
  redactScreenrecordText,
  screenrecordFailure
} from "./device-screenrecord.js";
import {
  buildAdbDeviceStorageArgs,
  deviceStorageFailure,
  parseDeviceStorageOutput
} from "./device-storage.js";
import {
  buildAdbDeviceLocaleSourceArgs,
  DEVICE_LOCALE_SOURCES,
  deviceLocaleFailure,
  parseDeviceLocaleSourceOutput
} from "./device-locale.js";
import {
  buildAdbDeviceBatteryArgs,
  deviceBatteryFailure,
  parseBatteryDetails,
  parseDeviceBatteryOutput
} from "./device-battery.js";
import { buildAdbAppMemoryArgs, parseAppMemoryOutput } from "./device-memory.js";
import { buildAdbAppGraphicsArgs, parseAppGraphicsOutput } from "./device-graphics.js";
import {
  buildAdbDeviceTimeSourceArgs,
  deviceTimeFailure,
  parseDeviceTimeBooleanOutput,
  parseDeviceTimeDateOutput,
  parseDeviceTimeZoneOutput
} from "./device-time.js";
import {
  buildAdbDeviceAccessibilitySettingArgs,
  DEVICE_ACCESSIBILITY_SETTINGS,
  parseAccessibilityBooleanSetting,
  parseEnabledAccessibilityServicesSetting
} from "./device-accessibility.js";
import {
  buildAdbDeviceAnimationScaleArgs,
  buildAdbDeviceAnimationScalePutArgs,
  DEVICE_ANIMATION_SETTINGS,
  type DeviceAnimationPutMethod,
  parseDeviceAnimationScaleSetting
} from "./device-animations.js";
import { buildAdbDeviceNotificationsArgs, parseDumpsysNotificationOutput } from "./device-notifications.js";
import { AdbTransport } from "./transport.js";
import { quoteForDeviceShell } from "./device-shell.js";
import { parseUiAutomatorSnapshot, type ParsedWindowInfo } from "./uiautomator-parser.js";

export { quoteForDeviceShell } from "./device-shell.js";
export { parseBatteryDetails } from "./device-battery.js";

import type { AdbDriverExecutionContext } from "./adb-driver-context.js";
import { isBenignAdbStderrLine, parseAdbDevices, parseAdbDevicesLong, parseAdbInstallOutput, parseAdbUninstallOutput, parseCurrentUserOutput, parseDeviceReadyState, parseDumpsysPackagePermission, parseLogcatLines, parsePidofOutput, parsePmClearOutput, parsePmListPackagesOutput, parsePmListUserLine, parsePmListUsersOutput, parsePmPathOutput, parsePmPermissionOutput, parseSettingsBoolean } from "./adb-driver-parsers-core.js";
import { isInputMethodId, mapConnectivityTransports, normalizeInputMethodId, parseBrightnessFloatSetting, parseBrightnessIntSetting, parseBrightnessModeSetting, parseConnectivityActiveNetwork, parseDumpsysDisplayBrightness, parseDumpsysInputMethodState, parseEnabledInputMethodSetting, parseInputMethodSetting, readBrightnessFloat } from "./adb-driver-parsers-device.js";
import { assertSafeAdbUninstallRequest, assertSafePermissionInspectRequest, assertSafePmPathRequest, assertSafePmPermissionRequest, assignPermissionEntry, buildAdbInstallArgs, buildAdbUninstallArgs, buildPmListPackagesArgs, buildPmPathArgs, buildPmPermissionArgs, describeUrlForLog, emptyDumpsysPermissionEntry, hasAdbOfflineFailure, hasAdbUnauthorizedFailure, hasDumpsysPackageBlock, isDumpsysPackageMissing, isLogcatUnavailable, isPidofUnavailable, isPmPathAbsentFailure, isPmPermissionFailureLine, parseDumpsysPackageFailure, parseDumpsysPermissionEntry, parseDumpsysPermissionFlags, parseLogcatFailure, parsePmListPackagesFailure, parseRequestedPermissionName, parseTargetSdk, readAnyBooleanField, readBooleanField, readFirstMatch, readInstallFailureCode, readUninstallFailureCode, redactPathFromAutophoneError, redactPathFromText, redactPathInValue, redactUrlArgs, redactUrlFromAutophoneError, redactUrlFromText, redactUrlInValue, resolvePermissionDumpState, throwIfAdbTargetFailure } from "./adb-driver-parsers-app.js";
import { DEVICE_DETAILS_PROPERTY_KEYS, PRODUCT_PROPERTY_SOURCES, buildProductPropertyKeys, collectDumpsysAudioRingerBlock, escapeRegExp, extractStatusBarFailureText, isAdbLongDetailToken, isInstalledPackageName, isMediaSessionVolumeFailureLine, isStatusBarIconSlot, isStatusBarIconsFailureLine, mapRingerMode, mapZenMode, orientationFromRotationDegrees, orientationFromWindowSize, parseAdbDeviceLongLine, parseAmForceStopOutput, parseAmStartOutput, parseAudioServiceStreamTokens, parseAutoRotate, parseDensityField, parseDumpsysAudioRingerState, parseFocus, parseGetpropOutput, parseInteger, parseMediaSessionVolumeGetOutput, parseMonkeyLaunchOutput, parseOrientation, parseRotationDegrees, parseRotationNamedValue, parseRotationQuarterTurns, parseSingleRingerModeLine, parseSingleRingerStreamMaskLine, parseSingleZenModeLine, parseSizeField, parseStatusBarIconsOutput, parseUserRotationPolicy, parseWindowDensityDetails, parseWindowSize, parseWindowSizeDetails, parseWmUserRotationFailure, readField, readFirstProperty, readProductProperty, readSupportedAbis, rotationDegreesToQuarterTurn, selectDeviceDetailsProperties, splitAbiList, truncateForErrorDetails, uniqueStrings } from "./adb-driver-parsers-details.js";
export async function currentApp(context: AdbDriverExecutionContext, options: ObserveOptions): Promise<AppCurrentResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const focus = await context.runOnDevice(serial, ["shell", "dumpsys", "window"], options.timeoutMs);
  const current = parseFocus(focus.stdout);
  return {
    device_serial: serial,
    package: current.packageName,
    activity: current.activity,
    focused: current.packageName.length > 0
  };

}

export async function listPackages(context: AdbDriverExecutionContext, request: DriverAppListRequest): Promise<DriverAppListResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = buildPmListPackagesArgs(request);
  const result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
  const packages = parsePmListPackagesOutput(result.stdout);
  const failure = parsePmListPackagesFailure(`${result.stdout}\n${result.stderr}`);
  if (result.exitCode !== 0 || (packages.length === 0 && failure !== undefined)) {
    throw new AutophoneError({
      code: "APP_LIST_FAILED",
      message: failure ?? "package list failed",
      retriable: false,
      details: {
        method: "pm_list_packages",
        exit_code: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      }
    });
  }

  return {
    serial,
    packages
  };

}

export async function getAppActivities(context: AdbDriverExecutionContext, request: DriverAppActivitiesRequest): Promise<DriverAppActivitiesResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = buildAdbAppActivitiesArgs(request.packageName, request.intent);
  const result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parseAppActivitiesOutput(result.stdout, result.stderr, result.exitCode, request.packageName);

  if (!parsed.ok) {
    throw new AutophoneError({
      code: "APP_ACTIVITIES_FAILED",
      message: parsed.failure,
      retriable: false,
      details: {
        package_name: request.packageName,
        intent: request.intent,
        method: "cmd_package_query_activities",
        exit_code: result.exitCode,
        stdout_chars: result.stdout.length,
        stderr_chars: result.stderr.length
      }
    });
  }

  return {
    serial,
    activities: parsed.activities,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function getAppPackageInfo(context: AdbDriverExecutionContext, request: DriverAppPackageInfoRequest): Promise<DriverAppPackageInfoResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = buildAdbAppPackageInfoArgs(request.packageName);
  const result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parseAppPackageInfoOutput(result.stdout, result.stderr, result.exitCode, request.packageName);

  if (!parsed.ok) {
    throw new AutophoneError({
      code: "APP_PACKAGE_INFO_FAILED",
      message: parsed.failure,
      retriable: false,
      details: {
        package_name: request.packageName,
        method: "dumpsys_package",
        exit_code: result.exitCode,
        stdout_chars: result.stdout.length,
        stderr_chars: result.stderr.length
      }
    });
  }

  return {
    serial,
    installed: parsed.installed,
    packageInfo: parsed.packageInfo,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function getAppLinks(context: AdbDriverExecutionContext, request: DriverAppLinksRequest): Promise<DriverAppLinksResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = buildAdbAppLinksArgs(request.packageName);
  const result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parseAppLinksOutput(result.stdout, result.stderr, result.exitCode, request.packageName);

  if (!parsed.ok) {
    throw new AutophoneError({
      code: "APP_LINKS_FAILED",
      message: parsed.failure,
      retriable: false,
      details: {
        package_name: request.packageName,
        method: "cmd_package_get_app_links",
        exit_code: result.exitCode,
        stdout_chars: result.stdout.length,
        stderr_chars: result.stderr.length
      }
    });
  }

  return {
    serial,
    packageFound: parsed.packageFound,
    domains: parsed.domains,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function getPackagePids(context: AdbDriverExecutionContext, request: DriverPackagePidsRequest): Promise<DriverPackagePidsResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = ["shell", "pidof", request.packageName];
  const result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);

  if (result.exitCode !== 0 && isPidofUnavailable(output)) {
    throw new AutophoneError({
      code: "LOGS_UNAVAILABLE",
      message: "pidof is unavailable on the target device",
      retriable: false,
      details: {
        package_name: request.packageName,
        method: "pidof",
        exit_code: result.exitCode,
        stderr: result.stderr
      }
    });
  }

  const parsed = parsePidofOutput(result.stdout);
  if (parsed.invalid.length > 0) {
    throw new AutophoneError({
      code: "LOGS_UNAVAILABLE",
      message: "pidof returned unexpected process identifiers",
      retriable: false,
      details: {
        package_name: request.packageName,
        method: "pidof",
        exit_code: result.exitCode,
        invalid: parsed.invalid
      }
    });
  }

  if (result.exitCode !== 0 || parsed.pids.length === 0) {
    throw new AutophoneError({
      code: "APP_NOT_RUNNING",
      message: "package has no running process on the target device",
      retriable: true,
      details: {
        package_name: request.packageName,
        method: "pidof",
        exit_code: result.exitCode
      }
    });
  }

  return {
    serial,
    pids: parsed.pids,
    durationMs: result.durationMs
  };

}

export async function getAppOps(context: AdbDriverExecutionContext, request: DriverAppOpsGetRequest): Promise<DriverAppOpsGetResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = buildAdbAppOpsGetArgs(request.packageName, request.opName, request.userId);
  const result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parseAppOpsGetOutput(
    result.stdout,
    result.stderr,
    result.exitCode,
    request.packageName,
    request.opName,
    request.userId
  );

  if (!parsed.ok) {
    throw new AutophoneError({
      code: "APP_OPS_FAILED",
      message: parsed.failure,
      retriable: false,
      details: {
        package_name: request.packageName,
        op_name: request.opName,
        user_id: request.userId ?? null,
        reason: parsed.reason,
        method: "cmd_appops_get",
        exit_code: result.exitCode,
        stdout_chars: result.stdout.length,
        stderr_chars: result.stderr.length
      }
    });
  }

  return {
    serial,
    lookup: parsed.lookup,
    defaultMode: parsed.defaultMode,
    entries: parsed.entries,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function getPackagePidSnapshot(context: AdbDriverExecutionContext, request: DriverPackagePidSnapshotRequest): Promise<DriverPackagePidSnapshotResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = ["shell", "pidof", request.packageName];
  const result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);

  if (isPidofUnavailable(output)) {
    throw new AutophoneError({
      code: "APP_PIDS_FAILED",
      message: "pidof is unavailable on the target device",
      retriable: false,
      details: {
        package_name: request.packageName,
        method: "pidof",
        exit_code: result.exitCode,
        stderr: result.stderr
      }
    });
  }

  if (result.exitCode === null) {
    throw new AutophoneError({
      code: "APP_PIDS_FAILED",
      message: "pidof did not report an exit code",
      retriable: true,
      details: {
        package_name: request.packageName,
        method: "pidof",
        signal: result.signal
      }
    });
  }

  const parsed = parsePidofOutput(result.stdout);
  const stderr = result.stderr.trim();
  if (parsed.invalid.length > 0 || stderr.length > 0 || (result.exitCode !== 0 && parsed.pids.length > 0)) {
    throw new AutophoneError({
      code: "APP_PIDS_FAILED",
      message: "pidof returned an unexpected process snapshot",
      retriable: false,
      details: {
        package_name: request.packageName,
        method: "pidof",
        exit_code: result.exitCode,
        invalid: parsed.invalid,
        stderr: result.stderr
      }
    });
  }

  return {
    serial,
    pids: result.exitCode === 0 ? parsed.pids : [],
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function getAppMemorySnapshot(context: AdbDriverExecutionContext, request: DriverAppMemoryRequest): Promise<DriverAppMemoryResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = buildAdbAppMemoryArgs(request.packageName);
  const result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parseAppMemoryOutput(result.stdout, result.stderr, result.exitCode, request.packageName);

  if (!parsed.ok) {
    throw new AutophoneError({
      code: "APP_MEMORY_FAILED",
      message: parsed.failure,
      retriable: false,
      details: {
        package_name: request.packageName,
        method: "dumpsys_meminfo",
        exit_code: result.exitCode,
        stdout_chars: result.stdout.length,
        stderr_chars: result.stderr.length
      }
    });
  }

  return {
    serial,
    running: parsed.running,
    processes: parsed.processes,
    memory: parsed.memory,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function getAppGraphicsSnapshot(context: AdbDriverExecutionContext, request: DriverAppGraphicsRequest): Promise<DriverAppGraphicsResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = buildAdbAppGraphicsArgs(request.packageName);
  const result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parseAppGraphicsOutput(result.stdout, result.stderr, result.exitCode, request.packageName);

  if (!parsed.ok) {
    throw new AutophoneError({
      code: "APP_GRAPHICS_FAILED",
      message: parsed.failure,
      retriable: false,
      details: {
        package_name: request.packageName,
        method: "dumpsys_gfxinfo",
        exit_code: result.exitCode,
        stdout_chars: result.stdout.length,
        stderr_chars: result.stderr.length
      }
    });
  }

  return {
    serial,
    running: parsed.running,
    processes: parsed.processes,
    graphics: parsed.graphics,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function dumpLogcat(context: AdbDriverExecutionContext, request: DriverLogcatDumpRequest): Promise<DriverLogcatDumpResult> {
  const args = [
    "shell",
    "logcat",
    "-d",
    "-t",
    String(request.lines),
    "--pid",
    String(request.pid),
    "-v",
    "threadtime",
    "-b",
    request.buffers.join(",")
  ];
  const result = await context.runOnDevice(request.deviceSerial, args, request.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);

  if (result.exitCode !== 0) {
    throw new AutophoneError({
      code: "LOGS_UNAVAILABLE",
      message: parseLogcatFailure(result.stderr) ?? "logcat dump failed",
      retriable: false,
      details: {
        method: "logcat_pid_tail",
        pid: request.pid,
        exit_code: result.exitCode,
        stderr: result.stderr
      }
    });
  }

  return {
    pid: request.pid,
    lines: parseLogcatLines(result.stdout),
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function clearPackageData(context: AdbDriverExecutionContext, request: DriverAppClearDataRequest): Promise<DriverAppClearDataResult> {
  const result = await context.runOnDevice(
    request.deviceSerial,
    ["shell", "pm", "clear", request.packageName],
    request.timeoutMs,
    "ACTION_TIMEOUT",
    false
  );
  throwIfAdbTargetFailure(`${result.stdout}\n${result.stderr}`, result.exitCode, [
    "shell",
    "pm",
    "clear",
    request.packageName
  ]);
  const parsed = parsePmClearOutput(result.stdout, result.stderr);
  if (result.exitCode !== 0 || !parsed.succeeded) {
    throw new AutophoneError({
      code: "APP_CLEAR_DATA_FAILED",
      message: parsed.reason ?? "package data clear failed",
      retriable: false,
      details: {
        package_name: request.packageName,
        method: "pm_clear",
        exit_code: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      }
    });
  }

  return {
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function installApk(context: AdbDriverExecutionContext, request: DriverAppInstallRequest): Promise<DriverAppInstallResult> {
  const args = buildAdbInstallArgs(request);
  let result;
  try {
    result = await context.runOnDevice(request.deviceSerial, args, request.timeoutMs, "ACTION_TIMEOUT", false);
  } catch (error) {
    if (error instanceof AutophoneError) {
      throw redactPathFromAutophoneError(error, request.apkPath);
    }
    throw error;
  }
  const output = `${result.stdout}\n${result.stderr}`;
  const safeArgs = args.map((arg) => (arg === request.apkPath ? "<apk-path>" : arg));
  const parsed = parseAdbInstallOutput(result.stdout, result.stderr);
  if (parsed.failureCode === undefined) {
    throwIfAdbTargetFailure(redactPathFromText(output, request.apkPath), result.exitCode, safeArgs);
  }

  if (result.exitCode !== 0 || !parsed.succeeded) {
    throw new AutophoneError({
      code: "APP_INSTALL_FAILED",
      message: redactPathFromText(parsed.reason ?? "adb install failed", request.apkPath),
      retriable: false,
      details: {
        method: "adb_install",
        exit_code: result.exitCode,
        failure_code: parsed.failureCode,
        stdout: redactPathFromText(result.stdout, request.apkPath),
        stderr: redactPathFromText(result.stderr, request.apkPath),
        flags: {
          replace: request.replace,
          grant_runtime_permissions: request.grantRuntimePermissions,
          allow_test: request.allowTest,
          allow_downgrade: request.allowDowngrade
        }
      }
    });
  }

  return {
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function inspectPackage(context: AdbDriverExecutionContext, request: DriverAppInspectRequest): Promise<DriverAppInspectResult> {
  assertSafePmPathRequest(request);
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = buildPmPathArgs(request);
  const result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parsePmPathOutput(result.stdout, result.stderr);

  if (parsed.paths.length > 0) {
    return {
      serial,
      installed: true,
      paths: parsed.paths,
      exitCode: result.exitCode,
      durationMs: result.durationMs
    };
  }

  if (parsed.failure === undefined && parsed.unexpectedLines.length === 0) {
    return {
      serial,
      installed: false,
      paths: [],
      exitCode: result.exitCode,
      durationMs: result.durationMs
    };
  }

  if (parsed.failure !== undefined && isPmPathAbsentFailure(parsed.failure)) {
    return {
      serial,
      installed: false,
      paths: [],
      exitCode: result.exitCode,
      durationMs: result.durationMs
    };
  }

  throw new AutophoneError({
    code: "APP_INSPECT_FAILED",
    message: parsed.failure ?? parsed.unexpectedLines[0] ?? "pm path returned unexpected output",
    retriable: false,
    details: {
      package_name: request.packageName,
      user_id: request.userId ?? null,
      method: "pm_path",
      exit_code: result.exitCode,
      failure: parsed.failure,
      unexpected_lines: parsed.unexpectedLines
    }
  });

}

export async function setAppPermission(context: AdbDriverExecutionContext, request: DriverAppPermissionRequest): Promise<DriverAppPermissionResult> {
  assertSafePmPermissionRequest(request);
  const args = buildPmPermissionArgs(request);
  const result = await context.runOnDevice(request.deviceSerial, args, request.timeoutMs, "ACTION_TIMEOUT", false);
  const output = `${result.stdout}\n${result.stderr}`;
  const parsed = parsePmPermissionOutput(result.stdout, result.stderr);
  if (parsed.failure === undefined) {
    throwIfAdbTargetFailure(output, result.exitCode, args);
  }

  if (result.exitCode !== 0 || parsed.failure !== undefined) {
    throw new AutophoneError({
      code: "APP_PERMISSION_FAILED",
      message: parsed.failure ?? `pm ${request.operation} permission command failed`,
      retriable: false,
      details: {
        package_name: request.packageName,
        permission_name: request.permissionName,
        operation: request.operation,
        user_id: request.userId ?? null,
        method: request.operation === "grant" ? "pm_grant" : "pm_revoke",
        exit_code: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      }
    });
  }

  return {
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function inspectAppPermission(context: AdbDriverExecutionContext, 
  request: DriverAppPermissionInspectRequest
): Promise<DriverAppPermissionInspectResult> {
  assertSafePermissionInspectRequest(request);
  const selectedUserId = request.userId ?? 0;
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = ["shell", "dumpsys", "package", request.packageName];
  const result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);

  if (result.exitCode !== 0 && result.stdout.trim().length === 0) {
    throw new AutophoneError({
      code: "APP_PERMISSION_INSPECT_FAILED",
      message: parseDumpsysPackageFailure(result.stderr) ?? "dumpsys package permission inspection failed",
      retriable: false,
      details: {
        package_name: request.packageName,
        permission_name: request.permissionName,
        user_id: request.userId ?? null,
        method: "dumpsys_package",
        exit_code: result.exitCode,
        stderr: result.stderr
      }
    });
  }

  const parsed = parseDumpsysPackagePermission(result.stdout, request.permissionName, selectedUserId);
  if (
    parsed.packageFound &&
    request.userId !== undefined &&
    !parsed.availableUserIds.includes(request.userId)
  ) {
    throw new AutophoneError({
      code: "APP_PERMISSION_INSPECT_FAILED",
      message: "requested Android user id was not present in dumpsys package output",
      retriable: false,
      details: {
        package_name: request.packageName,
        permission_name: request.permissionName,
        user_id: request.userId,
        available_user_ids: parsed.availableUserIds,
        method: "dumpsys_package",
        exit_code: result.exitCode
      }
    });
  }

  return {
    serial,
    ...parsed,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function uninstallPackage(context: AdbDriverExecutionContext, request: DriverAppUninstallRequest): Promise<DriverAppUninstallResult> {
  assertSafeAdbUninstallRequest(request);
  const args = buildAdbUninstallArgs(request);
  const result = await context.runOnDevice(request.deviceSerial, args, request.timeoutMs, "ACTION_TIMEOUT", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parseAdbUninstallOutput(result.stdout, result.stderr);

  if (result.exitCode !== 0 || !parsed.succeeded) {
    throw new AutophoneError({
      code: "APP_UNINSTALL_FAILED",
      message: parsed.reason ?? "adb uninstall failed",
      retriable: false,
      details: {
        package_name: request.packageName,
        user_id: request.userId ?? null,
        method: "adb_uninstall",
        exit_code: result.exitCode,
        failure_code: parsed.failureCode,
        stdout: result.stdout,
        stderr: result.stderr
      }
    });
  }

  return {
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function startActivity(context: AdbDriverExecutionContext, request: DriverAppStartRequest): Promise<DriverAppStartResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const result = await context.runOnDevice(
    serial,
    ["shell", "am", "start", "-W", "-n", request.component],
    request.timeoutMs,
    "ACTION_TIMEOUT",
    false
  );
  const parsed = parseAmStartOutput(`${result.stdout}\n${result.stderr}`);
  if (result.exitCode !== 0 || parsed.error !== undefined) {
    throw new AutophoneError({
      code: "ACTIVITY_RESOLVE_FAILED",
      message: parsed.error ?? "activity start failed",
      retriable: false,
      details: {
        package_name: request.packageName,
        activity: request.activity,
        component: request.component,
        exit_code: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      }
    });
  }

  return {
    status: parsed.status,
    activity: parsed.activity,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function launchPackage(context: AdbDriverExecutionContext, request: DriverAppLaunchRequest): Promise<DriverAppLaunchResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const result = await context.runOnDevice(
    serial,
    ["shell", "monkey", "-p", request.packageName, "-c", "android.intent.category.LAUNCHER", "1"],
    request.timeoutMs,
    "ACTION_TIMEOUT",
    false
  );
  const parsed = parseMonkeyLaunchOutput(`${result.stdout}\n${result.stderr}`);
  if (result.exitCode !== 0 || parsed.failed) {
    throw new AutophoneError({
      code: "APP_LAUNCH_FAILED",
      message: parsed.reason ?? "package launch failed",
      retriable: false,
      details: {
        package_name: request.packageName,
        method: "monkey",
        exit_code: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      }
    });
  }

  return {
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function openUrl(context: AdbDriverExecutionContext, request: DriverOpenUrlRequest): Promise<DriverOpenUrlResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const quotedUrl = quoteForDeviceShell(request.url);
  let result;
  try {
    result = await context.runOnDevice(
      serial,
      ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", quotedUrl],
      request.timeoutMs,
      "ACTION_TIMEOUT",
      false
    );
  } catch (error) {
    if (error instanceof AutophoneError) {
      throw redactUrlFromAutophoneError(error, request.url);
    }
    throw error;
  }

  const output = `${result.stdout}\n${result.stderr}`;
  const parsed = parseAmStartOutput(output);
  if (result.exitCode !== 0 || parsed.error !== undefined) {
    const redactedError = parsed.error === undefined ? undefined : redactUrlFromText(parsed.error, request.url);
    throw new AutophoneError({
      code: "APP_OPEN_URL_FAILED",
      message: redactedError ?? "URL intent start failed",
      retriable: false,
      details: {
        method: "am_start_view",
        url: describeUrlForLog(request.url),
        exit_code: result.exitCode,
        stdout: redactUrlFromText(result.stdout, request.url),
        stderr: redactUrlFromText(result.stderr, request.url)
      }
    });
  }

  return {
    status: parsed.status,
    activity: parsed.activity,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function resolveUrl(context: AdbDriverExecutionContext, request: DriverResolveUrlRequest): Promise<DriverResolveUrlResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = buildAdbAppResolveUrlArgs(request.url);
  let result;
  try {
    result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
  } catch (error) {
    if (error instanceof AutophoneError) {
      throw redactUrlFromAutophoneError(error, request.url);
    }
    throw error;
  }

  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(redactUrlFromText(output, request.url), result.exitCode, redactUrlArgs(args, request.url));
  const parsed = parseAppResolveUrlOutput(result.stdout, result.stderr, result.exitCode);
  if (!parsed.ok) {
    throw new AutophoneError({
      code: "APP_RESOLVE_URL_FAILED",
      message: parsed.failure,
      retriable: false,
      details: {
        method: "cmd_package_resolve_activity",
        url: describeUrlForLog(request.url),
        exit_code: result.exitCode,
        stdout: truncateForErrorDetails(redactUrlFromText(result.stdout, request.url), 512),
        stderr: truncateForErrorDetails(redactUrlFromText(result.stderr, request.url), 512)
      }
    });
  }

  return {
    serial,
    resolution: parsed.resolution,
    metadata: parsed.metadata,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function stopPackage(context: AdbDriverExecutionContext, request: DriverAppStopRequest): Promise<DriverAppStopResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const result = await context.runOnDevice(
    serial,
    ["shell", "am", "force-stop", request.packageName],
    request.timeoutMs,
    "ACTION_TIMEOUT",
    false
  );
  const parsed = parseAmForceStopOutput(`${result.stdout}\n${result.stderr}`);
  if (result.exitCode !== 0 || parsed.failed) {
    throw new AutophoneError({
      code: "APP_STOP_FAILED",
      message: parsed.reason ?? "app force-stop failed",
      retriable: false,
      details: {
        package_name: request.packageName,
        method: "am_force_stop",
        exit_code: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      }
    });
  }

  return {
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}
