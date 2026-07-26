import { toAutophoneError, type AutophoneErrorBody, type ResponseEnvelope } from "../contracts/index.js";
import { attachProof } from "./proof-writer.js";

export type CliIo = {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
};

export function writeJson<Result>(io: CliIo, envelope: ResponseEnvelope<Result>): void {
  io.stdout.write(`${JSON.stringify(attachProof(envelope))}\n`);
}

export function normalizeError(error: unknown): AutophoneErrorBody {
  return toAutophoneError(error).toBody();
}
