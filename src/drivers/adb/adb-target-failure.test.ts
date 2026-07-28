import { describe, expect, it } from "vitest";
import { AdbDriver } from "./adb-driver.js";
import { throwIfAdbTargetFailure } from "./adb-driver-parsers-app.js";
import { AdbTransport } from "./transport.js";
import { createFakeAdb } from "./adb-driver-test-utils.test-support.js";

/**
 * EVAL-009 regression suite: evaluations/suites/adb-target-classification-v1.1
 *
 * The driver classified an explicit nonexistent serial as generic ADB_ERROR while the
 * target-device contract documents NO_DEVICE. The cause was two independent copies of the
 * same classification: the transport rejected non-zero exits on its own, so the more
 * complete classifier further downstream was never reached on the default path.
 *
 * These cases judge the invariant, not the patch: one stderr must produce one code
 * regardless of which path observed it.
 */

const failingAdb = (stderr: string) =>
  createFakeAdb(`#!/bin/sh
printf '%s\\n' ${JSON.stringify(stderr)} >&2
exit 1
`);

/**
 * Captured from adb 'device 'X' not found' on 2026-07-27:
 *   $ adb -s nonexistent-serial-xyz shell echo hi
 *   adb: device 'nonexistent-serial-xyz' not found   (exit 1)
 */
const NONEXISTENT_SERIAL_STDERR = "adb: device 'emulator-5554' not found";

type Expectation = {
  readonly label: string;
  readonly stderr: string;
  readonly code: string;
  readonly retriable?: boolean;
};

type AutophoneErrorShape = { readonly code: string; readonly message: string; readonly retriable: boolean };

/**
 * The transport-selection diagnostics below are the literal strings carried by the adb binary
 * on this host (ADB 36.0.0), recovered with `strings $(which adb)`:
 *
 *   device offline / device offline (no transport) / device offline (transport offline)
 *   device unauthorized. / device still authorizing / device still connecting
 *   no emulators found
 *
 * `still authorizing` and `still connecting` were missed by the v1.0 classifier because it
 * required the state word to follow `device` directly. Both describe a device that is present
 * but not yet usable, so both are retriable; the settled `device unauthorized` refusal is not,
 * because only a person tapping the authorization dialog can clear it.
 */
const targetFailures: readonly Required<Expectation>[] = [
  { label: "explicit nonexistent serial", stderr: NONEXISTENT_SERIAL_STDERR, code: "NO_DEVICE", retriable: true },
  {
    label: "quoted serial with double quotes",
    stderr: 'adb: device "emulator-5554" not found',
    code: "NO_DEVICE",
    retriable: true
  },
  { label: "unquoted device not found", stderr: "error: device not found", code: "NO_DEVICE", retriable: true },
  { label: "empty device list", stderr: "error: no devices/emulators found", code: "NO_DEVICE", retriable: true },
  { label: "no emulators found", stderr: "error: no emulators found", code: "NO_DEVICE", retriable: true },
  { label: "no devices found", stderr: "adb: error: no devices found", code: "NO_DEVICE", retriable: true },
  {
    label: "unknown transport id",
    stderr: "error: no device with transport id '3'",
    code: "NO_DEVICE",
    retriable: true
  },
  { label: "unauthorized device", stderr: "error: device unauthorized", code: "DEVICE_UNAUTHORIZED", retriable: false },
  {
    label: "unauthorized with the trailing period adb emits",
    stderr: "adb: error: device unauthorized.",
    code: "DEVICE_UNAUTHORIZED",
    retriable: false
  },
  {
    label: "unauthorized reported mid-line by a subcommand",
    stderr: "adb: error: failed to get feature set: device unauthorized",
    code: "DEVICE_UNAUTHORIZED",
    retriable: false
  },
  {
    label: "authorization handshake still in flight",
    stderr: "adb: error: device still authorizing",
    code: "DEVICE_UNAUTHORIZED",
    retriable: true
  },
  { label: "offline device", stderr: "error: device offline", code: "DEVICE_OFFLINE", retriable: true },
  { label: "offline device with serial", stderr: "adb: device 'emulator-5554' offline", code: "DEVICE_OFFLINE", retriable: true },
  { label: "offline with no transport", stderr: "error: device offline (no transport)", code: "DEVICE_OFFLINE", retriable: true },
  {
    label: "offline with transport offline",
    stderr: "error: device offline (transport offline)",
    code: "DEVICE_OFFLINE",
    retriable: true
  },
  {
    label: "transport still connecting",
    stderr: "adb: error: device still connecting",
    code: "DEVICE_OFFLINE",
    retriable: true
  }
];

/**
 * Failures that are not about reaching the target device. Classifying any of these as a
 * device-level failure would tell a caller to retry against a device that is in fact fine.
 */
