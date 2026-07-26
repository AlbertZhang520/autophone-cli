import type { AppPackageInfoRecord } from "../../contracts/index.js";

export type ParsedAppPackageInfoOutput =
  | {
      ok: true;
      installed: boolean;
      packageInfo: AppPackageInfoRecord | null;
    }
  | {
      ok: false;
      failure: string;
    };

export function buildAdbAppPackageInfoArgs(packageName: string): string[] {
  return ["shell", "dumpsys", "package", packageName];
}

export function parseAppPackageInfoOutput(
  stdout: string,
  stderr: string,
  exitCode: number | null,
  packageName: string
): ParsedAppPackageInfoOutput {
  if (stderr.trim().length > 0) {
    return { ok: false, failure: "dumpsys package wrote unexpected stderr" };
  }
  if (exitCode !== 0) {
    return { ok: false, failure: "dumpsys package exited nonzero" };
  }

  const normalized = normalizeLineEndings(stdout);
  const lines = nonEmptyLines(normalized);
  const firstLine = lines[0];
  if (firstLine === undefined) {
    return { ok: false, failure: "dumpsys package returned empty output" };
  }
  const absenceLine = `Unable to find package: ${packageName}`;
  const hasPackagesSection = /^Packages:\s*$/m.test(normalized);
  if (firstLine === absenceLine || (!hasPackagesSection && lines.includes(absenceLine))) {
    return { ok: true, installed: false, packageInfo: null };
  }
  if (lines.some((line) => line.startsWith("Unable to find package:") && line !== absenceLine)) {
    return { ok: false, failure: "dumpsys package returned absence for a different package" };
  }

  const packagesSection = extractPackagesSection(normalized);
  if (packagesSection === null) {
    return { ok: false, failure: "dumpsys package did not return a Packages section" };
  }

  const headerPattern = new RegExp(`^  Package \\[${escapeRegExp(packageName)}\\](?: \\([^)]+\\))?:$`, "gm");
  const headers = [...packagesSection.matchAll(headerPattern)];
  if (headers.length === 0) {
    return { ok: false, failure: "dumpsys package did not return an active package block" };
  }
  if (headers.length > 1) {
    return { ok: false, failure: "dumpsys package returned duplicate active package blocks" };
  }

  const header = headers[0]!;
  const block = extractPackageBlock(packagesSection, header.index);
  const info = parsePackageBlock(block, packageName);
  if (!info.ok) {
    return info;
  }
  return { ok: true, installed: true, packageInfo: info.packageInfo };
}

type PackageInfoParseResult =
  | {
      ok: true;
      packageInfo: AppPackageInfoRecord;
    }
  | {
      ok: false;
      failure: string;
    };

