<!-- GENERATED FILE - do not edit. Source: docs/skill-src/app.md. Regenerate with: pnpm skill:gen -->

# autophone-cli — App Lifecycle, Inspection & Permissions

Use commands from the project root after `pnpm build`, or from package installation once published.

Agent command paths return one JSON envelope on stdout. Human help paths such as `--help`, `<command> --help`, and `help <command>` write help text to stderr, leave stdout empty, and exit 0. Human version paths using global `--version` or `-V` write the runtime version to stderr, leave stdout empty, and exit 0.

## When to Use

- Run `autophone app list` when the package name is unknown; treat `--filter` as substring matching.
- Use `autophone app inspect --package <package>` to check exact package presence or absence without parsing raw Package Manager output.
- Use `autophone app activities --package <package> --intent launcher` when launcher activity component discovery matters; do not treat an empty result as package absence.
- Use `autophone app package-info --package <package>` when active Package Manager metadata matters; use `autophone app links --package <package>` when global App Links domain verification state matters; use `autophone app appops get --package <package> --op <OP>` when one AppOps operation state matters.
- Use `autophone app pids --package <package>` when process presence matters; treat it as a point-in-time PID snapshot, not foreground state or health proof.
- Use `autophone app memory --package <package>` when a current process memory snapshot matters; treat it as point-in-time `dumpsys meminfo` evidence, not leak or sustained-usage proof.
- Use `autophone app graphics --package <package>` when rough frame/jank telemetry matters; treat it as point-in-time `dumpsys gfxinfo` summary evidence since stats reset, not sustained-performance proof.
- Use `autophone --serial <serial> app install --apk <path>` only when deploying one local APK; do not rely on implicit device selection for installs.
- Use `autophone --serial <serial> app uninstall --package <package> --confirm-package <package>` only for explicit app removal flows; do not rely on implicit device selection for uninstalls.
- Use `app permission inspect --package <package> --permission <permission>` to read one permission's Package Manager dump state; pass `--user` when verifying a non-zero Android user.
- Use `app permission grant` or `app permission revoke` only for one manifest-declared dangerous runtime permission and always pass explicit `--serial`.
- Use `app resolve-url --url` to inspect an http(s) ACTION_VIEW handler without starting it; use `app open-url --url` only when the URL should be sent to Activity Manager. Neither echoes the full URL.
- Use `app launch --package` for normal package-only startup; use `app start --package --activity` only when an explicit component is required.
- Use `app stop --package` before clean relaunch flows, and treat its default verification as foreground absence only.
- Use `app clear-data --package --confirm-package` only for explicit destructive app reset flows, and always pass an explicit `--serial`.

## Constraints

