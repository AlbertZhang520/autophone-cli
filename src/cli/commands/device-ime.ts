import type { Command } from "commander";
import {
  AutophoneError,
  DeviceImeResetRequestSchema,
  DeviceImeSetRequestSchema,
  type DeviceImeResetRequest,
  type DeviceImeResetResult,
  type DeviceImeSetRequest,
  type DeviceImeSetResult
} from "../../contracts/index.js";
import { deviceImeReset, deviceImeSet } from "../../core/index.js";
import type { CliRuntimeContext } from "../command-context.js";
import type { CliCommandDescriptor } from "../command-descriptor.js";

function imeSetDescriptor(imeId: string): CliCommandDescriptor<DeviceImeSetRequest, DeviceImeSetResult> {
  return {
    name: "device.ime_set",
    argvPath: ["device", "ime", "set"],
    description: "switch the current Android input method; result records previous_id for restore",
    requestSchema: DeviceImeSetRequestSchema,
    buildRequest: (globalOptions) => ({
      ime_id: imeId,
      timeout_ms: globalOptions.timeout,
      device_serial: globalOptions.serial
    }),
    run: deviceImeSet,
    buildSuccessMetadata: (result, request) => ({
      device: { serial: result.device_serial },
      warnings: [
        "device ime set changes a user-visible device setting; restore the previous input method (result.previous_id) or run device ime reset when the workflow ends"
      ],
      trace: { timeout_ms: request.timeout_ms, requested_id: request.ime_id }
    })
  };
}

const imeResetDescriptor: CliCommandDescriptor<DeviceImeResetRequest, DeviceImeResetResult> = {
  name: "device.ime_reset",
  argvPath: ["device", "ime", "reset"],
  description: "reset enabled and selected input methods to system defaults",
  requestSchema: DeviceImeResetRequestSchema,
  buildRequest: (globalOptions) => ({
    timeout_ms: globalOptions.timeout,
    device_serial: globalOptions.serial
  }),
  run: deviceImeReset,
  buildSuccessMetadata: (result, request) => ({
    device: { serial: result.device_serial },
    warnings: [
      "device ime reset re-enables system default input methods; the enabled IME set may visibly change on the device"
    ],
    trace: { timeout_ms: request.timeout_ms }
  })
};

export function registerDeviceImeMutationCommands(context: CliRuntimeContext, ime: Command): void {
  const requireSerial = (commandName: string, commandLabel: string): void => {
    context.setCommandName(commandName);
    if (context.program.opts<{ serial?: string }>().serial === undefined) {
      throw new AutophoneError({
        code: "INVALID_REQUEST",
        message: `${commandLabel} requires explicit --serial`,
        retriable: false
      });
    }
  };

  ime
    .command("set")
    .description("switch the current Android input method; result records previous_id for restore")
    .requiredOption("--id <ime_id>", "input method id, such as com.android.adbkeyboard/.AdbIME")
    .action(async (localOptions: { id: string }) => {
      requireSerial("device.ime_set", "device ime set");
      await context.runDescriptor(imeSetDescriptor(localOptions.id));
    });

  ime
    .command("reset")
    .description("reset enabled and selected input methods to system defaults")
    .action(async () => {
      requireSerial("device.ime_reset", "device ime reset");
      await context.runDescriptor(imeResetDescriptor);
    });
}
