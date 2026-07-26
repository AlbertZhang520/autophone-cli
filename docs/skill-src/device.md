# autophone-cli — Device State & Settings

Use commands from the project root after `pnpm build`, or from package installation once published.

Agent command paths return one JSON envelope on stdout. Human help paths such as `--help`, `<command> --help`, and `help <command>` write help text to stderr, leave stdout empty, and exit 0. Human version paths using global `--version` or `-V` write the runtime version to stderr, leave stdout empty, and exit 0.

## When to Use

- Run `autophone device list` when no device is selected, multiple devices may be connected, or adb reports authorization/offline errors.
- Use `result.default_serial` only when it is non-null; otherwise pass an explicit `--serial` chosen from `result.devices[]`.
- Run `autophone device info` when SDK/display/battery/device model facts matter for the workflow.
- Run `autophone device screen get` to probe display power and keyguard state without waking or unlocking the device.
- Run `autophone device network get` when remote content, app links, sync, or web flows depend on Android connectivity state. Run `autophone device storage` when filesystem capacity may affect installs, downloads, log capture, screenshots, or file transfers. Run `autophone device battery get` when charge level, charging state, temperature, or battery presence may affect long UI/performance workflows. Run `autophone device time get` when device clock, timezone, automatic time settings, or log timestamp interpretation matters. Run `autophone device locale get` when system language/region may affect visible text selectors or expected UI copy.
- Run `autophone device ime get` when soft-keyboard visibility or the selected input method may affect typing or lower-screen UI interactions.
- Use `autophone --serial <serial> device ime set --id <ime_id>` only when the workflow explicitly needs a different installed input method (such as an ADBKeyboard-class helper for Unicode text); record `result.previous_id` and restore it, or run `autophone device ime reset`, before the workflow ends.
- Run `autophone device brightness get` when brightness settings or display-service brightness may explain visual evidence issues, run `autophone device animations get` when global animation scales may affect UI transition timing or flakiness, and run `autophone device accessibility get` when accessibility or touch-exploration settings may affect UI automation.
- Use `autophone --serial <serial> device animations set --scale <0|0.5|1>` only when intentionally mutating device-wide global animation policy. It writes all three animation scale settings, verifies stored values by readback, does not prove app runtime animation timing, and does not roll back automatically.
- Run `autophone device orientation get` when only current display rotation/orientation is needed without a UI dump.
- Use `autophone --serial <serial> device orientation set --mode auto` or `--mode lock --rotation <0|90|180|270>` only when the workflow intentionally mutates device-wide user-rotation policy.
- Use `autophone device statusbar expand-notifications`, `expand-settings`, or `collapse` for transient notification/quick-settings panel control; run `observe` afterward when panel visibility must be proven.
- Use `autophone device statusbar icons` to read ordered SystemUI status bar icon slots; do not treat slots as proof that each icon is visible or active.
- Use `autophone device volume get --stream music|ring|alarm|notification|system|voice-call` to read one AudioManager stream index/range; do not treat it as audible loudness, mute/DND, route, or playback proof.
- Use `autophone device ringer get` to read AudioService ringer state, optional zen state, and ringer-affected/muted stream masks; do not treat it as proof of actual audible output or notification delivery.
- Use `autophone device notifications get` when current notification titles/text may contain OTPs, confirmations, or system feedback; treat returned content as sensitive, bounded, and not redacted.
- Run `autophone device users` before using non-default `--user` values for app or permission workflows.
- Run `autophone device current-user` when deciding whether to use the active Android user id for a `--user` option.
- Run `autophone device ensure-ready` before UI workflows when the screen may be off, dimmed, or keyguard-blocked and the workflow should attempt remediation.
- Use `files mkdir` to create one explicit directory path with parents when needed, always with explicit `--serial`; it is idempotent but still mutates device storage.

## Constraints

