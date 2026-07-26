import { z } from "zod";
import { AutophoneErrorSchema } from "../errors.js";
import { SelectorSchema } from "../ui.js";
import {
  ClipboardGetRecipeRequestSchema,
  ClipboardGetResultSchema,
  ClipboardSetRecipeRequestSchema,
  ClipboardSetResultSchema
} from "./clipboard.js";
import {
  FindResultSchema,
  KeyNameSchema,
  KeyPressResultSchema,
  KeyPressVerifyPolicySchema,
  TextInputResultSchema,
  WaitAppResultSchema,
  WaitUiConditionModeSchema,
  WaitUiResultSchema
} from "./interaction.js";
import { ActivityNameSchema, PackageNameSchema } from "./app.js";
import { TextInputRecipeRequestSchema } from "./text-input.js";

const RecipeStepIdSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9_.-]+$/);

export const RecipeActionSchema = z.enum([
  "find",
  "wait_ui",
  "wait_app",
  "key_press",
  "text_input",
  "clipboard_set",
  "clipboard_get"
]);
export type RecipeAction = z.infer<typeof RecipeActionSchema>;

export const RecipeOnErrorSchema = z.enum(["abort", "continue"]);
export type RecipeOnError = z.infer<typeof RecipeOnErrorSchema>;

const RecipeFindRequestSchema = z.object({
  selector: SelectorSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000)
});

const RecipeWaitTimingSchema = z
  .object({
    wait_timeout_ms: z.number().int().positive().max(120_000).default(10_000),
    interval_ms: z.number().int().positive().min(50).max(10_000).default(500),
    poll_timeout_ms: z.number().int().positive().max(120_000).default(10_000)
  })
  .refine((value) => value.interval_ms <= value.wait_timeout_ms, {
    message: "interval_ms must be less than or equal to wait_timeout_ms",
    path: ["interval_ms"]
  });

const RecipeWaitUiRequestSchema = RecipeWaitTimingSchema.extend({
  selector: SelectorSchema,
  condition: WaitUiConditionModeSchema.default("present")
});

const RecipeWaitAppRequestSchema = RecipeWaitTimingSchema.extend({
  package_name: PackageNameSchema,
  activity: ActivityNameSchema.optional()
});

const RecipeKeyPressRequestSchema = z.object({
  key: KeyNameSchema,
  verify: KeyPressVerifyPolicySchema.default("none"),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000)
});

export const RecipeStepSchema = z.discriminatedUnion("action", [
  z.object({
    id: RecipeStepIdSchema,
    action: z.literal("find"),
    with: RecipeFindRequestSchema,
    on_error: RecipeOnErrorSchema.optional()
  }),
  z.object({
    id: RecipeStepIdSchema,
    action: z.literal("wait_ui"),
    with: RecipeWaitUiRequestSchema,
    on_error: RecipeOnErrorSchema.optional()
  }),
  z.object({
    id: RecipeStepIdSchema,
    action: z.literal("wait_app"),
    with: RecipeWaitAppRequestSchema,
    on_error: RecipeOnErrorSchema.optional()
  }),
  z.object({
    id: RecipeStepIdSchema,
    action: z.literal("key_press"),
    with: RecipeKeyPressRequestSchema,
    on_error: RecipeOnErrorSchema.optional()
  }),
  z.object({
    id: RecipeStepIdSchema,
    action: z.literal("text_input"),
    with: TextInputRecipeRequestSchema,
    on_error: RecipeOnErrorSchema.optional()
  }),
  z.object({
    id: RecipeStepIdSchema,
    action: z.literal("clipboard_set"),
    with: ClipboardSetRecipeRequestSchema,
    on_error: RecipeOnErrorSchema.optional()
  }),
  z.object({
    id: RecipeStepIdSchema,
    action: z.literal("clipboard_get"),
    with: ClipboardGetRecipeRequestSchema,
    on_error: RecipeOnErrorSchema.optional()
  })
]);
export type RecipeStep = z.infer<typeof RecipeStepSchema>;

export const RecipeFileSchema = z
  .object({
    recipe_version: z.literal("0.3"),
    name: z.string().min(1).max(120),
    on_error: RecipeOnErrorSchema.default("abort"),
    steps: z.array(RecipeStepSchema).min(1).max(50)
  })
  .superRefine((recipe, context) => {
    const seen = new Set<string>();
    for (const [index, step] of recipe.steps.entries()) {
      if (seen.has(step.id)) {
        context.addIssue({
          code: "custom",
          path: ["steps", index, "id"],
          message: `duplicate recipe step id: ${step.id}`
        });
      }
      seen.add(step.id);
    }
  });
export type RecipeFile = z.infer<typeof RecipeFileSchema>;

export const RecipeRunRequestSchema = z.object({
  recipe: RecipeFileSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type RecipeRunRequest = z.infer<typeof RecipeRunRequestSchema>;

export const RecipeStepResultSchema = z.object({
  id: RecipeStepIdSchema,
  action: RecipeActionSchema,
  ok: z.boolean(),
  error: AutophoneErrorSchema.nullable(),
  result: z
    .union([
      FindResultSchema,
      WaitUiResultSchema,
      WaitAppResultSchema,
      KeyPressResultSchema,
      TextInputResultSchema,
      ClipboardSetResultSchema,
      ClipboardGetResultSchema
    ])
    .nullable()
});
export type RecipeStepResult = z.infer<typeof RecipeStepResultSchema>;

export const RecipeRunResultSchema = z.object({
  recipe_name: z.string().min(1),
  device_serial: z.string().min(1).nullable(),
  total_steps: z.number().int().nonnegative(),
  executed_steps: z.number().int().nonnegative(),
  succeeded_steps: z.number().int().nonnegative(),
  failed_steps: z.number().int().nonnegative(),
  aborted: z.boolean(),
  on_error: RecipeOnErrorSchema,
  steps: z.array(RecipeStepResultSchema)
});
export type RecipeRunResult = z.infer<typeof RecipeRunResultSchema>;
