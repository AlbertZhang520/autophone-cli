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
import type { SharedAdbDeviceLong as AdbDeviceLong } from "./adb-driver-parser-shared.js";
import { readFirstMatch } from "./adb-driver-parser-shared.js";

export { quoteForDeviceShell } from "./device-shell.js";
export { parseBatteryDetails } from "./device-battery.js";

export function isInstalledPackageName(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*$/.test(value);
}

export function parseAdbDeviceLongLine(line: string): AdbDeviceLong | null {
  const [serial, ...rest] = line.split(/\s+/);
  if (serial === undefined || serial.length === 0 || rest.length === 0) {
    return null;
  }

  const firstDetailIndex = rest.findIndex(isAdbLongDetailToken);
  const stateTokens = firstDetailIndex === -1 ? rest : rest.slice(0, firstDetailIndex);
  const detailTokens = firstDetailIndex === -1 ? [] : rest.slice(firstDetailIndex);
  const state = stateTokens.join(" ").trim() || "unknown";
  const details: Record<string, string> = {};

  for (const token of detailTokens) {
    const separatorIndex = token.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }
    details[token.slice(0, separatorIndex)] = token.slice(separatorIndex + 1);
  }

  return { serial, state, details };
}

export function isAdbLongDetailToken(token: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*:/.test(token) && !/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(token);
}

export const PRODUCT_PROPERTY_SOURCES = ["", "system.", "vendor.", "odm.", "product."] as const;

export const DEVICE_DETAILS_PROPERTY_KEYS = [
  "ro.build.version.release",
  "ro.build.version.sdk",
  "ro.build.version.codename",
  "ro.product.cpu.abilist",
  "ro.product.cpu.abilist32",
  "ro.product.cpu.abilist64",
  ...PRODUCT_PROPERTY_SOURCES.flatMap((source) => [
    `ro.product.${source}manufacturer`,
    `ro.product.${source}brand`,
    `ro.product.${source}model`,
    `ro.product.${source}name`,
    `ro.product.${source}device`
  ])
] as const;

export function parseGetpropOutput(stdout: string): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^\[([^\]]+)]\s*:\s*\[(.*)]$/);
    if (match === null) {
      continue;
    }
    properties[match[1]!] = match[2] ?? "";
  }
  return properties;
}

export function selectDeviceDetailsProperties(properties: Record<string, string>): Record<string, string> {
  const selected: Record<string, string> = {};
  for (const key of DEVICE_DETAILS_PROPERTY_KEYS) {
    const value = properties[key];
    if (value !== undefined && value.length > 0) {
      selected[key] = value;
    }
  }
  return selected;
}

export function buildProductPropertyKeys(name: "manufacturer" | "brand" | "model" | "name" | "device"): string[] {
  return PRODUCT_PROPERTY_SOURCES.map((source) => `ro.product.${source}${name}`);
}

export function readProductProperty(properties: Record<string, string>, name: "manufacturer" | "brand" | "model" | "device"): string | null {
  return readFirstProperty(properties, buildProductPropertyKeys(name));
}

export function readFirstProperty(properties: Record<string, string>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = properties[key];
    if (value !== undefined && value.length > 0) {
      return value;
    }
  }
  return null;
}

export function readSupportedAbis(properties: Record<string, string>): string[] {
  const allAbis = readFirstProperty(properties, ["ro.product.cpu.abilist"]);
  if (allAbis !== null) {
    return uniqueStrings(splitAbiList(allAbis));
  }
  return uniqueStrings([
    ...splitAbiList(properties["ro.product.cpu.abilist64"] ?? ""),
    ...splitAbiList(properties["ro.product.cpu.abilist32"] ?? "")
  ]);
}

export function splitAbiList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function parseInteger(value: string | null): number | null {
  if (value === null || !/^-?\d+$/.test(value)) {
    return null;
  }
  return Number(value);
}

