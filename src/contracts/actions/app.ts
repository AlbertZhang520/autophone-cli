import { z } from "zod";
import { AndroidUserIdSchema, NullableStringSchema, Sha256DigestSchema } from "./common.js";

export const PackageNameSchema = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/, "invalid Android package name");

export const ActivityNameSchema = z
  .string()
  .regex(
    /^(\.[A-Za-z_$][A-Za-z0-9_.$]*|[A-Za-z_$][A-Za-z0-9_.$]*)$/,
    "invalid Android activity class name"
  );

export const AppCurrentRequestSchema = z.object({
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppCurrentRequest = z.infer<typeof AppCurrentRequestSchema>;

export const AppCurrentResultSchema = z.object({
  device_serial: z.string().min(1),
  package: z.string(),
  activity: z.string(),
  focused: z.boolean()
});
export type AppCurrentResult = z.infer<typeof AppCurrentResultSchema>;

export const InstalledPackageNameSchema = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*$/, "invalid installed Android package name");

export const AppListScopeSchema = z.enum(["all", "third_party", "system"]);
export type AppListScope = z.infer<typeof AppListScopeSchema>;

export const AppListStateSchema = z.enum(["all", "enabled", "disabled"]);
export type AppListState = z.infer<typeof AppListStateSchema>;

const AppListFilterSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._]+$/, "filter must contain only letters, digits, dot, or underscore");

