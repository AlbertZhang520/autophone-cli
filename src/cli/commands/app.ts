import {
  AutophoneError,
  AppActivitiesRequestSchema,
  AppClearDataRequestSchema,
  AppCurrentRequestSchema,
  AppGraphicsRequestSchema,
  AppInstallRequestSchema,
  AppInspectRequestSchema,
  AppLaunchRequestSchema,
  AppLinksRequestSchema,
  AppListRequestSchema,
  AppMemoryRequestSchema,
  AppOpsGetRequestSchema,
  AppOpenUrlRequestSchema,
  AppPackageInfoRequestSchema,
  AppPermissionInspectRequestSchema,
  AppPermissionRequestSchema,
  AppPidsRequestSchema,
  AppResolveUrlRequestSchema,
  AppStartRequestSchema,
  AppStopRequestSchema,
  AppUninstallRequestSchema,
  createSuccessResponse
} from "../../contracts/index.js";
import {
  appActivities,
  appGraphics,
  appLinks,
  appMemory,
  appOpsGet,
  appPackageInfo,
  appPids,
  changeAppPermission,
  clearAppData,
  currentApp,
  inspectApp,
  inspectAppPermission,
  installApp,
  launchApp,
  listApps,
  openUrl,
  resolveUrl,
  startApp,
  stopApp,
  uninstallApp
} from "../../core/index.js";
import type { CliRuntimeContext } from "../command-context.js";
import { writeJson } from "../json-writer.js";
import { inspectApkFile } from "../file-inspection.js";
import {
  parseAppActivitiesIntent,
  parseAppListScope,
  parseAppListState,
  parseAppOpenUrlVerifyPolicy,
  parseAppStopVerifyPolicy,
  parseAppVerifyPolicy,
  parseNonNegativeInt,
  parsePositiveInt
} from "../options.js";

