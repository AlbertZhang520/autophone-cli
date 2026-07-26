import { resolve } from "node:path";
import {
  AutophoneError,
  FileCopyRequestSchema,
  FileHashRequestSchema,
  FileListRequestSchema,
  FileMkdirRequestSchema,
  FileMoveRequestSchema,
  FilePullRequestSchema,
  FilePushRequestSchema,
  FileRmRequestSchema,
  FileStatRequestSchema,
  createSuccessResponse
} from "../../contracts/index.js";
import {
  buildFilePullResult,
  copyFile,
  hashFile,
  listFiles,
  makeDirectory,
  moveFile,
  pullFile,
  pushFile,
  removeFile,
  statFile
} from "../../core/index.js";
import type { CliRuntimeContext } from "../command-context.js";
import { writeJson } from "../json-writer.js";
import { inspectLocalTransferFile, inspectPulledOutputFile } from "../file-inspection.js";
import { cleanupAtomicOutputTarget, createAtomicOutputTarget, finalizeAtomicOutputFile } from "../output-file.js";
import { parseFileTransferCompression, parseFileTransferCompressionOptions, parsePositiveInt } from "../options.js";

export function registerFileCommands(context: CliRuntimeContext): void {
  const { argv, program, io, requestId, startedAt, driverFactory, runDescriptor } = context;
  let commandName = "unknown";
  const setCurrentCommandName = (name: string): string => {
    context.setCommandName(name);
    return name;
  };

  const files = program.command("files").description("transfer regular files between host and Android device");

  files
    .command("push")
    .description("push one local regular file to an explicitly selected Android device path")
    .requiredOption("--local <path>", "local regular file to push")
    .requiredOption("--remote <path>", "absolute Android device destination path")
    .option("--compression <algorithm>", "adb compression: any, none, brotli, lz4, or zstd", parseFileTransferCompression)
    .option("--no-compression", "disable adb compression negotiation")
    .option("--push-timeout <ms>", "file push timeout in milliseconds", parsePositiveInt)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("files.push");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      if (globalOptions.serial === undefined) {
        throw new AutophoneError({
          code: "INVALID_REQUEST",
          message: "files push requires explicit --serial",
          retriable: false
        });
      }
      const localFile = await inspectLocalTransferFile(localOptions.local);
      const timeoutMs =
        localOptions.pushTimeout ??
        (program.getOptionValueSource("timeout") === "cli" ? globalOptions.timeout : undefined);
      const request = FilePushRequestSchema.parse({
        local_path: localFile.path,
        local_file: localFile.metadata,
        remote_path: localOptions.remote,
        compression: parseFileTransferCompressionOptions(argv, localOptions),
        timeout_ms: timeoutMs,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await pushFile(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "files push writes to the target device and may leave a partial remote file if interrupted",
            "adb_exit_success does not independently verify remote file contents"
          ],
          trace: {
            push_timeout_ms: request.timeout_ms,
            method: result.transfer.method,
            compression: request.compression,
            local_bytes: request.local_file.bytes
          }
        })
      );
    });

  files
    .command("pull")
    .description("pull one Android device file to a local path atomically")
    .requiredOption("--remote <path>", "absolute Android device source path")
    .requiredOption("--output <path>", "local output file path")
    .option("--overwrite", "replace the output file if it already exists", false)
    .option("--compression <algorithm>", "adb compression: any, none, brotli, lz4, or zstd", parseFileTransferCompression)
    .option("--no-compression", "disable adb compression negotiation")
    .option("--pull-timeout <ms>", "file pull timeout in milliseconds", parsePositiveInt)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("files.pull");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      if (globalOptions.serial === undefined) {
        throw new AutophoneError({
          code: "INVALID_REQUEST",
          message: "files pull requires explicit --serial",
          retriable: false
        });
      }
      const timeoutMs =
        localOptions.pullTimeout ??
        (program.getOptionValueSource("timeout") === "cli" ? globalOptions.timeout : undefined);
      const parsedRequest = FilePullRequestSchema.parse({
        remote_path: localOptions.remote,
        output_path: localOptions.output,
        overwrite: localOptions.overwrite,
        compression: parseFileTransferCompressionOptions(argv, localOptions),
        timeout_ms: timeoutMs,
        device_serial: globalOptions.serial
      });
      const request = {
        ...parsedRequest,
        output_path: resolve(parsedRequest.output_path)
      };
      const target = await createAtomicOutputTarget(request.output_path, { overwrite: request.overwrite });
      let finalized = false;
      try {
        const transfer = await pullFile(driverFactory({ adbPath: globalOptions.adb }), request, target.tempPath);
        const output = await inspectPulledOutputFile(target.tempPath, request.output_path);
        const writeResult = await finalizeAtomicOutputFile(target);
        finalized = true;
        const result = buildFilePullResult(transfer, { ...output, overwritten: writeResult.overwritten });
        writeJson(
          io,
          createSuccessResponse({
            command: commandName,
            requestId,
            startedAt,
            result,
            device: { serial: result.device_serial },
            warnings: [
              ...(writeResult.overwritten ? ["files pull output file was overwritten"] : []),
              "adb_exit_success does not independently verify remote file contents"
            ],
            trace: {
              pull_timeout_ms: request.timeout_ms,
              method: result.transfer.method,
              compression: request.compression,
              output_bytes: result.output.bytes
            }
          })
        );
      } finally {
        if (!finalized) {
          await cleanupAtomicOutputTarget(target);
        }
      }
    });

  files
    .command("stat")
    .description("read metadata for one Android device path")
    .requiredOption("--remote <path>", "absolute Android device path to stat")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("files.stat");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = FileStatRequestSchema.parse({
        remote_path: localOptions.remote,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await statFile(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "files stat is a single-path metadata probe; it does not list directory contents or follow symbolic links"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            method: result.query.method,
            exists: result.exists
          }
        })
      );
    });

  files
    .command("hash")
    .description("read a content digest for one Android device regular file")
    .requiredOption("--remote <path>", "absolute Android device regular file path to hash")
    .option("--algorithm <algorithm>", "digest algorithm: sha256 or md5")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("files.hash");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = FileHashRequestSchema.parse({
        remote_path: localOptions.remote,
        algorithm: localOptions.algorithm,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await hashFile(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "files hash is read-only and computes a digest only for existing regular files; missing or non-regular targets return hash:null",
            "files hash uses a non-atomic stat-hash sequence; md5 is not a security digest"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            algorithm: request.algorithm,
            target_exists: result.target.exists,
            target_kind: result.target.entry?.kind ?? null,
            hashed: result.hashed,
            method: result.hash?.method ?? null
          }
        })
      );
    });

  files
    .command("list")
    .description("list direct children of one Android device directory")
    .requiredOption("--remote <path>", "absolute Android device directory path to list")
    .option("--max-entries <count>", "maximum direct children to return", parsePositiveInt)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("files.list");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = FileListRequestSchema.parse({
        remote_path: localOptions.remote,
        max_entries: localOptions.maxEntries,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await listFiles(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "files list is a bounded, non-recursive direct-child listing; it does not read file contents"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            max_entries: request.max_entries,
            target_exists: result.target.exists,
            listed: result.list !== null,
            count: result.list?.count ?? 0,
            truncated: result.list?.truncated ?? false
          }
        })
      );
    });

  files
    .command("mkdir")
    .description("create one Android device directory path idempotently")
    .requiredOption("--remote <path>", "absolute Android device directory path to create")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("files.mkdir");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      if (globalOptions.serial === undefined) {
        throw new AutophoneError({
          code: "INVALID_REQUEST",
          message: "files mkdir requires explicit --serial",
          retriable: false
        });
      }
      const request = FileMkdirRequestSchema.parse({
        remote_path: localOptions.remote,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await makeDirectory(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "files mkdir uses idempotent mkdir -p and may create parent directories",
            "files mkdir verifies the target path after mkdir, but the stat-mkdir-stat sequence is not atomic"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            method: result.mkdir.method,
            created: result.created,
            before_exists: result.before.exists,
            after_exists: result.after.exists
          }
        })
      );
    });

  files
    .command("copy")
    .description("copy one regular Android device file without overwriting")
    .requiredOption("--source <path>", "absolute Android device source file path")
    .requiredOption("--dest <path>", "absolute Android device destination file path")
    .option("--copy-timeout <ms>", "file copy timeout in milliseconds", parsePositiveInt)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("files.copy");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      if (globalOptions.serial === undefined) {
        throw new AutophoneError({
          code: "INVALID_REQUEST",
          message: "files copy requires explicit --serial",
          retriable: false
        });
      }
      const timeoutMs =
        localOptions.copyTimeout ??
        (program.getOptionValueSource("timeout") === "cli" ? globalOptions.timeout : undefined);
      const request = FileCopyRequestSchema.parse({
        source_path: localOptions.source,
        dest_path: localOptions.dest,
        timeout_ms: timeoutMs,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await copyFile(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "files copy writes one destination regular file and leaves the source path in place",
            "files copy uses cp -n -T and refuses existing destinations, but the stat-stat-cp-stat-stat sequence is not atomic",
            "files copy verifies source preservation plus destination byte metadata, not content integrity"
          ],
          trace: {
            copy_timeout_ms: request.timeout_ms,
            method: result.copy.method,
            copied: result.copied,
            source_kind: result.before_source.entry?.kind ?? null,
            dest_kind: result.after_dest.entry?.kind ?? null
          }
        })
      );
    });

  files
    .command("move")
    .description("move one non-directory Android device path without overwriting")
    .requiredOption("--source <path>", "absolute Android device path to move")
    .requiredOption("--dest <path>", "absolute Android device destination path")
    .requiredOption("--confirm-source <path>", "must exactly match --source")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("files.move");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      if (globalOptions.serial === undefined) {
        throw new AutophoneError({
          code: "INVALID_REQUEST",
          message: "files move requires explicit --serial",
          retriable: false
        });
      }
      const request = FileMoveRequestSchema.parse({
        source_path: localOptions.source,
        dest_path: localOptions.dest,
        confirm_source: localOptions.confirmSource,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await moveFile(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "files move removes the source path after moving one regular file or symlink",
            "files move refuses existing destinations but the stat-stat-mv-stat-stat sequence is not atomic",
            "files move verifies source absence plus destination kind and byte metadata, not content integrity"
          ],
          trace: {
            timeout_ms: request.timeout_ms,
            method: result.move.method,
            moved: result.moved,
            source_kind: result.before_source.entry?.kind ?? null,
            dest_kind: result.after_dest.entry?.kind ?? null
          }
        })
      );
    });

  files
    .command("rm")
    .description("remove one non-directory Android device path after explicit confirmation")
    .requiredOption("--remote <path>", "absolute Android device path to remove")
    .requiredOption("--confirm-remote <path>", "must exactly match --remote")
    .option("--missing-ok", "treat an already-missing device path as success", false)
    .option("--rm-timeout <ms>", "file remove timeout in milliseconds", parsePositiveInt)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("files.rm");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      if (globalOptions.serial === undefined) {
        throw new AutophoneError({
          code: "INVALID_REQUEST",
          message: "files rm requires explicit --serial",
          retriable: false
        });
      }
      const timeoutMs =
        localOptions.rmTimeout ??
        (program.getOptionValueSource("timeout") === "cli" ? globalOptions.timeout : undefined);
      const request = FileRmRequestSchema.parse({
        remote_path: localOptions.remote,
        confirm_remote: localOptions.confirmRemote,
        missing_ok: localOptions.missingOk,
        timeout_ms: timeoutMs,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await removeFile(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: [
            "files rm deletes one non-directory device path and cannot be undone",
            "files rm verifies absence after deletion, but the stat-rm-stat sequence is not atomic"
          ],
          trace: {
            rm_timeout_ms: request.timeout_ms,
            method: result.remove.method,
            removed: result.removed,
            missing_ok: request.missing_ok
          }
        })
      );
    });


}
