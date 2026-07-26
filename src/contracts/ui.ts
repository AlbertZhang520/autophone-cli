import { z } from "zod";

const SelectorValueSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, { message: "selector values must not be blank" });

export const BoundsSchema = z
  .tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()])
  .describe("[left, top, right, bottom] in device pixels");
export type Bounds = z.infer<typeof BoundsSchema>;

export const PointSchema = z
  .tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])
  .describe("[x, y] in device pixels");
export type Point = z.infer<typeof PointSchema>;

export const UiNodeSchema = z.object({
  source_index: z.number().int().nonnegative(),
  text: z.string().default(""),
  resource_id: z.string().default(""),
  content_desc: z.string().default(""),
  class_name: z.string().default(""),
  package_name: z.string().default(""),
  bounds: BoundsSchema.nullable(),
  enabled: z.boolean().nullable().default(null),
  clickable: z.boolean().nullable().default(null),
  focused: z.boolean().nullable().default(null)
});
export type UiNode = z.infer<typeof UiNodeSchema>;

export const CandidateSchema = UiNodeSchema.extend({
  candidate_index: z.number().int().nonnegative(),
  center: PointSchema
});
export type Candidate = z.infer<typeof CandidateSchema>;

export const SnapshotSchema = z.object({
  snapshot_id: z.string().min(1),
  created_at: z.string().datetime(),
  device_serial: z.string().min(1),
  package: z.string().default(""),
  activity: z.string().default(""),
  window_size: z.tuple([z.number().int().positive(), z.number().int().positive()]).nullable(),
  orientation: z.enum(["portrait", "landscape", "unknown"]).default("unknown"),
  rotation_degrees: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).nullable().default(null),
  auto_rotate: z.boolean().nullable().default(null),
  ui_hash: z.string().min(1),
  elements: z.array(UiNodeSchema)
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

export const SelectorSchema = z
  .object({
    text: SelectorValueSchema.optional(),
    resource_id: SelectorValueSchema.optional(),
    content_desc: SelectorValueSchema.optional(),
    class_name: SelectorValueSchema.optional()
  })
  .refine(
    (selector) =>
      selector.text !== undefined ||
      selector.resource_id !== undefined ||
      selector.content_desc !== undefined ||
      selector.class_name !== undefined,
    { message: "selector must include at least one field" }
  );
export type Selector = z.infer<typeof SelectorSchema>;
