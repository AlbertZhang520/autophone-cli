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
  it("writes key press JSON with default no verification", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["key", "press", "--key", "APP_SWITCH"], {
      io,
      requestIdFactory: () => "req-key-app-switch",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.keyEvent).toHaveBeenCalledWith("KEYCODE_APP_SWITCH", { timeoutMs: 10000 });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "key.press",
      result: {
        key: "APP_SWITCH",
        keycode: "KEYCODE_APP_SWITCH",
        verify: { policy: "none", ok: true }
      },
      warnings: []
    });
  });

  it("warns when key press verification is explicitly disabled", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["key", "press", "--key", "BACK", "--verify", "none"], {
      io,
      requestIdFactory: () => "req-key-back-explicit-none",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "key.press",
      warnings: ["key press verification was explicitly disabled"]
    });
  });

  it("rejects invalid key names before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["key", "press", "--key", "POWER"], {
      io,
      requestIdFactory: () => "req-key-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.keyEvent).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "key.press",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("writes text input JSON without echoing raw text", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["text", "input", "--text", "hello world"], {
      io,
      requestIdFactory: () => "req-text-input",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.textInput).toHaveBeenCalledWith("hello%sworld", { timeoutMs: 10000 });
    expect(io.stdoutText()).not.toContain("hello world");
    expect(io.stdoutText()).not.toContain("hello%sworld");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "text.input",
      result: {
        charset: "adb_shell_printable_ascii",
        text_length: 11,
        encoded_length: 12,
        verify: { policy: "none", ok: true }
      },
      trace: { text_length: 11 }
    });
  });

  it("writes text input JSON for shell-escaped printable ASCII", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["text", "input", "--text", "p@ss:w0rd! a+b/c?d#e -ok"], {
      io,
      requestIdFactory: () => "req-text-input-special",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.textInput).toHaveBeenCalledWith("p@ss\\:w0rd\\!%sa\\+b\\/c\\?d\\#e%s-ok", { timeoutMs: 10000 });
    expect(io.stdoutText()).not.toContain("p@ss:w0rd!");
    expect(io.stdoutText()).not.toContain("p@ss\\:w0rd");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "text.input",
      result: {
        charset: "adb_shell_printable_ascii",
        text_length: 24,
        encoded_length: 32,
        verify: { policy: "none", ok: true }
      },
      trace: { text_length: 24 }
    });
  });

  it("rejects unsupported text without leaking it in JSON", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["text", "input", "--text", "bad%café"], {
      io,
      requestIdFactory: () => "req-text-unsafe",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.textInput).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain("bad%café");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "text.input",
      error: { code: "INVALID_REQUEST" },
      trace: { argv: ["text", "input", "--text", "<redacted>"] }
    });
  });

  it("redacts joined --text arguments in text input failures", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const text = "bad%secret";
    const exitCode = await runCli(["text", "input", `--text=${text}`], {
      io,
      requestIdFactory: () => "req-text-joined-redacted",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.textInput).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(text);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "text.input",
      error: { code: "INVALID_REQUEST" },
      trace: { argv: ["text", "input", "--text=<redacted>"] }
    });
  });

  it("redacts sensitive argv when parsing fails before command action runs", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const text = "secret-before-action";
    const exitCode = await runCli(["text", "input", `--text=${text}`, "--unknown-local-option"], {
      io,
      requestIdFactory: () => "req-text-parse-before-action",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.textInput).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(text);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "unknown",
      error: { code: "INVALID_REQUEST" },
      trace: { argv: ["text", "input", "--text=<redacted>", "--unknown-local-option"] }
    });
  });

  it("rejects percent and backslash text", async () => {
    for (const value of ["100% ready", "C:\\temp"]) {
      const driver = makeDriver([]);
      const io = makeIo();
      const exitCode = await runCli(["text", "input", "--text", value], {
        io,
        requestIdFactory: () => "req-text-rejected",
        driverFactory: () => driver
      });

      expect(exitCode).toBe(2);
      expect(driver.textInput).not.toHaveBeenCalled();
      expect(io.stdoutText()).not.toContain(value);
      const parsed = JSON.parse(io.stdoutText());
      expect(parsed).toMatchObject({
        ok: false,
        command: "text.input",
        error: { code: "INVALID_REQUEST" },
        trace: { argv: ["text", "input", "--text", "<redacted>"] }
      });
    }
  });

  it("redacts encoded text from driver error details", async () => {
    const driver = makeDriver([]);
    driver.textInput.mockRejectedValueOnce(
      new AutophoneError({
        code: "ADB_ERROR",
        message: "remote failed for hello%sworld",
        retriable: true,
        details: {
          args: ["-s", "emulator-5554", "shell", "input", "text", "hello%sworld"],
          stderr: "error echoed hello%sworld"
        }
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["text", "input", "--text", "hello world"], {
      io,
      requestIdFactory: () => "req-text-adb-error",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(io.stdoutText()).not.toContain("hello world");
    expect(io.stdoutText()).not.toContain("hello%sworld");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "text.input",
      error: {
        code: "ADB_ERROR",
        message: "adb text input command failed",
        details: {
          args: ["-s", "emulator-5554", "shell", "input", "text", "<redacted>"],
          stderr: "<redacted>"
        }
      },
      trace: { argv: ["text", "input", "--text", "<redacted>"] }
    });
  });

  it("warns that text screen_changed verification is not exact text confirmation", async () => {
    const driver = makeDriver([snapshot("hash-a", "Name"), snapshot("hash-b", "Name Alice")]);
    const io = makeIo();
    const exitCode = await runCli(["text", "input", "--text", "Alice", "--verify", "screen_changed"], {
      io,
      requestIdFactory: () => "req-text-verify",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "text.input",
      warnings: ["screen_changed verification does not confirm exact inserted text"],
      result: { verify: { policy: "screen_changed", ok: true } }
    });
  });

  it("writes text clear JSON without claiming field emptiness", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["text", "clear", "--max-chars", "32"], {
      io,
      requestIdFactory: () => "req-text-clear",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.clearText).toHaveBeenCalledWith(32, { timeoutMs: 10000 });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "text.clear",
      warnings: ["text clear is best-effort; field emptiness is not confirmed"],
      result: {
        strategy: "move_end_then_backspace",
        max_chars: 32,
        key_events: { move_end: 1, delete: 32, total: 33 },
        verify: { policy: "none", ok: true, attempts: 0 }
      },
      trace: { max_chars: 32 }
    });
    expect(io.stdoutText()).not.toContain("cleared");
  });

  it("writes a caution warning for text clear screen_changed verification", async () => {
    const driver = makeDriver([snapshot("hash-a", "Name"), snapshot("hash-b", "")]);
    const io = makeIo();
    const exitCode = await runCli(["text", "clear", "--verify", "screen_changed"], {
      io,
      requestIdFactory: () => "req-text-clear-verify",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "text.clear",
      warnings: ["screen_changed verification does not confirm the field is empty"],
      result: {
        max_chars: 64,
        verify: { policy: "screen_changed", ok: true, changed_fields: ["ui_hash"] }
      }
    });
  });

  it("rejects invalid text clear max-chars before driver calls", async () => {
    for (const value of ["0", "513"]) {
      const driver = makeDriver([]);
      const io = makeIo();
      const exitCode = await runCli(["text", "clear", "--max-chars", value], {
        io,
        requestIdFactory: () => "req-text-clear-invalid",
        driverFactory: () => driver
      });

      expect(exitCode).toBe(2);
      expect(driver.clearText).not.toHaveBeenCalled();
      const parsed = JSON.parse(io.stdoutText());
      expect(parsed).toMatchObject({
        ok: false,
        command: "text.clear",
        error: { code: "INVALID_REQUEST" }
      });
    }
  });

  it("writes screenshot PNG to a file and JSON metadata to stdout", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-shot-"));
    const output = join(dir, "screen.png");
    const png = pngFixture([1, 2, 3]);
    const driver = makeDriver([]);
    driver.screenshot.mockResolvedValueOnce({ serial: "emulator-5554", png, durationMs: 7 });
    const io = makeIo();
    const exitCode = await runCli(["screenshot", "--output", output], {
      io,
      requestIdFactory: () => "req-screenshot",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    await expect(readFile(output)).resolves.toEqual(png);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "screenshot",
      device: { serial: "emulator-5554" },
      result: {
        device_serial: "emulator-5554",
        output_path: output,
        mime_type: "image/png",
        width_px: 2,
        height_px: 3,
        bytes: png.byteLength,
        sha256: "sha256:6aa33716164430da3d18d0d84bfb3fd43be29cac59562be6bd6a2190bb60bd99",
        capture_duration_ms: 7,
        overwritten: false
      }
    });
  });

  it("does not overwrite screenshot output unless requested", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-shot-exists-"));
    const output = join(dir, "screen.png");
    await writeFile(output, "original");
    const driver = makeDriver([]);
    driver.screenshot.mockResolvedValueOnce({ serial: "emulator-5554", png: pngFixture([4]), durationMs: 1 });
    const io = makeIo();
    const exitCode = await runCli(["screenshot", "--output", output], {
      io,
      requestIdFactory: () => "req-screenshot-exists",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    await expect(readFile(output, "utf8")).resolves.toBe("original");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "screenshot",
      error: { code: "OUTPUT_EXISTS", retriable: false }
    });
  });

  it("overwrites screenshot output only with explicit opt-in", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-shot-overwrite-"));
    const output = join(dir, "screen.png");
    await writeFile(output, "original");
    const png = pngFixture([5]);
    const driver = makeDriver([]);
    driver.screenshot.mockResolvedValueOnce({ serial: "emulator-5554", png, durationMs: 1 });
    const io = makeIo();
    const exitCode = await runCli(["screenshot", "--output", output, "--overwrite"], {
      io,
      requestIdFactory: () => "req-screenshot-overwrite",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    await expect(readFile(output)).resolves.toEqual(png);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "screenshot",
      warnings: ["screenshot output file was overwritten"],
      result: { overwritten: true }
    });
  });

  it("does not report overwrite when --overwrite writes a new screenshot file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-shot-overwrite-new-"));
    const output = join(dir, "screen.png");
    const png = pngFixture([6]);
    const driver = makeDriver([]);
    driver.screenshot.mockResolvedValueOnce({ serial: "emulator-5554", png, durationMs: 1 });
    const io = makeIo();
    const exitCode = await runCli(["screenshot", "--output", output, "--overwrite"], {
      io,
      requestIdFactory: () => "req-screenshot-overwrite-new",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    await expect(readFile(output)).resolves.toEqual(png);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "screenshot",
      warnings: [],
      result: { overwritten: false }
    });
  });

  it("does not create screenshot output directories when PNG validation fails", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-shot-invalid-"));
    const nested = join(dir, "nested");
    const output = join(nested, "screen.png");
    const driver = makeDriver([]);
    driver.screenshot.mockResolvedValueOnce({ serial: "emulator-5554", png: Buffer.from("not a png"), durationMs: 1 });
    const io = makeIo();
    const exitCode = await runCli(["screenshot", "--output", output], {
      io,
      requestIdFactory: () => "req-screenshot-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    await expect(access(nested)).rejects.toMatchObject({ code: "ENOENT" });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "screenshot",
      error: { code: "SCREENSHOT_INVALID" }
    });
  });

  it("does not create screenshot output directories when PNG IHDR is missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-shot-invalid-ihdr-"));
    const nested = join(dir, "nested");
    const output = join(nested, "screen.png");
    const driver = makeDriver([]);
    driver.screenshot.mockResolvedValueOnce({
      serial: "emulator-5554",
      png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      durationMs: 1
    });
    const io = makeIo();
    const exitCode = await runCli(["screenshot", "--output", output], {
      io,
      requestIdFactory: () => "req-screenshot-invalid-ihdr",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    await expect(access(nested)).rejects.toMatchObject({ code: "ENOENT" });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "screenshot",
      error: { code: "SCREENSHOT_INVALID" }
    });
  });

  it("does not overwrite screenshot output when PNG IHDR is missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-shot-invalid-ihdr-overwrite-"));
    const output = join(dir, "screen.png");
    await writeFile(output, "original");
    const driver = makeDriver([]);
    driver.screenshot.mockResolvedValueOnce({
      serial: "emulator-5554",
      png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      durationMs: 1
    });
    const io = makeIo();
    const exitCode = await runCli(["screenshot", "--output", output, "--overwrite"], {
      io,
      requestIdFactory: () => "req-screenshot-invalid-ihdr-overwrite",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    await expect(readFile(output, "utf8")).resolves.toBe("original");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "screenshot",
      error: { code: "SCREENSHOT_INVALID" }
    });
  });

  it("records a bounded screen MP4 to an atomic output path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-screenrecord-"));
    const output = join(dir, "screen.mp4");
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "screenrecord",
        "--output",
        output,
        "--duration",
        "2",
        "--bit-rate",
        "4000000",
        "--size",
        "1280x720",
        "--bugreport"
      ],
      {
        io,
        requestIdFactory: () => "req-screenrecord",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    await expect(readFile(output, "utf8")).resolves.toBe("pulled bytes");
    const remotePath = driver.recordScreen.mock.calls[0]?.[0].remotePath;
    expect(remotePath).toMatch(/^\/data\/local\/tmp\/autophone-screenrecord-[0-9a-f-]+\.mp4$/);
    expect(driver.recordScreen).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      remotePath,
      durationSeconds: 2,
      bitRateBps: 4_000_000,
      size: "1280x720",
      bugreport: true,
      timeoutMs: 17_000
    });
    expect(driver.pullFile).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      localPath: expect.stringContaining(".screen.mp4."),
      remotePath,
      compression: "adb_default",
      timeoutMs: 120_000
    });
    expect(driver.removeFile).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      remotePath,
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "screenrecord",
      device: { serial: "emulator-5554" },
      result: {
        device_serial: "emulator-5554",
        output_path: output,
        mime_type: "video/mp4",
        file_name: "screen.mp4",
        bytes: 12,
        overwritten: false,
        requested: {
          duration_seconds: 2,
          bit_rate_bps: 4_000_000,
          size: "1280x720",
          bugreport: true,
          display: "default"
        },
        recording: { method: "screenrecord", exit_code: 0 },
        transfer: { method: "adb_pull", exit_code: 0 },
        cleanup: { method: "device_rm", attempted: true, ok: true },
        verify: { policy: "screenrecord_exit_pull_host_file", ok: true, attempts: 3 },
        semantics: "bounded_default_display_video_evidence_no_audio_or_frame_completeness_guarantee"
      },
      warnings: [
        "screenrecord captures potentially sensitive on-screen content and records no audio",
        "screenrecord writes a temporary MP4 to device storage and removes it best-effort"
      ],
      trace: {
        duration_seconds: 2,
        record_timeout_ms: 17_000,
        pull_timeout_ms: 120_000,
        cleanup_timeout_ms: 10_000,
        output_bytes: 12,
        cleanup_ok: true
      }
    });
    expect(parsed.result.sha256).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("requires explicit serial for screenrecord before writing output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-screenrecord-no-serial-"));
    const output = join(dir, "screen.mp4");
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["screenrecord", "--output", output], {
      io,
      requestIdFactory: () => "req-screenrecord-no-serial",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    await expect(access(output)).rejects.toMatchObject({ code: "ENOENT" });
    expect(driver.recordScreen).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "screenrecord",
      error: { code: "INVALID_REQUEST", message: "screenrecord requires explicit --serial" }
    });
  });

  it("does not overwrite screenrecord output unless requested", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-screenrecord-exists-"));
    const output = join(dir, "screen.mp4");
    await writeFile(output, "original");
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "screenrecord", "--output", output], {
      io,
      requestIdFactory: () => "req-screenrecord-exists",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    await expect(readFile(output, "utf8")).resolves.toBe("original");
    expect(driver.recordScreen).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "screenrecord",
      error: { code: "OUTPUT_EXISTS", retriable: false }
    });
  });

  it("overwrites screenrecord output only with explicit opt-in", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-screenrecord-overwrite-"));
    const output = join(dir, "screen.mp4");
    await writeFile(output, "original");
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "screenrecord", "--output", output, "--overwrite"], {
      io,
      requestIdFactory: () => "req-screenrecord-overwrite",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    await expect(readFile(output, "utf8")).resolves.toBe("pulled bytes");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "screenrecord",
      result: { overwritten: true },
      warnings: [
        "screenrecord captures potentially sensitive on-screen content and records no audio",
        "screenrecord writes a temporary MP4 to device storage and removes it best-effort",
        "screenrecord output file was overwritten"
      ]
    });
  });

  it("rejects screenrecord timeouts that cannot cover the requested duration", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-screenrecord-timeout-"));
    const output = join(dir, "screen.mp4");
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      ["--serial", "emulator-5554", "screenrecord", "--output", output, "--duration", "5", "--record-timeout", "5000"],
      {
        io,
        requestIdFactory: () => "req-screenrecord-timeout",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.recordScreen).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "screenrecord",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("fails screenrecord when adb pull produces an empty MP4 and cleans temp output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-screenrecord-empty-"));
    const output = join(dir, "screen.mp4");
    const driver = makeDriver([]);
    driver.pullFile.mockImplementationOnce(async (request) => {
      await writeFile(request.localPath, "");
      return { serial: "emulator-5554", exitCode: 0, durationMs: 1 };
    });
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "screenrecord", "--output", output], {
      io,
      requestIdFactory: () => "req-screenrecord-empty",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    await expect(access(output)).rejects.toMatchObject({ code: "ENOENT" });
    expect(driver.removeFile).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "screenrecord",
      error: { code: "SCREENRECORD_FAILED", message: "screenrecord produced an empty host MP4" }
    });
  });

  it("reports screenrecord cleanup failure as a warning on otherwise successful output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-screenrecord-cleanup-"));
    const output = join(dir, "screen.mp4");
    const driver = makeDriver([]);
    driver.removeFile.mockRejectedValueOnce(
      new AutophoneError({ code: "FILE_RM_FAILED", message: "rm failed", retriable: false })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "screenrecord", "--output", output], {
      io,
      requestIdFactory: () => "req-screenrecord-cleanup",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "screenrecord",
      result: { cleanup: { attempted: true, ok: false, error_code: "FILE_RM_FAILED", reason: "rm failed" } },
      warnings: [
        "screenrecord captures potentially sensitive on-screen content and records no audio",
        "screenrecord writes a temporary MP4 to device storage and removes it best-effort",
        "screenrecord remote temp cleanup failed; device storage may contain a leftover MP4"
      ]
    });
  });

  it("wait ui succeeds when selector appears", async () => {
    const io = makeIo();
    const exitCode = await runCli(["wait", "ui", "--text", "Ready", "--wait-timeout", "200", "--interval", "50"], {
      io,
      requestIdFactory: () => "req-wait-ui",
      driverFactory: () => makeDriver([snapshot("hash-a", "Loading"), snapshot("hash-b", "Ready")])
    });

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "wait.ui",
      result: {
        condition: { type: "ui", selector: { text: "Ready" }, mode: "present" },
        present: true,
        matched_nodes: 1,
        attempts: 2,
        count: 1,
        candidates: [{ text: "Ready" }]
      },
      trace: { condition: "present" }
    });
  });

  it("wait ui succeeds when selector becomes absent", async () => {
    const io = makeIo();
    const exitCode = await runCli(
      ["wait", "ui", "--text", "Loading", "--condition", "absent", "--wait-timeout", "200", "--interval", "50"],
      {
        io,
        requestIdFactory: () => "req-wait-ui-absent",
        driverFactory: () => makeDriver([snapshot("hash-a", "Loading"), snapshot("hash-b", "Ready")])
      }
    );

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "wait.ui",
      result: {
        condition: { type: "ui", selector: { text: "Loading" }, mode: "absent" },
        present: false,
        matched_nodes: 0,
        attempts: 2,
        count: 0,
        candidates: []
      },
      trace: { condition: "absent" }
    });
  });

  it("wait app succeeds on package match", async () => {
    const io = makeIo();
    const exitCode = await runCli(["wait", "app", "--package", "com.example", "--wait-timeout", "200", "--interval", "50"], {
      io,
      requestIdFactory: () => "req-wait-app",
      driverFactory: () =>
        makeDriver(
          [],
          [
            { package: "com.other", activity: "com.other.HomeActivity", focused: true },
            { package: "com.example", activity: "com.example.SplashActivity", focused: true }
          ]
        )
    });

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "wait.app",
      device: { serial: "emulator-5554" },
      result: {
        condition: { type: "app", package_name: "com.example" },
        attempts: 2,
        current: { device_serial: "emulator-5554", package: "com.example" }
      }
    });
  });

  it("wait timeout returns WAIT_TIMEOUT", async () => {
    const io = makeIo();
    const exitCode = await runCli(["wait", "ui", "--text", "Ready", "--wait-timeout", "120", "--interval", "50"], {
      io,
      requestIdFactory: () => "req-wait-timeout",
      driverFactory: () =>
        makeDriver([
          snapshot("hash-a", "Loading"),
          snapshot("hash-a", "Loading"),
          snapshot("hash-a", "Loading"),
          snapshot("hash-a", "Loading")
        ])
    });

    expect(exitCode).toBe(2);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "wait.ui",
      error: { code: "WAIT_TIMEOUT", retriable: true, details: { mode: "present" } }
    });
  });

  it("wait app timeout returns WAIT_TIMEOUT without reading success envelope serial", async () => {
    const io = makeIo();
    const exitCode = await runCli(
      ["wait", "app", "--package", "com.target", "--wait-timeout", "120", "--interval", "50"],
      {
        io,
        requestIdFactory: () => "req-wait-app-timeout",
        driverFactory: () =>
          makeDriver(
            [],
            [
              { package: "com.other", activity: "com.other.HomeActivity", focused: true },
              { package: "com.other", activity: "com.other.HomeActivity", focused: true }
            ]
          )
      }
    );

    expect(exitCode).toBe(2);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed.device).toBeUndefined();
    expect(parsed).toMatchObject({
      ok: false,
      command: "wait.app",
      error: {
        code: "WAIT_TIMEOUT",
        retriable: true,
        details: {
          condition: "app",
          package_name: "com.target",
          current: { device_serial: "emulator-5554" }
        }
      }
    });
  });
});
