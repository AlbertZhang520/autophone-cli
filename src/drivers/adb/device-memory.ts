import type { AppMemoryResult } from "../../contracts/index.js";

export type ParsedAppMemoryOutput =
  | {
      ok: true;
      running: boolean;
      processes: AppMemoryResult["processes"];
      memory: AppMemoryResult["memory"];
    }
  | {
      ok: false;
      failure: string;
    };

export function buildAdbAppMemoryArgs(packageName: string): string[] {
  return ["shell", "dumpsys", "meminfo", packageName];
}

export function parseAppMemoryOutput(
  stdout: string,
  stderr: string,
  exitCode: number | null,
  packageName: string
): ParsedAppMemoryOutput {
  if (stderr.trim().length > 0) {
    return { ok: false, failure: "dumpsys meminfo wrote unexpected stderr" };
  }
  if (exitCode !== 0) {
    return { ok: false, failure: "dumpsys meminfo exited nonzero" };
  }

  const firstLine = firstNonEmptyLine(stdout);
  if (firstLine === undefined) {
    return { ok: false, failure: "dumpsys meminfo returned empty output" };
  }
  if (firstLine === `No process found for: ${packageName}`) {
    return { ok: true, running: false, processes: [], memory: emptyAppMemorySnapshot() };
  }
  if (firstLine.startsWith("No process found for:")) {
    return { ok: false, failure: "dumpsys meminfo returned a process-absence result for a different package" };
  }

  const headers = [...stdout.matchAll(/^\*\* MEMINFO in pid ([1-9]\d*) \[(.+)] \*\*$/gm)];
  if (headers.length === 0) {
    return { ok: false, failure: "dumpsys meminfo did not return a MEMINFO process header" };
  }
  if (headers.length > 1) {
    return { ok: false, failure: "dumpsys meminfo returned multiple process sections" };
  }

  const header = headers[0]!;
  const pidText = header[1]!;
  const processName = header[2]!;
  if (processName !== packageName) {
    return { ok: false, failure: "dumpsys meminfo process name did not match requested package" };
  }
  const pid = parseMemoryInteger(pidText);
  if (pid === null || pid <= 0) {
    return { ok: false, failure: "dumpsys meminfo returned malformed process id" };
  }
  const appSummary = extractAppSummarySection(stdout);
  if (appSummary === null) {
    return { ok: false, failure: "dumpsys meminfo did not return an App Summary section" };
  }

  const totals = parseTotals(appSummary);
  if (totals === null) {
    return { ok: false, failure: "dumpsys meminfo did not return parseable total memory fields" };
  }

  return {
    ok: true,
    running: true,
    processes: [{ pid, process_name: processName }],
    memory: {
      units: "kb",
      totals,
      app_summary: {
        java_heap: parseAppSummaryMetric(appSummary, "Java Heap"),
        native_heap: parseAppSummaryMetric(appSummary, "Native Heap"),
        code: parseAppSummaryMetric(appSummary, "Code"),
        stack: parseAppSummaryMetric(appSummary, "Stack"),
        graphics: parseAppSummaryMetric(appSummary, "Graphics"),
        private_other: parseAppSummaryMetric(appSummary, "Private Other"),
        system: parseAppSummaryMetric(appSummary, "System"),
        unknown: parseAppSummaryMetric(appSummary, "Unknown")
      }
    }
  };
}

export function emptyAppMemorySnapshot(): AppMemoryResult["memory"] {
  const emptyMetric = { pss_kb: null, rss_kb: null };
  return {
    units: "kb",
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

function parseTotals(stdout: string): AppMemoryResult["memory"]["totals"] | null {
  const match = stdout.match(
    /^\s*TOTAL PSS:\s+([0-9][0-9,]*)\s+TOTAL RSS:\s+([0-9][0-9,]*)\s+TOTAL SWAP PSS:\s+([0-9][0-9,]*)\s*$/m
  );
  if (match === null) {
    return null;
  }
  const totalPss = parseMemoryInteger(match[1]!);
  const totalRss = parseMemoryInteger(match[2]!);
  const totalSwapPss = parseMemoryInteger(match[3]!);
  if (totalPss === null || totalRss === null || totalSwapPss === null) {
    return null;
  }
  return {
    total_pss_kb: totalPss,
    total_rss_kb: totalRss,
    total_swap_pss_kb: totalSwapPss
  };
}

function extractAppSummarySection(stdout: string): string | null {
  const match = /^ App Summary\s*$/m.exec(stdout);
  if (match === null) {
    return null;
  }
  const section = stdout.slice(match.index);
  const objectsIndex = section.search(/^\s*Objects\s*$/m);
  return objectsIndex === -1 ? section : section.slice(0, objectsIndex);
}

function parseAppSummaryMetric(stdout: string, label: string): AppMemoryResult["memory"]["app_summary"]["java_heap"] {
  const escapedLabel = escapeRegExp(label);
  const match = stdout.match(new RegExp(`^\\s*${escapedLabel}:\\s+([0-9][0-9,]*)(?:\\s+([0-9][0-9,]*))?\\s*$`, "m"));
  if (match === null) {
    return { pss_kb: null, rss_kb: null };
  }
  const first = parseMemoryInteger(match[1]!);
  const second = match[2] === undefined ? null : parseMemoryInteger(match[2]);
  if (first === null || (match[2] !== undefined && second === null)) {
    return { pss_kb: null, rss_kb: null };
  }
  if (label === "Unknown") {
    return { pss_kb: match[2] === undefined ? null : first, rss_kb: match[2] === undefined ? first : second };
  }
  return { pss_kb: first, rss_kb: second };
}

function parseMemoryInteger(value: string): number | null {
  const normalized = value.replace(/,/g, "");
  if (!/^(0|[1-9]\d*)$/.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function firstNonEmptyLine(stdout: string): string | undefined {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
