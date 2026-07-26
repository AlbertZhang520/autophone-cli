import { createSuccessResponse as makeSuccessResponse, type DeviceInfo } from "../contracts/index.js";
import { writeJson, type CliIo } from "./json-writer.js";

type SuccessResponseInput<Result> = {
  command: string;
  requestId: string;
  startedAt: number;
  result: Result;
  device?: DeviceInfo;
  warnings?: string[];
  trace?: Record<string, unknown>;
};

export function writeSuccessJson<Result>(io: CliIo, input: SuccessResponseInput<Result>): void {
  writeJson(io, makeSuccessResponse(input));
}
