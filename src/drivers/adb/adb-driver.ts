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
  DriverDeviceImeResult,DriverImeCommandRequest,DriverImeCommandResult,DriverImeResetRequest,
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
  DriverAdbKeyboardTextInputRequest,
  DriverAdbKeyboardTextInputResult,
  DriverClipboardGetRequest, DriverClipboardGetResult, DriverClipboardSetRequest, DriverClipboardSetResult,
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
import * as DeviceMethods from "./adb-driver-device-methods.js";
import * as InteractionFileMethods from "./adb-driver-interaction-file-methods.js";
import * as AppMethods from "./adb-driver-app-methods.js";
import { getClipboard as readClipboard, setClipboard as writeClipboard } from "./clipboard.js";import { enableInputMethod as imeEnable, resetInputMethod as imeReset, setInputMethod as imeSet } from "./ime.js";
import { adbKeyboardTextInput as writeAdbKeyboardText } from "./adb-keyboard.js";
import { assertOrientationSourceSucceeded } from "./adb-driver-source-assertions.js";
import { isBenignAdbStderrLine, parseAdbDevices, parseAdbDevicesLong, parseAdbInstallOutput, parseAdbUninstallOutput, parseCurrentUserOutput, parseDeviceReadyState, parseDumpsysPackagePermission, parseLogcatLines, parsePidofOutput, parsePmClearOutput, parsePmListPackagesOutput, parsePmListUserLine, parsePmListUsersOutput, parsePmPathOutput, parsePmPermissionOutput, parseSettingsBoolean } from "./adb-driver-parsers-core.js";
import { isInputMethodId, mapConnectivityTransports, normalizeInputMethodId, parseBrightnessFloatSetting, parseBrightnessIntSetting, parseBrightnessModeSetting, parseConnectivityActiveNetwork, parseDumpsysDisplayBrightness, parseDumpsysInputMethodState, parseEnabledInputMethodSetting, parseInputMethodSetting, readBrightnessFloat } from "./adb-driver-parsers-device.js";
import { assertSafeAdbUninstallRequest, assertSafePermissionInspectRequest, assertSafePmPathRequest, assertSafePmPermissionRequest, assignPermissionEntry, buildAdbInstallArgs, buildAdbUninstallArgs, buildPmListPackagesArgs, buildPmPathArgs, buildPmPermissionArgs, describeUrlForLog, emptyDumpsysPermissionEntry, hasAdbOfflineFailure, hasAdbUnauthorizedFailure, hasDumpsysPackageBlock, isDumpsysPackageMissing, isLogcatUnavailable, isPidofUnavailable, isPmPathAbsentFailure, isPmPermissionFailureLine, parseDumpsysPackageFailure, parseDumpsysPermissionEntry, parseDumpsysPermissionFlags, parseLogcatFailure, parsePmListPackagesFailure, parseRequestedPermissionName, parseTargetSdk, readAnyBooleanField, readBooleanField, readFirstMatch, readInstallFailureCode, readUninstallFailureCode, redactPathFromAutophoneError, redactPathFromText, redactPathInValue, redactUrlArgs, redactUrlFromAutophoneError, redactUrlFromText, redactUrlInValue, resolvePermissionDumpState, throwIfAdbTargetFailure } from "./adb-driver-parsers-app.js";
import { DEVICE_DETAILS_PROPERTY_KEYS, PRODUCT_PROPERTY_SOURCES, buildProductPropertyKeys, collectDumpsysAudioRingerBlock, escapeRegExp, extractStatusBarFailureText, isAdbLongDetailToken, isInstalledPackageName, isMediaSessionVolumeFailureLine, isStatusBarIconSlot, isStatusBarIconsFailureLine, mapRingerMode, mapZenMode, orientationFromRotationDegrees, orientationFromWindowSize, parseAdbDeviceLongLine, parseAmForceStopOutput, parseAmStartOutput, parseAudioServiceStreamTokens, parseAutoRotate, parseDensityField, parseDumpsysAudioRingerState, parseFocus, parseGetpropOutput, parseInteger, parseMediaSessionVolumeGetOutput, parseMonkeyLaunchOutput, parseOrientation, parseRotationDegrees, parseRotationNamedValue, parseRotationQuarterTurns, parseSingleRingerModeLine, parseSingleRingerStreamMaskLine, parseSingleZenModeLine, parseSizeField, parseStatusBarIconsOutput, parseUserRotationPolicy, parseWindowDensityDetails, parseWindowSize, parseWindowSizeDetails, parseWmUserRotationFailure, readField, readFirstProperty, readProductProperty, readSupportedAbis, rotationDegreesToQuarterTurn, selectDeviceDetailsProperties, splitAbiList, truncateForErrorDetails, uniqueStrings } from "./adb-driver-parsers-details.js";
export * from "./adb-driver-public-exports.js";

