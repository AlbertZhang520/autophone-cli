import { resolve } from "node:path";
import {
  AutophoneError,
  DoubleTapRequestSchema,
  DragRequestSchema,
  FindRequestSchema,
  LongPressRequestSchema,
  ScreenrecordRequestSchema,
  ScreenshotRequestSchema,
  ScrollRequestSchema,
  ScrollUntilRequestSchema,
  TapRequestSchema,
  createSuccessResponse
} from "../../contracts/index.js";
import {
  buildScreenrecordResult,
  doubleTap,
  drag,
  find,
  longPress,
  observe,
  screenrecord,
  screenshot,
  scroll,
  scrollUntil,
  tap
} from "../../core/index.js";
import type { CliRuntimeContext } from "../command-context.js";
import { writeJson } from "../json-writer.js";
import { inspectScreenrecordOutputFile } from "../file-inspection.js";
import {
  cleanupAtomicOutputTarget,
  createAtomicOutputTarget,
  finalizeAtomicOutputFile,
  writeBinaryFileAtomic
} from "../output-file.js";
import {
  buildPrefixedSelector,
  buildSelector,
  defaultScreenrecordRecordTimeoutMs,
  parseDragGesture,
  parseNonNegativeInt,
  parsePositiveInt,
  parseVerifyPolicy
} from "../options.js";

