import { z } from "zod";
import { ErrorCodeSchema } from "../errors.js";
import { CandidateSchema, PointSchema, SelectorSchema, SnapshotSchema } from "../ui.js";
import { ActivityNameSchema, AppCurrentResultSchema, PackageNameSchema } from "./app.js";
export * from "./text-input.js";

export const KeyNameSchema = z.enum([
  "BACK",
  "HOME",
  "ENTER",
  "TAB",
  "ESCAPE",
  "DEL",
  "DPAD_UP",
  "DPAD_DOWN",
  "DPAD_LEFT",
  "DPAD_RIGHT",
  "DPAD_CENTER",
  "APP_SWITCH",
  "MOVE_HOME",
  "MOVE_END",
  "MENU",
  "SEARCH"
]);
export type KeyName = z.infer<typeof KeyNameSchema>;

export const KeyPressVerifyPolicySchema = z.enum(["screen_changed", "none"]);
export type KeyPressVerifyPolicy = z.infer<typeof KeyPressVerifyPolicySchema>;

export const KeyPressRequestSchema = z.object({
  key: KeyNameSchema,
  verify: KeyPressVerifyPolicySchema.default("none"),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type KeyPressRequest = z.infer<typeof KeyPressRequestSchema>;

export const KeyPressResultSchema = z.object({
  key: KeyNameSchema,
  keycode: z.string().min(1),
  before: SnapshotSchema.nullable(),
  after: SnapshotSchema.nullable(),
  verify: z.object({
    policy: KeyPressVerifyPolicySchema,
    ok: z.boolean(),
    attempts: z.number().int().nonnegative(),
    reason: z.string(),
    changed_fields: z.array(z.enum(["ui_hash", "package", "activity"])).default([])
  })
});
export type KeyPressResult = z.infer<typeof KeyPressResultSchema>;

export const TextClearVerifyPolicySchema = z.enum(["field_text", "screen_changed", "none"]);
export type TextClearVerifyPolicy = z.infer<typeof TextClearVerifyPolicySchema>;

export const TextClearRequestSchema = z.object({
  max_chars: z.number().int().min(1).max(512).default(64),
  verify: TextClearVerifyPolicySchema.default("none"),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type TextClearRequest = z.infer<typeof TextClearRequestSchema>;

export const TextClearResultSchema = z.object({
  strategy: z.literal("move_end_then_backspace"),
  max_chars: z.number().int().positive(),
  key_events: z.object({
    move_end: z.literal(1),
    delete: z.number().int().nonnegative(),
    total: z.number().int().positive()
  }),
  verify: z.object({
    policy: TextClearVerifyPolicySchema,
    ok: z.boolean(),
    attempts: z.number().int().nonnegative(),
    reason: z.string(),
    changed_fields: z.array(z.enum(["ui_hash", "package", "activity"])).default([])
  })
});
export type TextClearResult = z.infer<typeof TextClearResultSchema>;

export const FindRequestSchema = z.object({
  selector: SelectorSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type FindRequest = z.infer<typeof FindRequestSchema>;

export const FindResultSchema = z.object({
  snapshot_id: z.string().min(1),
  device_serial: z.string().min(1),
  selector: SelectorSchema,
  selector_diagnostics: z
    .object({
      fingerprint: z.string().min(1),
      ambiguity_score: z.number().int().nonnegative(),
      candidate_count: z.number().int().nonnegative()
    })
    .optional(),
  count: z.number().int().nonnegative(),
  total_elements: z.number().int().nonnegative(),
  usable_only: z.literal(true),
  candidates: z.array(CandidateSchema)
});
export type FindResult = z.infer<typeof FindResultSchema>;

const WaitTimingSchema = z
  .object({
    wait_timeout_ms: z.number().int().positive().max(120_000).default(10_000),
    interval_ms: z.number().int().positive().min(50).max(10_000).default(500),
    poll_timeout_ms: z.number().int().positive().max(120_000).default(10_000)
  })
  .refine((value) => value.interval_ms <= value.wait_timeout_ms, {
    message: "interval_ms must be less than or equal to wait_timeout_ms",
    path: ["interval_ms"]
  });

export const WaitUiConditionModeSchema = z.enum(["present", "absent"]);
export type WaitUiConditionMode = z.infer<typeof WaitUiConditionModeSchema>;

export const WaitUiRequestSchema = WaitTimingSchema.extend({
  selector: SelectorSchema,
  condition: WaitUiConditionModeSchema.default("present"),
  device_serial: z.string().min(1).optional()
});
export type WaitUiRequest = z.infer<typeof WaitUiRequestSchema>;

export const WaitUiResultSchema = z.object({
  condition: z.object({
    type: z.literal("ui"),
    selector: SelectorSchema,
    mode: WaitUiConditionModeSchema
  }),
  present: z.boolean(),
  matched_nodes: z.number().int().nonnegative(),
  attempts: z.number().int().positive(),
  elapsed_ms: z.number().int().nonnegative(),
  snapshot_id: z.string().min(1),
  device_serial: z.string().min(1),
  selector_diagnostics: z
    .object({
      fingerprint: z.string().min(1),
      ambiguity_score: z.number().int().nonnegative(),
      candidate_count: z.number().int().nonnegative()
    })
    .optional(),
  count: z.number().int().nonnegative(),
  total_elements: z.number().int().nonnegative(),
  usable_only: z.literal(true),
  candidates: z.array(CandidateSchema)
});
export type WaitUiResult = z.infer<typeof WaitUiResultSchema>;

export const WaitAppRequestSchema = WaitTimingSchema.extend({
  package_name: PackageNameSchema,
  activity: ActivityNameSchema.optional(),
  device_serial: z.string().min(1).optional()
});
export type WaitAppRequest = z.infer<typeof WaitAppRequestSchema>;

export const WaitAppResultSchema = z.object({
  condition: z.object({
    type: z.literal("app"),
    package_name: PackageNameSchema,
    activity: z.string().optional()
  }),
  attempts: z.number().int().positive(),
  elapsed_ms: z.number().int().nonnegative(),
  current: AppCurrentResultSchema
});
export type WaitAppResult = z.infer<typeof WaitAppResultSchema>;

const OutputPathSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, { message: "output_path must not be blank" });

export const ScreenshotRequestSchema = z.object({
  output_path: OutputPathSchema,
  overwrite: z.boolean().default(false),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type ScreenshotRequest = z.infer<typeof ScreenshotRequestSchema>;

export const ScreenshotResultSchema = z.object({
  device_serial: z.string().min(1),
  output_path: OutputPathSchema,
  mime_type: z.literal("image/png"),
  width_px: z.number().int().positive(),
  height_px: z.number().int().positive(),
  bytes: z.number().int().positive(),
  sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  capture_duration_ms: z.number().int().nonnegative(),
  overwritten: z.boolean()
});
export type ScreenshotResult = z.infer<typeof ScreenshotResultSchema>;

const ScreenrecordSizeSchema = z
  .string()
  .regex(/^[1-9]\d{1,4}x[1-9]\d{1,4}$/, "size must be WIDTHxHEIGHT with positive integer dimensions");

export const ScreenrecordRequestSchema = z
  .object({
    output_path: OutputPathSchema,
    overwrite: z.boolean().default(false),
    duration_seconds: z.number().int().min(1).max(30).default(5),
    bit_rate_bps: z.number().int().positive().max(100_000_000).optional(),
    size: ScreenrecordSizeSchema.optional(),
    bugreport: z.boolean().default(false),
    record_timeout_ms: z.number().int().positive().max(600_000),
    pull_timeout_ms: z.number().int().positive().max(600_000).default(120_000),
    cleanup_timeout_ms: z.number().int().positive().max(120_000).default(10_000),
    device_serial: z.string().min(1, "screenrecord requires explicit --serial")
  })
  .refine((value) => value.record_timeout_ms >= value.duration_seconds * 1000 + 1000, {
    message: "record_timeout_ms must be at least duration_seconds * 1000 + 1000",
    path: ["record_timeout_ms"]
  });
export type ScreenrecordRequest = z.infer<typeof ScreenrecordRequestSchema>;

export const ScreenrecordResultSchema = z
  .object({
    device_serial: z.string().min(1),
    output_path: OutputPathSchema,
    mime_type: z.literal("video/mp4"),
    file_name: z.string().min(1),
    bytes: z.number().int().positive(),
    sha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    overwritten: z.boolean(),
    requested: z.object({
      duration_seconds: z.number().int().min(1).max(30),
      bit_rate_bps: z.number().int().positive().max(100_000_000).nullable(),
      size: ScreenrecordSizeSchema.nullable(),
      bugreport: z.boolean(),
      display: z.literal("default")
    }),
    recording: z.object({
      method: z.literal("screenrecord"),
      exit_code: z.number().int().nullable(),
      command_duration_ms: z.number().int().nonnegative()
    }),
    transfer: z.object({
      method: z.literal("adb_pull"),
      exit_code: z.number().int().nullable(),
      command_duration_ms: z.number().int().nonnegative()
    }),
    cleanup: z.object({
      method: z.literal("device_rm"),
      attempted: z.literal(true),
      ok: z.boolean(),
      exit_code: z.number().int().nullable(),
      command_duration_ms: z.number().int().nonnegative().nullable(),
      error_code: ErrorCodeSchema.optional(),
      reason: z.string().optional()
    }),
    verify: z.object({
      policy: z.literal("screenrecord_exit_pull_host_file"),
      ok: z.literal(true),
      attempts: z.literal(3),
      reason: z.string()
    }),
    semantics: z.literal("bounded_default_display_video_evidence_no_audio_or_frame_completeness_guarantee")
  })
  .refine((value) => value.bytes > 0, {
    message: "screenrecord result must reference a non-empty host MP4",
    path: ["bytes"]
  });
export type ScreenrecordResult = z.infer<typeof ScreenrecordResultSchema>;

export const ScrollDirectionSchema = z.enum(["down", "up", "left", "right"]);
export type ScrollDirection = z.infer<typeof ScrollDirectionSchema>;

export const ScrollAmountSchema = z.enum(["small", "medium", "large"]);
export type ScrollAmount = z.infer<typeof ScrollAmountSchema>;

export const ScrollVerifyPolicySchema = z.enum(["screen_changed", "none"]);
export type ScrollVerifyPolicy = z.infer<typeof ScrollVerifyPolicySchema>;

export const ScrollScopeSchema = z.enum(["window", "element"]);
export type ScrollScope = z.infer<typeof ScrollScopeSchema>;

const ScrollWithinResultSchema = z.object({
  selector: SelectorSchema,
  candidate: CandidateSchema
});

export const ScrollRequestSchema = z
  .object({
    direction: ScrollDirectionSchema,
    amount: ScrollAmountSchema.default("medium"),
    within: SelectorSchema.optional(),
    duration_ms: z.number().int().min(100).max(2000).default(300),
    verify: ScrollVerifyPolicySchema.default("none"),
    timeout_ms: z.number().int().positive().max(120_000).default(10_000),
    device_serial: z.string().min(1).optional()
  })
  .refine((value) => value.duration_ms < value.timeout_ms, {
    message: "timeout_ms must be greater than duration_ms",
    path: ["timeout_ms"]
  });
export type ScrollRequest = z.infer<typeof ScrollRequestSchema>;

export const ScrollResultSchema = z.object({
  direction: ScrollDirectionSchema,
  amount: ScrollAmountSchema,
  finger_direction: ScrollDirectionSchema,
  start: PointSchema,
  end: PointSchema,
  scope: ScrollScopeSchema,
  within: ScrollWithinResultSchema.nullable(),
  duration_ms: z.number().int().positive(),
  before: SnapshotSchema,
  after: SnapshotSchema.nullable(),
  verify: z.object({
    policy: ScrollVerifyPolicySchema,
    ok: z.boolean(),
    reason: z.string(),
    attempts: z.number().int().nonnegative(),
    changed_fields: z.array(z.enum(["ui_hash", "package", "activity"])).default([])
  })
});
export type ScrollResult = z.infer<typeof ScrollResultSchema>;

export const ScrollUntilReasonSchema = z.enum(["found_initial", "found_after_scroll", "end_reached", "budget_exhausted"]);
export type ScrollUntilReason = z.infer<typeof ScrollUntilReasonSchema>;

export const ScrollUntilRequestSchema = z
  .object({
    selector: SelectorSchema,
    direction: ScrollDirectionSchema,
    amount: ScrollAmountSchema.default("medium"),
    within: SelectorSchema.optional(),
    max_scrolls: z.number().int().min(1).max(25).default(10),
    duration_ms: z.number().int().min(100).max(2000).default(300),
    timeout_ms: z.number().int().positive().max(120_000).default(10_000),
    device_serial: z.string().min(1).optional()
  })
  .refine((value) => value.duration_ms < value.timeout_ms, {
    message: "timeout_ms must be greater than duration_ms",
    path: ["timeout_ms"]
  });
export type ScrollUntilRequest = z.infer<typeof ScrollUntilRequestSchema>;

export const ScrollUntilResultSchema = z.object({
  selector: SelectorSchema,
  direction: ScrollDirectionSchema,
  amount: ScrollAmountSchema,
  scope: ScrollScopeSchema,
  within: SelectorSchema.nullable(),
  max_scrolls: z.number().int().positive(),
  duration_ms: z.number().int().positive(),
  scrolls: z.number().int().nonnegative(),
  found: z.boolean(),
  reason: ScrollUntilReasonSchema,
  snapshot_id: z.string().min(1),
  device_serial: z.string().min(1),
  ui_hash: z.string().min(1),
  count: z.number().int().nonnegative(),
  total_elements: z.number().int().nonnegative(),
  usable_only: z.literal(true),
  candidates: z.array(CandidateSchema),
  last_scroll: z
    .object({
      finger_direction: ScrollDirectionSchema,
      start: PointSchema,
      end: PointSchema,
      scope: ScrollScopeSchema,
      within_candidate: CandidateSchema.nullable(),
      changed_fields: z.array(z.enum(["ui_hash", "package", "activity"])).default([])
    })
    .nullable()
});
export type ScrollUntilResult = z.infer<typeof ScrollUntilResultSchema>;

export const DragGestureSchema = z.enum(["draganddrop", "swipe"]);
export type DragGesture = z.infer<typeof DragGestureSchema>;

export const DragVerifyPolicySchema = z.enum(["screen_changed", "none"]);
export type DragVerifyPolicy = z.infer<typeof DragVerifyPolicySchema>;

export const DragRequestSchema = z
  .object({
    from_selector: SelectorSchema,
    to_selector: SelectorSchema,
    from_candidate_index: z.number().int().nonnegative().optional(),
    to_candidate_index: z.number().int().nonnegative().optional(),
    gesture: DragGestureSchema.default("draganddrop"),
    duration_ms: z.number().int().min(100).max(10_000).default(1000),
    verify: DragVerifyPolicySchema.default("none"),
    timeout_ms: z.number().int().positive().max(120_000).default(10_000),
    device_serial: z.string().min(1).optional()
  })
  .refine((value) => value.timeout_ms >= value.duration_ms + 1000, {
    message: "timeout_ms must be at least duration_ms + 1000",
    path: ["timeout_ms"]
  });
export type DragRequest = z.infer<typeof DragRequestSchema>;

export const DragResultSchema = z.object({
  from_candidate: CandidateSchema,
  to_candidate: CandidateSchema,
  start: PointSchema,
  end: PointSchema,
  gesture: DragGestureSchema,
  duration_ms: z.number().int().positive(),
  before: SnapshotSchema,
  after: SnapshotSchema.nullable(),
  verify: z.object({
    policy: DragVerifyPolicySchema,
    ok: z.boolean(),
    reason: z.string(),
    attempts: z.number().int().nonnegative(),
    changed_fields: z.array(z.enum(["ui_hash", "package", "activity"])).default([])
  })
});
export type DragResult = z.infer<typeof DragResultSchema>;

export const TapVerifyPolicySchema = z.enum(["screen_changed", "none"]);
export type TapVerifyPolicy = z.infer<typeof TapVerifyPolicySchema>;

const CandidateIndexSchema = z.number().int().nonnegative();

export const TapRequestSchema = z
  .object({
    selector: SelectorSchema.optional(),
    raw_point: PointSchema.optional(),
    candidate_index: CandidateIndexSchema.optional(),
    allow_unsafe_raw_point: z.boolean().default(false),
    verify: TapVerifyPolicySchema.default("screen_changed"),
    timeout_ms: z.number().int().positive().max(120_000).default(10_000),
    device_serial: z.string().min(1).optional()
  })
  .refine((value) => value.selector !== undefined || value.raw_point !== undefined, {
    message: "tap requires a selector or raw_point",
    path: ["selector"]
  })
  .refine((value) => value.raw_point === undefined || value.candidate_index === undefined, {
    message: "candidate_index cannot be combined with raw_point",
    path: ["candidate_index"]
  });
export type TapRequest = z.infer<typeof TapRequestSchema>;

export const ObserveResultSchema = z.object({
  snapshot: SnapshotSchema
});
export type ObserveResult = z.infer<typeof ObserveResultSchema>;

export const TapResultSchema = z.object({
  candidate: CandidateSchema.nullable(),
  point: PointSchema,
  before: SnapshotSchema,
  after: SnapshotSchema.nullable(),
  verify: z.object({
    policy: TapVerifyPolicySchema,
    ok: z.boolean(),
    reason: z.string(),
    attempts: z.number().int().nonnegative(),
    changed_fields: z.array(z.enum(["ui_hash", "package", "activity"])).default([])
  })
});
export type TapResult = z.infer<typeof TapResultSchema>;

export const DoubleTapVerifyPolicySchema = z.enum(["screen_changed", "none"]);
export type DoubleTapVerifyPolicy = z.infer<typeof DoubleTapVerifyPolicySchema>;

export const DoubleTapRequestSchema = z
  .object({
    selector: SelectorSchema.optional(),
    raw_point: PointSchema.optional(),
    candidate_index: CandidateIndexSchema.optional(),
    allow_unsafe_raw_point: z.boolean().default(false),
    interval_ms: z.number().int().min(40).max(300).default(80),
    verify: DoubleTapVerifyPolicySchema.default("screen_changed"),
    timeout_ms: z.number().int().positive().max(120_000).default(10_000),
    device_serial: z.string().min(1).optional()
  })
  .refine((value) => value.selector !== undefined || value.raw_point !== undefined, {
    message: "double tap requires a selector or raw_point",
    path: ["selector"]
  })
  .refine((value) => value.raw_point === undefined || value.candidate_index === undefined, {
    message: "candidate_index cannot be combined with raw_point",
    path: ["candidate_index"]
  })
  .refine((value) => value.timeout_ms >= value.interval_ms + 1000, {
    message: "timeout_ms must be at least interval_ms + 1000",
    path: ["timeout_ms"]
  });
export type DoubleTapRequest = z.infer<typeof DoubleTapRequestSchema>;

export const DoubleTapResultSchema = z.object({
  candidate: CandidateSchema.nullable(),
  point: PointSchema,
  interval_ms: z.number().int().positive(),
  before: SnapshotSchema,
  after: SnapshotSchema.nullable(),
  verify: z.object({
    policy: DoubleTapVerifyPolicySchema,
    ok: z.boolean(),
    reason: z.string(),
    attempts: z.number().int().nonnegative(),
    changed_fields: z.array(z.enum(["ui_hash", "package", "activity"])).default([])
  })
});
export type DoubleTapResult = z.infer<typeof DoubleTapResultSchema>;

export const LongPressVerifyPolicySchema = z.enum(["screen_changed", "none"]);
export type LongPressVerifyPolicy = z.infer<typeof LongPressVerifyPolicySchema>;

export const LongPressRequestSchema = z
  .object({
    selector: SelectorSchema.optional(),
    raw_point: PointSchema.optional(),
    candidate_index: CandidateIndexSchema.optional(),
    allow_unsafe_raw_point: z.boolean().default(false),
    duration_ms: z.number().int().min(500).max(5000).default(800),
    verify: LongPressVerifyPolicySchema.default("screen_changed"),
    timeout_ms: z.number().int().positive().max(120_000).default(10_000),
    device_serial: z.string().min(1).optional()
  })
  .refine((value) => value.selector !== undefined || value.raw_point !== undefined, {
    message: "long press requires a selector or raw_point",
    path: ["selector"]
  })
  .refine((value) => value.raw_point === undefined || value.candidate_index === undefined, {
    message: "candidate_index cannot be combined with raw_point",
    path: ["candidate_index"]
  })
  .refine((value) => value.timeout_ms >= value.duration_ms + 1000, {
    message: "timeout_ms must be at least duration_ms + 1000",
    path: ["timeout_ms"]
  });
export type LongPressRequest = z.infer<typeof LongPressRequestSchema>;

export const LongPressResultSchema = z.object({
  candidate: CandidateSchema.nullable(),
  point: PointSchema,
  duration_ms: z.number().int().positive(),
  before: SnapshotSchema,
  after: SnapshotSchema.nullable(),
  verify: z.object({
    policy: LongPressVerifyPolicySchema,
    ok: z.boolean(),
    reason: z.string(),
    attempts: z.number().int().nonnegative(),
    changed_fields: z.array(z.enum(["ui_hash", "package", "activity"])).default([])
  })
});
export type LongPressResult = z.infer<typeof LongPressResultSchema>;
