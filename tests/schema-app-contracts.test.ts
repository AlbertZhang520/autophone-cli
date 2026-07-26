import { describe, expect, it } from "vitest";
import {
  appActivityRecord,
  appGraphicsSummary,
  appMemorySnapshot,
  appPackageInfoRecord,
  createAjv,
  emptyAppGraphicsSummary,
  emptyAppMemorySnapshot,
  join,
  readFile
} from "./schema-test-utils.js";
import {
  AppActivitiesRequestSchema,
  AppActivitiesResultSchema,
  AppClearDataRequestSchema,
  AppClearDataResultSchema,
  AppCurrentResultSchema,
  AppGraphicsRequestSchema,
  AppGraphicsResultSchema,
  AppInstallRequestSchema,
  AppInstallResultSchema,
  AppInspectRequestSchema,
  AppInspectResultSchema,
  AppLaunchResultSchema,
  AppListResultSchema,
  AppLinksRequestSchema,
  AppLinksResultSchema,
  AppOpsGetRequestSchema,
  AppOpsGetResultSchema,
  AppOpenUrlRequestSchema,
  AppOpenUrlResultSchema,
  AppResolveUrlRequestSchema,
  AppResolveUrlResultSchema,
  AppPackageInfoRequestSchema,
  AppPackageInfoResultSchema,
  AppPermissionInspectRequestSchema,
  AppPermissionInspectResultSchema,
  AppPermissionRequestSchema,
  AppPermissionResultSchema,
  AppMemoryRequestSchema,
  AppMemoryResultSchema,
  AppPidsRequestSchema,
  AppPidsResultSchema,
  AppStopResultSchema,
  AppStartResultSchema,
  AppUninstallRequestSchema,
  AppUninstallResultSchema,
  DeviceBatteryGetRequestSchema,
  DeviceBatteryGetResultSchema,
  DeviceTimeGetRequestSchema,
  DeviceTimeGetResultSchema,
  DeviceCurrentUserRequestSchema,
  DeviceCurrentUserResultSchema,
  DeviceAccessibilityGetRequestSchema,
  DeviceAccessibilityGetResultSchema,
  DeviceAnimationsGetRequestSchema,
  DeviceAnimationsGetResultSchema,
  DeviceAnimationsSetRequestSchema,
  DeviceAnimationsSetResultSchema,
  DeviceBrightnessGetRequestSchema,
  DeviceBrightnessGetResultSchema,
  DeviceDetailsResultSchema,
  DeviceEnsureReadyRequestSchema,
  DeviceEnsureReadyResultSchema,
  DeviceImeGetRequestSchema,
  DeviceImeGetResultSchema,
  DeviceLocaleGetRequestSchema,
  DeviceLocaleGetResultSchema,
  DeviceListResultSchema,
  DeviceNetworkGetRequestSchema,
  DeviceNetworkGetResultSchema,
  DeviceStorageGetRequestSchema,
  DeviceStorageGetResultSchema,
  DeviceNotificationsRequestSchema,
  DeviceNotificationsResultSchema,
  DeviceOrientationRequestSchema,
  DeviceOrientationSetRequestSchema,
  DeviceOrientationSetResultSchema,
  DeviceOrientationResultSchema,
  DeviceRingerGetRequestSchema,
  DeviceRingerGetResultSchema,
  DeviceScreenGetRequestSchema,
  DeviceScreenGetResultSchema,
  DeviceStatusBarIconsRequestSchema,
  DeviceStatusBarIconsResultSchema,
  DeviceStatusBarRequestSchema,
  DeviceStatusBarResultSchema,
  DeviceUsersRequestSchema,
  DeviceUsersResultSchema,
  DeviceVolumeGetRequestSchema,
  DeviceVolumeGetResultSchema,
  DoubleTapRequestSchema,
  DoubleTapResultSchema,
  DragRequestSchema,
  DragResultSchema,
  FileCopyRequestSchema,
  FileCopyResultSchema,
  FileHashRequestSchema,
  FileHashResultSchema,
  FileListRequestSchema,
  FileListResultSchema,
  FileMkdirRequestSchema,
  FileMkdirResultSchema,
  FileMoveRequestSchema,
  FileMoveResultSchema,
  FilePullRequestSchema,
  FilePullResultSchema,
  FilePushRequestSchema,
  FilePushResultSchema,
  FileRmRequestSchema,
  FileRmResultSchema,
  FileStatRequestSchema,
  FileStatResultSchema,
  FindResultSchema,
  KeyPressRequestSchema,
  KeyPressResultSchema,
  LongPressRequestSchema,
  LongPressResultSchema,
  LogsDumpRequestSchema,
  LogsDumpResultSchema,
  ObserveResultSchema,
  ResponseEnvelopeSchema,
  ScreenrecordRequestSchema,
  ScreenrecordResultSchema,
  ScreenshotResultSchema,
  ScrollRequestSchema,
  ScrollResultSchema,
  ScrollUntilRequestSchema,
  ScrollUntilResultSchema,
  TapRequestSchema,
  TextClearRequestSchema,
  TextClearResultSchema,
  TextInputRequestSchema,
  TextInputResultSchema,
  WaitAppResultSchema,
  WaitUiRequestSchema,
  WaitUiResultSchema
} from "../src/contracts/index.js";