- device enumeration is read-only; `device list` ignores `--serial` and preserves raw adb states.
- `default_serial` means exactly one online device, not proof that other attached devices are healthy.
- target device info is read-only; `device info` respects `--serial`, reports normalized facts, and leaves unavailable OEM-specific values as `null`.
- `device info` exposes only selected whitelisted `ro.*` properties, not the full `getprop` dump.
- `device screen get` is read-only; it probes `dumpsys power` and `dumpsys window`, reports display power and keyguard state, and never wakes the screen or dismisses keyguard.
- `device screen get` keeps missing keyguard fields nullable and reports `screen_unlocked: true` only when the device appears awake/interactive and keyguard is explicitly not showing.
- `device network get` is read-only; it reports nullable Android connectivity settings and active default network transport/validation without exposing SSID, BSSID, IP, MAC, carrier, operator, signal strength, or raw connectivity dumps.
- `device network get` reports Android ConnectivityService state only; `online:true` is not proof that a remote host, URL, or service is reachable.
- `device storage` is read-only; it runs `stat -f` for fixed `/data`, `/sdcard`, and `/data/local/tmp` paths, reports raw `filesystem_type`, and represents path-level failures as per-entry unavailable records when at least one fixed path parsed.
- `device storage` is a point-in-time filesystem capacity snapshot, not app quota or write-permission proof; roles may share the same underlying volume, so do not sum entries as total device capacity.
- `device time get` is read-only; it reports Android wall-clock epoch seconds, timezone offset, automatic time settings, and timezone id sources without proving NTP sync, alarm delivery, scheduler behavior, or app-specific time handling.
- `device locale get` is read-only; it reports Android system/product locale sources as raw nullable strings plus parsed BCP 47 locale tags, with `primary_locale` derived from `locales[0]`.
- `device locale get` does not prove per-app language, rendered translation, or in-app `Locale.getDefault()`; malformed higher-priority sources can be skipped and reported in `invalid_sources`.
- `device ime get` is read-only; it reports soft-keyboard visibility signals and input method ids without returning raw `dumpsys input_method`, focused-field text, keyboard geometry, or text-entry readiness.
- `device ime set` and `device ime reset` are mutating and user-visible; `set` records the previous IME id for restore, enables the target when needed, verifies by IME state readback, and never installs packages; `reset` restores system default enabled/selected IMEs.
- `device brightness get` is read-only; it reports configured brightness, brightness mode, auto-brightness adjustment, and parsed display-service brightness fields without changing brightness or returning raw `dumpsys display`.
- `device brightness get` does not prove visual luminance, screenshot exposure, or ambient light.
- `device animations get` is read-only; it reports nullable global animation scale settings and `animations_disabled` only when all three scale values are exactly `0`.
- `device animations set` is mutating; it requires explicit `--serial`, writes all three global animation scale settings to `0`, `0.5`, or `1`, verifies stored values by readback, does not prove runtime animation behavior, and may leave partial settings changed if a later write fails.
- `device accessibility get` is read-only; it reports stored secure accessibility settings and enabled accessibility service component names without inspecting live accessibility service health, accessibility nodes, or app-specific behavior.
- `device users` is read-only; it parses standard non-verbose `pm list users` output, reports user ids/names/flags hex/running state, and does not decode flags, user type, current user, visibility, device owner, or profile owner.
- `device current-user` is read-only; it parses `cmd activity get-current-user` and reports only Activity Manager's current user id, not profile visibility or `device users` membership.
- `device orientation get` is read-only; it reports actual display rotation without a UI dump, requires parseable `dumpsys window` rotation, keeps unparseable `window_size` nullable, and keeps unavailable, unset, or unparseable `auto_rotate` nullable.
- `device orientation set` is mutating; it requires explicit `--serial`, uses `wm user-rotation`, changes device-wide user-rotation policy, and does not roll back automatically.
- `device orientation set` verifies only Android user-rotation policy (`free` for auto or `lock <rotation>` for lock); foreground app orientation preferences may still override actual display rotation.
- `device statusbar` commands mutate transient SystemUI panel state with `cmd statusbar`, allow normal single-device implicit resolution, report the resolved `device_serial`, and do not independently prove the panel became visible or collapsed.
- `device statusbar` clean success requires exit code 0 and empty stdout/stderr; usage/help/error output, including exit-0 usage output from unsupported subcommands, is failure.
- `device statusbar icons` is read-only; it parses `cmd statusbar get-status-icons` as ordered SystemUI icon slots, allows a clean empty list, and fails on usage/help/error output, stderr, or malformed slot lines.
- `device statusbar icons` reports slot names, not proof that each icon is visible, active, enabled, or user-facing on the current display.
- `device volume get` is read-only; it parses `cmd media_session volume --stream <id> --get`, confirms the echoed AudioManager stream id/name, and reports only the stream volume index/range.
- `device volume get` does not prove perceived loudness, mute state, DND or ringer-mode policy, active audio route, or media playback state; Android/OEM policy may alias `ring` and `notification`.
- `device volume get` supports only `music`, `ring`, `alarm`, `notification`, `system`, and `voice-call`; other AudioManager streams are intentionally out of scope.
- `device ringer get` is read-only; it parses the `dumpsys audio` `Ringer mode:` section and reports AudioService ringer mode, optional zen mode, and ringer affected/muted stream masks.
- `device ringer get` reports raw `STREAM_*` tokens plus decimal `residual_tokens` for unknown mask bits from dumpsys parentheses and does not decode stream bit masks itself.
- `device ringer get` does not prove actual audible output, notification delivery, active audio route, playback state, or app-level behavior.
- `device notifications get` is read-only but sensitive; it returns bounded, unredacted notification title/text fields from `dumpsys notification --noredact` and fails closed without raw dump snippets when parsing breaks.
- `device notifications get` is a point-in-time notification-manager snapshot; absence does not prove a notification was never posted or that the user did not already clear it.
- `device ensure-ready` may wake the screen and attempt `wm dismiss-keyguard`, but it does not bypass secure locks and reports `SCREEN_LOCKED` when keyguard remains visible.
- `device ensure-ready` exposes parsed readiness booleans only, never raw `dumpsys power` or `dumpsys window` output.
- `files mkdir` mutates device storage; it requires explicit `--serial`, runs idempotent `mkdir -p`, refuses root/trailing-slash/dot-segment paths and existing non-directory targets including symlinks, and verifies only the target path with a non-atomic stat-mkdir-stat sequence.
- `files copy` mutates device storage; it requires explicit `--serial`, copies one regular file with `cp -n -T`, rejects symlinks/directories/trailing-slash/dot-segment paths, refuses existing destinations, does not auto-clean partial destinations on copy failure, and verifies source preservation plus destination kind/byte metadata with a non-atomic stat-stat-cp-stat-stat sequence.
- `files move` mutates device storage and removes the source path; it requires explicit `--serial`, exact `--confirm-source`, rejects directories, rejects trailing-slash or dot-segment paths, refuses existing destinations, moves regular files or symlinks only, and verifies source absence plus destination kind/byte metadata with a non-atomic stat-stat-mv-stat-stat sequence.

## device list
<!-- covers: device-list -->

```bash
node dist/cli/main.js device list
node dist/cli/main.js --serial ignored device list
```

Returns one JSON envelope with:

- `command: "device.list"`
- no `device.serial` envelope field because this command enumerates all adb devices
- `result.devices[]`
- `result.count`
- `result.online_count`
- `result.unauthorized_count`
- `result.offline_count`
- `result.other_count`
- `result.state_counts`
- `result.default_serial`

Rules:

- runs `adb devices -l`
- read-only
- ignores global `--serial` and returns all adb records
- preserves raw adb states such as `device`, `unauthorized`, `offline`, `no permissions`, `recovery`, or `bootloader`
- `online` is true only when `state === "device"`
- `default_serial` is the serial only when exactly one device is online; otherwise it is `null`
- `online_count + unauthorized_count + offline_count` may be less than `count`; use `other_count` or `state_counts` for non-standard states

Use this command before targeted commands when no serial is known, multiple devices may be connected, or adb reports `NO_DEVICE`, `MULTIPLE_DEVICES`, `DEVICE_UNAUTHORIZED`, or `DEVICE_OFFLINE`.

## device info
<!-- covers: device-info -->

```bash
node dist/cli/main.js device info
node dist/cli/main.js --serial emulator-5554 device info
```

Returns one JSON envelope with:

- `command: "device.info"`
- `device.serial`
- `result.device_serial`
- `result.android`
- `result.hardware`
- `result.display`
- `result.battery`
- `result.properties`

Rules:

- read-only target-device information command
- respects global `--serial`; without it, normal single-online-device resolution applies
- reads selected whitelisted `ro.*` properties through `getprop`
- reads default-display size and density through `wm size` and `wm density`
- reads battery facts through `dumpsys battery`
- missing or OEM-specific fields are returned as `null` or empty arrays, not guessed
- `battery.level_percent` is normalized from `level` and `scale`
- `battery.temperature_celsius` is converted from tenths of a degree Celsius
- `battery.status` is decoded to `unknown`, `charging`, `discharging`, `not_charging`, or `full`
- `battery.plugged` is derived from powered booleans as `ac`, `usb`, `wireless`, `dock`, `none`, or `null`
- `android.codename` is the raw build codename property; release builds commonly report `REL`
- foldables and external displays are not separately modeled; display fields describe what `wm` reports for the default display

Use this command before workflows that depend on SDK level, screen geometry, density, battery state, or device model.

## device battery get
<!-- covers: device-battery-get -->

```bash
node dist/cli/main.js device battery get
node dist/cli/main.js --serial emulator-5554 device battery get
```

Returns one JSON envelope with:

- `command: "device.battery_get"`
- `device.serial`
- `result.device_serial`
- `result.battery`
- `result.query`
- `result.verify`
- `result.semantics`