export type AdbDriverOptions = {
  adbPath?: string | undefined;
};

export class AdbDriver implements AndroidDriver {
  private readonly transport: AdbTransport;
  private readonly screenshotMaxBytes = 64 * 1024 * 1024;

  constructor(options: AdbDriverOptions = {}) {
    this.transport = new AdbTransport({ adbPath: options.adbPath });
  }

  async listDevices(options: DeviceListOptions): Promise<DriverDevice[]> {
    return DeviceMethods.listDevices(this.executionContext(), options);
  }

  async listUsers(options: DeviceDetailsOptions): Promise<DriverDeviceUsersResult> {
    return DeviceMethods.listUsers(this.executionContext(), options);
  }

  async getCurrentUser(options: DeviceDetailsOptions): Promise<DriverDeviceCurrentUserResult> {
    return DeviceMethods.getCurrentUser(this.executionContext(), options);
  }

  async getOrientation(options: DeviceDetailsOptions): Promise<DriverDeviceOrientationResult> {
    return DeviceMethods.getOrientation(this.executionContext(), options);
  }

  async getUserRotationPolicy(options: DeviceDetailsOptions): Promise<DriverUserRotationPolicy> {
    return DeviceMethods.getUserRotationPolicy(this.executionContext(), options);
  }

  async setUserRotation(request: DriverSetUserRotationRequest): Promise<DriverCommandResult> {
    return DeviceMethods.setUserRotation(this.executionContext(), request);
  }

  async getDeviceDetails(options: DeviceDetailsOptions): Promise<DeviceDetailsResult> {
    return DeviceMethods.getDeviceDetails(this.executionContext(), options);
  }

  async getDeviceBatteryState(options: DeviceDetailsOptions): Promise<DriverDeviceBatteryResult> {
    return DeviceMethods.getDeviceBatteryState(this.executionContext(), options);
  }

  async getDeviceTimeState(options: DeviceDetailsOptions): Promise<DriverDeviceTimeResult> {
    return DeviceMethods.getDeviceTimeState(this.executionContext(), options);
  }

  async getDeviceReadyState(options: DeviceDetailsOptions): Promise<DeviceReadyState> {
    return DeviceMethods.getDeviceReadyState(this.executionContext(), options);
  }

  async getDeviceScreenState(options: DeviceDetailsOptions): Promise<DriverDeviceScreenResult> {
    return DeviceMethods.getDeviceScreenState(this.executionContext(), options);
  }

  async getDeviceNetworkState(options: DeviceDetailsOptions): Promise<DriverDeviceNetworkResult> {
    return DeviceMethods.getDeviceNetworkState(this.executionContext(), options);
  }

  async getDeviceStorageState(options: DeviceDetailsOptions): Promise<DriverDeviceStorageResult> {
    return DeviceMethods.getDeviceStorageState(this.executionContext(), options);
  }

  async getDeviceLocaleState(options: DeviceDetailsOptions): Promise<DriverDeviceLocaleResult> {
    return DeviceMethods.getDeviceLocaleState(this.executionContext(), options);
  }

  async getDeviceImeState(options: DeviceDetailsOptions): Promise<DriverDeviceImeResult> {
    return DeviceMethods.getDeviceImeState(this.executionContext(), options);
  }async enableInputMethod(request: DriverImeCommandRequest): Promise<DriverImeCommandResult> { return imeEnable(this.executionContext(), request); } async setInputMethod(request: DriverImeCommandRequest): Promise<DriverImeCommandResult> { return imeSet(this.executionContext(), request); } async resetInputMethod(request: DriverImeResetRequest): Promise<DriverImeCommandResult> { return imeReset(this.executionContext(), request); }

  async getDeviceBrightnessState(options: DeviceDetailsOptions): Promise<DriverDeviceBrightnessResult> {
    return DeviceMethods.getDeviceBrightnessState(this.executionContext(), options);
  }

