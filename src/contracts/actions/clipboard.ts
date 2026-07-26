import { z } from "zod";
import { Sha256Schema } from "../proof.js";

export const ClipboardCharsetSchema = z.enum(["utf8"]);
export type ClipboardCharset = z.infer<typeof ClipboardCharsetSchema>;

const ClipboardTextSchema = z
  .string()
  .min(1)
  .max(4096)
  .refine((value) => value.trim().length > 0, { message: "clipboard text must not be blank" });

export const ClipboardGetRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type ClipboardGetRequest = z.infer<typeof ClipboardGetRequestSchema>;

export const ClipboardGetRecipeRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000)
});
export type ClipboardGetRecipeRequest = z.infer<typeof ClipboardGetRecipeRequestSchema>;

export const ClipboardGetResultSchema = z.object({
  device_serial: z.string().min(1),
  present: z.boolean(),
  length: z.number().int().nonnegative(),
  sha256: Sha256Schema.nullable(),
  charset: ClipboardCharsetSchema.nullable(),
  preview_redacted: z.literal("<redacted>")
});
export type ClipboardGetResult = z.infer<typeof ClipboardGetResultSchema>;

export const ClipboardSetRequestSchema = z.object({
  text: ClipboardTextSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type ClipboardSetRequest = z.infer<typeof ClipboardSetRequestSchema>;

export const ClipboardSetRecipeRequestSchema = z.object({
  text: ClipboardTextSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000)
});
export type ClipboardSetRecipeRequest = z.infer<typeof ClipboardSetRecipeRequestSchema>;

export const ClipboardSetResultSchema = z.object({
  device_serial: z.string().min(1),
  charset: ClipboardCharsetSchema,
  text_length: z.number().int().positive(),
  codepoint_length: z.number().int().positive(),
  bytes: z.number().int().positive(),
  sha256: Sha256Schema,
  verify: z.object({
    policy: z.literal("clipboard_command_accepted"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  })
});
export type ClipboardSetResult = z.infer<typeof ClipboardSetResultSchema>;
