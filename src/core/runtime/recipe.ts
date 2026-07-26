import {
  AutophoneError,
  type RecipeRunRequest,
  type RecipeRunResult,
  type RecipeStep,
  type RecipeStepResult,
  toAutophoneError
} from "../../contracts/index.js";
import { find } from "./observe.js";
import { keyPress, textInput } from "./interaction.js";
import { waitForApp, waitForUi } from "./wait.js";
import { clipboardGet, clipboardSet } from "./clipboard.js";
import type { AndroidDriver } from "./types.js";
import type { AndroidClipboardDriver } from "./clipboard.js";

type RecipeDriver = AndroidDriver & AndroidClipboardDriver;

export async function runRecipe(driver: RecipeDriver, request: RecipeRunRequest): Promise<RecipeRunResult> {
  const steps: RecipeStepResult[] = [];
  let resolvedSerial = request.device_serial;
  let aborted = false;

  for (const step of request.recipe.steps) {
    const stepResult = await executeStep(driver, step, resolvedSerial);
    steps.push(stepResult);
    if (stepResult.result !== null && typeof stepResult.result === "object" && "device_serial" in stepResult.result) {
      resolvedSerial = stepResult.result.device_serial as string;
    }
    if (!stepResult.ok && (step.on_error ?? request.recipe.on_error) === "abort") {
      aborted = true;
      break;
    }
  }

  const failedSteps = steps.filter((step) => !step.ok).length;
  return {
    recipe_name: request.recipe.name,
    device_serial: resolvedSerial ?? null,
    total_steps: request.recipe.steps.length,
    executed_steps: steps.length,
    succeeded_steps: steps.length - failedSteps,
    failed_steps: failedSteps,
    aborted,
    on_error: request.recipe.on_error,
    steps
  };
}

async function executeStep(driver: RecipeDriver, step: RecipeStep, deviceSerial: string | undefined): Promise<RecipeStepResult> {
  try {
    const result = await dispatchStep(driver, step, deviceSerial);
    return { id: step.id, action: step.action, ok: true, error: null, result };
  } catch (error) {
    const normalized = toAutophoneError(error).toBody();
    const recipeError =
      normalized.code === "RECIPE_ABORTED" || normalized.code === "RECIPE_STEP_FAILED" || normalized.code === "RECIPE_PREDICATE_FAILED"
        ? normalized
        : new AutophoneError({
            code: "RECIPE_STEP_FAILED",
            message: `recipe step ${step.id} failed: ${normalized.message}`,
            retriable: normalized.retriable,
            details: { step_id: step.id, action: step.action, cause: normalized }
          }).toBody();
    return { id: step.id, action: step.action, ok: false, error: recipeError, result: null };
  }
}

async function dispatchStep(driver: RecipeDriver, step: RecipeStep, deviceSerial: string | undefined) {
  switch (step.action) {
    case "find":
      return find(driver, { ...step.with, device_serial: deviceSerial });
    case "wait_ui":
      return waitForUi(driver, { ...step.with, device_serial: deviceSerial });
    case "wait_app":
      return waitForApp(driver, { ...step.with, device_serial: deviceSerial });
    case "key_press":
      return keyPress(driver, { ...step.with, device_serial: deviceSerial });
    case "text_input":
      return textInput(driver, { ...step.with, device_serial: deviceSerial });
    case "clipboard_set":
      return clipboardSet(driver, { ...step.with, device_serial: deviceSerial });
    case "clipboard_get":
      return clipboardGet(driver, { ...step.with, device_serial: deviceSerial });
  }
}
