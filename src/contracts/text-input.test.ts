import { describe, expect, it } from "vitest";
import { z } from "zod";
import { TextInputRecipeRequestSchema, TextInputRequestSchema } from "./index.js";

describe("text input contract", () => {
  it("accepts valid supplementary Unicode and enforces the codepoint boundary", () => {
    expect(TextInputRequestSchema.safeParse({ text: "🙂𐀀\u{10FFFF}", via: "adb_keyboard" }).success).toBe(true);
    expect(TextInputRequestSchema.safeParse({ text: "🙂".repeat(256), via: "adb_keyboard" }).success).toBe(true);
    expect(TextInputRequestSchema.safeParse({ text: "🙂".repeat(257), via: "adb_keyboard" }).success).toBe(false);
  });

  it.each([
    ["C0", "前\u0000后"],
    ["C1 lower bound", "前\u0080后"],
    ["C1 upper bound", "前\u009F后"],
    ["unpaired high surrogate", "前\uD800后"],
    ["unpaired low surrogate", "前\uDFFF后"],
    ["high-high surrogate order", "前\uD800\uD801后"],
    ["low-high surrogate order", "前\uDC00\uD800后"]
  ])("rejects %s input", (_name, text) => {
    for (const via of ["adb_keyboard", "clipboard"] as const) {
      expect(TextInputRequestSchema.safeParse({ text, via }).success).toBe(false);
      expect(TextInputRecipeRequestSchema.safeParse({ text, via }).success).toBe(false);
    }
  });

  it("publishes route-specific constraints in generated JSON Schema", () => {
    const schema = z.toJSONSchema(TextInputRequestSchema) as {
      anyOf?: Array<{ properties?: { via?: { const?: string }; text?: Record<string, unknown> } }>;
    };
    expect(schema.anyOf).toHaveLength(3);
    const inputText = schema.anyOf?.find((branch) => branch.properties?.via?.const === "input_text");
    const adbKeyboard = schema.anyOf?.find((branch) => branch.properties?.via?.const === "adb_keyboard");
    expect(inputText?.properties?.text).toMatchObject({ minLength: 1, maxLength: 256 });
    expect(adbKeyboard?.properties?.text).toMatchObject({ minLength: 1, maxLength: 256 });
    expect(adbKeyboard?.properties?.text).toHaveProperty("allOf");
  });

  it("keeps generated JSON Schema validation aligned at Unicode boundaries", async () => {
    const schema = z.toJSONSchema(TextInputRequestSchema);
    const Ajv2020 = (await import("ajv/dist/2020.js")).default as unknown as new (options: {
      strict: boolean;
    }) => { compile(input: unknown): (data: unknown) => boolean };
    const validate = new Ajv2020({ strict: false }).compile(schema);
    expect(validate({ text: "🙂".repeat(256), via: "adb_keyboard", verify: "none", timeout_ms: 10_000 })).toBe(true);
    expect(validate({ text: "🙂".repeat(257), via: "adb_keyboard", verify: "none", timeout_ms: 10_000 })).toBe(false);
    expect(validate({ text: "前\u0085后", via: "adb_keyboard", verify: "none", timeout_ms: 10_000 })).toBe(false);
    expect(validate({ text: "前\uD800后", via: "adb_keyboard", verify: "none", timeout_ms: 10_000 })).toBe(false);
  });
});
