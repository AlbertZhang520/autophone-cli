import { LogsDumpRequestSchema, WaitAppRequestSchema, WaitUiRequestSchema, createSuccessResponse } from "../../contracts/index.js";
import { dumpLogs, waitForApp, waitForUi } from "../../core/index.js";
import type { CliRuntimeContext } from "../command-context.js";
import { writeJson } from "../json-writer.js";
import { buildSelector, parsePositiveInt } from "../options.js";

export function registerWaitAndLogCommands(context: CliRuntimeContext): void {
  const { argv, program, io, requestId, startedAt, driverFactory, runDescriptor } = context;
  let commandName = "unknown";
  const setCurrentCommandName = (name: string): string => {
    context.setCommandName(name);
    return name;
  };

  const wait = program.command("wait").description("poll until a read-only condition is met");

  wait
    .command("ui")
    .description("wait until a selector is present or absent")
    .option("--text <text>", "exact node text")
    .option("--resource-id <resourceId>", "exact Android resource-id")
    .option("--content-desc <contentDesc>", "exact content-desc")
    .option("--class <className>", "exact class name")
    .option("--condition <condition>", "wait condition: present or absent", "present")
    .option("--wait-timeout <ms>", "overall wait timeout in milliseconds", parsePositiveInt, 10_000)
    .option("--interval <ms>", "delay between polls in milliseconds", parsePositiveInt, 500)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("wait.ui");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = WaitUiRequestSchema.parse({
        selector: buildSelector(localOptions),
        condition: localOptions.condition,
        wait_timeout_ms: localOptions.waitTimeout,
        interval_ms: localOptions.interval,
        poll_timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await waitForUi(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          trace: {
            wait_timeout_ms: request.wait_timeout_ms,
            interval_ms: request.interval_ms,
            poll_timeout_ms: request.poll_timeout_ms,
            condition: request.condition
          }
        })
      );
    });

  wait
    .command("app")
    .description("wait until a package, and optionally an exact activity, is foreground")
    .requiredOption("--package <packageName>", "Android package name")
    .option("--activity <activityName>", "optional exact activity class")
    .option("--wait-timeout <ms>", "overall wait timeout in milliseconds", parsePositiveInt, 10_000)
    .option("--interval <ms>", "delay between polls in milliseconds", parsePositiveInt, 500)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("wait.app");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = WaitAppRequestSchema.parse({
        package_name: localOptions.package,
        activity: localOptions.activity,
        wait_timeout_ms: localOptions.waitTimeout,
        interval_ms: localOptions.interval,
        poll_timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await waitForApp(driver, request);
      const responseInput = {
        command: commandName,
        requestId,
        startedAt,
        result,
        trace: {
          wait_timeout_ms: request.wait_timeout_ms,
          interval_ms: request.interval_ms,
          poll_timeout_ms: request.poll_timeout_ms
        }
      };
      writeJson(io, createSuccessResponse({ ...responseInput, device: { serial: result.current.device_serial } }));
    });

  const logs = program.command("logs").description("read bounded Android diagnostic logs");

  logs
    .command("dump")
    .description("dump bounded logcat lines for the current process IDs of one package")
    .requiredOption("--package <packageName>", "Android package name")
    .option("--lines <count>", "recent logcat lines per process, 1-1000", parsePositiveInt, 200)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("logs.dump");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = LogsDumpRequestSchema.parse({
        package_name: localOptions.package,
        lines: localOptions.lines,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await dumpLogs(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "logs dump output is capped but not redacted; app logs may contain sensitive data",
            "logs dump captures current process IDs only and groups output by PID"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            package_name: request.package_name,
            per_pid_line_limit: request.lines,
            logcat_format: result.dump.format,
            logcat_buffers: result.dump.buffers
          }
        })
      );
    });


}