export const AppListRequestSchema = z.object({
  scope: AppListScopeSchema.default("all"),
  state: AppListStateSchema.default("all"),
  include_uninstalled: z.boolean().default(false),
  filter: AppListFilterSchema.optional(),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppListRequest = z.infer<typeof AppListRequestSchema>;

export const AppListResultSchema = z.object({
  device_serial: z.string().min(1),
  packages: z.array(InstalledPackageNameSchema),
  count: z.number().int().nonnegative(),
  scope: AppListScopeSchema,
  state: AppListStateSchema,
  include_uninstalled: z.boolean(),
  filter: z.string().min(1).nullable()
});
export type AppListResult = z.infer<typeof AppListResultSchema>;

export const AppInspectRequestSchema = z.object({
  package_name: InstalledPackageNameSchema,
  user_id: AndroidUserIdSchema.optional(),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppInspectRequest = z.infer<typeof AppInspectRequestSchema>;

export const AppInspectResultSchema = z.object({
  device_serial: z.string().min(1),
  requested: z.object({
    package_name: InstalledPackageNameSchema,
    user_id: AndroidUserIdSchema.nullable()
  }),
  installed: z.boolean(),
  paths: z.array(z.string().min(1)),
  path_count: z.number().int().nonnegative(),
  query: z.object({
    method: z.literal("pm_path"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("pm_path_presence"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  })
});
export type AppInspectResult = z.infer<typeof AppInspectResultSchema>;

export const AppActivitiesIntentSchema = z.enum(["launcher"]);
export type AppActivitiesIntent = z.infer<typeof AppActivitiesIntentSchema>;

const AppActivityRecordSchema = z.object({
  component: z.string().min(1),
  package_name: InstalledPackageNameSchema,
  activity: z.string().min(1),
  relative_activity: z.string().min(1).nullable()
});
export type AppActivityRecord = z.infer<typeof AppActivityRecordSchema>;

export const AppActivitiesRequestSchema = z.object({
  package_name: InstalledPackageNameSchema,
  intent: AppActivitiesIntentSchema.default("launcher"),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppActivitiesRequest = z.infer<typeof AppActivitiesRequestSchema>;

export const AppActivitiesResultSchema = z
  .object({
    device_serial: z.string().min(1),
    requested: z.object({
      package_name: InstalledPackageNameSchema,
      intent: AppActivitiesIntentSchema
    }),
    found: z.boolean(),
    activities: z.array(AppActivityRecordSchema),
    activity_count: z.number().int().nonnegative(),
    query: z.object({
      method: z.literal("cmd_package_query_activities"),
      exit_code: z.number().int().nullable(),
      command_duration_ms: z.number().int().nonnegative()
    }),
    verify: z.object({
      policy: z.literal("cmd_package_query_activities_parse"),
      ok: z.literal(true),
      attempts: z.literal(1),
      reason: z.string()
    }),
    semantics: z.literal("read_only_intent_activity_query_not_install_or_launchability_proof")
  })
  .superRefine((value, ctx) => {
    if (value.activity_count !== value.activities.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["activity_count"],
        message: "activity_count must equal activities.length"
      });
    }
    if (value.found !== value.activities.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["found"],
        message: "found must match whether activities are present"
      });
    }
    for (let index = 0; index < value.activities.length; index += 1) {
      const activity = value.activities[index]!;
      if (activity.package_name !== value.requested.package_name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["activities", index, "package_name"],
          message: "activity package_name must match requested.package_name"
        });
      }
    }
  });
export type AppActivitiesResult = z.infer<typeof AppActivitiesResultSchema>;

const AppPackageInfoVersionSchema = z.object({
  code: z.number().int().nonnegative(),
  min_sdk: z.number().int().nonnegative().nullable(),
  target_sdk: z.number().int().nonnegative().nullable(),
  name: z.string().min(1).nullable()
});
export type AppPackageInfoVersion = z.infer<typeof AppPackageInfoVersionSchema>;

const AppPackageInfoRecordSchema = z.object({
  package_name: InstalledPackageNameSchema,
  app_id: z.number().int().nonnegative(),
  code_path: z.string().min(1),
  resource_path: z.string().min(1).nullable(),
  native_library_dir: z.string().min(1).nullable(),
  primary_cpu_abi: z.string().min(1).nullable(),
  secondary_cpu_abi: z.string().min(1).nullable(),
  cpu_abi_override: z.string().min(1).nullable(),
  version: AppPackageInfoVersionSchema,
  splits: z.array(z.string().min(1)),
  flags: z.array(z.string().min(1)),
  private_flags: z.array(z.string().min(1)),
  timestamps: z.object({
    time_stamp: z.string().min(1).nullable(),
    last_update_time: z.string().min(1).nullable()
  }),
  installer: z.object({
    package_name: InstalledPackageNameSchema.nullable(),
    uid: z.number().int().nullable(),
    initiating_package_name: InstalledPackageNameSchema.nullable(),
    originating_package_name: InstalledPackageNameSchema.nullable()
  }),
  package_source: z.number().int().nullable(),
  install_permissions_fixed: z.boolean().nullable(),
  apex_module_name: z.string().min(1).nullable()
});
export type AppPackageInfoRecord = z.infer<typeof AppPackageInfoRecordSchema>;

export const AppPackageInfoRequestSchema = z.object({
  package_name: InstalledPackageNameSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppPackageInfoRequest = z.infer<typeof AppPackageInfoRequestSchema>;

export const AppPackageInfoResultSchema = z
  .object({
    device_serial: z.string().min(1),
    requested: z.object({
      package_name: InstalledPackageNameSchema
    }),
    installed: z.boolean(),
    package: AppPackageInfoRecordSchema.nullable(),
    query: z.object({
      method: z.literal("dumpsys_package"),
      exit_code: z.number().int().nullable(),
      command_duration_ms: z.number().int().nonnegative()
    }),
    verify: z.object({
      policy: z.literal("dumpsys_active_package_block"),
      ok: z.literal(true),
      attempts: z.literal(1),
      reason: z.string()
    }),
    semantics: z.literal("package_dump_active_block_not_hidden_not_permissions_not_signatures")
  })
  .superRefine((value, ctx) => {
    if (value.installed !== (value.package !== null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installed"],
        message: "installed must match whether package is present"
      });
    }
    if (value.package !== null && value.package.package_name !== value.requested.package_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["package", "package_name"],
        message: "package_name must match requested.package_name"
      });
    }
  });
export type AppPackageInfoResult = z.infer<typeof AppPackageInfoResultSchema>;

export const AppLinksRequestSchema = z.object({
  package_name: InstalledPackageNameSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppLinksRequest = z.infer<typeof AppLinksRequestSchema>;

const AppLinksStateKindSchema = z.enum(["known", "custom_error", "unknown"]);

const AppLinksDomainStateSchema = z
  .object({
    raw: z.string().min(1).max(64).regex(/^[^\s\u0000-\u001f\u007f]+$/),
    kind: AppLinksStateKindSchema,
    code: z.number().int().min(1024).nullable()
  })
  .superRefine((value, ctx) => {
    if (value.kind === "custom_error") {
      if (value.code === null || value.raw !== String(value.code)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["code"],
          message: "custom_error states must carry the numeric raw code"
        });
      }
      return;
    }
    if (value.code !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["code"],
        message: "code must be null unless kind is custom_error"
      });
    }
  });

const AppLinksDomainSchema = z.object({
  domain: z.string().min(1).max(255).regex(/^(?:\*\.)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*$/),
  state: AppLinksDomainStateSchema
});

export const AppLinksResultSchema = z
  .object({
    device_serial: z.string().min(1),
    requested: z.object({
      package_name: InstalledPackageNameSchema
    }),
    package_found: z.boolean(),
    domains: z.array(AppLinksDomainSchema),
    domain_count: z.number().int().nonnegative(),
    query: z.object({
      method: z.literal("cmd_package_get_app_links"),
      exit_code: z.number().int().nullable(),
      command_duration_ms: z.number().int().nonnegative()
    }),
    verify: z.object({
      policy: z.literal("cmd_package_get_app_links_parse"),
      ok: z.literal(true),
      attempts: z.literal(1),
      reason: z.string()
    }),
    semantics: z.literal("read_only_global_domain_verification_state_not_url_resolution_or_per_user_selection_or_signatures")
  })
  .superRefine((value, ctx) => {
    if (value.domain_count !== value.domains.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["domain_count"],
        message: "domain_count must equal domains.length"
      });
    }
    if (!value.package_found && value.domains.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["domains"],
        message: "missing packages must not report app link domains"
      });
    }
  });
export type AppLinksResult = z.infer<typeof AppLinksResultSchema>;