  async getDeviceAnimationsState(options: DeviceDetailsOptions): Promise<DriverDeviceAnimationsResult> {
    return DeviceMethods.getDeviceAnimationsState(this.executionContext(), options);
  }

  async setDeviceAnimationScales(request: DriverDeviceAnimationsSetRequest): Promise<DriverDeviceAnimationsSetResult> {
    return DeviceMethods.setDeviceAnimationScales(this.executionContext(), request);
  }

  async getDeviceAccessibilityState(options: DeviceDetailsOptions): Promise<DriverDeviceAccessibilityResult> {
    return DeviceMethods.getDeviceAccessibilityState(this.executionContext(), options);
  }

  async wakeDevice(options: DeviceDetailsOptions): Promise<DriverCommandResult> {
    return DeviceMethods.wakeDevice(this.executionContext(), options);
  }

  async dismissKeyguard(options: DeviceDetailsOptions): Promise<DriverDismissKeyguardResult> {
    return DeviceMethods.dismissKeyguard(this.executionContext(), options);
  }

  async controlStatusBar(
    command: DriverStatusBarResult["command"],
    options: DeviceDetailsOptions
  ): Promise<DriverStatusBarResult> {
    return DeviceMethods.controlStatusBar(this.executionContext(), command, options);
  }

  async getStatusBarIcons(options: DeviceDetailsOptions): Promise<DriverStatusBarIconsResult> {
    return DeviceMethods.getStatusBarIcons(this.executionContext(), options);
  }

  async getVolume(request: DriverVolumeGetRequest): Promise<DriverVolumeGetResult> {
    return DeviceMethods.getVolume(this.executionContext(), request);
  }

  async getRinger(options: DeviceDetailsOptions): Promise<DriverRingerGetResult> {
    return DeviceMethods.getRinger(this.executionContext(), options);
  }

  async getNotifications(options: DeviceDetailsOptions): Promise<DriverDeviceNotificationsResult> {
    return DeviceMethods.getNotifications(this.executionContext(), options);
  }

  async observe(options: ObserveOptions): Promise<Snapshot> {
    return InteractionFileMethods.observe(this.executionContext(), options);
  }

  async tap(point: Point, options: DriverTapOptions): Promise<void> {
    return InteractionFileMethods.tap(this.executionContext(), point, options);
  }

  async doubleTap(point: Point, intervalMs: number, options: DriverDoubleTapOptions): Promise<void> {
    return InteractionFileMethods.doubleTap(this.executionContext(), point, intervalMs, options);
  }

  async keyEvent(keyCode: string, options: DriverKeyOptions): Promise<void> {
    return InteractionFileMethods.keyEvent(this.executionContext(), keyCode, options);
  }

  async textInput(encodedText: string, options: DriverTextInputOptions): Promise<void> {
    return InteractionFileMethods.textInput(this.executionContext(), encodedText, options);
  }

  async adbKeyboardTextInput(
    request: DriverAdbKeyboardTextInputRequest
  ): Promise<DriverAdbKeyboardTextInputResult> {
    return writeAdbKeyboardText(this.executionContext(), request);
  }
  async clearText(maxChars: number, options: DriverTextClearOptions): Promise<void> {
    return InteractionFileMethods.clearText(this.executionContext(), maxChars, options);
  }
  async getClipboard(request: DriverClipboardGetRequest): Promise<DriverClipboardGetResult> { return readClipboard(this.executionContext(), request); } async setClipboard(request: DriverClipboardSetRequest): Promise<DriverClipboardSetResult> { return writeClipboard(this.executionContext(), request); }

  async swipe(start: Point, end: Point, durationMs: number, options: DriverSwipeOptions): Promise<void> {
    return InteractionFileMethods.swipe(this.executionContext(), start, end, durationMs, options);
  }

  async drag(
    start: Point,
    end: Point,
    durationMs: number,
    gesture: "draganddrop" | "swipe",
    options: DriverDragOptions
  ): Promise<void> {
    return InteractionFileMethods.drag(this.executionContext(), start, end, durationMs, gesture, options);
  }

  async screenshot(options: DriverScreenshotOptions): Promise<DriverScreenshotResult> {
    return InteractionFileMethods.screenshot(this.executionContext(), options);
  }

  async recordScreen(request: DriverScreenrecordRequest): Promise<DriverScreenrecordResult> {
    return InteractionFileMethods.recordScreen(this.executionContext(), request);
  }

