import { describe, expect, it, vi } from "vitest";
import { Command } from "commander";
import type { DeviceDetailsResult } from "../contracts/index.js";
import type { AndroidDriver, DriverDevice } from "../core/index.js";
import { executeCliCommand, registerCliCommand } from "./command-descriptor.js";
import { deviceCommandDescriptors, deviceInfoDescriptor, deviceListDescriptor } from "./commands/device.js";

describe("CLI command descriptors", () => {
  it("keeps migrated device command metadata centralized", () => {
    expect(deviceCommandDescriptors.map((descriptor) => descriptor.name)).toEqual(["device.list", "device.info"]);
    expect(deviceCommandDescriptors.map((descriptor) => descriptor.argvPath.join(" "))).toEqual([
      "device list",
      "device info"
    ]);
    expect(deviceCommandDescriptors.map((descriptor) => descriptor.description)).toEqual([
      "list all adb-connected devices without selecting a target",
      "read target Android device environment facts"
    ]);
  });

  it("registers Commander child commands from descriptor argv paths and descriptions", () => {
    const device = new Command("device");

    registerCliCommand(device, "device", deviceListDescriptor, async () => {});

    const registered = device.commands.find((command) => command.name() === "list");
    expect(registered?.description()).toBe("list all adb-connected devices without selecting a target");
  });

  it("rejects descriptor argv paths outside the registered parent", () => {
    const device = new Command("device");

    expect(() =>
      registerCliCommand(
        device,
        "device",
        { ...deviceListDescriptor, name: "app.current", argvPath: ["app", "current"] },
        async () => {}
      )
    ).toThrow("descriptor app.current argv path must be a direct child of device");
  });

  it("preserves the full device list success envelope shape", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
    const startedAt = Date.now();
    const devices: DriverDevice[] = [
      { serial: "emulator-5554", state: "device", details: { model: "sdk_gphone64_arm64" } },
      { serial: "phone-1", state: "unauthorized", details: {} }
    ];
    const driver = { listDevices: vi.fn(async () => devices) } as unknown as AndroidDriver;
    const driverFactory = vi.fn(() => driver);
    const io = makeIo();

    await executeCliCommand(deviceListDescriptor, {
      io,
      requestId: "req-device-list",
      startedAt,
      driverFactory,
      globalOptions: { adb: "adb-custom", serial: "ignored-serial", timeout: 10_000 }
    });

    expect(driverFactory).toHaveBeenCalledWith({ adbPath: "adb-custom" });
    expect((driver as unknown as { listDevices: ReturnType<typeof vi.fn> }).listDevices).toHaveBeenCalledWith({
      timeoutMs: 10_000
    });
    expect(JSON.parse(io.stdoutText())).toEqual({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-list",
      ok: true,
      command: "device.list",
      duration_ms: 0,
      result: {
        devices: [
          {
            serial: "emulator-5554",
            state: "device",
            online: true,
            details: { model: "sdk_gphone64_arm64" }
          },
          { serial: "phone-1", state: "unauthorized", online: false, details: {} }
        ],
        count: 2,
        online_count: 1,
        unauthorized_count: 1,
        offline_count: 0,
        other_count: 0,
        state_counts: { device: 1, unauthorized: 1 },
        default_serial: "emulator-5554"
      },
      error: null,
      warnings: ["device list ignores --serial and returns all adb devices"],
      trace: { timeout_ms: 10_000, serial_filter: "ignored" }
    });
    vi.useRealTimers();
  });

  it("preserves the device list no-serial metadata branch", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
    const startedAt = Date.now();
    const driver = { listDevices: vi.fn(async () => []) } as unknown as AndroidDriver;
    const driverFactory = vi.fn(() => driver);
    const io = makeIo();

    await executeCliCommand(deviceListDescriptor, {
      io,
      requestId: "req-device-list-no-serial",
      startedAt,
      driverFactory,
      globalOptions: { timeout: 5_000 }
    });

    expect(JSON.parse(io.stdoutText())).toEqual({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-list-no-serial",
      ok: true,
      command: "device.list",
      duration_ms: 0,
      result: {
        devices: [],
        count: 0,
        online_count: 0,
        unauthorized_count: 0,
        offline_count: 0,
        other_count: 0,
        state_counts: {},
        default_serial: null
      },
      error: null,
      warnings: [],
      trace: { timeout_ms: 5_000, serial_filter: "absent" }
    });
    vi.useRealTimers();
  });

  it("preserves the full device info success envelope shape", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
    const startedAt = Date.now();
    const details = deviceDetailsFixture();
    const driver = { getDeviceDetails: vi.fn(async () => details) } as unknown as AndroidDriver;
    const driverFactory = vi.fn(() => driver);
    const io = makeIo();

    await executeCliCommand(deviceInfoDescriptor, {
      io,
      requestId: "req-device-info",
      startedAt,
      driverFactory,
      globalOptions: { serial: "emulator-5554", timeout: 10_000 }
    });

    expect(driverFactory).toHaveBeenCalledWith({ adbPath: undefined });
    expect((driver as unknown as { getDeviceDetails: ReturnType<typeof vi.fn> }).getDeviceDetails).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    expect(JSON.parse(io.stdoutText())).toEqual({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-device-info",
      ok: true,
      command: "device.info",
      duration_ms: 0,
      result: details,
      error: null,
      warnings: [],
      trace: { timeout_ms: 10_000, sources: ["getprop", "wm size", "wm density", "dumpsys battery"] },
      device: { serial: "emulator-5554" }
    });
    vi.useRealTimers();
  });
});

function makeIo() {
  let stdout = "";
  let stderr = "";
  return {
    stdout: {
      write(value: string) {
        stdout += value;
        return true;
      }
    },
    stderr: {
      write(value: string) {
        stderr += value;
        return true;
      }
    },
    stdoutText: () => stdout,
    stderrText: () => stderr
  };
}

function deviceDetailsFixture(): DeviceDetailsResult {
  return {
    device_serial: "emulator-5554",
    android: {
      release: "15",
      sdk: 35,
      codename: "REL"
    },
    hardware: {
      manufacturer: "Google",
      brand: "google",
      model: "sdk_gphone64_arm64",
      product: "sdk_gphone64_arm64",
      device: "emu64",
      supported_abis: ["arm64-v8a", "armeabi-v7a"]
    },
    display: {
      physical_size: [1080, 2400],
      override_size: null,
      physical_density: 420,
      override_density: null
    },
    battery: {
      level_percent: 88,
      scale: 100,
      status: "charging",
      plugged: "usb",
      temperature_celsius: 25
    },
    properties: {
      "ro.build.version.release": "15",
      "ro.build.version.sdk": "35"
    }
  };
}