- app package listing is read-only; it preserves package-manager output order after de-duplication and accepts single-segment package names such as `android`.
- app list filters are safe substring filters, not exact package selectors.
- app inspect is read-only; it runs `pm path [--user <id>] <package>` and returns `installed:false` when Package Manager returns no `package:` path entries.
- app inspect accepts exact package names including single-segment installed packages such as `android`; package filters still belong to `app list`.
- app inspect returns device-side APK paths only and does not parse raw `dumpsys package`, package metadata, signatures, or installer state.
- app activities is read-only; it runs `cmd package query-activities --brief` for an intent preset and returns component strings only for the requested package.
- app activities currently supports `--intent launcher` only and does not start components, prove package installation/absence, prove per-user launchability, or parse a full manifest activity list.
- app package-info is read-only; it runs `dumpsys package <package>` and parses only the active block under `Packages:`.
- app package-info returns `installed:false` only for exact `Unable to find package: <package>` absence and must not read `Hidden system packages:`, permissions, signatures, per-user state, or raw dumps as public result fields.
- app package-info accepts exact installed package names including single-segment packages such as `android`; use it for bounded package metadata, not package discovery.
- app links is read-only; it runs `cmd package get-app-links <package>`, reports global App Links domain verification state only, treats package-unavailable output as `package_found:false`, and does not expose signatures, domain-verification IDs, or per-user link selection.
- app appops get is read-only; it runs `cmd appops get <package> <OP>` for one ordinary uppercase op, reports explicit UID/package entries or a default mode snapshot, and treats `lookup.status:"no_uid"` as no AppOps UID mapping in the queried user rather than package absence.
- app appops get rejects UID targets, numeric ops, `MIUIOP(...)` tokens, all-op dumps, and mutating appops commands; it reports AppOps state only, not runtime permission state or effective app behavior.
- app pids is read-only; it runs `pidof <package>` and returns `running:false` with an empty PID list when no current process exists.
- app pids uses stricter multi-segment package validation than app inspect and reports process presence only, not foreground state, health, or process stability.
- app memory is read-only; it runs `dumpsys meminfo <package>` and returns App Summary PSS/RSS/SWAP fields only when the MEMINFO process name matches `<package>` exactly, or `running:false` with null memory totals when no current process exists.
- app memory does not prove sustained memory usage, detect leaks, or aggregate every package remote process; use `app pids` first when process presence is the only question.
- app graphics is read-only; it runs plain `dumpsys gfxinfo <package>` without `framestats` or `reset`, parses only the bounded top frame summary when the Graphics info process name matches `<package>` exactly, and returns `running:false` with null graphics fields when no current process exists.
- app graphics does not prove sustained performance, diagnose jank root causes, or aggregate every package remote process; use it as rough triage evidence after a controlled interaction, not as an action success gate.
- `app current` reports the resolved target `device_serial`; app start/launch/open-url/stop and `wait app` embed that same current-app shape in `before`, `after`, or `current` and use the resolved serial in the response envelope.
- app install is mutating; it installs one readable, non-empty local `.apk`, requires explicit `--serial`, and does not support split APKs or AAB bundles.
- app install returns only APK metadata (`file_name`, `bytes`, `sha256`) and must not echo the host absolute APK path in stdout JSON or failure traces.
- `app install` success means adb returned a `Success` line; `adb_success` does not independently verify package identity, APK authenticity, or app launch readiness.
- `app install --apk` validates path shape and readability only; the caller remains responsible for trusting APK source, signing, and target compatibility.
- app uninstall is destructive; it removes one explicitly confirmed app package from an explicitly selected device or Android user context.
- app uninstall requires explicit `--serial`, requires `--confirm-package` to match `--package`, and refuses protected Android system packages before adb execution.
- app uninstall uses host `adb uninstall [--user <id>] <package>`; `--user` is optional and otherwise uninstalls for all users according to Android multi-user semantics.
- app uninstall intentionally does not expose `-k` / keep-data because current AOSP adb rejects that host option and points callers to shell-only package-manager commands.
- app uninstall success means adb returned a `Success` line with exit code 0; `adb_success` does not independently verify package absence, multi-user state, or rollback.
- app permission changes go through `app permission grant` or `app permission revoke`; they require explicit `--serial` and operate on one package/permission only.
- app permission commands are for manifest-declared dangerous runtime permissions; special permissions, appops, all-permissions, and permission flags are out of scope.
- app permission command success means `pm grant` or `pm revoke` completed; `pm_command_success` does not independently read back effective permission state.
- app permission inspect is read-only; it parses one target permission from `dumpsys package <package>` and defaults to Android user 0 when `--user` is omitted.
- app permission inspect reports Package Manager dump state only; it does not evaluate AppOps, legacy target-SDK behavior, runtime dialogs, or effective app behavior.
- app permission inspect returns `package_found:false` as a successful absent-package result, but malformed dumps and explicit user ids absent from parsed dump users fail with `APP_PERMISSION_INSPECT_FAILED`.
- package and permission validation are the shell-safety boundary for permission commands because `adb shell` is interpreted on device.
- package-only app startup goes through `app launch`; explicit activity startup goes through `app start`.
- App Links verification inspection goes through read-only `app links`; URL handler inspection goes through read-only `app resolve-url`; URL opening goes through `app open-url`. Only http(s) URL commands accept URLs, URL path/query/fragment are not echoed, and none proves page load.
- app shutdown goes through `app stop`; `foreground_absent` does not prove background process absence.
- app data reset goes through `app clear-data`; it is destructive, irreversible, requires explicit `--serial`, requires `--confirm-package` to match `--package`, and refuses protected Android system packages.
- `app clear-data` success means Package Manager returned `Success`; it does not provide rollback or prove higher-level account/session cleanup beyond Android app data clear.

## app current

```bash
node dist/cli/main.js app current
```

Returns one JSON envelope with:

- `command: "app.current"`
- `device.serial`
- `result.device_serial`
- `result.package`
- `result.activity`
- `result.focused`

If no device is attached, stdout should still be one JSON object with `error.code: "NO_DEVICE"`.

The same current-app result shape appears in `before`, `after`, or `current` fields for `app start`, `app launch`, `app open-url`, `app stop`, and `wait app`.

## app list

```bash
node dist/cli/main.js app list
node dist/cli/main.js app list --scope third-party --state enabled --filter example
node dist/cli/main.js app list --scope system --include-uninstalled
```

Rules:

- read-only package discovery command
- runs Android package manager listing through `pm list packages`
- `--scope` is `all`, `third-party`, or `system`; default is `all`
- `--state` is `all`, `enabled`, or `disabled`; default is `all`
- `--include-uninstalled` maps to package-manager uninstalled package inclusion
- `--filter` is a safe package-name substring filter, not exact matching
- filter characters are limited to letters, digits, dot, and underscore
- package names preserve package-manager output order after de-duplication
- single-segment package names such as `android` are valid list results even though `app launch` package validation is stricter
- multi-user package discovery is not modeled in this command

`app list` returns:

- `device_serial`
- `packages[]`
- `count`
- `scope`
- `state`
- `include_uninstalled`
- `filter`

Use this command before `app launch`, `app start`, `app stop`, or `wait app` when the package name is unknown.

## app inspect

```bash
node dist/cli/main.js app inspect --package "com.example.app"
node dist/cli/main.js --serial emulator-5554 app inspect --package "com.example.app" --user 0
node dist/cli/main.js app inspect --package "android"
```

Rules:

- read-only exact package presence query
- respects global `--serial`; without it, normal single-online-device resolution applies
- `--package` is required and must contain only safe Android package-name characters
- single-segment installed package names such as `android` are accepted because this command mirrors `app list` exact results
- `--user` is optional, must be a non-negative integer, and maps to Package Manager user routing
- runs Android Package Manager path lookup: `pm path [--user <id>] <package>`
- uses `package:` path lines as the presence signal
- one base APK plus split APKs can produce multiple `package:` lines
- empty stdout with no Package Manager error means `installed:false`, including the common absent-package case where `pm path` exits nonzero with no output
- known package-absence text such as unknown package, not installed, or not found also returns `installed:false`
- adb target failures still fail with device-level errors such as `NO_DEVICE`, `DEVICE_OFFLINE`, or `DEVICE_UNAUTHORIZED`
- malformed Package Manager output, invalid user errors, unknown options, or other non-absence Package Manager failures map to `APP_INSPECT_FAILED`
- device-side APK paths are returned as data; raw `dumpsys package` output, package metadata, signatures, installer state, and path contents are not parsed

