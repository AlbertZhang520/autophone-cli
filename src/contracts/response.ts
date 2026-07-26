import { z } from "zod";
import { AutophoneErrorSchema } from "./errors.js";

export const SCHEMA_VERSION = "0.1";
export const RUNTIME_VERSION = "0.3.0";

export const DeviceInfoSchema = z.object({
  serial: z.string().min(1).optional()
});
export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;

export function ResponseEnvelopeSchema<Result extends z.ZodTypeAny>(resultSchema: Result) {
  return z
    .object({
      schema_version: z.literal(SCHEMA_VERSION),
      runtime_version: z.literal(RUNTIME_VERSION),
      request_id: z.string().min(1),
      ok: z.boolean(),
      command: z.string().min(1),
      device: DeviceInfoSchema.optional(),
      duration_ms: z.number().int().nonnegative(),
      result: resultSchema.nullable(),
      error: AutophoneErrorSchema.nullable(),
      warnings: z.array(z.string()),
      trace: z.record(z.string(), z.unknown())
    })
    .refine((value: Record<string, unknown>) => (value.ok ? value.result !== null && value.error === null : value.error !== null), {
      message: "successful responses require result and failures require error"
    });
}

export type ResponseEnvelope<Result> = {
  schema_version: typeof SCHEMA_VERSION;
  runtime_version: typeof RUNTIME_VERSION;
  request_id: string;
  ok: boolean;
  command: string;
  device?: DeviceInfo;
  duration_ms: number;
  result: Result | null;
  error: z.infer<typeof AutophoneErrorSchema> | null;
  warnings: string[];
  trace: Record<string, unknown>;
};

export function createSuccessResponse<Result>(input: {
  command: string;
  requestId: string;
  startedAt: number;
  result: Result;
  device?: DeviceInfo;
  warnings?: string[];
  trace?: Record<string, unknown>;
}): ResponseEnvelope<Result> {
  const response: ResponseEnvelope<Result> = {
    schema_version: SCHEMA_VERSION,
    runtime_version: RUNTIME_VERSION,
    request_id: input.requestId,
    ok: true,
    command: input.command,
    duration_ms: Date.now() - input.startedAt,
    result: input.result,
    error: null,
    warnings: input.warnings ?? [],
    trace: input.trace ?? {}
  };
  if (input.device !== undefined) {
    response.device = input.device;
  }
  return response;
}

export function createFailureResponse(input: {
  command: string;
  requestId: string;
  startedAt: number;
  error: z.infer<typeof AutophoneErrorSchema>;
  device?: DeviceInfo;
  warnings?: string[];
  trace?: Record<string, unknown>;
}): ResponseEnvelope<never> {
  const response: ResponseEnvelope<never> = {
    schema_version: SCHEMA_VERSION,
    runtime_version: RUNTIME_VERSION,
    request_id: input.requestId,
    ok: false,
    command: input.command,
    duration_ms: Date.now() - input.startedAt,
    result: null,
    error: input.error,
    warnings: input.warnings ?? [],
    trace: input.trace ?? {}
  };
  if (input.device !== undefined) {
    response.device = input.device;
  }
  return response;
}
