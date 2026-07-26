import { AutophoneError, type DeviceBatteryGetResult, type DeviceDetailsResult } from "../../contracts/index.js";

type DeviceBatterySnapshot = DeviceBatteryGetResult["battery"];
type BatterySummary = DeviceDetailsResult["battery"];

export type ParsedDeviceBatteryOutput =
  | {
      ok: true;
      battery: DeviceBatterySnapshot;
    }
  | {
      ok: false;
      failure: string;
    };

export function buildAdbDeviceBatteryArgs(): string[] {
  return ["shell", "dumpsys", "battery"];
}

export function parseDeviceBatteryOutput(stdout: string, stderr: string, exitCode: number | null): ParsedDeviceBatteryOutput {
  if (stderr.trim().length > 0) {
    return { ok: false, failure: "dumpsys battery wrote unexpected stderr" };
  }
  if (exitCode !== 0) {
    return { ok: false, failure: "dumpsys battery exited nonzero" };
  }
  return parseDeviceBatterySnapshot(stdout, true);
}

export function parseBatteryDetails(stdout: string): BatterySummary {
  const parsed = parseDeviceBatterySnapshot(stdout, false);
  return toBatterySummary(parsed.ok ? parsed.battery : emptyBatterySnapshot());
}

export function toBatterySummary(snapshot: DeviceBatterySnapshot): BatterySummary {
  return {
    level_percent: snapshot.level_percent,
    scale: snapshot.scale,
    status: snapshot.status,
    plugged: snapshot.plugged,
    temperature_celsius: snapshot.temperature_celsius
  };
}

export function deviceBatteryFailure(input: { message: string; details: Record<string, unknown> }): AutophoneError {
  return new AutophoneError({
    code: "DEVICE_BATTERY_FAILED",
    message: input.message,
    retriable: false,
    details: input.details
  });
}

function parseDeviceBatterySnapshot(stdout: string, strict: boolean): ParsedDeviceBatteryOutput {
  const fields = parseColonFields(stdout);
  const knownFieldCount = countKnownBatteryFields(fields);
  if (strict && knownFieldCount === 0) {
    return { ok: false, failure: "dumpsys battery did not return battery fields" };
  }

  const level = parseOptionalNonNegativeInteger(fields.level, "level", strict);
  if (level.failure !== undefined) {
    return { ok: false, failure: level.failure };
  }
  const scale = parseOptionalPositiveInteger(fields.scale, "scale", strict);
  if (scale.failure !== undefined) {
    return { ok: false, failure: scale.failure };
  }
  const temperature = parseOptionalInteger(fields.temperature, "temperature", strict);
  if (temperature.failure !== undefined) {
    return { ok: false, failure: temperature.failure };
  }
  const voltage = parseOptionalNonNegativeInteger(fields.voltage, "voltage", strict);
  if (voltage.failure !== undefined) {
    return { ok: false, failure: voltage.failure };
  }
  const chargeCounter = parseOptionalNonNegativeInteger(fields["charge counter"], "charge counter", strict);
  if (chargeCounter.failure !== undefined) {
    return { ok: false, failure: chargeCounter.failure };
  }
  const present = parseOptionalBoolean(fields.present, "present", strict);
  if (present.failure !== undefined) {
    return { ok: false, failure: present.failure };
  }

  return {
    ok: true,
    battery: {
      level_percent:
        level.value !== null && scale.value !== null ? normalizeBatteryLevel(level.value, scale.value) : null,
      scale: scale.value,
      status: parseBatteryStatus(fields.status),
      plugged: parseBatteryPlugged(fields),
      temperature_celsius: temperature.value === null ? null : temperature.value / 10,
      health: parseBatteryHealth(fields.health),
      present: present.value,
      voltage_mv: voltage.value,
      technology: normalizeTechnology(fields.technology),
      charge_counter_uah: chargeCounter.value
    }
  };
}

function emptyBatterySnapshot(): DeviceBatterySnapshot {
  return {
    level_percent: null,
    scale: null,
    status: null,
    plugged: null,
    temperature_celsius: null,
    health: null,
    present: null,
    voltage_mv: null,
    technology: null,
    charge_counter_uah: null
  };
}