Rules:

- read-only target-device battery telemetry command
- respects global `--serial`; without it, normal single-online-device resolution applies
- reads BatteryService state through `dumpsys battery`
- `battery.level_percent` is normalized from `level` and `scale`
- `battery.temperature_celsius` is converted from tenths of a degree Celsius
- `battery.status` is decoded to `unknown`, `charging`, `discharging`, `not_charging`, or `full`
- `battery.plugged` is derived from powered booleans as `ac`, `usb`, `wireless`, `dock`, `none`, or `null`
- `battery.health` is decoded to `unknown`, `good`, `overheat`, `dead`, `over_voltage`, `unspecified_failure`, `cold`, or `null`
- `battery.voltage_mv` is reported in millivolts when available
- `battery.charge_counter_uah` is reported in microampere-hours when available
- `battery.present`, `battery.technology`, `battery.health`, `battery.voltage_mv`, and `battery.charge_counter_uah` are nullable because OEMs and emulators may omit them
- stderr, nonzero exit, empty/non-battery output, malformed known numeric fields, malformed `present`, or target-device failures fail with `DEVICE_BATTERY_FAILED`
- target-device failures such as offline or unauthorized are classified before `DEVICE_BATTERY_FAILED`
- this is a point-in-time BatteryService snapshot; it does not control charging, prove charger quality, or calibrate battery health

Use this command before long-running UI, install, screenshot, log, or performance workflows where charge level, charging state, battery presence, temperature, or health may explain instability.

## device time get
<!-- covers: device-time-get -->

```bash
node dist/cli/main.js device time get
node dist/cli/main.js --serial emulator-5554 device time get
```

Returns one JSON envelope with:

- `command: "device.time_get"`
- `device.serial`
- `result.device_serial`
- `result.time`
- `result.settings`
- `result.timezone`
- `result.query`
- `result.verify`
- `result.semantics`

Rules:

- read-only target-device wall-clock and timezone command
- respects global `--serial`; without it, normal single-online-device resolution applies
- reads wall-clock epoch and timezone offset through `date +%s%z`
- reads automatic time settings through `settings get global auto_time` and `settings get global auto_time_zone`
- reads timezone id sources through `settings get global time_zone` and `getprop persist.sys.timezone`
- `time.unix_epoch_seconds` is the target device epoch seconds at the time `date` ran
- `time.timezone_offset` is normalized to `+HH:MM` or `-HH:MM`
- `time.timezone_offset_minutes` is the signed offset in minutes
- `settings.auto_time` and `settings.auto_time_zone` are `true`, `false`, or `null` when the setting is absent
- `timezone.id` prefers `settings_global_time_zone`, then `persist_sys_timezone`, and is `null` when both sources are absent
- timezone source values are raw Android timezone ids; the command validates shape only, not IANA database membership or app-specific timezone use
- stderr, nonzero exit, malformed epoch/offset output, malformed boolean settings, malformed timezone ids, multiple non-empty output lines, or target-device failures fail with `DEVICE_TIME_FAILED`
- target-device failures such as offline or unauthorized are classified before `DEVICE_TIME_FAILED`
- this is a point-in-time Android clock snapshot; it does not prove NTP sync, alarm delivery, scheduler behavior, or app-specific time handling

Use this command before workflows that compare log timestamps, depend on scheduled behavior, or need to explain time/region-sensitive UI behavior.

## device screen get
<!-- covers: device-screen-get -->

```bash
node dist/cli/main.js device screen get
node dist/cli/main.js --serial emulator-5554 device screen get
```

Returns one JSON envelope with:

- `command: "device.screen_get"`
- `device.serial`
- `result.device_serial`
- `result.state`
- `result.screen.display_power`
- `result.screen.screen_unlocked`
- `result.keyguard`
- `result.query.sources[]`
- `result.verify.policy: "screen_keyguard_state_parse"`
- `result.semantics: "read_only_screen_keyguard_probe_not_readiness_mutation"`

Rules:

- read-only target-device state probe
- respects global `--serial`; without it, normal single-online-device resolution applies
- runs `dumpsys power` and `dumpsys window`
- does not wake the device, dismiss keyguard, press keys, or otherwise remediate readiness
- prefers `Display Power: state=...` from `dumpsys power`, and falls back to wakefulness/interactive fields when OEM dumps omit display power
- fails with `DEVICE_SCREEN_FAILED` only when `dumpsys power` exposes no parseable display power, wakefulness, or interactive signal
- normalizes display power to `on`, `off`, `doze`, or `unknown`
- preserves parsed readiness fields in `result.state`, including raw `wakefulness` and raw `display_power_state`
- missing keyguard fields are returned as `null`, not guessed
- `screen_unlocked` is conservative: true only when the device appears awake or interactive and keyguard is explicitly not showing
- target-device failures are classified before `DEVICE_SCREEN_FAILED`

Use this command when an agent only needs to decide whether the screen/keyguard precondition is satisfied. Use `device ensure-ready` when the workflow should attempt to wake the device or dismiss keyguard.

## device network get
<!-- covers: device-network-get -->

```bash
node dist/cli/main.js device network get
node dist/cli/main.js --serial emulator-5554 device network get
```

Returns one JSON envelope with:

- `command: "device.network_get"`
- `device.serial`
- `result.device_serial`
- `result.settings.airplane_mode_on`
- `result.settings.wifi_on`
- `result.settings.mobile_data_on`
- `result.active.network_id`
- `result.active.transports[]`
- `result.active.primary_transport`
- `result.active.internet_capable`
- `result.active.validated`
- `result.active.online`
- `result.query.sources[]`
- `result.verify.policy: "settings_and_connectivity_service_parse"`
- `result.semantics: "read_only_connectivity_state_not_remote_reachability"`

Rules:

- read-only target-device state probe
- respects global `--serial`; without it, normal single-online-device resolution applies
- runs `settings get global airplane_mode_on`
- runs `settings get global wifi_on`
- runs `settings get global mobile_data`
- runs `dumpsys connectivity`
- returns nullable setting values when Android reports an unset value
- parses only ConnectivityService's active default network id and matching `NetworkAgentInfo`
- maps transports to `wifi`, `cellular`, `ethernet`, `vpn`, `bluetooth`, or `other`
- reports `online:true` only when the active default network is both internet-capable and validated
- does not expose SSID, BSSID, IP address, MAC address, carrier, operator, signal strength, or raw connectivity dumps
- target-device failures are classified before `DEVICE_NETWORK_FAILED`
- malformed settings output, malformed active-network output, nonzero command exit, or unexpected stderr fail with `DEVICE_NETWORK_FAILED`
- `online:true` is not proof that any specific remote host, URL, API, captive portal, or service is reachable