  async pushFile(request: DriverFileTransferRequest): Promise<DriverFileTransferResult> {
    return InteractionFileMethods.pushFile(this.executionContext(), request);
  }

  async pullFile(request: DriverFileTransferRequest): Promise<DriverFileTransferResult> {
    return InteractionFileMethods.pullFile(this.executionContext(), request);
  }

  async statFile(request: DriverFileStatRequest): Promise<DriverFileStatResult> {
    return InteractionFileMethods.statFile(this.executionContext(), request);
  }

  async hashFile(request: DriverFileHashRequest): Promise<DriverFileHashResult> {
    return InteractionFileMethods.hashFile(this.executionContext(), request);
  }

  async removeFile(request: DriverFileRemoveRequest): Promise<DriverFileRemoveResult> {
    return InteractionFileMethods.removeFile(this.executionContext(), request);
  }

  async makeDirectory(request: DriverFileMkdirRequest): Promise<DriverFileMkdirResult> {
    return InteractionFileMethods.makeDirectory(this.executionContext(), request);
  }

  async moveFile(request: DriverFileMoveRequest): Promise<DriverFileMoveResult> {
    return InteractionFileMethods.moveFile(this.executionContext(), request);
  }

  async copyFile(request: DriverFileCopyRequest): Promise<DriverFileCopyResult> {
    return InteractionFileMethods.copyFile(this.executionContext(), request);
  }

  async listDirectory(request: DriverFileListRequest): Promise<DriverFileListResult> {
    return InteractionFileMethods.listDirectory(this.executionContext(), request);
  }

  async currentApp(options: ObserveOptions): Promise<AppCurrentResult> {
    return AppMethods.currentApp(this.executionContext(), options);
  }

  async listPackages(request: DriverAppListRequest): Promise<DriverAppListResult> {
    return AppMethods.listPackages(this.executionContext(), request);
  }

  async getAppActivities(request: DriverAppActivitiesRequest): Promise<DriverAppActivitiesResult> {
    return AppMethods.getAppActivities(this.executionContext(), request);
  }

  async getAppPackageInfo(request: DriverAppPackageInfoRequest): Promise<DriverAppPackageInfoResult> {
    return AppMethods.getAppPackageInfo(this.executionContext(), request);
  }

  async getAppLinks(request: DriverAppLinksRequest): Promise<DriverAppLinksResult> {
    return AppMethods.getAppLinks(this.executionContext(), request);
  }

  async getPackagePids(request: DriverPackagePidsRequest): Promise<DriverPackagePidsResult> {
    return AppMethods.getPackagePids(this.executionContext(), request);
  }

  async getAppOps(request: DriverAppOpsGetRequest): Promise<DriverAppOpsGetResult> {
    return AppMethods.getAppOps(this.executionContext(), request);
  }

  async getPackagePidSnapshot(request: DriverPackagePidSnapshotRequest): Promise<DriverPackagePidSnapshotResult> {
    return AppMethods.getPackagePidSnapshot(this.executionContext(), request);
  }

  async getAppMemorySnapshot(request: DriverAppMemoryRequest): Promise<DriverAppMemoryResult> {
    return AppMethods.getAppMemorySnapshot(this.executionContext(), request);
  }

  async getAppGraphicsSnapshot(request: DriverAppGraphicsRequest): Promise<DriverAppGraphicsResult> {
    return AppMethods.getAppGraphicsSnapshot(this.executionContext(), request);
  }

  async dumpLogcat(request: DriverLogcatDumpRequest): Promise<DriverLogcatDumpResult> {
    return AppMethods.dumpLogcat(this.executionContext(), request);
  }

  async clearPackageData(request: DriverAppClearDataRequest): Promise<DriverAppClearDataResult> {
    return AppMethods.clearPackageData(this.executionContext(), request);
  }

  async installApk(request: DriverAppInstallRequest): Promise<DriverAppInstallResult> {
    return AppMethods.installApk(this.executionContext(), request);
  }

  async inspectPackage(request: DriverAppInspectRequest): Promise<DriverAppInspectResult> {
    return AppMethods.inspectPackage(this.executionContext(), request);
  }

  async setAppPermission(request: DriverAppPermissionRequest): Promise<DriverAppPermissionResult> {
    return AppMethods.setAppPermission(this.executionContext(), request);
  }

