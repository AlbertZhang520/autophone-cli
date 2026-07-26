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
import {
  assignPermissionEntry,
  emptyDumpsysPermissionEntry,
  hasDumpsysPackageBlock,
  isDumpsysPackageMissing,
  isPmPermissionFailureLine,
  parseDumpsysPermissionEntry,
  parseRequestedPermissionName,
  parseTargetSdk,
  readInstallFailureCode,
  readUninstallFailureCode,
  resolvePermissionDumpState
} from "./adb-driver-parsers-app.js";
import {
  isInstalledPackageName,
  parseAdbDeviceLongLine,
  readAnyBooleanField,
  readBooleanField,
  readFirstMatch
} from "./adb-driver-parser-shared.js";

export { quoteForDeviceShell } from "./device-shell.js";
export { parseBatteryDetails } from "./device-battery.js";

export type AdbDevice = {
  serial: string;
  state: string;
};

export type AdbDeviceLong = AdbDevice & {
  details: Record<string, string>;
};

export function parseAdbDevices(stdout: string): AdbDevice[] {
  return stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [serial, state = "unknown"] = line.split(/\s+/);
      return { serial: serial ?? "", state };
    })
    .filter((device) => device.serial.length > 0);
}

export function parseAdbDevicesLong(stdout: string): AdbDeviceLong[] {
  const devices: AdbDeviceLong[] = [];
  let inDeviceTable = false;

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("*")) {
      continue;
    }
    if (line === "List of devices attached") {
      inDeviceTable = true;
      continue;
    }
    if (!inDeviceTable) {
      continue;
    }

    const parsed = parseAdbDeviceLongLine(line);
    if (parsed !== null) {
      devices.push(parsed);
    }
  }

  return devices;
}

export type PmListUser = {
  id: number;
  name: string;
  flagsHex: string;
  running: boolean;
};

export type PmListUsersOutput = {
  users: PmListUser[];
  failure?: string | undefined;
  unexpectedLines: string[];
};

export type CurrentUserOutput = {
  userId?: number | undefined;
  failure?: string | undefined;
  unexpectedLines: string[];
};

export function parseCurrentUserOutput(stdout: string, stderr: string): CurrentUserOutput {
  const stderrLines = stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (stderrLines.length > 0) {
    return {
      failure: stderrLines[0],
      unexpectedLines: stderrLines
    };
  }

  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return {
      failure: "cmd activity get-current-user returned empty output",
      unexpectedLines: []
    };
  }
  if (lines.length > 1) {
    return {
      failure: "cmd activity get-current-user returned multiple output lines",
      unexpectedLines: lines
    };
  }

  const [line] = lines;
  if (line === undefined || !/^(0|[1-9]\d*)$/.test(line)) {
    return {
      failure: line ?? "cmd activity get-current-user returned empty output",
      unexpectedLines: line === undefined ? [] : [line]
    };
  }

  const userId = Number(line);
  if (!Number.isSafeInteger(userId) || userId > 2_147_483_647) {
    return {
      failure: line,
      unexpectedLines: [line]
    };
  }

  return {
    userId,
    unexpectedLines: []
  };
}

export function parsePmListUsersOutput(stdout: string, stderr: string): PmListUsersOutput {
  const users: PmListUser[] = [];
  const unexpectedLines: string[] = [];
  const seenIds = new Set<number>();
  let sawHeader = false;

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0) {
      continue;
    }
    if (!sawHeader) {
      if (line === "Users:") {
        sawHeader = true;
      } else {
        unexpectedLines.push(line);
      }
      continue;
    }

    const parsed = parsePmListUserLine(line);
    if (parsed === null) {
      unexpectedLines.push(line);
      continue;
    }
    if (seenIds.has(parsed.id)) {
      unexpectedLines.push(line);
      continue;
    }
    seenIds.add(parsed.id);
    users.push(parsed);
  }

  if (!sawHeader) {
    unexpectedLines.unshift("missing Users: header");
  }

  const stderrLine = stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => !isBenignAdbStderrLine(line))
    .find((line) => line.length > 0);
  const failure = stderrLine ?? unexpectedLines.find((line) => /^(error:|failure\b|exception\b|java\.|invalid option:)/i.test(line));

  return { users, failure, unexpectedLines };
}