`app inspect` returns:

- `device_serial`
- `requested.package_name`
- `requested.user_id`
- `installed`
- `paths[]`
- `path_count`
- `query.method: "pm_path"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "pm_path_presence"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`

Use this command after `app install` or `app uninstall` when the workflow needs a read-only package presence check. Use `app list --filter` when the package name is unknown.

## app activities

```bash
node dist/cli/main.js app activities --package "com.example.app"
node dist/cli/main.js --serial emulator-5554 app activities --package "com.example.app" --intent launcher
```

Rules:

- read-only intent-scoped activity component query
- respects global `--serial`; without it, normal single-online-device resolution applies
- `--package` is required and must contain only safe Android package-name characters
- `--intent` currently supports only `launcher`, meaning MAIN plus LAUNCHER
- runs `cmd package query-activities --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER <package>`
- returns only component strings parsed into package/activity fields for the requested package
- `No activities found` returns `found:false`, `activities:[]`, and `activity_count:0`
- empty activity results do not prove package absence, package installation state, or current-user launchability
- malformed query output, stderr, nonzero exit, mismatched component package, or unsupported command output maps to `APP_ACTIVITIES_FAILED`
- adb target failures still fail with device-level errors such as `NO_DEVICE`, `DEVICE_OFFLINE`, or `DEVICE_UNAUTHORIZED`
- the command does not start an activity, resolve user defaults, parse all manifest activities, parse permissions, or verify that `app start` will succeed

`app activities` returns:

- `device_serial`
- `requested.package_name`
- `requested.intent`
- `found`
- `activities[]`
- `activities[].component`
- `activities[].package_name`
- `activities[].activity`
- `activities[].relative_activity`
- `activity_count`
- `query.method: "cmd_package_query_activities"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "cmd_package_query_activities_parse"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`
- `semantics: "read_only_intent_activity_query_not_install_or_launchability_proof"`

Use this command when an agent needs a launcher component for a later explicit `app start --package --activity` call. Use `app inspect` or `app package-info` when the workflow needs package presence evidence.

## app package-info

```bash
node dist/cli/main.js app package-info --package "com.example.app"
node dist/cli/main.js --serial emulator-5554 app package-info --package "android"
```

Rules:

- read-only active package metadata query
- respects global `--serial`; without it, normal single-online-device resolution applies
- `--package` is required and must contain only safe Android package-name characters
- single-segment installed package names such as `android` are accepted because this command mirrors exact Package Manager package names
- runs `dumpsys package <package>`
- parses only the matching package block under the active `Packages:` section
- ignores `Hidden system packages:` blocks even when they repeat the same package name
- exact `Unable to find package: <package>` returns `installed:false` with `package:null`
- ambiguous absence, duplicate active blocks, malformed required fields, malformed bracket lists, stderr, or nonzero non-target output map to `APP_PACKAGE_INFO_FAILED`
- adb target failures still fail with device-level errors such as `NO_DEVICE`, `DEVICE_OFFLINE`, or `DEVICE_UNAUTHORIZED`
- raw Package Manager dumps, permissions, signatures, install/runtime permission state, and per-user install state are not returned

`app package-info` returns:

- `device_serial`
- `requested.package_name`
- `installed`
- `package` or `null`
- `package.package_name`
- `package.app_id`
- `package.code_path`
- `package.resource_path`
- `package.native_library_dir`
- `package.primary_cpu_abi`
- `package.secondary_cpu_abi`
- `package.cpu_abi_override`
- `package.version.code`
- `package.version.min_sdk`
- `package.version.target_sdk`
- `package.version.name`
- `package.splits[]`
- `package.flags[]`
- `package.private_flags[]`
- `package.timestamps.time_stamp`
- `package.timestamps.last_update_time`
- `package.installer.package_name`
- `package.installer.uid`
- `package.installer.initiating_package_name`
- `package.installer.originating_package_name`
- `package.package_source`
- `package.install_permissions_fixed`
- `package.apex_module_name`
- `query.method: "dumpsys_package"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "dumpsys_active_package_block"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`
- `semantics: "package_dump_active_block_not_hidden_not_permissions_not_signatures"`

Use this command when coarse package metadata such as version, paths, ABI, installer, or flags matters. Use `app permission inspect` for permission state and do not treat this command as signature, appops, user-install, or APK authenticity evidence.

## app links

```bash
node dist/cli/main.js app links --package "com.example.app"
node dist/cli/main.js --serial emulator-5554 app links --package "com.example.app"
```

Rules:

- read-only global Android App Links domain-verification query
- respects global `--serial`; without it, normal single-online-device resolution applies
- `--package` is required and must contain only safe Android package-name characters
- single-segment installed package names such as `android` are accepted because this command mirrors exact Package Manager package names
- runs `cmd package get-app-links <package>`
- parses only the requested package's `Domain verification state:` block
- exact `Error: package <package> unavailable` from Package Manager returns `package_found:false`, `domains:[]`, and does not fail
- existing packages with no reported domain-verification state return `package_found:true`, `domains:[]`, and `domain_count:0`
- known Android states are returned as `state.kind:"known"` with `code:null`
- numeric custom error states `>=1024` are returned as `state.kind:"custom_error"` with `code` set to the numeric value
- future nonnumeric state tokens are returned as `state.kind:"unknown"` with `code:null`
- malformed package blocks, malformed domain lines, duplicate domains, numeric custom states below `1024`, stderr other than exact package-unavailable output, or nonzero non-target output map to `APP_LINKS_FAILED`
- adb target failures still fail with device-level errors such as `NO_DEVICE`, `DEVICE_OFFLINE`, or `DEVICE_UNAUTHORIZED`
- signatures, domain-verification IDs, `User N:` sections, per-user link selection, URL resolution, URL opening, and network reachability are not returned or verified

