import {
  AutophoneError,
  type DeviceImeResetRequest,
  type DeviceImeResetResult,
  type DeviceImeSetRequest,
  type DeviceImeSetResult
} from "../../contracts/index.js";
import type { AndroidDriver } from "./types.js";
import { VERIFY_MAX_ATTEMPTS, VERIFY_SETTLE_MS, sleep } from "./shared.js";

export type DriverImeCommandRequest = { imeId: string; deviceSerial?: string | undefined; timeoutMs: number };
export type DriverImeResetRequest = { deviceSerial?: string | undefined; timeoutMs: number };
export type DriverImeCommandResult = { serial: string; exitCode: number | null; durationMs: number };

// 与 clipboard 相同的扩展方式：ime 变更能力不进 AndroidDriver 大接口，按需鸭子类型访问。
type AndroidImeDriver = {
  enableInputMethod?: unknown;
  setInputMethod?: unknown;
  resetInputMethod?: unknown;
};

async function callImeDriver(
  driver: AndroidDriver,
  method: keyof AndroidImeDriver,
  request: DriverImeCommandRequest | DriverImeResetRequest
): Promise<DriverImeCommandResult> {
  const candidate = (driver as AndroidImeDriver)[method];
  if (typeof candidate !== "function") {
    throw new Error(`driver does not implement ${method}`);
  }
  return (await candidate.call(driver, request)) as DriverImeCommandResult;
}

const IME_SET_SEMANTICS = "switches_user_visible_default_ime_reversible_via_previous_id" as const;

export async function deviceImeSet(driver: AndroidDriver, request: DeviceImeSetRequest): Promise<DeviceImeSetResult> {
  const readOptions = { deviceSerial: request.device_serial, timeoutMs: request.timeout_ms };
  const before = await driver.getDeviceImeState(readOptions);
  const previousId = before.ime.current_id;

  if (previousId === request.ime_id) {
    return {
      device_serial: before.serial,
      requested_id: request.ime_id,
      previous_id: previousId,
      status: "already_current",
      enable: { action: "not_needed", outcome: null },
      set: null,
      verify: {
        policy: "ime_state_readback",
        ok: true,
        attempts: 1,
        reason: "requested input method is already current; no mutation dispatched"
      },
      semantics: IME_SET_SEMANTICS
    };
  }

  let enable: DeviceImeSetResult["enable"] = { action: "already_enabled", outcome: null };
  if (!before.ime.enabled_ids.includes(request.ime_id)) {
    const enabled = await callImeDriver(driver, "enableInputMethod", { imeId: request.ime_id, ...readOptions });
    enable = { action: "enabled_now", outcome: { exit_code: enabled.exitCode, command_duration_ms: enabled.durationMs } };
  }

  const set = await callImeDriver(driver, "setInputMethod", { imeId: request.ime_id, ...readOptions });

  let lastSeenId = previousId;
  for (let attempt = 1; attempt <= VERIFY_MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      await sleep(VERIFY_SETTLE_MS);
    }
    const after = await driver.getDeviceImeState(readOptions);
    lastSeenId = after.ime.current_id;
    if (after.ime.current_id === request.ime_id) {
      return {
        device_serial: before.serial,
        requested_id: request.ime_id,
        previous_id: previousId,
        status: "switched",
        enable,
        set: { exit_code: set.exitCode, command_duration_ms: set.durationMs },
        verify: {
          policy: "ime_state_readback",
          ok: true,
          attempts: attempt,
          reason: "re-read IME state reports the requested input method as current"
        },
        semantics: IME_SET_SEMANTICS
      };
    }
  }

  throw new AutophoneError({
    code: "VERIFY_FAILED",
    message: "ime set was dispatched but the requested input method did not become current",
    retriable: false,
    details: {
      policy: "ime_state_readback",
      attempts: VERIFY_MAX_ATTEMPTS,
      requested_id: request.ime_id,
      previous_id: previousId,
      current_id: lastSeenId,
      device_serial: before.serial
    }
  });
}

export async function deviceImeReset(driver: AndroidDriver, request: DeviceImeResetRequest): Promise<DeviceImeResetResult> {
  const readOptions = { deviceSerial: request.device_serial, timeoutMs: request.timeout_ms };
  const before = await driver.getDeviceImeState(readOptions);
  const reset = await callImeDriver(driver, "resetInputMethod", readOptions);
  const after = await driver.getDeviceImeState(readOptions);
  const changed =
    before.ime.current_id !== after.ime.current_id ||
    before.ime.enabled_ids.join("\n") !== after.ime.enabled_ids.join("\n");
  return {
    device_serial: before.serial,
    previous_id: before.ime.current_id,
    current_id: after.ime.current_id,
    enabled_ids: after.ime.enabled_ids,
    reset: { exit_code: reset.exitCode, command_duration_ms: reset.durationMs },
    changed,
    verify: {
      policy: "ime_state_readback",
      ok: true,
      attempts: 1,
      reason: "re-read IME state after reset; system default selection applied"
    },
    semantics: "restores_system_default_enabled_and_selected_imes"
  };
}
