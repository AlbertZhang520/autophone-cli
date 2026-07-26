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

describe("generated JSON schemas: app golden responses", () => {
  it("validates a golden app list response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-list-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppListResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-list",
      ok: true,
      command: "app.list",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        packages: ["android", "com.example.app"],
        count: 2,
        scope: "third_party",
        state: "enabled",
        include_uninstalled: true,
        filter: "example"
      },
      error: null,
      warnings: [],
      trace: { package_manager: "pm", filter_mode: "substring" }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app inspect response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-inspect-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppInspectResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-inspect",
      ok: true,
      command: "app.inspect",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        requested: {
          package_name: "com.example.app",
          user_id: 0
        },
        installed: true,
        paths: ["/data/app/com.example/base.apk", "/data/app/com.example/split_config.apk"],
        path_count: 2,
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
      },
      error: null,
      warnings: ["app inspect returns device APK paths; it does not parse package metadata"],
      trace: { package_manager: "pm", query: "path", user_scope: "explicit_user" }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app activities response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-activities-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppActivitiesResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-activities",
      ok: true,
      command: "app.activities",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
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
      },
      error: null,
      warnings: [
        "app activities is read-only and reports Package Manager intent query results; it does not start an activity",
        "No activities found does not prove package absence, install state, or per-user launchability"
      ],
      trace: { query: "cmd_package_query_activities", intent: "launcher", found: true, activity_count: 1 }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app package-info response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-package-info-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppPackageInfoResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-package-info",
      ok: true,
      command: "app.package_info",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
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
      },
      error: null,
      warnings: [
        "app package-info parses only the active Package Manager metadata block",
        "app package-info does not parse permissions, signatures, per-user install state, or raw dumps"
      ],
      trace: { query: "dumpsys_package", installed: true, version_code: 42 }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app links response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-links-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppLinksResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-links",
      ok: true,
      command: "app.links",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        requested: { package_name: "com.example.app" },
        package_found: true,
        domains: [
          { domain: "example.com", state: { raw: "verified", kind: "known", code: null } },
          { domain: "custom.example.com", state: { raw: "1024", kind: "custom_error", code: 1024 } }
        ],
        domain_count: 2,
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
      },
      error: null,
      warnings: [
        "app links reports global domain verification state only",
        "app links does not prove URL resolution, launchability, network access, or per-user link selection",
        "app links intentionally does not expose package signatures or domain-verification IDs"
      ],
      trace: {
        package_manager: "cmd package get-app-links",
        package_found: true,
        domain_count: 2
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden appops get response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-ops-get-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppOpsGetResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-appops-get",
      ok: true,
      command: "app.appops_get",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
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
        query: {
          method: "cmd_appops_get",
          exit_code: 0,
          command_duration_ms: 5
        },
        verify: {
          policy: "cmd_appops_get_single_op_parse",
          ok: true,
          attempts: 1,
          reason: "cmd appops get returned explicit AppOps entries for the requested operation"
        },
        semantics: "read_only_appops_single_op_snapshot_not_runtime_permission_or_effective_behavior_proof"
      },
      error: null,
      warnings: [
        "app appops get reads AppOps state only; it does not evaluate runtime permissions or effective app behavior",
        "default queried user is the AppOps command default unless --user is supplied",
        "app appops get intentionally rejects UID targets, numeric ops, MIUIOP(...) tokens, and mutating appops commands"
      ],
      trace: {
        appops: "cmd appops get",
        package_name: "com.example.app",
        op_name: "CAMERA",
        user_scope: "explicit_user",
        lookup_status: "resolved",
        entry_count: 2,
        has_default_mode: false
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app clear-data response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-clear-data-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppClearDataResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-clear-data",
      ok: true,
      command: "app.clear_data",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        requested: {
          package_name: "com.example.app"
        },
        clear: {
          method: "pm_clear",
          exit_code: 0,
          command_duration_ms: 9
        },
        verify: {
          policy: "package_manager_success",
          ok: true,
          attempts: 1,
          reason: "package manager returned Success for pm clear"
        }
      },
      error: null,
      warnings: ["app clear-data is destructive and cannot be undone"],
      trace: { package_manager: "pm", destructive: true }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app permission response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-permission-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppPermissionResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-permission",
      ok: true,
      command: "app.permission_grant",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
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
      },
      error: null,
      warnings: ["pm_command_success does not independently verify effective permission state"],
      trace: { package_manager: "pm", operation: "grant", user_scope: "device_default" }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app permission inspect response", async () => {
    const schema = JSON.parse(
      await readFile(join(process.cwd(), "schemas/app-permission-inspect-response.schema.json"), "utf8")
    );
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppPermissionInspectResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-permission-inspect",
      ok: true,
      command: "app.permission_inspect",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        requested: {
          package_name: "com.example.app",
          permission_name: "android.permission.CAMERA",
          user_id: 0
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
      },
      error: null,
      warnings: ["app permission inspect reads Package Manager dump state; it does not evaluate appops or effective app behavior"],
      trace: { package_manager: "dumpsys", query: "package", user_scope: "explicit_user" }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app uninstall response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-uninstall-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppUninstallResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-uninstall",
      ok: true,
      command: "app.uninstall",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        requested: {
          package_name: "com.example.app",
          user_id: 10
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
          reason: "adb uninstall returned Success; package absence is not independently verified"
        }
      },
      error: null,
      warnings: ["adb_success does not independently verify package absence after uninstall"],
      trace: { uninstall_method: "adb_uninstall", user_scope: "explicit_user" }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app pids response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-pids-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppPidsResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-pids",
      ok: true,
      command: "app.pids",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
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
      },
      error: null,
      warnings: ["app pids is a point-in-time pidof snapshot; process IDs can exit or restart immediately after the command"],
      trace: { query: "pidof", running: true, pid_count: 2 }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app memory response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-memory-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppMemoryResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-memory",
      ok: true,
      command: "app.memory",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        requested: { package_name: "com.example.app" },
        running: true,
        processes: [{ pid: 1234, process_name: "com.example.app" }],
        process_count: 1,
        memory: appMemorySnapshot(),
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
      },
      error: null,
      warnings: [
        "app memory is a point-in-time dumpsys meminfo snapshot; it does not prove sustained memory use, leaks, or all package processes"
      ],
      trace: { query: "dumpsys_meminfo", running: true, process_count: 1 }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app graphics response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-graphics-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppGraphicsResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-graphics",
      ok: true,
      command: "app.graphics",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        requested: { package_name: "com.example.app" },
        running: true,
        processes: [{ pid: 1234, process_name: "com.example.app" }],
        process_count: 1,
        graphics: appGraphicsSummary(),
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
      },
      error: null,
      warnings: [
        "app graphics is a point-in-time dumpsys gfxinfo summary since the graphics stats reset; it does not prove sustained performance, leaks, or all package processes"
      ],
      trace: { query: "dumpsys_gfxinfo", running: true, process_count: 1, total_frames_rendered: 6266 }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app current response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-current-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppCurrentResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-current",
      ok: true,
      command: "app.current",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        package: "com.example",
        activity: "com.example.MainActivity",
        focused: true
      },
      error: null,
      warnings: [],
      trace: {}
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app start response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-start-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppStartResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-start",
      ok: true,
      command: "app.start",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        requested: {
          package_name: "com.example",
          activity: ".LauncherActivity",
          normalized_activity: "com.example.LauncherActivity",
          component: "com.example/com.example.LauncherActivity"
        },
        before: {
          device_serial: "emulator-5554",
          package: "com.other",
          activity: "com.other.HomeActivity",
          focused: true
        },
        after: {
          device_serial: "emulator-5554",
          package: "com.example",
          activity: "com.example.SplashActivity",
          focused: true
        },
        am_start: {
          status: "ok",
          activity: "com.example/.LauncherActivity",
          exit_code: 0,
          duration_ms: 123
        },
        verify: {
          policy: "package_foreground",
          ok: true,
          attempts: 1,
          reason: "requested package is foreground"
        }
      },
      error: null,
      warnings: [],
      trace: {}
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app launch response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-launch-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppLaunchResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-launch",
      ok: true,
      command: "app.launch",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        requested: {
          package_name: "com.example"
        },
        before: {
          device_serial: "emulator-5554",
          package: "com.other",
          activity: "com.other.HomeActivity",
          focused: true
        },
        after: {
          device_serial: "emulator-5554",
          package: "com.example",
          activity: "com.example.MainActivity",
          focused: true
        },
        launch: {
          method: "monkey",
          exit_code: 0,
          command_duration_ms: 15
        },
        verify: {
          policy: "package_foreground",
          ok: true,
          attempts: 1,
          reason: "requested package is foreground"
        }
      },
      error: null,
      warnings: [],
      trace: { launch_method: "monkey" }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app resolve-url response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-resolve-url-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppResolveUrlResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-resolve-url",
      ok: true,
      command: "app.resolve_url",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        device_serial: "emulator-5554",
        requested: {
          scheme: "https",
          hostname: "example.com",
          port: null,
          path_present: false,
          query_present: false,
          fragment_present: false,
          url_length: 20
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
        query: { method: "cmd_package_resolve_activity", exit_code: 0, command_duration_ms: 5 },
        verify: {
          policy: "package_manager_resolve_activity_parse",
          ok: true,
          attempts: 1,
          reason: "Package Manager resolved the ACTION_VIEW URL intent to a concrete activity component"
        },
        semantics: "read_only_url_intent_resolution_not_launchability_or_network_proof"
      },
      error: null,
      warnings: ["app resolve-url does not start the URL, prove handler launchability, or prove network/content loading"],
      trace: {
        package_manager: "cmd package resolve-activity",
        intent_action: "android.intent.action.VIEW",
        url_scheme: "https",
        url_hostname: "example.com",
        resolution_type: "activity"
      }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app open-url response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-open-url-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppOpenUrlResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-open-url",
      ok: true,
      command: "app.open_url",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        requested: {
          scheme: "https",
          hostname: "example.com",
          port: null,
          path_present: true,
          query_present: true,
          fragment_present: true,
          url_length: 45
        },
        before: {
          device_serial: "emulator-5554",
          package: "com.launcher",
          activity: "com.launcher.HomeActivity",
          focused: true
        },
        after: {
          device_serial: "emulator-5554",
          package: "com.browser",
          activity: "com.browser.MainActivity",
          focused: true
        },
        open: {
          method: "am_start_view",
          status: "ok",
          activity: "com.browser/.MainActivity",
          exit_code: 0,
          command_duration_ms: 14
        },
        verify: {
          policy: "activity_manager_accepted",
          ok: true,
          attempts: 1,
          reason: "Activity Manager accepted ACTION_VIEW intent; URL content load is not verified"
        }
      },
      error: null,
      warnings: ["activity_manager_accepted does not verify URL content load"],
      trace: { intent_action: "android.intent.action.VIEW", url_scheme: "https", url_hostname: "example.com" }
    });

    expect(validate(envelope)).toBe(true);
  });

  it("validates a golden app stop response", async () => {
    const schema = JSON.parse(await readFile(join(process.cwd(), "schemas/app-stop-response.schema.json"), "utf8"));
    const ajv = await createAjv();
    const validate = ajv.compile(schema);
    const envelope = ResponseEnvelopeSchema(AppStopResultSchema).parse({
      schema_version: "0.1",
      runtime_version: "0.3.0",
      request_id: "req-app-stop",
      ok: true,
      command: "app.stop",
      device: { serial: "emulator-5554" },
      duration_ms: 1,
      result: {
        requested: {
          package_name: "com.example"
        },
        before: {
          device_serial: "emulator-5554",
          package: "com.example",
          activity: "com.example.MainActivity",
          focused: true
        },
        after: {
          device_serial: "emulator-5554",
          package: "com.launcher",
          activity: "com.launcher.HomeActivity",
          focused: true
        },
        stop: {
          method: "am_force_stop",
          exit_code: 0,
          command_duration_ms: 12
        },
        verify: {
          policy: "foreground_absent",
          ok: true,
          attempts: 1,
          reason: "requested package is no longer foreground after force-stop"
        }
      },
      error: null,
      warnings: ["app stop foreground_absent verification does not prove background process absence"],
      trace: { stop_method: "am_force_stop" }
    });

    expect(validate(envelope)).toBe(true);
  });
});