function parseColonFields(stdout: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const rawLine of stdout.split(/\r?\n/)) {
    const match = rawLine.trim().match(/^([^:]+):\s*(.*)$/);
    if (match !== null) {
      fields[match[1]!.trim().toLowerCase()] = match[2]!.trim();
    }
  }
  return fields;
}

function countKnownBatteryFields(fields: Record<string, string>): number {
  const knownFields = [
    "ac powered",
    "usb powered",
    "wireless powered",
    "dock powered",
    "status",
    "health",
    "present",
    "level",
    "scale",
    "voltage",
    "temperature",
    "technology",
    "charge counter"
  ];
  return knownFields.reduce((count, field) => count + (fields[field] === undefined ? 0 : 1), 0);
}

function parseOptionalInteger(
  value: string | undefined,
  field: string,
  strict: boolean
): { value: number | null; failure?: undefined } | { value?: undefined; failure: string } {
  if (value === undefined || value.length === 0) {
    return { value: null };
  }
  if (!/^-?(0|[1-9][0-9]*)$/.test(value)) {
    return strict ? { failure: `dumpsys battery returned malformed ${field}` } : { value: null };
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return strict ? { failure: `dumpsys battery returned ${field} outside safe integer range` } : { value: null };
  }
  return { value: parsed };
}

function parseOptionalNonNegativeInteger(
  value: string | undefined,
  field: string,
  strict: boolean
): { value: number | null; failure?: undefined } | { value?: undefined; failure: string } {
  const parsed = parseOptionalInteger(value, field, strict);
  if (parsed.failure !== undefined || parsed.value === null) {
    return parsed;
  }
  if (parsed.value < 0) {
    return strict ? { failure: `dumpsys battery returned negative ${field}` } : { value: null };
  }
  return parsed;
}

function parseOptionalPositiveInteger(
  value: string | undefined,
  field: string,
  strict: boolean
): { value: number | null; failure?: undefined } | { value?: undefined; failure: string } {
  const parsed = parseOptionalNonNegativeInteger(value, field, strict);
  if (parsed.failure !== undefined || parsed.value === null) {
    return parsed;
  }
  if (parsed.value === 0) {
    return strict ? { failure: `dumpsys battery returned non-positive ${field}` } : { value: null };
  }
  return parsed;
}

function parseOptionalBoolean(
  value: string | undefined,
  field: string,
  strict: boolean
): { value: boolean | null; failure?: undefined } | { value?: undefined; failure: string } {
  if (value === undefined || value.length === 0) {
    return { value: null };
  }
  const normalized = value.toLowerCase();
  if (normalized === "true") {
    return { value: true };
  }
  if (normalized === "false") {
    return { value: false };
  }
  return strict ? { failure: `dumpsys battery returned malformed ${field}` } : { value: null };
}

function normalizeBatteryLevel(level: number, scale: number): number {
  return Math.max(0, Math.min(100, Number(((level / scale) * 100).toFixed(2))));
}

function parseBatteryStatus(value: string | undefined): BatterySummary["status"] {
  switch (value) {
    case "1":
      return "unknown";
    case "2":
      return "charging";
    case "3":
      return "discharging";
    case "4":
      return "not_charging";
    case "5":
      return "full";
    default:
      return null;
  }
}

function parseBatteryHealth(value: string | undefined): DeviceBatterySnapshot["health"] {
  switch (value) {
    case "1":
      return "unknown";
    case "2":
      return "good";
    case "3":
      return "overheat";
    case "4":
      return "dead";
    case "5":
      return "over_voltage";
    case "6":
      return "unspecified_failure";
    case "7":
      return "cold";
    default:
      return null;
  }
}

function parseBatteryPlugged(fields: Record<string, string>): BatterySummary["plugged"] {
  const sources = [
    ["ac powered", "ac"],
    ["usb powered", "usb"],
    ["wireless powered", "wireless"],
    ["dock powered", "dock"]
  ] as const;
  let sawPoweredField = false;
  for (const [field, label] of sources) {
    const value = fields[field];
    if (value === undefined) {
      continue;
    }
    sawPoweredField = true;
    if (value.toLowerCase() === "true") {
      return label;
    }
  }
  return sawPoweredField ? "none" : null;
}

function normalizeTechnology(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0 ? null : normalized;
}
