import { APP_GRAPHICS_MAX_HISTOGRAM_BUCKETS, type AppGraphicsResult } from "../../contracts/index.js";

export type ParsedAppGraphicsOutput =
  | {
      ok: true;
      running: boolean;
      processes: AppGraphicsResult["processes"];
      graphics: AppGraphicsResult["graphics"];
    }
  | {
      ok: false;
      failure: string;
    };

type ParseResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      failure: string;
    };

export function buildAdbAppGraphicsArgs(packageName: string): string[] {
  return ["shell", "dumpsys", "gfxinfo", packageName];
}

export function parseAppGraphicsOutput(
  stdout: string,
  stderr: string,
  exitCode: number | null,
  packageName: string
): ParsedAppGraphicsOutput {
  if (stderr.trim().length > 0) {
    return { ok: false, failure: "dumpsys gfxinfo wrote unexpected stderr" };
  }
  if (exitCode !== 0) {
    return { ok: false, failure: "dumpsys gfxinfo exited nonzero" };
  }

  const normalizedStdout = normalizeLineEndings(stdout);
  const firstLine = firstNonEmptyLine(normalizedStdout);
  if (firstLine === undefined) {
    return { ok: false, failure: "dumpsys gfxinfo returned empty output" };
  }
  if (firstLine === `No process found for: ${packageName}`) {
    return { ok: true, running: false, processes: [], graphics: emptyAppGraphicsSummary() };
  }
  if (firstLine.startsWith("No process found for:")) {
    return { ok: false, failure: "dumpsys gfxinfo returned a process-absence result for a different package" };
  }

  const headers = [...normalizedStdout.matchAll(/^\*\* Graphics info for pid ([1-9]\d*) \[(.+)] \*\*$/gm)];
  if (headers.length === 0) {
    return { ok: false, failure: "dumpsys gfxinfo did not return a Graphics info process header" };
  }
  if (headers.length > 1) {
    return { ok: false, failure: "dumpsys gfxinfo returned multiple process sections" };
  }

  const header = headers[0]!;
  const pidText = header[1]!;
  const processName = header[2]!;
  if (processName !== packageName) {
    return { ok: false, failure: "dumpsys gfxinfo process name did not match requested package" };
  }
  const pid = parseGraphicsInteger(pidText);
  if (pid === null || pid <= 0) {
    return { ok: false, failure: "dumpsys gfxinfo returned malformed process id" };
  }

  const summary = extractGraphicsSummarySection(normalizedStdout, header.index + header[0].length);
  const graphics = parseGraphicsSummary(summary);
  if (!graphics.ok) {
    return graphics;
  }

  return {
    ok: true,
    running: true,
    processes: [{ pid, process_name: processName }],
    graphics: graphics.value
  };
}

