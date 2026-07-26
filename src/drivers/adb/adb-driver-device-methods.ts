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
export async function listDevices(context: AdbDriverExecutionContext, options: DeviceListOptions): Promise<DriverDevice[]> {
  const result = await context.transport.run(["devices", "-l"], { timeoutMs: options.timeoutMs });
  return parseAdbDevicesLong(result.stdout);

}

export async function listUsers(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverDeviceUsersResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const args = ["shell", "pm", "list", "users"];
  const result = await context.runOnDevice(serial, args, options.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parsePmListUsersOutput(result.stdout, result.stderr);

  if (result.exitCode !== 0 || parsed.failure !== undefined || parsed.unexpectedLines.length > 0) {
    throw new AutophoneError({
      code: "DEVICE_USERS_FAILED",
      message: parsed.failure ?? parsed.unexpectedLines[0] ?? "pm list users returned unexpected output",
      retriable: false,
      details: {
        method: "pm_list_users",
        exit_code: result.exitCode,
        failure: parsed.failure,
        unexpected_lines: parsed.unexpectedLines,
        stdout: result.stdout,
        stderr: result.stderr
      }
    });
  }

  return {
    serial,
    users: parsed.users,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function getCurrentUser(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverDeviceCurrentUserResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const args = ["shell", "cmd", "activity", "get-current-user"];
  const result = await context.runOnDevice(serial, args, options.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parseCurrentUserOutput(result.stdout, result.stderr);

  if (result.exitCode !== 0 || parsed.userId === undefined) {
    throw new AutophoneError({
      code: "DEVICE_CURRENT_USER_FAILED",
      message: parsed.failure ?? "cmd activity get-current-user returned unexpected output",
      retriable: false,
      details: {
        method: "cmd_activity_get_current_user",
        exit_code: result.exitCode,
        failure: parsed.failure,
        unexpected_lines: parsed.unexpectedLines,
        stdout: result.stdout,
        stderr: result.stderr
      }
    });
  }

  return {
    serial,
    currentUserId: parsed.userId,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function getOrientation(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverDeviceOrientationResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const [windowSize, rotation, autoRotate] = await Promise.all([
    context.runOnDevice(serial, ["shell", "wm", "size"], options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, ["shell", "dumpsys", "window"], options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, ["shell", "settings", "get", "system", "accelerometer_rotation"], options.timeoutMs, "ADB_ERROR", false)
  ]);

  context.assertOrientationSourceSucceeded("wm_size", windowSize, ["shell", "wm", "size"]);
  context.assertOrientationSourceSucceeded("dumpsys_window", rotation, ["shell", "dumpsys", "window"]);
  throwIfAdbTargetFailure(`${autoRotate.stdout}\n${autoRotate.stderr}`, autoRotate.exitCode, [
    "shell",
    "settings",
    "get",
    "system",
    "accelerometer_rotation"
  ]);

  const parsedWindowSize = parseWindowSize(windowSize.stdout);
  const rotationDegrees = parseRotationDegrees(rotation.stdout);
  if (rotationDegrees === null) {
    throw new AutophoneError({
      code: "DEVICE_ORIENTATION_FAILED",
      message: "dumpsys window did not expose a parseable display rotation",
      retriable: false,
      details: {
        method: "dumpsys_window",
        exit_code: rotation.exitCode
      }
    });
  }

  return {
    serial,
    windowSize: parsedWindowSize,
    orientation: orientationFromRotationDegrees(rotationDegrees, parsedWindowSize),
    rotationDegrees,
    autoRotate: autoRotate.exitCode === 0 ? parseAutoRotate(autoRotate.stdout) : null,
    queries: {
      windowSize: { exitCode: windowSize.exitCode, durationMs: windowSize.durationMs },
      rotation: { exitCode: rotation.exitCode, durationMs: rotation.durationMs },
      autoRotate: { exitCode: autoRotate.exitCode, durationMs: autoRotate.durationMs }
    }
  };

}

export async function getUserRotationPolicy(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverUserRotationPolicy> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const args = ["shell", "wm", "user-rotation"];
  const result = await context.runOnDevice(serial, args, options.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parseUserRotationPolicy(result.stdout);
  if (result.exitCode !== 0 || parsed === null || parseWmUserRotationFailure(output) !== undefined) {
    throw new AutophoneError({
      code: "DEVICE_ORIENTATION_SET_FAILED",
      message: parseWmUserRotationFailure(output) ?? "wm user-rotation returned unexpected output",
      retriable: false,
      details: {
        method: "wm_user_rotation_query",
        exit_code: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      }
    });
  }

  return {
    ...parsed,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function setUserRotation(context: AdbDriverExecutionContext, request: DriverSetUserRotationRequest): Promise<DriverCommandResult> {
  const args =
    request.mode === "free"
      ? ["shell", "wm", "user-rotation", "free"]
      : ["shell", "wm", "user-rotation", "lock", String(rotationDegreesToQuarterTurn(request.rotationDegrees))];
  const result = await context.runOnDevice(request.deviceSerial, args, request.timeoutMs, "ACTION_TIMEOUT", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const failure = parseWmUserRotationFailure(output);
  if (result.exitCode !== 0 || failure !== undefined) {
    throw new AutophoneError({
      code: "DEVICE_ORIENTATION_SET_FAILED",
      message: failure ?? "wm user-rotation command failed",
      retriable: false,
      details: {
        method: "wm_user_rotation_set",
        mode: request.mode,
        rotation_degrees: request.rotationDegrees ?? null,
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

export async function getDeviceDetails(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DeviceDetailsResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const [properties, windowSize, density, battery] = await Promise.all([
    context.runOnDevice(serial, ["shell", "getprop"], options.timeoutMs),
    context.runOptionalInfoCommand(serial, ["shell", "wm", "size"], options.timeoutMs),
    context.runOptionalInfoCommand(serial, ["shell", "wm", "density"], options.timeoutMs),
    context.runOptionalInfoCommand(serial, ["shell", "dumpsys", "battery"], options.timeoutMs)
  ]);
  const parsedProperties = selectDeviceDetailsProperties(parseGetpropOutput(properties.stdout));

  return {
    device_serial: serial,
    android: {
      release: readFirstProperty(parsedProperties, ["ro.build.version.release"]),
      sdk: parseInteger(readFirstProperty(parsedProperties, ["ro.build.version.sdk"])),
      codename: readFirstProperty(parsedProperties, ["ro.build.version.codename"])
    },
    hardware: {
      manufacturer: readProductProperty(parsedProperties, "manufacturer"),
      brand: readProductProperty(parsedProperties, "brand"),
      model: readProductProperty(parsedProperties, "model"),
      product: readFirstProperty(parsedProperties, buildProductPropertyKeys("name")),
      device: readProductProperty(parsedProperties, "device"),
      supported_abis: readSupportedAbis(parsedProperties)
    },
    display: {
      ...parseWindowSizeDetails(windowSize),
      ...parseWindowDensityDetails(density)
    },
    battery: parseBatteryDetails(battery),
    properties: parsedProperties
  };

}

export async function getDeviceBatteryState(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverDeviceBatteryResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const args = buildAdbDeviceBatteryArgs();
  const result = await context.runOnDevice(serial, args, options.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parseDeviceBatteryOutput(result.stdout, result.stderr, result.exitCode);
  if (!parsed.ok) {
    throw deviceBatteryFailure({
      message: parsed.failure,
      details: {
        method: "dumpsys_battery",
        exit_code: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      }
    });
  }

  return {
    serial,
    battery: parsed.battery,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function getDeviceTimeState(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverDeviceTimeResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const dateArgs = buildAdbDeviceTimeSourceArgs("date");
  const autoTimeArgs = buildAdbDeviceTimeSourceArgs("autoTime");
  const autoTimeZoneArgs = buildAdbDeviceTimeSourceArgs("autoTimeZone");
  const settingsTimeZoneArgs = buildAdbDeviceTimeSourceArgs("settingsTimeZone");
  const persistSysTimeZoneArgs = buildAdbDeviceTimeSourceArgs("persistSysTimeZone");
  const [date, autoTime, autoTimeZone, settingsTimeZone, persistSysTimeZone] = await Promise.all([
    context.runOnDevice(serial, dateArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, autoTimeArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, autoTimeZoneArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, settingsTimeZoneArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, persistSysTimeZoneArgs, options.timeoutMs, "ADB_ERROR", false)
  ]);
  throwIfAdbTargetFailure(`${date.stdout}\n${date.stderr}`, date.exitCode, dateArgs);
  throwIfAdbTargetFailure(`${autoTime.stdout}\n${autoTime.stderr}`, autoTime.exitCode, autoTimeArgs);
  throwIfAdbTargetFailure(`${autoTimeZone.stdout}\n${autoTimeZone.stderr}`, autoTimeZone.exitCode, autoTimeZoneArgs);
  throwIfAdbTargetFailure(
    `${settingsTimeZone.stdout}\n${settingsTimeZone.stderr}`,
    settingsTimeZone.exitCode,
    settingsTimeZoneArgs
  );
  throwIfAdbTargetFailure(
    `${persistSysTimeZone.stdout}\n${persistSysTimeZone.stderr}`,
    persistSysTimeZone.exitCode,
    persistSysTimeZoneArgs
  );

  const parsedDate = parseDeviceTimeDateOutput(date.stdout, date.stderr, date.exitCode, "date_unix_epoch_offset");
  if (!parsedDate.ok) {
    throwDeviceTimeParseFailure(parsedDate.failure);
  }
  const parsedAutoTime = parseDeviceTimeBooleanOutput(
    autoTime.stdout,
    autoTime.stderr,
    autoTime.exitCode,
    "settings_global_auto_time"
  );
  if (!parsedAutoTime.ok) {
    throwDeviceTimeParseFailure(parsedAutoTime.failure);
  }
  const parsedAutoTimeZone = parseDeviceTimeBooleanOutput(
    autoTimeZone.stdout,
    autoTimeZone.stderr,
    autoTimeZone.exitCode,
    "settings_global_auto_time_zone"
  );
  if (!parsedAutoTimeZone.ok) {
    throwDeviceTimeParseFailure(parsedAutoTimeZone.failure);
  }
  const parsedSettingsTimeZone = parseDeviceTimeZoneOutput(
    settingsTimeZone.stdout,
    settingsTimeZone.stderr,
    settingsTimeZone.exitCode,
    "settings_global_time_zone"
  );
  if (!parsedSettingsTimeZone.ok) {
    throwDeviceTimeParseFailure(parsedSettingsTimeZone.failure);
  }
  const parsedPersistSysTimeZone = parseDeviceTimeZoneOutput(
    persistSysTimeZone.stdout,
    persistSysTimeZone.stderr,
    persistSysTimeZone.exitCode,
    "getprop_persist_sys_timezone"
  );
  if (!parsedPersistSysTimeZone.ok) {
    throwDeviceTimeParseFailure(parsedPersistSysTimeZone.failure);
  }

  return {
    serial,
    time: parsedDate.time,
    settings: {
      auto_time: parsedAutoTime.value,
      auto_time_zone: parsedAutoTimeZone.value
    },
    timezoneSources: {
      settings_global_time_zone: parsedSettingsTimeZone.value,
      persist_sys_timezone: parsedPersistSysTimeZone.value
    },
    queries: {
      date: { exitCode: date.exitCode, durationMs: date.durationMs },
      autoTime: { exitCode: autoTime.exitCode, durationMs: autoTime.durationMs },
      autoTimeZone: { exitCode: autoTimeZone.exitCode, durationMs: autoTimeZone.durationMs },
      settingsTimeZone: { exitCode: settingsTimeZone.exitCode, durationMs: settingsTimeZone.durationMs },
      persistSysTimeZone: { exitCode: persistSysTimeZone.exitCode, durationMs: persistSysTimeZone.durationMs }
    }
  };

  function throwDeviceTimeParseFailure(message: string): never {
    throw deviceTimeFailure({
      message,
      details: {
        method: "device_time_sources",
        exit_code: {
          date: date.exitCode,
          auto_time: autoTime.exitCode,
          auto_time_zone: autoTimeZone.exitCode,
          settings_time_zone: settingsTimeZone.exitCode,
          persist_sys_timezone: persistSysTimeZone.exitCode
        },
        stdout_chars: {
          date: date.stdout.length,
          auto_time: autoTime.stdout.length,
          auto_time_zone: autoTimeZone.stdout.length,
          settings_time_zone: settingsTimeZone.stdout.length,
          persist_sys_timezone: persistSysTimeZone.stdout.length
        },
        stderr_chars: {
          date: date.stderr.length,
          auto_time: autoTime.stderr.length,
          auto_time_zone: autoTimeZone.stderr.length,
          settings_time_zone: settingsTimeZone.stderr.length,
          persist_sys_timezone: persistSysTimeZone.stderr.length
        }
      }
    });
  }

}

export async function getDeviceReadyState(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DeviceReadyState> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const [power, window] = await Promise.all([
    context.runOptionalInfoCommand(serial, ["shell", "dumpsys", "power"], options.timeoutMs),
    context.runOptionalInfoCommand(serial, ["shell", "dumpsys", "window"], options.timeoutMs)
  ]);
  return parseDeviceReadyState(serial, power, window);

}

export async function getDeviceScreenState(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverDeviceScreenResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const powerArgs = ["shell", "dumpsys", "power"];
  const windowArgs = ["shell", "dumpsys", "window"];
  const [power, window] = await Promise.all([
    context.runOnDevice(serial, powerArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, windowArgs, options.timeoutMs, "ADB_ERROR", false)
  ]);
  context.assertDeviceScreenSourceSucceeded("dumpsys_power", power, powerArgs);
  context.assertDeviceScreenSourceSucceeded("dumpsys_window", window, windowArgs);

  const state = parseDeviceReadyState(serial, power.stdout, window.stdout);
  if (state.display_power_state === null && state.wakefulness === null && state.awake === null && state.interactive === null) {
    throw new AutophoneError({
      code: "DEVICE_SCREEN_FAILED",
      message: "dumpsys power did not expose parseable display power, wakefulness, or interactive state",
      retriable: false,
      details: {
        method: "dumpsys_power",
        exit_code: power.exitCode,
        stdout: truncateForErrorDetails(power.stdout),
        stderr: truncateForErrorDetails(power.stderr)
      }
    });
  }

  return {
    serial,
    state,
    queries: {
      power: { exitCode: power.exitCode, durationMs: power.durationMs },
      window: { exitCode: window.exitCode, durationMs: window.durationMs }
    }
  };

}

export async function getDeviceNetworkState(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverDeviceNetworkResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const airplaneArgs = ["shell", "settings", "get", "global", "airplane_mode_on"];
  const wifiArgs = ["shell", "settings", "get", "global", "wifi_on"];
  const mobileDataArgs = ["shell", "settings", "get", "global", "mobile_data"];
  const connectivityArgs = ["shell", "dumpsys", "connectivity"];
  const [airplaneMode, wifi, mobileData, connectivity] = await Promise.all([
    context.runOnDevice(serial, airplaneArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, wifiArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, mobileDataArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, connectivityArgs, options.timeoutMs, "ADB_ERROR", false)
  ]);

  context.assertDeviceNetworkSourceSucceeded("settings_global_airplane_mode_on", airplaneMode, airplaneArgs);
  context.assertDeviceNetworkSourceSucceeded("settings_global_wifi_on", wifi, wifiArgs);
  context.assertDeviceNetworkSourceSucceeded("settings_global_mobile_data", mobileData, mobileDataArgs);
  context.assertDeviceNetworkSourceSucceeded("dumpsys_connectivity", connectivity, connectivityArgs);

  const settings = {
    airplane_mode_on: parseSettingsBoolean(airplaneMode.stdout, airplaneMode.stderr, "airplane_mode_on"),
    wifi_on: parseSettingsBoolean(wifi.stdout, wifi.stderr, "wifi_on"),
    mobile_data_on: parseSettingsBoolean(mobileData.stdout, mobileData.stderr, "mobile_data")
  };
  const active = parseConnectivityActiveNetwork(connectivity.stdout, connectivity.stderr);
  const failure =
    settings.airplane_mode_on.failure ??
    settings.wifi_on.failure ??
    settings.mobile_data_on.failure ??
    active.failure;
  if (failure !== undefined) {
    throw new AutophoneError({
      code: "DEVICE_NETWORK_FAILED",
      message: failure,
      retriable: false,
      details: {
        method: "settings_and_dumpsys_connectivity",
        stdout: {
          airplane_mode_on: truncateForErrorDetails(airplaneMode.stdout, 256),
          wifi_on: truncateForErrorDetails(wifi.stdout, 256),
          mobile_data: truncateForErrorDetails(mobileData.stdout, 256)
        },
        stderr: {
          airplane_mode_on: truncateForErrorDetails(airplaneMode.stderr, 256),
          wifi_on: truncateForErrorDetails(wifi.stderr, 256),
          mobile_data: truncateForErrorDetails(mobileData.stderr, 256),
          connectivity: truncateForErrorDetails(connectivity.stderr)
        },
        connectivity_stdout_chars: connectivity.stdout.length,
        failure
      }
    });
  }

  return {
    serial,
    settings: {
      airplane_mode_on: settings.airplane_mode_on.value ?? null,
      wifi_on: settings.wifi_on.value ?? null,
      mobile_data_on: settings.mobile_data_on.value ?? null
    },
    active: active.value!,
    queries: {
      airplaneMode: { exitCode: airplaneMode.exitCode, durationMs: airplaneMode.durationMs },
      wifi: { exitCode: wifi.exitCode, durationMs: wifi.durationMs },
      mobileData: { exitCode: mobileData.exitCode, durationMs: mobileData.durationMs },
      connectivity: { exitCode: connectivity.exitCode, durationMs: connectivity.durationMs }
    }
  };

}

export async function getDeviceStorageState(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverDeviceStorageResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const args = buildAdbDeviceStorageArgs();
  const result = await context.runOnDevice(serial, args, options.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parseDeviceStorageOutput(result.stdout, result.stderr, result.exitCode);

  if (parsed.failure !== undefined) {
    throw deviceStorageFailure({
      message: parsed.failure,
      details: {
        method: "statfs_paths",
        exit_code: result.exitCode,
        stdout_chars: result.stdout.length,
        stderr_chars: result.stderr.length,
        args
      }
    });
  }

  return {
    serial,
    entries: parsed.entries,
    paths: parsed.paths,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function getDeviceLocaleState(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverDeviceLocaleResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const results = await Promise.all(
    DEVICE_LOCALE_SOURCES.map(async (source) => {
      const args = buildAdbDeviceLocaleSourceArgs(source.key);
      const result = await context.runOnDevice(serial, args, options.timeoutMs, "ADB_ERROR", false);
      const output = `${result.stdout}\n${result.stderr}`;
      throwIfAdbTargetFailure(output, result.exitCode, args);
      const parsed = parseDeviceLocaleSourceOutput(result.stdout, result.stderr, result.exitCode, source.method);
      if (!parsed.ok) {
        throw deviceLocaleFailure({
          message: parsed.failure,
          details: {
            method: source.method,
            exit_code: result.exitCode,
            stdout_chars: result.stdout.length,
            stderr_chars: result.stderr.length
          }
        });
      }
      return { source, result, value: parsed.value };
    })
  );
  const byKey = new Map(results.map((entry) => [entry.source.key, entry]));

  return {
    serial,
    sources: {
      system_locales: byKey.get("systemLocales")!.value,
      persist_sys_locale: byKey.get("persistSysLocale")!.value,
      ro_product_locale: byKey.get("roProductLocale")!.value,
      ro_product_locale_language: byKey.get("roProductLocaleLanguage")!.value,
      ro_product_locale_region: byKey.get("roProductLocaleRegion")!.value
    },
    queries: {
      systemLocales: {
        exitCode: byKey.get("systemLocales")!.result.exitCode,
        durationMs: byKey.get("systemLocales")!.result.durationMs
      },
      persistSysLocale: {
        exitCode: byKey.get("persistSysLocale")!.result.exitCode,
        durationMs: byKey.get("persistSysLocale")!.result.durationMs
      },
      roProductLocale: {
        exitCode: byKey.get("roProductLocale")!.result.exitCode,
        durationMs: byKey.get("roProductLocale")!.result.durationMs
      },
      roProductLocaleLanguage: {
        exitCode: byKey.get("roProductLocaleLanguage")!.result.exitCode,
        durationMs: byKey.get("roProductLocaleLanguage")!.result.durationMs
      },
      roProductLocaleRegion: {
        exitCode: byKey.get("roProductLocaleRegion")!.result.exitCode,
        durationMs: byKey.get("roProductLocaleRegion")!.result.durationMs
      }
    }
  };

}

export async function getDeviceImeState(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverDeviceImeResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const inputMethodArgs = ["shell", "dumpsys", "input_method"];
  const defaultInputMethodArgs = ["shell", "settings", "get", "secure", "default_input_method"];
  const enabledInputMethodsArgs = ["shell", "settings", "get", "secure", "enabled_input_methods"];
  const [inputMethod, defaultInputMethod, enabledInputMethods] = await Promise.all([
    context.runOnDevice(serial, inputMethodArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, defaultInputMethodArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, enabledInputMethodsArgs, options.timeoutMs, "ADB_ERROR", false)
  ]);

  context.assertDeviceImeSourceSucceeded("dumpsys_input_method", inputMethod, inputMethodArgs);
  context.assertDeviceImeSourceSucceeded(
    "settings_secure_default_input_method",
    defaultInputMethod,
    defaultInputMethodArgs
  );
  context.assertDeviceImeSourceSucceeded(
    "settings_secure_enabled_input_methods",
    enabledInputMethods,
    enabledInputMethodsArgs
  );

  const parsedInputMethod = parseDumpsysInputMethodState(inputMethod.stdout, inputMethod.stderr);
  const parsedDefault = parseInputMethodSetting(defaultInputMethod.stdout, defaultInputMethod.stderr, "default_input_method");
  const parsedEnabled = parseEnabledInputMethodSetting(enabledInputMethods.stdout, enabledInputMethods.stderr);
  const failure = parsedInputMethod.failure ?? parsedDefault.failure ?? parsedEnabled.failure;
  if (failure !== undefined) {
    throw new AutophoneError({
      code: "DEVICE_IME_FAILED",
      message: failure,
      retriable: false,
      details: {
        method: "input_method_service_and_secure_settings_parse",
        stdout: {
          default_input_method: truncateForErrorDetails(defaultInputMethod.stdout, 256),
          enabled_input_methods: truncateForErrorDetails(enabledInputMethods.stdout, 512)
        },
        stderr: {
          input_method: truncateForErrorDetails(inputMethod.stderr, 512),
          default_input_method: truncateForErrorDetails(defaultInputMethod.stderr, 256),
          enabled_input_methods: truncateForErrorDetails(enabledInputMethods.stderr, 256)
        },
        input_method_stdout_chars: inputMethod.stdout.length,
        failure
      }
    });
  }

  const inputMethodValue = parsedInputMethod.value!;
  const defaultInputMethodValue = parsedDefault.value ?? null;
  const enabledInputMethodValues = parsedEnabled.value ?? [];

  return {
    serial,
    keyboard: inputMethodValue.keyboard,
    service: inputMethodValue.service,
    ime: {
      current_id: inputMethodValue.currentId,
      default_id: defaultInputMethodValue,
      enabled_ids: enabledInputMethodValues,
      enabled_count: enabledInputMethodValues.length
    },
    queries: {
      inputMethod: { exitCode: inputMethod.exitCode, durationMs: inputMethod.durationMs },
      defaultInputMethod: { exitCode: defaultInputMethod.exitCode, durationMs: defaultInputMethod.durationMs },
      enabledInputMethods: { exitCode: enabledInputMethods.exitCode, durationMs: enabledInputMethods.durationMs }
    }
  };

}

export async function getDeviceBrightnessState(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverDeviceBrightnessResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const brightnessArgs = ["shell", "settings", "get", "system", "screen_brightness"];
  const modeArgs = ["shell", "settings", "get", "system", "screen_brightness_mode"];
  const autoAdjustmentArgs = ["shell", "settings", "get", "system", "screen_auto_brightness_adj"];
  const brightnessFloatArgs = ["shell", "settings", "get", "system", "screen_brightness_float"];
  const displayArgs = ["shell", "dumpsys", "display"];
  const [brightness, mode, autoAdjustment, brightnessFloat, display] = await Promise.all([
    context.runOnDevice(serial, brightnessArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, modeArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, autoAdjustmentArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, brightnessFloatArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, displayArgs, options.timeoutMs, "ADB_ERROR", false)
  ]);

  context.assertDeviceBrightnessSourceSucceeded("settings_system_screen_brightness", brightness, brightnessArgs);
  context.assertDeviceBrightnessSourceSucceeded("settings_system_screen_brightness_mode", mode, modeArgs);
  context.assertDeviceBrightnessSourceSucceeded(
    "settings_system_screen_auto_brightness_adj",
    autoAdjustment,
    autoAdjustmentArgs
  );
  context.assertDeviceBrightnessSourceSucceeded(
    "settings_system_screen_brightness_float",
    brightnessFloat,
    brightnessFloatArgs
  );
  context.assertDeviceBrightnessSourceSucceeded("dumpsys_display", display, displayArgs);

  const parsedBrightness = parseBrightnessIntSetting(brightness.stdout, brightness.stderr, "screen_brightness");
  const parsedMode = parseBrightnessModeSetting(mode.stdout, mode.stderr);
  const parsedAutoAdjustment = parseBrightnessFloatSetting(
    autoAdjustment.stdout,
    autoAdjustment.stderr,
    "screen_auto_brightness_adj",
    -1,
    1
  );
  const parsedBrightnessFloat = parseBrightnessFloatSetting(
    brightnessFloat.stdout,
    brightnessFloat.stderr,
    "screen_brightness_float",
    0,
    1
  );
  const parsedDisplay = parseDumpsysDisplayBrightness(display.stdout, display.stderr);
  const failure =
    parsedBrightness.failure ??
    parsedMode.failure ??
    parsedAutoAdjustment.failure ??
    parsedBrightnessFloat.failure ??
    parsedDisplay.failure;
  if (failure !== undefined) {
    throw new AutophoneError({
      code: "DEVICE_BRIGHTNESS_FAILED",
      message: failure,
      retriable: false,
      details: {
        method: "display_brightness_settings_and_dumpsys_parse",
        stdout: {
          screen_brightness: truncateForErrorDetails(brightness.stdout, 256),
          screen_brightness_mode: truncateForErrorDetails(mode.stdout, 256),
          screen_auto_brightness_adj: truncateForErrorDetails(autoAdjustment.stdout, 256),
          screen_brightness_float: truncateForErrorDetails(brightnessFloat.stdout, 256)
        },
        stderr: {
          screen_brightness: truncateForErrorDetails(brightness.stderr, 256),
          screen_brightness_mode: truncateForErrorDetails(mode.stderr, 256),
          screen_auto_brightness_adj: truncateForErrorDetails(autoAdjustment.stderr, 256),
          screen_brightness_float: truncateForErrorDetails(brightnessFloat.stderr, 256),
          display: truncateForErrorDetails(display.stderr, 512)
        },
        dumpsys_display_stdout_chars: display.stdout.length,
        failure
      }
    });
  }

  const brightnessRaw = parsedBrightness.value ?? null;
  return {
    serial,
    settings: {
      screen_brightness: {
        raw: brightnessRaw,
        max: 255,
        normalized: brightnessRaw === null ? null : brightnessRaw / 255
      },
      mode: parsedMode.value!,
      auto_brightness_adjustment: parsedAutoAdjustment.value ?? null,
      screen_brightness_float: parsedBrightnessFloat.value ?? null
    },
    display: parsedDisplay.value!,
    queries: {
      brightness: { exitCode: brightness.exitCode, durationMs: brightness.durationMs },
      mode: { exitCode: mode.exitCode, durationMs: mode.durationMs },
      autoAdjustment: { exitCode: autoAdjustment.exitCode, durationMs: autoAdjustment.durationMs },
      brightnessFloat: { exitCode: brightnessFloat.exitCode, durationMs: brightnessFloat.durationMs },
      display: { exitCode: display.exitCode, durationMs: display.durationMs }
    }
  };

}

export async function getDeviceAnimationsState(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverDeviceAnimationsResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const windowArgs = buildAdbDeviceAnimationScaleArgs("window_animation_scale");
  const transitionArgs = buildAdbDeviceAnimationScaleArgs("transition_animation_scale");
  const animatorArgs = buildAdbDeviceAnimationScaleArgs("animator_duration_scale");
  const [window, transition, animator] = await Promise.all([
    context.runOnDevice(serial, windowArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, transitionArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, animatorArgs, options.timeoutMs, "ADB_ERROR", false)
  ]);

  context.assertDeviceAnimationsSourceSucceeded("settings_global_window_animation_scale", window, windowArgs);
  context.assertDeviceAnimationsSourceSucceeded("settings_global_transition_animation_scale", transition, transitionArgs);
  context.assertDeviceAnimationsSourceSucceeded("settings_global_animator_duration_scale", animator, animatorArgs);

  const parsedWindow = parseDeviceAnimationScaleSetting(window.stdout, window.stderr, "window_animation_scale");
  const parsedTransition = parseDeviceAnimationScaleSetting(
    transition.stdout,
    transition.stderr,
    "transition_animation_scale"
  );
  const parsedAnimator = parseDeviceAnimationScaleSetting(animator.stdout, animator.stderr, "animator_duration_scale");

  if (!parsedWindow.ok || !parsedTransition.ok || !parsedAnimator.ok) {
    const failure =
      (!parsedWindow.ok ? parsedWindow.failure : undefined) ??
      (!parsedTransition.ok ? parsedTransition.failure : undefined) ??
      (!parsedAnimator.ok ? parsedAnimator.failure : undefined) ??
      "animation scale settings were not parseable";
    throw new AutophoneError({
      code: "DEVICE_ANIMATIONS_FAILED",
      message: failure,
      retriable: false,
      details: {
        method: "animation_scale_settings_parse",
        stdout: {
          window_animation_scale: truncateForErrorDetails(window.stdout, 256),
          transition_animation_scale: truncateForErrorDetails(transition.stdout, 256),
          animator_duration_scale: truncateForErrorDetails(animator.stdout, 256)
        },
        stderr: {
          window_animation_scale: truncateForErrorDetails(window.stderr, 256),
          transition_animation_scale: truncateForErrorDetails(transition.stderr, 256),
          animator_duration_scale: truncateForErrorDetails(animator.stderr, 256)
        },
        failure
      }
    });
  }

  return {
    serial,
    settings: {
      window_animation_scale: parsedWindow.scale,
      transition_animation_scale: parsedTransition.scale,
      animator_duration_scale: parsedAnimator.scale
    },
    queries: {
      window: { exitCode: window.exitCode, durationMs: window.durationMs },
      transition: { exitCode: transition.exitCode, durationMs: transition.durationMs },
      animator: { exitCode: animator.exitCode, durationMs: animator.durationMs }
    }
  };

}

export async function setDeviceAnimationScales(context: AdbDriverExecutionContext, request: DriverDeviceAnimationsSetRequest): Promise<DriverDeviceAnimationsSetResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const commands: DriverDeviceAnimationsSetResult["commands"] = {
    window: { exitCode: null, durationMs: 0 },
    transition: { exitCode: null, durationMs: 0 },
    animator: { exitCode: null, durationMs: 0 }
  };

  for (const setting of DEVICE_ANIMATION_SETTINGS) {
    const args = buildAdbDeviceAnimationScalePutArgs(setting.key, request.scale);
    const result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
    context.assertDeviceAnimationsSetSourceSucceeded(setting.putMethod, result, args);
    const command = { exitCode: result.exitCode, durationMs: result.durationMs };
    if (setting.key === "window_animation_scale") {
      commands.window = command;
    } else if (setting.key === "transition_animation_scale") {
      commands.transition = command;
    } else {
      commands.animator = command;
    }
  }

  return {
    serial,
    scale: request.scale,
    commands
  };

}

export async function getDeviceAccessibilityState(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverDeviceAccessibilityResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const accessibilityEnabledArgs = buildAdbDeviceAccessibilitySettingArgs("accessibility_enabled");
  const touchExplorationEnabledArgs = buildAdbDeviceAccessibilitySettingArgs("touch_exploration_enabled");
  const enabledAccessibilityServicesArgs = buildAdbDeviceAccessibilitySettingArgs("enabled_accessibility_services");
  const [accessibilityEnabled, touchExplorationEnabled, enabledAccessibilityServices] = await Promise.all([
    context.runOnDevice(serial, accessibilityEnabledArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, touchExplorationEnabledArgs, options.timeoutMs, "ADB_ERROR", false),
    context.runOnDevice(serial, enabledAccessibilityServicesArgs, options.timeoutMs, "ADB_ERROR", false)
  ]);

  context.assertDeviceAccessibilitySourceSucceeded(
    "settings_secure_accessibility_enabled",
    accessibilityEnabled,
    accessibilityEnabledArgs
  );
  context.assertDeviceAccessibilitySourceSucceeded(
    "settings_secure_touch_exploration_enabled",
    touchExplorationEnabled,
    touchExplorationEnabledArgs
  );
  context.assertDeviceAccessibilitySourceSucceeded(
    "settings_secure_enabled_accessibility_services",
    enabledAccessibilityServices,
    enabledAccessibilityServicesArgs
  );

  const parsedAccessibilityEnabled = parseAccessibilityBooleanSetting(
    accessibilityEnabled.stdout,
    accessibilityEnabled.stderr,
    "accessibility_enabled"
  );
  const parsedTouchExplorationEnabled = parseAccessibilityBooleanSetting(
    touchExplorationEnabled.stdout,
    touchExplorationEnabled.stderr,
    "touch_exploration_enabled"
  );
  const parsedEnabledAccessibilityServices = parseEnabledAccessibilityServicesSetting(
    enabledAccessibilityServices.stdout,
    enabledAccessibilityServices.stderr
  );

  if (!parsedAccessibilityEnabled.ok || !parsedTouchExplorationEnabled.ok || !parsedEnabledAccessibilityServices.ok) {
    const failure =
      (!parsedAccessibilityEnabled.ok ? parsedAccessibilityEnabled.failure : undefined) ??
      (!parsedTouchExplorationEnabled.ok ? parsedTouchExplorationEnabled.failure : undefined) ??
      (!parsedEnabledAccessibilityServices.ok ? parsedEnabledAccessibilityServices.failure : undefined) ??
      "secure accessibility settings were not parseable";
    throw new AutophoneError({
      code: "DEVICE_ACCESSIBILITY_FAILED",
      message: failure,
      retriable: false,
      details: {
        method: "accessibility_secure_settings_parse",
        stdout: {
          accessibility_enabled: truncateForErrorDetails(accessibilityEnabled.stdout, 256),
          touch_exploration_enabled: truncateForErrorDetails(touchExplorationEnabled.stdout, 256),
          enabled_accessibility_services: truncateForErrorDetails(enabledAccessibilityServices.stdout, 512)
        },
        stderr: {
          accessibility_enabled: truncateForErrorDetails(accessibilityEnabled.stderr, 256),
          touch_exploration_enabled: truncateForErrorDetails(touchExplorationEnabled.stderr, 256),
          enabled_accessibility_services: truncateForErrorDetails(enabledAccessibilityServices.stderr, 256)
        },
        failure
      }
    });
  }

  return {
    serial,
    settings: {
      accessibility_enabled: parsedAccessibilityEnabled.setting,
      touch_exploration_enabled: parsedTouchExplorationEnabled.setting,
      enabled_accessibility_services: parsedEnabledAccessibilityServices.setting
    },
    queries: {
      accessibilityEnabled: { exitCode: accessibilityEnabled.exitCode, durationMs: accessibilityEnabled.durationMs },
      touchExplorationEnabled: {
        exitCode: touchExplorationEnabled.exitCode,
        durationMs: touchExplorationEnabled.durationMs
      },
      enabledAccessibilityServices: {
        exitCode: enabledAccessibilityServices.exitCode,
        durationMs: enabledAccessibilityServices.durationMs
      }
    }
  };

}

export async function wakeDevice(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverCommandResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const result = await context.runOnDevice(
    serial,
    ["shell", "input", "keyevent", "KEYCODE_WAKEUP"],
    options.timeoutMs,
    "ACTION_TIMEOUT"
  );
  return {
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function dismissKeyguard(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverDismissKeyguardResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const result = await context.runOnDevice(
    serial,
    ["shell", "wm", "dismiss-keyguard"],
    options.timeoutMs,
    "ACTION_TIMEOUT",
    false
  );
  return {
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function controlStatusBar(context: AdbDriverExecutionContext, 
  command: DriverStatusBarResult["command"],
  options: DeviceDetailsOptions
): Promise<DriverStatusBarResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const args = ["shell", "cmd", "statusbar", command];
  const result = await context.runOnDevice(serial, args, options.timeoutMs, "ACTION_TIMEOUT", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const failureOutput = extractStatusBarFailureText(output);
  if (result.exitCode !== 0 || failureOutput !== undefined) {
    throw new AutophoneError({
      code: "DEVICE_STATUSBAR_FAILED",
      message: "cmd statusbar command did not complete with clean output",
      retriable: false,
      details: {
        method: "cmd_statusbar",
        command,
        exit_code: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      }
    });
  }
  return {
    serial,
    command,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function getStatusBarIcons(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverStatusBarIconsResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const args = ["shell", "cmd", "statusbar", "get-status-icons"];
  const result = await context.runOnDevice(serial, args, options.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parseStatusBarIconsOutput(result.stdout, result.stderr);
  if (result.exitCode !== 0 || parsed.failure !== undefined) {
    throw new AutophoneError({
      code: "DEVICE_STATUSBAR_FAILED",
      message: "cmd statusbar get-status-icons output was not parseable",
      retriable: false,
      details: {
        method: "cmd_statusbar_get_status_icons",
        exit_code: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        failure: parsed.failure,
        invalid_lines: parsed.invalidLines
      }
    });
  }

  return {
    serial,
    icons: parsed.icons,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function getVolume(context: AdbDriverExecutionContext, request: DriverVolumeGetRequest): Promise<DriverVolumeGetResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = [
    "shell",
    "cmd",
    "media_session",
    "volume",
    "--stream",
    String(request.stream.androidStreamId),
    "--get"
  ];
  const result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parseMediaSessionVolumeGetOutput(result.stdout, result.stderr, request.stream);
  if (result.exitCode !== 0 || parsed.failure !== undefined) {
    throw new AutophoneError({
      code: "DEVICE_VOLUME_FAILED",
      message: "cmd media_session volume output was not parseable",
      retriable: false,
      details: {
        method: "cmd_media_session_volume_get",
        stream: request.stream.name,
        android_stream_id: request.stream.androidStreamId,
        exit_code: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        failure: parsed.failure
      }
    });
  }

  return {
    serial,
    stream: request.stream,
    volume: parsed.volume,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function getRinger(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverRingerGetResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const args = ["shell", "dumpsys", "audio"];
  const result = await context.runOnDevice(serial, args, options.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parseDumpsysAudioRingerState(result.stdout, result.stderr);
  if (result.exitCode !== 0 || parsed.failure !== undefined) {
    throw new AutophoneError({
      code: "DEVICE_RINGER_FAILED",
      message: "dumpsys audio Ringer mode section was not parseable",
      retriable: false,
      details: {
        method: "dumpsys_audio",
        exit_code: result.exitCode,
        stdout: truncateForErrorDetails(result.stdout),
        stderr: truncateForErrorDetails(result.stderr),
        failure: parsed.failure
      }
    });
  }

  return {
    serial,
    ringer: parsed.ringer,
    zen: parsed.zen,
    affectedStreams: parsed.affectedStreams,
    mutedStreams: parsed.mutedStreams,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function getNotifications(context: AdbDriverExecutionContext, options: DeviceDetailsOptions): Promise<DriverDeviceNotificationsResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const args = buildAdbDeviceNotificationsArgs();
  const result = await context.runOnDevice(serial, args, options.timeoutMs, "ADB_ERROR", false);
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  const parsed = parseDumpsysNotificationOutput(result.stdout, result.stderr);
  if (result.exitCode !== 0 || !parsed.ok) {
    throw new AutophoneError({
      code: "DEVICE_NOTIFICATIONS_FAILED",
      message: "dumpsys notification output was not parseable",
      retriable: false,
      details: {
        method: "dumpsys_notification_noredact",
        exit_code: result.exitCode,
        stdout_chars: result.stdout.length,
        stderr_chars: result.stderr.length,
        failure: parsed.ok ? "dumpsys notification exited nonzero" : parsed.failure
      }
    });
  }

  return {
    serial,
    notifications: parsed.notifications.map((notification) => ({
      key: notification.key,
      package_name: notification.packageName,
      user_id: notification.userId,
      notification_id: notification.notificationId,
      tag: notification.tag,
      channel_id: notification.channelId,
      importance: notification.importance,
      group_key: notification.groupKey,
      category: notification.category,
      visibility: notification.visibility,
      flags: notification.flags,
      title: notification.title,
      text: notification.text,
      sub_text: notification.subText,
      big_text: notification.bigText
    })),
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}
