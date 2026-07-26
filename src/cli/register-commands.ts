import type { CliRuntimeContext } from "./command-context.js";
import { registerAppCommands } from "./commands/app.js";
import { registerClipboardCommands } from "./commands/clipboard.js";
import { registerDeviceCommands } from "./commands/device.js";
import { registerFileCommands } from "./commands/files.js";
import { registerInputCommands } from "./commands/input.js";
import { registerInteractionCommands } from "./commands/interaction.js";
import { registerRecipeCommands } from "./commands/recipe.js";
import { registerWaitAndLogCommands } from "./commands/wait-logs.js";

export function registerCommands(context: CliRuntimeContext): void {
  registerDeviceCommands(context);
  registerInteractionCommands(context);
  registerClipboardCommands(context);
  registerFileCommands(context);
  registerInputCommands(context);
  registerWaitAndLogCommands(context);
  registerRecipeCommands(context);
  registerAppCommands(context);
}
