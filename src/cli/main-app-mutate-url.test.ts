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
} from "./main-test-utils.test-support.js";describe("CLI JSON output", () => {

  it("writes app start JSON after package foreground verification", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.other", activity: "com.other.HomeActivity", focused: true },
        { package: "com.example", activity: "com.example.SplashActivity", focused: true }
      ]
    );
    const io = makeIo();
    const exitCode = await runCli(["app", "start", "--package", "com.example", "--activity", ".LauncherActivity"], {
      io,
      requestIdFactory: () => "req-app-start",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.startActivity).toHaveBeenCalledWith({
      packageName: "com.example",
      activity: "com.example.LauncherActivity",
      component: "com.example/com.example.LauncherActivity",
      deviceSerial: "emulator-5554",
      timeoutMs: 10000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.start",
      device: { serial: "emulator-5554" },
      result: {
        requested: {
          component: "com.example/com.example.LauncherActivity",
          normalized_activity: "com.example.LauncherActivity"
        },
        before: { device_serial: "emulator-5554" },
        after: { device_serial: "emulator-5554" },
        verify: {
          policy: "package_foreground",
          ok: true
        }
      }
    });
  });

  it("writes app launch JSON after package foreground verification", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.other", activity: "com.other.HomeActivity", focused: true },
        { package: "com.example", activity: "com.example.MainActivity", focused: true }
      ]
    );
    const io = makeIo();
    const exitCode = await runCli(["app", "launch", "--package", "com.example"], {
      io,
      requestIdFactory: () => "req-app-launch",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.launchPackage).toHaveBeenCalledWith({
      packageName: "com.example",
      deviceSerial: "emulator-5554",
      timeoutMs: 10000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.launch",
      device: { serial: "emulator-5554" },
      result: {
        requested: { package_name: "com.example" },
        before: { device_serial: "emulator-5554" },
        after: { device_serial: "emulator-5554" },
        launch: { method: "monkey", exit_code: 0, command_duration_ms: 1 },
        verify: { policy: "package_foreground", ok: true }
      },
      trace: { launch_method: "monkey" }
    });
  });

  it("writes app resolve-url JSON without echoing the full URL and uses the resolved serial", async () => {
    const driver = makeDriver([]);
    const url = "https://example.com/path?token=secret#section";
    driver.resolveUrl.mockResolvedValueOnce(
      resolveUrlDriverResult({
        serial: "resolved-serial",
        resolution: {
          type: "activity",
          component: "com.android.browser/.BrowserActivity",
          package: "com.android.browser",
          activity: "com.android.browser.BrowserActivity",
          is_system_resolver: false
        },
        metadata: {
          priority: 0,
          preferred_order: 0,
          match: { raw: "0x208000", value: 2_129_920 },
          specific_index: -1,
          is_default: true
        },
        exitCode: 0,
        durationMs: 7
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "requested-serial", "app", "resolve-url", "--url", url], {
      io,
      requestIdFactory: () => "req-app-resolve-url",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.resolveUrl).toHaveBeenCalledWith({
      url,
      deviceSerial: "requested-serial",
      timeoutMs: 10000
    });
    expect(driver.openUrl).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(url);
    expect(io.stdoutText()).not.toContain("token=secret");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.resolve_url",
      device: { serial: "resolved-serial" },
      warnings: ["app resolve-url does not start the URL, prove handler launchability, or prove network/content loading"],
      result: {
        device_serial: "resolved-serial",
        requested: {
          scheme: "https",
          hostname: "example.com",
          port: null,
          path_present: true,
          query_present: true,
          fragment_present: true
        },
        resolution: {
          type: "activity",
          component: "com.android.browser/.BrowserActivity",
          package: "com.android.browser",
          activity: "com.android.browser.BrowserActivity",
          is_system_resolver: false
        },
        metadata: {
          priority: 0,
          preferred_order: 0,
          match: { raw: "0x208000", value: 2_129_920 },
          specific_index: -1,
          is_default: true
        },
        query: {
          method: "cmd_package_resolve_activity",
          exit_code: 0,
          command_duration_ms: 7
        },
        verify: {
          policy: "package_manager_resolve_activity_parse",
          ok: true,
          attempts: 1,
          reason: "Package Manager resolved the ACTION_VIEW URL intent to a concrete activity component"
        },
        semantics: "read_only_url_intent_resolution_not_launchability_or_network_proof"
      },
      trace: {
        timeout_ms: 10000,
        package_manager: "cmd package resolve-activity",
        intent_action: "android.intent.action.VIEW",
        url_scheme: "https",
        url_hostname: "example.com",
        resolution_type: "activity"
      }
    });
  });

  it("warns when app resolve-url returns the Android system chooser", async () => {
    const driver = makeDriver([]);
    driver.resolveUrl.mockResolvedValueOnce(
      resolveUrlDriverResult({
        resolution: {
          type: "resolver",
          component: "android/com.android.internal.app.ResolverActivity",
          package: "android",
          activity: "com.android.internal.app.ResolverActivity",
          is_system_resolver: true
        },
        metadata: null
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["app", "resolve-url", "--url", "https://example.com/"], {
      io,
      requestIdFactory: () => "req-app-resolve-url-resolver",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.resolve_url",
      warnings: [
        "app resolve-url returned the Android system chooser, not a concrete app handler",
        "app resolve-url does not start the URL, prove handler launchability, or prove network/content loading"
      ],
      result: {
        resolution: {
          type: "resolver",
          component: "android/com.android.internal.app.ResolverActivity",
          package: "android",
          activity: "com.android.internal.app.ResolverActivity",
          is_system_resolver: true
        },
        verify: {
          reason: "Package Manager resolved the ACTION_VIEW URL intent to the Android system chooser, not a concrete app handler"
        }
      },
      trace: { resolution_type: "resolver" }
    });
  });

  it("rejects unsafe app resolve-url schemes before driver calls and redacts trace argv", async () => {
    const driver = makeDriver([]);
    const driverFactory = vi.fn(() => driver);
    const io = makeIo();
    const url = "ftp://example.com/path?token=secret";
    const exitCode = await runCli(["app", "resolve-url", "--url", url], {
      io,
      requestIdFactory: () => "req-app-resolve-url-invalid",
      driverFactory
    });

    expect(exitCode).toBe(2);
    expect(driverFactory).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(url);
    expect(io.stdoutText()).not.toContain("token=secret");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.resolve_url",
      error: { code: "INVALID_REQUEST" },
      trace: { argv: ["app", "resolve-url", "--url", "<redacted>"] }
    });
  });

  it("redacts app resolve-url driver failure details", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const url = "https://example.com/path?token=secret#frag";
    driver.resolveUrl.mockRejectedValueOnce(
      new AutophoneError({
        code: "APP_RESOLVE_URL_FAILED",
        message: `unable to resolve ${url}`,
        retriable: false,
        details: {
          stdout: `Error: unable to resolve ${url}`,
          args: ["shell", "cmd", "package", "resolve-activity", "-d", url]
        }
      })
    );
    const exitCode = await runCli(["app", "resolve-url", `--url=${url}`], {
      io,
      requestIdFactory: () => "req-app-resolve-url-failed",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(io.stdoutText()).not.toContain(url);
    expect(io.stdoutText()).not.toContain("token=secret");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.resolve_url",
      error: {
        code: "APP_RESOLVE_URL_FAILED",
        message: "unable to resolve <redacted-url>",
        details: {
          stdout: "Error: unable to resolve <redacted-url>",
          args: ["shell", "cmd", "package", "resolve-activity", "-d", "<redacted-url>"]
        }
      },
      trace: { argv: ["app", "resolve-url", "--url=<redacted>"] }
    });
  });

  it("writes app open-url JSON without echoing the full URL", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.launcher", activity: "com.launcher.HomeActivity", focused: true },
        { package: "com.browser", activity: "com.browser.MainActivity", focused: true }
      ]
    );
    driver.openUrl.mockResolvedValueOnce({
      status: "ok",
      activity: "com.browser/.MainActivity",
      exitCode: 0,
      durationMs: 9
    });
    const io = makeIo();
    const url = "https://example.com/path?token=secret#section";
    const exitCode = await runCli(["app", "open-url", "--url", url], {
      io,
      requestIdFactory: () => "req-app-open-url",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.openUrl).toHaveBeenCalledWith({
      url,
      deviceSerial: "emulator-5554",
      timeoutMs: 10000
    });
    expect(io.stdoutText()).not.toContain(url);
    expect(io.stdoutText()).not.toContain("token=secret");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.open_url",
      device: { serial: "emulator-5554" },
      warnings: ["activity_manager_accepted does not verify URL content load"],
      result: {
        requested: {
          scheme: "https",
          hostname: "example.com",
          port: null,
          path_present: true,
          query_present: true,
          fragment_present: true
        },
        open: {
          method: "am_start_view",
          status: "ok",
          exit_code: 0,
          command_duration_ms: 9
        },
        before: { device_serial: "emulator-5554" },
        after: { device_serial: "emulator-5554" },
        verify: {
          policy: "activity_manager_accepted",
          ok: true,
          attempts: 1
        }
      },
      trace: {
        intent_action: "android.intent.action.VIEW",
        url_scheme: "https",
        url_hostname: "example.com"
      }
    });
  });

  it("rejects unsafe app open-url schemes before driver calls and redacts trace argv", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const url = "javascript:alert(1)";
    const exitCode = await runCli(["app", "open-url", "--url", url], {
      io,
      requestIdFactory: () => "req-app-open-url-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.openUrl).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(url);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.open_url",
      error: { code: "INVALID_REQUEST" },
      trace: { argv: ["app", "open-url", "--url", "<redacted>"] }
    });
  });

  it("redacts app open-url --url=value trace argv form", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const url = "javascript:alert(1)";
    const exitCode = await runCli(["app", "open-url", `--url=${url}`], {
      io,
      requestIdFactory: () => "req-app-open-url-invalid-joined",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.openUrl).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(url);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.open_url",
      trace: { argv: ["app", "open-url", "--url=<redacted>"] }
    });
  });

  it("redacts app install paths from CLI-layer error objects", () => {
    const apkPath = "/tmp/private/patient-secret.apk";
    const redacted = redactSensitiveError(
      {
        code: "INVALID_REQUEST",
        message: `failed reading ${apkPath}`,
        retriable: false,
        details: {
          path: apkPath,
          nested: ["prefix", apkPath]
        }
      },
      ["app", "install", "--apk", apkPath],
      "app.install"
    );

    expect(JSON.stringify(redacted)).not.toContain(apkPath);
    expect(redacted).toMatchObject({
      message: "failed reading <redacted>",
      details: {
        path: "<redacted>",
        nested: ["prefix", "<redacted>"]
      }
    });
  });

  it("redacts empty joined app open-url values without corrupting error text", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "open-url", "--url="], {
      io,
      requestIdFactory: () => "req-app-open-url-empty-joined",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.openUrl).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed.error.message).toBe(
      "Too small: expected string to have >=1 characters; url must be an http or https URL with a hostname and no credentials"
    );
    expect(parsed.error.message).not.toContain("<redacted-url>u<redacted-url>");
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.open_url",
      trace: { argv: ["app", "open-url", "--url=<redacted>"] }
    });
  });

  it("redacts app open-url --url=value driver failure details", async () => {
    const driver = makeDriver([], [{ package: "com.launcher", activity: "com.launcher.HomeActivity", focused: true }]);
    const io = makeIo();
    const url = "https://example.com/path?token=secret#frag";
    driver.openUrl.mockRejectedValueOnce(
      new AutophoneError({
        code: "APP_OPEN_URL_FAILED",
        message: `unable to resolve ${url}`,
        retriable: false,
        details: {
          stdout: `Error: unable to resolve ${url}`,
          args: ["shell", "am", "start", "-d", url]
        }
      })
    );
    const exitCode = await runCli(["app", "open-url", `--url=${url}`], {
      io,
      requestIdFactory: () => "req-app-open-url-joined-failed",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(io.stdoutText()).not.toContain(url);
    expect(io.stdoutText()).not.toContain("token=secret");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.open_url",
      error: {
        code: "APP_OPEN_URL_FAILED",
        message: "unable to resolve <redacted-url>",
        details: {
          stdout: "Error: unable to resolve <redacted-url>",
          args: ["shell", "am", "start", "-d", "<redacted-url>"]
        }
      },
      trace: { argv: ["app", "open-url", "--url=<redacted>"] }
    });
  });

  it("redacts app open-url driver failure details", async () => {
    const driver = makeDriver([], [{ package: "com.launcher", activity: "com.launcher.HomeActivity", focused: true }]);
    const url = "https://example.com/path?token=secret";
    driver.openUrl.mockRejectedValueOnce(
      new AutophoneError({
        code: "APP_OPEN_URL_FAILED",
        message: "unable to resolve <redacted-url>",
        retriable: false,
        details: {
          method: "am_start_view",
          stdout: "Error: unable to resolve <redacted-url>",
          stderr: "<redacted-url>"
        }
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["app", "open-url", "--url", url], {
      io,
      requestIdFactory: () => "req-app-open-url-failed",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(io.stdoutText()).not.toContain(url);
    expect(io.stdoutText()).not.toContain("token=secret");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.open_url",
      error: {
        code: "APP_OPEN_URL_FAILED",
        details: {
          stdout: "Error: unable to resolve <redacted-url>"
        }
      },
      trace: { argv: ["app", "open-url", "--url", "<redacted>"] }
    });
  });

  it("redacts every repeated app open-url value in driver failure details", async () => {
    const driver = makeDriver([], [{ package: "com.launcher", activity: "com.launcher.HomeActivity", focused: true }]);
    const firstUrl = "https://example.com/path?token=first";
    const secondUrl = "https://example.org/path?token=second";
    driver.openUrl.mockRejectedValueOnce(
      new AutophoneError({
        code: "APP_OPEN_URL_FAILED",
        message: `unable to resolve ${firstUrl} or ${secondUrl}`,
        retriable: false,
        details: {
          stdout: `Error: ${firstUrl}`,
          nested: { stderr: `Error: ${secondUrl}` },
          args: ["shell", "am", "start", "-d", secondUrl]
        }
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["app", "open-url", "--url", firstUrl, `--url=${secondUrl}`], {
      io,
      requestIdFactory: () => "req-app-open-url-repeated-failed",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(io.stdoutText()).not.toContain("token=first");
    expect(io.stdoutText()).not.toContain("token=second");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.open_url",
      error: {
        code: "APP_OPEN_URL_FAILED",
        message: "unable to resolve <redacted-url> or <redacted-url>",
        details: {
          stdout: "Error: <redacted-url>",
          nested: { stderr: "Error: <redacted-url>" },
          args: ["shell", "am", "start", "-d", "<redacted-url>"]
        }
      },
      trace: { argv: ["app", "open-url", "--url", "<redacted>", "--url=<redacted>"] }
    });
  });

  it("rejects invalid app launch package before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "launch", "--package", "bad;pkg"], {
      io,
      requestIdFactory: () => "req-app-launch-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.launchPackage).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.launch",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("writes app stop JSON after foreground_absent verification", async () => {
    const driver = makeDriver(
      [],
      [
        { package: "com.example", activity: "com.example.MainActivity", focused: true },
        { package: "com.launcher", activity: "com.launcher.HomeActivity", focused: true }
      ]
    );
    const io = makeIo();
    const exitCode = await runCli(["app", "stop", "--package", "com.example"], {
      io,
      requestIdFactory: () => "req-app-stop",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.stopPackage).toHaveBeenCalledWith({
      packageName: "com.example",
      deviceSerial: "emulator-5554",
      timeoutMs: 10000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.stop",
      device: { serial: "emulator-5554" },
      warnings: ["app stop foreground_absent verification does not prove background process absence"],
      result: {
        requested: { package_name: "com.example" },
        before: { device_serial: "emulator-5554" },
        after: { device_serial: "emulator-5554" },
        stop: { method: "am_force_stop", exit_code: 0, command_duration_ms: 1 },
        verify: { policy: "foreground_absent", ok: true }
      },
      trace: { stop_method: "am_force_stop" }
    });
  });

  it("rejects invalid app stop package before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "stop", "--package", "bad;pkg"], {
      io,
      requestIdFactory: () => "req-app-stop-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.stopPackage).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.stop",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("rejects invalid app stop verify policy before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "stop", "--package", "com.example", "--verify", "package_foreground"], {
      io,
      requestIdFactory: () => "req-app-stop-invalid-verify",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.stopPackage).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("rejects invalid app start component input before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "start", "--package", "com.example;rm", "--activity", ".MainActivity"], {
      io,
      requestIdFactory: () => "req-app-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.startActivity).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.start",
      error: { code: "INVALID_REQUEST" }
    });
  });
});