  async inspectAppPermission(
    request: DriverAppPermissionInspectRequest
  ): Promise<DriverAppPermissionInspectResult> {
    return AppMethods.inspectAppPermission(this.executionContext(), request);
  }

  async uninstallPackage(request: DriverAppUninstallRequest): Promise<DriverAppUninstallResult> {
    return AppMethods.uninstallPackage(this.executionContext(), request);
  }

  async startActivity(request: DriverAppStartRequest): Promise<DriverAppStartResult> {
    return AppMethods.startActivity(this.executionContext(), request);
  }

  async launchPackage(request: DriverAppLaunchRequest): Promise<DriverAppLaunchResult> {
    return AppMethods.launchPackage(this.executionContext(), request);
  }

  async openUrl(request: DriverOpenUrlRequest): Promise<DriverOpenUrlResult> {
    return AppMethods.openUrl(this.executionContext(), request);
  }

  async resolveUrl(request: DriverResolveUrlRequest): Promise<DriverResolveUrlResult> {
    return AppMethods.resolveUrl(this.executionContext(), request);
  }

  async stopPackage(request: DriverAppStopRequest): Promise<DriverAppStopResult> {
    return AppMethods.stopPackage(this.executionContext(), request);
  }

  private executionContext(): AdbDriverExecutionContext {
    return {
      transport: this.transport,
      screenshotMaxBytes: this.screenshotMaxBytes,
      resolveSerial: (deviceSerial, timeoutMs) => this.resolveSerial(deviceSerial, timeoutMs),
      runOnDevice: (serial, args, timeoutMs, timeoutCode, rejectOnNonZero) =>
        this.runOnDevice(serial, args, timeoutMs, timeoutCode, rejectOnNonZero),
      runFileTransfer: (kind, request, code) => this.runFileTransfer(kind, request, code),
      runOptionalInfoCommand: (serial, args, timeoutMs) => this.runOptionalInfoCommand(serial, args, timeoutMs),
      assertDeviceScreenSourceSucceeded: (...args) =>
        Reflect.apply(this.assertDeviceScreenSourceSucceeded, this, args),
      assertDeviceNetworkSourceSucceeded: (...args) =>
        Reflect.apply(this.assertDeviceNetworkSourceSucceeded, this, args),
      assertDeviceImeSourceSucceeded: (...args) => Reflect.apply(this.assertDeviceImeSourceSucceeded, this, args),
      assertDeviceBrightnessSourceSucceeded: (...args) =>
        Reflect.apply(this.assertDeviceBrightnessSourceSucceeded, this, args),
      assertDeviceAnimationsSourceSucceeded: (...args) =>
        Reflect.apply(this.assertDeviceAnimationsSourceSucceeded, this, args),
      assertDeviceAnimationsSetSourceSucceeded: (...args) =>
        Reflect.apply(this.assertDeviceAnimationsSetSourceSucceeded, this, args),
      assertDeviceAccessibilitySourceSucceeded: (...args) =>
        Reflect.apply(this.assertDeviceAccessibilitySourceSucceeded, this, args),
      assertOrientationSourceSucceeded
    };
  }

  private async resolveSerial(deviceSerial: string | undefined, timeoutMs: number): Promise<string> {
    if (deviceSerial !== undefined) {
      return deviceSerial;
    }

    const result = await this.transport.run(["devices"], { timeoutMs });
    const devices = parseAdbDevices(result.stdout);
    const online = devices.filter((device) => device.state === "device");

    if (online.length === 1) {
      return online[0]!.serial;
    }
    if (online.length > 1) {
      throw new AutophoneError({
        code: "MULTIPLE_DEVICES",
        message: "multiple adb devices are online; pass a device serial",
        retriable: false,
        details: { devices }
      });
    }

    const unauthorized = devices.find((device) => device.state === "unauthorized");
    if (unauthorized !== undefined) {
      throw new AutophoneError({
        code: "DEVICE_UNAUTHORIZED",
        message: "adb device is unauthorized",
        retriable: false,
        details: { devices }
      });
    }

    const offline = devices.find((device) => device.state === "offline");
    if (offline !== undefined) {
      throw new AutophoneError({
        code: "DEVICE_OFFLINE",
        message: "adb device is offline",
        retriable: true,
        details: { devices }
      });
    }

    throw new AutophoneError({
      code: "NO_DEVICE",
      message: "no adb device is online",
      retriable: true,
      details: { devices }
    });
  }

