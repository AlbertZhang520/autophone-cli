export const DEVICE_ACCESSIBILITY_SETTINGS = [
  { key: "accessibility_enabled", method: "settings_secure_accessibility_enabled" },
  { key: "touch_exploration_enabled", method: "settings_secure_touch_exploration_enabled" },
  { key: "enabled_accessibility_services", method: "settings_secure_enabled_accessibility_services" }
] as const;

export type DeviceAccessibilitySettingKey = (typeof DEVICE_ACCESSIBILITY_SETTINGS)[number]["key"];

export type ParsedAccessibilityBooleanSetting =
  | {
      ok: true;
      setting: {
        raw: "0" | "1" | null;
        value: boolean | null;
      };
    }
  | {
      ok: false;
      failure: string;
    };

export type ParsedAccessibilityServicesSetting =
  | {
      ok: true;
      setting: {
        raw: string | null;
        services: string[];
        count: number;
      };
    }
  | {
      ok: false;
      failure: string;
    };

const ACCESSIBILITY_SERVICES_MAX_RAW_CHARS = 4096;
const ACCESSIBILITY_SERVICES_MAX_COUNT = 128;
const ACCESSIBILITY_SERVICE_COMPONENT_RE =
  /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*\/(?:\.[A-Za-z_$][A-Za-z0-9_.$]*|[A-Za-z_$][A-Za-z0-9_.$]*)$/;

export function buildAdbDeviceAccessibilitySettingArgs(key: DeviceAccessibilitySettingKey): string[] {
  return ["shell", "settings", "get", "secure", key];
}

export function parseAccessibilityBooleanSetting(
  stdout: string,
  stderr: string,
  key: "accessibility_enabled" | "touch_exploration_enabled"
): ParsedAccessibilityBooleanSetting {
  if (stderr.trim().length > 0) {
    return { ok: false, failure: `settings secure ${key} wrote unexpected stderr` };
  }

  const raw = stdout.trim();
  if (raw === "null") {
    return { ok: true, setting: { raw: null, value: null } };
  }
  if (raw === "0") {
    return { ok: true, setting: { raw: "0", value: false } };
  }
  if (raw === "1") {
    return { ok: true, setting: { raw: "1", value: true } };
  }
  if (raw.length === 0) {
    return { ok: false, failure: `settings secure ${key} returned empty output` };
  }
  return { ok: false, failure: `settings secure ${key} returned an unexpected boolean value` };
}

export function parseEnabledAccessibilityServicesSetting(
  stdout: string,
  stderr: string
): ParsedAccessibilityServicesSetting {
  if (stderr.trim().length > 0) {
    return { ok: false, failure: "settings secure enabled_accessibility_services wrote unexpected stderr" };
  }

  const raw = stdout.trim();
  if (raw === "null") {
    return { ok: true, setting: { raw: null, services: [], count: 0 } };
  }
  if (raw.length === 0) {
    return { ok: true, setting: { raw: "", services: [], count: 0 } };
  }
  if (raw.length > ACCESSIBILITY_SERVICES_MAX_RAW_CHARS) {
    return { ok: false, failure: "settings secure enabled_accessibility_services returned too much data" };
  }

  const services = raw.split(":");
  if (services.length > ACCESSIBILITY_SERVICES_MAX_COUNT) {
    return { ok: false, failure: "settings secure enabled_accessibility_services returned too many services" };
  }
  if (services.some((service) => !ACCESSIBILITY_SERVICE_COMPONENT_RE.test(service))) {
    return { ok: false, failure: "settings secure enabled_accessibility_services returned an invalid component name" };
  }

  return { ok: true, setting: { raw, services, count: services.length } };
}