export const AppPidsRequestSchema = z.object({
  package_name: PackageNameSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppPidsRequest = z.infer<typeof AppPidsRequestSchema>;

export const AppPidsResultSchema = z
  .object({
    device_serial: z.string().min(1),
    package_name: PackageNameSchema,
    running: z.boolean(),
    pids: z.array(z.number().int().positive()),
    pid_count: z.number().int().nonnegative(),
    query: z.object({
      method: z.literal("pidof"),
      exit_code: z.number().int().nullable(),
      command_duration_ms: z.number().int().nonnegative()
    }),
    verify: z.object({
      policy: z.literal("pidof_process_snapshot"),
      ok: z.literal(true),
      attempts: z.literal(1),
      reason: z.string()
    }),
    semantics: z.literal("read_only_pid_snapshot_not_process_liveness_guarantee")
  })
  .superRefine((value, ctx) => {
    if (value.pid_count !== value.pids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pid_count"],
        message: "pid_count must equal pids.length"
      });
    }
    if (value.running !== value.pids.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["running"],
        message: "running must match whether pids is non-empty"
      });
    }
    if (new Set(value.pids).size !== value.pids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pids"],
        message: "pids must be unique"
      });
    }
  });
export type AppPidsResult = z.infer<typeof AppPidsResultSchema>;

const AppMemoryMetricSchema = z.object({
  pss_kb: z.number().int().nonnegative().nullable(),
  rss_kb: z.number().int().nonnegative().nullable()
});
export type AppMemoryMetric = z.infer<typeof AppMemoryMetricSchema>;

export const AppMemoryRequestSchema = z.object({
  package_name: PackageNameSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppMemoryRequest = z.infer<typeof AppMemoryRequestSchema>;

export const AppMemoryResultSchema = z
  .object({
    device_serial: z.string().min(1),
    requested: z.object({
      package_name: PackageNameSchema
    }),
    running: z.boolean(),
    processes: z.array(
      z.object({
        pid: z.number().int().positive(),
        process_name: z.string().min(1)
      })
    ),
    process_count: z.number().int().nonnegative(),
    memory: z.object({
      units: z.literal("kb"),
      totals: z.object({
        total_pss_kb: z.number().int().nonnegative().nullable(),
        total_rss_kb: z.number().int().nonnegative().nullable(),
        total_swap_pss_kb: z.number().int().nonnegative().nullable()
      }),
      app_summary: z.object({
        java_heap: AppMemoryMetricSchema,
        native_heap: AppMemoryMetricSchema,
        code: AppMemoryMetricSchema,
        stack: AppMemoryMetricSchema,
        graphics: AppMemoryMetricSchema,
        private_other: AppMemoryMetricSchema,
        system: AppMemoryMetricSchema,
        unknown: AppMemoryMetricSchema
      })
    }),
    query: z.object({
      method: z.literal("dumpsys_meminfo"),
      exit_code: z.number().int().nullable(),
      command_duration_ms: z.number().int().nonnegative()
    }),
    verify: z.object({
      policy: z.literal("dumpsys_meminfo_app_summary_snapshot"),
      ok: z.literal(true),
      attempts: z.literal(1),
      reason: z.string()
    }),
    semantics: z.literal("read_only_memory_snapshot_point_in_time_not_sustained_usage_guarantee")
  })
  .superRefine((value, ctx) => {
    if (value.process_count !== value.processes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["process_count"],
        message: "process_count must equal processes.length"
      });
    }
    if (value.running !== value.processes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["running"],
        message: "running must match whether processes is non-empty"
      });
    }
    const pids = value.processes.map((process) => process.pid);
    if (new Set(pids).size !== pids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["processes"],
        message: "process pids must be unique"
      });
    }
    const memoryValues = collectAppMemoryValues(value.memory);
    if (!value.running && memoryValues.some((entry) => entry.value !== null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["memory"],
        message: "memory values must be null when running is false"
      });
    }
    if (
      value.running &&
      (value.memory.totals.total_pss_kb === null ||
        value.memory.totals.total_rss_kb === null ||
        value.memory.totals.total_swap_pss_kb === null)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["memory", "totals"],
        message: "running memory snapshots require total_pss_kb, total_rss_kb, and total_swap_pss_kb"
      });
    }
  });
export type AppMemoryResult = z.infer<typeof AppMemoryResultSchema>;

export const APP_GRAPHICS_MAX_HISTOGRAM_BUCKETS = 256;

const AppGraphicsJankMetricSchema = z.object({
  count: z.number().int().nonnegative(),
  percent: z.number().nonnegative().max(100)
});
export type AppGraphicsJankMetric = z.infer<typeof AppGraphicsJankMetricSchema>;

const AppGraphicsPercentilesSchema = z.object({
  p50_ms: z.number().int().nonnegative().nullable(),
  p90_ms: z.number().int().nonnegative().nullable(),
  p95_ms: z.number().int().nonnegative().nullable(),
  p99_ms: z.number().int().nonnegative().nullable()
});
export type AppGraphicsPercentiles = z.infer<typeof AppGraphicsPercentilesSchema>;

