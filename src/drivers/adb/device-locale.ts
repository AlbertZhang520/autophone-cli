import { AutophoneError } from "../../contracts/index.js";

export const DEVICE_LOCALE_SOURCES = [
  {
    key: "systemLocales",
    method: "settings_system_system_locales",
    args: ["shell", "settings", "get", "system", "system_locales"]
  },
  {
    key: "persistSysLocale",
    method: "getprop_persist_sys_locale",
    args: ["shell", "getprop", "persist.sys.locale"]
  },
  {
    key: "roProductLocale",
    method: "getprop_ro_product_locale",
    args: ["shell", "getprop", "ro.product.locale"]
  },
  {
    key: "roProductLocaleLanguage",
    method: "getprop_ro_product_locale_language",
    args: ["shell", "getprop", "ro.product.locale.language"]
  },
  {
    key: "roProductLocaleRegion",
    method: "getprop_ro_product_locale_region",
    args: ["shell", "getprop", "ro.product.locale.region"]
  }
] as const;

export type DeviceLocaleSourceKey = (typeof DEVICE_LOCALE_SOURCES)[number]["key"];
export type DeviceLocaleSourceMethod = (typeof DEVICE_LOCALE_SOURCES)[number]["method"];

export type ParsedDeviceLocaleSource =
  | {
      ok: true;
      value: string | null;
    }
  | {
      ok: false;
      failure: string;
    };

const LOCALE_SOURCE_MAX_CHARS = 512;

export function buildAdbDeviceLocaleSourceArgs(key: DeviceLocaleSourceKey): string[] {
  const source = DEVICE_LOCALE_SOURCES.find((candidate) => candidate.key === key);
  if (source === undefined) {
    throw new Error(`unknown locale source key: ${key}`);
  }
  return [...source.args];
}

export function parseDeviceLocaleSourceOutput(
  stdout: string,
  stderr: string,
  exitCode: number | null,
  method: DeviceLocaleSourceMethod
): ParsedDeviceLocaleSource {
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
  if (value === "null") {
    return { ok: true, value: null };
  }
  if (value.length > LOCALE_SOURCE_MAX_CHARS) {
    return { ok: false, failure: `${method} returned too much data` };
  }
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    return { ok: false, failure: `${method} returned control characters` };
  }

  return { ok: true, value };
}

export function deviceLocaleFailure(input: { message: string; details: Record<string, unknown> }): AutophoneError {
  return new AutophoneError({
    code: "DEVICE_LOCALE_FAILED",
    message: input.message,
    retriable: false,
    details: input.details
  });
}
