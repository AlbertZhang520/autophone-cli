import type { AppResolveUrlResult } from "../../contracts/index.js";
import { quoteForDeviceShell } from "./device-shell.js";

const SYSTEM_RESOLVER_ACTIVITIES = new Set([
  "com.android.internal.app.ResolverActivity",
  "com.android.internal.app.ChooserActivity"
]);

export type ParsedAppResolveUrlOutput =
  | {
      ok: true;
      resolution: AppResolveUrlResult["resolution"];
      metadata: AppResolveUrlResult["metadata"];
    }
  | {
      ok: false;
      failure: string;
    };

export function buildAdbAppResolveUrlArgs(url: string): string[] {
  return [
    "shell",
    "cmd",
    "package",
    "resolve-activity",
    "--brief",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    quoteForDeviceShell(url)
  ];
}

export function parseAppResolveUrlOutput(
  stdout: string,
  stderr: string,
  exitCode: number | null
): ParsedAppResolveUrlOutput {
  if (stderr.trim().length > 0) {
    return { ok: false, failure: "cmd package resolve-activity wrote unexpected stderr" };
  }
  if (exitCode !== 0) {
    return { ok: false, failure: "cmd package resolve-activity exited nonzero" };
  }

  const lines = normalizeLineEndings(stdout)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 1 && lines[0] === "No activity found") {
    return {
      ok: true,
      resolution: {
        type: "none",
        component: null,
        package: null,
        activity: null,
        is_system_resolver: false
      },
      metadata: null
    };
  }
  if (lines.length === 0) {
    return { ok: false, failure: "cmd package resolve-activity returned empty output" };
  }

  let metadata: AppResolveUrlResult["metadata"] = null;
  const components: string[] = [];
  for (const line of lines) {
    if (isComponentLike(line)) {
      components.push(line);
      continue;
    }
    if (line.includes("=")) {
      if (metadata !== null) {
        return { ok: false, failure: "cmd package resolve-activity returned duplicate metadata lines" };
      }
      const parsedMetadata = parseResolveMetadata(line);
      if (!parsedMetadata.ok) {
        return parsedMetadata;
      }
      metadata = parsedMetadata.metadata;
      continue;
    }
    return { ok: false, failure: "cmd package resolve-activity returned unrecognized output" };
  }

  if (components.length !== 1) {
    return { ok: false, failure: "cmd package resolve-activity returned an unexpected component count" };
  }

  const parsedComponent = parseResolveComponent(components[0]!);
  if (!parsedComponent.ok) {
    return parsedComponent;
  }

  return {
    ok: true,
    resolution: parsedComponent.resolution,
    metadata
  };
}

type ParsedResolveMetadata =
  | {
      ok: true;
      metadata: NonNullable<AppResolveUrlResult["metadata"]>;
    }
  | {
      ok: false;
      failure: string;
    };

function parseResolveMetadata(line: string): ParsedResolveMetadata {
  const values = new Map<string, string>();
  for (const token of line.split(/\s+/)) {
    const [key, value, extra] = token.split("=");
    if (key === undefined || value === undefined || extra !== undefined || values.has(key)) {
      return { ok: false, failure: "cmd package resolve-activity returned malformed metadata" };
    }
    values.set(key, value);
  }

  const priority = parseDecimalInt(values.get("priority"));
  const preferredOrder = parseDecimalInt(values.get("preferredOrder"));
  const match = parseHexInt(values.get("match"));
  const specificIndex = parseDecimalInt(values.get("specificIndex"));
  const isDefault = parseBoolean(values.get("isDefault"));

  if (priority === null || preferredOrder === null || match === null || specificIndex === null || isDefault === null) {
    return { ok: false, failure: "cmd package resolve-activity returned malformed metadata" };
  }
  if (values.size !== 5) {
    return { ok: false, failure: "cmd package resolve-activity returned unsupported metadata fields" };
  }

  return {
    ok: true,
    metadata: {
      priority,
      preferred_order: preferredOrder,
      match,
      specific_index: specificIndex,
      is_default: isDefault
    }
  };
}

type ParsedResolveComponent =
  | {
      ok: true;
      resolution: Exclude<AppResolveUrlResult["resolution"], { type: "none" }>;
    }
  | {
      ok: false;
      failure: string;
    };

function parseResolveComponent(line: string): ParsedResolveComponent {
  const match = /^([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*)\/(\.[A-Za-z_$][A-Za-z0-9_.$]*|[A-Za-z_$][A-Za-z0-9_.$]*)$/.exec(line);
  if (match === null) {
    return { ok: false, failure: "cmd package resolve-activity returned malformed component" };
  }

  const packageName = match[1]!;
  const activity = normalizeActivityName(packageName, match[2]!);
  if (packageName === "android" && SYSTEM_RESOLVER_ACTIVITIES.has(activity)) {
    return {
      ok: true,
      resolution: {
        type: "resolver",
        component: line,
        package: packageName,
        activity,
        is_system_resolver: true
      }
    };
  }

  return {
    ok: true,
    resolution: {
      type: "activity",
      component: line,
      package: packageName,
      activity,
      is_system_resolver: false
    }
  };
}

function isComponentLike(line: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*\/\S+$/.test(line);
}

function normalizeActivityName(packageName: string, activity: string): string {
  if (activity.startsWith(".")) {
    return `${packageName}${activity}`;
  }
  return activity.includes(".") ? activity : `${packageName}.${activity}`;
}

function parseDecimalInt(value: string | undefined): number | null {
  if (value === undefined || !/^-?(?:0|[1-9]\d*)$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseHexInt(value: string | undefined): { raw: string; value: number } | null {
  if (value === undefined || !/^0x[0-9a-fA-F]+$/.test(value)) {
    return null;
  }
  const parsed = Number.parseInt(value.slice(2), 16);
  return Number.isSafeInteger(parsed) ? { raw: value, value: parsed } : null;
}

function parseBoolean(value: string | undefined): boolean | null {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