const AppGraphicsHistogramSchema = z
  .object({
    buckets: z
      .array(
        z.object({
          bucket_ms: z.number().int().nonnegative(),
          count: z.number().int().nonnegative()
        })
      )
      .max(APP_GRAPHICS_MAX_HISTOGRAM_BUCKETS),
    bucket_count: z.number().int().nonnegative(),
    truncated: z.boolean()
  })
  .superRefine((value, ctx) => {
    if (value.bucket_count !== value.buckets.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bucket_count"],
        message: "bucket_count must equal buckets.length"
      });
    }
  });
export type AppGraphicsHistogram = z.infer<typeof AppGraphicsHistogramSchema>;

const AppGraphicsSummarySchema = z.object({
  stats_since_ns: z
    .string()
    .regex(/^(0|[1-9]\d*)$/, "stats_since_ns must be a decimal nanosecond string")
    .nullable(),
  total_frames_rendered: z.number().int().nonnegative().nullable(),
  janky_frames: AppGraphicsJankMetricSchema.nullable(),
  janky_frames_legacy: AppGraphicsJankMetricSchema.nullable(),
  percentiles_ms: AppGraphicsPercentilesSchema.nullable(),
  slow_counts: z.object({
    missed_vsync: z.number().int().nonnegative().nullable(),
    high_input_latency: z.number().int().nonnegative().nullable(),
    slow_ui_thread: z.number().int().nonnegative().nullable(),
    slow_bitmap_uploads: z.number().int().nonnegative().nullable(),
    slow_issue_draw_commands: z.number().int().nonnegative().nullable()
  }),
  frame_deadline_missed: z.number().int().nonnegative().nullable(),
  frame_deadline_missed_legacy: z.number().int().nonnegative().nullable(),
  histogram: AppGraphicsHistogramSchema.nullable(),
  gpu: z
    .object({
      percentiles_ms: AppGraphicsPercentilesSchema.nullable(),
      histogram: AppGraphicsHistogramSchema.nullable()
    })
    .nullable()
});
export type AppGraphicsSummary = z.infer<typeof AppGraphicsSummarySchema>;

export const AppGraphicsRequestSchema = z.object({
  package_name: PackageNameSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppGraphicsRequest = z.infer<typeof AppGraphicsRequestSchema>;

export const AppGraphicsResultSchema = z
  .object({
    device_serial: z.string().min(1),
    requested: z.object({
      package_name: PackageNameSchema
    }),
    running: z.boolean(),
    processes: z.array(
      z.object({
        pid: z.number().int().positive(),
        process_name: z.string().min(1)
      })
    ),
    process_count: z.number().int().nonnegative(),
    graphics: AppGraphicsSummarySchema,
    query: z.object({
      method: z.literal("dumpsys_gfxinfo"),
      exit_code: z.number().int().nullable(),
      command_duration_ms: z.number().int().nonnegative()
    }),
    verify: z.object({
      policy: z.literal("dumpsys_gfxinfo_frame_summary_snapshot"),
      ok: z.literal(true),
      attempts: z.literal(1),
      reason: z.string()
    }),
    semantics: z.literal("read_only_graphics_summary_since_last_reset_not_sustained_performance_guarantee")
  })
  .superRefine((value, ctx) => {
    if (value.process_count !== value.processes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["process_count"],
        message: "process_count must equal processes.length"
      });
    }
    if (value.running !== value.processes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["running"],
        message: "running must match whether processes is non-empty"
      });
    }
    const pids = value.processes.map((process) => process.pid);
    if (new Set(pids).size !== pids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["processes"],
        message: "process pids must be unique"
      });
    }
    if (!value.running && appGraphicsHasValues(value.graphics)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["graphics"],
        message: "graphics values must be null when running is false"
      });
    }
    if (value.running) {
      if (value.graphics.stats_since_ns === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["graphics", "stats_since_ns"],
          message: "running graphics snapshots require stats_since_ns"
        });
      }
      if (value.graphics.total_frames_rendered === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["graphics", "total_frames_rendered"],
          message: "running graphics snapshots require total_frames_rendered"
        });
      }
      if (value.graphics.janky_frames === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["graphics", "janky_frames"],
          message: "running graphics snapshots require janky_frames"
        });
      }
    }
  });
export type AppGraphicsResult = z.infer<typeof AppGraphicsResultSchema>;

const DestructiveAppPackageNameSchema = PackageNameSchema.refine((value) => isDestructiveAppPackageAllowed(value), {
  message: "refusing to target protected Android system package"
});

export const AppClearDataRequestSchema = z
  .object({
    package_name: DestructiveAppPackageNameSchema,
    confirm_package: PackageNameSchema,
    timeout_ms: z.number().int().positive().max(120_000).default(10_000),
    device_serial: z.string().min(1, "app clear-data requires explicit --serial")
  })
  .refine((value) => value.confirm_package === value.package_name, {
    message: "confirm_package must exactly match package_name",
    path: ["confirm_package"]
  });
export type AppClearDataRequest = z.infer<typeof AppClearDataRequestSchema>;

