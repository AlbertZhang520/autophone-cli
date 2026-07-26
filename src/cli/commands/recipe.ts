import { readFile } from "node:fs/promises";
import {
  RecipeFileSchema,
  RecipeRunRequestSchema,
  AutophoneError
} from "../../contracts/index.js";
import { runRecipe } from "../../core/index.js";
import type { CliRuntimeContext } from "../command-context.js";
import { createCliDriver } from "../driver.js";
import { writeSuccessJson } from "../success-writer.js";

export function registerRecipeCommands(context: CliRuntimeContext): void {
  const { program, io, requestId, startedAt, driverFactory } = context;
  const setCurrentCommandName = (name: string): string => {
    context.setCommandName(name);
    return name;
  };

  program
    .command("run")
    .description("run a bounded JSON recipe made of existing autophone actions")
    .requiredOption("--recipe <path>", "path to recipe JSON file")
    .option("--continue-on-error", "continue executing later steps after a failed step", false)
    .action(async (localOptions: { recipe: string; continueOnError: boolean }) => {
      const commandName = setCurrentCommandName("recipe.run");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const recipe = await readRecipe(localOptions.recipe, localOptions.continueOnError);
      const request = RecipeRunRequestSchema.parse({
        recipe,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const result = await runRecipe(createCliDriver(driverFactory, globalOptions), request);
      const responseInput: {
        command: string;
        requestId: string;
        startedAt: number;
        result: typeof result;
        device?: { serial?: string | undefined };
        warnings?: string[];
        trace?: Record<string, unknown>;
      } = {
        command: commandName,
        requestId,
        startedAt,
        result,
        warnings: result.aborted ? ["recipe aborted after a failed step; earlier steps may have mutated device state"] : [],
        trace: { timeout_ms: globalOptions.timeout, recipe_path: "<redacted>", step_count: result.total_steps }
      };
      if (result.device_serial !== null) {
        responseInput.device = { serial: result.device_serial };
      }
      writeSuccessJson(io, responseInput);
    });
}

async function readRecipe(path: string, continueOnError: boolean) {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new AutophoneError({
      code: "RECIPE_INVALID",
      message: "recipe file could not be read or parsed as JSON",
      retriable: false,
      details: { path: "<redacted>", cause: error instanceof Error ? error.message : "unknown" }
    });
  }
  const recipe = RecipeFileSchema.parse(parsedJson);
  if (continueOnError) {
    return { ...recipe, on_error: "continue" as const };
  }
  return recipe;
}