export function parseWindowSizeDetails(stdout: string): Pick<DeviceDetailsResult["display"], "physical_size" | "override_size"> {
  return {
    physical_size: parseSizeField(stdout, "Physical size"),
    override_size: parseSizeField(stdout, "Override size")
  };
}

export function parseWindowDensityDetails(
  stdout: string
): Pick<DeviceDetailsResult["display"], "physical_density" | "override_density"> {
  return {
    physical_density: parseDensityField(stdout, "Physical density"),
    override_density: parseDensityField(stdout, "Override density")
  };
}

export function parseSizeField(stdout: string, label: string): [number, number] | null {
  const match = stdout.match(new RegExp(`${escapeRegExp(label)}:\\s*(\\d+)x(\\d+)`));
  if (match === null) {
    return null;
  }
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 0 && height > 0 ? [width, height] : null;
}

export function parseDensityField(stdout: string, label: string): number | null {
  const match = stdout.match(new RegExp(`${escapeRegExp(label)}:\\s*(\\d+)`));
  if (match === null) {
    return null;
  }
  const density = Number(match[1]);
  return density > 0 ? density : null;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseWindowSize(stdout: string): [number, number] | null {
  const match = stdout.match(/Physical size:\s*(\d+)x(\d+)/);
  if (match === null) {
    return null;
  }
  return [Number(match[1]), Number(match[2])];
}

export function parseRotationDegrees(stdout: string): ParsedWindowInfo["rotationDegrees"] {
  const named = readFirstMatch(stdout, /\bmCurrentRotation=ROTATION_(0|90|180|270)\b/);
  if (named !== null) {
    return parseRotationNamedValue(named);
  }

  const displayFrames = readFirstMatch(stdout, /\bDisplayFrames\s+w=\d+\s+h=\d+\s+r=([0-3])\b/);
  if (displayFrames !== null) {
    return parseRotationQuarterTurns(displayFrames);
  }

  const displayContent = readFirstMatch(stdout, /\bmDisplayContent=Display\{[^\n}]*\bROTATION_(0|90|180|270)\b/);
  if (displayContent !== null) {
    return parseRotationNamedValue(displayContent);
  }

  const numeric = readFirstMatch(stdout, /\bmRotation=([0-3])\b/);
  if (numeric !== null) {
    return parseRotationQuarterTurns(numeric);
  }

  return null;
}

export function parseAutoRotate(stdout: string): boolean | null {
  const value = stdout.trim();
  if (value === "1") {
    return true;
  }
  if (value === "0") {
    return false;
  }
  return null;
}

export function parseUserRotationPolicy(stdout: string): Pick<DriverUserRotationPolicy, "mode" | "rotationDegrees"> | null {
  const line = stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value.length > 0);
  if (line === undefined) {
    return null;
  }
  if (line === "free") {
    return { mode: "free", rotationDegrees: null };
  }
  const lock = /^lock\s+([0-3])$/.exec(line);
  if (lock !== null) {
    return { mode: "lock", rotationDegrees: parseRotationQuarterTurns(lock[1]!) };
  }
  return null;
}

export function extractStatusBarFailureText(output: string): string | undefined {
  const message = output.trim();
  return message.length > 0 ? message : undefined;
}

export function parseStatusBarIconsOutput(
  stdout: string,
  stderr: string
): { icons: string[]; failure?: string | undefined; invalidLines: string[] } {
  const stderrText = stderr.trim();
  if (stderrText.length > 0) {
    return { icons: [], failure: stderrText, invalidLines: [] };
  }

  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const invalidLines = lines.filter((line) => !isStatusBarIconSlot(line));
  const failureLine = lines.find((line) => isStatusBarIconsFailureLine(line));
  if (failureLine !== undefined) {
    return { icons: [], failure: failureLine, invalidLines: [failureLine] };
  }
  if (invalidLines.length > 0) {
    return { icons: [], failure: "cmd statusbar get-status-icons returned malformed icon slot lines", invalidLines };
  }

  return { icons: lines, invalidLines: [] };
}

