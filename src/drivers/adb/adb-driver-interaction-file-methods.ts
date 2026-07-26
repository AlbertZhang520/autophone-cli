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
export async function observe(context: AdbDriverExecutionContext, options: ObserveOptions): Promise<Snapshot> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const [dump, windowSize, autoRotate, windowDump] = await Promise.all([
    context.runOnDevice(serial, ["exec-out", "uiautomator", "dump", "/dev/tty"], options.timeoutMs, "DUMP_TIMEOUT"),
    context.runOnDevice(serial, ["shell", "wm", "size"], options.timeoutMs),
    context.runOnDevice(serial, ["shell", "settings", "get", "system", "accelerometer_rotation"], options.timeoutMs),
    context.runOnDevice(serial, ["shell", "dumpsys", "window"], options.timeoutMs)
  ]);
  const rotationDegrees = parseRotationDegrees(windowDump.stdout);
  const parsedWindowSize = parseWindowSize(windowSize.stdout);

  const window: ParsedWindowInfo = {
    ...parseFocus(windowDump.stdout),
    windowSize: parsedWindowSize,
    orientation: orientationFromRotationDegrees(rotationDegrees, parsedWindowSize),
    rotationDegrees,
    autoRotate: parseAutoRotate(autoRotate.stdout)
  };

  return parseUiAutomatorSnapshot({
    rawDump: dump.stdout,
    serial,
    window
  });

}

export async function tap(context: AdbDriverExecutionContext, point: Point, options: DriverTapOptions): Promise<void> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  await context.runOnDevice(
    serial,
    ["shell", "input", "tap", String(point[0]), String(point[1])],
    options.timeoutMs,
    "ACTION_TIMEOUT"
  );

}

export async function doubleTap(context: AdbDriverExecutionContext, point: Point, intervalMs: number, options: DriverDoubleTapOptions): Promise<void> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const x = String(point[0]);
  const y = String(point[1]);
  const intervalSeconds = (intervalMs / 1000).toFixed(3);
  await context.runOnDevice(
    serial,
    ["shell", `input tap ${x} ${y} && sleep ${intervalSeconds} && input tap ${x} ${y}`],
    options.timeoutMs,
    "ACTION_TIMEOUT"
  );

}

export async function keyEvent(context: AdbDriverExecutionContext, keyCode: string, options: DriverKeyOptions): Promise<void> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  await context.runOnDevice(serial, ["shell", "input", "keyevent", keyCode], options.timeoutMs, "ACTION_TIMEOUT");

}

export async function textInput(context: AdbDriverExecutionContext, encodedText: string, options: DriverTextInputOptions): Promise<void> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  await context.runOnDevice(serial, ["shell", "input", "text", encodedText], options.timeoutMs, "ACTION_TIMEOUT");

}

export async function clearText(context: AdbDriverExecutionContext, maxChars: number, options: DriverTextClearOptions): Promise<void> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  await context.runOnDevice(
    serial,
    ["shell", "input", "keyevent", "KEYCODE_MOVE_END", ...Array(maxChars).fill("KEYCODE_DEL")],
    options.timeoutMs,
    "ACTION_TIMEOUT"
  );

}

export async function swipe(context: AdbDriverExecutionContext, start: Point, end: Point, durationMs: number, options: DriverSwipeOptions): Promise<void> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  await context.runOnDevice(
    serial,
    [
      "shell",
      "input",
      "swipe",
      String(start[0]),
      String(start[1]),
      String(end[0]),
      String(end[1]),
      String(durationMs)
    ],
    options.timeoutMs,
    "ACTION_TIMEOUT"
  );

}

export async function drag(context: AdbDriverExecutionContext, 
  start: Point,
  end: Point,
  durationMs: number,
  gesture: "draganddrop" | "swipe",
  options: DriverDragOptions
): Promise<void> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  await context.runOnDevice(
    serial,
    [
      "shell",
      "input",
      gesture,
      String(start[0]),
      String(start[1]),
      String(end[0]),
      String(end[1]),
      String(durationMs)
    ],
    options.timeoutMs,
    "ACTION_TIMEOUT"
  );

}

export async function screenshot(context: AdbDriverExecutionContext, options: DriverScreenshotOptions): Promise<DriverScreenshotResult> {
  const serial = await context.resolveSerial(options.deviceSerial, options.timeoutMs);
  const result = await context.transport.runBuffer(["-s", serial, "exec-out", "screencap", "-p"], {
    timeoutMs: options.timeoutMs,
    timeoutCode: "ACTION_TIMEOUT",
    maxOutputBytes: context.screenshotMaxBytes
  });
  return {
    serial,
    png: result.stdout,
    durationMs: result.durationMs
  };

}

