import { type z } from "zod";
import type { Command } from "commander";
import { createSuccessResponse, type DeviceInfo } from "../contracts/index.js";
import type { AndroidDriver } from "../core/index.js";
import { writeJson, type CliIo } from "./json-writer.js";

export type DriverFactory = (options: { adbPath?: string | undefined }) => AndroidDriver;

export type GlobalCliOptions = {
  adb?: string | undefined;
  serial?: string | undefined;
  timeout: number;
};

export type CliCommandSuccessMetadata = {
  device?: DeviceInfo | undefined;
  warnings?: string[] | undefined;
  trace?: Record<string, unknown> | undefined;
};

export type CliCommandDescriptor<Request, Result> = {
  name: string;
  argvPath: readonly string[];
  description: string;
  requestSchema: z.ZodType<Request>;
  buildRequest: (globalOptions: GlobalCliOptions) => unknown;
  run: (driver: AndroidDriver, request: Request) => Promise<Result>;
  buildSuccessMetadata: (
    result: Result,
    request: Request,
    globalOptions: GlobalCliOptions
  ) => CliCommandSuccessMetadata;
};

export async function executeCliCommand<Request, Result>(
  descriptor: CliCommandDescriptor<Request, Result>,
  context: {
    io: CliIo;
    requestId: string;
    startedAt: number;
    driverFactory: DriverFactory;
    globalOptions: GlobalCliOptions;
  }
): Promise<void> {
  const request = descriptor.requestSchema.parse(descriptor.buildRequest(context.globalOptions));
  const driver = context.driverFactory({ adbPath: context.globalOptions.adb });
  const result = await descriptor.run(driver, request);
  const metadata = descriptor.buildSuccessMetadata(result, request, context.globalOptions);
  const responseInput: {
    command: string;
    requestId: string;
    startedAt: number;
    result: Awaited<Result>;
    device?: DeviceInfo;
    warnings?: string[];
    trace?: Record<string, unknown>;
  } = {
    command: descriptor.name,
    requestId: context.requestId,
    startedAt: context.startedAt,
    result
  };

  if (metadata.device !== undefined) {
    responseInput.device = metadata.device;
  }
  if (metadata.warnings !== undefined) {
    responseInput.warnings = metadata.warnings;
  }
  if (metadata.trace !== undefined) {
    responseInput.trace = metadata.trace;
  }

  writeJson(context.io, createSuccessResponse(responseInput));
}

export function registerCliCommand<Request, Result>(
  parent: Command,
  parentPath: string,
  descriptor: CliCommandDescriptor<Request, Result>,
  action: (descriptor: CliCommandDescriptor<Request, Result>) => Promise<void>
): void {
  parent
    .command(descriptorChildName(parentPath, descriptor))
    .description(descriptor.description)
    .action(async () => action(descriptor));
}

function descriptorChildName<Request, Result>(
  parentPath: string,
  descriptor: CliCommandDescriptor<Request, Result>
): string {
  const prefix = descriptor.argvPath.slice(0, -1).join(" ");
  const childName = descriptor.argvPath[descriptor.argvPath.length - 1];
  if (childName === undefined || prefix !== parentPath) {
    throw new Error(`descriptor ${descriptor.name} argv path must be a direct child of ${parentPath}`);
  }
  return childName;
}
