import { describe, expect, it, vi } from "vitest";
import {
  AutophoneError,
  type AppCurrentResult,
  type DeviceDetailsResult,
  type DeviceReadyState,
  type Point,
  type Snapshot
} from "../contracts/index.js";
import {
  changeAppPermission,
  clearAppData,
  controlStatusBar,
  currentApp,
  currentDeviceUser,
  appActivities,
  appLinks,
  appOpsGet,
  appPackageInfo,
  appGraphics,
  appMemory,
  appPids,
  DEVICE_VOLUME_STREAMS,
  deviceDetails,
  deviceOrientation,
  doubleTap,
  drag,
  dumpLogs,
  encodeTextForAdbInput,
  ensureDeviceReady,
  find,
  getDeviceAccessibility,
  getDeviceAnimations,
  getDeviceBattery,
  getDeviceTime,
  getDeviceBrightness,
  getDeviceIme,
  getDeviceLocale,
  getDeviceNotifications,
  getDeviceRinger,
  getDeviceNetwork,
  getDeviceScreen,
  getDeviceStorage,
  getDeviceVolume,
  installApp,
  inspectApp,
  inspectAppPermission,
  keyPress,
  listDeviceUsers,
  listDevices,
  listApps,
  launchApp,
  longPress,
  openUrl,
  planScrollGesture,
  resolveUrl,
  screenshot,
  scroll,
  scrollUntil,
  setDeviceAnimations,
  setDeviceOrientation,
  startApp,
  statusBarIcons,
  stopApp,
  tap,
  textClear,
  textInput,
  uninstallApp,
  waitForApp,
  waitForUi,
  type AndroidDriver,
  type DriverAppActivitiesResult,
  type DriverAppListResult,
  type DriverAppGraphicsResult,
  type DriverAppLinksResult,
  type DriverAppOpsGetResult,
  type DriverAppPackageInfoResult,
  type DriverAppMemoryResult,
  type DriverPackagePidSnapshotResult,
  type DriverDeviceCurrentUserResult,
  type DriverDeviceAccessibilityResult,
  type DriverDeviceAnimationsResult,
  type DriverDeviceAnimationsSetResult,
  type DriverDeviceBatteryResult,
  type DriverDeviceTimeResult,
  type DriverDeviceBrightnessResult,
  type DriverDeviceImeResult,
  type DriverDeviceLocaleResult,
  type DriverDeviceNetworkResult,
  type DriverDeviceStorageResult,
  type DriverDeviceNotificationsResult,
  type DriverDeviceOrientationResult,
  type DriverDeviceScreenResult,
  type DriverDeviceUsersResult,
  type DriverResolveUrlResult,
  type DriverRingerGetResult,
  type DriverUserRotationPolicy,
  type DriverDevice,
  type DriverAppStartResult,
  type ObserveOptions
} from "./runtime.js";
import { buildFilePullResult, copyFile, hashFile, listFiles, makeDirectory, moveFile, pullFile, pushFile, removeFile, statFile } from "./files.js";
import { buildScreenrecordResult, screenrecord } from "./screenrecord.js";
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
  delay,
  deviceDetailsFixture,
  emptyGraphicsSummary,
  emptyMemorySnapshot,
  graphicsDriverResult,
  graphicsSummary,
  imeDriverResult,
  localeDriverResult,
  makeDriver,
  memoryDriverResult,
  memorySnapshot,
  networkDriverResult,
  notificationsDriverResult,
  orientationDriverResult,
  packageInfoDriverResult,
  packageInfoRecord,
  permissionInspectDriverResult,
  pngFixture,
  readyState,
  resolveUrlDriverResult,
  ringerDriverResult,
  screenDriverResult,
  snapshot,
  storageDriverResult,
  timeDriverResult,
  userRotationPolicy
} from "./runtime-test-utils.test-support.js";