export async function recordScreen(context: AdbDriverExecutionContext, request: DriverScreenrecordRequest): Promise<DriverScreenrecordResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = buildAdbScreenrecordArgs(request);
  const safeArgs = redactScreenrecordArgs(args, request.remotePath);
  let result;

  try {
    result = await context.runOnDevice(serial, args, request.timeoutMs, "ACTION_TIMEOUT", false);
  } catch (error) {
    if (error instanceof AutophoneError) {
      throw redactScreenrecordError(error, request.remotePath);
    }
    throw error;
  }

  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(redactScreenrecordText(output, request.remotePath), result.exitCode, safeArgs);
  const failure = parseAdbScreenrecordFailure(result.stdout, result.stderr, result.exitCode);
  if (failure !== undefined) {
    throw screenrecordFailure({
      message: failure,
      remotePath: request.remotePath,
      details: {
        method: "screenrecord",
        exit_code: result.exitCode,
        stdout_chars: result.stdout.length,
        stderr_chars: result.stderr.length,
        duration_seconds: request.durationSeconds,
        args: safeArgs
      }
    });
  }

  return {
    serial,
    remotePath: request.remotePath,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function pushFile(context: AdbDriverExecutionContext, request: DriverFileTransferRequest): Promise<DriverFileTransferResult> {
  return context.runFileTransfer("push", request, "FILE_PUSH_FAILED");

}

export async function pullFile(context: AdbDriverExecutionContext, request: DriverFileTransferRequest): Promise<DriverFileTransferResult> {
  return context.runFileTransfer("pull", request, "FILE_PULL_FAILED");

}

export async function statFile(context: AdbDriverExecutionContext, request: DriverFileStatRequest): Promise<DriverFileStatResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = buildAdbFileStatArgs(request.remotePath);
  const safeArgs = redactFileStatArgs(args, request.remotePath);
  let result;

  try {
    result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
  } catch (error) {
    if (error instanceof AutophoneError) {
      throw redactFileStatError(error, request.remotePath);
    }
    throw error;
  }

  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(redactFileStatText(output, request.remotePath), result.exitCode, safeArgs);
  const parsed = parseAdbFileStatOutput(result.stdout, result.stderr, result.exitCode);
  if (parsed.failure !== undefined) {
    throw fileStatFailure({
      message: parsed.failure,
      remotePath: request.remotePath,
      details: {
        method: "device_stat",
        exit_code: result.exitCode,
        stdout_chars: result.stdout.length,
        stderr_chars: result.stderr.length,
        args: safeArgs
      }
    });
  }

  return {
    serial,
    exists: parsed.exists,
    entry: parsed.entry,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function hashFile(context: AdbDriverExecutionContext, request: DriverFileHashRequest): Promise<DriverFileHashResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = buildAdbFileHashArgs(request.remotePath, request.algorithm);
  const safeArgs = redactFileHashArgs(args, request.remotePath);
  let result;

  try {
    result = await context.runOnDevice(serial, args, request.timeoutMs, "ADB_ERROR", false);
  } catch (error) {
    if (error instanceof AutophoneError) {
      throw redactFileHashError(error, request.remotePath);
    }
    throw error;
  }

  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(redactFileHashText(output, request.remotePath), result.exitCode, safeArgs);
  const parsed = parseAdbFileHashOutput(result.stdout, result.stderr, result.exitCode, request.algorithm);
  if (parsed.failure !== undefined) {
    throw fileHashFailure({
      message: parsed.failure,
      remotePath: request.remotePath,
      details: {
        method: fileHashMethod(request.algorithm),
        algorithm: request.algorithm,
        exit_code: result.exitCode,
        stdout_chars: result.stdout.length,
        stderr_chars: result.stderr.length,
        args: safeArgs
      }
    });
  }

  return {
    serial,
    algorithm: request.algorithm,
    digest: parsed.digest,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function removeFile(context: AdbDriverExecutionContext, request: DriverFileRemoveRequest): Promise<DriverFileRemoveResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = buildAdbFileRmArgs(request.remotePath);
  const safeArgs = redactFileRmArgs(args, request.remotePath);
  let result;

  try {
    result = await context.runOnDevice(serial, args, request.timeoutMs, "ACTION_TIMEOUT", false);
  } catch (error) {
    if (error instanceof AutophoneError) {
      throw redactFileRmError(error, request.remotePath);
    }
    throw error;
  }

  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(redactFileRmText(output, request.remotePath), result.exitCode, safeArgs);
  const failure = parseAdbFileRmFailure(result.stdout, result.stderr, result.exitCode);
  if (failure !== undefined) {
    throw fileRmFailure({
      message: failure,
      remotePath: request.remotePath,
      details: {
        method: "device_rm",
        exit_code: result.exitCode,
        stdout_chars: result.stdout.length,
        stderr_chars: result.stderr.length,
        args: safeArgs
      }
    });
  }

  return {
    serial,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function makeDirectory(context: AdbDriverExecutionContext, request: DriverFileMkdirRequest): Promise<DriverFileMkdirResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = buildAdbFileMkdirArgs(request.remotePath);
  const safeArgs = redactFileMkdirArgs(args, request.remotePath);
  let result;

  try {
    result = await context.runOnDevice(serial, args, request.timeoutMs, "ACTION_TIMEOUT", false);
  } catch (error) {
    if (error instanceof AutophoneError) {
      throw redactFileMkdirError(error, request.remotePath);
    }
    throw error;
  }

  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(redactFileMkdirText(output, request.remotePath), result.exitCode, safeArgs);
  const failure = parseAdbFileMkdirFailure(result.stdout, result.stderr, result.exitCode);
  if (failure !== undefined) {
    throw fileMkdirFailure({
      message: failure,
      remotePath: request.remotePath,
      details: {
        method: "device_mkdir",
        exit_code: result.exitCode,
        stdout_chars: result.stdout.length,
        stderr_chars: result.stderr.length,
        args: safeArgs
      }
    });
  }

  return {
    serial,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function moveFile(context: AdbDriverExecutionContext, request: DriverFileMoveRequest): Promise<DriverFileMoveResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const paths = [request.sourcePath, request.destPath];
  const args = buildAdbFileMoveArgs(request.sourcePath, request.destPath);
  const safeArgs = redactFileMoveArgs(args, paths);
  let result;

  try {
    result = await context.runOnDevice(serial, args, request.timeoutMs, "ACTION_TIMEOUT", false);
  } catch (error) {
    if (error instanceof AutophoneError) {
      throw redactFileMoveError(error, paths);
    }
    throw error;
  }

  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(redactFileMoveText(output, paths), result.exitCode, safeArgs);
  const failure = parseAdbFileMoveFailure(result.stdout, result.stderr, result.exitCode);
  if (failure !== undefined) {
    throw fileMoveFailure({
      message: failure,
      paths,
      details: {
        method: "device_mv",
        exit_code: result.exitCode,
        stdout_chars: result.stdout.length,
        stderr_chars: result.stderr.length,
        args: safeArgs
      }
    });
  }

  return {
    serial,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function copyFile(context: AdbDriverExecutionContext, request: DriverFileCopyRequest): Promise<DriverFileCopyResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const paths = [request.sourcePath, request.destPath];
  const args = buildAdbFileCopyArgs(request.sourcePath, request.destPath);
  const safeArgs = redactFileCopyArgs(args, paths);
  let result;

  try {
    result = await context.runOnDevice(serial, args, request.timeoutMs, "ACTION_TIMEOUT", false);
  } catch (error) {
    if (error instanceof AutophoneError) {
      throw redactFileCopyError(error, paths);
    }
    throw error;
  }

  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(redactFileCopyText(output, paths), result.exitCode, safeArgs);
  const failure = parseAdbFileCopyFailure(result.stdout, result.stderr, result.exitCode);
  if (failure !== undefined) {
    throw fileCopyFailure({
      message: failure,
      paths,
      details: {
        method: "device_cp_no_clobber",
        exit_code: result.exitCode,
        stdout_chars: result.stdout.length,
        stderr_chars: result.stderr.length,
        args: safeArgs
      }
    });
  }

  return {
    serial,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}

export async function listDirectory(context: AdbDriverExecutionContext, request: DriverFileListRequest): Promise<DriverFileListResult> {
  const serial = await context.resolveSerial(request.deviceSerial, request.timeoutMs);
  const args = buildAdbFileListArgs(request.remotePath, request.maxEntries);
  const safeArgs = redactFileListArgs(args, request.remotePath);
  let result;

  try {
    result = await context.transport.runBuffer(["-s", serial, ...args], {
      timeoutMs: request.timeoutMs,
      timeoutCode: "ADB_ERROR",
      rejectOnNonZero: false,
      maxOutputBytes: fileListMaxOutputBytes(request.maxEntries)
    });
  } catch (error) {
    if (error instanceof AutophoneError) {
      throw redactFileListError(error, request.remotePath);
    }
    throw error;
  }

  throwIfAdbTargetFailure(redactFileListText(result.stderr, request.remotePath), result.exitCode, safeArgs);
  const parsed = parseAdbFileListOutput(result.stdout, result.stderr, result.exitCode, request.remotePath);
  if (parsed.failure !== undefined) {
    throw fileListFailure({
      message: parsed.failure,
      remotePath: request.remotePath,
      details: {
        method: "device_find_stat",
        exit_code: result.exitCode,
        stdout_bytes: result.stdout.byteLength,
        stderr_chars: result.stderr.length,
        args: safeArgs
      }
    });
  }

  return {
    serial,
    entries: parsed.entries,
    truncated: parsed.truncated,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  };

}