export function isStatusBarIconSlot(line: string): boolean {
  return line.length <= 128 && /^[A-Za-z0-9_.-]+$/.test(line);
}

export function isStatusBarIconsFailureLine(line: string): boolean {
  return /^(?:(?:usage|help|error|failure|exception)(?::|\s|$)|unknown command(?::|\s|$))/i.test(line);
}

export function parseMediaSessionVolumeGetOutput(
  stdout: string,
  stderr: string,
  expectedStream: DriverVolumeGetRequest["stream"]
):
  | { volume: DriverVolumeGetResult["volume"]; failure?: undefined }
  | { volume?: undefined; failure: string } {
  const stderrText = stderr.trim();
  if (stderrText.length > 0) {
    return { failure: stderrText };
  }

  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const failureLine = lines.find((line) => isMediaSessionVolumeFailureLine(line));
  if (failureLine !== undefined) {
    return { failure: failureLine };
  }

  const controlLines = lines
    .map((line) => line.match(/^\[V\]\s+will control stream=(\d+) \((STREAM_[A-Z_]+)\)$/))
    .filter((match): match is RegExpMatchArray => match !== null);
  if (controlLines.length !== 1) {
    return { failure: "cmd media_session volume output did not contain exactly one stream control line" };
  }
  const streamId = Number.parseInt(controlLines[0]![1]!, 10);
  const streamName = controlLines[0]![2]!;
  if (streamId !== expectedStream.androidStreamId || streamName !== expectedStream.androidStreamName) {
    return { failure: "cmd media_session volume output controlled a different stream than requested" };
  }

  const volumeLines = lines
    .map((line) => line.match(/^\[V\]\s+volume is (\d+) in range \[(\d+)\.\.(\d+)\]$/))
    .filter((match): match is RegExpMatchArray => match !== null);
  if (volumeLines.length !== 1) {
    return { failure: "cmd media_session volume output did not contain exactly one volume range line" };
  }

  const index = Number.parseInt(volumeLines[0]![1]!, 10);
  const min = Number.parseInt(volumeLines[0]![2]!, 10);
  const max = Number.parseInt(volumeLines[0]![3]!, 10);
  if (min > max || index < min || index > max) {
    return { failure: "cmd media_session volume output reported an out-of-range volume index" };
  }

  const unexpectedLine = lines.find(
    (line) =>
      !/^\[V\]\s+will control stream=\d+ \(STREAM_[A-Z_]+\)$/.test(line) &&
      !/^\[V\]\s+volume is \d+ in range \[\d+\.\.\d+\]$/.test(line) &&
      line !== "[V] will get volume" &&
      line !== "[V] Connecting to AudioService"
  );
  if (unexpectedLine !== undefined) {
    return { failure: `cmd media_session volume output contained unexpected text: ${unexpectedLine}` };
  }

  return {
    volume: {
      index,
      min,
      max
    }
  };
}

export function isMediaSessionVolumeFailureLine(line: string): boolean {
  return /^(usage:|help(?::|\s|$)|error(?::|\s|$)|failure(?::|\s|$)|exception(?::|\s|$)|unknown command(?::|\s|$)|can't find service(?::|\s|$)|no shell command implementation\.?$|java\.)/i.test(
    line
  );
}