Use this command before workflows that depend on Android connectivity state, such as remote content, app links, web views, sync, or login flows. It is a connectivity-state probe, not a remote reachability check.

## device storage
<!-- covers: device-storage-get -->

```bash
node dist/cli/main.js device storage
node dist/cli/main.js --serial emulator-5554 device storage
```

Returns one JSON envelope with:

- `command: "device.storage"`
- `device.serial`
- `result.device_serial`
- `result.entries[]`
- `result.entry_count`
- `result.ok_count`
- `result.unavailable_count`
- `result.query.method: "statfs_paths"`
- `result.query.paths`
- `result.verify.policy: "statfs_storage_parse"`
- `result.semantics: "read_only_storage_capacity_snapshot_not_quota_or_write_permission"`

Rules:

- read-only target-device storage-capacity probe
- respects global `--serial`; without it, normal single-online-device resolution applies
- runs `stat -f` for fixed `/data`, `/sdcard`, and `/data/local/tmp` paths
- maps returned records by path to roles `data`, `shared`, and `tmp`; stdout order is not trusted
- reports raw `filesystem_type` strings from Android, including values such as `f2fs`, `ext4`, or `0x65735546`
- returns `total_bytes`, `available_bytes`, `free_bytes`, and `used_bytes` derived from statfs block counts and block size
- uses `available_bytes` as the best capacity headroom signal for agent preflight decisions
- represents a fixed-path statfs failure as an unavailable entry when at least one other fixed path parsed successfully
- target-device failures are classified before `DEVICE_STORAGE_FAILED`
- unsupported `stat -f`, malformed output, duplicate/unknown paths, inconsistent block counts, unsafe integer products, unexpected stderr, or zero usable records fail with `DEVICE_STORAGE_FAILED`
- this is a point-in-time filesystem snapshot, not proof of app quota, scoped-storage access, or write permission
- roles may refer to the same underlying filesystem or quota view; do not sum entries as total device capacity

Use this command before workflows that may need free-space preflight, such as app install, downloads, screenshots, log capture, or file transfer. Use a later mutating command's own verification for actual write success.

## device locale get
<!-- covers: device-locale-get -->

```bash
node dist/cli/main.js device locale get
node dist/cli/main.js --serial emulator-5554 device locale get
```

Returns one JSON envelope with:

- `command: "device.locale_get"`
- `device.serial`
- `result.device_serial`
- `result.locales[]`
- `result.locales_count`
- `result.primary_locale`
- `result.selected_source`
- `result.sources`
- `result.invalid_sources[]`
- `result.query.sources[]`
- `result.verify.policy: "locale_sources_parse"`
- `result.semantics: "read_only_locale_state_not_app_language_or_translation"`

Rules:

- read-only target-device locale-source probe
- respects global `--serial`; without it, normal single-online-device resolution applies
- reads `settings get system system_locales`
- reads `getprop persist.sys.locale`
- reads `getprop ro.product.locale`
- reads `getprop ro.product.locale.language`
- reads `getprop ro.product.locale.region`
- selects the first parseable non-null source in that order, with language/region combined as the final fallback
- parses comma-separated `system_locales` entries and skips malformed entries while reporting them in `invalid_sources`
- normalizes underscores to BCP 47 hyphens before parsing; `tag` and `base_name` are normalized values, not raw echoes
- treats `C`, `POSIX`, and `root` as invalid legacy sentinels, not usable Android locales
- `primary_locale` is derived from `locales[0]`; `selected_source` is `null` only when no locale was parsed
- all raw source fields are nullable strings; `null` means that source was absent or reported Android `null`
- `Intl.Locale` validates locale tag shape, not whether a language or region is real or installed
- target-device failures are classified before `DEVICE_LOCALE_FAILED`
- nonzero source command exits, stderr, multi-line source output, all-malformed non-empty sources, or oversized source output fail with `DEVICE_LOCALE_FAILED`
- this command does not prove per-app language, rendered translation quality, app resource selection, or `Locale.getDefault()` inside any app process

Use this command before workflows that depend on visible text selectors, language-specific expected copy, or region-sensitive UI assumptions. Use observation and app-specific checks to prove what an app actually renders.

## device ime get
<!-- covers: device-ime-get -->

```bash
node dist/cli/main.js device ime get
node dist/cli/main.js --serial emulator-5554 device ime get
```

Returns one JSON envelope with:

- `command: "device.ime_get"`
- `device.serial`
- `result.device_serial`
- `result.keyboard.shown`
- `result.keyboard.show_requested`
- `result.keyboard.fullscreen_mode`
- `result.service.system_ready`
- `result.service.interactive`
- `result.ime.current_id`
- `result.ime.default_id`
- `result.ime.enabled_ids[]`
- `result.ime.enabled_count`
- `result.query.sources[]`
- `result.verify.policy: "input_method_service_parse"`
- `result.semantics: "read_only_ime_state_not_keyboard_geometry"`

Rules:

- read-only target-device state probe
- respects global `--serial`; without it, normal single-online-device resolution applies
- runs `dumpsys input_method`
- runs `settings get secure default_input_method`
- runs `settings get secure enabled_input_methods`
- preserves missing keyboard/service fields as `null`, not guessed false values
- parses current IME id from `mCurMethodId`, `mSelectedMethodId`, or `mCurId`
- strips enabled-IME subtype suffixes after `;` and returns unique enabled input method ids
- does not return raw `dumpsys input_method`
- does not read or report focused-field text, focused-window tokens, served view details, input connection objects, or editor info
- does not prove keyboard geometry, keyboard occlusion bounds, focused app acceptance of text, or text-entry readiness
- target-device failures are classified before `DEVICE_IME_FAILED`
- malformed IME ids, unexpected stderr, nonzero command exit, or dumps with no parseable IME state fail with `DEVICE_IME_FAILED`

Use this command before text or lower-screen UI workflows when soft-keyboard state or selected input method may affect the next action. Use `observe` for visible UI evidence and `text input` only after the intended field is already focused.

## device ime set
<!-- covers: device-ime-set -->

```bash
node dist/cli/main.js --serial emulator-5554 device ime set --id com.android.adbkeyboard/.AdbIME
```

Returns one JSON envelope with:

- `command: "device.ime_set"`
- `result.requested_id`
- `result.previous_id` (restore target; `null` when no IME was selected before)
- `result.status: "switched" | "already_current"`
- `result.enable.action: "not_needed" | "already_enabled" | "enabled_now"`
- `result.set` (exit code and duration; `null` when already current)
- `result.verify.policy: "ime_state_readback"`
- `result.semantics: "switches_user_visible_default_ime_reversible_via_previous_id"`

Rules:

- mutates a user-visible device setting; the on-screen keyboard changes for the device user
- requires explicit `--serial`; requests without it are rejected before any adb call
- the target IME must already be installed; this command never installs packages
- enables the target IME first when it is not in `enabled_input_methods`
- verifies by re-reading IME state until the requested id is current; otherwise fails with `VERIFY_FAILED`
- requesting the already-current IME is an idempotent no-op (`status: "already_current"`, no commands dispatched)
- command output errors such as `Unknown id` fail with `DEVICE_IME_FAILED` even when the exit code is 0
- always restore the previous input method when the workflow ends: run `device ime set --id <result.previous_id>` or `device ime reset`

Use this command only when a workflow explicitly needs a different input method, such as an ADBKeyboard-class helper for Unicode text.

## device ime reset
<!-- covers: device-ime-reset -->

```bash
node dist/cli/main.js --serial emulator-5554 device ime reset
```

Returns one JSON envelope with:

- `command: "device.ime_reset"`
- `result.previous_id` and `result.current_id`
- `result.enabled_ids[]` after reset
- `result.changed`
- `result.reset` (exit code and duration)
- `result.verify.policy: "ime_state_readback"`
- `result.semantics: "restores_system_default_enabled_and_selected_imes"`

Rules:

- requires explicit `--serial`; requests without it are rejected before any adb call
- resets enabled and selected input methods to system defaults via `ime reset`
- the enabled IME set may visibly change on the device
- prefer `device ime set --id <previous_id>` when the goal is restoring a recorded state; use reset when the previous state is unknown or already lost

## device brightness get
<!-- covers: device-brightness-get -->

```bash
node dist/cli/main.js device brightness get
node dist/cli/main.js --serial emulator-5554 device brightness get
```

Returns one JSON envelope with:

- `command: "device.brightness_get"`
- `device.serial`
- `result.device_serial`
- `result.settings.screen_brightness.raw`
- `result.settings.screen_brightness.normalized`
- `result.settings.mode.value`
- `result.settings.auto_brightness_adjustment`
- `result.settings.screen_brightness_float`
- `result.display.brightness`
- `result.display.sdr_brightness`
- `result.display.cached_brightness`
- `result.display.cached_adjusted_brightness`
- `result.display.min`
- `result.display.max`
- `result.query.sources[]`
- `result.verify.policy: "display_brightness_state_parse"`
- `result.semantics: "read_only_display_brightness_state_not_visual_luminance"`

Rules:

- read-only target-device state probe
- respects global `--serial`; without it, normal single-online-device resolution applies
- runs `settings get system screen_brightness`
- runs `settings get system screen_brightness_mode`
- runs `settings get system screen_auto_brightness_adj`
- runs `settings get system screen_brightness_float`
- runs `dumpsys display`
- preserves unavailable settings as `null`, not guessed values
- maps `screen_brightness_mode` value `0` to `manual`, value `1` to `automatic`, and other/null values to `unknown`
- normalizes integer `screen_brightness` as `raw / 255`
- parses only selected brightness numeric fields from `dumpsys display`
- does not change brightness, write settings, press keys, wake the display, or modify adaptive-brightness state
- does not return raw `dumpsys display`, display unique ids, panel product info, display configs, or brightness curves
- does not prove visual luminance, screenshot exposure, content readability, OLED dimming, HBM state, or ambient light
- target-device failures are classified before `DEVICE_BRIGHTNESS_FAILED`
- malformed settings values, unexpected stderr, nonzero command exit, or dumps with no parseable brightness fields fail with `DEVICE_BRIGHTNESS_FAILED`

Use this command when visual evidence looks unexpectedly dim/bright, when adaptive brightness may explain visual changes, or before long screenshot-based diagnostics. Use `screenshot` for visual evidence and `device screen get` for display power/keyguard state.

## device animations get
<!-- covers: device-animations-get -->

```bash
node dist/cli/main.js device animations get
node dist/cli/main.js --serial emulator-5554 device animations get
```

Returns one JSON envelope with:

- `command: "device.animations_get"`
- `device.serial`
- `result.device_serial`
- `result.settings.window_animation_scale.raw`
- `result.settings.window_animation_scale.value`
- `result.settings.transition_animation_scale.raw`
- `result.settings.transition_animation_scale.value`
- `result.settings.animator_duration_scale.raw`
- `result.settings.animator_duration_scale.value`
- `result.animations_disabled`
- `result.query.sources[]`
- `result.verify.policy: "animation_scale_settings_parse"`
- `result.semantics: "read_only_animation_scale_settings_not_runtime_animation_state"`

Rules:

- read-only target-device state probe
- respects global `--serial`; without it, normal single-online-device resolution applies
- runs `settings get global window_animation_scale`
- runs `settings get global transition_animation_scale`
- runs `settings get global animator_duration_scale`
- preserves unavailable settings as `{ raw: null, value: null }`, not guessed values
- reports `animations_disabled: true` only when all three scale values are exactly `0`
- does not change animation scales, write settings, press keys, wake the display, observe UI motion, or verify app-specific runtime animation behavior
- target-device failures are classified before `DEVICE_ANIMATIONS_FAILED`
- malformed scale values, unexpected stderr, or nonzero command exit fail with `DEVICE_ANIMATIONS_FAILED`

Use this command when animation scale policy may explain slow transitions, flaky waits, or unexpectedly instant UI changes. Use `wait ui` or `wait app` for actual workflow synchronization.

## device animations set
<!-- covers: device-animations-set -->

```bash
node dist/cli/main.js --serial emulator-5554 device animations set --scale 0
node dist/cli/main.js --serial emulator-5554 device animations set --scale 0.5
node dist/cli/main.js --serial emulator-5554 device animations set --scale 1
```

Returns one JSON envelope with:

- `command: "device.animations_set"`
- `device.serial`
- `result.device_serial`
- `result.requested.scale`
- `result.before.settings.*.raw`
- `result.before.settings.*.value`
- `result.before.animations_disabled`
- `result.set.sources[]`
- `result.after.settings.*.raw`
- `result.after.settings.*.value`
- `result.after.animations_disabled`
- `result.changed`
- `result.verify.policy: "global_animation_scales_readback"`
- `result.semantics: "device_wide_global_animation_scale_settings_not_runtime_animation_state"`

Rules:

- mutating target-device setting change
- requires explicit global `--serial`; implicit single-device selection is rejected
- only accepts `--scale 0`, `--scale 0.5`, or `--scale 1`
- writes all three global settings: `window_animation_scale`, `transition_animation_scale`, and `animator_duration_scale`
- verifies success by reading all three settings back and comparing parsed numeric values to the requested scale
- reports `changed: false` when all three before values already matched the requested scale
- does not roll back automatically; if a later setting write fails, earlier setting writes may already have changed
- does not press keys, wake the display, observe UI motion, or verify app-specific runtime animation behavior
- target-device failures are classified before `DEVICE_ANIMATIONS_SET_FAILED`
- nonzero command exit, stdout/stderr output, restricted writes, or readback mismatch fail with a structured error

