# autophone-cli — Recipes, Media Evidence & Logs

Use commands from the project root after `pnpm build`, or from package installation once published.

Agent command paths return one JSON envelope on stdout. Human help paths such as `--help`, `<command> --help`, and `help <command>` write help text to stderr, leave stdout empty, and exit 0. Human version paths using global `--version` or `-V` write the runtime version to stderr, leave stdout empty, and exit 0.

## When to Use

- Use `logs dump --package` only when bounded diagnostic evidence is needed; treat returned log lines as sensitive and capped, not redacted.
- Use `run --recipe <json>` only for strict sequential recipes over the supported subset; recipes have no loops, branches, shell execution, or dataflow and abort on the first failed step unless configured otherwise.
- Add global `--proof-dir <dir>` when the caller needs a redacted manifest reference under `trace.proof`; `artifact_count` counts materialized bundle files including the manifest, while `manifest.artifacts` lists attached evidence artifacts and is empty in v0.3.
- Use `screenshot --output` when a visual artifact is needed; do not derive tap coordinates from it.
- Use `screenrecord --output --duration` only when bounded dynamic visual evidence is needed, always with explicit `--serial`; it records default-display video without audio.

## Constraints

- log diagnostics go through `logs dump`; it is read-only but may expose app secrets, so output is bounded but not redacted.
- use `app pids --package` before `logs dump --package` when the workflow needs to distinguish "package has no current process" from "log collection failed"; `logs dump` still fails with `APP_NOT_RUNNING` when no PID exists.
- `logs dump` resolves current process IDs with `pidof` and reads per-PID `logcat -d -t <lines> --pid <pid> -v threadtime` slices from `main`, `system`, and `crash`.
- `logs dump --lines` is a per-PID tail limit; sparse app logs can return fewer lines than requested, and multi-process output is grouped by PID.
- `logs dump` fails with `APP_NOT_RUNNING` when no current PID exists and `LOGS_UNAVAILABLE` when `pidof` or PID-filtered `logcat` is unavailable on the device.
- recipe commands are bounded sequential orchestration only; do not use them as a scripting language.
- screenshot commands write PNG bytes to files only; stdout remains JSON metadata including PNG pixel dimensions.
- screenshots are not a tap targeting source.
- screenshot dimensions are evidence metadata and must not be used to derive or scale tap coordinates.
- screenrecord commands write MP4 bytes to files only; stdout remains JSON metadata. They require explicit `--serial`, create a temporary device file under `/data/local/tmp`, and remove it best-effort.
- screenrecord records only the default display, records no audio, and does not prove per-frame completeness, app state, or semantic UI success.

## run recipe
<!-- covers: recipe-run -->

```bash
node dist/cli/main.js run --recipe recipe.json
```

Rules:

- recipe files use `recipe_version: "0.3"`
- supported actions are `find`, `wait_ui`, `wait_app`, `key_press`, `text_input`, `clipboard_set`, and `clipboard_get`
- execution is sequential only, with no loops, branches, shell execution, or dataflow
- default `on_error` is `abort`; `--continue-on-error` changes the top-level recipe policy to continue
- stdout redacts the recipe path and includes one result object with per-step results

## screenshot
<!-- covers: screenshot -->

```bash
node dist/cli/main.js screenshot --output "./artifacts/screen.png"
node dist/cli/main.js screenshot --output "./artifacts/screen.png" --overwrite
```

Rules:

- `--output` is required.
- stdout is a single JSON envelope with metadata only; PNG bytes are written to the output file.
- output paths are resolved to absolute paths in the result.
- parent directories are created after the PNG has been captured and validated.
- `width_px` and `height_px` are parsed from the PNG IHDR header.
- existing files fail with `OUTPUT_EXISTS` unless `--overwrite` is passed.
- invalid screencap bytes fail with `SCREENSHOT_INVALID` and do not create output directories.
- screenshots are for visual evidence, debugging, and reports; do not infer or scale tap coordinates from screenshots or screenshot dimensions.

`screenshot` returns:

- `device_serial`
- `output_path`
- `mime_type: "image/png"`
- `width_px`
- `height_px`
- `bytes`
- `sha256`
- `capture_duration_ms`
- `overwritten`

## screenrecord
<!-- covers: screenrecord -->

```bash
node dist/cli/main.js --serial emulator-5554 screenrecord --output "./artifacts/screen.mp4"
node dist/cli/main.js --serial emulator-5554 screenrecord --output "./artifacts/screen.mp4" --duration 3 --bit-rate 4000000 --size 1280x720
node dist/cli/main.js --serial emulator-5554 screenrecord --output "./artifacts/screen.mp4" --overwrite
```

Rules:

