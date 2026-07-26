import type { AppLinksResult } from "../../contracts/index.js";

const KNOWN_APP_LINK_STATES = new Set([
  "none",
  "verified",
  "approved",
  "denied",
  "migrated",
  "restored",
  "legacy_failure",
  "system_configured",
  "pre_verified"
]);

export type ParsedAppLinksOutput =
  | {
      ok: true;
      packageFound: boolean;
      domains: AppLinksResult["domains"];
    }
  | {
      ok: false;
      failure: string;
    };

export function buildAdbAppLinksArgs(packageName: string): string[] {
  return ["shell", "cmd", "package", "get-app-links", packageName];
}

export function parseAppLinksOutput(
  stdout: string,
  stderr: string,
  exitCode: number | null,
  packageName: string
): ParsedAppLinksOutput {
  const normalizedStdout = normalizeLineEndings(stdout);
  const normalizedStderr = normalizeLineEndings(stderr);
  const trimmedStdout = normalizedStdout.trim();
  const trimmedStderr = normalizedStderr.trim();

  if (exitCode !== 0 && isPackageUnavailable(trimmedStdout, trimmedStderr, packageName)) {
    return { ok: true, packageFound: false, domains: [] };
  }
  if (trimmedStderr.length > 0) {
    return { ok: false, failure: "cmd package get-app-links wrote unexpected stderr" };
  }
  if (exitCode !== 0) {
    return { ok: false, failure: "cmd package get-app-links exited nonzero" };
  }
  if (trimmedStdout.length === 0) {
    return { ok: true, packageFound: true, domains: [] };
  }

  const lines = normalizedStdout.split("\n").map((line) => line.replace(/\s+$/u, ""));
  const block = extractRequestedPackageBlock(lines, packageName);
  if (!block.ok) {
    return block;
  }

  const domains = parseDomainVerificationBlock(block.lines);
  if (!domains.ok) {
    return domains;
  }
  return { ok: true, packageFound: true, domains: domains.domains };
}

type PackageBlockResult =
  | {
      ok: true;
      lines: string[];
    }
  | {
      ok: false;
      failure: string;
    };

function extractRequestedPackageBlock(lines: string[], packageName: string): PackageBlockResult {
  const packageHeaders: Array<{ packageName: string; index: number }> = [];
  for (const [index, line] of lines.entries()) {
    const match = /^  ([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*):$/.exec(line);
    if (match !== null) {
      packageHeaders.push({ packageName: match[1]!, index });
    }
  }

  if (packageHeaders.length === 0) {
    return { ok: false, failure: "cmd package get-app-links returned no package block" };
  }
  const requestedHeaders = packageHeaders.filter((header) => header.packageName === packageName);
  if (requestedHeaders.length === 0) {
    return { ok: false, failure: "cmd package get-app-links returned a package block for a different package" };
  }
  if (requestedHeaders.length > 1) {
    return { ok: false, failure: "cmd package get-app-links returned duplicate package blocks" };
  }
  if (packageHeaders.length > 1) {
    return { ok: false, failure: "cmd package get-app-links returned unexpected extra package blocks" };
  }

  const header = requestedHeaders[0]!;
  const nextHeader = packageHeaders.find((candidate) => candidate.index > header.index);
  const end = nextHeader?.index ?? lines.length;
  return { ok: true, lines: lines.slice(header.index + 1, end) };
}

type DomainsResult =
  | {
      ok: true;
      domains: AppLinksResult["domains"];
    }
  | {
      ok: false;
      failure: string;
    };

function parseDomainVerificationBlock(lines: string[]): DomainsResult {
  const headerIndex = lines.findIndex((line) => line.trim() === "Domain verification state:");
  if (headerIndex === -1) {
    return { ok: true, domains: [] };
  }

  const domains: AppLinksResult["domains"] = [];
  const seen = new Set<string>();
  for (const line of lines.slice(headerIndex + 1)) {
    if (line.trim().length === 0) {
      continue;
    }
    if (/^    \S.*:$/.test(line) || /^  \S.*:$/.test(line)) {
      break;
    }
    const match = /^      (.+):\s*([^\s]+)$/.exec(line);
    if (match === null) {
      return { ok: false, failure: "cmd package get-app-links returned malformed domain verification entry" };
    }

    const domain = match[1]!.trim();
    if (!isSafeDomain(domain)) {
      return { ok: false, failure: "cmd package get-app-links returned malformed domain name" };
    }
    if (seen.has(domain)) {
      return { ok: false, failure: "cmd package get-app-links returned duplicate domains" };
    }
    seen.add(domain);

    const state = parseAppLinkState(match[2]!);
    if (!state.ok) {
      return state;
    }
    domains.push({ domain, state: state.state });
  }

  return { ok: true, domains };
}

type StateResult =
  | {
      ok: true;
      state: AppLinksResult["domains"][number]["state"];
    }
  | {
      ok: false;
      failure: string;
    };

function parseAppLinkState(raw: string): StateResult {
  if (!/^[^\s\u0000-\u001f\u007f]{1,64}$/.test(raw)) {
    return { ok: false, failure: "cmd package get-app-links returned malformed domain state" };
  }
  if (KNOWN_APP_LINK_STATES.has(raw)) {
    return { ok: true, state: { raw, kind: "known", code: null } };
  }
  if (/^(?:0|[1-9]\d*)$/.test(raw)) {
    const code = Number(raw);
    if (!Number.isSafeInteger(code) || code < 1024) {
      return { ok: false, failure: "cmd package get-app-links returned malformed custom domain state" };
    }
    return { ok: true, state: { raw, kind: "custom_error", code } };
  }
  return { ok: true, state: { raw, kind: "unknown", code: null } };
}

function isPackageUnavailable(stdout: string, stderr: string, packageName: string): boolean {
  const expected = `Error: package ${packageName} unavailable`;
  return stdout.length === 0 && stderr === expected;
}

function isSafeDomain(domain: string): boolean {
  return domain.length <= 255 && /^(?:\*\.)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*$/.test(domain);
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