  private runOnDevice(
    serial: string,
    args: readonly string[],
    timeoutMs: number,
    timeoutCode: "DUMP_TIMEOUT" | "ACTION_TIMEOUT" | "ADB_ERROR" = "ADB_ERROR",
    rejectOnNonZero = true
  ) {
    return this.transport.run(["-s", serial, ...args], { timeoutMs, timeoutCode, rejectOnNonZero });
  }

  private async runFileTransfer(
    kind: AdbFileTransferKind,
    request: DriverFileTransferRequest,
    code: "FILE_PUSH_FAILED" | "FILE_PULL_FAILED"
  ): Promise<DriverFileTransferResult> {
    const paths = [request.localPath, request.remotePath];
    const args = buildAdbFileTransferArgs({
      kind,
      serial: request.deviceSerial,
      localPath: request.localPath,
      remotePath: request.remotePath,
      compression: request.compression
    });
    const safeArgs = redactFileTransferArgs(args, paths);
    let result;

    try {
      result = await this.transport.run(args, {
        timeoutMs: request.timeoutMs,
        timeoutCode: "ACTION_TIMEOUT",
        rejectOnNonZero: false
      });
    } catch (error) {
      if (error instanceof AutophoneError) {
        throw redactFileTransferError(error, paths);
      }
      throw error;
    }

    const output = `${result.stdout}\n${result.stderr}`;
    throwIfAdbTargetFailure(redactFileTransferText(output, paths), result.exitCode, safeArgs);
    const failure = parseAdbFileTransferFailure(output);

    if (result.exitCode !== 0 || failure !== undefined) {
      throw fileTransferFailure({
        code,
        message: failure ?? `adb ${kind} failed`,
        paths,
        details: {
          method: kind === "push" ? "adb_push" : "adb_pull",
          exit_code: result.exitCode,
          stdout_chars: result.stdout.length,
          stderr_chars: result.stderr.length,
          args: safeArgs
        }
      });
    }

    return {
      serial: request.deviceSerial,
      exitCode: result.exitCode,
      durationMs: result.durationMs
    };
  }

  private async runOptionalInfoCommand(serial: string, args: readonly string[], timeoutMs: number): Promise<string> {
    const result = await this.runOnDevice(serial, args, timeoutMs, "ADB_ERROR", false);
    throwIfAdbTargetFailure(`${result.stdout}\n${result.stderr}`, result.exitCode, args);
    return result.exitCode === 0 ? result.stdout : "";
  }

  private assertDeviceScreenSourceSucceeded(
    method: "dumpsys_power" | "dumpsys_window",
    result: { stdout: string; stderr: string; exitCode: number | null },
    args: readonly string[]
  ): void {
    const output = `${result.stdout}\n${result.stderr}`;
    throwIfAdbTargetFailure(output, result.exitCode, args);
    if (result.exitCode !== 0) {
      throw new AutophoneError({
        code: "DEVICE_SCREEN_FAILED",
        message: `${method} command failed`,
        retriable: false,
        details: {
          method,
          exit_code: result.exitCode,
          stdout: truncateForErrorDetails(result.stdout),
          stderr: truncateForErrorDetails(result.stderr)
        }
      });
    }
  }

  private assertDeviceNetworkSourceSucceeded(
    method:
      | "settings_global_airplane_mode_on"
      | "settings_global_wifi_on"
      | "settings_global_mobile_data"
      | "dumpsys_connectivity",
    result: { stdout: string; stderr: string; exitCode: number | null },
    args: readonly string[]
  ): void {
    const output = `${result.stdout}\n${result.stderr}`;
    throwIfAdbTargetFailure(output, result.exitCode, args);
    if (result.exitCode !== 0) {
      throw new AutophoneError({
        code: "DEVICE_NETWORK_FAILED",
        message: `${method} command failed`,
        retriable: false,
        details: {
          method,
          exit_code: result.exitCode,
          stdout:
            method === "dumpsys_connectivity" ? undefined : truncateForErrorDetails(result.stdout, 256),
          stderr: truncateForErrorDetails(result.stderr, 512),
          connectivity_stdout_chars: method === "dumpsys_connectivity" ? result.stdout.length : undefined
        }
      });
    }
  }

