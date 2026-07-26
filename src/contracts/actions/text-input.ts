import { z } from "zod";

const PrintableAsciiTextInputValueSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/\S/, { message: "text must not be blank" })
  .regex(/^[\x20-\x24\x26-\x5B\x5D-\x7E]+$/, {
    message: "text supports printable ASCII except percent and backslash"
  });

const UnicodeTextInputValueSchema = z
  .string()
  .min(1)
  .max(4096)
  .regex(/\S/u, { message: "text must not be blank" })
  .regex(/^[^\u0000-\u001F\u007F-\u009F]*$/, {
    message: "Unicode text input rejects control characters"
  })
  .regex(/^(?:[^\uD800-\uDFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF])*$/, {
    message: "Unicode text input rejects unpaired surrogate code units"
  })
  .refine((value) => Array.from(value).length <= 256, { message: "text must be at most 256 Unicode codepoints" })
  .meta({ maxLength: 256 });

export const TextInputViaSchema = z.enum(["input_text", "adb_keyboard", "clipboard"]);
export type TextInputVia = z.infer<typeof TextInputViaSchema>;

export const TextInputCharsetSchema = z.enum(["adb_shell_printable_ascii", "adb_keyboard_utf8", "clipboard_utf8"]);
export type TextInputCharset = z.infer<typeof TextInputCharsetSchema>;

export const TextInputVerifyPolicySchema = z.enum(["field_text", "screen_changed", "none"]);
export type TextInputVerifyPolicy = z.infer<typeof TextInputVerifyPolicySchema>;

const TextInputRequestSharedShape = {
  verify: TextInputVerifyPolicySchema.default("none"),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
};

const InputTextRequestSchema = z.object({
  text: PrintableAsciiTextInputValueSchema,
  via: z.literal("input_text").default("input_text"),
  ...TextInputRequestSharedShape
});

const AdbKeyboardTextRequestSchema = z.object({
  text: UnicodeTextInputValueSchema,
  via: z.literal("adb_keyboard"),
  ...TextInputRequestSharedShape
});

const ClipboardTextRequestSchema = z.object({
  text: UnicodeTextInputValueSchema,
  via: z.literal("clipboard"),
  ...TextInputRequestSharedShape
});

export const TextInputRequestSchema = z.union([
  InputTextRequestSchema,
  AdbKeyboardTextRequestSchema,
  ClipboardTextRequestSchema
]);
export type TextInputRequest = z.infer<typeof TextInputRequestSchema>;

export const TextInputRecipeRequestSchema = z.union([
  InputTextRequestSchema.omit({ device_serial: true }),
  AdbKeyboardTextRequestSchema.omit({ device_serial: true }),
  ClipboardTextRequestSchema.omit({ device_serial: true })
]);
export type TextInputRecipeRequest = z.infer<typeof TextInputRecipeRequestSchema>;

export const TextInputResultSchema = z.object({
  charset: TextInputCharsetSchema,
  via: TextInputViaSchema,
  text_length: z.number().int().positive(),
  encoded_length: z.number().int().positive(),
  codepoint_length: z.number().int().positive(),
  verify: z.object({
    policy: TextInputVerifyPolicySchema,
    ok: z.boolean(),
    attempts: z.number().int().nonnegative(),
    reason: z.string(),
    changed_fields: z.array(z.enum(["ui_hash", "package", "activity"])).default([])
  })
});
export type TextInputResult = z.infer<typeof TextInputResultSchema>;