export function emptyAppGraphicsSummary(): AppGraphicsResult["graphics"] {
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

function parseGraphicsSummary(summary: string): ParseResult<AppGraphicsResult["graphics"]> {
  const statsSinceNs = parseStatsSinceNs(summary);
  if (statsSinceNs === null) {
    return { ok: false, failure: "dumpsys gfxinfo did not return parseable stats_since_ns" };
  }

  const totalFrames = parseRequiredCounter(summary, "Total frames rendered");
  if (!totalFrames.ok) {
    return totalFrames;
  }

  const jankyFrames = parseRequiredJankyMetric(summary, "Janky frames");
  if (!jankyFrames.ok) {
    return jankyFrames;
  }

  const jankyFramesLegacy = parseOptionalJankyMetric(summary, "Janky frames (legacy)");
  if (!jankyFramesLegacy.ok) {
    return jankyFramesLegacy;
  }

  const percentiles = parsePercentiles(summary, "");
  if (!percentiles.ok) {
    return percentiles;
  }

  const missedVsync = parseOptionalCounter(summary, "Number Missed Vsync");
  const highInputLatency = parseOptionalCounter(summary, "Number High input latency");
  const slowUiThread = parseOptionalCounter(summary, "Number Slow UI thread");
  const slowBitmapUploads = parseOptionalCounter(summary, "Number Slow bitmap uploads");
  const slowIssueDrawCommands = parseOptionalCounter(summary, "Number Slow issue draw commands");
  const frameDeadlineMissed = parseOptionalCounter(summary, "Number Frame deadline missed");
  const frameDeadlineMissedLegacy = parseOptionalCounter(summary, "Number Frame deadline missed (legacy)");
  if (!missedVsync.ok) {
    return missedVsync;
  }
  if (!highInputLatency.ok) {
    return highInputLatency;
  }
  if (!slowUiThread.ok) {
    return slowUiThread;
  }
  if (!slowBitmapUploads.ok) {
    return slowBitmapUploads;
  }
  if (!slowIssueDrawCommands.ok) {
    return slowIssueDrawCommands;
  }
  if (!frameDeadlineMissed.ok) {
    return frameDeadlineMissed;
  }
  if (!frameDeadlineMissedLegacy.ok) {
    return frameDeadlineMissedLegacy;
  }

  const histogram = parseHistogram(summary, "HISTOGRAM");
  if (!histogram.ok) {
    return histogram;
  }
  const gpuPercentiles = parsePercentiles(summary, "gpu");
  if (!gpuPercentiles.ok) {
    return gpuPercentiles;
  }
  const gpuHistogram = parseHistogram(summary, "GPU HISTOGRAM");
  if (!gpuHistogram.ok) {
    return gpuHistogram;
  }

  const gpu =
    gpuPercentiles.value === null && gpuHistogram.value === null
      ? null
      : {
          percentiles_ms: gpuPercentiles.value,
          histogram: gpuHistogram.value
        };

  return {
    ok: true,
    value: {
      stats_since_ns: statsSinceNs,
      total_frames_rendered: totalFrames.value,
      janky_frames: jankyFrames.value,
      janky_frames_legacy: jankyFramesLegacy.value,
      percentiles_ms: percentiles.value,
      slow_counts: {
        missed_vsync: missedVsync.value,
        high_input_latency: highInputLatency.value,
        slow_ui_thread: slowUiThread.value,
        slow_bitmap_uploads: slowBitmapUploads.value,
        slow_issue_draw_commands: slowIssueDrawCommands.value
      },
      frame_deadline_missed: frameDeadlineMissed.value,
      frame_deadline_missed_legacy: frameDeadlineMissedLegacy.value,
      histogram: histogram.value,
      gpu
    }
  };
}

function extractGraphicsSummarySection(stdout: string, startIndex: number): string {
  const section = stdout.slice(startIndex);
  const boundaryIndex = section.search(
    /^(Pipeline=|Memory policy:|Profile data in ms:|View hierarchy:|GraphicBufferAllocator buffers:|Imported gralloc buffers:|Caches:|CPU Caches:|GPU Caches:|Total CPU memory usage:|Total GPU memory usage:|Detail dimensions:)/m
  );
  return boundaryIndex === -1 ? section : section.slice(0, boundaryIndex);
}

function parseStatsSinceNs(summary: string): string | null {
  const line = findSummaryLine(summary, "Stats since");
  if (line === undefined) {
    return null;
  }
  const match = /^Stats since:\s+(0|[1-9]\d*)ns\s*$/.exec(line);
  if (match === null) {
    return null;
  }
  return match[1]!;
}

function parseRequiredCounter(summary: string, label: string): ParseResult<number> {
  const parsed = parseOptionalCounter(summary, label);
  if (!parsed.ok) {
    return parsed;
  }
  if (parsed.value === null) {
    return { ok: false, failure: `dumpsys gfxinfo did not return ${label}` };
  }
  return { ok: true, value: parsed.value };
}

function parseOptionalCounter(summary: string, label: string): ParseResult<number | null> {
  const line = findSummaryLine(summary, label);
  if (line === undefined) {
    return { ok: true, value: null };
  }
  const match = new RegExp(`^${escapeRegExp(label)}:\\s+([0-9][0-9,]*)\\s*$`).exec(line);
  if (match === null) {
    return { ok: false, failure: `dumpsys gfxinfo returned malformed ${label}` };
  }
  const value = parseGraphicsInteger(match[1]!);
  if (value === null) {
    return { ok: false, failure: `dumpsys gfxinfo returned unsafe ${label}` };
  }
  return { ok: true, value };
}

function parseRequiredJankyMetric(summary: string, label: string): ParseResult<AppGraphicsResult["graphics"]["janky_frames"]> {
  const parsed = parseOptionalJankyMetric(summary, label);
  if (!parsed.ok) {
    return parsed;
  }
  if (parsed.value === null) {
    return { ok: false, failure: `dumpsys gfxinfo did not return ${label}` };
  }
  return { ok: true, value: parsed.value };
}

function parseOptionalJankyMetric(
  summary: string,
  label: string
): ParseResult<AppGraphicsResult["graphics"]["janky_frames"] | null> {
  const line = findSummaryLine(summary, label);
  if (line === undefined) {
    return { ok: true, value: null };
  }
  const match = new RegExp(`^${escapeRegExp(label)}:\\s+([0-9][0-9,]*)\\s+\\(([0-9]+(?:\\.[0-9]+)?)%\\)\\s*$`).exec(line);
  if (match === null) {
    return { ok: false, failure: `dumpsys gfxinfo returned malformed ${label}` };
  }
  const count = parseGraphicsInteger(match[1]!);
  const percent = parsePercent(match[2]!);
  if (count === null || percent === null) {
    return { ok: false, failure: `dumpsys gfxinfo returned unsafe ${label}` };
  }
  return { ok: true, value: { count, percent } };
}

function parsePercentiles(summary: string, kind: "" | "gpu"): ParseResult<AppGraphicsResult["graphics"]["percentiles_ms"] | null> {
  const prefix = kind === "gpu" ? " gpu" : "";
  const labels = [
    ["p50_ms", `50th${prefix} percentile`],
    ["p90_ms", `90th${prefix} percentile`],
    ["p95_ms", `95th${prefix} percentile`],
    ["p99_ms", `99th${prefix} percentile`]
  ] as const;
  const values: AppGraphicsResult["graphics"]["percentiles_ms"] = {
    p50_ms: null,
    p90_ms: null,
    p95_ms: null,
    p99_ms: null
  };
  let present = false;

  for (const [key, label] of labels) {
    const line = findSummaryLine(summary, label);
    if (line === undefined) {
      continue;
    }
    present = true;
    const match = new RegExp(`^${escapeRegExp(label)}:\\s+([0-9][0-9,]*)ms\\s*$`).exec(line);
    if (match === null) {
      return { ok: false, failure: `dumpsys gfxinfo returned malformed ${label}` };
    }
    const value = parseGraphicsInteger(match[1]!);
    if (value === null) {
      return { ok: false, failure: `dumpsys gfxinfo returned unsafe ${label}` };
    }
    values[key] = value;
  }

  return { ok: true, value: present ? values : null };
}

function parseHistogram(summary: string, label: "HISTOGRAM" | "GPU HISTOGRAM"): ParseResult<AppGraphicsResult["graphics"]["histogram"] | null> {
  const line = findSummaryLine(summary, label);
  if (line === undefined) {
    return { ok: true, value: null };
  }
  const text = line.slice(`${label}:`.length).trim();
  if (text.length === 0) {
    return { ok: false, failure: `dumpsys gfxinfo returned empty ${label}` };
  }
  const tokens = text.split(/\s+/);
  const buckets = [];
  for (const token of tokens) {
    const match = /^([0-9][0-9,]*)ms=([0-9][0-9,]*)$/.exec(token);
    if (match === null) {
      return { ok: false, failure: `dumpsys gfxinfo returned malformed ${label}` };
    }
    const bucketMs = parseGraphicsInteger(match[1]!);
    const count = parseGraphicsInteger(match[2]!);
    if (bucketMs === null || count === null) {
      return { ok: false, failure: `dumpsys gfxinfo returned unsafe ${label}` };
    }
    if (buckets.length >= APP_GRAPHICS_MAX_HISTOGRAM_BUCKETS) {
      continue;
    }
    buckets.push({ bucket_ms: bucketMs, count });
  }
  return {
    ok: true,
    value: {
      buckets,
      bucket_count: buckets.length,
      truncated: tokens.length > APP_GRAPHICS_MAX_HISTOGRAM_BUCKETS
    }
  };
}

function parseGraphicsInteger(value: string): number | null {
  const normalized = value.replace(/,/g, "");
  if (!/^(0|[1-9]\d*)$/.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parsePercent(value: string): number | null {
  if (!/^(0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
}

function findSummaryLine(summary: string, label: string): string | undefined {
  return summary
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith(`${label}:`));
}

function firstNonEmptyLine(stdout: string): string | undefined {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