export function registerInteractionCommands(context: CliRuntimeContext): void {
  const { argv, program, io, requestId, startedAt, driverFactory, runDescriptor } = context;
  let commandName = "unknown";
  const setCurrentCommandName = (name: string): string => {
    context.setCommandName(name);
    return name;
  };

  program
    .command("observe")
    .description("capture a structured UI snapshot")
    .action(async () => {
      commandName = setCurrentCommandName("observe");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await observe(driver, {
        deviceSerial: globalOptions.serial,
        timeoutMs: globalOptions.timeout
      });
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.snapshot.device_serial },
          trace: { timeout_ms: globalOptions.timeout }
        })
      );
    });

  program
    .command("find")
    .description("return usable UI candidates from a fresh observation")
    .option("--text <text>", "exact node text")
    .option("--resource-id <resourceId>", "exact Android resource-id")
    .option("--content-desc <contentDesc>", "exact content-desc")
    .option("--class <className>", "exact class name")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("ui.find");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = FindRequestSchema.parse({
        selector: buildSelector(localOptions),
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await find(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          trace: {
            timeout_ms: globalOptions.timeout,
            candidate_semantics: "usable_bounds_only"
          }
        })
      );
    });

  program
    .command("tap")
    .description("tap exactly one UI node matched from a fresh observation")
    .option("--text <text>", "exact node text")
    .option("--resource-id <resourceId>", "exact Android resource-id")
    .option("--content-desc <contentDesc>", "exact content-desc")
    .option("--class <className>", "exact class name")
    .option("--candidate-index <index>", "candidate_index returned by a recent find command", parseNonNegativeInt)
    .option("--x <x>", "unsafe raw x coordinate", parseNonNegativeInt)
    .option("--y <y>", "unsafe raw y coordinate", parseNonNegativeInt)
    .option("--unsafe", "allow raw coordinates when --x and --y are present", false)
    .option("--verify <policy>", "verification policy: screen_changed or none", parseVerifyPolicy, "screen_changed")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("ui.tap");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const selector = buildSelector(localOptions);
      if ((localOptions.x === undefined) !== (localOptions.y === undefined)) {
        throw new AutophoneError({
          code: "INVALID_REQUEST",
          message: "raw coordinates require both --x and --y",
          retriable: false
        });
      }
      const rawPoint =
        localOptions.x !== undefined || localOptions.y !== undefined
          ? [localOptions.x, localOptions.y]
          : undefined;
      const request = TapRequestSchema.parse({
        selector,
        raw_point: rawPoint,
        candidate_index: localOptions.candidateIndex,
        allow_unsafe_raw_point: localOptions.unsafe,
        verify: localOptions.verify,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await tap(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.before.device_serial },
          warnings: request.verify === "none" ? ["tap verification was explicitly disabled"] : [],
          trace: {
            timeout_ms: globalOptions.timeout,
            coordinate_source:
              request.raw_point !== undefined
                ? "unsafe_raw_point"
                : request.candidate_index !== undefined
                  ? "tree_bounds_candidate_index"
                  : "tree_bounds",
            ...(request.candidate_index === undefined ? {} : { candidate_index: request.candidate_index })
          }
        })
      );
    });

  program
    .command("double-tap")
    .description("double-tap exactly one UI node matched from a fresh observation")
    .option("--text <text>", "exact node text")
    .option("--resource-id <resourceId>", "exact Android resource-id")
    .option("--content-desc <contentDesc>", "exact content-desc")
    .option("--class <className>", "exact class name")
    .option("--candidate-index <index>", "candidate_index returned by a recent find command", parseNonNegativeInt)
    .option("--x <x>", "unsafe raw x coordinate", parseNonNegativeInt)
    .option("--y <y>", "unsafe raw y coordinate", parseNonNegativeInt)
    .option("--unsafe", "allow raw coordinates when --x and --y are present", false)
    .option("--interval <ms>", "interval between taps in milliseconds, 40-300", parsePositiveInt, 80)
    .option("--verify <policy>", "verification policy: screen_changed or none", parseVerifyPolicy, "screen_changed")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("ui.double_tap");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const selector = buildSelector(localOptions);
      if ((localOptions.x === undefined) !== (localOptions.y === undefined)) {
        throw new AutophoneError({
          code: "INVALID_REQUEST",
          message: "raw coordinates require both --x and --y",
          retriable: false
        });
      }
      const rawPoint =
        localOptions.x !== undefined || localOptions.y !== undefined
          ? [localOptions.x, localOptions.y]
          : undefined;
      const request = DoubleTapRequestSchema.parse({
        selector,
        raw_point: rawPoint,
        candidate_index: localOptions.candidateIndex,
        allow_unsafe_raw_point: localOptions.unsafe,
        interval_ms: localOptions.interval,
        verify: localOptions.verify,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await doubleTap(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.before.device_serial },
          warnings:
            request.verify === "none"
              ? ["double-tap verification was explicitly disabled"]
              : ["screen_changed verification does not prove semantic double-tap success"],
          trace: {
            timeout_ms: globalOptions.timeout,
            coordinate_source:
              request.raw_point !== undefined
                ? "unsafe_raw_point"
                : request.candidate_index !== undefined
                  ? "tree_bounds_candidate_index"
                  : "tree_bounds",
            interval_ms: request.interval_ms,
            ...(request.candidate_index === undefined ? {} : { candidate_index: request.candidate_index })
          }
        })
      );
    });

  program
    .command("long-press")
    .description("long-press exactly one UI node matched from a fresh observation")
    .option("--text <text>", "exact node text")
    .option("--resource-id <resourceId>", "exact Android resource-id")
    .option("--content-desc <contentDesc>", "exact content-desc")
    .option("--class <className>", "exact class name")
    .option("--candidate-index <index>", "candidate_index returned by a recent find command", parseNonNegativeInt)
    .option("--x <x>", "unsafe raw x coordinate", parseNonNegativeInt)
    .option("--y <y>", "unsafe raw y coordinate", parseNonNegativeInt)
    .option("--unsafe", "allow raw coordinates when --x and --y are present", false)
    .option("--duration <ms>", "press duration in milliseconds, 500-5000", parsePositiveInt, 800)
    .option("--verify <policy>", "verification policy: screen_changed or none", parseVerifyPolicy, "screen_changed")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("ui.long_press");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const selector = buildSelector(localOptions);
      if ((localOptions.x === undefined) !== (localOptions.y === undefined)) {
        throw new AutophoneError({
          code: "INVALID_REQUEST",
          message: "raw coordinates require both --x and --y",
          retriable: false
        });
      }
      const rawPoint =
        localOptions.x !== undefined || localOptions.y !== undefined
          ? [localOptions.x, localOptions.y]
          : undefined;
      const request = LongPressRequestSchema.parse({
        selector,
        raw_point: rawPoint,
        candidate_index: localOptions.candidateIndex,
        allow_unsafe_raw_point: localOptions.unsafe,
        duration_ms: localOptions.duration,
        verify: localOptions.verify,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await longPress(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.before.device_serial },
          warnings:
            request.verify === "none"
              ? ["long press verification was explicitly disabled"]
              : [],
          trace: {
            timeout_ms: globalOptions.timeout,
            coordinate_source:
              request.raw_point !== undefined
                ? "unsafe_raw_point"
                : request.candidate_index !== undefined
                  ? "tree_bounds_candidate_index"
                  : "tree_bounds",
            gesture: "input_swipe_same_point",
            duration_ms: result.duration_ms,
            ...(request.candidate_index === undefined ? {} : { candidate_index: request.candidate_index })
          }
        })
      );
    });

  program
    .command("drag")
    .description("drag from one UI node center to another using safe bounds-derived points")
    .option("--from-text <text>", "source exact node text")
    .option("--from-resource-id <resourceId>", "source exact Android resource-id")
    .option("--from-content-desc <contentDesc>", "source exact content-desc")
    .option("--from-class <className>", "source exact class name")
    .option("--from-candidate-index <index>", "source candidate_index returned by a recent find command", parseNonNegativeInt)
    .option("--to-text <text>", "destination exact node text")
    .option("--to-resource-id <resourceId>", "destination exact Android resource-id")
    .option("--to-content-desc <contentDesc>", "destination exact content-desc")
    .option("--to-class <className>", "destination exact class name")
    .option("--to-candidate-index <index>", "destination candidate_index returned by a recent find command", parseNonNegativeInt)
    .option("--gesture <gesture>", "gesture backend: draganddrop or swipe", parseDragGesture, "draganddrop")
    .option("--duration <ms>", "gesture duration in milliseconds, 100-10000", parsePositiveInt, 1000)
    .option("--verify <policy>", "verification policy: screen_changed or none", parseVerifyPolicy, "none")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("ui.drag");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = DragRequestSchema.parse({
        from_selector: buildPrefixedSelector(localOptions, "from"),
        to_selector: buildPrefixedSelector(localOptions, "to"),
        from_candidate_index: localOptions.fromCandidateIndex,
        to_candidate_index: localOptions.toCandidateIndex,
        gesture: localOptions.gesture,
        duration_ms: localOptions.duration,
        verify: localOptions.verify,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await drag(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.before.device_serial },
          warnings:
            request.verify === "none"
              ? ["drag verification is disabled; use --verify screen_changed only when a visible change is expected"]
              : ["screen_changed verification does not prove semantic drag-and-drop success"],
          trace: {
            timeout_ms: request.timeout_ms,
            coordinate_source: "tree_bounds",
            gesture: request.gesture,
            duration_ms: result.duration_ms,
            ...(request.from_candidate_index === undefined ? {} : { from_candidate_index: request.from_candidate_index }),
            ...(request.to_candidate_index === undefined ? {} : { to_candidate_index: request.to_candidate_index })
          }
        })
      );
    });

  program
    .command("scroll")
    .description("scroll by deriving a safe swipe gesture from the current window size or a scoped element")
    .requiredOption("--direction <direction>", "content direction: down, up, left, or right")
    .option("--amount <amount>", "scroll amount: small, medium, or large", "medium")
    .option("--duration <ms>", "swipe duration in milliseconds, 100-2000", parsePositiveInt, 300)
    .option("--verify <policy>", "verification policy: screen_changed or none", parseVerifyPolicy, "none")
    .option("--within-text <text>", "scroll inside the uniquely matched node with exact text")
    .option("--within-resource-id <resourceId>", "scroll inside the uniquely matched node with exact Android resource-id")
    .option("--within-content-desc <contentDesc>", "scroll inside the uniquely matched node with exact content-desc")
    .option("--within-class <className>", "scroll inside the uniquely matched node with exact class name")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("ui.scroll");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = ScrollRequestSchema.parse({
        direction: localOptions.direction,
        amount: localOptions.amount,
        within: buildPrefixedSelector(localOptions, "within"),
        duration_ms: localOptions.duration,
        verify: localOptions.verify,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await scroll(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.before.device_serial },
          warnings:
            request.verify === "none"
              ? ["scroll verification is disabled; use --verify screen_changed only when movement is expected"]
              : [],
          trace: {
            timeout_ms: globalOptions.timeout,
            coordinate_source: result.scope === "element" ? "tree_bounds" : "window_size_derived",
            scope: result.scope,
            direction: result.direction,
            amount: result.amount,
            finger_direction: result.finger_direction,
            duration_ms: result.duration_ms,
            ...(result.within === null ? {} : { within_candidate_index: result.within.candidate.candidate_index })
          }
        })
      );
    });

  program
    .command("scroll-until")
    .description("scroll in one content direction until a selector becomes visible")
    .requiredOption("--direction <direction>", "content direction: down, up, left, or right")
    .option("--amount <amount>", "scroll amount: small, medium, or large", "medium")
    .option("--max-scrolls <count>", "maximum scroll gestures to send, 1-25", parseNonNegativeInt, 10)
    .option("--duration <ms>", "swipe duration in milliseconds, 100-2000", parsePositiveInt, 300)
    .option("--text <text>", "exact node text")
    .option("--resource-id <resourceId>", "exact Android resource-id")
    .option("--content-desc <contentDesc>", "exact content-desc")
    .option("--class <className>", "exact class name")
    .option("--within-text <text>", "scroll inside the uniquely matched node with exact text")
    .option("--within-resource-id <resourceId>", "scroll inside the uniquely matched node with exact Android resource-id")
    .option("--within-content-desc <contentDesc>", "scroll inside the uniquely matched node with exact content-desc")
    .option("--within-class <className>", "scroll inside the uniquely matched node with exact class name")
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("ui.scroll_until");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const request = ScrollUntilRequestSchema.parse({
        selector: buildSelector(localOptions),
        direction: localOptions.direction,
        amount: localOptions.amount,
        within: buildPrefixedSelector(localOptions, "within"),
        max_scrolls: localOptions.maxScrolls,
        duration_ms: localOptions.duration,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const result = await scrollUntil(driver, request);
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: result.found ? [] : [`selector not found: ${result.reason}`],
          trace: {
            timeout_ms: request.timeout_ms,
            coordinate_source: result.scope === "element" ? "tree_bounds" : "window_size_derived",
            scope: result.scope,
            direction: result.direction,
            amount: result.amount,
            max_scrolls: result.max_scrolls,
            scrolls: result.scrolls,
            reason: result.reason,
            ...(result.last_scroll?.within_candidate === undefined || result.last_scroll.within_candidate === null
              ? {}
              : { within_candidate_index: result.last_scroll.within_candidate.candidate_index })
          }
        })
      );
    });

  program
    .command("screenshot")
    .description("capture a PNG screenshot to a file and return JSON metadata")
    .requiredOption("--output <path>", "local PNG output path")
    .option("--overwrite", "replace the output file if it already exists", false)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("screenshot");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      const parsedRequest = ScreenshotRequestSchema.parse({
        output_path: localOptions.output,
        overwrite: localOptions.overwrite,
        timeout_ms: globalOptions.timeout,
        device_serial: globalOptions.serial
      });
      const request = {
        ...parsedRequest,
        output_path: resolve(parsedRequest.output_path)
      };
      const driver = driverFactory({ adbPath: globalOptions.adb });
      const capture = await screenshot(driver, request);
      const writeResult = await writeBinaryFileAtomic(request.output_path, capture.png, { overwrite: request.overwrite });
      const { png: _png, ...metadata } = capture;
      const result = { ...metadata, overwritten: writeResult.overwritten };
      writeJson(
        io,
        createSuccessResponse({
          command: commandName,
          requestId,
          startedAt,
          result,
          device: { serial: result.device_serial },
          warnings: writeResult.overwritten ? ["screenshot output file was overwritten"] : [],
          trace: { timeout_ms: globalOptions.timeout }
        })
      );
    });

  program
    .command("screenrecord")
    .description("record a bounded MP4 screen video to a file and return JSON metadata")
    .requiredOption("--output <path>", "local MP4 output path")
    .option("--duration <seconds>", "recording duration in seconds, 1-30", parsePositiveInt)
    .option("--bit-rate <bps>", "screenrecord video bit rate in bits per second", parsePositiveInt)
    .option("--size <WIDTHxHEIGHT>", "screenrecord video size")
    .option("--bugreport", "add Android screenrecord bugreport overlay", false)
    .option("--overwrite", "replace the output file if it already exists", false)
    .option("--record-timeout <ms>", "screenrecord adb call timeout in milliseconds", parsePositiveInt)
    .option("--pull-timeout <ms>", "adb pull timeout in milliseconds", parsePositiveInt)
    .action(async (localOptions) => {
      commandName = setCurrentCommandName("screenrecord");
      const globalOptions = program.opts<{ adb?: string; serial?: string; timeout: number }>();
      if (globalOptions.serial === undefined) {
        throw new AutophoneError({
          code: "INVALID_REQUEST",
          message: "screenrecord requires explicit --serial",
          retriable: false
        });
      }
      const durationSeconds = localOptions.duration ?? 5;
      const globalTimeoutFromCli = program.getOptionValueSource("timeout") === "cli";
      const parsedRequest = ScreenrecordRequestSchema.parse({
        output_path: localOptions.output,
        overwrite: localOptions.overwrite,
        duration_seconds: durationSeconds,
        bit_rate_bps: localOptions.bitRate,
        size: localOptions.size,
        bugreport: localOptions.bugreport,
        record_timeout_ms:
          localOptions.recordTimeout ??
          (globalTimeoutFromCli ? globalOptions.timeout : defaultScreenrecordRecordTimeoutMs(durationSeconds)),
        pull_timeout_ms: localOptions.pullTimeout ?? (globalTimeoutFromCli ? globalOptions.timeout : 120_000),
        device_serial: globalOptions.serial
      });
      const request = {
        ...parsedRequest,
        output_path: resolve(parsedRequest.output_path)
      };
      const target = await createAtomicOutputTarget(request.output_path, { overwrite: request.overwrite });
      let finalized = false;
      try {
        const capture = await screenrecord(driverFactory({ adbPath: globalOptions.adb }), request, target.tempPath);
        const output = await inspectScreenrecordOutputFile(target.tempPath, request.output_path);
        const writeResult = await finalizeAtomicOutputFile(target);
        finalized = true;
        const result = buildScreenrecordResult(capture, {
          output_path: request.output_path,
          ...output,
          overwritten: writeResult.overwritten
        });
        writeJson(
          io,
          createSuccessResponse({
            command: commandName,
            requestId,
            startedAt,
            result,
            device: { serial: result.device_serial },
            warnings: [
              "screenrecord captures potentially sensitive on-screen content and records no audio",
              "screenrecord writes a temporary MP4 to device storage and removes it best-effort",
              ...(result.cleanup.ok ? [] : ["screenrecord remote temp cleanup failed; device storage may contain a leftover MP4"]),
              ...(writeResult.overwritten ? ["screenrecord output file was overwritten"] : [])
            ],
            trace: {
              duration_seconds: request.duration_seconds,
              record_timeout_ms: request.record_timeout_ms,
              pull_timeout_ms: request.pull_timeout_ms,
              cleanup_timeout_ms: request.cleanup_timeout_ms,
              output_bytes: result.bytes,
              cleanup_ok: result.cleanup.ok
            }
          })
        );
      } finally {
        if (!finalized) {
          await cleanupAtomicOutputTarget(target);
        }
      }
    });


}