export function parsePmListUserLine(line: string): PmListUser | null {
  const match = /^UserInfo\{(\d+):(.*):([0-9a-fA-F]+)\}(?:\s+(running))?$/.exec(line);
  if (match === null) {
    return null;
  }
  const id = Number(match[1]);
  if (!Number.isSafeInteger(id) || id < 0 || id > 2_147_483_647) {
    return null;
  }
  const name = match[2] ?? "";
  if (name.length > 256) {
    return null;
  }
  return {
    id,
    name,
    flagsHex: (match[3] ?? "").toLowerCase(),
    running: match[4] === "running"
  };
}

export function isBenignAdbStderrLine(line: string): boolean {
  return /^\* daemon (not running; starting now|started successfully) \*$/.test(line);
}

export function parsePmListPackagesOutput(stdout: string): string[] {
  const packages: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("package:")) {
      continue;
    }
    const packageName = line.slice("package:".length).trim();
    if (!isInstalledPackageName(packageName) || seen.has(packageName)) {
      continue;
    }
    seen.add(packageName);
    packages.push(packageName);
  }

  return packages;
}

export function parsePmClearOutput(stdout: string, stderr: string): { succeeded: boolean; reason?: string | undefined } {
  if (stdout.trim() === "Success") {
    return { succeeded: true };
  }
  const reason = [...stderr.split(/\r?\n/), ...stdout.split(/\r?\n/)]
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return {
    succeeded: false,
    reason: reason ?? "pm clear did not return Success"
  };
}

export type PmPathOutput = {
  paths: string[];
  failure?: string | undefined;
  unexpectedLines: string[];
};

export function parsePmPathOutput(stdout: string, stderr: string): PmPathOutput {
  const paths: string[] = [];
  const unexpectedLines: string[] = [];

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0) {
      continue;
    }
    if (line.startsWith("package:")) {
      const path = line.slice("package:".length).trim();
      if (path.length > 0) {
        paths.push(path);
      } else {
        unexpectedLines.push(line);
      }
      continue;
    }
    unexpectedLines.push(line);
  }

  const failure = `${stderr}\n${unexpectedLines.join("\n")}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^(error:|failure\b|exception\b|java\.)/i.test(line));

  return { paths, failure, unexpectedLines };
}

export type AdbInstallOutput = {
  succeeded: boolean;
  reason?: string | undefined;
  failureCode?: string | undefined;
};

export function parseAdbInstallOutput(stdout: string, stderr: string): AdbInstallOutput {
  const lines = `${stdout}\n${stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const failureLine = lines.find((line) => /^(adb:\s*)?failed to install\b|^failure\b|^error\b/i.test(line));
  if (failureLine !== undefined) {
    return {
      succeeded: false,
      reason: failureLine,
      failureCode: readInstallFailureCode(failureLine)
    };
  }

  if (lines.some((line) => /^success\b/i.test(line))) {
    return { succeeded: true };
  }

  return {
    succeeded: false,
    reason: lines.at(-1) ?? "adb install did not return Success"
  };
}

export type AdbUninstallOutput = {
  succeeded: boolean;
  reason?: string | undefined;
  failureCode?: string | undefined;
};

export function parseAdbUninstallOutput(stdout: string, stderr: string): AdbUninstallOutput {
  const lines = `${stdout}\n${stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const failureLine = lines.find((line) => /^(adb:\s*)?failed to uninstall\b|^failure\b|^error\b|^exception\b|^java\./i.test(line));
  if (failureLine !== undefined) {
    return {
      succeeded: false,
      reason: failureLine,
      failureCode: readUninstallFailureCode(failureLine)
    };
  }

  if (lines.some((line) => line === "Success")) {
    return { succeeded: true };
  }

  return {
    succeeded: false,
    reason: lines.at(-1) ?? "adb uninstall did not return Success"
  };
}

export type PmPermissionOutput = {
  failure?: string | undefined;
};

export function parsePmPermissionOutput(stdout: string, stderr: string): PmPermissionOutput {
  const lines = `${stderr}\n${stdout}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const failureLine = lines.find(isPmPermissionFailureLine);
  return failureLine === undefined ? {} : { failure: failureLine };
}

export type DumpsysPermissionEntry = {
  present: boolean;
  granted: boolean | null;
  flags: string[];
};

export type ParsedDumpsysPackagePermission = Omit<
  DriverAppPermissionInspectResult,
  "serial" | "exitCode" | "durationMs"
>;

