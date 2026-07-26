#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { Command, CommanderError } from "commander";
import { ZodError } from "zod";
import { RUNTIME_VERSION, createFailureResponse } from "../contracts/index.js";
import { AdbDriver } from "../drivers/adb/index.js";
import { executeCliCommand, type CliCommandDescriptor, type DriverFactory, type GlobalCliOptions } from "./command-descriptor.js";
import type { CliRuntimeContext } from "./command-context.js";
import { normalizeError, writeJson, type CliIo } from "./json-writer.js";
import { parsePositiveInt } from "./options.js";
import { readProofContext, setProofContext } from "./proof-writer.js";
import { redactSensitiveArgv, redactSensitiveError } from "./redaction.js";
import { registerCommands } from "./register-commands.js";
const DEFAULT_TIMEOUT_MS = 10_000;

export async function runCli(
  argv: readonly string[],
  options: {
    io?: CliIo;
    driverFactory?: DriverFactory;
    requestIdFactory?: () => string;
  } = {}
): Promise<number> {
  const io = options.io ?? { stdout: process.stdout, stderr: process.stderr };
  const driverFactory = options.driverFactory ?? ((driverOptions) => new AdbDriver(driverOptions));
  const requestIdFactory = options.requestIdFactory ?? randomUUID;
  const startedAt = Date.now();
  const requestId = requestIdFactory();
  let commandName = "unknown";

  const program = new Command();
  program
    .name("autophone")
    .description("Agent-facing Android control runtime")
    .exitOverride()
    .configureOutput({
      writeOut: (value) => io.stderr.write(value),
      writeErr: (value) => io.stderr.write(value)
    })
    .version(RUNTIME_VERSION)
    .option("--adb <path>", "path to adb executable")
    .option("--serial <serial>", "target adb device serial")
    .option("--proof-dir <dir>", "write an opt-in redacted proof manifest under this directory")
    .option("--timeout <ms>", "command timeout in milliseconds", parsePositiveInt, DEFAULT_TIMEOUT_MS);
  setProofContext(readProofContext(argv));

  async function runDescriptor<Request, Result>(descriptor: CliCommandDescriptor<Request, Result>): Promise<void> {
    commandName = descriptor.name;
    await executeCliCommand(descriptor, {
      io,
      requestId,
      startedAt,
      driverFactory,
      globalOptions: program.opts<GlobalCliOptions>()
    });
  }

  const runtimeContext: CliRuntimeContext = {
    argv,
    program,
    io,
    requestId,
    startedAt,
    driverFactory,
    runDescriptor,
    setCommandName: (name) => {
      commandName = name;
    }
  };

  registerCommands(runtimeContext);

  try {
    await program.parseAsync([...argv], { from: "user" });
    return 0;
  } catch (error) {
    if (isCommanderInformationalExit(error)) {
      return error.exitCode;
    }
    const normalized = redactSensitiveError(normalizeCliError(error), argv, commandName);
    writeJson(
      io,
      createFailureResponse({
        command: commandName,
        requestId,
        startedAt,
        error: normalized,
        trace: { argv: redactSensitiveArgv(argv, commandName) }
      })
    );
    return normalized.code === "INTERNAL" ? 1 : 2;
  }
}

function isCommanderInformationalExit(error: unknown): error is CommanderError {
  return error instanceof CommanderError && error.exitCode === 0;
}

function normalizeCliError(error: unknown) {
  if (error instanceof CommanderError) {
    return {
      code: "INVALID_REQUEST" as const,
      message: normalizeCommanderMessage(error),
      retriable: false
    };
  }
  if (error instanceof ZodError) {
    return {
      code: "INVALID_REQUEST" as const,
      message: error.issues.map((issue) => issue.message).join("; "),
      retriable: false,
      details: { issues: error.issues }
    };
  }
  return normalizeError(error);
}

function normalizeCommanderMessage(error: CommanderError): string {
  if (error.code === "commander.help") {
    return "command requires a concrete subcommand";
  }
  return error.message;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
