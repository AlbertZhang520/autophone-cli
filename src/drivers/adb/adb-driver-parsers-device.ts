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
import { readAnyBooleanField, readBooleanField, readFirstMatch } from "./adb-driver-parser-shared.js";

export { quoteForDeviceShell } from "./device-shell.js";
export { parseBatteryDetails } from "./device-battery.js";

export type ParsedConnectivityActiveNetwork =
  | { value: DriverDeviceNetworkResult["active"]; failure?: undefined }
  | { value?: undefined; failure: string };

export function parseConnectivityActiveNetwork(stdout: string, stderr: string): ParsedConnectivityActiveNetwork {
  if (stderr.trim().length > 0) {
    return { failure: "dumpsys connectivity wrote unexpected stderr" };
  }

  const activeNetworkLines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("Active default network:"));
  if (activeNetworkLines.length !== 1) {
    return { failure: "dumpsys connectivity did not expose exactly one active default network line" };
  }

  const activeValue = activeNetworkLines[0]!.replace(/^Active default network:\s*/, "").trim();
  if (/^(none|null|None|-1)$/u.test(activeValue)) {
    return {
      value: {
        network_id: null,
        transports: [],
        primary_transport: null,
        internet_capable: false,
        validated: false,
        online: false
      }
    };
  }
  if (!/^\d+$/u.test(activeValue)) {
    return { failure: "dumpsys connectivity returned an unexpected active default network value" };
  }

  const networkId = Number(activeValue);
  const networkLine = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.includes(`NetworkAgentInfo{network{${networkId}}`));
  if (networkLine === undefined) {
    return { failure: "dumpsys connectivity did not include details for the active default network" };
  }

  const networkCapabilities = networkLine.match(
    /nc\{\[\s*(?:Transports:\s*([A-Z_|]+)\s+)?Capabilities:\s*([A-Z0-9_&]+)/u
  );
  if (networkCapabilities === null) {
    return { failure: "dumpsys connectivity active network details did not expose parseable capabilities" };
  }

  const transports = mapConnectivityTransports(networkCapabilities[1] ?? "");
  const capabilities = new Set((networkCapabilities[2] ?? "").split("&").filter((value) => value.length > 0));
  const internetCapable = capabilities.has("INTERNET");
  const validated = capabilities.has("VALIDATED") || capabilities.has("IS_VALIDATED");

  return {
    value: {
      network_id: networkId,
      transports,
      primary_transport: transports[0] ?? null,
      internet_capable: internetCapable,
      validated,
      online: internetCapable && validated
    }
  };
}

export function mapConnectivityTransports(transports: string): DriverDeviceNetworkResult["active"]["transports"] {
  const mapped = transports
    .split("|")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => {
      switch (value) {
        case "WIFI":
          return "wifi";
        case "CELLULAR":
          return "cellular";
        case "ETHERNET":
          return "ethernet";
        case "VPN":
          return "vpn";
        case "BLUETOOTH":
          return "bluetooth";
        default:
          return "other";
      }
    });
  return Array.from(new Set(mapped));
}

export type ParsedDumpsysInputMethodState =
  | {
      value: {
        keyboard: DriverDeviceImeResult["keyboard"];
        service: DriverDeviceImeResult["service"];
        currentId: DriverDeviceImeResult["ime"]["current_id"];
      };
      failure?: undefined;
    }
  | { value?: undefined; failure: string };

export function parseDumpsysInputMethodState(stdout: string, stderr: string): ParsedDumpsysInputMethodState {
  if (stderr.trim().length > 0) {
    return { failure: "dumpsys input_method wrote unexpected stderr" };
  }

  const currentId = normalizeInputMethodId(
    readFirstMatch(stdout, /\bmCurMethodId=([^\s]+)/) ??
      readFirstMatch(stdout, /\bmSelectedMethodId=([^\s]+)/) ??
      readFirstMatch(stdout, /\bmCurId=([^\s]+)/)
  );
  if (currentId.failure !== undefined) {
    return { failure: currentId.failure };
  }

  const keyboard = {
    shown: readBooleanField(stdout, "mInputShown"),
    show_requested: readAnyBooleanField(stdout, ["mShowRequested", "mRequestedShowExplicitly"]),
    fullscreen_mode: readBooleanField(stdout, "mInFullscreenMode")
  };
  const service = {
    system_ready: readBooleanField(stdout, "mSystemReady"),
    interactive: readBooleanField(stdout, "mInteractive")
  };
  const hasSignal =
    currentId.value !== null ||
    Object.values(keyboard).some((value) => value !== null) ||
    Object.values(service).some((value) => value !== null);
  if (!hasSignal) {
    return { failure: "dumpsys input_method did not expose parseable IME state" };
  }

  return {
    value: {
      keyboard,
      service,
      currentId: currentId.value
    }
  };
}

export function parseInputMethodSetting(
  stdout: string,
  stderr: string,
  key: string
): { value: string | null; failure?: undefined } | { value?: undefined; failure: string } {
  if (stderr.trim().length > 0) {
    return { failure: `settings secure ${key} wrote unexpected stderr` };
  }
  return normalizeInputMethodId(stdout.trim(), `settings secure ${key} returned an invalid input method id`);
}

