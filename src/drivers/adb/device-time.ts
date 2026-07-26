import { AutophoneError, type DeviceTimeGetResult } from "../../contracts/index.js";

export const DEVICE_TIME_SOURCES = [
  {
    key: "date",
    method: "date_unix_epoch_offset",
    args: ["shell", "date", "+%s%z"]
  },
  {
    key: "autoTime",
    method: "settings_global_auto_time",
    args: ["shell", "settings", "get", "global", "auto_time"]
  },
  {
    key: "autoTimeZone",
    method: "settings_global_auto_time_zone",
    args: ["shell", "settings", "get", "global", "auto_time_zone"]
  },
  {
    key: "settingsTimeZone",
    method: "settings_global_time_zone",
    args: ["shell", "settings", "get", "global", "time_zone"]
  },
  {
    key: "persistSysTimeZone",
    method: "getprop_persist_sys_timezone",
    args: ["shell", "getprop", "persist.sys.timezone"]
  }
] as const;

export type DeviceTimeSourceKey = (typeof DEVICE_TIME_SOURCES)[number]["key"];
export type DeviceTimeSourceMethod = (typeof DEVICE_TIME_SOURCES)[number]["method"];

export type ParsedDeviceTimeDate =
  | {
      ok: true;
      time: DeviceTimeGetResult["time"];
    }
  | {
      ok: false;
      failure: string;
    };

export type ParsedDeviceTimeBoolean =
  | {
      ok: true;
      value: boolean | null;
    }
  | {
      ok: false;
      failure: string;
    };

export type ParsedDeviceTimeZone =
  | {
      ok: true;
      value: string | null;
    }
  | {
      ok: false;
      failure: string;
    };

const TIMEZONE_ID_MAX_CHARS = 128;

export function buildAdbDeviceTimeSourceArgs(key: DeviceTimeSourceKey): string[] {
  const source = DEVICE_TIME_SOURCES.find((candidate) => candidate.key === key);
  if (source === undefined) {
    throw new Error(`unknown time source key: ${key}`);
  }
  return [...source.args];
}

export function parseDeviceTimeDateOutput(
  stdout: string,
  stderr: string,
  exitCode: number | null,
  method: DeviceTimeSourceMethod
): ParsedDeviceTimeDate {
  const line = parseSingleLineOutput(stdout, stderr, exitCode, method);
  if (!line.ok) {
    return line;
  }
  if (line.value === null) {
    return { ok: false, failure: `${method} returned empty output` };
  }

  const match = /^(0|[1-9]\d*) ?([+-])(\d{2})(\d{2})$/.exec(line.value);
  if (match === null) {
    return { ok: false, failure: `${method} returned malformed epoch/offset output` };
  }

  const seconds = Number(match[1]);
  const sign = match[2] === "-" ? -1 : 1;
  const hours = Number(match[3]);
  const minutes = Number(match[4]);
  if (!Number.isSafeInteger(seconds) || hours > 23 || minutes > 59) {
    return { ok: false, failure: `${method} returned epoch/offset values outside supported range` };
  }

  const timezoneOffsetMinutes = sign * (hours * 60 + minutes);
  return {
    ok: true,
    time: {
      unix_epoch_seconds: seconds,
      timezone_offset: `${match[2]}${match[3]}:${match[4]}`,
      timezone_offset_minutes: timezoneOffsetMinutes
    }
  };
}

export function parseDeviceTimeBooleanOutput(
  stdout: string,
  stderr: string,
  exitCode: number | null,
  method: DeviceTimeSourceMethod
): ParsedDeviceTimeBoolean {
  const line = parseSingleLineOutput(stdout, stderr, exitCode, method);
  if (!line.ok) {
    return line;
  }
  if (line.value === null || line.value === "null") {
    return { ok: true, value: null };
  }
  if (line.value === "1") {
    return { ok: true, value: true };
  }
  if (line.value === "0") {
    return { ok: true, value: false };
  }
  return { ok: false, failure: `${method} returned malformed boolean setting` };
}

export function parseDeviceTimeZoneOutput(
  stdout: string,
  stderr: string,
  exitCode: number | null,
  method: DeviceTimeSourceMethod
): ParsedDeviceTimeZone {
  const line = parseSingleLineOutput(stdout, stderr, exitCode, method);
  if (!line.ok) {
    return line;
  }
  if (line.value === null || line.value === "null") {
    return { ok: true, value: null };
  }
  if (line.value.length > TIMEZONE_ID_MAX_CHARS) {
    return { ok: false, failure: `${method} returned too much data` };
  }
  if (!/^[A-Za-z0-9._+\-/:]+$/.test(line.value)) {
    return { ok: false, failure: `${method} returned malformed timezone id` };
  }
  return { ok: true, value: line.value };
}

export function deviceTimeFailure(input: { message: string; details: Record<string, unknown> }): AutophoneError {
  return new AutophoneError({
    code: "DEVICE_TIME_FAILED",
    message: input.message,
    retriable: false,
    details: input.details
  });
}

function parseSingleLineOutput(
  stdout: string,
  stderr: string,
  exitCode: number | null,
  method: DeviceTimeSourceMethod
):
  | {
      ok: true;
      value: string | null;
    }
  | {
      ok: false;
      failure: string;
    } {
  if (stderr.trim().length > 0) {
    return { ok: false, failure: `${method} wrote unexpected stderr` };
  }
  if (exitCode !== 0) {
    return { ok: false, failure: `${method} exited nonzero` };
  }

  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { ok: true, value: null };
  }
  if (lines.length > 1) {
    return { ok: false, failure: `${method} returned multiple non-empty lines` };
  }

  const value = lines[0]!;
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    return { ok: false, failure: `${method} returned control characters` };
  }
  return { ok: true, value };
}