describe("app list runtime", () => {
  it("returns packages with request metadata and resolved device serial", async () => {
    const driver = makeDriver([], [], undefined, [], {
      serial: "emulator-5554",
      packages: ["android", "com.example.app"]
    });

    await expect(
      listApps(driver, {
        scope: "third_party",
        state: "enabled",
        include_uninstalled: true,
        filter: "example",
        timeout_ms: 1000
      })
    ).resolves.toEqual({
      device_serial: "emulator-5554",
      packages: ["android", "com.example.app"],
      count: 2,
      scope: "third_party",
      state: "enabled",
      include_uninstalled: true,
      filter: "example"
    });
    expect(driver.listPackages).toHaveBeenCalledWith({
      scope: "third_party",
      state: "enabled",
      includeUninstalled: true,
      filter: "example",
      deviceSerial: undefined,
      timeoutMs: 1000
    });
  });

  it("uses null for an absent package filter", async () => {
    const driver = makeDriver([], [], undefined, [], {
      serial: "emulator-5554",
      packages: []
    });

    await expect(
      listApps(driver, {
        scope: "all",
        state: "all",
        include_uninstalled: false,
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      count: 0,
      filter: null
    });
  });
});

describe("app inspect runtime", () => {
  it("returns package presence and path metadata from the driver", async () => {
    const driver = makeDriver([]);
    driver.inspectPackage.mockResolvedValueOnce({
      serial: "emulator-5554",
      installed: true,
      paths: ["/data/app/com.example/base.apk"],
      exitCode: 0,
      durationMs: 4
    });

    await expect(
      inspectApp(driver, {
        package_name: "com.example.app",
        user_id: 0,
        timeout_ms: 1000
      })
    ).resolves.toEqual({
      device_serial: "emulator-5554",
      requested: {
        package_name: "com.example.app",
        user_id: 0
      },
      installed: true,
      paths: ["/data/app/com.example/base.apk"],
      path_count: 1,
      query: {
        method: "pm_path",
        exit_code: 0,
        command_duration_ms: 4
      },
      verify: {
        policy: "pm_path_presence",
        ok: true,
        attempts: 1,
        reason: "pm path returned package file path entries"
      }
    });
    expect(driver.inspectPackage).toHaveBeenCalledWith({
      packageName: "com.example.app",
      userId: 0,
      deviceSerial: undefined,
      timeoutMs: 1000
    });
  });
});

describe("app activities runtime", () => {
  it("returns intent-scoped activity components from the driver", async () => {
    const driver = makeDriver([]);
    driver.getAppActivities.mockResolvedValueOnce(appActivitiesDriverResult({ serial: "resolved-device" }));

    await expect(
      appActivities(driver, {
        package_name: "com.example.app",
        intent: "launcher",
        timeout_ms: 1000
      })
    ).resolves.toEqual({
      device_serial: "resolved-device",
      requested: { package_name: "com.example.app", intent: "launcher" },
      found: true,
      activities: [appActivityRecord()],
      activity_count: 1,
      query: {
        method: "cmd_package_query_activities",
        exit_code: 0,
        command_duration_ms: 5
      },
      verify: {
        policy: "cmd_package_query_activities_parse",
        ok: true,
        attempts: 1,
        reason: "package manager returned intent-scoped activity components"
      },
      semantics: "read_only_intent_activity_query_not_install_or_launchability_proof"
    });
    expect(driver.getAppActivities).toHaveBeenCalledWith({
      packageName: "com.example.app",
      intent: "launcher",
      deviceSerial: undefined,
      timeoutMs: 1000
    });
  });

  it("does not infer package absence when no launcher activities are found", async () => {
    const driver = makeDriver([]);
    driver.getAppActivities.mockResolvedValueOnce(appActivitiesDriverResult({ activities: [], durationMs: 3 }));

    const result = await appActivities(driver, {
      package_name: "com.example.no.launcher",
      intent: "launcher",
      timeout_ms: 1000,
      device_serial: "emulator-5554"
    });

    expect(result).toMatchObject({
      device_serial: "emulator-5554",
      requested: { package_name: "com.example.no.launcher", intent: "launcher" },
      found: false,
      activities: [],
      activity_count: 0,
      verify: { reason: "package manager returned no activities for the requested intent" }
    });
    expect(result).not.toHaveProperty("installed");
    expect(result).not.toHaveProperty("package_found");
    expect(driver.getAppActivities).toHaveBeenCalledWith({
      packageName: "com.example.no.launcher",
      intent: "launcher",
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });
});

describe("app package-info runtime", () => {
  it("returns active package metadata from the driver", async () => {
    const driver = makeDriver([]);
    driver.getAppPackageInfo.mockResolvedValueOnce(packageInfoDriverResult({ serial: "resolved-device" }));

    await expect(
      appPackageInfo(driver, {
        package_name: "com.example.app",
        timeout_ms: 1000
      })
    ).resolves.toEqual({
      device_serial: "resolved-device",
      requested: { package_name: "com.example.app" },
      installed: true,
      package: packageInfoRecord(),
      query: {
        method: "dumpsys_package",
        exit_code: 0,
        command_duration_ms: 5
      },
      verify: {
        policy: "dumpsys_active_package_block",
        ok: true,
        attempts: 1,
        reason: "dumpsys package returned the active package metadata block"
      },
      semantics: "package_dump_active_block_not_hidden_not_permissions_not_signatures"
    });
    expect(driver.getAppPackageInfo).toHaveBeenCalledWith({
      packageName: "com.example.app",
      deviceSerial: undefined,
      timeoutMs: 1000
    });
  });

  it("returns installed false when dumpsys package reports exact absence", async () => {
    const driver = makeDriver([]);
    driver.getAppPackageInfo.mockResolvedValueOnce(
      packageInfoDriverResult({ installed: false, packageInfo: null, exitCode: 0, durationMs: 3 })
    );

    await expect(
      appPackageInfo(driver, {
        package_name: "com.example.missing",
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).resolves.toMatchObject({
      device_serial: "emulator-5554",
      requested: { package_name: "com.example.missing" },
      installed: false,
      package: null,
      query: { method: "dumpsys_package", exit_code: 0, command_duration_ms: 3 },
      verify: { reason: "dumpsys package reported package absence" }
    });
    expect(driver.getAppPackageInfo).toHaveBeenCalledWith({
      packageName: "com.example.missing",
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });
});

describe("app links runtime", () => {
  it("returns global app link domains from the driver", async () => {
    const driver = makeDriver([]);
    driver.getAppLinks.mockResolvedValueOnce(appLinksDriverResult({ serial: "resolved-device" }));

    await expect(
      appLinks(driver, {
        package_name: "com.example.app",
        timeout_ms: 1000
      })
    ).resolves.toEqual({
      device_serial: "resolved-device",
      requested: { package_name: "com.example.app" },
      package_found: true,
      domains: [{ domain: "example.com", state: { raw: "verified", kind: "known", code: null } }],
      domain_count: 1,
      query: {
        method: "cmd_package_get_app_links",
        exit_code: 0,
        command_duration_ms: 5
      },
      verify: {
        policy: "cmd_package_get_app_links_parse",
        ok: true,
        attempts: 1,
        reason: "Package Manager returned global app link domain verification entries for the package"
      },
      semantics: "read_only_global_domain_verification_state_not_url_resolution_or_per_user_selection_or_signatures"
    });
    expect(driver.getAppLinks).toHaveBeenCalledWith({
      packageName: "com.example.app",
      deviceSerial: undefined,
      timeoutMs: 1000
    });
  });

  it("reports unavailable packages as successful absence", async () => {
    const driver = makeDriver([]);
    driver.getAppLinks.mockResolvedValueOnce(
      appLinksDriverResult({ packageFound: false, domains: [], exitCode: 1, durationMs: 3 })
    );

    await expect(
      appLinks(driver, {
        package_name: "com.example.missing",
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).resolves.toMatchObject({
      device_serial: "emulator-5554",
      requested: { package_name: "com.example.missing" },
      package_found: false,
      domains: [],
      domain_count: 0,
      query: { method: "cmd_package_get_app_links", exit_code: 1, command_duration_ms: 3 },
      verify: { reason: "Package Manager reported the package unavailable for app link domain verification state" }
    });
  });

  it("reports existing packages with no app link domains distinctly", async () => {
    const driver = makeDriver([]);
    driver.getAppLinks.mockResolvedValueOnce(appLinksDriverResult({ domains: [] }));

    await expect(appLinks(driver, { package_name: "com.example.empty", timeout_ms: 1000 })).resolves.toMatchObject({
      package_found: true,
      domains: [],
      domain_count: 0,
      verify: { reason: "Package Manager returned no global app link domain verification entries for the package" }
    });
  });
});

describe("app appops get runtime", () => {
  it("returns explicit appops entries from the driver", async () => {
    const driver = makeDriver([]);
    driver.getAppOps.mockResolvedValueOnce(appOpsDriverResult({ serial: "resolved-device" }));

    await expect(
      appOpsGet(driver, {
        package_name: "com.example.app",
        op_name: "CAMERA",
        user_id: 0,
        timeout_ms: 1000
      })
    ).resolves.toEqual({
      device_serial: "resolved-device",
      requested: { package_name: "com.example.app", op_name: "CAMERA", user_id: 0 },
      lookup: { status: "resolved", uid_resolved: true, reason: "appops_uid_resolved" },
      default_mode: null,
      entries: [
        {
          scope: "uid",
          op_name: "CAMERA",
          mode: { raw: "foreground", kind: "foreground" },
          details: { time_raw: null, reject_time_raw: null, duration_raw: null }
        },
        {
          scope: "package",
          op_name: "CAMERA",
          mode: { raw: "allow", kind: "allow" },
          details: { time_raw: "+1h ago", reject_time_raw: null, duration_raw: "+2s" }
        }
      ],
      entry_count: 2,
      query: { method: "cmd_appops_get", exit_code: 0, command_duration_ms: 5 },
      verify: {
        policy: "cmd_appops_get_single_op_parse",
        ok: true,
        attempts: 1,
        reason: "cmd appops get returned explicit AppOps entries for the requested operation"
      },
      semantics: "read_only_appops_single_op_snapshot_not_runtime_permission_or_effective_behavior_proof"
    });
    expect(driver.getAppOps).toHaveBeenCalledWith({
      packageName: "com.example.app",
      opName: "CAMERA",
      userId: 0,
      deviceSerial: undefined,
      timeoutMs: 1000
    });
  });

  it("returns default mode when appops reports no explicit operations", async () => {
    const driver = makeDriver([]);
    driver.getAppOps.mockResolvedValueOnce(
      appOpsDriverResult({
        entries: [],
        defaultMode: { raw: "default", kind: "default" }
      })
    );

    await expect(
      appOpsGet(driver, { package_name: "com.example.app", op_name: "WRITE_SETTINGS", timeout_ms: 1000 })
    ).resolves.toMatchObject({
      default_mode: { raw: "default", kind: "default" },
      entries: [],
      entry_count: 0,
      verify: { reason: "cmd appops get returned the default mode with no explicit AppOps entries" }
    });
  });

  it("reports no_uid without claiming package absence", async () => {
    const driver = makeDriver([]);
    driver.getAppOps.mockResolvedValueOnce(
      appOpsDriverResult({
        lookup: { status: "no_uid", uid_resolved: false, reason: "no_appops_uid_for_package_in_queried_user" },
        defaultMode: null,
        entries: [],
        exitCode: 0,
        durationMs: 3
      })
    );

    await expect(
      appOpsGet(driver, { package_name: "com.example.missing", op_name: "CAMERA", timeout_ms: 1000 })
    ).resolves.toMatchObject({
      requested: { package_name: "com.example.missing", op_name: "CAMERA", user_id: null },
      lookup: { status: "no_uid", uid_resolved: false },
      default_mode: null,
      entries: [],
      entry_count: 0,
      verify: { reason: "cmd appops get reported no AppOps UID mapping for the package in the queried user" }
    });
  });
});

describe("app clear-data runtime", () => {
  it("clears one explicitly targeted package through the driver", async () => {
    const driver = makeDriver([]);

    await expect(
      clearAppData(driver, {
        package_name: "com.example.app",
        confirm_package: "com.example.app",
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).resolves.toEqual({
      requested: { package_name: "com.example.app" },
      clear: {
        method: "pm_clear",
        exit_code: 0,
        command_duration_ms: 1
      },
      verify: {
        policy: "package_manager_success",
        ok: true,
        attempts: 1,
        reason: "package manager returned Success for pm clear"
      }
    });
    expect(driver.clearPackageData).toHaveBeenCalledWith({
      packageName: "com.example.app",
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });
});

describe("app install runtime", () => {
  it("installs one APK through the driver and reports only APK metadata", async () => {
    const driver = makeDriver([]);

    await expect(
      installApp(driver, {
        apk_path: "/tmp/private/app-debug.apk",
        apk: {
          file_name: "app-debug.apk",
          bytes: 123,
          sha256: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        },
        replace: true,
        grant_runtime_permissions: true,
        allow_test: true,
        allow_downgrade: false,
        timeout_ms: 120_000,
        device_serial: "emulator-5554"
      })
    ).resolves.toEqual({
      device_serial: "emulator-5554",
      requested: {
        apk: {
          file_name: "app-debug.apk",
          bytes: 123,
          sha256: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        },
        replace: true,
        grant_runtime_permissions: true,
        allow_test: true,
        allow_downgrade: false
      },
      install: {
        method: "adb_install",
        exit_code: 0,
        command_duration_ms: 1
      },
      verify: {
        policy: "adb_success",
        ok: true,
        attempts: 1,
        reason: "adb install returned Success; post-install package identity is not independently verified"
      }
    });
    expect(driver.installApk).toHaveBeenCalledWith({
      apkPath: "/tmp/private/app-debug.apk",
      replace: true,
      grantRuntimePermissions: true,
      allowTest: true,
      allowDowngrade: false,
      deviceSerial: "emulator-5554",
      timeoutMs: 120_000
    });
  });
});

describe("app permission runtime", () => {
  it("changes one runtime permission through the driver with command-only verification semantics", async () => {
    const driver = makeDriver([]);

    await expect(
      changeAppPermission(driver, {
        package_name: "com.example.app",
        permission_name: "android.permission.CAMERA",
        operation: "grant",
        user_id: 10,
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).resolves.toEqual({
      device_serial: "emulator-5554",
      requested: {
        package_name: "com.example.app",
        permission_name: "android.permission.CAMERA",
        operation: "grant",
        user_id: 10
      },
      permission: {
        method: "pm_grant",
        exit_code: 0,
        command_duration_ms: 1
      },
      verify: {
        policy: "pm_command_success",
        ok: true,
        attempts: 1,
        reason: "pm grant command completed; permission state is not independently verified"
      }
    });
    expect(driver.setAppPermission).toHaveBeenCalledWith({
      packageName: "com.example.app",
      permissionName: "android.permission.CAMERA",
      operation: "grant",
      userId: 10,
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });

  it("inspects one permission state through the driver with dumpsys semantics", async () => {
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

    await expect(
      inspectAppPermission(driver, {
        package_name: "com.example.app",
        permission_name: "android.permission.CAMERA",
        user_id: 10,
        timeout_ms: 1000
      })
    ).resolves.toEqual({
      device_serial: "emulator-5554",
      requested: {
        package_name: "com.example.app",
        permission_name: "android.permission.CAMERA",
        user_id: 10
      },
      package_found: true,
      package: { target_sdk: 35 },
      permission: {
        state: "granted",
        granted: true,
        source: "runtime",
        manifest_requested: true,
        available_user_ids: [0, 10],
        install: { present: false, granted: null, flags: [] },
        runtime: {
          selected_user_id: 10,
          user_present: true,
          present: true,
          granted: true,
          flags: ["USER_SET"]
        }
      },
      query: {
        method: "dumpsys_package",
        exit_code: 0,
        command_duration_ms: 4
      },
      verify: {
        policy: "dumpsys_permission_state",
        ok: true,
        attempts: 1,
        reason: "dumpsys package permission state parsed; appops and effective app behavior are not evaluated"
      },
      semantics: "package_dump_permission_state_not_appops"
    });
    expect(driver.inspectAppPermission).toHaveBeenCalledWith({
      packageName: "com.example.app",
      permissionName: "android.permission.CAMERA",
      userId: 10,
      deviceSerial: undefined,
      timeoutMs: 1000
    });
  });
});

describe("app uninstall runtime", () => {
  it("uninstalls one explicitly targeted package through adb with command-only verification", async () => {
    const driver = makeDriver([]);

    await expect(
      uninstallApp(driver, {
        package_name: "com.example.app",
        confirm_package: "com.example.app",
        user_id: 10,
        timeout_ms: 120_000,
        device_serial: "emulator-5554"
      })
    ).resolves.toEqual({
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
      verify: {
        policy: "adb_success",
        ok: true,
        attempts: 1,
        reason: "adb uninstall returned Success; package absence is not independently verified"
      }
    });
    expect(driver.uninstallPackage).toHaveBeenCalledWith({
      packageName: "com.example.app",
      userId: 10,
      deviceSerial: "emulator-5554",
      timeoutMs: 120_000
    });
  });
});

describe("app pids runtime", () => {
  it("returns a read-only PID snapshot for a running package", async () => {
    const driver = makeDriver([]);
    driver.getPackagePidSnapshot.mockResolvedValueOnce({
      serial: "emulator-5554",
      pids: [1234, 5678],
      exitCode: 0,
      durationMs: 4
    } satisfies DriverPackagePidSnapshotResult);

    await expect(
      appPids(driver, {
        package_name: "com.example.app",
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).resolves.toEqual({
      device_serial: "emulator-5554",
      package_name: "com.example.app",
      running: true,
      pids: [1234, 5678],
      pid_count: 2,
      query: {
        method: "pidof",
        exit_code: 0,
        command_duration_ms: 4
      },
      verify: {
        policy: "pidof_process_snapshot",
        ok: true,
        attempts: 1,
        reason: "pidof returned process identifiers for the package"
      },
      semantics: "read_only_pid_snapshot_not_process_liveness_guarantee"
    });
    expect(driver.getPackagePidSnapshot).toHaveBeenCalledWith({
      packageName: "com.example.app",
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });

  it("returns running false when pidof finds no package process", async () => {
    const driver = makeDriver([]);
    driver.getPackagePidSnapshot.mockResolvedValueOnce({
      serial: "emulator-5554",
      pids: [],
      exitCode: 1,
      durationMs: 3
    } satisfies DriverPackagePidSnapshotResult);

    await expect(
      appPids(driver, {
        package_name: "com.example.missing",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      device_serial: "emulator-5554",
      package_name: "com.example.missing",
      running: false,
      pids: [],
      pid_count: 0,
      query: { method: "pidof", exit_code: 1, command_duration_ms: 3 },
      verify: { reason: "pidof returned no process identifiers for the package" }
    });
  });
});

describe("app memory runtime", () => {
  it("returns a read-only memory snapshot for a running package process", async () => {
    const driver = makeDriver([]);
    driver.getAppMemorySnapshot.mockResolvedValueOnce(memoryDriverResult());

    await expect(
      appMemory(driver, {
        package_name: "com.example.app",
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).resolves.toEqual({
      device_serial: "emulator-5554",
      requested: { package_name: "com.example.app" },
      running: true,
      processes: [{ pid: 1234, process_name: "com.example.app" }],
      process_count: 1,
      memory: memorySnapshot(),
      query: {
        method: "dumpsys_meminfo",
        exit_code: 0,
        command_duration_ms: 5
      },
      verify: {
        policy: "dumpsys_meminfo_app_summary_snapshot",
        ok: true,
        attempts: 1,
        reason: "dumpsys meminfo returned an App Summary memory snapshot for the package process"
      },
      semantics: "read_only_memory_snapshot_point_in_time_not_sustained_usage_guarantee"
    });
    expect(driver.getAppMemorySnapshot).toHaveBeenCalledWith({
      packageName: "com.example.app",
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });

  it("returns running false when dumpsys meminfo finds no process", async () => {
    const driver = makeDriver([]);
    driver.getAppMemorySnapshot.mockResolvedValueOnce(memoryDriverResult({ running: false, processes: [], memory: emptyMemorySnapshot() }));

    await expect(
      appMemory(driver, {
        package_name: "com.example.missing",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      device_serial: "emulator-5554",
      requested: { package_name: "com.example.missing" },
      running: false,
      processes: [],
      process_count: 0,
      memory: emptyMemorySnapshot(),
      verify: { reason: "dumpsys meminfo reported no running process for the package" }
    });
  });
});

describe("app graphics runtime", () => {
  it("returns a read-only graphics summary for a running package process", async () => {
    const driver = makeDriver([]);
    driver.getAppGraphicsSnapshot.mockResolvedValueOnce(graphicsDriverResult());

    await expect(
      appGraphics(driver, {
        package_name: "com.example.app",
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).resolves.toEqual({
      device_serial: "emulator-5554",
      requested: { package_name: "com.example.app" },
      running: true,
      processes: [{ pid: 1234, process_name: "com.example.app" }],
      process_count: 1,
      graphics: graphicsSummary(),
      query: {
        method: "dumpsys_gfxinfo",
        exit_code: 0,
        command_duration_ms: 5
      },
      verify: {
        policy: "dumpsys_gfxinfo_frame_summary_snapshot",
        ok: true,
        attempts: 1,
        reason: "dumpsys gfxinfo returned a graphics frame summary for the package process"
      },
      semantics: "read_only_graphics_summary_since_last_reset_not_sustained_performance_guarantee"
    });
    expect(driver.getAppGraphicsSnapshot).toHaveBeenCalledWith({
      packageName: "com.example.app",
      deviceSerial: "emulator-5554",
      timeoutMs: 1000
    });
  });

  it("returns running false when dumpsys gfxinfo finds no process", async () => {
    const driver = makeDriver([]);
    driver.getAppGraphicsSnapshot.mockResolvedValueOnce(
      graphicsDriverResult({ running: false, processes: [], graphics: emptyGraphicsSummary() })
    );

    await expect(
      appGraphics(driver, {
        package_name: "com.example.missing",
        timeout_ms: 1000
      })
    ).resolves.toMatchObject({
      device_serial: "emulator-5554",
      requested: { package_name: "com.example.missing" },
      running: false,
      processes: [],
      process_count: 0,
      graphics: emptyGraphicsSummary(),
      verify: { reason: "dumpsys gfxinfo reported no running process for the package" }
    });
  });
});