const nonTargetFailures: readonly Expectation[] = [
  { label: "missing shell applet", stderr: "sha256sum: not found", code: "ADB_ERROR" },
  { label: "missing binary on device", stderr: "/system/bin/sh: cmd: not found", code: "ADB_ERROR" },
  { label: "application-level auth error", stderr: "HTTP 401 Unauthorized", code: "ADB_ERROR" },
  { label: "unrelated word offline in payload", stderr: "saved 3 items for offline reading", code: "ADB_ERROR" },
  { label: "an application still connecting", stderr: "player still connecting to stream", code: "ADB_ERROR" },
  { label: "an application still authorizing", stderr: "session still authorizing with the gateway", code: "ADB_ERROR" },
  { label: "a missing noun that merely starts with device", stderr: "error: no deviceProfile found", code: "ADB_ERROR" },
  { label: "a missing noun that merely starts with emulator", stderr: "error: no emulatorCache found", code: "ADB_ERROR" },
  {
    label: "a device state phrase inside a remote path",
    stderr:
      "adb: error: failed to stat remote object '/sdcard/device offline.txt': No such file or directory",
    code: "ADB_ERROR"
  },
  {
    label: "a qualified device state phrase inside a remote path",
    stderr:
      "adb: error: failed to stat remote object '/sdcard/device still offline.txt': No such file or directory",
    code: "ADB_ERROR"
  },
  {
    label: "a device state phrase inside a pushed filename",
    stderr: "adb: error: cannot create '/sdcard/device still connecting.log': Permission denied",
    code: "ADB_ERROR"
  },
  {
    label: "a device state phrase inside a package label",
    stderr: "Failure [INSTALL_FAILED_INVALID_APK: device unauthorized helper is not a valid package]",
    code: "ADB_ERROR"
  },
  {
    label: "a missing-device phrase inside a remote path",
    stderr:
      "adb: error: failed to stat remote object '/sdcard/device not found.txt': No such file or directory",
    code: "ADB_ERROR"
  },
  {
    label: "an interface diagnostic that ends with the word device",
    stderr: "interface 2 with altsetting 1 not found for device",
    code: "ADB_ERROR"
  }
];

describe("adb target-device failure classification", () => {
  describe("transport path (rejectOnNonZero default)", () => {
    for (const { label, stderr, code, retriable } of [...targetFailures, ...nonTargetFailures]) {
      it(`classifies ${label} as ${code}`, async () => {
        const adbPath = await failingAdb(stderr);
        const transport = new AdbTransport({ adbPath });

        await expect(transport.run(["shell", "echo", "hi"], { timeoutMs: 5000 })).rejects.toMatchObject(
          retriable === undefined ? { code } : { code, retriable }
        );
      });
    }
  });

  describe("inspected-output path (rejectOnNonZero false)", () => {
    for (const { label, stderr, code, retriable } of targetFailures) {
      it(`classifies ${label} as ${code}`, () => {
        expect(() => throwIfAdbTargetFailure(stderr, 1, ["shell", "echo", "hi"])).toThrowError(
          expect.objectContaining(retriable === undefined ? { code } : { code, retriable })
        );
      });
    }

    for (const { label, stderr } of nonTargetFailures) {
      it(`leaves ${label} to the calling command`, () => {
        expect(() => throwIfAdbTargetFailure(stderr, 1, ["shell", "echo", "hi"])).not.toThrow();
      });
    }

    it("ignores output when the command succeeded", () => {
      expect(() => throwIfAdbTargetFailure(NONEXISTENT_SERIAL_STDERR, 0, ["devices"])).not.toThrow();
    });
  });

  /**
   * The structural judge. Divergence between the two copies is what produced EVAL-009,
   * so a future edit that fixes one copy alone must fail here.
   */
  describe("both paths agree", () => {
    for (const { label, stderr, code, retriable } of targetFailures) {
      it(`agrees on ${label}`, async () => {
        const adbPath = await failingAdb(stderr);
        const transport = new AdbTransport({ adbPath });

        const observe = (error: unknown) => {
          const { code: c, message, retriable: r } = error as AutophoneErrorShape;
          return { code: c, message, retriable: r };
        };

        const transportError = await transport
          .run(["shell", "echo", "hi"], { timeoutMs: 5000 })
          .then(() => undefined)
          .catch(observe);

        let inspected: ReturnType<typeof observe> | undefined;
        try {
          throwIfAdbTargetFailure(stderr, 1, ["shell", "echo", "hi"]);
        } catch (error) {
          inspected = observe(error);
        }

        expect(transportError).toEqual({ code, message: expect.any(String), retriable });
        expect(inspected).toEqual(transportError);
      });
    }
  });

  it("classifies an explicit nonexistent serial as NO_DEVICE through a real driver command", async () => {
    const adbPath = await createFakeAdb(`#!/bin/sh
if [ "$1" = "devices" ]; then
  printf 'List of devices attached\\nemulator-5554\\tdevice\\n'
  exit 0
fi
printf "adb: device 'emulator-5554' not found\\n" >&2
exit 1
`);
    const driver = new AdbDriver({ adbPath });

    await expect(
      driver.currentApp({ deviceSerial: "emulator-5554", timeoutMs: 5000 })
    ).rejects.toMatchObject({ code: "NO_DEVICE", retriable: true });
  });
});