  private assertDeviceImeSourceSucceeded(
    method:
      | "dumpsys_input_method"
      | "settings_secure_default_input_method"
      | "settings_secure_enabled_input_methods",
    result: { stdout: string; stderr: string; exitCode: number | null },
    args: readonly string[]
  ): void {
    const output = `${result.stdout}\n${result.stderr}`;
    throwIfAdbTargetFailure(output, result.exitCode, args);
    if (result.exitCode !== 0) {
      throw new AutophoneError({
        code: "DEVICE_IME_FAILED",
        message: `${method} command failed`,
        retriable: false,
        details: {
          method,
          exit_code: result.exitCode,
          stdout: method === "dumpsys_input_method" ? undefined : truncateForErrorDetails(result.stdout, 512),
          stderr: truncateForErrorDetails(result.stderr, 512),
          input_method_stdout_chars: method === "dumpsys_input_method" ? result.stdout.length : undefined
        }
      });
    }
  }

  private assertDeviceBrightnessSourceSucceeded(
    method:
      | "settings_system_screen_brightness"
      | "settings_system_screen_brightness_mode"
      | "settings_system_screen_auto_brightness_adj"
      | "settings_system_screen_brightness_float"
      | "dumpsys_display",
    result: { stdout: string; stderr: string; exitCode: number | null },
    args: readonly string[]
  ): void {
    const output = `${result.stdout}\n${result.stderr}`;
    throwIfAdbTargetFailure(output, result.exitCode, args);
    if (result.exitCode !== 0) {
      throw new AutophoneError({
        code: "DEVICE_BRIGHTNESS_FAILED",
        message: `${method} command failed`,
        retriable: false,
        details: {
          method,
          exit_code: result.exitCode,
          stdout: method === "dumpsys_display" ? undefined : truncateForErrorDetails(result.stdout, 512),
          stderr: truncateForErrorDetails(result.stderr, 512),
          dumpsys_display_stdout_chars: method === "dumpsys_display" ? result.stdout.length : undefined
        }
      });
    }
  }

  private assertDeviceAnimationsSourceSucceeded(
    method: (typeof DEVICE_ANIMATION_SETTINGS)[number]["method"],
    result: { stdout: string; stderr: string; exitCode: number | null },
    args: readonly string[]
  ): void {
    const output = `${result.stdout}\n${result.stderr}`;
    throwIfAdbTargetFailure(output, result.exitCode, args);
    if (result.exitCode !== 0) {
      throw new AutophoneError({
        code: "DEVICE_ANIMATIONS_FAILED",
        message: `${method} command failed`,
        retriable: false,
        details: {
          method,
          exit_code: result.exitCode,
          stdout: truncateForErrorDetails(result.stdout, 256),
          stderr: truncateForErrorDetails(result.stderr, 512)
        }
      });
    }
  }

  private assertDeviceAnimationsSetSourceSucceeded(
    method: DeviceAnimationPutMethod,
    result: { stdout: string; stderr: string; exitCode: number | null },
    args: readonly string[]
  ): void {
    const output = `${result.stdout}\n${result.stderr}`;
    throwIfAdbTargetFailure(output, result.exitCode, args);
    if (result.exitCode !== 0 || result.stdout.trim().length > 0 || result.stderr.trim().length > 0) {
      throw new AutophoneError({
        code: "DEVICE_ANIMATIONS_SET_FAILED",
        message:
          result.exitCode === 0
            ? `${method} command wrote unexpected output`
            : `${method} command failed`,
        retriable: false,
        details: {
          method,
          exit_code: result.exitCode,
          stdout: truncateForErrorDetails(result.stdout, 256),
          stderr: truncateForErrorDetails(result.stderr, 512),
          partial_mutation_possible: true,
          rollback_attempted: false
        }
      });
    }
  }

  private assertDeviceAccessibilitySourceSucceeded(
    method: (typeof DEVICE_ACCESSIBILITY_SETTINGS)[number]["method"],
    result: { stdout: string; stderr: string; exitCode: number | null },
    args: readonly string[]
  ): void {
    const output = `${result.stdout}\n${result.stderr}`;
    throwIfAdbTargetFailure(output, result.exitCode, args);
    if (result.exitCode !== 0) {
      throw new AutophoneError({
        code: "DEVICE_ACCESSIBILITY_FAILED",
        message: `${method} command failed`,
        retriable: false,
        details: {
          method,
          exit_code: result.exitCode,
          stdout: truncateForErrorDetails(result.stdout, 256),
          stderr: truncateForErrorDetails(result.stderr, 512)
        }
      });
    }
  }

}