export function parseDumpsysAudioRingerState(
  stdout: string,
  stderr: string
):
  | {
      ringer: DriverRingerGetResult["ringer"];
      zen: DriverRingerGetResult["zen"];
      affectedStreams: DriverRingerGetResult["affectedStreams"];
      mutedStreams: DriverRingerGetResult["mutedStreams"];
      failure?: undefined;
    }
  | { failure: string } {
  const stderrText = stderr.trim();
  if (stderrText.length > 0) {
    return { failure: stderrText };
  }

  const lines = stdout.split(/\r?\n/).map((line) => line.trim());
  const headerIndexes = lines.flatMap((line, index) => (/^Ringer mode:\s*$/.test(line) ? [index] : []));
  if (headerIndexes.length !== 1) {
    return { failure: "dumpsys audio output did not contain exactly one Ringer mode section" };
  }

  const block = collectDumpsysAudioRingerBlock(lines, headerIndexes[0]!);
  const internal = parseSingleRingerModeLine(block, "internal");
  const external = parseSingleRingerModeLine(block, "external");
  const zen = parseSingleZenModeLine(block);
  const affectedStreams = parseSingleRingerStreamMaskLine(block, "affected");
  const mutedStreams = parseSingleRingerStreamMaskLine(block, "muted");
  if ("failure" in internal) {
    return internal;
  }
  if ("failure" in external) {
    return external;
  }
  if ("failure" in zen) {
    return zen;
  }
  if ("failure" in affectedStreams) {
    return affectedStreams;
  }
  if ("failure" in mutedStreams) {
    return mutedStreams;
  }

  return {
    ringer: {
      internal: internal.value,
      external: external.value
    },
    zen: zen.value,
    affectedStreams: affectedStreams.value,
    mutedStreams: mutedStreams.value
  };
}

export function collectDumpsysAudioRingerBlock(lines: string[], headerIndex: number): string[] {
  const block: string[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (/^[A-Za-z][A-Za-z ]+:\s*$/.test(line)) {
      break;
    }
    if (line.length > 0) {
      block.push(line);
    }
  }
  return block;
}

export function parseSingleRingerModeLine(
  block: string[],
  kind: "internal" | "external"
): { value: DriverRingerGetResult["ringer"]["internal"] } | { failure: string } {
  const regex = new RegExp(`^-\\s*mode \\(${kind}\\)\\s*=\\s*([A-Z0-9_]+)$`);
  const values = block.flatMap((line) => {
    const match = line.match(regex);
    return match === null ? [] : [match[1]!];
  });
  if (values.length !== 1) {
    return { failure: `dumpsys audio Ringer mode section did not contain exactly one ${kind} ringer mode line` };
  }
  return { value: { mode: mapRingerMode(values[0]!), raw: values[0]! } };
}

export function parseSingleZenModeLine(
  block: string[]
): { value: DriverRingerGetResult["zen"] } | { failure: string } {
  const values = block.flatMap((line) => {
    const match = line.match(/^-\s*zen mode\s*:\s*([A-Z0-9_]+)$/);
    return match === null ? [] : [match[1]!];
  });
  if (values.length !== 1) {
    if (values.length === 0) {
      return { value: { mode: "unknown", raw: null, source: "not_reported" } };
    }
    return { failure: "dumpsys audio Ringer mode section contained more than one zen mode line" };
  }
  return { value: { mode: mapZenMode(values[0]!), raw: values[0]!, source: "dumpsys_audio_ringer_section" } };
}

export function parseSingleRingerStreamMaskLine(
  block: string[],
  kind: "affected" | "muted"
): { value: DriverRingerGetResult["affectedStreams"] } | { failure: string } {
  const regex = new RegExp(`^-\\s*ringer mode ${kind} streams\\s*=\\s*(0x[0-9a-fA-F]+)(?:\\s*\\(([^)]*)\\))?$`);
  const values = block.flatMap((line) => {
    const match = line.match(regex);
    return match === null ? [] : [{ maskHex: match[1]!, streamsText: match[2] }];
  });
  if (values.length !== 1) {
    return { failure: `dumpsys audio Ringer mode section did not contain exactly one ${kind} streams line` };
  }
  const tokens = parseAudioServiceStreamTokens(values[0]!.maskHex, values[0]!.streamsText);
  if ("failure" in tokens) {
    return tokens;
  }
  return { value: { mask_hex: values[0]!.maskHex.toLowerCase(), ...tokens.value } };
}

