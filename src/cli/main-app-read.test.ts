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
  it("lists installed app packages with normalized filters and selected device metadata", async () => {
    const driver = makeDriver([], [], [], {
      serial: "emulator-5554",
      packages: ["android", "com.example.app"]
    });
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "app",
        "list",
        "--scope",
        "third-party",
        "--state",
        "enabled",
        "--include-uninstalled",
        "--filter",
        "example"
      ],
      {
        io,
        requestIdFactory: () => "req-app-list",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.listPackages).toHaveBeenCalledWith({
      scope: "third_party",
      state: "enabled",
      includeUninstalled: true,
      filter: "example",
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.list",
      device: { serial: "emulator-5554" },
      result: {
        device_serial: "emulator-5554",
        packages: ["android", "com.example.app"],
        count: 2,
        scope: "third_party",
        state: "enabled",
        include_uninstalled: true,
        filter: "example"
      },
      trace: {
        package_manager: "pm",
        scope: "third_party",
        state: "enabled",
        include_uninstalled: true,
        filter_mode: "substring"
      }
    });
  });

  it("rejects unsafe app list filters before calling the driver", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "list", "--filter", "bad;filter"], {
      io,
      requestIdFactory: () => "req-app-list-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.listPackages).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.list",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("rejects empty app list filters before calling the driver", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "list", "--filter", ""], {
      io,
      requestIdFactory: () => "req-app-list-empty-filter",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.listPackages).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.list",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("rejects unknown app list scopes before calling the driver", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "list", "--scope", "bogus"], {
      io,
      requestIdFactory: () => "req-app-list-bad-scope",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.listPackages).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "unknown",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("writes app inspect JSON for an installed package without requiring explicit serial", async () => {
    const driver = makeDriver([]);
    driver.inspectPackage.mockResolvedValueOnce({
      serial: "emulator-5554",
      installed: true,
      paths: ["/data/app/com.example/base.apk", "/data/app/com.example/split_config.apk"],
      exitCode: 0,
      durationMs: 4
    });
    const io = makeIo();
    const exitCode = await runCli(["app", "inspect", "--package", "com.example.app", "--user", "0"], {
      io,
      requestIdFactory: () => "req-app-inspect",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.inspectPackage).toHaveBeenCalledWith({
      packageName: "com.example.app",
      userId: 0,
      deviceSerial: undefined,
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.inspect",
      device: { serial: "emulator-5554" },
      warnings: ["app inspect returns device APK paths; it does not parse package metadata"],
      result: {
        device_serial: "emulator-5554",
        requested: {
          package_name: "com.example.app",
          user_id: 0
        },
        installed: true,
        paths: ["/data/app/com.example/base.apk", "/data/app/com.example/split_config.apk"],
        path_count: 2,
        query: { method: "pm_path", exit_code: 0, command_duration_ms: 4 },
        verify: { policy: "pm_path_presence", ok: true, attempts: 1 }
      },
      trace: {
        package_manager: "pm",
        query: "path",
        user_scope: "explicit_user"
      }
    });
  });

  it("writes app inspect JSON for an absent package", async () => {
    const driver = makeDriver([]);
    driver.inspectPackage.mockResolvedValueOnce({
      serial: "emulator-5554",
      installed: false,
      paths: [],
      exitCode: 1,
      durationMs: 3
    });
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "app", "inspect", "--package", "com.example.missing"], {
      io,
      requestIdFactory: () => "req-app-inspect-absent",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.inspectPackage).toHaveBeenCalledWith({
      packageName: "com.example.missing",
      userId: undefined,
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.inspect",
      warnings: ["app inspect absence means pm path returned no package file path entries"],
      result: {
        installed: false,
        paths: [],
        path_count: 0,
        verify: {
          policy: "pm_path_presence",
          ok: true,
          reason: "pm path returned no package file path entries"
        }
      },
      trace: { user_scope: "system_default" }
    });
  });

  it("rejects unsafe app inspect packages before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "inspect", "--package", "bad;pkg"], {
      io,
      requestIdFactory: () => "req-app-inspect-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.inspectPackage).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.inspect",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("writes app activities JSON for launcher intent without requiring explicit serial", async () => {
    const driver = makeDriver([]);
    driver.getAppActivities.mockResolvedValueOnce(appActivitiesDriverResult({ serial: "resolved-device" }));
    const io = makeIo();
    const exitCode = await runCli(["app", "activities", "--package", "com.example.app"], {
      io,
      requestIdFactory: () => "req-app-activities",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getAppActivities).toHaveBeenCalledWith({
      packageName: "com.example.app",
      intent: "launcher",
      deviceSerial: undefined,
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.activities",
      device: { serial: "resolved-device" },
      warnings: [
        "app activities is read-only and reports Package Manager intent query results; it does not start an activity",
        "No activities found does not prove package absence, install state, or per-user launchability"
      ],
      result: {
        device_serial: "resolved-device",
        requested: { package_name: "com.example.app", intent: "launcher" },
        found: true,
        activities: [
          {
            component: "com.example.app/.MainActivity",
            package_name: "com.example.app",
            activity: "com.example.app.MainActivity",
            relative_activity: ".MainActivity"
          }
        ],
        activity_count: 1,
        query: { method: "cmd_package_query_activities", exit_code: 0, command_duration_ms: 5 },
        verify: { policy: "cmd_package_query_activities_parse", ok: true, attempts: 1 },
        semantics: "read_only_intent_activity_query_not_install_or_launchability_proof"
      },
      trace: {
        timeout_ms: 10_000,
        package_name: "com.example.app",
        intent: "launcher",
        query: "cmd_package_query_activities",
        found: true,
        activity_count: 1
      }
    });
  });

  it("writes app activities JSON when no launcher activities are found", async () => {
    const driver = makeDriver([]);
    driver.getAppActivities.mockResolvedValueOnce(appActivitiesDriverResult({ activities: [], exitCode: 0, durationMs: 3 }));
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "app", "activities", "--package", "com.example.no.launcher"], {
      io,
      requestIdFactory: () => "req-app-activities-empty",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getAppActivities).toHaveBeenCalledWith({
      packageName: "com.example.no.launcher",
      intent: "launcher",
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.activities",
      device: { serial: "emulator-5554" },
      result: {
        requested: { package_name: "com.example.no.launcher", intent: "launcher" },
        found: false,
        activities: [],
        activity_count: 0,
        verify: { reason: "package manager returned no activities for the requested intent" }
      },
      trace: {
        found: false,
        activity_count: 0
      }
    });
    expect(parsed.result).not.toHaveProperty("installed");
    expect(parsed.result).not.toHaveProperty("package_found");
  });

  it("rejects unsupported app activities intents before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "activities", "--package", "com.example.app", "--intent", "home"], {
      io,
      requestIdFactory: () => "req-app-activities-bad-intent",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.getAppActivities).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "unknown",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("writes app package-info JSON for an installed package without requiring explicit serial", async () => {
    const driver = makeDriver([]);
    driver.getAppPackageInfo.mockResolvedValueOnce(packageInfoDriverResult({ serial: "resolved-device" }));
    const io = makeIo();
    const exitCode = await runCli(["app", "package-info", "--package", "com.example.app"], {
      io,
      requestIdFactory: () => "req-app-package-info",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getAppPackageInfo).toHaveBeenCalledWith({
      packageName: "com.example.app",
      deviceSerial: undefined,
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.package_info",
      device: { serial: "resolved-device" },
      warnings: [
        "app package-info parses only the active Package Manager metadata block",
        "app package-info does not parse permissions, signatures, per-user install state, or raw dumps"
      ],
      result: {
        device_serial: "resolved-device",
        requested: { package_name: "com.example.app" },
        installed: true,
        package: {
          package_name: "com.example.app",
          app_id: 10134,
          version: { code: 42, min_sdk: 23, target_sdk: 35, name: "1.2.3" },
          installer: { package_name: "com.android.vending", uid: 10031 }
        },
        query: { method: "dumpsys_package", exit_code: 0, command_duration_ms: 5 },
        verify: { policy: "dumpsys_active_package_block", ok: true, attempts: 1 },
        semantics: "package_dump_active_block_not_hidden_not_permissions_not_signatures"
      },
      trace: {
        timeout_ms: 10_000,
        package_name: "com.example.app",
        query: "dumpsys_package",
        installed: true,
        version_code: 42
      }
    });
  });

  it("writes app package-info JSON for an absent package", async () => {
    const driver = makeDriver([]);
    driver.getAppPackageInfo.mockResolvedValueOnce(
      packageInfoDriverResult({ installed: false, packageInfo: null, exitCode: 0, durationMs: 3 })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "app", "package-info", "--package", "com.example.missing"], {
      io,
      requestIdFactory: () => "req-app-package-info-absent",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getAppPackageInfo).toHaveBeenCalledWith({
      packageName: "com.example.missing",
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.package_info",
      device: { serial: "emulator-5554" },
      warnings: [
        "app package-info absence means dumpsys package reported the exact package was not found",
        "app package-info does not parse permissions, signatures, per-user install state, or raw dumps"
      ],
      result: {
        device_serial: "emulator-5554",
        requested: { package_name: "com.example.missing" },
        installed: false,
        package: null,
        verify: { reason: "dumpsys package reported package absence" }
      },
      trace: {
        installed: false,
        version_code: null
      }
    });
  });

  it("rejects unsafe app package-info packages before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "package-info", "--package", "bad;pkg"], {
      io,
      requestIdFactory: () => "req-app-package-info-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.getAppPackageInfo).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.package_info",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("writes app links JSON for global domain verification state", async () => {
    const driver = makeDriver([]);
    driver.getAppLinks.mockResolvedValueOnce(appLinksDriverResult({ serial: "resolved-device" }));
    const io = makeIo();
    const exitCode = await runCli(["app", "links", "--package", "com.example.app"], {
      io,
      requestIdFactory: () => "req-app-links",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getAppLinks).toHaveBeenCalledWith({
      packageName: "com.example.app",
      deviceSerial: undefined,
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.links",
      device: { serial: "resolved-device" },
      warnings: [
        "app links reports global domain verification state only",
        "app links does not prove URL resolution, launchability, network access, or per-user link selection",
        "app links intentionally does not expose package signatures or domain-verification IDs"
      ],
      result: {
        device_serial: "resolved-device",
        requested: { package_name: "com.example.app" },
        package_found: true,
        domains: [{ domain: "example.com", state: { raw: "verified", kind: "known", code: null } }],
        domain_count: 1,
        query: { method: "cmd_package_get_app_links", exit_code: 0, command_duration_ms: 5 },
        verify: { policy: "cmd_package_get_app_links_parse", ok: true, attempts: 1 },
        semantics: "read_only_global_domain_verification_state_not_url_resolution_or_per_user_selection_or_signatures"
      },
      trace: {
        timeout_ms: 10_000,
        package_name: "com.example.app",
        package_manager: "cmd package get-app-links",
        package_found: true,
        domain_count: 1
      }
    });
  });

  it("writes app links JSON for unavailable packages as absence", async () => {
    const driver = makeDriver([]);
    driver.getAppLinks.mockResolvedValueOnce(
      appLinksDriverResult({ packageFound: false, domains: [], exitCode: 1, durationMs: 3 })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "app", "links", "--package", "com.example.missing"], {
      io,
      requestIdFactory: () => "req-app-links-absent",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.links",
      device: { serial: "emulator-5554" },
      warnings: [
        "app links package absence means Package Manager reported the package unavailable",
        "app links does not prove URL resolution, launchability, network access, or per-user link selection",
        "app links intentionally does not expose package signatures or domain-verification IDs"
      ],
      result: {
        package_found: false,
        domains: [],
        domain_count: 0,
        query: { exit_code: 1, command_duration_ms: 3 },
        verify: {
          reason: "Package Manager reported the package unavailable for app link domain verification state"
        }
      },
      trace: {
        package_found: false,
        domain_count: 0
      }
    });
  });

  it("rejects unsafe app links packages before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "links", "--package", "bad;pkg"], {
      io,
      requestIdFactory: () => "req-app-links-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.getAppLinks).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.links",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("writes app appops get JSON for one operation", async () => {
    const driver = makeDriver([]);
    driver.getAppOps.mockResolvedValueOnce(appOpsDriverResult({ serial: "resolved-device" }));
    const io = makeIo();
    const exitCode = await runCli(["app", "appops", "get", "--package", "com.example.app", "--op", "CAMERA", "--user", "0"], {
      io,
      requestIdFactory: () => "req-appops-get",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getAppOps).toHaveBeenCalledWith({
      packageName: "com.example.app",
      opName: "CAMERA",
      userId: 0,
      deviceSerial: undefined,
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.appops_get",
      device: { serial: "resolved-device" },
      warnings: [
        "app appops get reads AppOps state only; it does not evaluate runtime permissions or effective app behavior",
        "default queried user is the AppOps command default unless --user is supplied",
        "app appops get intentionally rejects UID targets, numeric ops, MIUIOP(...) tokens, and mutating appops commands"
      ],
      result: {
        device_serial: "resolved-device",
        requested: { package_name: "com.example.app", op_name: "CAMERA", user_id: 0 },
        lookup: { status: "resolved", uid_resolved: true, reason: "appops_uid_resolved" },
        default_mode: null,
        entry_count: 2,
        entries: [
          { scope: "uid", op_name: "CAMERA", mode: { raw: "foreground", kind: "foreground" } },
          { scope: "package", op_name: "CAMERA", mode: { raw: "allow", kind: "allow" } }
        ],
        query: { method: "cmd_appops_get", exit_code: 0, command_duration_ms: 5 },
        verify: { policy: "cmd_appops_get_single_op_parse", ok: true, attempts: 1 },
        semantics: "read_only_appops_single_op_snapshot_not_runtime_permission_or_effective_behavior_proof"
      },
      trace: {
        timeout_ms: 10_000,
        appops: "cmd appops get",
        package_name: "com.example.app",
        op_name: "CAMERA",
        user_scope: "explicit_user",
        lookup_status: "resolved",
        entry_count: 2,
        has_default_mode: false
      }
    });
  });

  it("writes app appops get JSON for no_uid without package absence wording", async () => {
    const driver = makeDriver([]);
    driver.getAppOps.mockResolvedValueOnce(
      appOpsDriverResult({
        lookup: { status: "no_uid", uid_resolved: false, reason: "no_appops_uid_for_package_in_queried_user" },
        defaultMode: null,
        entries: []
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["app", "appops", "get", "--package", "com.example.missing", "--op", "CAMERA"], {
      io,
      requestIdFactory: () => "req-appops-no-uid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.appops_get",
      warnings: [
        "app appops get reads AppOps state only; it does not evaluate runtime permissions or effective app behavior",
        "no_uid means AppOps did not resolve a package UID in the queried user; it is not proof of package absence",
        "app appops get intentionally rejects UID targets, numeric ops, MIUIOP(...) tokens, and mutating appops commands"
      ],
      result: {
        lookup: { status: "no_uid", uid_resolved: false },
        entries: [],
        entry_count: 0
      },
      trace: {
        user_scope: "appops_default_user",
        lookup_status: "no_uid",
        entry_count: 0
      }
    });
  });

  it("rejects unsafe appops requests before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "appops", "get", "--package", "com.example.app", "--op", "MIUIOP(10001)"], {
      io,
      requestIdFactory: () => "req-appops-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.getAppOps).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.appops_get",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("writes app pids JSON without requiring explicit serial", async () => {
    const driver = makeDriver([]);
    driver.getPackagePidSnapshot.mockResolvedValueOnce({
      serial: "resolved-device",
      pids: [1234, 5678],
      exitCode: 0,
      durationMs: 4
    });
    const io = makeIo();
    const exitCode = await runCli(["app", "pids", "--package", "com.example.app"], {
      io,
      requestIdFactory: () => "req-app-pids",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getPackagePidSnapshot).toHaveBeenCalledWith({
      packageName: "com.example.app",
      deviceSerial: undefined,
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.pids",
      device: { serial: "resolved-device" },
      warnings: ["app pids is a point-in-time pidof snapshot; process IDs can exit or restart immediately after the command"],
      result: {
        device_serial: "resolved-device",
        package_name: "com.example.app",
        running: true,
        pids: [1234, 5678],
        pid_count: 2,
        query: { method: "pidof", exit_code: 0, command_duration_ms: 4 },
        verify: { policy: "pidof_process_snapshot", ok: true, attempts: 1 },
        semantics: "read_only_pid_snapshot_not_process_liveness_guarantee"
      },
      trace: {
        timeout_ms: 10_000,
        package_name: "com.example.app",
        query: "pidof",
        running: true,
        pid_count: 2
      }
    });
  });

  it("writes app pids JSON for a non-running package", async () => {
    const driver = makeDriver([]);
    driver.getPackagePidSnapshot.mockResolvedValueOnce({
      serial: "emulator-5554",
      pids: [],
      exitCode: 1,
      durationMs: 3
    });
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "app", "pids", "--package", "com.example.missing"], {
      io,
      requestIdFactory: () => "req-app-pids-absent",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getPackagePidSnapshot).toHaveBeenCalledWith({
      packageName: "com.example.missing",
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.pids",
      device: { serial: "emulator-5554" },
      result: {
        device_serial: "emulator-5554",
        package_name: "com.example.missing",
        running: false,
        pids: [],
        pid_count: 0,
        query: { exit_code: 1 },
        verify: { reason: "pidof returned no process identifiers for the package" }
      }
    });
  });

  it("rejects invalid app pids packages before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "pids", "--package", "android"], {
      io,
      requestIdFactory: () => "req-app-pids-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.getPackagePidSnapshot).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.pids",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("writes app memory JSON without requiring explicit serial", async () => {
    const driver = makeDriver([]);
    driver.getAppMemorySnapshot.mockResolvedValueOnce(memoryDriverResult({ serial: "resolved-device" }));
    const io = makeIo();
    const exitCode = await runCli(["app", "memory", "--package", "com.example.app"], {
      io,
      requestIdFactory: () => "req-app-memory",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getAppMemorySnapshot).toHaveBeenCalledWith({
      packageName: "com.example.app",
      deviceSerial: undefined,
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.memory",
      device: { serial: "resolved-device" },
      warnings: [
        "app memory is a point-in-time dumpsys meminfo snapshot; it does not prove sustained memory use, leaks, or all package processes"
      ],
      result: {
        device_serial: "resolved-device",
        requested: { package_name: "com.example.app" },
        running: true,
        processes: [{ pid: 1234, process_name: "com.example.app" }],
        process_count: 1,
        memory: {
          units: "kb",
          totals: { total_pss_kb: 63795, total_rss_kb: 173308, total_swap_pss_kb: 10643 }
        },
        query: { method: "dumpsys_meminfo", exit_code: 0, command_duration_ms: 5 },
        verify: { policy: "dumpsys_meminfo_app_summary_snapshot", ok: true, attempts: 1 },
        semantics: "read_only_memory_snapshot_point_in_time_not_sustained_usage_guarantee"
      },
      trace: {
        timeout_ms: 10_000,
        package_name: "com.example.app",
        query: "dumpsys_meminfo",
        running: true,
        process_count: 1
      }
    });
  });

  it("writes app memory JSON for a non-running package", async () => {
    const driver = makeDriver([]);
    driver.getAppMemorySnapshot.mockResolvedValueOnce(
      memoryDriverResult({ running: false, processes: [], memory: emptyMemorySnapshot(), exitCode: 0 })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "app", "memory", "--package", "com.example.missing"], {
      io,
      requestIdFactory: () => "req-app-memory-absent",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getAppMemorySnapshot).toHaveBeenCalledWith({
      packageName: "com.example.missing",
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.memory",
      device: { serial: "emulator-5554" },
      result: {
        requested: { package_name: "com.example.missing" },
        running: false,
        processes: [],
        process_count: 0,
        memory: emptyMemorySnapshot(),
        verify: { reason: "dumpsys meminfo reported no running process for the package" }
      }
    });
  });

  it("rejects invalid app memory packages before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "memory", "--package", "android"], {
      io,
      requestIdFactory: () => "req-app-memory-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.getAppMemorySnapshot).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.memory",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("writes app graphics JSON without requiring explicit serial", async () => {
    const driver = makeDriver([]);
    driver.getAppGraphicsSnapshot.mockResolvedValueOnce(graphicsDriverResult({ serial: "resolved-device" }));
    const io = makeIo();
    const exitCode = await runCli(["app", "graphics", "--package", "com.example.app"], {
      io,
      requestIdFactory: () => "req-app-graphics",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getAppGraphicsSnapshot).toHaveBeenCalledWith({
      packageName: "com.example.app",
      deviceSerial: undefined,
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.graphics",
      device: { serial: "resolved-device" },
      warnings: [
        "app graphics is a point-in-time dumpsys gfxinfo summary since the graphics stats reset; it does not prove sustained performance, leaks, or all package processes"
      ],
      result: {
        device_serial: "resolved-device",
        requested: { package_name: "com.example.app" },
        running: true,
        processes: [{ pid: 1234, process_name: "com.example.app" }],
        process_count: 1,
        graphics: {
          stats_since_ns: "91522723936145",
          total_frames_rendered: 6266,
          janky_frames: { count: 489, percent: 7.8 }
        },
        query: { method: "dumpsys_gfxinfo", exit_code: 0, command_duration_ms: 5 },
        verify: { policy: "dumpsys_gfxinfo_frame_summary_snapshot", ok: true, attempts: 1 },
        semantics: "read_only_graphics_summary_since_last_reset_not_sustained_performance_guarantee"
      },
      trace: {
        timeout_ms: 10_000,
        package_name: "com.example.app",
        query: "dumpsys_gfxinfo",
        running: true,
        process_count: 1,
        total_frames_rendered: 6266
      }
    });
  });

  it("writes app graphics JSON for a non-running package", async () => {
    const driver = makeDriver([]);
    driver.getAppGraphicsSnapshot.mockResolvedValueOnce(
      graphicsDriverResult({ running: false, processes: [], graphics: emptyGraphicsSummary(), exitCode: 0 })
    );
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "app", "graphics", "--package", "com.example.missing"], {
      io,
      requestIdFactory: () => "req-app-graphics-absent",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getAppGraphicsSnapshot).toHaveBeenCalledWith({
      packageName: "com.example.missing",
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.graphics",
      device: { serial: "emulator-5554" },
      result: {
        requested: { package_name: "com.example.missing" },
        running: false,
        processes: [],
        process_count: 0,
        graphics: emptyGraphicsSummary(),
        verify: { reason: "dumpsys gfxinfo reported no running process for the package" }
      },
      trace: {
        running: false,
        process_count: 0,
        total_frames_rendered: null
      }
    });
  });

  it("rejects invalid app graphics packages before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "graphics", "--package", "android"], {
      io,
      requestIdFactory: () => "req-app-graphics-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.getAppGraphicsSnapshot).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.graphics",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("writes bounded logs dump JSON grouped by current package PID", async () => {
    const driver = makeDriver([]);
    driver.getPackagePids.mockResolvedValueOnce({ serial: "emulator-5554", pids: [1234, 5678], durationMs: 3 });
    driver.dumpLogcat
      .mockResolvedValueOnce({
        pid: 1234,
        lines: ["06-29 12:00:00.000  1234  1234 I Example: main"],
        exitCode: 0,
        durationMs: 4
      })
      .mockResolvedValueOnce({
        pid: 5678,
        lines: ["06-29 12:00:00.001  5678  5678 W Example: remote"],
        exitCode: 0,
        durationMs: 5
      });
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "logs", "dump", "--package", "com.example.app", "--lines", "25"], {
      io,
      requestIdFactory: () => "req-logs-dump",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.getPackagePids).toHaveBeenCalledWith({
      packageName: "com.example.app",
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    expect(driver.dumpLogcat).toHaveBeenCalledTimes(2);
    expect(driver.dumpLogcat).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      pid: 1234,
      lines: 25,
      buffers: ["main", "system", "crash"],
      timeoutMs: expect.any(Number) as number
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "logs.dump",
      device: { serial: "emulator-5554" },
      warnings: [
        "logs dump output is capped but not redacted; app logs may contain sensitive data",
        "logs dump captures current process IDs only and groups output by PID"
      ],
      result: {
        requested: { package_name: "com.example.app" },
        pid_selection: {
          all_pids: [1234, 5678],
          dumped_pids: [1234, 5678],
          truncated: false
        },
        dump: {
          method: "logcat_pid_tail",
          format: "threadtime",
          per_pid_line_limit: 25,
          command_count: 3,
          command_duration_ms: 12
        },
        line_count: 2,
        processes: [
          { pid: 1234, line_count: 1 },
          { pid: 5678, line_count: 1 }
        ],
        semantics: "per_pid_logcat_tail_then_global_cap"
      },
      trace: {
        package_name: "com.example.app",
        per_pid_line_limit: 25,
        logcat_format: "threadtime",
        logcat_buffers: ["main", "system", "crash"]
      }
    });
  });

  it("rejects invalid logs dump package before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["logs", "dump", "--package", "bad;pkg"], {
      io,
      requestIdFactory: () => "req-logs-invalid-package",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.getPackagePids).not.toHaveBeenCalled();
    expect(driver.dumpLogcat).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "logs.dump",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("rejects logs dump line counts above the bounded contract", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["logs", "dump", "--package", "com.example.app", "--lines", "1001"], {
      io,
      requestIdFactory: () => "req-logs-invalid-lines",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.getPackagePids).not.toHaveBeenCalled();
    expect(driver.dumpLogcat).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "logs.dump",
      error: { code: "INVALID_REQUEST" }
    });
  });
});
