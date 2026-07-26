import type { Command } from "commander";
import { KeyPressRequestSchema, TextClearRequestSchema, TextInputRequestSchema, createSuccessResponse } from "../../contracts/index.js";
import { keyPress, textClear, textInput } from "../../core/index.js";
import type { CliRuntimeContext } from "../command-context.js";
import { writeJson } from "../json-writer.js";
import { parseKeyVerifyPolicy, parseNonNegativeInt } from "../options.js";
import { parseTextInputVerifyPolicy, parseTextInputVia, textInputWarnings } from "../text-input-options.js";

export function registerInputCommands(context: CliRuntimeContext): void {
  const { argv, program, io, requestId, startedAt, driverFactory, runDescriptor } = context;
  let commandName = "unknown";
  const setCurrentCommandName = (name: string): string => {
    context.setCommandName(name);
    return name;
  };

  const key = program.command("key").description("send safe Android key events");

  key
    .command("press")
    .description("send one allowlisted Android keyevent")
    .requiredOption("--key <key>", "key name, such as BACK, HOME, APP_SWITCH, or DPAD_CENTER")
    .option("--verify <policy>", "verification policy: screen_changed or none", parseKeyVerifyPolicy, "none")
    .action(async (localOptions, localCommand: Command) => {
      commandName = setCurrentCommandName("key.press");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = KeyPressRequestSchema.parse({
        key: localOptions.key,
        verify: localOptions.verify,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await keyPress(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          warnings:
            request.verify === "none" && localCommand.getOptionValueSource("verify") === "cli"
              ? ["key press verification was explicitly disabled"]
              : [],
          trace: { timeout_ms: globalOptions.timeout }
        })
      );
    });

  const text = program.command("text").description("type or clear focused Android input fields");

  text
    .command("input")
    .description("send text through Android input text, ADBKeyboard Unicode commit, or clipboard paste")
    .requiredOption("--text <text>", "text to type; input_text accepts printable ASCII, adb_keyboard accepts Unicode")
    .option("--via <method>", "input method: input_text, adb_keyboard, or clipboard", parseTextInputVia, "input_text")
    .option("--verify <policy>", "verification policy: field_text, screen_changed, or none", parseTextInputVerifyPolicy, "none")
    .action(async (localOptions, localCommand: Command) => {
      commandName = setCurrentCommandName("text.input");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = TextInputRequestSchema.parse({
        text: localOptions.text,
        via: localOptions.via,
        verify: localOptions.verify,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await textInput(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          warnings: textInputWarnings(request, localCommand.getOptionValueSource("verify") === "cli"),
          trace: { timeout_ms: globalOptions.timeout, text_length: request.text.length, via: request.via }
        })
      );
    });

  text
    .command("clear")
    .description("send a bounded best-effort clear sequence to the focused Android input field")
    .option("--max-chars <count>", "maximum backward-delete key events to send, 1-512", parseNonNegativeInt, 64)
    .option("--verify <policy>", "verification policy: field_text (prove emptiness), screen_changed, or none", parseTextInputVerifyPolicy, "none")
    .action(async (localOptions, localCommand: Command) => {
      commandName = setCurrentCommandName("text.clear");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = TextClearRequestSchema.parse({
        max_chars: localOptions.maxChars,
        verify: localOptions.verify,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await textClear(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          warnings:
            request.verify === "field_text"
              ? []
              : request.verify === "screen_changed" && localCommand.getOptionValueSource("verify") === "cli" ? ["screen_changed verification does not confirm the field is empty"] : ["text clear is best-effort; field emptiness is not confirmed"],
          trace: { timeout_ms: globalOptions.timeout, max_chars: request.max_chars }
        })
      );
    });
}
