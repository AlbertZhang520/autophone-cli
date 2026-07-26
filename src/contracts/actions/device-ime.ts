import { z } from "zod";
import { InputMethodIdSchema } from "./device.js";

const ImeCommandOutcomeSchema = z.object({
  exit_code: z.number().int().nullable(),
  command_duration_ms: z.number().int().nonnegative()
});

const ImeStateReadbackVerifySchema = z.object({
  policy: z.literal("ime_state_readback"),
  ok: z.literal(true),
  attempts: z.number().int().positive(),
  reason: z.string()
});

export const DeviceImeSetRequestSchema = z.object({
  ime_id: InputMethodIdSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1, "device ime set requires explicit --serial")
});
export type DeviceImeSetRequest = z.infer<typeof DeviceImeSetRequestSchema>;

export const DeviceImeSetResultSchema = z.object({
  device_serial: z.string().min(1),
  requested_id: InputMethodIdSchema,
  previous_id: InputMethodIdSchema.nullable(),
  status: z.enum(["switched", "already_current"]),
  enable: z.object({
    action: z.enum(["not_needed", "already_enabled", "enabled_now"]),
    outcome: ImeCommandOutcomeSchema.nullable()
  }),
  set: ImeCommandOutcomeSchema.nullable(),
  verify: ImeStateReadbackVerifySchema,
  semantics: z.literal("switches_user_visible_default_ime_reversible_via_previous_id")
});
export type DeviceImeSetResult = z.infer<typeof DeviceImeSetResultSchema>;

export const DeviceImeResetRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1, "device ime reset requires explicit --serial")
});
export type DeviceImeResetRequest = z.infer<typeof DeviceImeResetRequestSchema>;

export const DeviceImeResetResultSchema = z.object({
  device_serial: z.string().min(1),
  previous_id: InputMethodIdSchema.nullable(),
  current_id: InputMethodIdSchema.nullable(),
  enabled_ids: z.array(InputMethodIdSchema),
  reset: ImeCommandOutcomeSchema,
  changed: z.boolean(),
  verify: ImeStateReadbackVerifySchema,
  semantics: z.literal("restores_system_default_enabled_and_selected_imes")
});
export type DeviceImeResetResult = z.infer<typeof DeviceImeResetResultSchema>;
