export { readFile } from "node:fs/promises";
export { join } from "node:path";

export function appActivityRecord(overrides: Record<string, unknown> = {}) {
  return {
    component: "com.example.app/.MainActivity",
    package_name: "com.example.app",
    activity: "com.example.app.MainActivity",
    relative_activity: ".MainActivity",
    ...overrides
  };
}

export function appPackageInfoRecord(overrides: Record<string, unknown> = {}) {
  return {
    package_name: "com.example.app",
    app_id: 10134,
    code_path: "/data/app/~~hash/com.example.app-base",
    resource_path: "/data/app/~~hash/com.example.app-base",
    native_library_dir: "/data/app/~~hash/com.example.app-base/lib/arm64",
    primary_cpu_abi: "arm64-v8a",
    secondary_cpu_abi: null,
    cpu_abi_override: null,
    version: { code: 42, min_sdk: 23, target_sdk: 35, name: "1.2.3" },
    splits: ["base"],
    flags: ["HAS_CODE", "ALLOW_CLEAR_USER_DATA"],
    private_flags: ["PRIVATE_FLAG_ACTIVITIES_RESIZE_MODE_RESIZEABLE"],
    timestamps: {
      time_stamp: "2026-06-29 12:00:00",
      last_update_time: "2026-06-29 12:30:00"
    },
    installer: {
      package_name: "com.android.vending",
      uid: 10031,
      initiating_package_name: "com.android.vending",
      originating_package_name: null
    },
    package_source: 0,
    install_permissions_fixed: true,
    apex_module_name: null,
    ...overrides
  };
}

export function appMemorySnapshot() {
  return {
    units: "kb" as const,
    totals: {
      total_pss_kb: 63_795,
      total_rss_kb: 173_308,
      total_swap_pss_kb: 10_643
    },
    app_summary: {
      java_heap: { pss_kb: 7_336, rss_kb: 23_400 },
      native_heap: { pss_kb: 5_136, rss_kb: 6_396 },
      code: { pss_kb: 15_316, rss_kb: 134_152 },
      stack: { pss_kb: 340, rss_kb: 572 },
      graphics: { pss_kb: 0, rss_kb: 0 },
      private_other: { pss_kb: 6_200, rss_kb: null },
      system: { pss_kb: 29_467, rss_kb: null },
      unknown: { pss_kb: null, rss_kb: 8_788 }
    }
  };
}

export function emptyAppMemorySnapshot() {
  const emptyMetric = { pss_kb: null, rss_kb: null };
  return {
    units: "kb" as const,
    totals: {
      total_pss_kb: null,
      total_rss_kb: null,
      total_swap_pss_kb: null
    },
    app_summary: {
      java_heap: { ...emptyMetric },
      native_heap: { ...emptyMetric },
      code: { ...emptyMetric },
      stack: { ...emptyMetric },
      graphics: { ...emptyMetric },
      private_other: { ...emptyMetric },
      system: { ...emptyMetric },
      unknown: { ...emptyMetric }
    }
  };
}

export function appGraphicsSummary() {
  return {
    stats_since_ns: "91522723936145",
    total_frames_rendered: 6266,
    janky_frames: { count: 489, percent: 7.8 },
    janky_frames_legacy: { count: 2300, percent: 36.71 },
    percentiles_ms: { p50_ms: 9, p90_ms: 24, p95_ms: 28, p99_ms: 32 },
    slow_counts: {
      missed_vsync: 4,
      high_input_latency: 10359,
      slow_ui_thread: 456,
      slow_bitmap_uploads: 29,
      slow_issue_draw_commands: 66
    },
    frame_deadline_missed: 489,
    frame_deadline_missed_legacy: 517,
    histogram: {
      buckets: [
        { bucket_ms: 5, count: 978 },
        { bucket_ms: 6, count: 458 }
      ],
      bucket_count: 2,
      truncated: false
    },
    gpu: {
      percentiles_ms: { p50_ms: 4, p90_ms: 7, p95_ms: 8, p99_ms: 11 },
      histogram: {
        buckets: [
          { bucket_ms: 1, count: 365 },
          { bucket_ms: 2, count: 935 }
        ],
        bucket_count: 2,
        truncated: false
      }
    }
  };
}

export function emptyAppGraphicsSummary() {
  return {
    stats_since_ns: null,
    total_frames_rendered: null,
    janky_frames: null,
    janky_frames_legacy: null,
    percentiles_ms: null,
    slow_counts: {
      missed_vsync: null,
      high_input_latency: null,
      slow_ui_thread: null,
      slow_bitmap_uploads: null,
      slow_issue_draw_commands: null
    },
    frame_deadline_missed: null,
    frame_deadline_missed_legacy: null,
    histogram: null,
    gpu: null
  };
}

export async function createAjv(): Promise<{ compile(schema: unknown): (data: unknown) => boolean }> {
  const Ajv2020 = (await import("ajv/dist/2020.js")).default as unknown as new (options: {
    strict: boolean;
  }) => {
    compile(schema: unknown): (data: unknown) => boolean;
  };
  return new Ajv2020({ strict: false });
}