Use this command only when a workflow intentionally changes device-wide animation policy, such as disabling animations before deterministic UI automation. Prefer restoring the previous policy after the workflow when changing a shared physical device.

## device accessibility get
<!-- covers: device-accessibility-get -->

```bash
node dist/cli/main.js device accessibility get
node dist/cli/main.js --serial emulator-5554 device accessibility get
```

Returns one JSON envelope with:

- `command: "device.accessibility_get"`
- `device.serial`
- `result.device_serial`
- `result.settings.accessibility_enabled.raw`
- `result.settings.accessibility_enabled.value`
- `result.settings.touch_exploration_enabled.raw`
- `result.settings.touch_exploration_enabled.value`
- `result.settings.enabled_accessibility_services.raw`
- `result.settings.enabled_accessibility_services.services[]`
- `result.settings.enabled_accessibility_services.count`
- `result.query.sources[]`
- `result.verify.policy: "accessibility_secure_settings_parse"`
- `result.semantics: "read_only_secure_accessibility_settings_not_runtime_accessibility_node_state"`

Rules:

- read-only target-device state probe
- respects global `--serial`; without it, normal single-online-device resolution applies
- runs `settings get secure accessibility_enabled`
- runs `settings get secure touch_exploration_enabled`
- runs `settings get secure enabled_accessibility_services`
- maps boolean setting values `0` and `1` to `false` and `true`; literal `null` becomes `{ raw: null, value: null }`
- maps blank or literal `null` enabled-service settings to an empty service list
- parses enabled services as colon-separated Android flattened component names such as `com.example/.ReaderService`
- does not change accessibility settings, write settings, press keys, wake the display, run `dumpsys accessibility`, inspect live accessibility service health, inspect accessibility nodes, or prove app-specific accessibility behavior
- target-device failures are classified before `DEVICE_ACCESSIBILITY_FAILED`
- malformed boolean values, malformed service component names, unexpected stderr, nonzero command exit, oversized service settings, or too many services fail with `DEVICE_ACCESSIBILITY_FAILED`

Use this command when accessibility, TalkBack, touch exploration, or enabled accessibility services may explain unusual focus traversal, gestures, UI dumps, or act/verify behavior. Use `observe` for current UI hierarchy evidence.

## device orientation get
<!-- covers: device-orientation -->

```bash
node dist/cli/main.js device orientation get
node dist/cli/main.js --serial emulator-5554 device orientation get
```

Returns one JSON envelope with:

- `command: "device.orientation_get"`
- `device.serial`
- `result.device_serial`
- `result.window_size`
- `result.orientation`
- `result.rotation_degrees`
- `result.auto_rotate`
- `result.query.window_size`
- `result.query.rotation`
- `result.query.auto_rotate`
- `result.verify`
- `result.semantics`

Rules:

- read-only target-device information command
- respects global `--serial`; without it, normal single-online-device resolution applies
- does not run uiautomator or dump the UI hierarchy
- reads display size through `wm size`
- reads actual display rotation through `dumpsys window`
- reads auto-rotate setting state through `settings get system accelerometer_rotation`
- requires a parseable actual display rotation from `dumpsys window`
- `window_size` may be `null` when `wm size` output is unparseable
- `auto_rotate` may be `null` when the setting command fails, is unset, or is unparseable
- `orientation` is derived from actual rotation plus `window_size`; when `window_size` is `null`, it falls back to rotation-only inference

Use this command when only current display rotation/orientation is needed. Use `observe` when UI hierarchy, package/activity, or elements are needed.

## device orientation set
<!-- covers: device-orientation-set -->

```bash
node dist/cli/main.js --serial emulator-5554 device orientation set --mode auto
node dist/cli/main.js --serial emulator-5554 device orientation set --mode lock --rotation 90
```

Returns one JSON envelope with:

- `command: "device.orientation_set"`
- `device.serial`
- `result.device_serial`
- `result.requested`
- `result.before.orientation`
- `result.before.user_rotation`
- `result.set`
- `result.after.orientation`
- `result.after.user_rotation`
- `result.verify`
- `result.semantics: "device_wide_user_rotation_policy"`

Rules:

- mutating target-device policy command
- requires explicit global `--serial` before any adb call
- uses Android `wm user-rotation`
- `--mode auto` maps to `wm user-rotation free`
- `--mode lock --rotation <0|90|180|270>` maps to `wm user-rotation lock <0|1|2|3>`
- verifies only user-rotation policy readback, not actual display rotation
- foreground app orientation preferences may override actual display rotation after policy changes
- does not roll back automatically
- before/after orientation snapshots are observational evidence and may differ from the requested lock rotation
- unsupported `wm user-rotation`, usage output, unexpected query output, or non-target command failures fail with `DEVICE_ORIENTATION_SET_FAILED`
- successful set commands whose follow-up policy readback never matches the requested policy fail with `VERIFY_FAILED`

Use this command only when a workflow intentionally changes device-wide user-rotation policy. Use `device orientation get` for read-only orientation checks.

## device statusbar
<!-- covers: device-statusbar -->

```bash
node dist/cli/main.js device statusbar expand-notifications
node dist/cli/main.js device statusbar expand-settings
node dist/cli/main.js device statusbar collapse
node dist/cli/main.js --serial emulator-5554 device statusbar collapse
```

Returns one JSON envelope with:

- `command: "device.statusbar"`
- `device.serial`
- `result.device_serial`
- `result.action`
- `result.statusbar`
- `result.verify`
- `result.semantics: "systemui_statusbar_panel_command"`

Rules:

- mutates transient SystemUI notification or quick-settings panel state
- respects global `--serial`; without it, normal single-online-device resolution applies
- `expand-notifications` maps to `cmd statusbar expand-notifications`
- `expand-settings` maps to `cmd statusbar expand-settings`
- `collapse` maps to `cmd statusbar collapse`
- success means the command exited 0 with empty stdout/stderr
- exit-0 usage/help/error output still fails with `DEVICE_STATUSBAR_FAILED`
- older Android or OEM SystemUI builds may not support every subcommand
- command success does not independently prove the requested panel became visible or collapsed

`device statusbar` returns:

- `action: "expand_notifications" | "expand_settings" | "collapse"`
- `statusbar.method: "cmd_statusbar"`
- `statusbar.command`
- `statusbar.exit_code`
- `statusbar.command_duration_ms`
- `verify.policy: "cmd_statusbar_clean_exit"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`

Use this command before `observe` when an agent needs to inspect notifications or quick settings. Use `observe` afterward when visibility or UI contents must be proven.

## device statusbar icons
<!-- covers: device-statusbar-icons -->

```bash
node dist/cli/main.js device statusbar icons
node dist/cli/main.js --serial emulator-5554 device statusbar icons
```

Returns one JSON envelope with:

