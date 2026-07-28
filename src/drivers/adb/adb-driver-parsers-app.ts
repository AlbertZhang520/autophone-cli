import { adbTargetFailureError } from "./adb-target-failure.js";
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
import { escapeRegExp } from "./adb-driver-parser-shared.js";

type DumpsysPermissionEntry = {
  present: boolean;
  granted: boolean | null;
  flags: string[];
};

type ParsedDumpsysPackagePermission = {
  packageFound: boolean;
  targetSdk: number | null;
  manifestRequested: boolean;
  availableUserIds: number[];
  install: DumpsysPermissionEntry;
  runtime: DumpsysPermissionEntry & {
    selectedUserId: number;
    userPresent: boolean;
  };
  state: "granted" | "denied" | "not_requested" | "unknown";
  granted: boolean | null;
  source: "runtime" | "install" | "manifest_initial" | "not_requested" | "package_absent" | "unresolved_user" | "unknown";
};

export { quoteForDeviceShell } from "./device-shell.js";
export { parseBatteryDetails } from "./device-battery.js";

export function buildPmListPackagesArgs(request: DriverAppListRequest): string[] {
  const args = ["shell", "pm", "list", "packages"];
  if (request.scope === "third_party") {
    args.push("-3");
  } else if (request.scope === "system") {
    args.push("-s");
  }
  if (request.state === "enabled") {
    args.push("-e");
  } else if (request.state === "disabled") {
    args.push("-d");
  }
  if (request.includeUninstalled) {
    args.push("-u");
  }
  if (request.filter !== undefined) {
    args.push(request.filter);
  }
  return args;
}

export function buildAdbInstallArgs(request: DriverAppInstallRequest): string[] {
  const args = ["install"];
  if (request.replace) {
    args.push("-r");
  }
  if (request.grantRuntimePermissions) {
    args.push("-g");
  }
  if (request.allowTest) {
    args.push("-t");
  }
  if (request.allowDowngrade) {
    args.push("-d");
  }
  args.push(request.apkPath);
  return args;
}

export function buildPmPermissionArgs(request: DriverAppPermissionRequest): string[] {
  const args = ["shell", "pm", request.operation];
  if (request.userId !== undefined) {
    args.push("--user", String(request.userId));
  }
  args.push(request.packageName, request.permissionName);
  return args;
}

export function buildPmPathArgs(request: DriverAppInspectRequest): string[] {
  const args = ["shell", "pm", "path"];
  if (request.userId !== undefined) {
    args.push("--user", String(request.userId));
  }
  args.push(request.packageName);
  return args;
}

export function buildAdbUninstallArgs(request: DriverAppUninstallRequest): string[] {
  const args = ["uninstall"];
  if (request.userId !== undefined) {
    args.push("--user", String(request.userId));
  }
  args.push(request.packageName);
  return args;
}

export function assertSafePmPermissionRequest(request: DriverAppPermissionRequest): void {
  if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(request.packageName)) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "invalid Android package name",
      retriable: false
    });
  }
  if (
    request.permissionName.length > 255 ||
    !/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(request.permissionName)
  ) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "invalid Android permission name",
      retriable: false
    });
  }
}

export function assertSafePermissionInspectRequest(request: DriverAppPermissionInspectRequest): void {
  if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(request.packageName)) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "invalid Android package name",
      retriable: false
    });
  }
  if (
    request.permissionName.length > 255 ||
    !/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(request.permissionName)
  ) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "invalid Android permission name",
      retriable: false
    });
  }
  if (
    request.userId !== undefined &&
    (!Number.isInteger(request.userId) || request.userId < 0 || request.userId > 2_147_483_647)
  ) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "invalid Android user id",
      retriable: false
    });
  }
}

export function assertSafePmPathRequest(request: DriverAppInspectRequest): void {
  if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*$/.test(request.packageName)) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "invalid installed Android package name",
      retriable: false
    });
  }
  if (
    request.userId !== undefined &&
    (!Number.isInteger(request.userId) || request.userId < 0 || request.userId > 2_147_483_647)
  ) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "invalid Android user id",
      retriable: false
    });
  }
}

export function isPmPathAbsentFailure(line: string): boolean {
  return /\b(unknown package|not installed|not found|could not find package|package .* does not exist)\b/i.test(line);
}

export function assertSafeAdbUninstallRequest(request: DriverAppUninstallRequest): void {
  if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(request.packageName)) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "invalid Android package name",
      retriable: false
    });
  }
  if (
    request.userId !== undefined &&
    (!Number.isInteger(request.userId) || request.userId < 0 || request.userId > 2_147_483_647)
  ) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "invalid Android user id",
      retriable: false
    });
  }
}

