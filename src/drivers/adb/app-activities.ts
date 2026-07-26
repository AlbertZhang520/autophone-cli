import type { AppActivitiesIntent, AppActivityRecord } from "../../contracts/index.js";

export type ParsedAppActivitiesOutput =
  | {
      ok: true;
      activities: AppActivityRecord[];
    }
  | {
      ok: false;
      failure: string;
    };

export function buildAdbAppActivitiesArgs(packageName: string, intent: AppActivitiesIntent): string[] {
  return [
    "shell",
    "cmd",
    "package",
    "query-activities",
    "--brief",
    "-a",
    "android.intent.action.MAIN",
    "-c",
    "android.intent.category.LAUNCHER",
    packageName
  ];
}

export function parseAppActivitiesOutput(
  stdout: string,
  stderr: string,
  exitCode: number | null,
  packageName: string
): ParsedAppActivitiesOutput {
  if (stderr.trim().length > 0) {
    return { ok: false, failure: "cmd package query-activities wrote unexpected stderr" };
  }
  if (exitCode !== 0) {
    return { ok: false, failure: "cmd package query-activities exited nonzero" };
  }

  const lines = normalizeLineEndings(stdout)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 1 && lines[0] === "No activities found") {
    return { ok: true, activities: [] };
  }
  if (lines.length === 0) {
    return { ok: false, failure: "cmd package query-activities returned empty output" };
  }

  const countMatch = /^(0|[1-9]\d*) activities found:$/.exec(lines[0]!);
  if (countMatch === null) {
    return { ok: false, failure: "cmd package query-activities returned malformed header" };
  }
  const declaredCount = Number(countMatch[1]);
  if (!Number.isSafeInteger(declaredCount)) {
    return { ok: false, failure: "cmd package query-activities returned unsafe activity count" };
  }
  if (declaredCount === 0) {
    return lines.length === 1
      ? { ok: true, activities: [] }
      : { ok: false, failure: "cmd package query-activities returned trailing output after zero activities" };
  }

  const headerIndexes: number[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    if (/^Activity #(0|[1-9]\d*):$/.test(lines[index]!)) {
      headerIndexes.push(index);
    }
  }
  if (headerIndexes.length !== declaredCount) {
    return { ok: false, failure: "cmd package query-activities activity block count did not match header" };
  }

  const activities: AppActivityRecord[] = [];
  for (let blockIndex = 0; blockIndex < headerIndexes.length; blockIndex += 1) {
    const start = headerIndexes[blockIndex]! + 1;
    const end = headerIndexes[blockIndex + 1] ?? lines.length;
    const componentLines = lines.slice(start, end).filter(isComponentLike);
    if (componentLines.length !== 1) {
      return { ok: false, failure: "cmd package query-activities returned malformed activity block" };
    }
    const component = parseComponent(componentLines[0]!, packageName);
    if (!component.ok) {
      return component;
    }
    activities.push(component.activity);
  }

  return { ok: true, activities };
}

type ParsedComponent =
  | {
      ok: true;
      activity: AppActivityRecord;
    }
  | {
      ok: false;
      failure: string;
    };

function isComponentLike(line: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*\/\S+$/.test(line);
}

function parseComponent(line: string, packageName: string): ParsedComponent {
  const match = /^([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*)\/(\.[A-Za-z_$][A-Za-z0-9_.$]*|[A-Za-z_$][A-Za-z0-9_.$]*)$/.exec(line);
  if (match === null) {
    return { ok: false, failure: "cmd package query-activities returned malformed component" };
  }
  const componentPackage = match[1]!;
  const rawActivity = match[2]!;
  if (componentPackage !== packageName) {
    return { ok: false, failure: "cmd package query-activities returned component for a different package" };
  }
  const activity = normalizeActivityName(componentPackage, rawActivity);
  return {
    ok: true,
    activity: {
      component: line,
      package_name: componentPackage,
      activity,
      relative_activity: rawActivity.startsWith(".") ? rawActivity : null
    }
  };
}

function normalizeActivityName(packageName: string, activity: string): string {
  if (activity.startsWith(".")) {
    return `${packageName}${activity}`;
  }
  return activity.includes(".") ? activity : `${packageName}.${activity}`;
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