export function parseAudioServiceStreamTokens(
  maskHex: string,
  streamsText: string | undefined
): { value: { streams: string[]; residual_tokens: string[] } } | { failure: string } {
  if (streamsText === undefined) {
    if (maskHex.toLowerCase() === "0x0") {
      return { value: { streams: [], residual_tokens: [] } };
    }
    return { failure: "dumpsys audio stream mask line omitted stream tokens for a nonzero mask" };
  }
  const tokens = streamsText
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  const streams: string[] = [];
  const residualTokens: string[] = [];
  for (const token of tokens) {
    if (/^STREAM_[A-Z0-9_]{1,121}$/.test(token)) {
      streams.push(token);
    } else if (/^[0-9]{1,32}$/.test(token)) {
      residualTokens.push(token);
    } else {
      return { failure: "dumpsys audio stream mask line contained malformed stream tokens" };
    }
  }
  if (tokens.length === 0 && maskHex.toLowerCase() !== "0x0") {
    return { failure: "dumpsys audio stream mask line contained malformed stream tokens" };
  }
  return { value: { streams, residual_tokens: residualTokens } };
}

export function mapRingerMode(raw: string): "silent" | "vibrate" | "normal" | "unknown" {
  switch (raw) {
    case "SILENT":
      return "silent";
    case "VIBRATE":
      return "vibrate";
    case "NORMAL":
      return "normal";
    default:
      return "unknown";
  }
}

export function mapZenMode(raw: string): "off" | "important_interruptions" | "no_interruptions" | "alarms" | "unknown" {
  switch (raw) {
    case "ZEN_MODE_OFF":
      return "off";
    case "ZEN_MODE_IMPORTANT_INTERRUPTIONS":
      return "important_interruptions";
    case "ZEN_MODE_NO_INTERRUPTIONS":
      return "no_interruptions";
    case "ZEN_MODE_ALARMS":
      return "alarms";
    default:
      return "unknown";
  }
}

export function truncateForErrorDetails(value: string, maxChars = 4000): string {
  return value.length <= maxChars ? value : `${value.slice(0, maxChars)}...[truncated ${value.length - maxChars} chars]`;
}

export function parseOrientation(stdout: string): ParsedWindowInfo["orientation"] {
  return orientationFromRotationDegrees(parseRotationDegrees(stdout));
}

export function orientationFromRotationDegrees(
  rotationDegrees: ParsedWindowInfo["rotationDegrees"],
  windowSize?: ParsedWindowInfo["windowSize"]
): ParsedWindowInfo["orientation"] {
  const naturalOrientation = orientationFromWindowSize(windowSize);
  if (naturalOrientation !== "unknown" && rotationDegrees !== null) {
    const rotatedQuarterTurn = rotationDegrees === 90 || rotationDegrees === 270;
    if (!rotatedQuarterTurn) {
      return naturalOrientation;
    }
    return naturalOrientation === "portrait" ? "landscape" : "portrait";
  }

  if (rotationDegrees === 90 || rotationDegrees === 270) {
    return "landscape";
  }
  if (rotationDegrees === 0 || rotationDegrees === 180) {
    return "portrait";
  }
  if (naturalOrientation !== "unknown") {
    return naturalOrientation;
  }
  return "unknown";
}

export function orientationFromWindowSize(windowSize: ParsedWindowInfo["windowSize"] | undefined): ParsedWindowInfo["orientation"] {
  if (windowSize === null || windowSize === undefined) {
    return "unknown";
  }
  const [width, height] = windowSize;
  if (width > height) {
    return "landscape";
  }
  if (height > width) {
    return "portrait";
  }
  return "unknown";
}

export function parseRotationNamedValue(value: string): ParsedWindowInfo["rotationDegrees"] {
  if (value === "0" || value === "90" || value === "180" || value === "270") {
    return Number(value) as 0 | 90 | 180 | 270;
  }
  return null;
}

