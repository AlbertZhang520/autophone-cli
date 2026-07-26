import { AutophoneError, type FileHashAlgorithm } from "../../contracts/index.js";
import { quoteForDeviceShell } from "./device-shell.js";

export type ParsedAdbFileHash =
  | {
      digest: string;
      failure?: undefined;
    }
  | {
      failure: string;
      digest?: undefined;
    };

export function buildAdbFileHashArgs(remotePath: string, algorithm: FileHashAlgorithm): string[] {
  return ["shell", fileHashBinary(algorithm), "--", quoteForDeviceShell(remotePath)];
}

export function parseAdbFileHashOutput(
  stdout: string,
  stderr: string,
  exitCode: number | null,
  algorithm: FileHashAlgorithm
): ParsedAdbFileHash {
  if (exitCode !== 0) {
    return { failure: firstNonEmptyLine(`${stdout}\n${stderr}`) ?? `${fileHashBinary(algorithm)} command failed` };
  }
  if (stderr.trim().length > 0) {
    return { failure: firstNonEmptyLine(stderr) ?? `${fileHashBinary(algorithm)} command wrote stderr` };
  }

  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length !== 1) {
    return { failure: `${fileHashBinary(algorithm)} command returned unexpected output` };
  }

  const digest = parseDigestToken(lines[0]!, algorithm);
  return digest === null ? { failure: `${fileHashBinary(algorithm)} command returned malformed digest` } : { digest };
}

export function redactFileHashArgs(args: readonly string[], remotePath: string): string[] {
  const quoted = quoteForDeviceShell(remotePath);
  return args.map((arg) => (arg === remotePath || arg === quoted ? "<redacted-path>" : arg));
}

export function redactFileHashText(value: string, remotePath: string): string {
  const quoted = quoteForDeviceShell(remotePath);
  return value.replaceAll(quoted, "<redacted-path>").replaceAll(remotePath, "<redacted-path>");
}

export function redactFileHashError(error: AutophoneError, remotePath: string): AutophoneError {
  return new AutophoneError({
    code: error.code,
    message: redactFileHashText(error.message, remotePath),
    retriable: error.retriable,
    details: redactFileHashValue(error.details, remotePath) as Record<string, unknown> | undefined
  });
}

export function fileHashFailure(input: {
  message: string;
  remotePath: string;
  details: Record<string, unknown>;
}): AutophoneError {
  return new AutophoneError({
    code: "FILE_HASH_FAILED",
    message: redactFileHashText(input.message, input.remotePath),
    retriable: false,
    details: redactFileHashValue(input.details, input.remotePath) as Record<string, unknown>
  });
}

export function fileHashMethod(algorithm: FileHashAlgorithm): "device_sha256sum" | "device_md5sum" {
  return algorithm === "sha256" ? "device_sha256sum" : "device_md5sum";
}

function fileHashBinary(algorithm: FileHashAlgorithm): "sha256sum" | "md5sum" {
  return algorithm === "sha256" ? "sha256sum" : "md5sum";
}

function parseDigestToken(line: string, algorithm: FileHashAlgorithm): string | null {
  const pattern = algorithm === "sha256" ? /^([a-f0-9]{64})(?:[\t ]+.*)?$/ : /^([a-f0-9]{32})(?:[\t ]+.*)?$/;
  const match = pattern.exec(line);
  return match === null ? null : `${algorithm}:${match[1]}`;
}

function firstNonEmptyLine(value: string): string | undefined {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function redactFileHashValue(value: unknown, remotePath: string): unknown {
  if (typeof value === "string") {
    return redactFileHashText(value, remotePath);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactFileHashValue(item, remotePath));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactFileHashValue(entry, remotePath)]));
  }
  return value;
}
