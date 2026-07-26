import { describe, expect, it, vi } from "vitest";
import { runCli } from "./main.js";
import { makeDriver, makeIo } from "./main-test-utils.test-support.js";

describe("device ime mutation commands", () => {
  it("requires explicit serial for device ime set before driver creation", async () => {
    const driverFactory = vi.fn(() => makeDriver([]));
    const io = makeIo();
    const exitCode = await runCli(["device", "ime", "set", "--id", "com.android.adbkeyboard/.AdbIME"], {
      io,
      requestIdFactory: () => "req-device-ime-set-missing-serial",
      driverFactory
    });

    expect(exitCode).toBe(2);
    expect(driverFactory).not.toHaveBeenCalled();
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: false,
      command: "device.ime_set",
      request_id: "req-device-ime-set-missing-serial",
      error: {
        code: "INVALID_REQUEST",
        message: "device ime set requires explicit --serial"
      }
    });
  });

  it("requires explicit serial for device ime reset before driver creation", async () => {
    const driverFactory = vi.fn(() => makeDriver([]));
    const io = makeIo();
    const exitCode = await runCli(["device", "ime", "reset"], {
      io,
      requestIdFactory: () => "req-device-ime-reset-missing-serial",
      driverFactory
    });

    expect(exitCode).toBe(2);
    expect(driverFactory).not.toHaveBeenCalled();
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: false,
      command: "device.ime_reset",
      request_id: "req-device-ime-reset-missing-serial",
      error: {
        code: "INVALID_REQUEST",
        message: "device ime reset requires explicit --serial"
      }
    });
  });

  it("runs device ime set with explicit serial and reports the idempotent no-op", async () => {
    const driver = makeDriver([]);
    const driverFactory = vi.fn(() => driver);
    const io = makeIo();
    const exitCode = await runCli(
      ["--serial", "emulator-5554", "device", "ime", "set", "--id", "com.example.ime/.ImeService"],
      {
        io,
        requestIdFactory: () => "req-device-ime-set-already-current",
        driverFactory
      }
    );

    expect(exitCode).toBe(0);
    expect(driverFactory).toHaveBeenCalledTimes(1);
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      ok: true,
      command: "device.ime_set",
      result: {
        status: "already_current",
        requested_id: "com.example.ime/.ImeService",
        previous_id: "com.example.ime/.ImeService",
        verify: { policy: "ime_state_readback", ok: true }
      }
    });
  });
});