export function readInstallFailureCode(line: string): string | undefined {
  const bracketed = /\[((?:INSTALL|INSTALL_PARSE)_FAILED_[A-Z0-9_]+)[^\]]*]/.exec(line);
  if (bracketed !== null) {
    return bracketed[1];
  }
  const bare = /\b((?:INSTALL|INSTALL_PARSE)_FAILED_[A-Z0-9_]+)\b/.exec(line);
  return bare?.[1];
}

export function readUninstallFailureCode(line: string): string | undefined {
  const bracketed = /\[((?:DELETE|INSTALL|INSTALL_PARSE)_FAILED_[A-Z0-9_]+)[^\]]*]/.exec(line);
  if (bracketed !== null) {
    return bracketed[1];
  }
  const bare = /\b((?:DELETE|INSTALL|INSTALL_PARSE)_FAILED_[A-Z0-9_]+)\b/.exec(line);
  return bare?.[1];
}

export function isPmPermissionFailureLine(line: string): boolean {
  return (
    /^Failure\b/i.test(line) ||
    /^Exception\b/i.test(line) ||
    /^Error:\s+(Unknown|Bad|Invalid|No|Cannot|Can not|Can't|Operation|Permission|Package|User)\b/i.test(line) ||
    /^java\.[A-Za-z0-9_.]*Exception\b/i.test(line) ||
    /\bSecurityException\b/.test(line) ||
    /\bIllegalArgumentException\b/.test(line) ||
    /\bUnknown permission\b/i.test(line) ||
    /\bUnknown package\b/i.test(line) ||
    /\bUnknown user\b/i.test(line) ||
    /\bnot a changeable permission type\b/i.test(line) ||
    /\bdoes not request permission\b/i.test(line) ||
    /\bhas not requested permission\b/i.test(line) ||
    /\bwas not requested by package\b/i.test(line) ||
    /\bCannot grant runtime permission\b/i.test(line) ||
    /\bPackage .* has not requested\b/i.test(line)
  );
}

export function emptyDumpsysPermissionEntry(): DumpsysPermissionEntry {
  return { present: false, granted: null, flags: [] };
}

export function hasDumpsysPackageBlock(output: string): boolean {
  return /^Package \[[^\]]+\]/m.test(output) || /\brequested permissions:/.test(output);
}

export function isDumpsysPackageMissing(output: string): boolean {
  return /\b(unable to find package|unknown package|package .* not found|not installed for)\b/i.test(output);
}

export function parseDumpsysPackageFailure(output: string): string | undefined {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^(error:|failure\b|exception\b|java\.)/i.test(line) || isDumpsysPackageMissing(line));
}

export function parseTargetSdk(line: string): number | null {
  const match = /\btargetSdk(?:Version)?=(\d+)\b/.exec(line);
  if (match === null) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isSafeInteger(value) ? value : null;
}

export function parseRequestedPermissionName(line: string): string | null {
  const match = /^([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+)(?:\b|:)/.exec(line);
  return match?.[1] ?? null;
}

export function parseDumpsysPermissionEntry(line: string, permissionName: string): DumpsysPermissionEntry | null {
  if (!line.startsWith(`${permissionName}:`)) {
    return null;
  }
  const grantedMatch = /\bgranted=(true|false)\b/.exec(line);
  return {
    present: true,
    granted: grantedMatch === null ? null : grantedMatch[1] === "true",
    flags: parseDumpsysPermissionFlags(line)
  };
}

export function parseDumpsysPermissionFlags(line: string): string[] {
  const flagsMatch = /\bflags=\[([^\]]*)\]/.exec(line);
  if (flagsMatch === null) {
    return [];
  }
  return (flagsMatch[1] ?? "")
    .split(/[|,\s]+/)
    .map((flag) => flag.trim())
    .filter((flag) => flag.length > 0);
}

export function assignPermissionEntry(target: DumpsysPermissionEntry, parsed: DumpsysPermissionEntry | null): void {
  if (parsed === null) {
    return;
  }
  target.present = parsed.present;
  target.granted = parsed.granted;
  target.flags = parsed.flags;
}

export function resolvePermissionDumpState(input: {
  packageFound: boolean;
  manifestRequested: boolean;
  install: DumpsysPermissionEntry;
  runtime: DumpsysPermissionEntry & { userPresent: boolean };
  availableUserIds: readonly number[];
}): Pick<ParsedDumpsysPackagePermission, "state" | "granted" | "source"> {
  if (!input.packageFound) {
    return { state: "unknown", granted: null, source: "package_absent" };
  }
  if (input.runtime.present && input.runtime.granted !== null) {
    return {
      state: input.runtime.granted ? "granted" : "denied",
      granted: input.runtime.granted,
      source: "runtime"
    };
  }
  if (input.install.present && input.install.granted !== null) {
    return {
      state: input.install.granted ? "granted" : "denied",
      granted: input.install.granted,
      source: "install"
    };
  }
  if (input.manifestRequested && input.availableUserIds.length > 0 && !input.runtime.userPresent) {
    return { state: "unknown", granted: null, source: "unresolved_user" };
  }
  if (input.manifestRequested) {
    return { state: "denied", granted: false, source: "manifest_initial" };
  }
  if (!input.install.present && !input.runtime.present) {
    return { state: "not_requested", granted: false, source: "not_requested" };
  }
  return { state: "unknown", granted: null, source: "unknown" };
}