- explicit global `--serial` is required
- `--output` is required and resolves to an absolute path in the result
- `--duration` is seconds, default `5`, range `1..30`
- `--bit-rate` is optional positive bits per second, capped at `100000000`
- `--size` is optional `WIDTHxHEIGHT` with positive integer dimensions
- `--bugreport` enables Android screenrecord's bugreport overlay
- `--record-timeout` must be at least `duration_seconds * 1000 + 1000`; when omitted, autophone derives `duration_seconds * 1000 + 15000`
- `--pull-timeout` controls the adb pull phase; when omitted, it defaults to `120000`
- stdout is a single JSON envelope with metadata only; MP4 bytes are written to the output file
- existing files fail with `OUTPUT_EXISTS` unless `--overwrite` is passed
- the command records the default display only and records no audio
- Android `screenrecord` needs a device-side MP4 file; autophone records to a unique `/data/local/tmp/autophone-screenrecord-*.mp4`, pulls it to a same-directory host temp file, atomically finalizes the output, then removes the remote temp file best-effort
- cleanup failure does not fail an otherwise completed recording, but `result.cleanup.ok:false` and a warning report that a remote temp file may remain
- success means `screenrecord` exited 0, `adb pull` exited 0, and the host MP4 is a non-empty regular file
- success does not prove per-frame completeness, audio capture, app state, page load, animation completion, or semantic UI success
- target-device failures are classified before `SCREENRECORD_FAILED`
- screenrecord stdout/stderr, nonzero exit, unreadable/non-regular/empty host MP4, or oversized host MP4 fail with `SCREENRECORD_FAILED`

`screenrecord` returns:

- `device_serial`
- `output_path`
- `mime_type: "video/mp4"`
- `file_name`
- `bytes`
- `sha256`
- `overwritten`
- `requested.duration_seconds`
- `requested.bit_rate_bps`
- `requested.size`
- `requested.bugreport`
- `requested.display: "default"`
- `recording.method: "screenrecord"`
- `recording.exit_code`
- `recording.command_duration_ms`
- `transfer.method: "adb_pull"`
- `transfer.exit_code`
- `transfer.command_duration_ms`
- `cleanup.method: "device_rm"`
- `cleanup.attempted`
- `cleanup.ok`
- `cleanup.exit_code`
- `cleanup.command_duration_ms`
- `cleanup.error_code`
- `cleanup.reason`
- `verify.policy: "screenrecord_exit_pull_host_file"`
- `verify.ok: true`
- `verify.attempts: 3`
- `verify.reason`
- `semantics: "bounded_default_display_video_evidence_no_audio_or_frame_completeness_guarantee"`

## logs dump
<!-- covers: logs-dump -->

```bash
node dist/cli/main.js logs dump --package "com.example.app"
node dist/cli/main.js --serial emulator-5554 logs dump --package "com.example.app" --lines 50
```

Rules:

- read-only diagnostic command for one package's current running process IDs
- `--package` is required and must be a strict multi-segment Android package name
- `--lines` defaults to `200`, is capped at `1000`, and applies per PID
- resolves current PIDs with `pidof <package>`
- reads each dumped PID with `logcat -d -t <lines> --pid <pid> -v threadtime -b main,system,crash`
- returns process groups rather than a globally sorted merged stream
- output is capped by per-line and total-character limits before stdout JSON is written
- output is not redacted; log lines may contain tokens, URLs, personal data, or other secrets
- `APP_NOT_RUNNING` means no current PID was found for the package
- `LOGS_UNAVAILABLE` means `pidof`, PID-filtered `logcat`, or log access is unavailable or rejected on the target device
- an empty `processes[].lines` array can still be a successful result when the process is running but no matching lines are present in the bounded logcat tail

`logs dump` returns:

- `device_serial`
- `requested.package_name`
- `pid_selection.method: "pidof"`
- `pid_selection.all_pids`
- `pid_selection.dumped_pids`
- `pid_selection.total_pid_count`
- `pid_selection.dumped_pid_count`
- `pid_selection.truncated`
- `dump.method: "logcat_pid_tail"`
- `dump.format: "threadtime"`
- `dump.buffers`
- `dump.per_pid_line_limit`
- `dump.max_line_chars`
- `dump.max_total_chars`
- `dump.command_count` including one `pidof` command plus one `logcat` command per dumped PID
- `dump.command_duration_ms`
- `processes[].pid`
- `processes[].line_count`
- `processes[].lines`
- `processes[].truncated`
- `line_count`
- `truncated`
- `semantics: "per_pid_logcat_tail_then_global_cap"`

Use this command after a failed app/UI flow when bounded textual diagnostics are needed. Prefer `screenshot` for visual state and `observe` for structured UI state.
