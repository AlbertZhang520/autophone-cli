export const DEVICE_ANIMATION_SETTINGS = [
  {
    key: "window_animation_scale",
    method: "settings_global_window_animation_scale",
    putMethod: "settings_put_global_window_animation_scale"
  },
  {
    key: "transition_animation_scale",
    method: "settings_global_transition_animation_scale",
    putMethod: "settings_put_global_transition_animation_scale"
  },
  {
    key: "animator_duration_scale",
    method: "settings_global_animator_duration_scale",
    putMethod: "settings_put_global_animator_duration_scale"
  }
] as const;

export type DeviceAnimationSettingKey = (typeof DEVICE_ANIMATION_SETTINGS)[number]["key"];
export type DeviceAnimationPutMethod = (typeof DEVICE_ANIMATION_SETTINGS)[number]["putMethod"];
export type DeviceAnimationScaleWriteValue = 0 | 0.5 | 1;

export type ParsedDeviceAnimationScale =
  | {
      ok: true;
      scale: {
        raw: string | null;
        value: number | null;
      };
    }
  | {
      ok: false;
      failure: string;
    };

export function buildAdbDeviceAnimationScaleArgs(key: DeviceAnimationSettingKey): string[] {
  return ["shell", "settings", "get", "global", key];
}

export function buildAdbDeviceAnimationScalePutArgs(
  key: DeviceAnimationSettingKey,
  scale: DeviceAnimationScaleWriteValue
): string[] {
  return ["shell", "settings", "put", "global", key, formatDeviceAnimationScaleValue(scale)];
}

export function formatDeviceAnimationScaleValue(scale: DeviceAnimationScaleWriteValue): string {
  if (scale === 0) {
    return "0";
  }
  if (scale === 0.5) {
    return "0.5";
  }
  return "1";
}

export function parseDeviceAnimationScaleSetting(
  stdout: string,
  stderr: string,
  key: DeviceAnimationSettingKey
): ParsedDeviceAnimationScale {
  if (stderr.trim().length > 0) {
    return { ok: false, failure: `settings global ${key} wrote unexpected stderr` };
  }

  const raw = stdout.trim();
  if (raw === "null") {
    return { ok: true, scale: { raw: null, value: null } };
  }
  if (raw.length === 0) {
    return { ok: false, failure: `settings global ${key} returned empty output` };
  }
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) {
    return { ok: false, failure: `settings global ${key} returned an invalid animation scale` };
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, failure: `settings global ${key} returned an invalid animation scale` };
  }

  return { ok: true, scale: { raw, value } };
}
