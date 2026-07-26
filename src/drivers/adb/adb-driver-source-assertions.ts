import { AutophoneError } from "../../contracts/index.js";
import { throwIfAdbTargetFailure } from "./adb-driver-parsers-app.js";

export function assertOrientationSourceSucceeded(
  method: "wm_size" | "dumpsys_window" | "settings_get_accelerometer_rotation",
  result: { stdout: string; stderr: string; exitCode: number | null },
  args: readonly string[]
): void {
  const output = `${result.stdout}\n${result.stderr}`;
  throwIfAdbTargetFailure(output, result.exitCode, args);
  if (result.exitCode !== 0) {
    throw new AutophoneError({
      code: "DEVICE_ORIENTATION_FAILED",
      message: `${method} command failed`,
      retriable: false,
      details: {
        method,
        exit_code: result.exitCode,
        stderr: result.stderr
      }
    });
  }
}