- `command: "device.statusbar_icons"`
- `device.serial`
- `result.device_serial`
- `result.icons[]`
- `result.count`
- `result.query`
- `result.verify`
- `result.semantics: "systemui_statusbar_icon_slots"`

Rules:

- read-only target-device information command
- respects global `--serial`; without it, normal single-online-device resolution applies
- runs `cmd statusbar get-status-icons`
- parses stdout as one ordered SystemUI icon slot per line
- preserves output order and duplicate slot names
- a clean empty stdout/stderr output is a successful empty icon-slot list
- stderr, nonzero exit, usage/help/error output, or malformed slot lines fail with `DEVICE_STATUSBAR_FAILED`
- older Android or OEM SystemUI builds may return unsupported output formats, which are treated as parse failures
- slot names are not proof that each icon is currently visible, active, enabled, or user-facing on the current display

`device statusbar icons` returns:

- `icons[]`
- `count`
- `query.method: "cmd_statusbar_get_status_icons"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "cmd_statusbar_icons_parse"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`

Use this command when an agent needs status bar slot inventory. Use `device statusbar expand-notifications` plus `observe` when notification or quick-settings UI content must be inspected.

## device volume get
<!-- covers: device-volume-get -->

```bash
node dist/cli/main.js device volume get
node dist/cli/main.js device volume get --stream music
node dist/cli/main.js --serial emulator-5554 device volume get --stream voice-call
```

Returns one JSON envelope with:

- `command: "device.volume_get"`
- `device.serial`
- `result.device_serial`
- `result.stream`
- `result.volume`
- `result.query`
- `result.verify`
- `result.semantics: "audio_manager_stream_volume_index"`

Rules:

- read-only target-device information command
- respects global `--serial`; without it, normal single-online-device resolution applies
- runs `cmd media_session volume --stream <id> --get`
- `--stream` accepts `music`, `ring`, `alarm`, `notification`, `system`, or `voice-call`; default is `music`
- maps streams to AudioManager ids: `voice-call=0`, `system=1`, `ring=2`, `music=3`, `alarm=4`, `notification=5`
- parses one `[V] will control stream=<id> (STREAM_...)` line and one `[V] volume is <index> in range [<min>..<max>]` line
- confirms the controlled stream id/name matches the requested stream
- supports `index: 0`, non-zero minimums, and fixed ranges where `min === max`
- stderr, nonzero exit, usage/help/error/exception/service-unavailable output, stream mismatch, malformed output, duplicate or missing key lines, `min > max`, or `index` outside `[min..max]` fail with `DEVICE_VOLUME_FAILED`
- returned volume is an AudioManager stream index/range, not perceived loudness
- result does not prove mute state, DND state, ringer mode, active audio route, or media playback state
- Android/OEM policy may alias `ring` and `notification`
- DTMF, accessibility, assistant, and other AudioManager streams are intentionally out of scope

`device volume get` returns:

- `stream.name`
- `stream.android_stream_id`
- `stream.android_stream_name`
- `volume.index`
- `volume.min`
- `volume.max`
- `query.method: "cmd_media_session_volume_get"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "media_session_volume_parse"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`

Use this command when an agent needs current stream index/range metadata before deciding whether a media, alarm, or notification workflow might be affected by system volume. Do not use it as proof that sound is audible.

## device ringer get
<!-- covers: device-ringer-get -->

```bash
node dist/cli/main.js device ringer get
node dist/cli/main.js --serial emulator-5554 device ringer get
```

Returns one JSON envelope with:

- `command: "device.ringer_get"`
- `device.serial`
- `result.device_serial`
- `result.ringer.internal`
- `result.ringer.external`
- `result.zen.mode`
- `result.zen.raw`
- `result.zen.source`
- `result.affected_streams`
- `result.muted_streams`
- `result.query`
- `result.verify`
- `result.semantics: "audio_service_ringer_zen_state_not_effective_audibility"`

Rules:

- read-only target-device information command
- respects global `--serial`; without it, normal single-online-device resolution applies
- runs `dumpsys audio`
- parses only the `Ringer mode:` section
- requires exactly one `Ringer mode:` section and exactly one required line for internal mode, external mode, affected streams, and muted streams
- ringer modes are normalized to `silent`, `vibrate`, `normal`, or `unknown` while preserving the raw token
- when the section contains one zen line, zen modes are normalized to `off`, `important_interruptions`, `no_interruptions`, `alarms`, or `unknown` while preserving the raw `ZEN_MODE_*` token and `source: "dumpsys_audio_ringer_section"`
- when the section omits zen mode, `result.zen` reports `mode: "unknown"`, `raw: null`, and `source: "not_reported"`
- duplicate zen mode lines fail with `DEVICE_RINGER_FAILED`
- stream masks preserve `mask_hex`, raw `STREAM_*` tokens, and decimal `residual_tokens` for unknown mask bits listed in the dumpsys parentheses
- stream bit masks are not decoded or reconciled against the token list
- `0x0` masks may omit a parenthesized stream list and return `streams: []`, `residual_tokens: []`
- nonzero masks without a parenthesized stream token list fail with `DEVICE_RINGER_FAILED`
- stderr, nonzero exit, missing/duplicate sections, missing required ringer/mask lines, duplicate zen lines, malformed tokens, or target-device failures fail
- failure details include bounded dumpsys snippets, not the full audio dump
- this command does not prove actual audible output, notification delivery policy, active audio route, playback state, or app-level behavior

`device ringer get` returns:

- `ringer.internal.mode`
- `ringer.internal.raw`
- `ringer.external.mode`
- `ringer.external.raw`
- `zen.mode`
- `zen.raw`
- `affected_streams.mask_hex`
- `affected_streams.streams[]`
- `muted_streams.mask_hex`
- `muted_streams.streams[]`
- `query.method: "dumpsys_audio"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "dumpsys_audio_ringer_state_parse"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`

Use this command with `device volume get` when an agent needs AudioService context for whether ringer/notification/system streams may be muted by ringer or zen state. Do not use it as a substitute for observing app or notification behavior.

## device notifications get
<!-- covers: device-notifications-get -->

```bash
node dist/cli/main.js device notifications get
node dist/cli/main.js --serial emulator-5554 device notifications get --max-notifications 5
node dist/cli/main.js --serial emulator-5554 device notifications get --max-field-chars 80 --max-total-chars 1000
```

Returns one JSON envelope with:

- `command: "device.notifications_get"`
- `device.serial`
- `result.device_serial`
- `result.requested.max_notifications`
- `result.requested.max_field_chars`
- `result.requested.max_total_chars`
- `result.notifications[]`
- `result.counts.total_seen`
- `result.counts.returned`
- `result.counts.dropped_by_limit`
- `result.truncated`
- `result.sensitive: true`
- `result.query.method: "dumpsys_notification_noredact"`
- `result.verify.policy: "notification_dump_parse"`
- `result.semantics: "read_only_notification_snapshot_sensitive_bounded"`

