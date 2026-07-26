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
  it("writes exactly one JSON object for observe", async () => {
    const io = makeIo();
    const exitCode = await runCli(["observe"], {
      io,
      requestIdFactory: () => "req-1",
      driverFactory: () => makeDriver([snapshot("hash-a", "Login")])
    });

    expect(exitCode).toBe(0);
    expect(io.stderrText()).toBe("");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "observe",
      request_id: "req-1",
      result: { snapshot: { device_serial: "emulator-5554" } }
    });
  });

  it("wraps argument errors in a JSON failure envelope", async () => {
    const io = makeIo();
    const exitCode = await runCli(["--timeout", "nope", "observe"], {
      io,
      requestIdFactory: () => "req-2",
      driverFactory: () => makeDriver([snapshot("hash-a", "Login")])
    });

    expect(exitCode).toBe(2);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("writes candidate JSON for find with one match", async () => {
    const io = makeIo();
    const exitCode = await runCli(["find", "--text", "Login"], {
      io,
      requestIdFactory: () => "req-find-1",
      driverFactory: () => makeDriver([snapshot("hash-a", "Login")])
    });

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "ui.find",
      device: { serial: "emulator-5554" },
      result: {
        snapshot_id: "snap_hash-a",
        count: 1,
        usable_only: true,
        candidates: [{ text: "Login", center: [15, 15] }]
      }
    });
  });

  it("find succeeds with zero candidates", async () => {
    const io = makeIo();
    const exitCode = await runCli(["find", "--text", "Missing"], {
      io,
      requestIdFactory: () => "req-find-0",
      driverFactory: () => makeDriver([snapshot("hash-a", "Login")])
    });

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      result: {
        count: 0,
        candidates: []
      }
    });
  });

  it("find succeeds with ambiguous candidates and does not tap", async () => {
    const driver = makeDriver([snapshot("hash-a", "OK", "OK")]);
    const io = makeIo();
    const exitCode = await runCli(["find", "--text", "OK"], {
      io,
      requestIdFactory: () => "req-find-2",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.tap).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      result: { count: 2 }
    });
  });

  it("find requires at least one selector flag", async () => {
    const driver = makeDriver([snapshot("hash-a", "OK")]);
    const io = makeIo();
    const exitCode = await runCli(["find"], {
      io,
      requestIdFactory: () => "req-find-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.observe).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "ui.find",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("find rejects blank selector values", async () => {
    const driver = makeDriver([snapshot("hash-a", "")]);
    const io = makeIo();
    const exitCode = await runCli(["find", "--text", ""], {
      io,
      requestIdFactory: () => "req-find-blank",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.observe).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "ui.find",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("does not execute tap when selector is ambiguous", async () => {
    const driver = makeDriver([snapshot("hash-a", "OK", "OK")]);
    const io = makeIo();
    const exitCode = await runCli(["tap", "--text", "OK"], {
      io,
      requestIdFactory: () => "req-3",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.tap).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      error: { code: "AMBIGUOUS_TARGET" }
    });
    expect(parsed.error.details.candidates).toHaveLength(2);
  });

  it("executes tap for an explicitly indexed ambiguous candidate", async () => {
    const driver = makeDriver([snapshot("hash-a", "OK", "OK")]);
    const io = makeIo();
    const exitCode = await runCli(["tap", "--text", "OK", "--candidate-index", "1", "--verify", "none"], {
      io,
      requestIdFactory: () => "req-tap-indexed",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.tap).toHaveBeenCalledWith([15, 35], { timeoutMs: 10000 });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "ui.tap",
      warnings: ["tap verification was explicitly disabled"],
      result: {
        candidate: { text: "OK", candidate_index: 1 },
        point: [15, 35],
        verify: { policy: "none", ok: true, attempts: 0 }
      },
      trace: {
        coordinate_source: "tree_bounds_candidate_index",
        candidate_index: 1
      }
    });
  });

  it("preserves candidate_index zero in tap trace output", async () => {
    const driver = makeDriver([snapshot("hash-a", "OK", "OK")]);
    const io = makeIo();
    const exitCode = await runCli(["tap", "--text", "OK", "--candidate-index", "0", "--verify", "none"], {
      io,
      requestIdFactory: () => "req-tap-index-zero",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.tap).toHaveBeenCalledWith([15, 15], { timeoutMs: 10000 });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      result: {
        candidate: { candidate_index: 0 },
        point: [15, 15]
      },
      trace: {
        coordinate_source: "tree_bounds_candidate_index",
        candidate_index: 0
      }
    });
  });

  it("rejects tap raw coordinates combined with candidate_index before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["tap", "--x", "10", "--y", "20", "--unsafe", "--candidate-index", "0"], {
      io,
      requestIdFactory: () => "req-tap-index-conflict",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.observe).not.toHaveBeenCalled();
    expect(driver.tap).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "ui.tap",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("rejects tap candidate_index without a selector before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["tap", "--candidate-index", "0"], {
      io,
      requestIdFactory: () => "req-tap-index-no-selector",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.observe).not.toHaveBeenCalled();
    expect(driver.tap).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "ui.tap",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("returns a clear JSON error when only one raw coordinate is supplied", async () => {
    const driver = makeDriver([snapshot("hash-a", "OK")]);
    const io = makeIo();
    const exitCode = await runCli(["tap", "--x", "100", "--unsafe"], {
      io,
      requestIdFactory: () => "req-4",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.observe).not.toHaveBeenCalled();
    expect(driver.tap).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message: "raw coordinates require both --x and --y"
      }
    });
  });

  it("writes double-tap JSON using one resolved selector target", async () => {
    const driver = makeDriver([snapshot("hash-a", "Photo"), snapshot("hash-b", "Zoomed photo")]);
    const io = makeIo();
    const exitCode = await runCli(["double-tap", "--text", "Photo", "--interval", "90"], {
      io,
      requestIdFactory: () => "req-double-tap",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.doubleTap).toHaveBeenCalledWith([15, 15], 90, { timeoutMs: 10000 });
    expect(driver.tap).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "ui.double_tap",
      device: { serial: "emulator-5554" },
      warnings: ["screen_changed verification does not prove semantic double-tap success"],
      result: {
        point: [15, 15],
        interval_ms: 90,
        verify: { policy: "screen_changed", ok: true, attempts: 1 }
      },
      trace: {
        coordinate_source: "tree_bounds",
        interval_ms: 90
      }
    });
  });

  it("writes double-tap JSON for an explicitly indexed ambiguous candidate", async () => {
    const driver = makeDriver([snapshot("hash-a", "Photo", "Photo")]);
    const io = makeIo();
    const exitCode = await runCli(
      ["--timeout", "2000", "double-tap", "--text", "Photo", "--candidate-index", "1", "--verify", "none"],
      {
        io,
        requestIdFactory: () => "req-double-tap-indexed",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.doubleTap).toHaveBeenCalledWith([15, 35], 80, { timeoutMs: 2000 });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "ui.double_tap",
      warnings: ["double-tap verification was explicitly disabled"],
      result: {
        candidate: { text: "Photo", candidate_index: 1 },
        point: [15, 35],
        interval_ms: 80,
        verify: { policy: "none", ok: true, attempts: 0 }
      },
      trace: {
        coordinate_source: "tree_bounds_candidate_index",
        candidate_index: 1,
        interval_ms: 80
      }
    });
  });

  it("writes double-tap JSON for explicitly unsafe raw coordinates", async () => {
    const driver = makeDriver([snapshot("hash-a", "Photo")]);
    const io = makeIo();
    const exitCode = await runCli(
      ["--timeout", "2000", "double-tap", "--x", "30", "--y", "40", "--unsafe", "--interval", "120", "--verify", "none"],
      {
        io,
        requestIdFactory: () => "req-double-tap-raw",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.doubleTap).toHaveBeenCalledWith([30, 40], 120, { timeoutMs: 2000 });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "ui.double_tap",
      result: {
        candidate: null,
        point: [30, 40],
        interval_ms: 120,
        verify: { policy: "none", ok: true, attempts: 0 }
      },
      trace: { coordinate_source: "unsafe_raw_point", interval_ms: 120 }
    });
  });

  it("rejects invalid double-tap options before driver calls", async () => {
    const cases: readonly string[][] = [
      ["double-tap", "--interval", "39", "--text", "Photo"],
      ["double-tap", "--interval", "301", "--text", "Photo"],
      ["--timeout", "1200", "double-tap", "--text", "Photo", "--interval", "300"],
      ["double-tap", "--x", "100", "--unsafe"],
      ["double-tap", "--x", "10", "--y", "20", "--unsafe", "--candidate-index", "0"],
      ["double-tap", "--candidate-index", "0"]
    ];

    for (const argv of cases) {
      const driver = makeDriver([]);
      const io = makeIo();
      const exitCode = await runCli(argv, {
        io,
        requestIdFactory: () => "req-double-tap-invalid",
        driverFactory: () => driver
      });

      expect(exitCode).toBe(2);
      expect(driver.observe).not.toHaveBeenCalled();
      expect(driver.doubleTap).not.toHaveBeenCalled();
      const parsed = JSON.parse(io.stdoutText());
      expect(parsed).toMatchObject({
        ok: false,
        command: "ui.double_tap",
        error: { code: "INVALID_REQUEST" }
      });
    }
  });

  it("writes long-press JSON using a zero-distance swipe", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item"), snapshot("hash-b", "Context menu")]);
    const io = makeIo();
    const exitCode = await runCli(["long-press", "--text", "Item", "--duration", "900"], {
      io,
      requestIdFactory: () => "req-long-press",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.swipe).toHaveBeenCalledWith([15, 15], [15, 15], 900, { timeoutMs: 10000 });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "ui.long_press",
      device: { serial: "emulator-5554" },
      result: {
        point: [15, 15],
        duration_ms: 900,
        verify: { policy: "screen_changed", ok: true, attempts: 1 }
      },
      trace: {
        coordinate_source: "tree_bounds",
        gesture: "input_swipe_same_point",
        duration_ms: 900
      }
    });
  });

  it("writes long-press JSON for an explicitly indexed ambiguous candidate", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item", "Item")]);
    const io = makeIo();
    const exitCode = await runCli(
      ["--timeout", "2000", "long-press", "--text", "Item", "--candidate-index", "1", "--duration", "800", "--verify", "none"],
      {
        io,
        requestIdFactory: () => "req-long-press-indexed",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.swipe).toHaveBeenCalledWith([15, 35], [15, 35], 800, { timeoutMs: 2000 });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "ui.long_press",
      result: {
        candidate: { text: "Item", candidate_index: 1 },
        point: [15, 35],
        verify: { policy: "none", ok: true, attempts: 0 }
      },
      trace: {
        coordinate_source: "tree_bounds_candidate_index",
        candidate_index: 1,
        gesture: "input_swipe_same_point"
      }
    });
  });

  it("writes long-press JSON for explicitly unsafe raw coordinates", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item")]);
    const io = makeIo();
    const exitCode = await runCli(
      ["--timeout", "2000", "long-press", "--x", "30", "--y", "40", "--unsafe", "--duration", "500", "--verify", "none"],
      {
        io,
        requestIdFactory: () => "req-long-press-raw",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.swipe).toHaveBeenCalledWith([30, 40], [30, 40], 500, { timeoutMs: 2000 });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "ui.long_press",
      warnings: ["long press verification was explicitly disabled"],
      result: {
        candidate: null,
        point: [30, 40],
        verify: { policy: "none", ok: true, attempts: 0 }
      },
      trace: { coordinate_source: "unsafe_raw_point" }
    });
  });

  it("rejects invalid long-press options before driver calls", async () => {
    const cases: readonly string[][] = [
      ["long-press", "--text", "Item", "--duration", "499"],
      ["--timeout", "1400", "long-press", "--text", "Item", "--duration", "500"],
      ["long-press", "--x", "100", "--unsafe"],
      ["long-press", "--x", "10", "--y", "20", "--unsafe", "--candidate-index", "0"],
      ["long-press", "--candidate-index", "0"]
    ];

    for (const argv of cases) {
      const driver = makeDriver([]);
      const io = makeIo();
      const exitCode = await runCli(argv, {
        io,
        requestIdFactory: () => "req-long-press-invalid",
        driverFactory: () => driver
      });

      expect(exitCode).toBe(2);
      expect(driver.observe).not.toHaveBeenCalled();
      expect(driver.swipe).not.toHaveBeenCalled();
      const parsed = JSON.parse(io.stdoutText());
      expect(parsed).toMatchObject({
        ok: false,
        command: "ui.long_press",
        error: { code: "INVALID_REQUEST" }
      });
    }
  });

  it("writes drag JSON with selector-derived endpoints and default no verification", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item", "Target")]);
    const io = makeIo();
    const exitCode = await runCli(["drag", "--from-text", "Item", "--to-text", "Target"], {
      io,
      requestIdFactory: () => "req-drag-default",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.drag).toHaveBeenCalledWith(
      [15, 15],
      [15, 35],
      1000,
      "draganddrop",
      expect.objectContaining({ timeoutMs: 10000 })
    );
    expect(driver.swipe).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "ui.drag",
      device: { serial: "emulator-5554" },
      warnings: ["drag verification is disabled; use --verify screen_changed only when a visible change is expected"],
      result: {
        from_candidate: { text: "Item" },
        to_candidate: { text: "Target" },
        start: [15, 15],
        end: [15, 35],
        gesture: "draganddrop",
        duration_ms: 1000,
        after: null,
        verify: { policy: "none", ok: true, attempts: 0 }
      },
      trace: {
        coordinate_source: "tree_bounds",
        gesture: "draganddrop",
        duration_ms: 1000
      }
    });
  });

  it("writes drag JSON for swipe gesture with explicit screen_changed verification", async () => {
    const driver = makeDriver([snapshot("hash-a", "Item", "Target"), snapshot("hash-b", "Item", "Target")]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--timeout",
        "4000",
        "drag",
        "--from-text",
        "Item",
        "--to-text",
        "Target",
        "--gesture",
        "swipe",
        "--duration",
        "1200",
        "--verify",
        "screen_changed"
      ],
      {
        io,
        requestIdFactory: () => "req-drag-swipe",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.drag).toHaveBeenCalledWith(
      [15, 15],
      [15, 35],
      1200,
      "swipe",
      expect.objectContaining({ timeoutMs: 4000 })
    );
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "ui.drag",
      warnings: ["screen_changed verification does not prove semantic drag-and-drop success"],
      result: {
        gesture: "swipe",
        duration_ms: 1200,
        verify: { policy: "screen_changed", ok: true, attempts: 1, changed_fields: ["ui_hash"] }
      },
      trace: {
        timeout_ms: 4000,
        gesture: "swipe",
        duration_ms: 1200
      }
    });
  });

  it("rejects drag without both endpoint selectors before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["drag", "--from-text", "Item"], {
      io,
      requestIdFactory: () => "req-drag-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.observe).not.toHaveBeenCalled();
    expect(driver.drag).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "ui.drag",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("writes scroll JSON with window-derived coordinates and default no verification", async () => {
    const driver = makeDriver([{ ...snapshot("hash-a", "List"), window_size: [100, 200] as [number, number] }]);
    const io = makeIo();
    const exitCode = await runCli(["scroll", "--direction", "down"], {
      io,
      requestIdFactory: () => "req-scroll-down",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.swipe).toHaveBeenCalledWith([50, 135], [50, 65], 300, { timeoutMs: 10000 });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "ui.scroll",
      device: { serial: "emulator-5554" },
      warnings: ["scroll verification is disabled; use --verify screen_changed only when movement is expected"],
      result: {
        direction: "down",
        amount: "medium",
        finger_direction: "up",
        start: [50, 135],
        end: [50, 65],
        duration_ms: 300,
        verify: { policy: "none", ok: true, attempts: 0 }
      },
      trace: {
        coordinate_source: "window_size_derived",
        direction: "down",
        finger_direction: "up"
      }
    });
  });

  it("writes scroll JSON with element-scoped coordinates", async () => {
    const driver = makeDriver([
      {
        ...snapshot("hash-a"),
        window_size: [100, 200] as [number, number],
        elements: [
          {
            source_index: 0,
            text: "List",
            resource_id: "id/list",
            content_desc: "",
            class_name: "android.widget.ScrollView",
            package_name: "com.example",
            bounds: [10, 20, 90, 180] as [number, number, number, number],
            enabled: true,
            clickable: false,
            focused: false
          }
        ]
      }
    ]);
    const io = makeIo();
    const exitCode = await runCli(["scroll", "--direction", "down", "--within-resource-id", "id/list"], {
      io,
      requestIdFactory: () => "req-scroll-within",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.swipe).toHaveBeenCalledWith([50, 128], [50, 72], 300, { timeoutMs: 10000 });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "ui.scroll",
      result: {
        scope: "element",
        within: {
          selector: { resource_id: "id/list" },
          candidate: { text: "List", bounds: [10, 20, 90, 180], candidate_index: 0 }
        },
        start: [50, 128],
        end: [50, 72]
      },
      trace: {
        coordinate_source: "tree_bounds",
        scope: "element",
        within_candidate_index: 0
      }
    });
  });

  it("rejects invalid scroll options before driver calls", async () => {
    const cases: readonly string[][] = [
      ["scroll", "--direction", "diagonal"],
      ["scroll", "--direction", "down", "--amount", "huge"],
      ["--timeout", "200", "scroll", "--direction", "down", "--duration", "300"]
    ];

    for (const argv of cases) {
      const driver = makeDriver([]);
      const io = makeIo();
      const exitCode = await runCli(argv, {
        io,
        requestIdFactory: () => "req-scroll-invalid",
        driverFactory: () => driver
      });

      expect(exitCode).toBe(2);
      expect(driver.observe).not.toHaveBeenCalled();
      expect(driver.swipe).not.toHaveBeenCalled();
      const parsed = JSON.parse(io.stdoutText());
      expect(parsed).toMatchObject({
        ok: false,
        command: "ui.scroll",
        error: { code: "INVALID_REQUEST" }
      });
    }
  });

  it("writes scroll-until JSON when a selector appears after scrolling", async () => {
    const driver = makeDriver([
      { ...snapshot("hash-a", "List"), window_size: [100, 200] as [number, number] },
      { ...snapshot("hash-b", "Target"), window_size: [100, 200] as [number, number] }
    ]);
    const io = makeIo();
    const exitCode = await runCli(
      ["scroll-until", "--direction", "down", "--text", "Target", "--max-scrolls", "3"],
      {
        io,
        requestIdFactory: () => "req-scroll-until",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.swipe).toHaveBeenCalledWith([50, 135], [50, 65], 300, { timeoutMs: 10000 });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "ui.scroll_until",
      warnings: [],
      result: {
        selector: { text: "Target" },
        found: true,
        reason: "found_after_scroll",
        scrolls: 1,
        count: 1,
        last_scroll: {
          finger_direction: "up",
          changed_fields: ["ui_hash"]
        }
      },
      trace: {
        coordinate_source: "window_size_derived",
        direction: "down",
        max_scrolls: 3,
        scrolls: 1,
        reason: "found_after_scroll"
      }
    });
  });

  it("writes scroll-until JSON with an element-scoped scroll target", async () => {
    const first = {
      ...snapshot("hash-a"),
      window_size: [100, 200] as [number, number],
      elements: [
        {
          source_index: 0,
          text: "List",
          resource_id: "id/list",
          content_desc: "",
          class_name: "android.widget.ScrollView",
          package_name: "com.example",
          bounds: [10, 20, 90, 180] as [number, number, number, number],
          enabled: true,
          clickable: false,
          focused: false
        }
      ]
    };
    const second = {
      ...snapshot("hash-b", "Target"),
      window_size: [100, 200] as [number, number],
      elements: [first.elements[0]!, ...snapshot("hash-b", "Target").elements]
    };
    const driver = makeDriver([first, second]);
    const io = makeIo();
    const exitCode = await runCli(
      ["scroll-until", "--direction", "down", "--text", "Target", "--within-resource-id", "id/list"],
      {
        io,
        requestIdFactory: () => "req-scroll-until-within",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.swipe).toHaveBeenCalledWith([50, 128], [50, 72], 300, { timeoutMs: 10000 });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "ui.scroll_until",
      result: {
        scope: "element",
        within: { resource_id: "id/list" },
        last_scroll: {
          scope: "element",
          within_candidate: { resource_id: "id/list", candidate_index: 0 }
        }
      },
      trace: {
        coordinate_source: "tree_bounds",
        scope: "element",
        within_candidate_index: 0
      }
    });
  });

  it("writes scroll-until JSON with a not-found warning when the end is reached", async () => {
    const driver = makeDriver([
      { ...snapshot("hash-a", "List"), window_size: [100, 200] as [number, number] },
      { ...snapshot("hash-a", "List"), window_size: [100, 200] as [number, number] }
    ]);
    const io = makeIo();
    const exitCode = await runCli(["scroll-until", "--direction", "down", "--text", "Missing"], {
      io,
      requestIdFactory: () => "req-scroll-until-missing",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "ui.scroll_until",
      warnings: ["selector not found: end_reached"],
      result: {
        found: false,
        reason: "end_reached",
        scrolls: 1,
        count: 0
      }
    });
  });

  it("rejects invalid scroll-until options before driver calls", async () => {
    const cases: readonly string[][] = [
      ["scroll-until", "--direction", "down"],
      ["scroll-until", "--direction", "down", "--text", "Target", "--max-scrolls", "0"],
      ["scroll-until", "--direction", "down", "--text", "Target", "--max-scrolls", "26"],
      ["--timeout", "200", "scroll-until", "--direction", "down", "--text", "Target", "--duration", "300"]
    ];

    for (const argv of cases) {
      const driver = makeDriver([]);
      const io = makeIo();
      const exitCode = await runCli(argv, {
        io,
        requestIdFactory: () => "req-scroll-until-invalid",
        driverFactory: () => driver
      });

      expect(exitCode).toBe(2);
      expect(driver.observe).not.toHaveBeenCalled();
      expect(driver.swipe).not.toHaveBeenCalled();
      const parsed = JSON.parse(io.stdoutText());
      expect(parsed).toMatchObject({
        ok: false,
        command: "ui.scroll_until",
        error: { code: "INVALID_REQUEST" }
      });
    }
  });
});