function parsePackageBlock(block: string, packageName: string): PackageInfoParseResult {
  const top = trimPackageBlockToStaticMetadata(block);
  const lines = top.split("\n").map((line) => line.trim());
  const fields = new Map<string, string>();

  for (const line of lines) {
    if (line.length === 0 || line.startsWith("Package [")) {
      continue;
    }
    collectLineFields(line, fields);
  }

  const appId = parseRequiredIntegerFromAny(fields, ["appId", "userId"], "appId");
  if (!appId.ok) {
    return appId;
  }
  const codePath = parseRequiredText(fields, "codePath");
  if (!codePath.ok) {
    return codePath;
  }
  const versionCode = parseRequiredInteger(fields, "versionCode");
  if (!versionCode.ok) {
    return versionCode;
  }

  const minSdk = parseOptionalInteger(fields, "minSdk");
  if (!minSdk.ok) {
    return minSdk;
  }
  const targetSdk = parseOptionalInteger(fields, "targetSdk");
  if (!targetSdk.ok) {
    return targetSdk;
  }
  const installerUid = parseOptionalInteger(fields, "installerPackageUid");
  if (!installerUid.ok) {
    return installerUid;
  }
  const packageSource = parseOptionalInteger(fields, "packageSource");
  if (!packageSource.ok) {
    return packageSource;
  }
  const installPermissionsFixed = parseOptionalBoolean(fields, "installPermissionsFixed");
  if (!installPermissionsFixed.ok) {
    return installPermissionsFixed;
  }
  const splits = parseBracketList(fields.get("splits"), "splits");
  if (!splits.ok) {
    return splits;
  }
  const flags = parseBracketList(fields.get("pkgFlags") ?? fields.get("flags"), fields.has("pkgFlags") ? "pkgFlags" : "flags");
  if (!flags.ok) {
    return flags;
  }
  const privateFlags = parseBracketList(
    fields.get("privatePkgFlags") ?? fields.get("privateFlags"),
    fields.has("privatePkgFlags") ? "privatePkgFlags" : "privateFlags"
  );
  if (!privateFlags.ok) {
    return privateFlags;
  }

  return {
    ok: true,
    packageInfo: {
      package_name: packageName,
      app_id: appId.value,
      code_path: codePath.value,
      resource_path: parseOptionalText(fields, "resourcePath"),
      native_library_dir: parseOptionalText(fields, "legacyNativeLibraryDir"),
      primary_cpu_abi: parseOptionalText(fields, "primaryCpuAbi"),
      secondary_cpu_abi: parseOptionalText(fields, "secondaryCpuAbi"),
      cpu_abi_override: parseOptionalText(fields, "cpuAbiOverride"),
      version: {
        code: versionCode.value,
        min_sdk: minSdk.value,
        target_sdk: targetSdk.value,
        name: parseOptionalText(fields, "versionName")
      },
      splits: splits.value,
      flags: flags.value,
      private_flags: privateFlags.value,
      timestamps: {
        time_stamp: parseOptionalText(fields, "timeStamp"),
        last_update_time: parseOptionalText(fields, "lastUpdateTime")
      },
      installer: {
        package_name: parseOptionalPackageName(fields, "installerPackageName"),
        uid: installerUid.value,
        initiating_package_name: parseOptionalPackageName(fields, "initiatingPackageName"),
        originating_package_name: parseOptionalPackageName(fields, "originatingPackageName")
      },
      package_source: packageSource.value,
      install_permissions_fixed: installPermissionsFixed.value,
      apex_module_name: parseOptionalText(fields, "apexModuleName")
    }
  };
}

type ParseValue<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      failure: string;
    };

function parseRequiredText(fields: Map<string, string>, key: string): ParseValue<string> {
  const value = parseOptionalText(fields, key);
  if (value === null) {
    return { ok: false, failure: `dumpsys package did not return ${key}` };
  }
  return { ok: true, value };
}

function parseOptionalText(fields: Map<string, string>, key: string): string | null {
  const value = fields.get(key);
  if (value === undefined || value === "null" || value.length === 0) {
    return null;
  }
  return value;
}

function parseRequiredInteger(fields: Map<string, string>, key: string): ParseValue<number> {
  const value = parseOptionalInteger(fields, key);
  if (!value.ok) {
    return value;
  }
  if (value.value === null) {
    return { ok: false, failure: `dumpsys package did not return ${key}` };
  }
  return { ok: true, value: value.value };
}

function parseRequiredIntegerFromAny(fields: Map<string, string>, keys: string[], displayKey: string): ParseValue<number> {
  for (const key of keys) {
    if (!fields.has(key)) {
      continue;
    }
    const value = parseOptionalInteger(fields, key);
    if (!value.ok) {
      return value;
    }
    if (value.value !== null) {
      return { ok: true, value: value.value };
    }
  }
  return { ok: false, failure: `dumpsys package did not return ${displayKey}` };
}

function parseOptionalInteger(fields: Map<string, string>, key: string): ParseValue<number | null> {
  const value = fields.get(key);
  if (value === undefined || value === "null") {
    return { ok: true, value: null };
  }
  if (!/^-?(0|[1-9]\d*)$/.test(value)) {
    return { ok: false, failure: `dumpsys package returned malformed ${key}` };
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return { ok: false, failure: `dumpsys package returned unsafe ${key}` };
  }
  return { ok: true, value: parsed };
}

