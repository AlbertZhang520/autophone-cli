import type { Command } from "commander";
import type { CliCommandDescriptor, DriverFactory } from "./command-descriptor.js";
import type { CliIo } from "./json-writer.js";

export type CliRuntimeContext = {
  argv: readonly string[];
  program: Command;
  io: CliIo;
  requestId: string;
  startedAt: number;
  driverFactory: DriverFactory;
  runDescriptor: <Request, Result>(descriptor: CliCommandDescriptor<Request, Result>) => Promise<void>;
  setCommandName: (name: string) => void;
};