export const AppClearDataResultSchema = z.object({
  requested: z.object({
    package_name: DestructiveAppPackageNameSchema
  }),
  clear: z.object({
    method: z.literal("pm_clear"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("package_manager_success"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  })
});
export type AppClearDataResult = z.infer<typeof AppClearDataResultSchema>;

export const AppUninstallRequestSchema = z
  .object({
    package_name: DestructiveAppPackageNameSchema,
    confirm_package: PackageNameSchema,
    user_id: AndroidUserIdSchema.optional(),
    timeout_ms: z.number().int().positive().max(600_000).default(120_000),
    device_serial: z.string().min(1, "app uninstall requires explicit --serial")
  })
  .refine((value) => value.confirm_package === value.package_name, {
    message: "confirm_package must exactly match package_name",
    path: ["confirm_package"]
  });
export type AppUninstallRequest = z.infer<typeof AppUninstallRequestSchema>;

export const AppUninstallResultSchema = z.object({
  device_serial: z.string().min(1),
  requested: z.object({
    package_name: DestructiveAppPackageNameSchema,
    user_id: AndroidUserIdSchema.nullable()
  }),
  uninstall: z.object({
    method: z.literal("adb_uninstall"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("adb_success"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  })
});
export type AppUninstallResult = z.infer<typeof AppUninstallResultSchema>;

const LocalApkPathSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, { message: "apk_path must not be blank" });

export const ApkMetadataSchema = z.object({
  file_name: z.string().min(1),
  bytes: z.number().int().positive(),
  sha256: Sha256DigestSchema
});
export type ApkMetadata = z.infer<typeof ApkMetadataSchema>;

export const AppInstallRequestSchema = z.object({
  apk_path: LocalApkPathSchema,
  apk: ApkMetadataSchema,
  replace: z.boolean().default(false),
  grant_runtime_permissions: z.boolean().default(false),
  allow_test: z.boolean().default(false),
  allow_downgrade: z.boolean().default(false),
  timeout_ms: z.number().int().positive().max(600_000).default(120_000),
  device_serial: z.string().min(1, "app install requires explicit --serial")
});
export type AppInstallRequest = z.infer<typeof AppInstallRequestSchema>;

export const AppInstallResultSchema = z.object({
  device_serial: z.string().min(1),
  requested: z.object({
    apk: ApkMetadataSchema,
    replace: z.boolean(),
    grant_runtime_permissions: z.boolean(),
    allow_test: z.boolean(),
    allow_downgrade: z.boolean()
  }),
  install: z.object({
    method: z.literal("adb_install"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("adb_success"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  })
});
export type AppInstallResult = z.infer<typeof AppInstallResultSchema>;

export const AppPermissionOperationSchema = z.enum(["grant", "revoke"]);
export type AppPermissionOperation = z.infer<typeof AppPermissionOperationSchema>;

const PermissionNameSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/, "invalid Android permission name");

export const AppPermissionRequestSchema = z.object({
  package_name: PackageNameSchema,
  permission_name: PermissionNameSchema,
  operation: AppPermissionOperationSchema,
  user_id: AndroidUserIdSchema.optional(),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1, "app permission changes require explicit --serial")
});
export type AppPermissionRequest = z.infer<typeof AppPermissionRequestSchema>;

export const AppPermissionResultSchema = z.object({
  device_serial: z.string().min(1),
  requested: z.object({
    package_name: PackageNameSchema,
    permission_name: PermissionNameSchema,
    operation: AppPermissionOperationSchema,
    user_id: AndroidUserIdSchema.nullable()
  }),
  permission: z.object({
    method: z.enum(["pm_grant", "pm_revoke"]),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("pm_command_success"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  })
});
export type AppPermissionResult = z.infer<typeof AppPermissionResultSchema>;

export const AppPermissionInspectStateSchema = z.enum(["granted", "denied", "not_requested", "unknown"]);
export type AppPermissionInspectState = z.infer<typeof AppPermissionInspectStateSchema>;

export const AppPermissionInspectSourceSchema = z.enum([
  "runtime",
  "install",
  "manifest_initial",
  "not_requested",
  "package_absent",
  "unresolved_user",
  "unknown"
]);
export type AppPermissionInspectSource = z.infer<typeof AppPermissionInspectSourceSchema>;

const AppPermissionDumpEntrySchema = z.object({
  present: z.boolean(),
  granted: z.boolean().nullable(),
  flags: z.array(z.string().min(1))
});

export const AppPermissionInspectRequestSchema = z.object({
  package_name: PackageNameSchema,
  permission_name: PermissionNameSchema,
  user_id: AndroidUserIdSchema.optional(),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppPermissionInspectRequest = z.infer<typeof AppPermissionInspectRequestSchema>;

export const AppPermissionInspectResultSchema = z.object({
  device_serial: z.string().min(1),
  requested: z.object({
    package_name: PackageNameSchema,
    permission_name: PermissionNameSchema,
    user_id: AndroidUserIdSchema.nullable()
  }),
  package_found: z.boolean(),
  package: z.object({
    target_sdk: z.number().int().nonnegative().nullable()
  }),
  permission: z.object({
    state: AppPermissionInspectStateSchema,
    granted: z.boolean().nullable(),
    source: AppPermissionInspectSourceSchema,
    manifest_requested: z.boolean(),
    available_user_ids: z.array(AndroidUserIdSchema),
    install: AppPermissionDumpEntrySchema,
    runtime: AppPermissionDumpEntrySchema.extend({
      selected_user_id: AndroidUserIdSchema,
      user_present: z.boolean()
    })
  }),
  query: z.object({
    method: z.literal("dumpsys_package"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("dumpsys_permission_state"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("package_dump_permission_state_not_appops")
});
export type AppPermissionInspectResult = z.infer<typeof AppPermissionInspectResultSchema>;

const AppOpsNameSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/, "invalid Android AppOps operation name");

export const AppOpsGetRequestSchema = z.object({
  package_name: InstalledPackageNameSchema,
  op_name: AppOpsNameSchema,
  user_id: AndroidUserIdSchema.optional(),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppOpsGetRequest = z.infer<typeof AppOpsGetRequestSchema>;

const AppOpsModeKindSchema = z.enum(["allow", "ignore", "deny", "default", "foreground", "ask", "unknown"]);
const KnownAppOpsModeKindSchema = z.enum(["allow", "ignore", "deny", "default", "foreground", "ask"]);

const AppOpsModeSchema = z
  .object({
    raw: z.string().min(1).max(64).regex(/^[^\s;:\u0000-\u001f\u007f]+$/),
    kind: AppOpsModeKindSchema
  })
  .superRefine((value, ctx) => {
    const known = KnownAppOpsModeKindSchema.safeParse(value.raw);
    if (known.success && value.kind !== known.data) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["kind"],
        message: "known appops modes must use their raw mode as kind"
      });
    }
    if (!known.success && value.kind !== "unknown") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["kind"],
        message: "unknown appops modes must use kind unknown"
      });
    }
  });

const AppOpsEntryDetailsSchema = z.object({
  time_raw: NullableStringSchema,
  reject_time_raw: NullableStringSchema,
  duration_raw: NullableStringSchema
});

const AppOpsEntrySchema = z.object({
  scope: z.enum(["uid", "package"]),
  op_name: AppOpsNameSchema,
  mode: AppOpsModeSchema,
  details: AppOpsEntryDetailsSchema
});

export const AppOpsGetResultSchema = z
  .object({
    device_serial: z.string().min(1),
    requested: z.object({
      package_name: InstalledPackageNameSchema,
      op_name: AppOpsNameSchema,
      user_id: AndroidUserIdSchema.nullable()
    }),
    lookup: z.object({
      status: z.enum(["resolved", "no_uid"]),
      uid_resolved: z.boolean(),
      reason: z.enum(["appops_uid_resolved", "no_appops_uid_for_package_in_queried_user"])
    }),
    default_mode: AppOpsModeSchema.nullable(),
    entries: z.array(AppOpsEntrySchema),
    entry_count: z.number().int().nonnegative(),
    query: z.object({
      method: z.literal("cmd_appops_get"),
      exit_code: z.number().int().nullable(),
      command_duration_ms: z.number().int().nonnegative()
    }),
    verify: z.object({
      policy: z.literal("cmd_appops_get_single_op_parse"),
      ok: z.literal(true),
      attempts: z.literal(1),
      reason: z.string()
    }),
    semantics: z.literal("read_only_appops_single_op_snapshot_not_runtime_permission_or_effective_behavior_proof")
  })
  .superRefine((value, ctx) => {
    if (value.entry_count !== value.entries.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entry_count"],
        message: "entry_count must equal entries.length"
      });
    }
    if (value.lookup.status === "resolved") {
      if (!value.lookup.uid_resolved || value.lookup.reason !== "appops_uid_resolved") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lookup"],
          message: "resolved appops lookups must report a resolved uid"
        });
      }
      if (value.entries.length === 0 && value.default_mode === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries"],
          message: "resolved appops lookups need entries or a default mode"
        });
      }
    }
    if (value.lookup.status === "no_uid") {
      if (value.lookup.uid_resolved || value.lookup.reason !== "no_appops_uid_for_package_in_queried_user") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lookup"],
          message: "no_uid appops lookups must not report a resolved uid"
        });
      }
      if (value.entries.length > 0 || value.default_mode !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries"],
          message: "no_uid appops lookups must not report entries or a default mode"
        });
      }
    }
    for (const [index, entry] of value.entries.entries()) {
      if (entry.op_name !== value.requested.op_name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries", index, "op_name"],
          message: "appops entries must match the requested op"
        });
      }
    }
  });
