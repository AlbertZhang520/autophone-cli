import { describe, expect, it } from "vitest";
import { deviceImeReset, deviceImeSet } from "./runtime/ime.js";
import { imeDriverResult, makeDriver } from "./runtime-test-utils.test-support.js";

const CURRENT_IME = "com.example.ime/.ImeService";
const NEW_IME = "com.test.ime/.NewIme";
const ENABLED_SECONDARY_IME = "com.android.adbkeyboard/.AdbIME";

describe("device ime set", () => {
  it("short-circuits without mutation when the requested ime is already current", async () => {
    const driver = makeDriver([]);

    const result = await deviceImeSet(driver, { ime_id: CURRENT_IME, device_serial: "emulator-5554", timeout_ms: 1_000 });

    expect(result).toMatchObject({
      status: "already_current",
      previous_id: CURRENT_IME,
      enable: { action: "not_needed", outcome: null },
      set: null,
      verify: { policy: "ime_state_readback", ok: true, attempts: 1 }
    });
    expect(driver.enableInputMethod).not.toHaveBeenCalled();
    expect(driver.setInputMethod).not.toHaveBeenCalled();
  });

  it("enables a not-yet-enabled ime before switching and verifies by readback", async () => {
    const driver = makeDriver([]);
    driver.getDeviceImeState
      .mockResolvedValueOnce(imeDriverResult())
      .mockResolvedValueOnce(
        imeDriverResult({
          ime: {
            current_id: NEW_IME,
            default_id: CURRENT_IME,
            enabled_ids: [CURRENT_IME, ENABLED_SECONDARY_IME, NEW_IME],
            enabled_count: 3
          }
        })
      );

    const result = await deviceImeSet(driver, { ime_id: NEW_IME, device_serial: "emulator-5554", timeout_ms: 1_000 });

    expect(driver.enableInputMethod).toHaveBeenCalledWith({ imeId: NEW_IME, deviceSerial: "emulator-5554", timeoutMs: 1_000 });
    expect(driver.setInputMethod).toHaveBeenCalledWith({ imeId: NEW_IME, deviceSerial: "emulator-5554", timeoutMs: 1_000 });
    expect(result).toMatchObject({
      status: "switched",
      requested_id: NEW_IME,
      previous_id: CURRENT_IME,
      enable: { action: "enabled_now" },
      verify: { ok: true, attempts: 1 }
    });
  });

  it("skips enable when the requested ime is already enabled", async () => {
    const driver = makeDriver([]);
    driver.getDeviceImeState
      .mockResolvedValueOnce(imeDriverResult())
      .mockResolvedValueOnce(
        imeDriverResult({
          ime: {
            current_id: ENABLED_SECONDARY_IME,
            default_id: CURRENT_IME,
            enabled_ids: [CURRENT_IME, ENABLED_SECONDARY_IME],
            enabled_count: 2
          }
        })
      );

    const result = await deviceImeSet(driver, { ime_id: ENABLED_SECONDARY_IME, device_serial: "emulator-5554", timeout_ms: 1_000 });

    expect(driver.enableInputMethod).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: "switched", enable: { action: "already_enabled", outcome: null } });
  });

  it("fails verification when the requested ime never becomes current", async () => {
    const driver = makeDriver([]);

    await expect(deviceImeSet(driver, { ime_id: ENABLED_SECONDARY_IME, device_serial: "emulator-5554", timeout_ms: 1_000 })).rejects.toMatchObject({
      code: "VERIFY_FAILED",
      details: {
        policy: "ime_state_readback",
        requested_id: ENABLED_SECONDARY_IME,
        previous_id: CURRENT_IME,
        current_id: CURRENT_IME
      }
    });
    expect(driver.setInputMethod).toHaveBeenCalledTimes(1);
  });
});

describe("device ime reset", () => {
  it("reports previous and current ids with a changed flag", async () => {
    const driver = makeDriver([]);
    driver.getDeviceImeState
      .mockResolvedValueOnce(
        imeDriverResult({
          ime: {
            current_id: ENABLED_SECONDARY_IME,
            default_id: CURRENT_IME,
            enabled_ids: [CURRENT_IME, ENABLED_SECONDARY_IME],
            enabled_count: 2
          }
        })
      )
      .mockResolvedValueOnce(
        imeDriverResult({
          ime: { current_id: CURRENT_IME, default_id: CURRENT_IME, enabled_ids: [CURRENT_IME], enabled_count: 1 }
        })
      );

    const result = await deviceImeReset(driver, { device_serial: "emulator-5554", timeout_ms: 1_000 });

    expect(driver.resetInputMethod).toHaveBeenCalledWith({ deviceSerial: "emulator-5554", timeoutMs: 1_000 });
    expect(result).toMatchObject({
      previous_id: ENABLED_SECONDARY_IME,
      current_id: CURRENT_IME,
      enabled_ids: [CURRENT_IME],
      changed: true,
      verify: { policy: "ime_state_readback", ok: true, attempts: 1 }
    });
  });

  it("reports changed false when reset leaves ime state identical", async () => {
    const driver = makeDriver([]);

    const result = await deviceImeReset(driver, { device_serial: "emulator-5554", timeout_ms: 1_000 });

    expect(result.changed).toBe(false);
  });
});