export function readFirstMatch(output: string, pattern: RegExp): string | null {
  return pattern.exec(output)?.[1] ?? null;
}

export function readBooleanField(output: string, fieldName: string): boolean | null {
  const pattern = new RegExp(`\\b${escapeRegExp(fieldName)}=(true|false)\\b`);
  const match = pattern.exec(output);
  return match === null ? null : match[1] === "true";
}

export function readAnyBooleanField(output: string, fieldNames: readonly string[]): boolean | null {
  let sawFalse = false;
  for (const fieldName of fieldNames) {
    const value = readBooleanField(output, fieldName);
    if (value === true) {
      return true;
    }
    if (value === false) {
      sawFalse = true;
    }
  }
  return sawFalse ? false : null;
}

export function parsePmListPackagesFailure(output: string): string | undefined {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^(error:|unknown option:|failure\b|exception\b)/i.test(line));
}

export function isPidofUnavailable(output: string): boolean {
  const lower = output.toLowerCase();
  return (
    lower.includes("pidof: not found") ||
    lower.includes("pidof: inaccessible or not found") ||
    lower.includes("pidof: permission denied")
  );
}

export function isLogcatUnavailable(output: string): boolean {
  const lower = output.toLowerCase();
  return (
    lower.includes("logcat: not found") ||
    lower.includes("logcat: inaccessible or not found") ||
    lower.includes("permission denied") ||
    lower.includes("read_logs") ||
    (/unknown option|unrecognized option|invalid option|illegal option/.test(lower) && lower.includes("pid")) ||
    (/unknown option|unrecognized option|invalid option|illegal option/.test(lower) && lower.includes("-b"))
  );
}

export function parseLogcatFailure(output: string): string | undefined {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /logcat|unknown option|unrecognized option|invalid option|illegal option|permission denied|read_logs/i.test(line));
}

export function throwIfAdbTargetFailure(output: string, exitCode: number | null, args: readonly string[]): void {
  if (exitCode === 0) {
    return;
  }
  const targetFailure = adbTargetFailureError(output, { args, exit_code: exitCode });
  if (targetFailure) {
    throw targetFailure;
  }
}

export { hasAdbOfflineFailure, hasAdbUnauthorizedFailure } from "./adb-target-failure.js";

export function redactUrlFromText(value: string, url: string): string {
  const quotedUrl = quoteForDeviceShell(url);
  return value.replaceAll(quotedUrl, "<redacted-url>").replaceAll(url, "<redacted-url>");
}

export function redactUrlArgs(args: readonly string[], url: string): string[] {
  const quotedUrl = quoteForDeviceShell(url);
  return args.map((arg) => (arg === url || arg === quotedUrl ? "<redacted-url>" : arg));
}

export function redactUrlFromAutophoneError(error: AutophoneError, url: string): AutophoneError {
  return new AutophoneError({
    code: error.code,
    message: redactUrlFromText(error.message, url),
    retriable: error.retriable,
    details: redactUrlInValue(error.details, url) as Record<string, unknown> | undefined
  });
}

export function redactPathFromText(value: string, path: string): string {
  return value.replaceAll(path, "<apk-path>");
}

export function redactPathFromAutophoneError(error: AutophoneError, path: string): AutophoneError {
  return new AutophoneError({
    code: error.code,
    message: redactPathFromText(error.message, path),
    retriable: error.retriable,
    details: redactPathInValue(error.details, path) as Record<string, unknown> | undefined
  });
}

export function redactPathInValue(value: unknown, path: string): unknown {
  if (typeof value === "string") {
    return redactPathFromText(value, path);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactPathInValue(item, path));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, redactPathInValue(entry, path)])
    );
  }
  return value;
}

export function redactUrlInValue(value: unknown, url: string): unknown {
  if (typeof value === "string") {
    return redactUrlFromText(value, url);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactUrlInValue(item, url));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, redactUrlInValue(entry, url)])
    );
  }
  return value;
}

export function describeUrlForLog(url: string): Record<string, unknown> {
  const parsed = new URL(url);
  return {
    scheme: parsed.protocol === "https:" ? "https" : "http",
    hostname: parsed.hostname,
    port: parsed.port.length === 0 ? null : parsed.port,
    path_present: parsed.pathname !== "/",
    query_present: parsed.search.length > 0,
    fragment_present: parsed.hash.length > 0,
    url_length: url.length
  };
}