export type AppOpsGetResult = z.infer<typeof AppOpsGetResultSchema>;

export const AppStartVerifyPolicySchema = z.enum(["package_foreground", "none"]);
export type AppStartVerifyPolicy = z.infer<typeof AppStartVerifyPolicySchema>;

export const AppStartRequestSchema = z.object({
  package_name: PackageNameSchema,
  activity: ActivityNameSchema,
  verify: AppStartVerifyPolicySchema.default("package_foreground"),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppStartRequest = z.infer<typeof AppStartRequestSchema>;

export const AppStartResultSchema = z.object({
  requested: z.object({
    package_name: PackageNameSchema,
    activity: ActivityNameSchema,
    normalized_activity: z.string().min(1),
    component: z.string().min(1)
  }),
  before: AppCurrentResultSchema,
  after: AppCurrentResultSchema.nullable(),
  am_start: z.object({
    status: z.string().optional(),
    activity: z.string().optional(),
    exit_code: z.number().int().nullable(),
    duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: AppStartVerifyPolicySchema,
    ok: z.boolean(),
    attempts: z.number().int().nonnegative(),
    reason: z.string()
  })
});
export type AppStartResult = z.infer<typeof AppStartResultSchema>;

export const AppLaunchVerifyPolicySchema = z.enum(["package_foreground", "none"]);
export type AppLaunchVerifyPolicy = z.infer<typeof AppLaunchVerifyPolicySchema>;

export const AppLaunchRequestSchema = z.object({
  package_name: PackageNameSchema,
  verify: AppLaunchVerifyPolicySchema.default("package_foreground"),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppLaunchRequest = z.infer<typeof AppLaunchRequestSchema>;

export const AppLaunchResultSchema = z.object({
  requested: z.object({
    package_name: PackageNameSchema
  }),
  before: AppCurrentResultSchema,
  after: AppCurrentResultSchema.nullable(),
  launch: z.object({
    method: z.literal("monkey"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: AppLaunchVerifyPolicySchema,
    ok: z.boolean(),
    attempts: z.number().int().nonnegative(),
    reason: z.string()
  })
});
export type AppLaunchResult = z.infer<typeof AppLaunchResultSchema>;

const HttpUrlStringSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine((value) => !/[\u0000-\u001f\u007f\s]/.test(value), { message: "url must not contain whitespace or control characters" })
  .refine((value) => isSafeHttpUrl(value), {
    message: "url must be an http or https URL with a hostname and no credentials"
  });

export const UrlMetadataSchema = z.object({
  scheme: z.enum(["http", "https"]),
  hostname: z.string().min(1),
  port: z.string().nullable(),
  path_present: z.boolean(),
  query_present: z.boolean(),
  fragment_present: z.boolean(),
  url_length: z.number().int().positive()
});
export type UrlMetadata = z.infer<typeof UrlMetadataSchema>;

export const AppOpenUrlVerifyPolicySchema = z.enum(["activity_manager_accepted", "none"]);
export type AppOpenUrlVerifyPolicy = z.infer<typeof AppOpenUrlVerifyPolicySchema>;

export const AppOpenUrlRequestSchema = z.object({
  url: HttpUrlStringSchema,
  verify: AppOpenUrlVerifyPolicySchema.default("activity_manager_accepted"),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppOpenUrlRequest = z.infer<typeof AppOpenUrlRequestSchema>;

export const AppOpenUrlResultSchema = z.object({
  requested: UrlMetadataSchema,
  before: AppCurrentResultSchema,
  after: AppCurrentResultSchema.nullable(),
  open: z.object({
    method: z.literal("am_start_view"),
    status: z.string().optional(),
    activity: z.string().optional(),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: AppOpenUrlVerifyPolicySchema,
    ok: z.boolean(),
    attempts: z.number().int().nonnegative(),
    reason: z.string()
  })
});
export type AppOpenUrlResult = z.infer<typeof AppOpenUrlResultSchema>;

export const AppResolveUrlRequestSchema = z.object({
  url: HttpUrlStringSchema,
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppResolveUrlRequest = z.infer<typeof AppResolveUrlRequestSchema>;

const AppResolveUrlMatchMetadataSchema = z.object({
  priority: z.number().int(),
  preferred_order: z.number().int(),
  match: z.object({
    raw: z.string().regex(/^0x[0-9a-fA-F]+$/),
    value: z.number().int().nonnegative()
  }),
  specific_index: z.number().int(),
  is_default: z.boolean()
});

const AppResolveUrlResolutionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("none"),
    component: z.null(),
    package: z.null(),
    activity: z.null(),
    is_system_resolver: z.literal(false)
  }),
  z.object({
    type: z.literal("activity"),
    component: z.string().min(1),
    package: z.string().min(1),
    activity: z.string().min(1),
    is_system_resolver: z.literal(false)
  }),
  z.object({
    type: z.literal("resolver"),
    component: z.string().min(1),
    package: z.string().min(1),
    activity: z.string().min(1),
    is_system_resolver: z.literal(true)
  })
]);

export const AppResolveUrlResultSchema = z.object({
  device_serial: z.string().min(1),
  requested: UrlMetadataSchema,
  resolution: AppResolveUrlResolutionSchema,
  metadata: AppResolveUrlMatchMetadataSchema.nullable(),
  query: z.object({
    method: z.literal("cmd_package_resolve_activity"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: z.literal("package_manager_resolve_activity_parse"),
    ok: z.literal(true),
    attempts: z.literal(1),
    reason: z.string()
  }),
  semantics: z.literal("read_only_url_intent_resolution_not_launchability_or_network_proof")
});
export type AppResolveUrlResult = z.infer<typeof AppResolveUrlResultSchema>;

export const AppStopVerifyPolicySchema = z.enum(["foreground_absent", "none"]);
export type AppStopVerifyPolicy = z.infer<typeof AppStopVerifyPolicySchema>;

export const AppStopRequestSchema = z.object({
  package_name: PackageNameSchema,
  verify: AppStopVerifyPolicySchema.default("foreground_absent"),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type AppStopRequest = z.infer<typeof AppStopRequestSchema>;

export const AppStopResultSchema = z.object({
  requested: z.object({
    package_name: PackageNameSchema
  }),
  before: AppCurrentResultSchema,
  after: AppCurrentResultSchema.nullable(),
  stop: z.object({
    method: z.literal("am_force_stop"),
    exit_code: z.number().int().nullable(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  verify: z.object({
    policy: AppStopVerifyPolicySchema,
    ok: z.boolean(),
    attempts: z.number().int().nonnegative(),
    reason: z.string()
  })
});
export type AppStopResult = z.infer<typeof AppStopResultSchema>;

export const LogsDumpRequestSchema = z.object({
  package_name: PackageNameSchema,
  lines: z.number().int().positive().max(1000).default(200),
  timeout_ms: z.number().int().positive().max(120_000).default(10_000),
  device_serial: z.string().min(1).optional()
});
export type LogsDumpRequest = z.infer<typeof LogsDumpRequestSchema>;

const LogPidSchema = z.number().int().positive();
const LogsDumpTruncationSchema = z.object({
  lines: z.boolean(),
  chars: z.boolean(),
  line_chars: z.boolean()
});

export const LogsDumpProcessResultSchema = z.object({
  pid: LogPidSchema,
  line_count: z.number().int().nonnegative(),
  lines: z.array(z.string()),
  truncated: LogsDumpTruncationSchema
});
export type LogsDumpProcessResult = z.infer<typeof LogsDumpProcessResultSchema>;

export const LogsDumpResultSchema = z.object({
  device_serial: z.string().min(1),
  requested: z.object({
    package_name: PackageNameSchema
  }),
  pid_selection: z.object({
    method: z.literal("pidof"),
    all_pids: z.array(LogPidSchema).min(1),
    dumped_pids: z.array(LogPidSchema).min(1),
    total_pid_count: z.number().int().positive(),
    dumped_pid_count: z.number().int().positive(),
    truncated: z.boolean()
  }),
  dump: z.object({
    method: z.literal("logcat_pid_tail"),
    format: z.literal("threadtime"),
    buffers: z.array(z.enum(["main", "system", "crash"])),
    per_pid_line_limit: z.number().int().positive().max(1000),
    max_line_chars: z.number().int().positive(),
    max_total_chars: z.number().int().positive(),
    command_count: z.number().int().positive(),
    command_duration_ms: z.number().int().nonnegative()
  }),
  processes: z.array(LogsDumpProcessResultSchema).min(1),
  line_count: z.number().int().nonnegative(),
  truncated: LogsDumpTruncationSchema.extend({
    processes: z.boolean()
  }),
  semantics: z.literal("per_pid_logcat_tail_then_global_cap")
});
export type LogsDumpResult = z.infer<typeof LogsDumpResultSchema>;

function isSafeHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }
  if (parsed.hostname.length === 0) {
    return false;
  }
  return parsed.username.length === 0 && parsed.password.length === 0;
}

function isDestructiveAppPackageAllowed(packageName: string): boolean {
  if (packageName === "com.android" || packageName.startsWith("com.android.")) {
    return false;
  }
  return !["com.google.android.gms", "com.google.android.gsf"].some(
    (protectedPackage) => packageName === protectedPackage || packageName.startsWith(`${protectedPackage}.`)
  );
}

function collectAppMemoryValues(memory: AppMemoryResult["memory"]): Array<{ value: number | null }> {
  return [
    { value: memory.totals.total_pss_kb },
    { value: memory.totals.total_rss_kb },
    { value: memory.totals.total_swap_pss_kb },
    memory.app_summary.java_heap,
    memory.app_summary.native_heap,
    memory.app_summary.code,
    memory.app_summary.stack,
    memory.app_summary.graphics,
    memory.app_summary.private_other,
    memory.app_summary.system,
    memory.app_summary.unknown
  ].flatMap((entry) => ("pss_kb" in entry ? [{ value: entry.pss_kb }, { value: entry.rss_kb }] : [entry]));
}

function appGraphicsHasValues(graphics: AppGraphicsResult["graphics"]): boolean {
  return (
    graphics.stats_since_ns !== null ||
    graphics.total_frames_rendered !== null ||
    graphics.janky_frames !== null ||
    graphics.janky_frames_legacy !== null ||
    graphics.percentiles_ms !== null ||
    graphics.frame_deadline_missed !== null ||
    graphics.frame_deadline_missed_legacy !== null ||
    graphics.histogram !== null ||
    graphics.gpu !== null ||
    Object.values(graphics.slow_counts).some((value) => value !== null)
  );
}
