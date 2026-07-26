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
  it("pushes a zero-byte file without echoing local paths", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-files-push-"));
    const localPath = join(dir, "empty.txt");
    await writeFile(localPath, "");
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "files",
        "push",
        "--local",
        localPath,
        "--remote",
        "/sdcard/Download/empty.txt",
        "--compression",
        "zstd"
      ],
      {
        io,
        requestIdFactory: () => "req-files-push",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    expect(driver.pushFile).toHaveBeenCalledWith({
      deviceSerial: "emulator-5554",
      localPath,
      remotePath: "/sdcard/Download/empty.txt",
      compression: "zstd",
      timeoutMs: 120_000
    });
    expect(io.stdoutText()).not.toContain(localPath);
    expect(io.stdoutText()).not.toContain(dir);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "files.push",
      device: { serial: "emulator-5554" },
      warnings: [
        "files push writes to the target device and may leave a partial remote file if interrupted",
        "adb_exit_success does not independently verify remote file contents"
      ],
      result: {
        device_serial: "emulator-5554",
        requested: {
          local: {
            file_name: "empty.txt",
            bytes: 0,
            sha256: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
          },
          remote_path: "/sdcard/Download/empty.txt",
          compression: "zstd"
        },
        transfer: { method: "adb_push", exit_code: 0 },
        verify: { policy: "adb_exit_success", ok: true, attempts: 1 }
      },
      trace: {
        push_timeout_ms: 120_000,
        method: "adb_push",
        compression: "zstd",
        local_bytes: 0
      }
    });
  });

  it("rejects files push without explicit serial before local file inspection and redacts paths", async () => {
    const localPath = "/tmp/secret-local.txt";
    const remotePath = "/sdcard/Download/secret-remote.txt";
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["files", "push", "--local", localPath, "--remote", remotePath], {
      io,
      requestIdFactory: () => "req-files-push-no-serial",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.pushFile).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(localPath);
    expect(io.stdoutText()).not.toContain(remotePath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "files.push",
      error: {
        code: "INVALID_REQUEST",
        message: "files push requires explicit --serial"
      },
      trace: {
        argv: ["files", "push", "--local", "<redacted>", "--remote", "<redacted>"]
      }
    });
  });

  it("rejects mutually exclusive file compression options", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-files-compression-"));
    const localPath = join(dir, "payload.txt");
    await writeFile(localPath, "payload");
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "files",
        "push",
        "--local",
        localPath,
        "--remote",
        "/sdcard/Download/payload.txt",
        "--compression",
        "zstd",
        "--no-compression"
      ],
      {
        io,
        requestIdFactory: () => "req-files-compression-conflict",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(driver.pushFile).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(localPath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "files.push",
      error: {
        code: "INVALID_REQUEST",
        message: "--compression and --no-compression are mutually exclusive"
      },
      trace: {
        argv: [
          "--serial",
          "emulator-5554",
          "files",
          "push",
          "--local",
          "<redacted>",
          "--remote",
          "<redacted>",
          "--compression",
          "zstd",
          "--no-compression"
        ]
      }
    });
  });

  it("pulls a device file through a temporary path and publishes output metadata", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-files-pull-"));
    const output = join(dir, "pulled.txt");
    const pulledBytes = Buffer.from("pulled bytes");
    const expectedSha = `sha256:${createHash("sha256").update(pulledBytes).digest("hex")}`;
    const driver = makeDriver([]);
    driver.pullFile.mockImplementationOnce(async (request) => {
      await writeFile(request.localPath, pulledBytes);
      return { serial: "emulator-5554", exitCode: 0, durationMs: 9 };
    });
    const io = makeIo();
    const exitCode = await runCli(
      ["--serial", "emulator-5554", "files", "pull", "--remote", "/sdcard/Download/pulled.txt", "--output", output],
      {
        io,
        requestIdFactory: () => "req-files-pull",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    await expect(readFile(output)).resolves.toEqual(pulledBytes);
    const driverRequest = driver.pullFile.mock.calls[0]?.[0];
    expect(driverRequest).toMatchObject({
      deviceSerial: "emulator-5554",
      remotePath: "/sdcard/Download/pulled.txt",
      compression: "adb_default",
      timeoutMs: 120_000
    });
    expect(driverRequest?.localPath).not.toBe(output);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "files.pull",
      device: { serial: "emulator-5554" },
      warnings: ["adb_exit_success does not independently verify remote file contents"],
      result: {
        device_serial: "emulator-5554",
        requested: {
          remote_path: "/sdcard/Download/pulled.txt",
          compression: "adb_default"
        },
        output: {
          file_name: "pulled.txt",
          bytes: pulledBytes.byteLength,
          sha256: expectedSha,
          overwritten: false
        },
        transfer: { method: "adb_pull", exit_code: 0, command_duration_ms: 9 },
        verify: { policy: "adb_exit_success", ok: true, attempts: 1 }
      },
      trace: {
        pull_timeout_ms: 120_000,
        method: "adb_pull",
        compression: "adb_default",
        output_bytes: pulledBytes.byteLength
      }
    });
  });

  it("overwrites files pull output only with explicit opt-in", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-files-pull-overwrite-"));
    const output = join(dir, "pulled.txt");
    await writeFile(output, "original");
    const pulledBytes = Buffer.from("replacement bytes");
    const driver = makeDriver([]);
    driver.pullFile.mockImplementationOnce(async (request) => {
      await writeFile(request.localPath, pulledBytes);
      return { serial: "emulator-5554", exitCode: 0, durationMs: 4 };
    });
    const io = makeIo();
    const exitCode = await runCli(
      [
        "--serial",
        "emulator-5554",
        "files",
        "pull",
        "--remote",
        "/sdcard/Download/pulled.txt",
        "--output",
        output,
        "--overwrite"
      ],
      {
        io,
        requestIdFactory: () => "req-files-pull-overwrite",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(0);
    await expect(readFile(output)).resolves.toEqual(pulledBytes);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "files.pull",
      warnings: [
        "files pull output file was overwritten",
        "adb_exit_success does not independently verify remote file contents"
      ],
      result: {
        output: {
          file_name: "pulled.txt",
          bytes: pulledBytes.byteLength,
          overwritten: true
        }
      }
    });
  });

  it("rejects non-regular files pull output and removes the temporary path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-files-pull-dir-"));
    const output = join(dir, "pulled.txt");
    const remotePath = "/sdcard/Download/pulled-dir";
    const driver = makeDriver([]);
    let tempPath = "";
    driver.pullFile.mockImplementationOnce(async (request) => {
      tempPath = request.localPath;
      await mkdir(tempPath, { recursive: true });
      await writeFile(join(tempPath, "child.txt"), "child");
      return { serial: "emulator-5554", exitCode: 0, durationMs: 5 };
    });
    const io = makeIo();
    const exitCode = await runCli(
      ["--serial", "emulator-5554", "files", "pull", "--remote", remotePath, "--output", output],
      {
        io,
        requestIdFactory: () => "req-files-pull-dir",
        driverFactory: () => driver
      }
    );

    expect(exitCode).toBe(2);
    expect(tempPath).not.toBe("");
    await expect(access(tempPath)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(access(output)).rejects.toMatchObject({ code: "ENOENT" });
    expect(io.stdoutText()).not.toContain(tempPath);
    expect(io.stdoutText()).not.toContain(output);
    expect(io.stdoutText()).not.toContain(remotePath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "files.pull",
      error: {
        code: "FILE_PULL_FAILED",
        message: "adb pull produced a non-regular output path"
      }
    });
  });

  it("does not overwrite files pull output unless requested and redacts paths", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autophone-cli-files-pull-exists-"));
    const output = join(dir, "existing.txt");
    const relativeOutput = "./existing.txt";
    const remotePath = "/sdcard/Download/private.txt";
    await writeFile(output, "original");
    const driver = makeDriver([]);
    const io = makeIo();
    const originalCwd = process.cwd();
    let exitCode = -1;
    try {
      process.chdir(dir);
      exitCode = await runCli(
        ["--serial", "emulator-5554", "files", "pull", "--remote", remotePath, "--output", relativeOutput],
        {
          io,
          requestIdFactory: () => "req-files-pull-exists",
          driverFactory: () => driver
        }
      );
    } finally {
      process.chdir(originalCwd);
    }

    expect(exitCode).toBe(2);
    await expect(readFile(output, "utf8")).resolves.toBe("original");
    expect(driver.pullFile).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(output);
    expect(io.stdoutText()).not.toContain(dir);
    expect(io.stdoutText()).not.toContain(relativeOutput);
    expect(io.stdoutText()).not.toContain(remotePath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "files.pull",
      error: {
        code: "OUTPUT_EXISTS",
        details: { output_path: "<redacted-path>" }
      },
      trace: {
        argv: [
          "--serial",
          "emulator-5554",
          "files",
          "pull",
          "--remote",
          "<redacted>",
          "--output",
          "<redacted>"
        ]
      }
    });
  });

  it("writes files stat JSON with resolved serial and single-path semantics", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: true,
      entry: {
        kind: "directory",
        bytes: 3452,
        modifiedUnixMs: 1_782_751_084_000
      },
      exitCode: 0,
      durationMs: 3
    });
    const io = makeIo();
    const exitCode = await runCli(["files", "stat", "--remote", "/sdcard/Download"], {
      io,
      requestIdFactory: () => "req-files-stat",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.statFile).toHaveBeenCalledWith({
      deviceSerial: undefined,
      remotePath: "/sdcard/Download",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "files.stat",
      device: { serial: "resolved-serial" },
      warnings: [
        "files stat is a single-path metadata probe; it does not list directory contents or follow symbolic links"
      ],
      result: {
        device_serial: "resolved-serial",
        requested: { remote_path: "/sdcard/Download" },
        exists: true,
        entry: {
          kind: "directory",
          bytes: 3452,
          modified_unix_ms: 1_782_751_084_000
        },
        query: {
          method: "device_stat",
          exit_code: 0,
          command_duration_ms: 3
        },
        verify: { policy: "stat_parse", ok: true, attempts: 1 },
        semantics: "read_only_single_path_stat_not_directory_listing"
      },
      trace: {
        timeout_ms: 10_000,
        method: "device_stat",
        exists: true
      }
    });
  });

  it("redacts files stat remote paths on validation failures", async () => {
    const remotePath = "relative/private.txt";
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["files", "stat", "--remote", remotePath], {
      io,
      requestIdFactory: () => "req-files-stat-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.statFile).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(remotePath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "files.stat",
      error: { code: "INVALID_REQUEST" },
      trace: {
        argv: ["files", "stat", "--remote", "<redacted>"]
      }
    });
  });

  it("writes files hash JSON with resolved serial and regular-file digest semantics", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: true,
      entry: {
        kind: "regular_file",
        bytes: 0,
        modifiedUnixMs: 1_782_751_084_000
      },
      exitCode: 0,
      durationMs: 3
    });
    driver.hashFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      algorithm: "md5",
      digest: "md5:d41d8cd98f00b204e9800998ecf8427e",
      exitCode: 0,
      durationMs: 5
    });
    const io = makeIo();
    const exitCode = await runCli(["files", "hash", "--remote", "/sdcard/Download/empty.txt", "--algorithm", "md5"], {
      io,
      requestIdFactory: () => "req-files-hash",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.statFile).toHaveBeenCalledWith({
      deviceSerial: undefined,
      remotePath: "/sdcard/Download/empty.txt",
      timeoutMs: 10_000
    });
    expect(driver.hashFile).toHaveBeenCalledWith({
      deviceSerial: "resolved-serial",
      remotePath: "/sdcard/Download/empty.txt",
      algorithm: "md5",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "files.hash",
      device: { serial: "resolved-serial" },
      warnings: [
        "files hash is read-only and computes a digest only for existing regular files; missing or non-regular targets return hash:null",
        "files hash uses a non-atomic stat-hash sequence; md5 is not a security digest"
      ],
      result: {
        device_serial: "resolved-serial",
        requested: { remote_path: "/sdcard/Download/empty.txt", algorithm: "md5" },
        target: {
          exists: true,
          entry: {
            kind: "regular_file",
            bytes: 0,
            modified_unix_ms: 1_782_751_084_000
          },
          query: { method: "device_stat", exit_code: 0, command_duration_ms: 3 }
        },
        hash: {
          algorithm: "md5",
          method: "device_md5sum",
          digest: "md5:d41d8cd98f00b204e9800998ecf8427e",
          exit_code: 0,
          command_duration_ms: 5
        },
        hashed: true,
        verify: { policy: "regular_file_stat_then_digest_parse", ok: true, attempts: 2 },
        semantics: "read_only_single_regular_file_content_digest_not_atomic"
      },
      trace: {
        timeout_ms: 10_000,
        algorithm: "md5",
        target_exists: true,
        target_kind: "regular_file",
        hashed: true,
        method: "device_md5sum"
      }
    });
  });

  it("writes files hash JSON with hash null for non-regular targets", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: true,
      entry: {
        kind: "directory",
        bytes: 3452,
        modifiedUnixMs: 1_782_751_084_000
      },
      exitCode: 0,
      durationMs: 3
    });
    const io = makeIo();
    const exitCode = await runCli(["files", "hash", "--remote", "/sdcard/Download"], {
      io,
      requestIdFactory: () => "req-files-hash-dir",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.hashFile).not.toHaveBeenCalled();
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "files.hash",
      device: { serial: "resolved-serial" },
      result: {
        requested: { remote_path: "/sdcard/Download", algorithm: "sha256" },
        target: { exists: true, entry: { kind: "directory" } },
        hash: null,
        hashed: false,
        verify: { policy: "regular_file_stat_then_digest_parse", ok: true, attempts: 1 }
      },
      trace: {
        algorithm: "sha256",
        target_exists: true,
        target_kind: "directory",
        hashed: false,
        method: null
      }
    });
  });

  it("redacts files hash remote paths on validation and command failures", async () => {
    const invalidRemotePath = "relative/private.txt";
    const invalidDriver = makeDriver([]);
    const invalidIo = makeIo();
    const invalidExitCode = await runCli(["files", "hash", "--remote", invalidRemotePath], {
      io: invalidIo,
      requestIdFactory: () => "req-files-hash-invalid",
      driverFactory: () => invalidDriver
    });
    expect(invalidExitCode).toBe(2);
    expect(invalidDriver.statFile).not.toHaveBeenCalled();
    expect(invalidIo.stdoutText()).not.toContain(invalidRemotePath);
    expect(JSON.parse(invalidIo.stdoutText())).toMatchObject({
      ok: false,
      command: "files.hash",
      error: { code: "INVALID_REQUEST" },
      trace: {
        argv: ["files", "hash", "--remote", "<redacted>"]
      }
    });

    const remotePath = "/sdcard/Download/private.txt";
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: true,
      entry: { kind: "regular_file", bytes: 12, modifiedUnixMs: 1_782_751_000_000 },
      exitCode: 0,
      durationMs: 2
    });
    driver.hashFile.mockRejectedValueOnce(
      new AutophoneError({
        code: "FILE_HASH_FAILED",
        message: `sha256sum: ${remotePath}: No such file or directory`,
        retriable: false
      })
    );
    const io = makeIo();
    const exitCode = await runCli(["files", "hash", "--remote", remotePath], {
      io,
      requestIdFactory: () => "req-files-hash-command-failed",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(io.stdoutText()).not.toContain(remotePath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "files.hash",
      error: {
        code: "FILE_HASH_FAILED",
        message: "files hash command failed",
        details: {
          phase: "hash",
          cause_code: "FILE_HASH_FAILED",
          cause_message: "sha256sum: <redacted-path>: No such file or directory"
        }
      },
      trace: {
        argv: ["files", "hash", "--remote", "<redacted>"]
      }
    });
  });

  it("writes files list JSON with resolved serial and bounded direct-child semantics", async () => {
    const driver = makeDriver([]);
    driver.statFile.mockResolvedValueOnce({
      serial: "resolved-serial",
      exists: true,
      entry: { kind: "directory", bytes: 3452, modifiedUnixMs: 1_782_751_084_000 },
      exitCode: 0,
      durationMs: 3
    });
    driver.listDirectory.mockResolvedValueOnce({
      serial: "resolved-serial",
      entries: [
        {
          name: "a file.txt",
          path: "/data/local/tmp/list/a file.txt",
          kind: "regular_file",
          bytes: 3,
          modifiedUnixMs: 1_782_751_085_000
        }
      ],
      truncated: true,
      exitCode: 0,
      durationMs: 5
    });
    const io = makeIo();
    const exitCode = await runCli(["files", "list", "--remote", "/data/local/tmp/list", "--max-entries", "1"], {
      io,
      requestIdFactory: () => "req-files-list",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.statFile).toHaveBeenCalledWith({
      deviceSerial: undefined,
      remotePath: "/data/local/tmp/list",
      timeoutMs: 10_000
    });
    expect(driver.listDirectory).toHaveBeenCalledWith({
      deviceSerial: "resolved-serial",
      remotePath: "/data/local/tmp/list",
      maxEntries: 1,
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "files.list",
      device: { serial: "resolved-serial" },
      warnings: [
        "files list is a bounded, non-recursive direct-child listing; it does not read file contents"
      ],
      result: {
        device_serial: "resolved-serial",
        requested: { remote_path: "/data/local/tmp/list", max_entries: 1 },
        target: {
          exists: true,
          entry: {
            kind: "directory",
            bytes: 3452,
            modified_unix_ms: 1_782_751_084_000
          },
          query: { method: "device_stat", exit_code: 0, command_duration_ms: 3 }
        },
        list: {
          method: "device_find_stat",
          exit_code: 0,
          command_duration_ms: 5,
          entries: [
            {
              name: "a file.txt",
              path: "/data/local/tmp/list/a file.txt",
              kind: "regular_file",
              bytes: 3,
              modified_unix_ms: 1_782_751_085_000
            }
          ],
          count: 1,
          truncated: true
        },
        verify: { policy: "bounded_single_directory_listing", ok: true, attempts: 2 },
        semantics: "read_only_single_directory_listing_not_recursive"
      },
      trace: {
        timeout_ms: 10_000,
        max_entries: 1,
        target_exists: true,
        listed: true,
        count: 1,
        truncated: true
      }
    });
  });

  it("redacts files list remote paths on validation failures", async () => {
    const remotePath = "/data/local/tmp/private/";
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["files", "list", "--remote", remotePath], {
      io,
      requestIdFactory: () => "req-files-list-invalid",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.statFile).not.toHaveBeenCalled();
    expect(driver.listDirectory).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(remotePath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "files.list",
      error: { code: "INVALID_REQUEST" },
      trace: {
        argv: ["files", "list", "--remote", "<redacted>"]
      }
    });
  });

  it("writes files mkdir JSON with explicit serial and verified directory", async () => {
    const remotePath = "/data/local/tmp/new-dir";
    const driver = makeDriver([]);
    driver.statFile
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: false,
        entry: null,
        exitCode: 1,
        durationMs: 3
      })
      .mockResolvedValueOnce({
        serial: "resolved-serial",
        exists: true,
        entry: {
          kind: "directory",
          bytes: 3452,
          modifiedUnixMs: 1_782_751_084_000
        },
        exitCode: 0,
        durationMs: 2
      });
    driver.makeDirectory.mockResolvedValueOnce({
      serial: "resolved-serial",
      exitCode: 0,
      durationMs: 4
    });
    const io = makeIo();
    const exitCode = await runCli(["--serial", "emulator-5554", "files", "mkdir", "--remote", remotePath], {
      io,
      requestIdFactory: () => "req-files-mkdir",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(0);
    expect(driver.makeDirectory).toHaveBeenCalledWith({
      deviceSerial: "resolved-serial",
      remotePath,
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: true,
      command: "files.mkdir",
      device: { serial: "resolved-serial" },
      warnings: [
        "files mkdir uses idempotent mkdir -p and may create parent directories",
        "files mkdir verifies the target path after mkdir, but the stat-mkdir-stat sequence is not atomic"
      ],
      result: {
        device_serial: "resolved-serial",
        requested: { remote_path: remotePath },
        before: { exists: false, entry: null },
        mkdir: {
          method: "device_mkdir",
          exit_code: 0,
          command_duration_ms: 4
        },
        after: {
          exists: true,
          entry: {
            kind: "directory",
            bytes: 3452,
            modified_unix_ms: 1_782_751_084_000
          }
        },
        created: true,
        verify: { policy: "directory_exists_after_mkdir", ok: true, attempts: 2 },
        semantics: "idempotent_directory_create_with_parents"
      },
      trace: {
        timeout_ms: 10_000,
        method: "device_mkdir",
        created: true,
        before_exists: false,
        after_exists: true
      }
    });
  });

  it("rejects files mkdir without explicit serial and redacts remote paths", async () => {
    const remotePath = "/data/local/tmp/private-dir";
    const driver = makeDriver([]);
    const io = makeIo();
    const exitCode = await runCli(["files", "mkdir", "--remote", remotePath], {
      io,
      requestIdFactory: () => "req-files-mkdir-no-serial",
      driverFactory: () => driver
    });

    expect(exitCode).toBe(2);
    expect(driver.statFile).not.toHaveBeenCalled();
    expect(driver.makeDirectory).not.toHaveBeenCalled();
    expect(io.stdoutText()).not.toContain(remotePath);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      ok: false,
      command: "files.mkdir",
      error: {
        code: "INVALID_REQUEST",
        message: "files mkdir requires explicit --serial"
      },
      trace: {
        argv: ["files", "mkdir", "--remote", "<redacted>"]
      }
    });
  });
});
