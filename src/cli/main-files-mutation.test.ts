import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type {
  AndroidDriver,
  DriverAppActivitiesResult,
  DriverAppGraphicsResult,
  DriverAppLinksResult,
  DriverAppOpsGetResult,
  DriverAppPackageInfoResult,
  DriverAppMemoryResult,
  DriverAppListResult,
  DriverDevice,
  DriverDeviceCurrentUserResult,
  DriverDeviceAccessibilityResult,
  DriverDeviceAnimationsResult,
  DriverDeviceAnimationsSetResult,
  DriverDeviceBatteryResult,
  DriverDeviceTimeResult,
  DriverDeviceBrightnessResult,
  DriverDeviceImeResult,
  DriverDeviceLocaleResult,
  DriverDeviceNetworkResult,
  DriverDeviceStorageResult,
  DriverDeviceNotificationsResult,
  DriverDeviceOrientationResult,
  DriverDeviceScreenResult,
  DriverDeviceUsersResult,
  DriverResolveUrlResult,
  DriverRingerGetResult,
  DriverUserRotationPolicy
} from "../core/index.js";
import { DEVICE_VOLUME_STREAMS } from "../core/index.js";
import { runCli } from "./main.js";
import { redactSensitiveError } from "./redaction.js";
import {
  AutophoneError,
  RUNTIME_VERSION,
  type AppCurrentResult,
  type DeviceDetailsResult,
  type DeviceReadyState,
  type Point,
  type Snapshot
} from "../contracts/index.js";
import {
  accessibilityDriverResult,
  animationsDriverResult,
  animationsSetDriverResult,
  appActivitiesDriverResult,
  appActivityRecord,
  appCurrentState,
  appLinksDriverResult,
  appOpsDriverResult,
  batteryDriverResult,
  brightnessDriverResult,
  deviceDetailsFixture,
  emptyGraphicsSummary,
  emptyMemorySnapshot,
  graphicsDriverResult,
  graphicsSummary,
  imeDriverResult,
  localeDriverResult,
  makeDriver,
  makeIo,
  memoryDriverResult,
  memorySnapshot,
  networkDriverResult,
  notificationsDriverResult,
  orientationDriverResult,
  packageInfoDriverResult,
  packageInfoRecord,
  pngFixture,
  readyState,
  resolveUrlDriverResult,
  ringerDriverResult,
  screenDriverResult,
  snapshot,
  storageDriverResult,
  timeDriverResult,
  userRotationPolicy
} from "./main-test-utils.test-support.js";describe("CLI JSON output", () => {

  it("writes files copy JSON with explicit serial and verified source/destination metadata", async () => {
    const sourcePath = "/sdcard/Download/source.txt";
    const destPath = "/sdcard/Download/dest.txt";
    const driver = makeDriver([]);
    driver.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: {
          kind: "regular_file",
          bytes: 12,
          modifiedUnixMs: 1_782_751_084_000
        },
        exitCode: 0,
        durationMs: 3
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: false,
        entry: null,
        exitCode: 1,
        durationMs: 2
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: {
          kind: "regular_file",
          bytes: 12,
          modifiedUnixMs: 1_782_751_084_000
        },
        exitCode: 0,
        durationMs: 2
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: {
          kind: "regular_file",
          bytes: 12,
          modifiedUnixMs: 1_782_751_085_000
        },
        exitCode: 0,
        durationMs: 3
      });
    driver.copyFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exitCode: 0,
      durationMs: 4
    });
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "files",
        "copy",
        "--source",
        sourcePath,
        "--dest",
        destPath,
        "--copy-timeout",
        "180000"
      ],
      {
        io,
        requestIdFactory: () => "req-files-copy",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.copyFile).toHaveBeenCalledWith({
      deviceSerial: "resolved-serial",
      sourcePath,
      destPath,
      timeoutMs: 180_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "files.copy",
      device: { serial: "resolved-serial" },
      warnings: [
        "files copy writes one destination regular file and leaves the source path in place",
        "files copy uses cp -n -T and refuses existing destinations, but the stat-stat-cp-stat-stat sequence is not atomic",
        "files copy verifies source preservation plus destination byte metadata, not content integrity"
      ],
      result: {
        device_serial: "resolved-serial",
        requested: { source_path: sourcePath, dest_path: destPath },
        before_source: {
          exists: true,
          entry: {
            kind: "regular_file",
            bytes: 12,
            modified_unix_ms: 1_782_751_084_000
          }
        },
        before_dest: { exists: false, entry: null },
        copy: {
          method: "device_cp_no_clobber",
          exit_code: 0,
          command_duration_ms: 4
        },
        after_source: {
          exists: true,
          entry: {
            kind: "regular_file",
            bytes: 12,
            modified_unix_ms: 1_782_751_084_000
          }
        },
        after_dest: {
          exists: true,
          entry: {
            kind: "regular_file",
            bytes: 12,
            modified_unix_ms: 1_782_751_085_000
          }
        },
        copied: true,
        verify: { policy: "source_preserved_dest_present_after_copy", ok: true, attempts: 4 },
        semantics: "single_regular_file_non_clobber_copy"
      },
      trace: {
        copy_timeout_ms: 180_000,
        method: "device_cp_no_clobber",
        copied: true,
        source_kind: "regular_file",
        dest_kind: "regular_file"
      }
    });
  });

  it("uses global timeout for files copy when copy timeout is omitted", async () => {
    const sourcePath = "/sdcard/Download/source.txt";
    const destPath = "/sdcard/Download/dest.txt";
    const driver = makeDriver([]);
    driver.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file", bytes: 12, modifiedUnixMs: 1_782_751_084_000 },
        exitCode: 0,
        durationMs: 3
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: false,
        entry: null,
        exitCode: 1,
        durationMs: 2
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file", bytes: 12, modifiedUnixMs: 1_782_751_084_000 },
        exitCode: 0,
        durationMs: 2
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file", bytes: 12, modifiedUnixMs: 1_782_751_085_000 },
        exitCode: 0,
        durationMs: 3
      });
    driver.copyFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exitCode: 0,
      durationMs: 4
    });
    const io = makeIo();
    const exitCode = await runCli(
      ["--timeout", "22000", "--serial", "emulator-5554", "files", "copy", "--source", sourcePath, "--dest", destPath],
      {
        io,
        requestIdFactory: () => "req-files-copy-global-timeout",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.copyFile).toHaveBeenCalledWith({
      deviceSerial: "resolved-serial",
      sourcePath,
      destPath,
      timeoutMs: 22_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "files.copy",
      trace: {
        copy_timeout_ms: 22_000
      }
    });
  });

  it("rejects files copy without explicit serial and redacts source/destination paths", async () => {
    const sourcePath = "/sdcard/Download/private-source.txt";
    const destPath = "/sdcard/Download/private-dest.txt";
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["files", "copy", "--source", sourcePath, "--dest", destPath], {
      io,
      requestIdFactory: () => "req-files-copy-no-serial",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.statFile).not.toHaveBeenCalled();
    expect(driver.copyFile).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(sourcePath);
    expect(io.stdoutText()).not.toContain(destPath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "files.copy",
      error: {
        code: "INVALID_REQUEST",
        message: "files copy requires explicit --serial"
      },
      trace: {
        argv: ["files", "copy", "--source", "<redacted>", "--dest", "<redacted>"]
      }
    });
  });

  it("rejects files copy source/destination equality before adb and redacts both path flags", async () => {
    const sourcePath = "/sdcard/Download/private-source.txt";
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      ["--serial", "emulator-5554", "files", "copy", "--source", sourcePath, "--dest", sourcePath],
      {
        io,
        requestIdFactory: () => "req-files-copy-same-path",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.statFile).not.toHaveBeenCalled();
    expect(driver.copyFile).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(sourcePath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "files.copy",
      error: { code: "INVALID_REQUEST" },
      trace: {
        argv: ["--serial", "emulator-5554", "files", "copy", "--source", "<redacted>", "--dest", "<redacted>"]
      }
    });
  });

  it("writes files move JSON with explicit serial, confirmation, and verified metadata", async () => {
    const sourcePath = "/sdcard/Download/source.txt";
    const destPath = "/sdcard/Download/dest.txt";
    const driver = makeDriver([]);
    driver.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: {
          kind: "regular_file",
          bytes: 12,
          modifiedUnixMs: 1_782_751_084_000
        },
        exitCode: 0,
        durationMs: 3
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: false,
        entry: null,
        exitCode: 1,
        durationMs: 2
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: false,
        entry: null,
        exitCode: 1,
        durationMs: 2
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: {
          kind: "regular_file",
          bytes: 12,
          modifiedUnixMs: 1_782_751_085_000
        },
        exitCode: 0,
        durationMs: 3
      });
    driver.moveFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exitCode: 0,
      durationMs: 4
    });
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "files",
        "move",
        "--source",
        sourcePath,
        "--dest",
        destPath,
        "--confirm-source",
        sourcePath
      ],
      {
        io,
        requestIdFactory: () => "req-files-move",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.moveFile).toHaveBeenCalledWith({
      deviceSerial: "resolved-serial",
      sourcePath,
      destPath,
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "files.move",
      device: { serial: "resolved-serial" },
      warnings: [
        "files move removes the source path after moving one regular file or symlink",
        "files move refuses existing destinations but the stat-stat-mv-stat-stat sequence is not atomic",
        "files move verifies source absence plus destination kind and byte metadata, not content integrity"
      ],
      result: {
        device_serial: "resolved-serial",
        requested: { source_path: sourcePath, dest_path: destPath },
        before_source: {
          exists: true,
          entry: {
            kind: "regular_file",
            bytes: 12,
            modified_unix_ms: 1_782_751_084_000
          }
        },
        before_dest: { exists: false, entry: null },
        move: {
          method: "device_mv",
          exit_code: 0,
          command_duration_ms: 4
        },
        after_source: { exists: false, entry: null },
        after_dest: {
          exists: true,
          entry: {
            kind: "regular_file",
            bytes: 12,
            modified_unix_ms: 1_782_751_085_000
          }
        },
        moved: true,
        verify: { policy: "source_absent_dest_present_after_move", ok: true, attempts: 4 },
        semantics: "single_non_directory_path_non_clobber_move"
      },
      trace: {
        timeout_ms: 10_000,
        method: "device_mv",
        moved: true,
        source_kind: "regular_file",
        dest_kind: "regular_file"
      }
    });
  });

  it("rejects files move without explicit serial and redacts source/destination paths", async () => {
    const sourcePath = "/sdcard/Download/private-source.txt";
    const destPath = "/sdcard/Download/private-dest.txt";
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      ["files", "move", "--source", sourcePath, "--dest", destPath, "--confirm-source", sourcePath],
      {
        io,
        requestIdFactory: () => "req-files-move-no-serial",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.statFile).not.toHaveBeenCalled();
    expect(driver.moveFile).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(sourcePath);
    expect(io.stdoutText()).not.toContain(destPath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "files.move",
      error: {
        code: "INVALID_REQUEST",
        message: "files move requires explicit --serial"
      },
      trace: {
        argv: ["files", "move", "--source", "<redacted>", "--dest", "<redacted>", "--confirm-source", "<redacted>"]
      }
    });
  });

  it("rejects files move confirm mismatches before adb and redacts all path flags", async () => {
    const sourcePath = "/sdcard/Download/private-source.txt";
    const destPath = "/sdcard/Download/private-dest.txt";
    const confirmPath = "/sdcard/Download/private-other.txt";
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "files",
        "move",
        "--source",
        sourcePath,
        "--dest",
        destPath,
        "--confirm-source",
        confirmPath
      ],
      {
        io,
        requestIdFactory: () => "req-files-move-confirm",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.statFile).not.toHaveBeenCalled();
    expect(driver.moveFile).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(sourcePath);
    expect(io.stdoutText()).not.toContain(destPath);
    expect(io.stdoutText()).not.toContain(confirmPath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "files.move",
      error: { code: "INVALID_REQUEST" },
      trace: {
        argv: [
          "--serial",
          "emulator-5554",
          "files",
          "move",
          "--source",
          "<redacted>",
          "--dest",
          "<redacted>",
          "--confirm-source",
          "<redacted>"
        ]
      }
    });
  });

  it("writes files rm JSON with explicit serial, confirmation, and verified absence", async () => {
    const remotePath = "/sdcard/Download/cleanup.txt";
    const driver = makeDriver([]);
    driver.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: {
          kind: "regular_file",
          bytes: 12,
          modifiedUnixMs: 1_782_751_084_000
        },
        exitCode: 0,
        durationMs: 3
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: false,
        entry: null,
        exitCode: 1,
        durationMs: 2
      });
    driver.removeFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exitCode: 0,
      durationMs: 4
    });
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "files",
        "rm",
        "--remote",
        remotePath,
        "--confirm-remote",
        remotePath,
        "--rm-timeout",
        "9000"
      ],
      {
        io,
        requestIdFactory: () => "req-files-rm",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.removeFile).toHaveBeenCalledWith({
      deviceSerial: "resolved-serial",
      remotePath,
      timeoutMs: 9000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "files.rm",
      device: { serial: "resolved-serial" },
      warnings: [
        "files rm deletes one non-directory device path and cannot be undone",
        "files rm verifies absence after deletion, but the stat-rm-stat sequence is not atomic"
      ],
      result: {
        device_serial: "resolved-serial",
        requested: { remote_path: remotePath, missing_ok: false },
        before: {
          exists: true,
          entry: {
            kind: "regular_file",
            bytes: 12,
            modified_unix_ms: 1_782_751_084_000
          }
        },
        remove: {
          method: "device_rm",
          exit_code: 0,
          command_duration_ms: 4
        },
        removed: true,
        after_exists: false,
        verify: { policy: "stat_absent_after_rm", ok: true, attempts: 2 },
        semantics: "single_path_non_recursive_remove"
      },
      trace: {
        rm_timeout_ms: 9000,
        method: "device_rm",
        removed: true,
        missing_ok: false
      }
    });
  });

  it("rejects files rm without explicit serial and redacts remote confirmation paths", async () => {
    const remotePath = "/sdcard/Download/private-cleanup.txt";
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      ["files", "rm", "--remote", remotePath, "--confirm-remote", remotePath],
      {
        io,
        requestIdFactory: () => "req-files-rm-no-serial",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.statFile).not.toHaveBeenCalled();
    expect(driver.removeFile).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(remotePath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "files.rm",
      error: {
        code: "INVALID_REQUEST",
        message: "files rm requires explicit --serial"
      },
      trace: {
        argv: ["files", "rm", "--remote", "<redacted>", "--confirm-remote", "<redacted>"]
      }
    });
  });

  it("rejects files rm confirm mismatches before adb and redacts both path flags", async () => {
    const remotePath = "/sdcard/Download/private-cleanup.txt";
    const confirmPath = "/sdcard/Download/private-other.txt";
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "files",
        "rm",
        "--remote",
        remotePath,
        "--confirm-remote",
        confirmPath
      ],
      {
        io,
        requestIdFactory: () => "req-files-rm-confirm",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.statFile).not.toHaveBeenCalled();
    expect(driver.removeFile).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(remotePath);
    expect(io.stdoutText()).not.toContain(confirmPath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "files.rm",
      error: { code: "INVALID_REQUEST" },
      trace: {
        argv: [
          "--serial",
          "emulator-5554",
          "files",
          "rm",
          "--remote",
          "<redacted>",
          "--confirm-remote",
          "<redacted>"
        ]
      }
    });
  });

  it("redacts files rm remote paths when verification fails after rm", async () => {
    const remotePath = "/sdcard/Download/private-still-there.txt";
    const driver = makeDriver([]);
    driver.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file", bytes: 12, modifiedUnixMs: 1_782_751_084_000 },
        exitCode: 0,
        durationMs: 1
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: { kind: "regular_file", bytes: 12, modifiedUnixMs: 1_782_751_084_000 },
        exitCode: 0,
        durationMs: 1
      });
    const io = makeIo();
    const exitCode = await runCli(
      ["--serial", "emulator-5554", "files", "rm", "--remote", remotePath, "--confirm-remote", remotePath],
      {
        io,
        requestIdFactory: () => "req-files-rm-verify-failed",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.removeFile).toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(remotePath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "files.rm",
      error: {
        code: "FILE_RM_FAILED",
        details: { phase: "verify" }
      },
      trace: {
        argv: [
          "--serial",
          "emulator-5554",
          "files",
          "rm",
          "--remote",
          "<redacted>",
          "--confirm-remote",
          "<redacted>"
        ]
      }
    });
  });
});
