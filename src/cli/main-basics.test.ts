import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type {
  AndroidDriver,
  DriverAppActivitiesResult,
  DriverAppGraphicsResult,
  DriverAppLinksResult,
  DriverAppOpsGetResult,
  DriverAppPackageInfoResult,
  DriverAppMemoryResult,
  DriverAppListResult,
  DriverDevice,
  DriverDeviceCurrentUserResult,
  DriverDeviceAccessibilityResult,
  DriverDeviceAnimationsResult,
  DriverDeviceAnimationsSetResult,
  DriverDeviceBatteryResult,
  DriverDeviceTimeResult,
  DriverDeviceBrightnessResult,
  DriverDeviceImeResult,
  DriverDeviceLocaleResult,
  DriverDeviceNetworkResult,
  DriverDeviceStorageResult,
  DriverDeviceNotificationsResult,
  DriverDeviceOrientationResult,
  DriverDeviceScreenResult,
  DriverDeviceUsersResult,
  DriverResolveUrlResult,
  DriverRingerGetResult,
  DriverUserRotationPolicy
} from "../core/index.js";
import { DEVICE_VOLUME_STREAMS } from "../core/index.js";
import { runCli } from "./main.js";
import { redactSensitiveError } from "./redaction.js";
import {
  AutophoneError,
  RUNTIME_VERSION,
  type AppCurrentResult,
  type DeviceDetailsResult,
  type DeviceReadyState,
  type Point,
  type Snapshot
} from "../contracts/index.js";
import {
  accessibilityDriverResult,
  animationsDriverResult,
  animationsSetDriverResult,
  appActivitiesDriverResult,
  appActivityRecord,
  appCurrentState,
  appLinksDriverResult,
  appOpsDriverResult,
  batteryDriverResult,
  brightnessDriverResult,
  deviceDetailsFixture,
  emptyGraphicsSummary,
  emptyMemorySnapshot,
  graphicsDriverResult,
  graphicsSummary,
  imeDriverResult,
  localeDriverResult,
  makeDriver,
  makeIo,
  memoryDriverResult,
  memorySnapshot,
  networkDriverResult,
  notificationsDriverResult,
  orientationDriverResult,
  packageInfoDriverResult,
  packageInfoRecord,
  pngFixture,
  readyState,
  resolveUrlDriverResult,
  ringerDriverResult,
  screenDriverResult,
  snapshot,
  storageDriverResult,
  timeDriverResult,
  userRotationPolicy
} from "./main-test-utils.test-support.js";

describe("CLI JSON output", () => {
  it("routes human help to stderr without stdout JSON", async () => {
    for (const argv of [
      ["--help"],
      ["-h"],
      ["help"],
      ["device", "--help"],
      ["help", "device"],
      ["help", "device", "list"]
    ]) {
      const driverFactory = vi.fn(() => makeDriver([]));
      const io = makeIo();
      const exitCode = await runCli(argv, {
        io,
        requestIdFactory: () => "req-help",
        driverFactory
      });

      expect(exitCode).toBe(0);
      expect(io.stdoutText()).toBe("");
      expect(io.stderrText()).toContain("Usage: autophone");
      expect(driverFactory).not.toHaveBeenCalled();
    }
  });

  it("routes human version to stderr without stdout JSON", async () => {
    for (const argv of [
      ["--version"],
      ["-V"],
      ["--serial", "ignored", "--version"],
      ["--timeout", "3000", "--version"],
      ["device", "--version"],
      ["--serial", "ignored", "device", "list", "--version"]
    ]) {
      const driverFactory = vi.fn(() => makeDriver([]));
      const io = makeIo();
      const exitCode = await runCli(argv, {
        io,
        requestIdFactory: () => "req-version",
        driverFactory
      });

      expect(exitCode).toBe(0);
      expect(io.stdoutText()).toBe("");
      expect(io.stderrText()).toBe(`${RUNTIME_VERSION}\n`);
      expect(driverFactory).not.toHaveBeenCalled();
    }
  });

  it("reports incomplete command groups as JSON failures without leaking help placeholders", async () => {
    for (const { argv, usage } of [
      { argv: [], usage: "Usage: autophone" },
      { argv: ["device"], usage: "Usage: autophone device" }
    ]) {
      const io = makeIo();
      const exitCode = await runCli(argv, {
        io,
        requestIdFactory: () => "req-device-group",
        driverFactory: () => makeDriver([])
      });

      expect(exitCode).toBe(2);
      expect(io.stderrText()).toContain(usage);
      const parsed = JSON.parse(io.stdoutText());
      expect(parsed).toMatchObject({
        ok: false,
        command: "unknown",
        error: {
          code: "INVALID_REQUEST",
          message: "command requires a concrete subcommand"
        }
      });
    }
  });

  it("reports unknown commands and options as JSON failures", async () => {
    for (const { argv, message } of [
      { argv: ["bogus"], message: "error: unknown command 'bogus'\n(Did you mean logs?)" },
      { argv: ["--nope"], message: "error: unknown option '--nope'" },
      { argv: ["-v"], message: "error: unknown option '-v'" },
      { argv: ["version"], message: "error: unknown command 'version'" }
    ]) {
      const io = makeIo();
      const exitCode = await runCli(argv, {
        io,
        requestIdFactory: () => "req-unknown",
        driverFactory: () => makeDriver([])
      });

      expect(exitCode).toBe(2);
      const parsed = JSON.parse(io.stdoutText());
      expect(parsed).toMatchObject({
        ok: false,
        command: "unknown",
        error: {
          code: "INVALID_REQUEST",
          message
        }
      });
      expect(io.stdoutText()).not.toContain("(outputHelp)");
    }
  });

  it("keeps non-sensitive command failure argv unchanged", async () => {
    const driver = makeDriver([]);
    vi.mocked(driver.observe).mockRejectedValueOnce(
      new AutophoneError({
        code: "ADB_ERROR",
        message: "observe failed",
        retriable: true
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["find", "--text", "Login"], {
      io,
      requestIdFactory: () => "req-nonsensitive-argv",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "ui.find",
      trace: { argv: ["find", "--text", "Login"] }
    });
  });
});
