import { AutophoneError, type ErrorCode } from "../../contracts/index.js";

/**
 * Single source of truth for deciding whether an adb failure is about reaching the target
 * device rather than about the command itself.
 *
 * EVAL-009 was caused by two independent copies of this decision: the transport rejected
 * non-zero exits with its own narrower matcher, so the more complete matcher downstream was
 * unreachable on the default path. Both copies had holes the other did not. Keep this module
 * free of transport and driver imports so every path can reach it without a cycle.
 *
 * The recognised conditions are the transport-selection diagnostics carried by the adb binary
 * itself (`strings $(which adb)`, ADB 36.0.0):
 *
 *   device offline / device offline (no transport) / device offline (transport offline)
 *   device unauthorized. / device still authorizing / device still connecting
 *   no emulators found / no devices/emulators found / device '<serial>' not found
 */

export type AdbTargetFailureCode = Extract<ErrorCode, "DEVICE_UNAUTHORIZED" | "DEVICE_OFFLINE" | "NO_DEVICE">;

type TargetFailure = {
  readonly code: AdbTargetFailureCode;
  readonly message: string;
  readonly retriable: boolean;
};

/**
 * Keyed by condition rather than by code, because retriability belongs to the situation and
 * not to the code. A device that is still authorizing reports the same code as one that has
 * been refused, but only the refusal needs a person to act before a retry can succeed.
 */
const UNAUTHORIZED: TargetFailure = {
  code: "DEVICE_UNAUTHORIZED",
  message: "adb device is unauthorized",
  retriable: false
};

const STILL_AUTHORIZING: TargetFailure = {
  code: "DEVICE_UNAUTHORIZED",
  message: "adb device is still authorizing",
  retriable: true
};

const OFFLINE: TargetFailure = { code: "DEVICE_OFFLINE", message: "adb device is offline", retriable: true };

const STILL_CONNECTING: TargetFailure = {
  code: "DEVICE_OFFLINE",
  message: "adb device is still connecting",
  retriable: true
};

const MISSING: TargetFailure = { code: "NO_DEVICE", message: "adb found no usable device", retriable: true };

/**
 * adb's transport-selection diagnostics end with the condition they are reporting, allowing only
 * a trailing period or a parenthesised qualifier such as `(no transport)`. Requiring that tail is
 * what separates a diagnostic from a payload that merely contains the same words: a stat failure
 * on `/sdcard/device offline.txt` names a device state, but the line continues into `: No such
 * file or directory`, so the state is not what the line is reporting.
 *
 * Requiring the word `device` is not sufficient on its own. That was the shape of the original
 * defect and it survived the first fix, which is why the tail is checked here rather than in the
 * individual predicates.
 */
const DIAGNOSTIC_TAIL = "(\\.|\\s*\\([^)]*\\))?\\s*$";

function statesDiagnostic(output: string, body: string): boolean {
  const pattern = new RegExp(`${body}${DIAGNOSTIC_TAIL}`, "i");
  return output.split(/\r?\n/).some((line) => pattern.test(line.trim()));
}

/**
 * adb names the device either at the start of the line or after a subcommand prefix such as
 * `adb: error: failed to get feature set: `. The state may follow the device directly, follow a
 * quoted serial, or be qualified by `still` while a transport is being established.
 */
function statesDeviceCondition(output: string, condition: string): boolean {
  return (
    statesDiagnostic(output, `^(adb:\\s*)?(error:\\s*)?device\\b.*\\b${condition}\\b`) ||
    statesDiagnostic(output, `\\bdevice\\s+(still\\s+)?${condition}\\b`)
  );
}

export function hasAdbUnauthorizedFailure(output: string): boolean {
  return statesDeviceCondition(output, "unauthorized") || statesDeviceCondition(output, "authorizing");
}

export function hasAdbOfflineFailure(output: string): boolean {
  return statesDeviceCondition(output, "offline") || statesDeviceCondition(output, "connecting");
}

/**
 * `no device with transport id` carries an identifier after the condition, so it is matched as a
 * whole rather than through the shared condition form.
 */
export function hasAdbMissingDeviceFailure(output: string): boolean {
  return (
    statesDeviceCondition(output, "not found") ||
    statesDiagnostic(output, "\\bno (devices?|emulators?|devices/emulators)\\s+found\\b") ||
    statesDiagnostic(output, "\\bno device with transport id\\b.*")
  );
}

/**
 * Returns undefined when the failure is not about reaching the device, which leaves the
 * calling command free to report its own domain failure.
 */
function matchTargetFailure(output: string): TargetFailure | undefined {
  if (statesDeviceCondition(output, "unauthorized")) {
    return UNAUTHORIZED;
  }
  if (statesDeviceCondition(output, "authorizing")) {
    return STILL_AUTHORIZING;
  }
  if (statesDeviceCondition(output, "offline")) {
    return OFFLINE;
  }
  if (statesDeviceCondition(output, "connecting")) {
    return STILL_CONNECTING;
  }
  if (hasAdbMissingDeviceFailure(output)) {
    return MISSING;
  }
  return undefined;
}

/**
 * Builds the error for an output that may or may not describe a target-device failure.
 * Returns undefined when the failure is not about reaching the device, which leaves the
 * calling command free to report its own domain failure.
 *
 * The output rather than a pre-computed code is the input, so the retriable flag and message
 * describe the condition that was actually observed rather than a default chosen for the code.
 */
export function adbTargetFailureError(
  output: string,
  details: Record<string, unknown>
): AutophoneError | undefined {
  const failure = matchTargetFailure(output);
  if (!failure) {
    return undefined;
  }
  return new AutophoneError({
    code: failure.code,
    message: failure.message,
    retriable: failure.retriable,
    details
  });
}
