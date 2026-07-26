import { InvalidArgumentError } from "commander";
import {
  AutophoneError,
  type DeviceAnimationScaleValue,
  type DeviceVolumeStream,
  type FileTransferCompression
} from "../contracts/index.js";

export function buildSelector(localOptions: Record<string, unknown>) {
  const selector = {
    text: optionalString(localOptions.text),
    resource_id: optionalString(localOptions.resourceId),
    content_desc: optionalString(localOptions.contentDesc),
    class_name: optionalString(localOptions.class)
  };

  return Object.values(selector).some((value) => value !== undefined) ? selector : undefined;
}

export function buildPrefixedSelector(localOptions: Record<string, unknown>, prefix: "from" | "to" | "within") {
  const selector = {
    text: optionalString(localOptions[`${prefix}Text`]),
    resource_id: optionalString(localOptions[`${prefix}ResourceId`]),
    content_desc: optionalString(localOptions[`${prefix}ContentDesc`]),
    class_name: optionalString(localOptions[`${prefix}Class`])
  };

  return Object.values(selector).some((value) => value !== undefined) ? selector : undefined;
}

export function defaultScreenrecordRecordTimeoutMs(durationSeconds: number): number {
  return durationSeconds * 1000 + 15_000;
}

export function parsePositiveInt(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError("must be a positive integer");
  }
  return parsed;
}

export function parseNonNegativeInt(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new InvalidArgumentError("must be a non-negative integer");
  }
  return parsed;
}

export function parseRotationDegreesOption(value: string): 0 | 90 | 180 | 270 {
  const parsed = Number(value);
  if (parsed === 0 || parsed === 90 || parsed === 180 || parsed === 270) {
    return parsed;
  }
  throw new InvalidArgumentError("must be 0, 90, 180, or 270");
}

export function parseOrientationSetMode(value: string): "auto" | "lock" {
  if (value === "auto" || value === "lock") {
    return value;
  }
  throw new InvalidArgumentError("must be auto or lock");
}

export function parseDeviceAnimationScaleOption(value: string): DeviceAnimationScaleValue {
  const normalized = value.trim();
  if (!/^(?:0(?:\.0+)?|0?\.5|1(?:\.0+)?)$/.test(normalized)) {
    throw new InvalidArgumentError("must be 0, 0.5, or 1");
  }
  const parsed = Number(normalized);
  if (parsed === 0 || parsed === 0.5 || parsed === 1) {
    return parsed;
  }
  throw new InvalidArgumentError("must be 0, 0.5, or 1");
}

export function parseDeviceVolumeStream(value: string): DeviceVolumeStream {
  switch (value) {
    case "voice-call":
    case "voice_call":
      return "voice_call";
    case "system":
    case "ring":
    case "music":
    case "alarm":
    case "notification":
      return value;
    default:
      throw new InvalidArgumentError("must be music, ring, alarm, notification, system, or voice-call");
  }
}

export function parseVerifyPolicy(value: string): "screen_changed" | "none" {
  if (value === "screen_changed" || value === "none") {
    return value;
  }
  throw new InvalidArgumentError("must be screen_changed or none");
}

export function parseDragGesture(value: string): "draganddrop" | "swipe" {
  if (value === "draganddrop" || value === "swipe") {
    return value;
  }
  throw new InvalidArgumentError("must be draganddrop or swipe");
}

export function parseAppVerifyPolicy(value: string): "package_foreground" | "none" {
  if (value === "package_foreground" || value === "none") {
    return value;
  }
  throw new InvalidArgumentError("must be package_foreground or none");
}

export function parseAppStopVerifyPolicy(value: string): "foreground_absent" | "none" {
  if (value === "foreground_absent" || value === "none") {
    return value;
  }
  throw new InvalidArgumentError("must be foreground_absent or none");
}

export function parseAppOpenUrlVerifyPolicy(value: string): "activity_manager_accepted" | "none" {
  if (value === "activity_manager_accepted" || value === "none") {
    return value;
  }
  throw new InvalidArgumentError("must be activity_manager_accepted or none");
}

export function parseAppActivitiesIntent(value: string): "launcher" {
  if (value === "launcher") {
    return value;
  }
  throw new InvalidArgumentError("must be launcher");
}

export function parseAppListScope(value: string): "all" | "third_party" | "system" {
  if (value === "all" || value === "system") {
    return value;
  }
  if (value === "third-party" || value === "third_party") {
    return "third_party";
  }
  throw new InvalidArgumentError("must be all, third-party, or system");
}

export function parseAppListState(value: string): "all" | "enabled" | "disabled" {
  if (value === "all" || value === "enabled" || value === "disabled") {
    return value;
  }
  throw new InvalidArgumentError("must be all, enabled, or disabled");
}

export function parseKeyVerifyPolicy(value: string): "screen_changed" | "none" {
  if (value === "screen_changed" || value === "none") {
    return value;
  }
  throw new InvalidArgumentError("must be screen_changed or none");
}

export function parseTextVerifyPolicy(value: string): "screen_changed" | "none" {
  if (value === "screen_changed" || value === "none") {
    return value;
  }
  throw new InvalidArgumentError("must be screen_changed or none");
}

export function parseFileTransferCompression(value: string): Exclude<FileTransferCompression, "adb_default" | "disabled"> {
  if (value === "any" || value === "none" || value === "brotli" || value === "lz4" || value === "zstd") {
    return value;
  }
  throw new InvalidArgumentError("must be any, none, brotli, lz4, or zstd");
}

export function parseFileTransferCompressionOptions(
  argv: readonly string[],
  localOptions: { compression?: FileTransferCompression | false | undefined }
): FileTransferCompression {
  const hasCompression = argvHasFlag(argv, "--compression");
  const hasNoCompression = argvHasFlag(argv, "--no-compression");
  if (hasCompression && hasNoCompression) {
    throw new AutophoneError({
      code: "INVALID_REQUEST",
      message: "--compression and --no-compression are mutually exclusive",
      retriable: false
    });
  }
  if (hasNoCompression || localOptions.compression === false) {
    return "disabled";
  }
  if (hasCompression && typeof localOptions.compression === "string") {
    return localOptions.compression;
  }
  return "adb_default";
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function argvHasFlag(argv: readonly string[], flag: string): boolean {
  const prefix = `${flag}=`;
  return argv.some((value) => value === flag || value.startsWith(prefix));
}