export function registerAppCommands(context: CliRuntimeContext): void {
  const { argv, program, io, requestId, startedAt, driverFactory, runDescriptor } = context;
  let commandName = "unknown";
  const setCurrentCommandName = (name: string): string => {
    context.setCommandName(name);
    return name;
  };

  const app = program.command("app").description("inspect and manage Android apps");
  const runPermissionCommand = async (
    operation: "grant" | "revoke",
    localOptions: { package: string; permission: string; user?: number | undefined }
  ) => {
    commandName = setCurrentCommandName(operation === "grant" ? "app.permission_grant" : "app.permission_revoke");
    const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
    if (globalOptions.serial === undefined) {
      throw new AutophoneError({
        code: "INVALID_REQUEST",
        message: "app permission changes require explicit --serial",
        retriable: false
      });
    }
    const request = AppPermissionRequestSchema.parse({
      package_name: localOptions.package,
      permission_name: localOptions.permission,
      operation,
      user_id: localOptions.user,
      timeout_ms: globalOptions.timeout,
      device_serial: globalOptions.serial
    });
    const driver = driverFactory({ adbPath: globalOptions.adb });
    const result = await changeAppPermission(driver, request);
    writeJson(
      io,
      createSuccessResponse({
        command: commandName,
        requestId,
        startedAt,
        result,
        device: { serial: result.device_serial },
        warnings: [
          operation === "grant"
            ? "app permission grant changes runtime consent state and may bypass app permission dialogs"
            : "app permission revoke may interrupt or change behavior of a running app",
          "pm_command_success does not independently verify effective permission state"
        ],
        trace: {
          timeout_ms: request.timeout_ms,
          package_manager: "pm",
          operation: request.operation,
          user_scope: request.user_id === undefined ? "device_default" : "explicit_user"
        }
      })
    );
  };

  app
    .command("list")
    .description("list installed Android packages for package-name discovery")
    .option("--scope <scope>", "package scope: all, third-party, or system", parseAppListScope, "all")
    .option("--state <state>", "package state: all, enabled, or disabled", parseAppListState, "all")
    .option("--include-uninstalled", "include uninstalled packages still known to the package manager", false)
    .option("--filter <filter>", "safe package-name substring filter")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.list");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppListRequestSchema.parse({
        scope: localOptions.scope,
        state: localOptions.state,
        include_uninstalled: localOptions.includeUninstalled,
        filter: localOptions.filter,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await listApps(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          trace: {
            timeout_ms: request.timeout_ms,
            package_manager: "pm",
            scope: request.scope,
            state: request.state,
            include_uninstalled: request.include_uninstalled,
            filter_mode: request.filter === undefined ? "none" : "substring"
          }
        })
      );
    });

  app
    .command("inspect")
    .description("inspect exact Android package presence using Package Manager path lookup")
    .requiredOption("--package <packageName>", "Android package name to inspect")
    .option("--user <userId>", "Android user id for the package lookup", parseNonNegativeInt)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.inspect");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppInspectRequestSchema.parse({
        package_name: localOptions.package,
        user_id: localOptions.user,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await inspectApp(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: result.installed
            ? ["app inspect returns device APK paths; it does not parse package metadata"]
            : ["app inspect absence means pm path returned no package file path entries"],
          trace: {
            timeout_ms: request.timeout_ms,
            package_manager: "pm",
            query: "path",
            user_scope: request.user_id === undefined ? "system_default" : "explicit_user"
          }
        })
      );
    });

  app
    .command("activities")
    .description("list intent-scoped Android activity components for one package")
    .requiredOption("--package <packageName>", "Android package name to query")
    .option("--intent <intent>", "intent preset: launcher", parseAppActivitiesIntent, "launcher")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.activities");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppActivitiesRequestSchema.parse({
        package_name: localOptions.package,
        intent: localOptions.intent,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await appActivities(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "app activities is read-only and reports Package Manager intent query results; it does not start an activity",
            "No activities found does not prove package absence, install state, or per-user launchability"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            package_name: request.package_name,
            intent: request.intent,
            query: result.query.method,
            found: result.found,
            activity_count: result.activity_count
          }
        })
      );
    });

  app
    .command("package-info")
    .description("read active Package Manager metadata for one Android package")
    .requiredOption("--package <packageName>", "Android package name to query")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.package_info");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppPackageInfoRequestSchema.parse({
        package_name: localOptions.package,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await appPackageInfo(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            result.installed
              ? "app package-info parses only the active Package Manager metadata block"
              : "app package-info absence means dumpsys package reported the exact package was not found",
            "app package-info does not parse permissions, signatures, per-user install state, or raw dumps"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            package_name: request.package_name,
            query: result.query.method,
            installed: result.installed,
            version_code: result.package?.version.code ?? null
          }
        })
      );
    });

  app
    .command("links")
    .description("read global Android App Links domain verification state for one package")
    .requiredOption("--package <packageName>", "Android package name to query")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.links");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppLinksRequestSchema.parse({
        package_name: localOptions.package,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await appLinks(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            result.package_found
              ? "app links reports global domain verification state only"
              : "app links package absence means Package Manager reported the package unavailable",
            "app links does not prove URL resolution, launchability, network access, or per-user link selection",
            "app links intentionally does not expose package signatures or domain-verification IDs"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            package_name: request.package_name,
            package_manager: "cmd package get-app-links",
            package_found: result.package_found,
            domain_count: result.domain_count
          }
        })
      );
    });

  const appOps = app.command("appops").description("read Android AppOps state");

  appOps
    .command("get")
    .description("read one Android AppOps operation state for one package")
    .requiredOption("--package <packageName>", "Android package name to query")
    .requiredOption("--op <opName>", "Android AppOps operation name, for example CAMERA")
    .option("--user <userId>", "Android user id to query; defaults to the AppOps command default user", parseNonNegativeInt)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.appops_get");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppOpsGetRequestSchema.parse({
        package_name: localOptions.package,
        op_name: localOptions.op,
        user_id: localOptions.user,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await appOpsGet(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "app appops get reads AppOps state only; it does not evaluate runtime permissions or effective app behavior",
            result.lookup.status === "resolved"
              ? "default queried user is the AppOps command default unless --user is supplied"
              : "no_uid means AppOps did not resolve a package UID in the queried user; it is not proof of package absence",
            "app appops get intentionally rejects UID targets, numeric ops, MIUIOP(...) tokens, and mutating appops commands"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            appops: "cmd appops get",
            package_name: request.package_name,
            op_name: request.op_name,
            user_scope: request.user_id === undefined ? "appops_default_user" : "explicit_user",
            lookup_status: result.lookup.status,
            entry_count: result.entry_count,
            has_default_mode: result.default_mode !== null
          }
        })
      );
    });

  app
    .command("pids")
    .description("read a point-in-time pidof process snapshot for one Android package")
    .requiredOption("--package <packageName>", "Android package name to query")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.pids");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppPidsRequestSchema.parse({
        package_name: localOptions.package,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await appPids(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "app pids is a point-in-time pidof snapshot; process IDs can exit or restart immediately after the command"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            package_name: request.package_name,
            query: result.query.method,
            running: result.running,
            pid_count: result.pid_count
          }
        })
      );
    });

  app
    .command("memory")
    .description("read a point-in-time dumpsys meminfo App Summary snapshot for one Android package")
    .requiredOption("--package <packageName>", "Android package name to query")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.memory");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppMemoryRequestSchema.parse({
        package_name: localOptions.package,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await appMemory(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "app memory is a point-in-time dumpsys meminfo snapshot; it does not prove sustained memory use, leaks, or all package processes"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            package_name: request.package_name,
            query: result.query.method,
            running: result.running,
            process_count: result.process_count
          }
        })
      );
    });

  app
    .command("graphics")
    .description("read a point-in-time dumpsys gfxinfo frame summary for one Android package")
    .requiredOption("--package <packageName>", "Android package name to query")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.graphics");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppGraphicsRequestSchema.parse({
        package_name: localOptions.package,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await appGraphics(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "app graphics is a point-in-time dumpsys gfxinfo summary since the graphics stats reset; it does not prove sustained performance, leaks, or all package processes"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            package_name: request.package_name,
            query: result.query.method,
            running: result.running,
            process_count: result.process_count,
            total_frames_rendered: result.graphics.total_frames_rendered
          }
        })
      );
    });

  app
    .command("current")
    .description("return the current foreground package and activity")
    .action(async () => {
      commandName = setCurrentCommandName("app.current");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppCurrentRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await currentApp(driver, request);
      const responseInput = {
        command: commandName,
        requestId,
        startedAt,
        result,
        trace: { timeout_ms: globalOptions.timeout }
      };
      const response = createSuccessResponse({ ...responseInput, device: { serial: result.device_serial } });
      writeJson(
        io,
        response
      );
    });

  app
    .command("install")
    .description("install one local APK onto an explicitly selected device")
    .requiredOption("--apk <path>", "local .apk file to install")
    .option("--replace", "replace an existing installed app with the same package", false)
    .option("--grant-runtime-permissions", "pass adb install -g to grant runtime permissions", false)
    .option("--allow-test", "pass adb install -t for test-only packages", false)
    .option("--allow-downgrade", "pass adb install -d for debuggable downgrades", false)
    .option("--install-timeout <ms>", "install timeout in milliseconds", parsePositiveInt)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.install");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      if (globalOptions.serial === undefined) {
        throw new AutophoneError({
          code: "INVALID_REQUEST",
          message: "app install requires explicit --serial",
          retriable: false
        });
      }
      const apk = await inspectApkFile(localOptions.apk);
      const timeoutMs =
        localOptions.installTimeout ??
        (program.getOptionValueSource("timeout") === "cli" ? globalOptions.timeout : undefined);
      const request = AppInstallRequestSchema.parse({
        apk_path: apk.path,
        apk: {
          file_name: apk.fileName,
          bytes: apk.bytes,
          sha256: apk.sha256
        },
        replace: localOptions.replace,
        grant_runtime_permissions: localOptions.grantRuntimePermissions,
        allow_test: localOptions.allowTest,
        allow_downgrade: localOptions.allowDowngrade,
        timeout_ms: timeoutMs,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await installApp(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "app install mutates the target device and may execute third-party code after launch",
            "adb_success does not independently verify package identity after install"
          ],
          trace: {
            install_timeout_ms: request.timeout_ms,
            install_method: "adb_install",
            replace: request.replace,
            grant_runtime_permissions: request.grant_runtime_permissions,
            allow_test: request.allow_test,
            allow_downgrade: request.allow_downgrade
          }
        })
      );
    });

  app
    .command("uninstall")
    .description("uninstall one explicitly confirmed app package from an explicitly selected device")
    .requiredOption("--package <packageName>", "Android package name to uninstall")
    .requiredOption("--confirm-package <packageName>", "must exactly match --package before adb is called")
    .option("--user <userId>", "Android user id for uninstall-for-user semantics", parseNonNegativeInt)
    .option("--uninstall-timeout <ms>", "uninstall timeout in milliseconds", parsePositiveInt)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.uninstall");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      if (globalOptions.serial === undefined) {
        throw new AutophoneError({
          code: "INVALID_REQUEST",
          message: "app uninstall requires explicit --serial",
          retriable: false
        });
      }
      const timeoutMs =
        localOptions.uninstallTimeout ??
        (program.getOptionValueSource("timeout") === "cli" ? globalOptions.timeout : undefined);
      const request = AppUninstallRequestSchema.parse({
        package_name: localOptions.package,
        confirm_package: localOptions.confirmPackage,
        user_id: localOptions.user,
        timeout_ms: timeoutMs,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await uninstallApp(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "app uninstall removes the app package from the target device or selected Android user",
            "adb_success does not independently verify package absence after uninstall"
          ],
          trace: {
            uninstall_timeout_ms: request.timeout_ms,
            uninstall_method: "adb_uninstall",
            user_scope: request.user_id === undefined ? "all_users" : "explicit_user",
            confirmation: "package_name_match"
          }
        })
      );
    });

  const appPermission = app.command("permission").description("grant or revoke one Android runtime permission");

  appPermission
    .command("grant")
    .description("grant one manifest-declared dangerous runtime permission to an app")
    .requiredOption("--package <packageName>", "Android package name")
    .requiredOption("--permission <permissionName>", "Android permission name, for example android.permission.CAMERA")
    .option("--user <userId>", "Android user id for the permission operation", parseNonNegativeInt)
    .action(async (localOptions) => {
      await runPermissionCommand("grant", localOptions);
    });

  appPermission
    .command("revoke")
    .description("revoke one manifest-declared dangerous runtime permission from an app")
    .requiredOption("--package <packageName>", "Android package name")
    .requiredOption("--permission <permissionName>", "Android permission name, for example android.permission.CAMERA")
    .option("--user <userId>", "Android user id for the permission operation", parseNonNegativeInt)
    .action(async (localOptions) => {
      await runPermissionCommand("revoke", localOptions);
    });

  appPermission
    .command("inspect")
    .description("read one app permission state from dumpsys package output")
    .requiredOption("--package <packageName>", "Android package name")
    .requiredOption("--permission <permissionName>", "Android permission name, for example android.permission.CAMERA")
    .option("--user <userId>", "Android user id to inspect; defaults to Android user 0", parseNonNegativeInt)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.permission_inspect");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppPermissionInspectRequestSchema.parse({
        package_name: localOptions.package,
        permission_name: localOptions.permission,
        user_id: localOptions.user,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await inspectAppPermission(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "app permission inspect reads Package Manager dump state; it does not evaluate appops or effective app behavior",
            result.package_found
              ? "default inspected user is Android user 0 unless --user is supplied"
              : "package was not found in dumpsys package output"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            package_manager: "dumpsys",
            query: "package",
            user_scope: request.user_id === undefined ? "default_user_0" : "explicit_user"
          }
        })
      );
    });

  app
    .command("clear-data")
    .description("destructively clear app data for one explicitly confirmed package")
    .requiredOption("--package <packageName>", "Android package name to clear")
    .requiredOption("--confirm-package <packageName>", "must exactly match --package before adb is called")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.clear_data");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppClearDataRequestSchema.parse({
        package_name: localOptions.package,
        confirm_package: localOptions.confirmPackage,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await clearAppData(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: request.device_serial },
          warnings: [
            "app clear-data is destructive and cannot be undone",
            "package_manager_success only means pm clear returned Success"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            package_manager: "pm",
            destructive: true,
            confirmation: "package_name_match"
          }
        })
      );
    });

  app
    .command("resolve-url")
    .description("resolve an http(s) URL ACTION_VIEW handler without starting it")
    .requiredOption("--url <url>", "http or https URL to resolve; redacted from JSON traces")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.resolve_url");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppResolveUrlRequestSchema.parse({
        url: localOptions.url,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await resolveUrl(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings:
            result.resolution.type === "resolver"
              ? [
                  "app resolve-url returned the Android system chooser, not a concrete app handler",
                  "app resolve-url does not start the URL, prove handler launchability, or prove network/content loading"
                ]
              : ["app resolve-url does not start the URL, prove handler launchability, or prove network/content loading"],
          trace: {
            timeout_ms: request.timeout_ms,
            package_manager: "cmd package resolve-activity",
            intent_action: "android.intent.action.VIEW",
            url_scheme: result.requested.scheme,
            url_hostname: result.requested.hostname,
            resolution_type: result.resolution.type
          }
        })
      );
    });

  app
    .command("open-url")
    .description("open an http(s) URL through Android ACTION_VIEW")
    .requiredOption("--url <url>", "http or https URL to open; redacted from JSON traces")
    .option(
      "--verify <policy>",
      "verification policy: activity_manager_accepted or none",
      parseAppOpenUrlVerifyPolicy,
      "activity_manager_accepted"
    )
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.open_url");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppOpenUrlRequestSchema.parse({
        url: localOptions.url,
        verify: localOptions.verify,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await openUrl(driver, request);
      const responseInput = {
        command: commandName,
        requestId,
        startedAt,
        result,
        warnings:
          request.verify === "none"
            ? ["app open-url verification was explicitly disabled"]
            : ["activity_manager_accepted does not verify URL content load"],
        trace: {
          timeout_ms: globalOptions.timeout,
          intent_action: "android.intent.action.VIEW",
          url_scheme: result.requested.scheme,
          url_hostname: result.requested.hostname
        }
      };
      const response = createSuccessResponse({ ...responseInput, device: { serial: result.before.device_serial } });
      writeJson(io, response);
    });

  app
    .command("launch")
    .description("launch an Android app by package through its launcher entry")
    .requiredOption("--package <packageName>", "Android package name")
    .option("--verify <policy>", "verification policy: package_foreground or none", parseAppVerifyPolicy, "package_foreground")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.launch");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppLaunchRequestSchema.parse({
        package_name: localOptions.package,
        verify: localOptions.verify,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await launchApp(driver, request);
      const responseInput = {
        command: commandName,
        requestId,
        startedAt,
        result,
        warnings: request.verify === "none" ? ["app launch verification was explicitly disabled"] : [],
        trace: { timeout_ms: globalOptions.timeout, launch_method: result.launch.method }
      };
      const response = createSuccessResponse({ ...responseInput, device: { serial: result.before.device_serial } });
      writeJson(io, response);
    });

  app
    .command("stop")
    .description("force-stop an Android app package")
    .requiredOption("--package <packageName>", "Android package name")
    .option("--verify <policy>", "verification policy: foreground_absent or none", parseAppStopVerifyPolicy, "foreground_absent")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.stop");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppStopRequestSchema.parse({
        package_name: localOptions.package,
        verify: localOptions.verify,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await stopApp(driver, request);
      const responseInput = {
        command: commandName,
        requestId,
        startedAt,
        result,
        warnings:
          request.verify === "none"
            ? ["app stop verification was explicitly disabled"]
            : ["app stop foreground_absent verification does not prove background process absence"],
        trace: { timeout_ms: globalOptions.timeout, stop_method: result.stop.method }
      };
      const response = createSuccessResponse({ ...responseInput, device: { serial: result.before.device_serial } });
      writeJson(io, response);
    });

  app
    .command("start")
    .description("start an explicit Android component and verify the package becomes foreground")
    .option("--package <packageName>", "Android package name")
    .option("--activity <activityName>", "activity class, either relative like .MainActivity or fully qualified")
    .option("--verify <policy>", "verification policy: package_foreground or none", parseAppVerifyPolicy, "package_foreground")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("app.start");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = AppStartRequestSchema.parse({
        package_name: localOptions.package,
        activity: localOptions.activity,
        verify: localOptions.verify,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await startApp(driver, request);
      const responseInput = {
        command: commandName,
        requestId,
        startedAt,
        result,
        warnings: request.verify === "none" ? ["app start verification was explicitly disabled"] : [],
        trace: { timeout_ms: globalOptions.timeout }
      };
      const response = createSuccessResponse({ ...responseInput, device: { serial: result.before.device_serial } });
      writeJson(
        io,
        response
      );
    });


}