`app links` returns:

- `device_serial`
- `requested.package_name`
- `package_found`
- `domains[]`
- `domains[].domain`
- `domains[].state.raw`
- `domains[].state.kind`
- `domains[].state.code`
- `domain_count`
- `query.method: "cmd_package_get_app_links"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "cmd_package_get_app_links_parse"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`
- `semantics: "read_only_global_domain_verification_state_not_url_resolution_or_per_user_selection_or_signatures"`

Use this command when a workflow needs package-scoped Android App Links verification evidence. Use `app resolve-url --url` for a specific URL handler and `app open-url --url` only when the workflow intentionally opens a URL.

## app appops get

```bash
node dist/cli/main.js app appops get --package "com.example.app" --op "CAMERA"
node dist/cli/main.js --serial emulator-5554 app appops get --package "com.example.app" --op "CAMERA" --user 0
```

Rules:

- read-only single-operation Android AppOps query
- respects global `--serial`; without it, normal single-online-device resolution applies
- `--package` is required and accepts exact installed package names, including single-segment names such as `android`
- `--op` is required and accepts only ordinary uppercase AppOps operation tokens such as `CAMERA`, `RECORD_AUDIO`, or `READ_CLIPBOARD`
- `--user` is optional; when omitted, the AppOps command's default user selection applies
- runs `cmd appops get [--user <id>] <package> <OP>`
- parses `Uid mode: <OP>: <mode>` as `scope:"uid"` and `<OP>: <mode>` as `scope:"package"` while preserving line order
- valid outputs with no explicit operation entries return `default_mode` from `Default mode: <mode>` and `entries:[]`
- known modes `allow`, `ignore`, `deny`, `default`, `foreground`, and `ask` use their raw mode as `mode.kind`; future mode strings are preserved as `mode.kind:"unknown"`
- `lookup.status:"no_uid"` means AppOps could not resolve a package UID in the queried user; it is not proof that the package is absent
- default-user `No UID for <package> in user <id>` returns success with `lookup.status:"no_uid"`, `default_mode:null`, and `entries:[]`
- explicit-user `No UID for <package> in user <id>`, unknown operation errors, stderr, nonzero exit, empty output, mixed error/data output, malformed entries, mismatched op names, malformed default-mode output, and malformed details map to `APP_OPS_FAILED`
- adb target failures still fail with device-level errors such as `NO_DEVICE`, `DEVICE_OFFLINE`, or `DEVICE_UNAUTHORIZED`
- UID targets, numeric ops, `MIUIOP(...)` tokens, all-op dumps, attribution tags, `set`, `reset`, `query-op`, and every mutating appops command are intentionally out of scope
- AppOps state is not runtime permission state, AppOps effectiveness, dialog state, app behavior, or a guarantee that the app can use the protected capability

`app appops get` returns:

- `device_serial`
- `requested.package_name`
- `requested.op_name`
- `requested.user_id`
- `lookup.status`
- `lookup.uid_resolved`
- `lookup.reason`
- `default_mode` or `null`
- `default_mode.raw`
- `default_mode.kind`
- `entries[]`
- `entries[].scope`
- `entries[].op_name`
- `entries[].mode.raw`
- `entries[].mode.kind`
- `entries[].details.time_raw`
- `entries[].details.reject_time_raw`
- `entries[].details.duration_raw`
- `entry_count`
- `query.method: "cmd_appops_get"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "cmd_appops_get_single_op_parse"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`
- `semantics: "read_only_appops_single_op_snapshot_not_runtime_permission_or_effective_behavior_proof"`

Use this command when one AppOps operation matters, especially for special or effective-gate diagnostics that are not represented by runtime permission grant state. Use `app permission inspect` for Package Manager runtime permission dump state, and do not infer package absence from `lookup.status:"no_uid"`.

## app pids

```bash
node dist/cli/main.js app pids --package "com.example.app"
node dist/cli/main.js --serial emulator-5554 app pids --package "com.example.app"
```

Rules:

- read-only process snapshot command
- respects global `--serial`; without it, normal single-online-device resolution applies
- `--package` is required and must be a safe multi-segment Android package name
- runs `pidof <package>`
- duplicate PIDs from device output are de-duplicated while preserving first-seen order
- empty stdout with no pidof-unavailable error returns `running:false`, `pids:[]`, and does not fail
- malformed PID tokens, unexpected stderr, pidof-unavailable output, or inconsistent nonzero PID output fail with `APP_PIDS_FAILED`
- adb target failures still fail with device-level errors such as `NO_DEVICE`, `DEVICE_OFFLINE`, or `DEVICE_UNAUTHORIZED`
- the result is a point-in-time process snapshot only; it does not prove foreground state, app health, or process stability

`app pids` returns:

- `device_serial`
- `package_name`
- `running`
- `pids[]`
- `pid_count`
- `query.method: "pidof"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "pidof_process_snapshot"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`
- `semantics: "read_only_pid_snapshot_not_process_liveness_guarantee"`