function parseOptionalBoolean(fields: Map<string, string>, key: string): ParseValue<boolean | null> {
  const value = fields.get(key);
  if (value === undefined || value === "null") {
    return { ok: true, value: null };
  }
  if (value === "true") {
    return { ok: true, value: true };
  }
  if (value === "false") {
    return { ok: true, value: false };
  }
  return { ok: false, failure: `dumpsys package returned malformed ${key}` };
}

function parseOptionalPackageName(fields: Map<string, string>, key: string): string | null {
  const value = parseOptionalText(fields, key);
  if (value === null) {
    return null;
  }
  return /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*$/.test(value) ? value : null;
}

function parseBracketList(value: string | undefined, key: string): ParseValue<string[]> {
  if (value === undefined || value === "null") {
    return { ok: true, value: [] };
  }
  const match = /^\[(.*)]$/.exec(value.trim());
  if (match === null) {
    return { ok: false, failure: `dumpsys package returned malformed ${key}` };
  }
  const body = match[1]!.trim();
  if (body.length === 0) {
    return { ok: true, value: [] };
  }
  return { ok: true, value: body.split(/\s+/).filter((entry) => entry.length > 0) };
}

function collectLineFields(line: string, fields: Map<string, string>): void {
  const keys = [...line.matchAll(/(?:^|\s)([A-Za-z][A-Za-z0-9]*)=/g)];
  for (let index = 0; index < keys.length; index += 1) {
    const current = keys[index]!;
    const key = current[1]!;
    const valueStart = current.index! + current[0].length;
    const next = findNextKeyIndex(line, keys, index + 1);
    const value = line.slice(valueStart, next).trim();
    fields.set(key, value);
  }
}

function findNextKeyIndex(line: string, keys: RegExpMatchArray[], startIndex: number): number {
  for (let index = startIndex; index < keys.length; index += 1) {
    const candidate = keys[index]!;
    const prefixIndex = candidate.index!;
    if (!isInsideBrackets(line, prefixIndex)) {
      return prefixIndex;
    }
  }
  return line.length;
}

function isInsideBrackets(line: string, index: number): boolean {
  let depth = 0;
  for (let cursor = 0; cursor < index; cursor += 1) {
    const char = line[cursor];
    if (char === "[") {
      depth += 1;
    } else if (char === "]" && depth > 0) {
      depth -= 1;
    }
  }
  return depth > 0;
}

function extractPackagesSection(stdout: string): string | null {
  const start = /^Packages:\s*$/m.exec(stdout);
  if (start === null) {
    return null;
  }
  const section = stdout.slice(start.index + start[0].length);
  const boundaryIndex = section.search(
    /^(Hidden system packages|Queries|Dexopt state|Compiler stats|Package Changes|Frozen packages|Protected packages|Shared users|Messages|Key Set Manager|Domain verification status|Preferred Activities|Activity Resolver Table|Receiver Resolver Table|Service Resolver Table|Permissions):/m
  );
  return boundaryIndex === -1 ? section : section.slice(0, boundaryIndex);
}

function extractPackageBlock(section: string, headerIndex: number): string {
  const fromHeader = section.slice(headerIndex);
  const nextHeader = fromHeader.slice(1).search(/^  Package \[[^\]]+](?: \([^)]+\))?:$/m);
  return nextHeader === -1 ? fromHeader : fromHeader.slice(0, nextHeader + 1);
}

function trimPackageBlockToStaticMetadata(block: string): string {
  const boundary = block.search(/^[\t ]+(declared permissions|requested permissions|install permissions|User \d+:|PackageSignatures)/im);
  return boundary === -1 ? block : block.slice(0, boundary);
}

function nonEmptyLines(stdout: string): string[] {
  return stdout
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