export function parseRotationQuarterTurns(value: string): ParsedWindowInfo["rotationDegrees"] {
  if (value === "0") {
    return 0;
  }
  if (value === "1") {
    return 90;
  }
  if (value === "2") {
    return 180;
  }
  if (value === "3") {
    return 270;
  }
  return null;
}

export function rotationDegreesToQuarterTurn(rotationDegrees: DriverSetUserRotationRequest["rotationDegrees"]): 0 | 1 | 2 | 3 {
  if (rotationDegrees === 0) {
    return 0;
  }
  if (rotationDegrees === 90) {
    return 1;
  }
  if (rotationDegrees === 180) {
    return 2;
  }
  if (rotationDegrees === 270) {
    return 3;
  }
  throw new AutophoneError({
    code: "INVALID_REQUEST",
    message: "lock mode requires rotationDegrees 0, 90, 180, or 270",
    retriable: false
  });
}

export function parseWmUserRotationFailure(output: string): string | undefined {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) =>
      /^(error:|failure\b|exception\b|unknown command\b|usage:|window manager \(window\) commands:)/i.test(line)
    );
}

export function parseFocus(stdout: string): Pick<ParsedWindowInfo, "packageName" | "activity"> {
  const focusLines = stdout
    .split(/\r?\n/)
    .filter((line) => line.includes("mCurrentFocus") || line.includes("mFocusedApp"));

  for (const focusLine of focusLines) {
    const match = focusLine.match(/\s([A-Za-z0-9_.]+)\/([^\s}]+)/);
    if (match === null) {
      continue;
    }
    const packageName = match[1] ?? "";
    const activityPart = match[2] ?? "";
    const activity = activityPart.startsWith(".") ? `${packageName}${activityPart}` : activityPart;
    return { packageName, activity };
  }

  return { packageName: "", activity: "" };
}

export type AmStartOutput = {
  status?: string | undefined;
  activity?: string | undefined;
  error?: string | undefined;
};

export type MonkeyLaunchOutput = {
  failed: boolean;
  reason?: string | undefined;
};

export type AmForceStopOutput = {
  failed: boolean;
  reason?: string | undefined;
};

export function parseAmForceStopOutput(output: string): AmForceStopOutput {
  const lines = output
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const failure = lines.find((line) =>
    /^(error:|unknown option:|failed\b)|securityexception|permission denial|not allowed/i.test(line)
  );
  return failure === undefined ? { failed: false } : { failed: true, reason: failure };
}

export function parseMonkeyLaunchOutput(output: string): MonkeyLaunchOutput {
  const normalized = output.toLowerCase();
  if (normalized.includes("no activities found to run")) {
    return { failed: true, reason: "no launcher activity found for package" };
  }
  if (normalized.includes("monkey aborted")) {
    return { failed: true, reason: "monkey aborted before launch completed" };
  }
  if (normalized.includes("securityexception") || normalized.includes("permissions error starting activity")) {
    return { failed: true, reason: "permission denied starting launcher activity" };
  }
  if (normalized.includes("failed talking with package manager") || normalized.includes("failed talking with activity manager")) {
    return { failed: true, reason: "failed talking with Android system service" };
  }
  if (normalized.includes("error:")) {
    const line = output
      .split(/\r?\n/)
      .map((value) => value.trim())
      .find((value) => value.toLowerCase().includes("error:"));
    return { failed: true, reason: line ?? "monkey reported an error" };
  }
  return { failed: false };
}

export function parseAmStartOutput(output: string): AmStartOutput {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const status = readField(lines, "Status:");
  const activity = readField(lines, "Activity:");
  const explicitError =
    readField(lines, "Error:") ??
    lines.find((line) =>
      /unable to resolve|does not exist|securityexception|permission denial|not exported/i.test(line)
    );

  return {
    status,
    activity,
    error: explicitError
  };
}

export function readField(lines: readonly string[], prefix: string): string | undefined {
  const line = lines.find((candidate) => candidate.startsWith(prefix));
  return line?.slice(prefix.length).trim();
}
