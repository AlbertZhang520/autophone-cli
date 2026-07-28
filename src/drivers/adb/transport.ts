import { spawn } from "node:child_process";
import type { ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { AutophoneError, type ErrorCode } from "../../contracts/index.js";
import { adbTargetFailureError } from "./adb-target-failure.js";

export type AdbTransportOptions = {
  adbPath?: string | undefined;
  killGraceMs?: number;
};

export type AdbRunOptions = {
  timeoutMs: number;
  maxOutputBytes?: number;
  timeoutCode?: Extract<ErrorCode, "DUMP_TIMEOUT" | "ACTION_TIMEOUT" | "ADB_ERROR">;
  rejectOnNonZero?: boolean;
};

export type AdbRunResult = {
  stdout: string;
  stderr: string;
  durationMs: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
};

export type AdbRunBufferResult = {
  stdout: Buffer;
  stderr: string;
  durationMs: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
};

type AdbRunRawResult = {
  stdout: Buffer;
  stderr: Buffer;
  durationMs: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
};

export class AdbTransport {
  private readonly adbPath: string;
  private readonly killGraceMs: number;

  constructor(options: AdbTransportOptions = {}) {
    this.adbPath = options.adbPath ?? "adb";
    this.killGraceMs = options.killGraceMs ?? 500;
  }

  async run(args: readonly string[], options: AdbRunOptions): Promise<AdbRunResult> {
    const result = await this.runRaw(args, options);
    return {
      stdout: result.stdout.toString("utf8"),
      stderr: result.stderr.toString("utf8"),
      durationMs: result.durationMs,
      exitCode: result.exitCode,
      signal: result.signal
    };
  }

  async runBuffer(args: readonly string[], options: AdbRunOptions): Promise<AdbRunBufferResult> {
    const result = await this.runRaw(args, options);
    return {
      stdout: result.stdout,
      stderr: result.stderr.toString("utf8"),
      durationMs: result.durationMs,
      exitCode: result.exitCode,
      signal: result.signal
    };
  }

  private async runRaw(args: readonly string[], options: AdbRunOptions): Promise<AdbRunRawResult> {
    const startedAt = Date.now();
    const child = spawn(this.adbPath, [...args], {
      stdio: ["ignore", "pipe", "pipe"]
    });

    return runChild(child, {
      startedAt,
      timeoutMs: options.timeoutMs,
      killGraceMs: this.killGraceMs,
      maxOutputBytes: options.maxOutputBytes ?? 10_000_000,
      timeoutCode: options.timeoutCode ?? "ADB_ERROR",
      rejectOnNonZero: options.rejectOnNonZero ?? true,
      args
    });
  }
}

function runChild(
  child: ChildProcessByStdio<null, Readable, Readable>,
  options: {
    startedAt: number;
    timeoutMs: number;
    killGraceMs: number;
    maxOutputBytes: number;
    timeoutCode: Extract<ErrorCode, "DUMP_TIMEOUT" | "ACTION_TIMEOUT" | "ADB_ERROR">;
    rejectOnNonZero: boolean;
    args: readonly string[];
  }
): Promise<AdbRunRawResult> {
  return new Promise((resolve, reject) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let overflowError: AutophoneError | undefined;
    let settled = false;
    let killTimer: NodeJS.Timeout | undefined;

    const terminateChild = () => {
      child.kill("SIGTERM");
      killTimer = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill("SIGKILL");
        }
      }, options.killGraceMs);
    };

    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      terminateChild();
    }, options.timeoutMs);

    const cleanup = () => {
      clearTimeout(timeoutTimer);
      if (killTimer !== undefined) {
        clearTimeout(killTimer);
      }
    };

    const rejectOnce = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > options.maxOutputBytes) {
        if (overflowError === undefined) {
          overflowError = new AutophoneError({
            code: "ADB_ERROR",
            message: "adb stdout exceeded max output size",
            retriable: false,
            details: { args: options.args }
          });
          terminateChild();
        }
        return;
      }
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.byteLength;
      if (stderrBytes <= options.maxOutputBytes) {
        stderrChunks.push(chunk);
      }
    });

    child.on("error", (error) => {
      rejectOnce(
        new AutophoneError({
          code: "DRIVER_UNAVAILABLE",
          message: error.message,
          retriable: false,
          details: { args: options.args }
        })
      );
    });

    child.on("close", (code, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();

      const stdout = Buffer.concat(stdoutChunks);
      const stderr = Buffer.concat(stderrChunks);
      const stderrText = stderr.toString("utf8");
      const durationMs = Date.now() - options.startedAt;

      if (timedOut) {
        reject(
          new AutophoneError({
            code: options.timeoutCode,
            message: "adb command timed out",
            retriable: true,
            details: { args: options.args, timeout_ms: options.timeoutMs, signal }
          })
        );
        return;
      }

      if (overflowError !== undefined) {
        reject(
          new AutophoneError({
            code: overflowError.code,
            message: overflowError.message,
            retriable: overflowError.retriable,
            details: { ...overflowError.details, signal }
          })
        );
        return;
      }

      if (code !== 0 && options.rejectOnNonZero) {
        reject(mapAdbFailure(stderrText, code, options.args));
        return;
      }

      resolve({ stdout, stderr, durationMs, exitCode: code, signal });
    });
  });
}

function mapAdbFailure(stderr: string, code: number | null, args: readonly string[]): AutophoneError {
  const details = { stderr, args, exit_code: code };
  return (
    adbTargetFailureError(stderr, details) ??
    new AutophoneError({
      code: "ADB_ERROR",
      message: stderr.trim() || "adb command failed",
      retriable: true,
      details
    })
  );
}
