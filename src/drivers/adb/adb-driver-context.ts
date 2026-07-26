import type { ErrorCode } from "../../contracts/index.js";
import type { DriverFileTransferRequest, DriverFileTransferResult } from "../../core/index.js";
import type { AdbFileTransferKind } from "./file-transfer.js";
import type { AdbRunResult, AdbTransport } from "./transport.js";

type TimeoutCode = Extract<ErrorCode, "DUMP_TIMEOUT" | "ACTION_TIMEOUT" | "ADB_ERROR">;
type SourceResult = { stdout: string; stderr: string; exitCode: number | null };

export type AdbDriverExecutionContext = {
  transport: AdbTransport;
  screenshotMaxBytes: number;
  resolveSerial(deviceSerial: string | undefined, timeoutMs: number): Promise<string>;
  runOnDevice(
    serial: string,
    args: readonly string[],
    timeoutMs: number,
    timeoutCode?: TimeoutCode,
    rejectOnNonZero?: boolean
  ): Promise<AdbRunResult>;
  runFileTransfer(
    kind: AdbFileTransferKind,
    request: DriverFileTransferRequest,
    code: "FILE_PUSH_FAILED" | "FILE_PULL_FAILED"
  ): Promise<DriverFileTransferResult>;
  runOptionalInfoCommand(serial: string, args: readonly string[], timeoutMs: number): Promise<string>;
  assertDeviceScreenSourceSucceeded(...args: any[]): void;
  assertDeviceNetworkSourceSucceeded(...args: any[]): void;
  assertDeviceImeSourceSucceeded(...args: any[]): void;
  assertDeviceBrightnessSourceSucceeded(...args: any[]): void;
  assertDeviceAnimationsSourceSucceeded(...args: any[]): void;
  assertDeviceAnimationsSetSourceSucceeded(...args: any[]): void;
  assertDeviceAccessibilitySourceSucceeded(...args: any[]): void;
  assertOrientationSourceSucceeded(...args: any[]): void;
};

export type { SourceResult };