Rules:

- read-only target-device information command
- respects global `--serial`; without it, normal single-online-device resolution applies
- runs `dumpsys notification --noredact`
- parses the `Notification List` section only from `Current Notification Manager state`
- returns bounded but unredacted notification title, text, sub_text, and big_text fields; treat all returned content as sensitive
- caps returned records with `--max-notifications` (default 20, max 50)
- caps each returned string field with `--max-field-chars` (default 256, max 1024)
- caps total returned notification content characters with `--max-total-chars` (default 4096, max 20000)
- applies caps in this order: notification count, per-field characters, then total content characters
- metadata such as key, tag, channel, group, category, flags, visibility, id, and user id is parsed when present, but missing or unparseable optional fields are returned as `null`, `unknown`, or empty arrays
- system notifications may use single-segment package names such as `android` and user id `-1`
- zero posted notifications is a successful empty snapshot
- absence is only a point-in-time notification-manager observation; it is not proof that a notification was never posted or not already cleared
- stderr, nonzero exit, missing notification-manager markers, malformed record headers, or target-device failures fail with structured errors
- failure details report output sizes and parse reason; they do not include raw notification content
- Android/OEM dumpsys formats vary; unparseable dumps fail closed rather than guessing

Each `notifications[]` record includes:

- `key`
- `package_name`
- `user_id`
- `notification_id`
- `tag`
- `channel_id`
- `importance`
- `group_key`
- `category`
- `visibility`
- `flags[]`
- `title`
- `text`
- `sub_text`
- `big_text`
- `truncated`

Use this command when an agent needs current notification evidence such as OTPs, confirmation messages, sync errors, download state, or system warnings. Prefer low caps when only presence/counts are needed. Do not paste notification content into logs or user-facing summaries unless the task explicitly requires it.

## device users
<!-- covers: device-users -->

```bash
node dist/cli/main.js device users
node dist/cli/main.js --serial emulator-5554 device users
```

Returns one JSON envelope with:

- `command: "device.users"`
- `device.serial`
- `result.device_serial`
- `result.users[]`
- `result.count`
- `result.running_user_ids`
- `result.query`
- `result.verify`
- `result.semantics: "standard_pm_list_users_non_verbose"`

Rules:

- read-only target-device information command
- respects global `--serial`; without it, normal single-online-device resolution applies
- runs standard non-verbose `pm list users`
- parses only the stable `Users:` + `UserInfo{id:name:flags}` output shape
- `running` is parsed only from the standard `running` suffix
- `flags_hex` preserves Android's hex flags string and is not decoded
- does not infer current user, user type, visibility, device owner, profile owner, or profile parentage
- stderr, duplicate user ids, missing `Users:` header, verbose output, or malformed user lines fail with `DEVICE_USERS_FAILED`

`device users` returns:

- `users[].id`
- `users[].name`
- `users[].flags_hex`
- `users[].running`
- `running_user_ids[]`
- `query.method: "pm_list_users"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "pm_list_users_parse"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`

Use this command before passing non-default `--user` values to `app inspect`, `app uninstall`, `app permission inspect`, `app permission grant`, or `app permission revoke`.

## device current-user
<!-- covers: device-current-user -->

```bash
node dist/cli/main.js device current-user
node dist/cli/main.js --serial emulator-5554 device current-user
```

Returns one JSON envelope with:

- `command: "device.current_user"`
- `device.serial`
- `result.device_serial`
- `result.current_user_id`
- `result.query`
- `result.verify`
- `result.semantics: "activity_manager_reported_current_user_id"`

Rules:

- read-only target-device information command
- respects global `--serial`; without it, normal single-online-device resolution applies
- runs Activity Manager current-user query: `cmd activity get-current-user`
- parses only one non-negative integer output line
- empty output, stderr, multiple lines, non-numeric text, or ids outside Android's 32-bit user-id range fail with `DEVICE_CURRENT_USER_FAILED`
- reports only Activity Manager's current user id
- does not infer profile visibility, foreground session ownership beyond Activity Manager's report, device-owner/profile-owner state, or membership in `device users`
- target-device failures such as `NO_DEVICE`, `DEVICE_OFFLINE`, and `DEVICE_UNAUTHORIZED` are classified before output parsing

`device current-user` returns:

- `current_user_id`
- `query.method: "cmd_activity_get_current_user"`
- `query.exit_code`
- `query.command_duration_ms`
- `verify.policy: "activity_manager_current_user"`
- `verify.ok: true`
- `verify.attempts: 1`
- `verify.reason`

Use this command with `device users` when a workflow needs to decide whether to pass the active Android user id to `app inspect`, `app uninstall`, `app permission inspect`, `app permission grant`, or `app permission revoke`.

## device ensure-ready
<!-- covers: device-ensure-ready -->

```bash
node dist/cli/main.js device ensure-ready
node dist/cli/main.js --serial emulator-5554 device ensure-ready --no-dismiss-keyguard
```

Returns one JSON envelope with:

- `command: "device.ensure_ready"`
- `device.serial`
- `result.device_serial`
- `result.before`
- `result.after`
- `result.wake`
- `result.dismiss_keyguard`
- `result.verify`

Rules:

- targets one resolved device and respects global `--serial`
- reads readiness using parsed `dumpsys power` and `dumpsys window` facts
- never returns raw dumpsys output
- sends `input keyevent KEYCODE_WAKEUP` only when parsed state is not already awake or interactive
- by default runs `wm dismiss-keyguard` when the device was not initially ready
- `--no-dismiss-keyguard` disables the keyguard-dismiss attempt but still verifies readiness
- treats ready as awake or interactive with no explicit keyguard showing signal
- secure PIN, password, pattern, and biometric locks are not bypassed
- if keyguard is still showing after attempts, the command fails with `SCREEN_LOCKED`
- if the device does not become awake/interactive before timeout, the command fails with `DEVICE_NOT_READY`
- repeated calls on an already ready device are idempotent and do not send wake or dismiss-keyguard commands

`device ensure-ready` returns:

- `before.awake`
- `before.interactive`
- `before.wakefulness`
- `before.display_power_state`
- `before.keyguard_showing`
- `before.keyguard_secure`
- `after` with the same fields
- `wake.attempted`
- `wake.keycode: "KEYCODE_WAKEUP"`
- `wake.command_duration_ms`
- `dismiss_keyguard.attempted`
- `dismiss_keyguard.method: "wm_dismiss_keyguard"`
- `dismiss_keyguard.exit_code`
- `dismiss_keyguard.command_duration_ms`
- `verify.ok`
- `verify.attempts`
- `verify.reason`

Use this command before UI workflows when the screen may be off, dimmed, dreaming, or blocked by keyguard. Do not use it as a way to unlock secure personal devices; it reports secure lock blockage instead.