describe("generated JSON schemas: app contracts", () => {
  it("enforces app open-url request safety", () => {
    expect(
      AppOpenUrlRequestSchema.parse({
        url: "https://example.com/path?token=secret#section"
      })
    ).toMatchObject({
      url: "https://example.com/path?token=secret#section",
      verify: "activity_manager_accepted"
    });
    for (const url of [
      "javascript:alert(1)",
      "file:///etc/hosts",
      "//example.com/path",
      "https://user:pass@example.com/",
      "https://example.com/a b",
      "https://example.com/a\nb",
      `https://example.com/${"a".repeat(2049)}`
    ]) {
      expect(() => AppOpenUrlRequestSchema.parse({ url })).toThrow();
    }
  });

  it("enforces app resolve-url request safety", () => {
    expect(
      AppResolveUrlRequestSchema.parse({
        url: "https://example.com/path?a=1#frag",
        timeout_ms: 1000,
        device_serial: "emulator-5554"
      })
    ).toEqual({
      url: "https://example.com/path?a=1#frag",
      timeout_ms: 1000,
      device_serial: "emulator-5554"
    });
    expect(AppResolveUrlRequestSchema.parse({ url: "http://example.com" })).toEqual({
      url: "http://example.com",
      timeout_ms: 10_000
    });
    for (const url of [
      "",
      "ftp://example.com",
      "https://user:pass@example.com",
      "https://",
      "https://example.com/a b",
      "https://example.com/\n"
    ]) {
      expect(() => AppResolveUrlRequestSchema.parse({ url })).toThrow();
    }
  });

  it("enforces app resolve-url result semantics", () => {
    const base = {
      device_serial: "emulator-5554",
      requested: {
        scheme: "https",
        hostname: "example.com",
        port: null,
        path_present: true,
        query_present: false,
        fragment_present: false,
        url_length: 25
      },
      metadata: {
        priority: 0,
        preferred_order: 0,
        match: { raw: "0x208000", value: 2_129_920 },
        specific_index: -1,
        is_default: true
      },
      query: { method: "cmd_package_resolve_activity", exit_code: 0, command_duration_ms: 3 },
      verify: {
        policy: "package_manager_resolve_activity_parse",
        ok: true,
        attempts: 1,
        reason: "Package Manager resolved the ACTION_VIEW URL intent to a concrete activity component"
      },
      semantics: "read_only_url_intent_resolution_not_launchability_or_network_proof"
    };

    expect(
      AppResolveUrlResultSchema.parse({
        ...base,
        resolution: {
          type: "activity",
          component: "com.android.browser/.BrowserActivity",
          package: "com.android.browser",
          activity: "com.android.browser.BrowserActivity",
          is_system_resolver: false
        }
      })
    ).toMatchObject({ resolution: { type: "activity", is_system_resolver: false } });

    expect(
      AppResolveUrlResultSchema.parse({
        ...base,
        resolution: {
          type: "resolver",
          component: "android/com.android.internal.app.ResolverActivity",
          package: "android",
          activity: "com.android.internal.app.ResolverActivity",
          is_system_resolver: true
        }
      })
    ).toMatchObject({ resolution: { type: "resolver", is_system_resolver: true } });

    expect(
      AppResolveUrlResultSchema.parse({
        ...base,
        metadata: null,
        resolution: {
          type: "none",
          component: null,
          package: null,
          activity: null,
          is_system_resolver: false
        }
      })
    ).toMatchObject({ metadata: null, resolution: { type: "none" } });

    expect(() =>
      AppResolveUrlResultSchema.parse({
        ...base,
        resolution: {
          type: "resolver",
          component: "android/com.android.internal.app.ResolverActivity",
          package: "android",
          activity: "com.android.internal.app.ResolverActivity",
          is_system_resolver: false
        }
      })
    ).toThrow();
  });

  it("requires resolved device serials in current-app results", () => {
    expect(
      AppCurrentResultSchema.parse({
        device_serial: "emulator-5554",
        package: "com.example",
        activity: "com.example.MainActivity",
        focused: true
      })
    ).toEqual({
      device_serial: "emulator-5554",
      package: "com.example",
      activity: "com.example.MainActivity",
      focused: true
    });
    expect(() =>
      AppCurrentResultSchema.parse({
        package: "com.example",
        activity: "com.example.MainActivity",
        focused: true
      })
    ).toThrow();
  });

  it("enforces app clear-data destructive confirmation semantics", () => {
    expect(
      AppClearDataRequestSchema.parse({
        package_name: "com.example.app",
        confirm_package: "com.example.app",
        device_serial: "emulator-5554"
      })
    ).toMatchObject({
      package_name: "com.example.app",
      confirm_package: "com.example.app",
      device_serial: "emulator-5554",
      timeout_ms: 10_000
    });
    for (const request of [
      {
        package_name: "com.example.app",
        confirm_package: "com.other.app",
        device_serial: "emulator-5554"
      },
      {
        package_name: "com.example.app",
        confirm_package: "com.example.app"
      },
      {
        package_name: "com.example.app;pm clear com.other",
        confirm_package: "com.example.app;pm clear com.other",
        device_serial: "emulator-5554"
      },
      {
        package_name: "com.android.settings",
        confirm_package: "com.android.settings",
        device_serial: "emulator-5554"
      },
      {
        package_name: "com.google.android.gms",
        confirm_package: "com.google.android.gms",
        device_serial: "emulator-5554"
      }
    ]) {
      expect(() => AppClearDataRequestSchema.parse(request)).toThrow();
    }
  });

  it("enforces app install metadata and explicit target semantics", () => {
    const apk = {
      file_name: "app-debug.apk",
      bytes: 9,
      sha256: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    };
    expect(
      AppInstallRequestSchema.parse({
        apk_path: "/tmp/app-debug.apk",
        apk,
        device_serial: "emulator-5554"
      })
    ).toEqual({
      apk_path: "/tmp/app-debug.apk",
      apk,
      replace: false,
      grant_runtime_permissions: false,
      allow_test: false,
      allow_downgrade: false,
      timeout_ms: 120_000,
      device_serial: "emulator-5554"
    });
    expect(
      AppInstallResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          apk,
          replace: false,
          grant_runtime_permissions: false,
          allow_test: false,
          allow_downgrade: false
        },
        install: {
          method: "adb_install",
          exit_code: 0,
          command_duration_ms: 5
        },
        verify: {
          policy: "adb_success",
          ok: true,
          attempts: 1,
          reason: "adb install returned Success"
        }
      })
    ).toMatchObject({
      device_serial: "emulator-5554",
      verify: { policy: "adb_success", ok: true }
    });
    for (const request of [
      { apk_path: "/tmp/app-debug.apk", apk },
      {
        apk_path: "/tmp/app-debug.apk",
        apk: { ...apk, sha256: "bad" },
        device_serial: "emulator-5554"
      },
      {
        apk_path: "/tmp/app-debug.apk",
        apk,
        timeout_ms: 600_001,
        device_serial: "emulator-5554"
      }
    ]) {
      expect(() => AppInstallRequestSchema.parse(request)).toThrow();
    }
  });

  it("enforces app inspect read-only package query semantics", () => {
    expect(
      AppInspectRequestSchema.parse({
        package_name: "android",
        user_id: 0,
        device_serial: "emulator-5554"
      })
    ).toEqual({
      package_name: "android",
      user_id: 0,
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });
    expect(
      AppInspectResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          package_name: "com.example.app",
          user_id: null
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
      })
    ).toMatchObject({
      installed: true,
      path_count: 1,
      verify: { policy: "pm_path_presence", ok: true }
    });
    for (const request of [
      { package_name: "bad;pkg" },
      { package_name: ".bad" },
      { package_name: "com.example.app", user_id: -1 },
      { package_name: "com.example.app", timeout_ms: 0 }
    ]) {
      expect(() => AppInspectRequestSchema.parse(request)).toThrow();
    }
  });

  it("enforces app package-info active metadata semantics", () => {
    expect(
      AppPackageInfoRequestSchema.parse({
        package_name: "android",
        device_serial: "emulator-5554"
      })
    ).toEqual({
      package_name: "android",
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });
    expect(
      AppPackageInfoResultSchema.parse({
        device_serial: "emulator-5554",
        requested: { package_name: "com.example.app" },
        installed: true,
        package: appPackageInfoRecord(),
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
      })
    ).toMatchObject({
      installed: true,
      package: { package_name: "com.example.app", version: { code: 42 } },
      verify: { policy: "dumpsys_active_package_block", ok: true }
    });
    expect(
      AppPackageInfoResultSchema.parse({
        device_serial: "emulator-5554",
        requested: { package_name: "com.example.missing" },
        installed: false,
        package: null,
        query: { method: "dumpsys_package", exit_code: 0, command_duration_ms: 3 },
        verify: {
          policy: "dumpsys_active_package_block",
          ok: true,
          attempts: 1,
          reason: "dumpsys package reported package absence"
        },
        semantics: "package_dump_active_block_not_hidden_not_permissions_not_signatures"
      })
    ).toMatchObject({ installed: false, package: null });
    for (const result of [
      { installed: true, package: null },
      { installed: false, package: appPackageInfoRecord() },
      { installed: true, package: appPackageInfoRecord({ package_name: "com.other.app" }) }
    ]) {
      expect(() =>
        AppPackageInfoResultSchema.parse({
          device_serial: "emulator-5554",
          requested: { package_name: "com.example.app" },
          query: { method: "dumpsys_package", exit_code: 0, command_duration_ms: 1 },
          verify: { policy: "dumpsys_active_package_block", ok: true, attempts: 1, reason: "snapshot" },
          semantics: "package_dump_active_block_not_hidden_not_permissions_not_signatures",
          ...result
        })
      ).toThrow();
    }
    for (const request of [{ package_name: "bad;pkg" }, { package_name: ".bad" }, { package_name: "com.example.app", timeout_ms: 0 }]) {
      expect(() => AppPackageInfoRequestSchema.parse(request)).toThrow();
    }
  });

  it("enforces app links global domain verification semantics", () => {
    expect(
      AppLinksRequestSchema.parse({
        package_name: "android",
        device_serial: "emulator-5554"
      })
    ).toEqual({
      package_name: "android",
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });

    expect(
      AppLinksResultSchema.parse({
        device_serial: "emulator-5554",
        requested: { package_name: "com.example.app" },
        package_found: true,
        domains: [
          { domain: "example.com", state: { raw: "verified", kind: "known", code: null } },
          { domain: "*.example.org", state: { raw: "1024", kind: "custom_error", code: 1024 } },
          { domain: "future.example.net", state: { raw: "future_state", kind: "unknown", code: null } }
        ],
        domain_count: 3,
        query: { method: "cmd_package_get_app_links", exit_code: 0, command_duration_ms: 5 },
        verify: {
          policy: "cmd_package_get_app_links_parse",
          ok: true,
          attempts: 1,
          reason: "Package Manager returned global app link domain verification entries for the package"
        },
        semantics: "read_only_global_domain_verification_state_not_url_resolution_or_per_user_selection_or_signatures"
      })
    ).toMatchObject({
      package_found: true,
      domain_count: 3,
      domains: [
        { state: { kind: "known", code: null } },
        { state: { kind: "custom_error", code: 1024 } },
        { state: { kind: "unknown", code: null } }
      ]
    });

    expect(
      AppLinksResultSchema.parse({
        device_serial: "emulator-5554",
        requested: { package_name: "com.example.missing" },
        package_found: false,
        domains: [],
        domain_count: 0,
        query: { method: "cmd_package_get_app_links", exit_code: 1, command_duration_ms: 3 },
        verify: {
          policy: "cmd_package_get_app_links_parse",
          ok: true,
          attempts: 1,
          reason: "Package Manager reported the package unavailable for app link domain verification state"
        },
        semantics: "read_only_global_domain_verification_state_not_url_resolution_or_per_user_selection_or_signatures"
      })
    ).toMatchObject({ package_found: false, domains: [], domain_count: 0 });

    for (const result of [
      { package_found: true, domains: [], domain_count: 1 },
      {
        package_found: false,
        domains: [{ domain: "example.com", state: { raw: "verified", kind: "known", code: null } }],
        domain_count: 1
      },
      {
        package_found: true,
        domains: [{ domain: "example.com", state: { raw: "1024", kind: "known", code: 1024 } }],
        domain_count: 1
      }
    ]) {
      expect(() =>
        AppLinksResultSchema.parse({
          device_serial: "emulator-5554",
          requested: { package_name: "com.example.app" },
          query: { method: "cmd_package_get_app_links", exit_code: 0, command_duration_ms: 1 },
          verify: { policy: "cmd_package_get_app_links_parse", ok: true, attempts: 1, reason: "snapshot" },
          semantics: "read_only_global_domain_verification_state_not_url_resolution_or_per_user_selection_or_signatures",
          ...result
        })
      ).toThrow();
    }
    for (const request of [{ package_name: "bad;pkg" }, { package_name: ".bad" }, { package_name: "com.example.app", timeout_ms: 0 }]) {
      expect(() => AppLinksRequestSchema.parse(request)).toThrow();
    }
  });

  it("enforces appops single-op snapshot semantics", () => {
    expect(
      AppOpsGetRequestSchema.parse({
        package_name: "android",
        op_name: "CAMERA",
        user_id: 0,
        device_serial: "emulator-5554"
      })
    ).toEqual({
      package_name: "android",
      op_name: "CAMERA",
      user_id: 0,
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });

    expect(
      AppOpsGetResultSchema.parse({
        device_serial: "emulator-5554",
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
      })
    ).toMatchObject({
      lookup: { status: "resolved", uid_resolved: true },
      entry_count: 2,
      entries: [{ mode: { kind: "foreground" } }, { mode: { kind: "allow" } }]
    });

    expect(
      AppOpsGetResultSchema.parse({
        device_serial: "emulator-5554",
        requested: { package_name: "com.example.app", op_name: "WRITE_SETTINGS", user_id: null },
        lookup: { status: "resolved", uid_resolved: true, reason: "appops_uid_resolved" },
        default_mode: { raw: "default", kind: "default" },
        entries: [],
        entry_count: 0,
        query: { method: "cmd_appops_get", exit_code: 0, command_duration_ms: 5 },
        verify: { policy: "cmd_appops_get_single_op_parse", ok: true, attempts: 1, reason: "snapshot" },
        semantics: "read_only_appops_single_op_snapshot_not_runtime_permission_or_effective_behavior_proof"
      })
    ).toMatchObject({ default_mode: { kind: "default" }, entries: [] });

    expect(
      AppOpsGetResultSchema.parse({
        device_serial: "emulator-5554",
        requested: { package_name: "com.example.missing", op_name: "CAMERA", user_id: null },
        lookup: { status: "no_uid", uid_resolved: false, reason: "no_appops_uid_for_package_in_queried_user" },
        default_mode: null,
        entries: [],
        entry_count: 0,
        query: { method: "cmd_appops_get", exit_code: 0, command_duration_ms: 3 },
        verify: { policy: "cmd_appops_get_single_op_parse", ok: true, attempts: 1, reason: "no uid" },
        semantics: "read_only_appops_single_op_snapshot_not_runtime_permission_or_effective_behavior_proof"
      })
    ).toMatchObject({ lookup: { status: "no_uid" }, entries: [], entry_count: 0 });

    for (const result of [
      { lookup: { status: "resolved", uid_resolved: true, reason: "appops_uid_resolved" }, entries: [], entry_count: 1, default_mode: null },
      {
        lookup: { status: "no_uid", uid_resolved: false, reason: "no_appops_uid_for_package_in_queried_user" },
        entries: [
          {
            scope: "package",
            op_name: "CAMERA",
            mode: { raw: "allow", kind: "allow" },
            details: { time_raw: null, reject_time_raw: null, duration_raw: null }
          }
        ],
        entry_count: 1,
        default_mode: null
      },
      {
        lookup: { status: "resolved", uid_resolved: true, reason: "appops_uid_resolved" },
        entries: [
          {
            scope: "package",
            op_name: "RECORD_AUDIO",
            mode: { raw: "allow", kind: "allow" },
            details: { time_raw: null, reject_time_raw: null, duration_raw: null }
          }
        ],
        entry_count: 1,
        default_mode: null
      },
      {
        lookup: { status: "resolved", uid_resolved: true, reason: "appops_uid_resolved" },
        entries: [
          {
            scope: "package",
            op_name: "CAMERA",
            mode: { raw: "allow", kind: "unknown" },
            details: { time_raw: null, reject_time_raw: null, duration_raw: null }
          }
        ],
        entry_count: 1,
        default_mode: null
      }
    ]) {
      expect(() =>
        AppOpsGetResultSchema.parse({
          device_serial: "emulator-5554",
          requested: { package_name: "com.example.app", op_name: "CAMERA", user_id: null },
          query: { method: "cmd_appops_get", exit_code: 0, command_duration_ms: 1 },
          verify: { policy: "cmd_appops_get_single_op_parse", ok: true, attempts: 1, reason: "snapshot" },
          semantics: "read_only_appops_single_op_snapshot_not_runtime_permission_or_effective_behavior_proof",
          ...result
        })
      ).toThrow();
    }
    for (const request of [
      { package_name: "bad;pkg", op_name: "CAMERA" },
      { package_name: "com.example.app", op_name: "MIUIOP(10001)" },
      { package_name: "com.example.app", op_name: "camera" },
      { package_name: "com.example.app" },
      { package_name: "com.example.app", op_name: "CAMERA", timeout_ms: 0 }
    ]) {
      expect(() => AppOpsGetRequestSchema.parse(request)).toThrow();
    }
  });

  it("enforces app activities intent query semantics", () => {
    expect(
      AppActivitiesRequestSchema.parse({
        package_name: "com.example.app",
        device_serial: "emulator-5554"
      })
    ).toEqual({
      package_name: "com.example.app",
      intent: "launcher",
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });
    expect(
      AppActivitiesResultSchema.parse({
        device_serial: "emulator-5554",
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
      })
    ).toMatchObject({
      found: true,
      activity_count: 1,
      activities: [{ activity: "com.example.app.MainActivity" }]
    });
    for (const result of [
      { found: true, activities: [], activity_count: 0 },
      { found: false, activities: [appActivityRecord()], activity_count: 1 },
      { found: true, activities: [appActivityRecord()], activity_count: 2 },
      { found: true, activities: [appActivityRecord({ package_name: "com.other.app" })], activity_count: 1 }
    ]) {
      expect(() =>
        AppActivitiesResultSchema.parse({
          device_serial: "emulator-5554",
          requested: { package_name: "com.example.app", intent: "launcher" },
          query: { method: "cmd_package_query_activities", exit_code: 0, command_duration_ms: 1 },
          verify: { policy: "cmd_package_query_activities_parse", ok: true, attempts: 1, reason: "query parsed" },
          semantics: "read_only_intent_activity_query_not_install_or_launchability_proof",
          ...result
        })
      ).toThrow();
    }
    for (const request of [{ package_name: "bad;pkg" }, { package_name: ".bad" }, { package_name: "com.example.app", intent: "home" }]) {
      expect(() => AppActivitiesRequestSchema.parse(request)).toThrow();
    }
  });

  it("enforces app pids read-only process snapshot semantics", () => {
    expect(
      AppPidsRequestSchema.parse({
        package_name: "com.example.app",
        device_serial: "emulator-5554"
      })
    ).toEqual({
      package_name: "com.example.app",
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });
    expect(
      AppPidsResultSchema.parse({
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
      })
    ).toMatchObject({
      running: true,
      pid_count: 2,
      verify: { policy: "pidof_process_snapshot", ok: true }
    });
    for (const result of [
      { running: true, pids: [], pid_count: 0 },
      { running: false, pids: [1234], pid_count: 1 },
      { running: true, pids: [1234], pid_count: 2 },
      { running: true, pids: [1234, 1234], pid_count: 2 }
    ]) {
      expect(() =>
        AppPidsResultSchema.parse({
          device_serial: "emulator-5554",
          package_name: "com.example.app",
          query: { method: "pidof", exit_code: 0, command_duration_ms: 1 },
          verify: { policy: "pidof_process_snapshot", ok: true, attempts: 1, reason: "snapshot" },
          semantics: "read_only_pid_snapshot_not_process_liveness_guarantee",
          ...result
        })
      ).toThrow();
    }
    for (const request of [{ package_name: "android" }, { package_name: "bad;pkg" }, { package_name: ".bad" }]) {
      expect(() => AppPidsRequestSchema.parse(request)).toThrow();
    }
  });

  it("enforces app memory read-only snapshot semantics", () => {
    expect(
      AppMemoryRequestSchema.parse({
        package_name: "com.example.app",
        device_serial: "emulator-5554"
      })
    ).toEqual({
      package_name: "com.example.app",
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });
    expect(
      AppMemoryResultSchema.parse({
        device_serial: "emulator-5554",
        requested: { package_name: "com.example.app" },
        running: true,
        processes: [{ pid: 1234, process_name: "com.example.app" }],
        process_count: 1,
        memory: appMemorySnapshot(),
        query: { method: "dumpsys_meminfo", exit_code: 0, command_duration_ms: 5 },
        verify: {
          policy: "dumpsys_meminfo_app_summary_snapshot",
          ok: true,
          attempts: 1,
          reason: "dumpsys meminfo returned an App Summary memory snapshot for the package process"
        },
        semantics: "read_only_memory_snapshot_point_in_time_not_sustained_usage_guarantee"
      })
    ).toMatchObject({
      running: true,
      process_count: 1,
      memory: { totals: { total_pss_kb: 63795 } }
    });
    for (const result of [
      { running: true, processes: [], process_count: 0, memory: appMemorySnapshot() },
      { running: false, processes: [{ pid: 1234, process_name: "com.example.app" }], process_count: 1, memory: emptyAppMemorySnapshot() },
      { running: true, processes: [{ pid: 1234, process_name: "com.example.app" }], process_count: 2, memory: appMemorySnapshot() },
      {
        running: true,
        processes: [
          { pid: 1234, process_name: "com.example.app" },
          { pid: 1234, process_name: "com.example.app" }
        ],
        process_count: 2,
        memory: appMemorySnapshot()
      },
      { running: false, processes: [], process_count: 0, memory: appMemorySnapshot() },
      {
        running: true,
        processes: [{ pid: 1234, process_name: "com.example.app" }],
        process_count: 1,
        memory: emptyAppMemorySnapshot()
      }
    ]) {
      expect(() =>
        AppMemoryResultSchema.parse({
          device_serial: "emulator-5554",
          requested: { package_name: "com.example.app" },
          query: { method: "dumpsys_meminfo", exit_code: 0, command_duration_ms: 1 },
          verify: { policy: "dumpsys_meminfo_app_summary_snapshot", ok: true, attempts: 1, reason: "snapshot" },
          semantics: "read_only_memory_snapshot_point_in_time_not_sustained_usage_guarantee",
          ...result
        })
      ).toThrow();
    }
    for (const request of [{ package_name: "android" }, { package_name: "bad;pkg" }, { package_name: "com.example:remote" }]) {
      expect(() => AppMemoryRequestSchema.parse(request)).toThrow();
    }
  });

  it("enforces app graphics read-only snapshot semantics", () => {
    expect(
      AppGraphicsRequestSchema.parse({
        package_name: "com.example.app",
        device_serial: "emulator-5554"
      })
    ).toEqual({
      package_name: "com.example.app",
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });
    expect(
      AppGraphicsResultSchema.parse({
        device_serial: "emulator-5554",
        requested: { package_name: "com.example.app" },
        running: true,
        processes: [{ pid: 1234, process_name: "com.example.app" }],
        process_count: 1,
        graphics: appGraphicsSummary(),
        query: { method: "dumpsys_gfxinfo", exit_code: 0, command_duration_ms: 5 },
        verify: {
          policy: "dumpsys_gfxinfo_frame_summary_snapshot",
          ok: true,
          attempts: 1,
          reason: "dumpsys gfxinfo returned a graphics frame summary for the package process"
        },
        semantics: "read_only_graphics_summary_since_last_reset_not_sustained_performance_guarantee"
      })
    ).toMatchObject({
      running: true,
      process_count: 1,
      graphics: { total_frames_rendered: 6266, janky_frames: { count: 489, percent: 7.8 } }
    });
    for (const result of [
      { running: true, processes: [], process_count: 0, graphics: appGraphicsSummary() },
      { running: false, processes: [{ pid: 1234, process_name: "com.example.app" }], process_count: 1, graphics: emptyAppGraphicsSummary() },
      { running: true, processes: [{ pid: 1234, process_name: "com.example.app" }], process_count: 2, graphics: appGraphicsSummary() },
      {
        running: true,
        processes: [
          { pid: 1234, process_name: "com.example.app" },
          { pid: 1234, process_name: "com.example.app" }
        ],
        process_count: 2,
        graphics: appGraphicsSummary()
      },
      { running: false, processes: [], process_count: 0, graphics: appGraphicsSummary() },
      {
        running: true,
        processes: [{ pid: 1234, process_name: "com.example.app" }],
        process_count: 1,
        graphics: emptyAppGraphicsSummary()
      }
    ]) {
      expect(() =>
        AppGraphicsResultSchema.parse({
          device_serial: "emulator-5554",
          requested: { package_name: "com.example.app" },
          query: { method: "dumpsys_gfxinfo", exit_code: 0, command_duration_ms: 1 },
          verify: { policy: "dumpsys_gfxinfo_frame_summary_snapshot", ok: true, attempts: 1, reason: "snapshot" },
          semantics: "read_only_graphics_summary_since_last_reset_not_sustained_performance_guarantee",
          ...result
        })
      ).toThrow();
    }
    for (const request of [{ package_name: "android" }, { package_name: "bad;pkg" }, { package_name: "com.example:remote" }]) {
      expect(() => AppGraphicsRequestSchema.parse(request)).toThrow();
    }
  });

  it("enforces app permission mutation request safety", () => {
    expect(
      AppPermissionRequestSchema.parse({
        package_name: "com.example.app",
        permission_name: "android.permission.CAMERA",
        operation: "grant",
        device_serial: "emulator-5554"
      })
    ).toEqual({
      package_name: "com.example.app",
      permission_name: "android.permission.CAMERA",
      operation: "grant",
      timeout_ms: 10_000,
      device_serial: "emulator-5554"
    });
    expect(
      AppPermissionRequestSchema.parse({
        package_name: "com.example.app",
        permission_name: "com.example.permission.READ_42",
        operation: "revoke",
        user_id: 10,
        device_serial: "emulator-5554"
      })
    ).toMatchObject({
      operation: "revoke",
      user_id: 10
    });
    expect(
      AppPermissionResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          package_name: "com.example.app",
          permission_name: "android.permission.CAMERA",
          operation: "grant",
          user_id: null
        },
        permission: {
          method: "pm_grant",
          exit_code: 0,
          command_duration_ms: 3
        },
        verify: {
          policy: "pm_command_success",
          ok: true,
          attempts: 1,
          reason: "pm grant command completed; permission state is not independently verified"
        }
      })
    ).toMatchObject({
      verify: { policy: "pm_command_success", ok: true }
    });
    for (const request of [
      {
        package_name: "com.example.app",
        permission_name: "android.permission.CAMERA",
        operation: "grant"
      },
      {
        package_name: "com.example.app",
        permission_name: "android.permission.CAMERA;pm clear com.other",
        operation: "grant",
        device_serial: "emulator-5554"
      },
      {
        package_name: "com.example.app",
        permission_name: "android.permission.",
        operation: "grant",
        device_serial: "emulator-5554"
      },
      {
        package_name: "com.example.app",
        permission_name: "9android.permission.CAMERA",
        operation: "grant",
        device_serial: "emulator-5554"
      },
      {
        package_name: "com.example.app",
        permission_name: `android.permission.${"A".repeat(256)}`,
        operation: "grant",
        device_serial: "emulator-5554"
      },
      {
        package_name: "com.example.app",
        permission_name: "android.permission.CAMERA",
        operation: "toggle",
        device_serial: "emulator-5554"
      },
      {
        package_name: "com.example.app",
        permission_name: "android.permission.CAMERA",
        operation: "grant",
        user_id: -1,
        device_serial: "emulator-5554"
      }
    ]) {
      expect(() => AppPermissionRequestSchema.parse(request)).toThrow();
    }
  });

  it("enforces app permission inspect read-only request and result semantics", () => {
    expect(
      AppPermissionInspectRequestSchema.parse({
        package_name: "com.example.app",
        permission_name: "android.permission.CAMERA"
      })
    ).toEqual({
      package_name: "com.example.app",
      permission_name: "android.permission.CAMERA",
      timeout_ms: 10_000
    });
    expect(
      AppPermissionInspectRequestSchema.parse({
        package_name: "com.example.app",
        permission_name: "android.permission.CAMERA",
        user_id: 0,
        device_serial: "emulator-5554"
      })
    ).toMatchObject({
      user_id: 0,
      device_serial: "emulator-5554"
    });
    expect(
      AppPermissionInspectResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          package_name: "com.example.app",
          permission_name: "android.permission.CAMERA",
          user_id: null
        },
        package_found: true,
        package: { target_sdk: 35 },
        permission: {
          state: "granted",
          granted: true,
          source: "runtime",
          manifest_requested: true,
          available_user_ids: [0],
          install: { present: false, granted: null, flags: [] },
          runtime: {
            selected_user_id: 0,
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
      })
    ).toMatchObject({
      permission: { state: "granted", source: "runtime" },
      semantics: "package_dump_permission_state_not_appops"
    });
    for (const request of [
      {
        package_name: "com.example.app",
        permission_name: "android.permission.CAMERA;pm clear com.other"
      },
      {
        package_name: "com.example.app",
        permission_name: "android.permission.CAMERA",
        user_id: -1
      },
      {
        package_name: "android",
        permission_name: "android.permission.CAMERA"
      }
    ]) {
      expect(() => AppPermissionInspectRequestSchema.parse(request)).toThrow();
    }
  });

  it("enforces app uninstall destructive confirmation semantics", () => {
    expect(
      AppUninstallRequestSchema.parse({
        package_name: "com.androidx.test",
        confirm_package: "com.androidx.test",
        user_id: 10,
        device_serial: "emulator-5554"
      })
    ).toEqual({
      package_name: "com.androidx.test",
      confirm_package: "com.androidx.test",
      user_id: 10,
      timeout_ms: 120_000,
      device_serial: "emulator-5554"
    });
    expect(
      AppUninstallResultSchema.parse({
        device_serial: "emulator-5554",
        requested: {
          package_name: "com.example.app",
          user_id: null
        },
        uninstall: {
          method: "adb_uninstall",
          exit_code: 0,
          command_duration_ms: 8
        },
        verify: {
          policy: "adb_success",
          ok: true,
          attempts: 1,
          reason: "adb uninstall returned Success"
        }
      })
    ).toMatchObject({
      verify: { policy: "adb_success", ok: true }
    });
    for (const request of [
      {
        package_name: "com.example.app",
        confirm_package: "com.other.app",
        device_serial: "emulator-5554"
      },
      {
        package_name: "com.example.app",
        confirm_package: "com.example.app"
      },
      {
        package_name: "com.example.app;pm clear com.other",
        confirm_package: "com.example.app;pm clear com.other",
        device_serial: "emulator-5554"
      },
      {
        package_name: "com.android",
        confirm_package: "com.android",
        device_serial: "emulator-5554"
      },
      {
        package_name: "com.android.settings",
        confirm_package: "com.android.settings",
        device_serial: "emulator-5554"
      },
      {
        package_name: "com.google.android.gms.persistent",
        confirm_package: "com.google.android.gms.persistent",
        device_serial: "emulator-5554"
      },
      {
        package_name: "com.example.app",
        confirm_package: "com.example.app",
        user_id: -1,
        device_serial: "emulator-5554"
      },
      {
        package_name: "com.example.app",
        confirm_package: "com.example.app",
        timeout_ms: 0,
        device_serial: "emulator-5554"
      }
    ]) {
      expect(() => AppUninstallRequestSchema.parse(request)).toThrow();
    }
  });

  it("enforces logs dump bounded request semantics", () => {
    expect(
      LogsDumpRequestSchema.parse({
        package_name: "com.example.app"
      })
    ).toMatchObject({
      package_name: "com.example.app",
      lines: 200,
      timeout_ms: 10_000
    });
    expect(
      LogsDumpRequestSchema.parse({
        package_name: "com.example.app",
        lines: 1000,
        device_serial: "emulator-5554"
      })
    ).toMatchObject({
      lines: 1000,
      device_serial: "emulator-5554"
    });
    for (const request of [
      { package_name: "bad;pkg" },
      { package_name: "com.example.app", lines: 0 },
      { package_name: "com.example.app", lines: 1001 }
    ]) {
      expect(() => LogsDumpRequestSchema.parse(request)).toThrow();
    }
  });
});
