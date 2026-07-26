import { randomUUID } from "node:crypto";
import { access, link, mkdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { AutophoneError } from "../contracts/index.js";

export async function writeBinaryFileAtomic(
  outputPath: string,
  data: Buffer,
  options: { overwrite: boolean }
): Promise<{ overwritten: boolean }> {
  const outputDir = dirname(outputPath);
  const outputBase = basename(outputPath);
  const tempPath = join(outputDir, `.${outputBase}.${randomUUID()}.tmp`);
  let shouldCleanupTemp = false;

  try {
    await mkdir(outputDir, { recursive: true });
    await writeFile(tempPath, data, { flag: "wx" });
    shouldCleanupTemp = true;

    if (options.overwrite) {
      try {
        await link(tempPath, outputPath);
        await unlink(tempPath);
        shouldCleanupTemp = false;
        return { overwritten: false };
      } catch (error) {
        if (nodeErrorCode(error) !== "EEXIST") {
          throw error;
        }
        await rename(tempPath, outputPath);
        shouldCleanupTemp = false;
        return { overwritten: true };
      }
    }

    try {
      await link(tempPath, outputPath);
    } catch (error) {
      if (nodeErrorCode(error) === "EEXIST") {
        throw new AutophoneError({
          code: "OUTPUT_EXISTS",
          message: "output file already exists",
          retriable: false,
          details: { output_path: outputPath }
        });
      }
      throw error;
    }

    await unlink(tempPath);
    shouldCleanupTemp = false;
    return { overwritten: false };
  } catch (error) {
    if (error instanceof AutophoneError) {
      throw error;
    }
    throw new AutophoneError({
      code: "OUTPUT_WRITE_FAILED",
      message: error instanceof Error ? error.message : "failed to write output file",
      retriable: false,
      details: {
        output_path: outputPath,
        cause_code: nodeErrorCode(error)
      }
    });
  } finally {
    if (shouldCleanupTemp) {
      await unlink(tempPath).catch(() => undefined);
    }
  }
}

export type AtomicOutputTarget = {
  outputPath: string;
  tempPath: string;
  overwrite: boolean;
};

export async function createAtomicOutputTarget(outputPath: string, options: { overwrite: boolean }): Promise<AtomicOutputTarget> {
  const outputDir = dirname(outputPath);
  const outputBase = basename(outputPath);
  await mkdir(outputDir, { recursive: true });

  if (!options.overwrite) {
    try {
      await access(outputPath);
      throw new AutophoneError({
        code: "OUTPUT_EXISTS",
        message: "output file already exists",
        retriable: false,
        details: { output_path: outputPath }
      });
    } catch (error) {
      if (error instanceof AutophoneError) {
        throw error;
      }
      if (nodeErrorCode(error) !== "ENOENT") {
        throwOutputError(error, outputPath);
      }
    }
  }

  return {
    outputPath,
    tempPath: join(outputDir, `.${outputBase}.${randomUUID()}.tmp`),
    overwrite: options.overwrite
  };
}

export async function finalizeAtomicOutputFile(target: AtomicOutputTarget): Promise<{ overwritten: boolean }> {
  try {
    if (target.overwrite) {
      try {
        await link(target.tempPath, target.outputPath);
        await unlink(target.tempPath);
        return { overwritten: false };
      } catch (error) {
        if (nodeErrorCode(error) !== "EEXIST") {
          throw error;
        }
        await rename(target.tempPath, target.outputPath);
        return { overwritten: true };
      }
    }

    try {
      await link(target.tempPath, target.outputPath);
    } catch (error) {
      if (nodeErrorCode(error) === "EEXIST") {
        throw new AutophoneError({
          code: "OUTPUT_EXISTS",
          message: "output file already exists",
          retriable: false,
          details: { output_path: target.outputPath }
        });
      }
      throw error;
    }
    await unlink(target.tempPath);
    return { overwritten: false };
  } catch (error) {
    if (error instanceof AutophoneError) {
      throw error;
    }
    throwOutputError(error, target.outputPath);
  }
}

export async function cleanupAtomicOutputTarget(target: AtomicOutputTarget): Promise<void> {
  await rm(target.tempPath, { recursive: true, force: true }).catch(() => undefined);
}

function throwOutputError(error: unknown, outputPath: string): never {
  throw new AutophoneError({
    code: "OUTPUT_WRITE_FAILED",
    message: "failed to write output file",
    retriable: false,
    details: {
      output_path: outputPath,
      cause_code: nodeErrorCode(error)
    }
  });
}

function nodeErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}