export function parseDumpsysPackagePermission(
  stdout: string,
  permissionName: string,
  selectedUserId: number
): ParsedDumpsysPackagePermission {
  const packageFound = hasDumpsysPackageBlock(stdout) && !isDumpsysPackageMissing(stdout);
  const availableUserIds: number[] = [];
  const install = emptyDumpsysPermissionEntry();
  const runtime = {
    ...emptyDumpsysPermissionEntry(),
    selectedUserId,
    userPresent: false
  };
  let manifestRequested = false;
  let targetSdk: number | null = null;
  let section: "requested" | "install" | "runtime" | null = null;
  let currentUserId: number | null = null;

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0) {
      continue;
    }

    targetSdk ??= parseTargetSdk(line);

    const userMatch = /^User\s+(\d+):(?:\s|$)/.exec(line);
    if (userMatch !== null) {
      currentUserId = Number(userMatch[1]);
      if (Number.isSafeInteger(currentUserId) && !availableUserIds.includes(currentUserId)) {
        availableUserIds.push(currentUserId);
      }
      section = null;
      continue;
    }

    if (line === "requested permissions:") {
      section = "requested";
      continue;
    }
    if (line === "install permissions:") {
      section = "install";
      continue;
    }
    if (line === "runtime permissions:") {
      section = currentUserId === null ? null : "runtime";
      continue;
    }

    if (section === "requested") {
      manifestRequested = manifestRequested || parseRequestedPermissionName(line) === permissionName;
      continue;
    }

    if (section === "install") {
      assignPermissionEntry(install, parseDumpsysPermissionEntry(line, permissionName));
      continue;
    }

    if (section === "runtime" && currentUserId === selectedUserId) {
      runtime.userPresent = true;
      assignPermissionEntry(runtime, parseDumpsysPermissionEntry(line, permissionName));
    }
  }

  if (availableUserIds.includes(selectedUserId)) {
    runtime.userPresent = true;
  }

  const resolved = resolvePermissionDumpState({
    packageFound,
    manifestRequested,
    install,
    runtime,
    availableUserIds
  });

  return {
    packageFound,
    targetSdk,
    manifestRequested,
    availableUserIds,
    install,
    runtime,
    state: resolved.state,
    granted: resolved.granted,
    source: resolved.source
  };
}

export function parsePidofOutput(stdout: string): { pids: number[]; invalid: string[] } {
  const pids: number[] = [];
  const invalid: string[] = [];
  const seen = new Set<number>();

  for (const token of stdout.trim().split(/\s+/)) {
    if (token.length === 0) {
      continue;
    }
    if (!/^[1-9]\d*$/.test(token)) {
      invalid.push(token);
      continue;
    }
    const pid = Number(token);
    if (!Number.isSafeInteger(pid)) {
      invalid.push(token);
      continue;
    }
    if (!seen.has(pid)) {
      seen.add(pid);
      pids.push(pid);
    }
  }

  return { pids, invalid };
}

export function parseLogcatLines(stdout: string): string[] {
  const lines = stdout.replace(/\r\n/g, "\n").split("\n");
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines.filter((line) => !line.startsWith("--------- "));
}

export function parseDeviceReadyState(serial: string, powerOutput: string, windowOutput: string): DeviceReadyState {
  const wakefulness = readFirstMatch(powerOutput, /\bmWakefulness=([A-Za-z_]+)/);
  const interactive = readBooleanField(powerOutput, "mInteractive");
  const displayPowerState = readFirstMatch(powerOutput, /\bDisplay Power: state=([A-Z_]+)/);
  const fallbackAwake = displayPowerState === null ? null : displayPowerState === "ON";

  const strongKeyguardShowing = readAnyBooleanField(windowOutput, [
    "mShowingLockscreen",
    "mKeyguardShowing",
    "isKeyguardShowing",
    "isStatusBarKeyguard"
  ]);

  return {
    device_serial: serial,
    awake: wakefulness === null ? fallbackAwake : wakefulness === "Awake",
    interactive,
    wakefulness,
    display_power_state: displayPowerState,
    keyguard_showing: strongKeyguardShowing ?? readBooleanField(windowOutput, "mDreamingLockscreen"),
    keyguard_secure: readAnyBooleanField(windowOutput, ["mKeyguardSecure", "isKeyguardSecure"])
  };
}

export type ParsedSettingsBoolean =
  | { value: boolean | null; failure?: undefined }
  | { value?: undefined; failure: string };

export function parseSettingsBoolean(stdout: string, stderr: string, key: string): ParsedSettingsBoolean {
  if (stderr.trim().length > 0) {
    return { failure: `settings global ${key} wrote unexpected stderr` };
  }

  const value = stdout.trim();
  if (value === "1") {
    return { value: true };
  }
  if (value === "0") {
    return { value: false };
  }
  if (value === "" || value === "null") {
    return { value: null };
  }

  return { failure: `settings global ${key} returned unexpected boolean value` };
}
