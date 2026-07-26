import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  ProofManifestSchema,
  type ProofRef,
  type ResponseEnvelope
} from "../contracts/index.js";

type ProofContext = {
  parentDir: string;
};

let activeProofContext: ProofContext | undefined;

export function setProofContext(context: ProofContext | undefined): void {
  activeProofContext = context;
}

export function readProofContext(argv: readonly string[]): ProofContext | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--proof-dir" && argv[index + 1] !== undefined) {
      return { parentDir: argv[index + 1]! };
    }
    if (value?.startsWith("--proof-dir=")) {
      return { parentDir: value.slice("--proof-dir=".length) };
    }
  }
  return undefined;
}

export function attachProof<Result>(envelope: ResponseEnvelope<Result>): ResponseEnvelope<Result> {
  if (activeProofContext === undefined) {
    return envelope;
  }
  try {
    const proof = writeProofManifest(activeProofContext, envelope);
    return {
      ...envelope,
      trace: {
        ...envelope.trace,
        proof
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown proof write failure";
    return {
      ...envelope,
      warnings: [
        ...envelope.warnings,
        `proof write failed after command completion; device state may already have changed: ${message}`
      ]
    };
  }
}

function writeProofManifest<Result>(context: ProofContext, envelope: ResponseEnvelope<Result>): ProofRef {
  if (context.parentDir.trim().length === 0) {
    throw new Error("proof directory must not be blank");
  }
  const bundleDir = resolve(context.parentDir, `proof-${safePathSegment(envelope.request_id)}`);
  mkdirSync(bundleDir, { recursive: true });

  const manifest = ProofManifestSchema.parse({
    proof_version: "0.3",
    command: envelope.command,
    request_id: envelope.request_id,
    runtime_version: envelope.runtime_version,
    schema_version: envelope.schema_version,
    ok: envelope.ok,
    duration_ms: envelope.duration_ms,
    device_serial: envelope.device?.serial ?? resultDeviceSerial(envelope.result),
    result_summary: summarizeResult(envelope.result),
    error_summary: envelope.error === null ? null : summarizeError(envelope.error),
    warnings: envelope.warnings,
    trace_summary: summarizeTrace(envelope.trace),
    // Attached evidence artifacts are separate from the manifest file itself.
    artifacts: [],
    redacted: true
  });
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const manifestPath = join(bundleDir, "manifest.json");
  writeFileSync(manifestPath, manifestBytes, { flag: "wx" });
  return {
    bundle_dir: bundleDir,
    manifest_path: manifestPath,
    manifest_sha256: sha256Buffer(manifestBytes),
    total_bytes: manifestBytes.byteLength,
    // The bundle currently materializes one file: manifest.json.
    artifact_count: 1,
    redacted: true
  };
}

function summarizeResult(result: unknown): Record<string, unknown> {
  if (result === null || result === undefined || typeof result !== "object") {
    return {};
  }
  const entries = Object.entries(result as Record<string, unknown>).filter(([key]) => !sensitiveResultKey(key));
  return Object.fromEntries(entries.slice(0, 40).map(([key, value]) => [key, summarizeValue(value)]));
}

function summarizeError(error: { code: string; message: string; retriable: boolean }): Record<string, unknown> {
  return { code: error.code, message: error.message, retriable: error.retriable };
}

function summarizeTrace(trace: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(trace)
      .filter(([key]) => key !== "proof")
      .slice(0, 40)
      .map(([key, value]) => [key, summarizeValue(value)])
  );
}

function summarizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 117)}...` : value;
  }
  if (Array.isArray(value)) {
    return { type: "array", count: value.length };
  }
  if (value !== null && typeof value === "object") {
    return { type: "object", keys: Object.keys(value as Record<string, unknown>).slice(0, 20) };
  }
  return value;
}

function sensitiveResultKey(key: string): boolean {
  return key === "text" || key === "png" || key === "raw" || key.endsWith("_path") || key.includes("url");
}

function resultDeviceSerial(result: unknown): string | null {
  if (result !== null && typeof result === "object" && "device_serial" in result) {
    const value = (result as { device_serial?: unknown }).device_serial;
    return typeof value === "string" && value.length > 0 ? value : null;
  }
  return null;
}

function safePathSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]/g, "_");
}

function sha256Buffer(buffer: Buffer): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}