Use this command before log or lifecycle diagnostics when the workflow needs to know whether a package currently has a process without treating absence as a command failure. Use `app current` for foreground package/activity state and `logs dump` for bounded per-PID logcat evidence.

## app memory

```bash
node dist/cli/main.js app memory --package "com.example.app"
node dist/cli/main.js --serial emulator-5554 app memory --package "com.example.app"
```

Rules:

- read-only current-process memory snapshot command
- respects global `--serial`; without it, normal single-online-device resolution applies
- `--package` is required and must be a safe multi-segment Android package name
- runs `dumpsys meminfo <package>`
- parses only the MEMINFO header, App Summary rows, and TOTAL PSS/RSS/SWAP PSS fields
- `No process found for: <package>` returns `running:false`, `processes:[]`, null memory totals, and does not fail
- malformed MEMINFO output, unexpected stderr, nonzero exit, mismatched process name, or unsupported multiple process sections fail with `APP_MEMORY_FAILED`
- adb target failures still fail with device-level errors such as `NO_DEVICE`, `DEVICE_OFFLINE`, or `DEVICE_UNAUTHORIZED`
- the result is a point-in-time memory snapshot only; it does not prove sustained memory use, detect leaks, or aggregate every remote process for the package

`app memory` returns:

- `device_serial`
- `requested.package_name`
- `running`
- `processes[].pid`
- `processes[].process_name`
- `process_count`
- `memory.units: "kb"`
- `memory.totals.total_pss_kb`
- `memory.totals.total_rss_kb`
- `memory.totals.total_swap_pss_kb`
- `memory.app_summary.*.pss_kb`
- `memory.app_summary.*.rss_kb`
- `query.method: "dumpsys_meminfo"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "dumpsys_meminfo_app_summary_snapshot"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`
- `semantics: "read_only_memory_snapshot_point_in_time_not_sustained_usage_guarantee"`

Use this command when memory pressure or rough app footprint matters for a current process. Use `app pids` when you only need process presence, and do not compare memory snapshots as leak evidence without repeated external sampling and workload control.

## app graphics

```bash
node dist/cli/main.js app graphics --package "com.example.app"
node dist/cli/main.js --serial emulator-5554 app graphics --package "com.example.app"
```

Rules:

- read-only current-process graphics frame-summary command
- respects global `--serial`; without it, normal single-online-device resolution applies
- `--package` is required and must be a safe multi-segment Android package name
- runs plain `dumpsys gfxinfo <package>` only; it does not pass `framestats` or `reset`
- parses only the Graphics info header and bounded top frame summary before Pipeline/Profile/View/Memory detail sections
- `No process found for: <package>` returns `running:false`, `processes:[]`, null graphics fields, and does not fail
- malformed Graphics info output, unexpected stderr, nonzero exit, mismatched process name, or unsupported multiple process sections fail with `APP_GRAPHICS_FAILED`
- adb target failures still fail with device-level errors such as `NO_DEVICE`, `DEVICE_OFFLINE`, or `DEVICE_UNAUTHORIZED`
- `stats_since_ns` is a decimal string to avoid JavaScript safe-integer loss on long device uptime
- histograms are returned as capped structured buckets, not raw dump lines
- the result is a point-in-time/since-reset graphics summary only; it does not prove sustained performance, diagnose jank causes, or aggregate every remote process for the package

`app graphics` returns:

- `device_serial`
- `requested.package_name`
- `running`
- `processes[].pid`
- `processes[].process_name`
- `process_count`
- `graphics.stats_since_ns`
- `graphics.total_frames_rendered`
- `graphics.janky_frames.count`
- `graphics.janky_frames.percent`
- `graphics.janky_frames_legacy`
- `graphics.percentiles_ms.p50_ms`
- `graphics.percentiles_ms.p90_ms`
- `graphics.percentiles_ms.p95_ms`
- `graphics.percentiles_ms.p99_ms`
- `graphics.slow_counts.*`
- `graphics.frame_deadline_missed`
- `graphics.frame_deadline_missed_legacy`
- `graphics.histogram.buckets[].bucket_ms`
- `graphics.histogram.buckets[].count`
- `graphics.histogram.bucket_count`
- `graphics.histogram.truncated`
- `graphics.gpu.percentiles_ms`
- `graphics.gpu.histogram`
- `query.method: "dumpsys_gfxinfo"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "dumpsys_gfxinfo_frame_summary_snapshot"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`
- `semantics: "read_only_graphics_summary_since_last_reset_not_sustained_performance_guarantee"`

Use this command when rough frame/jank telemetry matters after a controlled interaction. Use `app memory` for process footprint, `app pids` for process presence, and do not treat one graphics snapshot as a pass/fail performance gate without repeated external sampling and workload control.

## app install

```bash
node dist/cli/main.js --serial emulator-5554 app install --apk ./app-debug.apk
node dist/cli/main.js --serial emulator-5554 app install --apk ./app-debug.apk --replace --grant-runtime-permissions --allow-test
node dist/cli/main.js --serial emulator-5554 app install --apk ./app-debug.apk --install-timeout 180000
```

Rules:

- mutating APK deployment command for one explicitly selected target device
- requires explicit global `--serial`; auto-selecting a single online device is intentionally not allowed
- `--apk` is required and must point to one readable, regular, non-empty local file with a `.apk` extension
- `.apk` extension validation is only a shape check, not APK authenticity, signature, or compatibility validation
- split APKs, APK sets, and AAB bundles are out of scope for this command
- computes local APK metadata before adb execution: `file_name`, `bytes`, and `sha256`
- stdout JSON and failure traces do not echo the host absolute APK path; use the returned metadata for evidence
- default behavior does not replace an existing package; pass `--replace` for adb install `-r`
- `--grant-runtime-permissions` maps to adb install `-g`
- `--allow-test` maps to adb install `-t`
- `--allow-downgrade` maps to adb install `-d`; Android only permits downgrades in supported/debuggable cases
- install flags are passed before the APK path
- `--install-timeout` defaults to `120000`; an explicit global `--timeout` is used only when `--install-timeout` is absent
- success requires adb install output to include a `Success` line
- `adb_success` does not independently verify post-install package identity, app launch readiness, or runtime permission state
- non-success install output maps to `APP_INSTALL_FAILED`; `failure_code` is populated for `INSTALL_FAILED_*` and `INSTALL_PARSE_FAILED_*` lines when available

`app install` returns:

- `device_serial`
- `requested.apk.file_name`
- `requested.apk.bytes`
- `requested.apk.sha256`
- `requested.replace`
- `requested.grant_runtime_permissions`
- `requested.allow_test`
- `requested.allow_downgrade`
- `install.method: "adb_install"`
- `install.exit_code`
- `install.command_duration_ms`
- `verify.policy: "adb_success"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`

Use this command before `app launch` when the workflow needs to deploy a local APK. Prefer `app stop` or `app clear-data` for already-installed app state management.

## app uninstall

```bash
node dist/cli/main.js --serial emulator-5554 app uninstall --package "com.example.app" --confirm-package "com.example.app"
node dist/cli/main.js --serial emulator-5554 app uninstall --package "com.example.app" --confirm-package "com.example.app" --user 10
node dist/cli/main.js --serial emulator-5554 app uninstall --package "com.example.app" --confirm-package "com.example.app" --uninstall-timeout 180000
```

Rules:

- destructive app removal command for one explicitly confirmed package
- requires explicit global `--serial`; auto-selecting a single online device is intentionally not allowed
- `--package` is required and must be a strict multi-segment Android package name
- `--confirm-package` is required and must exactly match `--package`
- package validation and confirmation happen before any adb call
- refuses protected Android system packages, including `com.android`, `com.android.*`, `com.google.android.gms`, `com.google.android.gms.*`, `com.google.android.gsf`, and `com.google.android.gsf.*`
- runs host adb uninstall: `adb -s <serial> uninstall [--user <id>] <package>`
- `--user` is optional, must be a non-negative integer, and maps to Android uninstall-for-user semantics
- omitting `--user` uninstalls for all users according to Android multi-user semantics
- `-k` / keep-data is intentionally not supported; current AOSP adb rejects host `adb uninstall -k` and points callers to shell-only package-manager commands
- `--uninstall-timeout` defaults to `120000`; an explicit global `--timeout` is used only when `--uninstall-timeout` is absent
- success requires adb uninstall output to include a trimmed line exactly equal to `Success` and exit code 0
- `adb_success` does not independently verify package absence, multi-user state, rollback, or future package-manager state
- non-success uninstall output maps to `APP_UNINSTALL_FAILED`; `failure_code` is populated for bracketed `DELETE_FAILED_*`, `INSTALL_FAILED_*`, and `INSTALL_PARSE_FAILED_*` lines when available

`app uninstall` returns:

- `device_serial`
- `requested.package_name`
- `requested.user_id`
- `uninstall.method: "adb_uninstall"`
- `uninstall.exit_code`
- `uninstall.command_duration_ms`
- `verify.policy: "adb_success"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`

Use this command after choosing the target device and package when a workflow needs to remove an installed app. Use `app clear-data` for destructive state reset without removing the package.

## app permission grant / revoke

```bash
node dist/cli/main.js --serial emulator-5554 app permission grant --package "com.example.app" --permission "android.permission.CAMERA"
node dist/cli/main.js --serial emulator-5554 app permission revoke --package "com.example.app" --permission "android.permission.CAMERA"
node dist/cli/main.js --serial emulator-5554 app permission grant --package "com.example.app" --permission "android.permission.POST_NOTIFICATIONS" --user 10
```

Rules:

- mutating runtime permission command for one explicitly selected target device
- requires explicit global `--serial`; auto-selecting a single online device is intentionally not allowed
- `--package` is required and must be a strict multi-segment Android package name
- `--permission` is required and must be a strict dotted Android permission name such as `android.permission.CAMERA`
- `--user` is optional; when omitted, Package Manager uses the device/default user context
- names reject whitespace and shell metacharacters because `adb shell` commands are interpreted by the device shell
- runs Android Package Manager: `pm grant [--user <id>] <package> <permission>` or `pm revoke [--user <id>] <package> <permission>`
- according to AOSP PackageManagerShellCommand help, grant/revoke are for permissions declared in the app manifest, runtime permissions with dangerous protection level, and apps targeting SDK greater than Lollipop MR1
- special permissions, appops, notification listener access, permission flags, reset-permissions, and `--all-permissions` are out of scope
- granting can bypass the app's runtime permission dialog; revoking can change or interrupt app behavior
- `pm_command_success` means the `pm grant` or `pm revoke` command completed; it does not read back effective permission state or prove app behavior changed
- package-not-installed, permission-not-declared, normal/non-runtime permission, invalid user, and Package Manager policy rejections map to `APP_PERMISSION_FAILED`

`app permission grant` and `app permission revoke` return:

- `device_serial`
- `requested.package_name`
- `requested.permission_name`
- `requested.operation`
- `requested.user_id`
- `permission.method: "pm_grant"` or `"pm_revoke"`
- `permission.exit_code`
- `permission.command_duration_ms`
- `verify.policy: "pm_command_success"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`

Use these commands after install or before app launch when a test workflow needs a specific dangerous runtime permission state. Use app UI flows for consent-dialog behavior; this command intentionally mutates permission state outside the app UI.

## app permission inspect

```bash
node dist/cli/main.js app permission inspect --package "com.example.app" --permission "android.permission.CAMERA"
node dist/cli/main.js --serial emulator-5554 app permission inspect --package "com.example.app" --permission "android.permission.CAMERA" --user 10
```

Rules:

- read-only permission-state query for one package and one permission
- respects global `--serial`; without it, normal single-online-device resolution applies
- `--package` is required and must be a strict multi-segment Android package name
- `--permission` is required and must be a strict dotted Android permission name
- `--user` is optional; when omitted, the inspected Android user is user 0, matching AOSP Package Manager's default `grant`/`revoke` user
- runs `dumpsys package <package>` and parses only the requested permission from requested, install, and per-user runtime permission sections
- returns `package_found:false` successfully when the package is absent, so agents can distinguish absence from parser failure
- explicit `--user` values absent from parsed dump user sections fail with `APP_PERMISSION_INSPECT_FAILED`
- when `--user` is omitted and user 0 is absent from parsed dump user sections, the command returns `permission.source: "unresolved_user"` and `permission.state: "unknown"` rather than guessing another user
- malformed dumps, nonzero empty dumpsys failures, and unparseable Package Manager failures map to `APP_PERMISSION_INSPECT_FAILED`
- `permission.state` is `granted`, `denied`, `not_requested`, or `unknown`
- `permission.source` explains which parsed section produced the state: `runtime`, `install`, `manifest_initial`, `not_requested`, `package_absent`, `unresolved_user`, or `unknown`
- `target_sdk` is best-effort dump metadata; legacy target-SDK and AppOps behavior are not evaluated
- this command reports Package Manager dump state only; it does not prove effective app behavior, appops state, dialog state, or policy side effects

`app permission inspect` returns:

- `device_serial`
- `requested.package_name`
- `requested.permission_name`
- `requested.user_id`
- `package_found`
- `package.target_sdk`
- `permission.state`
- `permission.granted`
- `permission.source`
- `permission.manifest_requested`
- `permission.available_user_ids`
- `permission.install.present`
- `permission.install.granted`
- `permission.install.flags`
- `permission.runtime.selected_user_id`
- `permission.runtime.user_present`
- `permission.runtime.present`
- `permission.runtime.granted`
- `permission.runtime.flags`
- `query.method: "dumpsys_package"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "dumpsys_permission_state"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`
- `semantics: "package_dump_permission_state_not_appops"`

Use this command after `app permission grant` or `app permission revoke` when the workflow needs a read-only Package Manager permission-state check. Pass the same `--user` used for mutation when verifying non-zero users.

## app clear-data

```bash
node dist/cli/main.js --serial emulator-5554 app clear-data --package "com.example.app" --confirm-package "com.example.app"
```

Rules:

- destructive and irreversible app reset command
- requires explicit global `--serial`; auto-selecting a single online device is intentionally not allowed
- `--package` is required and must be a strict multi-segment Android package name
- `--confirm-package` is required and must exactly match `--package`
- package validation and confirmation happen before any adb call
- refuses protected Android system packages, including `com.android.*`, `com.google.android.gms`, and `com.google.android.gsf`
- runs Android Package Manager clear: `pm clear <package>`
- only `exit_code: 0` with stdout exactly `Success` is treated as success
- `Failed`, `Error: ...`, empty output, nonzero exit, or any output other than exact `Success` fails with `APP_CLEAR_DATA_FAILED`
- success means Package Manager accepted the data clear; it does not uninstall the app, provide rollback, or prove higher-level account/session cleanup beyond Android app data clear

`app clear-data` returns:

- `requested.package_name`
- `clear.method: "pm_clear"`
- `clear.exit_code`
- `clear.command_duration_ms`
- `verify.policy: "package_manager_success"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`

Use this command only for explicit test reset flows after choosing the target device and package. Prefer `app stop` for non-destructive relaunch cleanup.

## app resolve-url

```bash
node dist/cli/main.js app resolve-url --url "https://example.com/path"
node dist/cli/main.js --serial emulator-5554 app resolve-url --url "https://example.com/path?token=secret"
```

Rules:

- read-only Package Manager query for one target device
- `--url` is required and must be `http` or `https`
- credentials, whitespace, control characters, non-URL strings, and schemes such as `file:`, `intent:`, and `javascript:` are rejected before adb calls
- the driver uses Android Package Manager: `cmd package resolve-activity --brief -a android.intent.action.VIEW -d <url>`
- the URL is quoted for the device shell before execution
- stdout JSON never echoes the full URL; path/query/fragment are reduced to booleans
- failed output and `trace.argv` redact the URL
- `resolution.type: "activity"` means Package Manager returned a concrete component
- `resolution.type: "resolver"` means Package Manager returned Android's system chooser, not a concrete app handler
- `resolution.type: "none"` means Package Manager reported no activity for the URL intent
- the result does not start an activity, prove user-default choice, prove launchability, prove network access, or prove content loading

`app resolve-url` returns:

- envelope `device.serial`
- `device_serial`
- `requested.scheme`
- `requested.hostname`
- `requested.port`
- `requested.path_present`
- `requested.query_present`
- `requested.fragment_present`
- `requested.url_length`
- `resolution.type`
- `resolution.component`
- `resolution.package`
- `resolution.activity`
- `resolution.is_system_resolver`
- `metadata.priority`; `metadata` is `null` when Package Manager does not print resolve metadata
- `metadata.preferred_order`
- `metadata.match.raw`
- `metadata.match.value`
- `metadata.specific_index`
- `metadata.is_default`
- `query.method: "cmd_package_resolve_activity"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "package_manager_resolve_activity_parse"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`
- `semantics: "read_only_url_intent_resolution_not_launchability_or_network_proof"`

Use this command before `app open-url` when a workflow needs to know whether Android would resolve an http(s) URL to a concrete activity, a chooser, or no handler without causing app state changes.

## app open-url

```bash
node dist/cli/main.js app open-url --url "https://example.com/path"
node dist/cli/main.js app open-url --url "https://example.com/path?token=secret" --verify none
```

Rules:

- `--url` is required and must be `http` or `https`.
- credentials, whitespace, control characters, non-URL strings, and schemes such as `file:`, `intent:`, and `javascript:` are rejected before adb calls.
- the driver uses Android Activity Manager: `am start -W -a android.intent.action.VIEW -d <url>`.
- the URL is quoted for the device shell before execution.
- stdout JSON never echoes the full URL; path/query/fragment are reduced to booleans.
- failed output and `trace.argv` redact the URL.
- default verification is `activity_manager_accepted`, which means Activity Manager accepted the `ACTION_VIEW` intent; it does not prove web content loaded.

`app open-url` returns:

- envelope `device.serial`
- `requested.scheme`
- `requested.hostname`
- `requested.port`
- `requested.path_present`
- `requested.query_present`
- `requested.fragment_present`
- `requested.url_length`
- `before.device_serial`, `before.package`, `before.activity`, `before.focused`
- `after.device_serial`, `after.package`, `after.activity`, `after.focused`; `after` is `null` when verification is `none`
- `open`
- `verify`

## app launch

```bash
node dist/cli/main.js app launch --package "com.example"
node dist/cli/main.js app launch --package "com.example" --verify none
```

Rules:

- `--package` is required.
- The package name must be a valid Android package identifier.
- The command uses Android monkey launcher selection: `monkey -p <package> -c android.intent.category.LAUNCHER 1`.
- Monkey command failures and no-launcher output map to `APP_LAUNCH_FAILED`.
- `launch.command_duration_ms` is the monkey subprocess duration, not app draw or readiness time.
- Default verification is `package_foreground`.
- Package foreground verification polls until global `--timeout` expires.
- If the requested package is already foreground, `package_foreground` verification can succeed without a foreground transition.
- Use `--verify none` only when the caller explicitly accepts no foreground verification.
- TV/leanback-only launchers and packages without a standard `LAUNCHER` entry are not resolved by this command.

`app launch` returns:

- envelope `device.serial`
- `requested.package_name`
- `before.device_serial`, `before.package`, `before.activity`, `before.focused`
- `after.device_serial`, `after.package`, `after.activity`, `after.focused`; `after` is `null` when verification is `none`
- `launch.method: "monkey"`
- `launch.exit_code`
- `launch.command_duration_ms`
- `verify`

## app start

```bash
node dist/cli/main.js app start --package "com.example" --activity ".MainActivity"
node dist/cli/main.js app start --package "com.example" --activity "com.example.MainActivity"
```

Rules:

- `--package` is required.
- `--activity` is required.
- Activity may be bare (`MainActivity`), relative (`.MainActivity`), or fully qualified.
- Bare activity names are normalized to `<package>.<activity>`.
- Inner-class activity names with `$` are allowed.
- For package-only launcher startup, use `app launch`.

Default verification:

```text
package_foreground
```

`app start` runs an explicit component through `am start -W -n`, then polls the foreground app until the requested package is foreground. It does not require exact foreground activity equality because splash, alias, and trampoline activities are common.

Use `--verify none` only when the caller explicitly accepts no foreground verification.

`app start` returns:

- envelope `device.serial`
- `requested.package_name`
- `requested.activity`
- `requested.normalized_activity`
- `requested.component`
- `before.device_serial`, `before.package`, `before.activity`, `before.focused`
- `after.device_serial`, `after.package`, `after.activity`, `after.focused`; `after` is `null` when verification is `none`
- `am_start`
- `verify`

## app stop

```bash
node dist/cli/main.js app stop --package "com.example"
node dist/cli/main.js app stop --package "com.example" --verify none
```

Rules:

- `--package` is required.
- The package name must be a valid Android package identifier.
- The command uses Android Activity Manager: `am force-stop <package>`.
- `APP_STOP_FAILED` means the `am force-stop` command itself failed or reported an error.
- `stop.command_duration_ms` is the `am force-stop` subprocess duration.
- Default verification is `foreground_absent`.
- `foreground_absent` verifies only that the requested package is not the current foreground package.
- If the requested package was already backgrounded, success does not prove the app had a running process or that every background process was observed to exit.
- Use `--verify none` only when the caller explicitly accepts no foreground verification.

`app stop` returns:

- envelope `device.serial`
- `requested.package_name`
- `before.device_serial`, `before.package`, `before.activity`, `before.focused`
- `after.device_serial`, `after.package`, `after.activity`, `after.focused`; `after` is `null` when verification is `none`
- `stop.method: "am_force_stop"`
- `stop.exit_code`
- `stop.command_duration_ms`
- `verify`
