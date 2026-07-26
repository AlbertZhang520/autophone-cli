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
  it("writes current app JSON", async () => {
    const io = makeIo();
    const exitCode = await runCli(["--serial", "requested-serial", "app", "current"], {
      io,
      requestIdFactory: () => "req-app-current",
      driverFactory: () =>
        makeDriver([], [{ device_serial: "resolved-serial", package: "com.example", activity: "com.example.MainActivity", focused: true }])
    });

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.current",
      device: { serial: "resolved-serial" },
      result: {
        device_serial: "resolved-serial",
        package: "com.example",
        activity: "com.example.MainActivity",
        focused: true
      }
    });
  });

  it("writes app install JSON without echoing the local APK path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-install-"));
    const apkPath = join(dir, "app-debug.apk");
    const apkBytes = Buffer.from("apk bytes");
    await writeFile(apkPath, apkBytes);
    const expectedSha = `sha256:${createHash("sha256").update(apkBytes).digest("hex")}`;
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "app",
        "install",
        "--apk",
        apkPath,
        "--replace",
        "--grant-runtime-permissions",
        "--allow-test",
        "--allow-downgrade",
        "--install-timeout",
        "123000"
      ],
      {
        io,
        requestIdFactory: () => "req-app-install",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.installApk).toHaveBeenCalledWith({
      apkPath,
      replace: true,
      grantRuntimePermissions: true,
      allowTest: true,
      allowDowngrade: true,
      deviceSerial: "emulator-5554",
      timeoutMs: 123_000
    });
    expect(io.stdoutText()).not.toContain(apkPath);
    expect(io.stdoutText()).not.toContain(dir);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.install",
      device: { serial: "emulator-5554" },
      warnings: [
        "app install mutates the target device and may execute third-party code after launch",
        "adb_success does not independently verify package identity after install"
      ],
      result: {
        device_serial: "emulator-5554",
        requested: {
          apk: {
            file_name: "app-debug.apk",
            bytes: apkBytes.byteLength,
            sha256: expectedSha
          },
          replace: true,
          grant_runtime_permissions: true,
          allow_test: true,
          allow_downgrade: true
        },
        install: { method: "adb_install", exit_code: 0 },
        verify: { policy: "adb_success", ok: true, attempts: 1 }
      },
      trace: {
        install_timeout_ms: 123_000,
        install_method: "adb_install",
        replace: true,
        grant_runtime_permissions: true,
        allow_test: true,
        allow_downgrade: true
      }
    });
  });

  it("rejects app install without an explicit serial before driver calls", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-install-no-serial-"));
    const apkPath = join(dir, "app-debug.apk");
    await writeFile(apkPath, "apk bytes");
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["app", "install", "--apk", apkPath], {
      io,
      requestIdFactory: () => "req-app-install-no-serial",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.installApk).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(apkPath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.install",
      error: {
        code: "INVALID_REQUEST",
        message: "app install requires explicit --serial"
      },
      trace: {
        argv: ["app", "install", "--apk", "<redacted>"]
      }
    });
  });

  it("rejects non-APK install paths before driver calls and redacts argv", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-install-not-apk-"));
    const txtPath = join(dir, "patient-record.txt");
    await writeFile(txtPath, "apk bytes");
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "app", "install", "--apk", txtPath], {
      io,
      requestIdFactory: () => "req-app-install-not-apk",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.installApk).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(txtPath);
    expect(io.stdoutText()).not.toContain("patient-record.txt");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.install",
      error: { code: "INVALID_REQUEST" },
      trace: {
        argv: ["--serial", "emulator-5554", "app", "install", "--apk", "<redacted>"]
      }
    });
  });

  it("rejects empty APK files before driver calls and redacts argv", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-install-empty-"));
    const apkPath = join(dir, "empty.apk");
    await writeFile(apkPath, "");
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "app", "install", "--apk", apkPath], {
      io,
      requestIdFactory: () => "req-app-install-empty",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.installApk).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(apkPath);
    expect(io.stdoutText()).not.toContain("empty.apk");
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.install",
      error: {
        code: "INVALID_REQUEST",
        message: "APK file must not be empty"
      },
      trace: {
        argv: ["--serial", "emulator-5554", "app", "install", "--apk", "<redacted>"]
      }
    });
  });

  it("redacts joined --apk arguments in app install failures", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-install-missing-"));
    const missingApkPath = join(dir, "missing.apk");
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      ["--serial", "emulator-5554", "app", "install", `--apk=${missingApkPath}`],
      {
        io,
        requestIdFactory: () => "req-app-install-missing",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.installApk).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(missingApkPath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.install",
      error: { code: "INVALID_REQUEST" },
      trace: {
        argv: ["--serial", "emulator-5554", "app", "install", "--apk=<redacted>"]
      }
    });
  });

  it("writes app uninstall JSON with explicit serial, confirmation, user id, and timeout", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "app",
        "uninstall",
        "--package",
        "com.example.app",
        "--confirm-package",
        "com.example.app",
        "--user",
        "10",
        "--uninstall-timeout",
        "123000"
      ],
      {
        io,
        requestIdFactory: () => "req-app-uninstall",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.uninstallPackage).toHaveBeenCalledWith({
      packageName: "com.example.app",
      userId: 10,
      deviceSerial: "emulator-5554",
      timeoutMs: 123_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.uninstall",
      device: { serial: "emulator-5554" },
      warnings: [
        "app uninstall removes the app package from the target device or selected Android user",
        "adb_success does not independently verify package absence after uninstall"
      ],
      result: {
        device_serial: "emulator-5554",
        requested: {
          package_name: "com.example.app",
          user_id: 10
        },
        uninstall: {
          method: "adb_uninstall",
          exit_code: 0,
          command_duration_ms: 1
        },
        verify: { policy: "adb_success", ok: true, attempts: 1 }
      },
      trace: {
        uninstall_timeout_ms: 123_000,
        uninstall_method: "adb_uninstall",
        user_scope: "explicit_user",
        confirmation: "package_name_match"
      }
    });
  });

  it("rejects app uninstall without an explicit serial before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      ["app", "uninstall", "--package", "com.example.app", "--confirm-package", "com.example.app"],
      {
        io,
        requestIdFactory: () => "req-app-uninstall-no-serial",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.uninstallPackage).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.uninstall",
      error: {
        code: "INVALID_REQUEST",
        message: "app uninstall requires explicit --serial"
      }
    });
  });

  it("rejects app uninstall confirmation mismatch and protected packages before driver calls", async () => {
    const cases: readonly string[][] = [
      [
        "--serial",
        "emulator-5554",
        "app",
        "uninstall",
        "--package",
        "com.example.app",
        "--confirm-package",
        "com.other.app"
      ],
      [
        "--serial",
        "emulator-5554",
        "app",
        "uninstall",
        "--package",
        "com.android.settings",
        "--confirm-package",
        "com.android.settings"
      ]
    ];

    for (const argv of cases) {
      const driver = makeDriver([]);
      const io = makeIo();
      const exitCode = await runCli(argv, {
        io,
        requestIdFactory: () => "req-app-uninstall-invalid",
        driverFactory: () => driver
      });

      expect(exitCode).toBe(2);
      expect(driver.uninstallPackage).not.toHaveBeenCalled();
      const parsed = JSON.parse(io.stdoutText());
      expect(parsed).toMatchObject({
        ok: false,
        command: "app.uninstall",
        error: { code: "INVALID_REQUEST" }
      });
    }
  });

  it("writes app permission grant JSON with explicit serial and user id", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "app",
        "permission",
        "grant",
        "--package",
        "com.example.app",
        "--permission",
        "android.permission.CAMERA",
        "--user",
        "10"
      ],
      {
        io,
        requestIdFactory: () => "req-app-permission-grant",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.setAppPermission).toHaveBeenCalledWith({
      packageName: "com.example.app",
      permissionName: "android.permission.CAMERA",
      operation: "grant",
      userId: 10,
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.permission_grant",
      device: { serial: "emulator-5554" },
      warnings: [
        "app permission grant changes runtime consent state and may bypass app permission dialogs",
        "pm_command_success does not independently verify effective permission state"
      ],
      result: {
        device_serial: "emulator-5554",
        requested: {
          package_name: "com.example.app",
          permission_name: "android.permission.CAMERA",
          operation: "grant",
          user_id: 10
        },
        permission: { method: "pm_grant", exit_code: 0 },
        verify: { policy: "pm_command_success", ok: true, attempts: 1 }
      },
      trace: {
        package_manager: "pm",
        operation: "grant",
        user_scope: "explicit_user"
      }
    });
  });

  it("writes app permission revoke JSON with default device user scope", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "app",
        "permission",
        "revoke",
        "--package",
        "com.example.app",
        "--permission",
        "android.permission.CAMERA"
      ],
      {
        io,
        requestIdFactory: () => "req-app-permission-revoke",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.setAppPermission).toHaveBeenCalledWith({
      packageName: "com.example.app",
      permissionName: "android.permission.CAMERA",
      operation: "revoke",
      userId: undefined,
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.permission_revoke",
      warnings: [
        "app permission revoke may interrupt or change behavior of a running app",
        "pm_command_success does not independently verify effective permission state"
      ],
      result: {
        requested: {
          operation: "revoke",
          user_id: null
        },
        permission: { method: "pm_revoke" }
      },
      trace: { user_scope: "device_default" }
    });
  });

  it("writes app permission inspect JSON without requiring explicit serial", async () => {
    const driver = makeDriver([]);
    driver.inspectAppPermission.mockResolvedValueOnce({
      serial: "emulator-5554",
      packageFound: true,
      targetSdk: 35,
      manifestRequested: true,
      availableUserIds: [0, 10],
      install: { present: false, granted: null, flags: [] },
      runtime: {
        selectedUserId: 10,
        userPresent: true,
        present: true,
        granted: true,
        flags: ["USER_SET"]
      },
      state: "granted",
      granted: true,
      source: "runtime",
      exitCode: 0,
      durationMs: 4
    });
    const io = makeIo();
    const exitCode = await runCli(
      [
        "app",
        "permission",
        "inspect",
        "--package",
        "com.example.app",
        "--permission",
        "android.permission.CAMERA",
        "--user",
        "10"
      ],
      {
        io,
        requestIdFactory: () => "req-app-permission-inspect",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.inspectAppPermission).toHaveBeenCalledWith({
      packageName: "com.example.app",
      permissionName: "android.permission.CAMERA",
      userId: 10,
      deviceSerial: undefined,
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.permission_inspect",
      device: { serial: "emulator-5554" },
      warnings: [
        "app permission inspect reads Package Manager dump state; it does not evaluate appops or effective app behavior",
        "default inspected user is Android user 0 unless --user is supplied"
      ],
      result: {
        package_found: true,
        permission: {
          state: "granted",
          granted: true,
          source: "runtime",
          runtime: {
            selected_user_id: 10,
            user_present: true,
            present: true,
            granted: true
          }
        },
        query: { method: "dumpsys_package", exit_code: 0, command_duration_ms: 4 },
        verify: { policy: "dumpsys_permission_state", ok: true, attempts: 1 },
        semantics: "package_dump_permission_state_not_appops"
      },
      trace: {
        package_manager: "dumpsys",
        query: "package",
        user_scope: "explicit_user"
      }
    });
  });

  it("rejects unsafe app permission inspect names before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "app",
        "permission",
        "inspect",
        "--package",
        "com.example.app",
        "--permission",
        "android.permission.CAMERA;pm clear com.other"
      ],
      {
        io,
        requestIdFactory: () => "req-app-permission-inspect-invalid",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.inspectAppPermission).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.permission_inspect",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("rejects app permission changes without explicit serial before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "app",
        "permission",
        "grant",
        "--package",
        "com.example.app",
        "--permission",
        "android.permission.CAMERA"
      ],
      {
        io,
        requestIdFactory: () => "req-app-permission-no-serial",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.setAppPermission).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.permission_grant",
      error: {
        code: "INVALID_REQUEST",
        message: "app permission changes require explicit --serial"
      }
    });
  });

  it("rejects unsafe app permission names before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "app",
        "permission",
        "grant",
        "--package",
        "com.example.app",
        "--permission",
        "android.permission.CAMERA;pm clear com.other"
      ],
      {
        io,
        requestIdFactory: () => "req-app-permission-invalid",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.setAppPermission).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.permission_grant",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("writes app clear-data JSON only with explicit serial and matching confirmation", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "app",
        "clear-data",
        "--package",
        "com.example.app",
        "--confirm-package",
        "com.example.app"
      ],
      {
        io,
        requestIdFactory: () => "req-app-clear-data",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.clearPackageData).toHaveBeenCalledWith({
      packageName: "com.example.app",
      deviceSerial: "emulator-5554",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "app.clear_data",
      device: { serial: "emulator-5554" },
      warnings: [
        "app clear-data is destructive and cannot be undone",
        "package_manager_success only means pm clear returned Success"
      ],
      result: {
        requested: { package_name: "com.example.app" },
        clear: { method: "pm_clear", exit_code: 0 },
        verify: {
          policy: "package_manager_success",
          ok: true,
          attempts: 1
        }
      },
      trace: {
        destructive: true,
        confirmation: "package_name_match"
      }
    });
  });

  it("rejects app clear-data confirmation mismatch before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "app",
        "clear-data",
        "--package",
        "com.example.app",
        "--confirm-package",
        "com.other.app"
      ],
      {
        io,
        requestIdFactory: () => "req-app-clear-data-mismatch",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.clearPackageData).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.clear_data",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("rejects app clear-data without explicit serial before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      ["app", "clear-data", "--package", "com.example.app", "--confirm-package", "com.example.app"],
      {
        io,
        requestIdFactory: () => "req-app-clear-data-no-serial",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.clearPackageData).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.clear_data",
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("rejects protected packages in app clear-data before driver calls", async () => {
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "app",
        "clear-data",
        "--package",
        "com.android.settings",
        "--confirm-package",
        "com.android.settings"
      ],
      {
        io,
        requestIdFactory: () => "req-app-clear-data-protected",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.clearPackageData).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "app.clear_data",
      error: { code: "INVALID_REQUEST" }
    });
  });
});
