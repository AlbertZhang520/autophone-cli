export type SharedAdbDevice = {
  serial: string;
  state: string;
};

export type SharedAdbDeviceLong = SharedAdbDevice & {
  details: Record<string, string>;
};

export function parseAdbDeviceLongLine(line: string): SharedAdbDeviceLong | null {
  const [serial, ...rest] = line.split(/\s+/);
  if (serial === undefined || serial.length === 0 || rest.length === 0) {
    return null;
  }

  const firstDetailIndex = rest.findIndex(isAdbLongDetailToken);
  const stateTokens = firstDetailIndex === -1 ? rest : rest.slice(0, firstDetailIndex);
  const detailTokens = firstDetailIndex === -1 ? [] : rest.slice(firstDetailIndex);
  const state = stateTokens.join(" ").trim() || "unknown";
  const details: Record<string, string> = {};

  for (const token of detailTokens) {
    const separatorIndex = token.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }
    details[token.slice(0, separatorIndex)] = token.slice(separatorIndex + 1);
  }

  return { serial, state, details };
}

export function isAdbLongDetailToken(token: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*:/.test(token) && !/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(token);
}

export function readFirstMatch(output: string, pattern: RegExp): string | null {
  return output.match(pattern)?.[1] ?? null;
}

export function readBooleanField(output: string, fieldName: string): boolean | null {
  const value = readFirstMatch(output, new RegExp(`${escapeRegExp(fieldName)}=(true|false)\\b`, "i"));
  if (value === null) {
    return null;
  }
  return value.toLowerCase() === "true";
}

export function readAnyBooleanField(output: string, fieldNames: readonly string[]): boolean | null {
  for (const fieldName of fieldNames) {
    const value = readBooleanField(output, fieldName);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isInstalledPackageName(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*$/.test(value);
}
