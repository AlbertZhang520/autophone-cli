import { z } from "zod";

export const Sha256Schema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

export const ProofRefSchema = z.object({
  bundle_dir: z.string().min(1),
  manifest_path: z.string().min(1),
  manifest_sha256: Sha256Schema,
  total_bytes: z.number().int().nonnegative(),
  artifact_count: z.number().int().nonnegative(),
  redacted: z.literal(true)
});
export type ProofRef = z.infer<typeof ProofRefSchema>;

export const ProofManifestSchema = z.object({
  proof_version: z.literal("0.3"),
  command: z.string().min(1),
  request_id: z.string().min(1),
  runtime_version: z.string().min(1),
  schema_version: z.string().min(1),
  ok: z.boolean(),
  duration_ms: z.number().int().nonnegative(),
  device_serial: z.string().min(1).nullable(),
  result_summary: z.record(z.string(), z.unknown()),
  error_summary: z.record(z.string(), z.unknown()).nullable(),
  warnings: z.array(z.string()),
  trace_summary: z.record(z.string(), z.unknown()),
  artifacts: z.array(
    z.object({
      name: z.string().min(1),
      path: z.string().min(1),
      bytes: z.number().int().nonnegative(),
      sha256: Sha256Schema,
      mime_type: z.string().min(1)
    })
  ),
  redacted: z.literal(true)
});
export type ProofManifest = z.infer<typeof ProofManifestSchema>;