export function parseEnabledInputMethodSetting(
  stdout: string,
  stderr: string
): { value: string[]; failure?: undefined } | { value?: undefined; failure: string } {
  if (stderr.trim().length > 0) {
    return { failure: "settings secure enabled_input_methods wrote unexpected stderr" };
  }

  const value = stdout.trim();
  if (value === "" || value === "null") {
    return { value: [] };
  }
  if (value.length > 4096) {
    return { failure: "settings secure enabled_input_methods returned too much data" };
  }

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const rawEntry of value.split(":")) {
    const rawId = rawEntry.split(";")[0]?.trim() ?? "";
    const normalized = normalizeInputMethodId(rawId, "settings secure enabled_input_methods returned an invalid input method id");
    if (normalized.failure !== undefined) {
      return { failure: normalized.failure };
    }
    if (normalized.value !== null && !seen.has(normalized.value)) {
      seen.add(normalized.value);
      ids.push(normalized.value);
    }
  }
  if (ids.length > 64) {
    return { failure: "settings secure enabled_input_methods returned too many input methods" };
  }
  return { value: ids };
}

export function normalizeInputMethodId(
  value: string | null,
  failure = "dumpsys input_method returned an invalid current input method id"
): { value: string | null; failure?: undefined } | { value?: undefined; failure: string } {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "" || trimmed === "null") {
    return { value: null };
  }
  if (!isInputMethodId(trimmed)) {
    return { failure };
  }
  return { value: trimmed };
}

export function isInputMethodId(value: string): boolean {
  return (
    value.length <= 256 &&
    /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+(\/[A-Za-z0-9_.$]+)?$/.test(value)
  );
}

export function parseBrightnessIntSetting(
  stdout: string,
  stderr: string,
  key: string
): { value: number | null; failure?: undefined } | { value?: undefined; failure: string } {
  if (stderr.trim().length > 0) {
    return { failure: `settings system ${key} wrote unexpected stderr` };
  }
  const raw = stdout.trim();
  if (raw === "" || raw === "null") {
    return { value: null };
  }
  if (!/^\d+$/.test(raw)) {
    return { failure: `settings system ${key} returned an invalid integer` };
  }
  const value = Number(raw);
  if (value < 0 || value > 255) {
    return { failure: `settings system ${key} returned an out-of-range brightness value` };
  }
  return { value };
}

export function parseBrightnessModeSetting(
  stdout: string,
  stderr: string
): { value: DriverDeviceBrightnessResult["settings"]["mode"]; failure?: undefined } | { value?: undefined; failure: string } {
  if (stderr.trim().length > 0) {
    return { failure: "settings system screen_brightness_mode wrote unexpected stderr" };
  }
  const raw = stdout.trim();
  if (raw === "" || raw === "null") {
    return { value: { raw: null, value: "unknown" } };
  }
  if (!/^-?\d+$/.test(raw)) {
    return { failure: "settings system screen_brightness_mode returned an invalid integer" };
  }
  const value = Number(raw);
  if (value === 0) {
    return { value: { raw: value, value: "manual" } };
  }
  if (value === 1) {
    return { value: { raw: value, value: "automatic" } };
  }
  return { value: { raw: value, value: "unknown" } };
}

export function parseBrightnessFloatSetting(
  stdout: string,
  stderr: string,
  key: string,
  min: number,
  max: number
): { value: number | null; failure?: undefined } | { value?: undefined; failure: string } {
  if (stderr.trim().length > 0) {
    return { failure: `settings system ${key} wrote unexpected stderr` };
  }
  const raw = stdout.trim();
  if (raw === "" || raw === "null") {
    return { value: null };
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return { failure: `settings system ${key} returned an invalid float` };
  }
  if (value < min || value > max) {
    return { failure: `settings system ${key} returned an out-of-range value` };
  }
  return { value };
}

export type ParsedDumpsysDisplayBrightness =
  | { value: DriverDeviceBrightnessResult["display"]; failure?: undefined }
  | { value?: undefined; failure: string };

export function parseDumpsysDisplayBrightness(stdout: string, stderr: string): ParsedDumpsysDisplayBrightness {
  if (stderr.trim().length > 0) {
    return { failure: "dumpsys display wrote unexpected stderr" };
  }

  const value = {
    brightness: readBrightnessFloat(stdout, /\bDisplay Brightness=([0-9.]+|NaN)\b/),
    sdr_brightness: readBrightnessFloat(stdout, /\bDisplay SdrBrightness=([0-9.]+|NaN)\b/),
    cached_brightness: readBrightnessFloat(stdout, /\bmCachedBrightnessInfo\.brightness=([0-9.]+|NaN)\b/),
    cached_adjusted_brightness: readBrightnessFloat(
      stdout,
      /\bmCachedBrightnessInfo\.adjustedBrightness=([0-9.]+|NaN)\b/
    ),
    min: readBrightnessFloat(stdout, /\bmCachedBrightnessInfo\.brightnessMin=([0-9.]+|NaN)\b/),
    max: readBrightnessFloat(stdout, /\bmCachedBrightnessInfo\.brightnessMax=([0-9.]+|NaN)\b/)
  };

  if (Object.values(value).every((field) => field === null)) {
    return { failure: "dumpsys display did not expose parseable brightness fields" };
  }
  return { value };
}

export function readBrightnessFloat(output: string, pattern: RegExp): number | null {
  const raw = readFirstMatch(output, pattern);
  if (raw === null || raw === "NaN") {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}
