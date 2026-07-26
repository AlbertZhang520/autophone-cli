import type { Command } from "commander";
import { ClipboardGetRequestSchema, ClipboardSetRequestSchema } from "../../contracts/index.js";
import { clipboardGet, clipboardSet } from "../../core/index.js";
import type { CliRuntimeContext } from "../command-context.js";
import { createCliDriver } from "../driver.js";
import { writeSuccessJson } from "../success-writer.js";

export function registerClipboardCommands(context: CliRuntimeContext): void {
  const { program, io, requestId, startedAt, driverFactory } = context;
  const setCurrentCommandName = (name: string): string => {
    context.setCommandName(name);
    return name;
  };
  const clipboard = program.command("clipboard").description("read or write Android clipboard metadata");

  clipboard
    .command("get")
    .description("read Android clipboard metadata without printing clipboard text")
    .action(async () => {
      const commandName = setCurrentCommandName("clipboard.get");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = ClipboardGetRequestSchema.parse({
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const result = await clipboardGet(createCliDriver(driverFactory, globalOptions), request);
      writeSuccessJson(
        io,
        {
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: ["clipboard get never prints clipboard text; only length and digest metadata are returned"],
          trace: { timeout_ms: request.timeout_ms, clipboard: "metadata_only" }
        }
      );
    });

  clipboard
    .command("set")
    .description("set Android clipboard text without echoing it to stdout")
    .requiredOption("--text <text>", "text to copy to Android clipboard")
    .action(async (localOptions: { text: string }, localCommand: Command) => {
      const commandName = setCurrentCommandName("clipboard.set");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = ClipboardSetRequestSchema.parse({
        text: localOptions.text,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const result = await clipboardSet(createCliDriver(driverFactory, globalOptions), request);
      writeSuccessJson(
        io,
        {
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings:
            localCommand.getOptionValueSource("text") === "cli"
              ? ["clipboard set does not echo text; result contains only length and digest metadata"]
              : [],
          trace: { timeout_ms: request.timeout_ms, text_length: request.text.length }
        }
      );
    });
}
