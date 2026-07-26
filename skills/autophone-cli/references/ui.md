<!-- GENERATED FILE - do not edit. Source: docs/skill-src/ui.md. Regenerate with: pnpm skill:gen -->

# autophone-cli — UI Interaction

Use commands from the project root after `pnpm build`, or from package installation once published.

Agent command paths return one JSON envelope on stdout. Human help paths such as `--help`, `<command> --help`, and `help <command>` write help text to stderr, leave stdout empty, and exit 0. Human version paths using global `--version` or `-V` write the runtime version to stderr, leave stdout empty, and exit 0.

## When to Use

- Use `wait ui` or `wait app` after asynchronous app transitions instead of hidden sleeps. Use `wait ui --condition absent` for dialogs, spinners, or labels that must disappear.
- Use `scroll --direction` to move through lists/pages; direction means content movement, not finger direction. Add `--within-*` when only an inner scrollable element should receive the gesture.
- Use `scroll-until --direction --text/--resource-id/--content-desc/--class` when an off-screen selector should be discovered before a later action; add `--within-*` for inner containers. It does not tap.
- Use `key press` for safe navigation keys, recent-app switching, and cursor/list boundary movement; its default verification is explicitly disabled.
- Use `text clear` before `text input` when replacing a focused field's existing value; treat clear as bounded best-effort, not proof the field is empty.
- Use `text input` only after the intended input field is focused. Use default `input_text` for safe printable ASCII, `--via adb_keyboard --verify field_text` for Unicode committed text when ADBKeyboard is already current, and `--via clipboard` only when clipboard mutation is explicitly intended.
- Use `clipboard get` only for metadata or digest checks; it never returns clipboard text. Use `clipboard set --text` only when intentionally mutating clipboard state.

## Constraints

- observe reports actual display rotation as `rotation_degrees`, derives `orientation` from that rotation plus `window_size`, and treats `auto_rotate` as setting state only.
- candidate indexes are fresh-observation list positions, not stable UI identities; rerun `find` after visible UI changes before indexed actions.
- double-tap uses the same selector/raw-point safety model as tap, runs two Android `input tap` calls in one device-side shell session, and caps `--interval` to 40-300ms.
- double-tap verification defaults to `screen_changed`; it proves only a visible snapshot change and does not prove semantic double-tap success.
- long press uses the same selector/raw-point safety model as tap and executes as `input swipe` with identical start/end coordinates.
- drag endpoints use selector safety only, resolve source and destination from the same observed snapshot, reject too-close endpoints, and do not expose raw coordinate input.
- drag defaults to Android `input draganddrop`; use `--gesture swipe` only for slider/pan-like gestures where swipe semantics are intended.
- drag verification defaults to `none`; `--verify screen_changed` only proves a visible snapshot change, not semantic drag-and-drop success.
- scroll never accepts raw coordinates; it derives safe swipe points from observed `window_size` by default, or from one uniquely matched `--within-*` element's UI-tree bounds.
- scroll-until never taps; it is a bounded discovery command that returns `found:false` with `end_reached` or `budget_exhausted` rather than failing when the selector remains absent. `--within-*` scopes the scroll gesture only; target selector matching remains global visible-candidate matching.
- key commands are allowlisted and exclude power, wake, camera, and volume keys.
- key command success means the allowlisted keyevent was sent; it does not prove contextual effects such as recents UI visibility or cursor movement.
- text input commands never echo raw or encoded text in stdout JSON. Default `input_text` accepts printable ASCII except `%` and backslash; `--via adb_keyboard` supports bounded UTF-8 committed text without clipboard mutation, and `--via clipboard` supports bounded UTF-8 paste. Only `--verify field_text` proves exact inserted content; wrong-IME and clipboard-write failures abort before dispatch.
- clipboard commands never return raw clipboard text; `clipboard get` is metadata-only and `clipboard set` is write-only metadata confirmation.
- text clear sends a bounded `KEYCODE_MOVE_END` plus repeated `KEYCODE_DEL` sequence; only `--verify field_text` proves field emptiness (it reads focused accessibility text lengths for verification and never emits field content).
- wait commands are read-only and propagate device/adb failures immediately, except that a poll timeout caused by exhausted wait budget is reported as `WAIT_TIMEOUT`. `wait ui --condition absent` succeeds only when no current UI node matches the selector, not just when no usable candidate exists.

## observe

```bash
node dist/cli/main.js --timeout 10000 observe
```

Returns one JSON envelope with:

- `command: "observe"`
- `result.snapshot`
- `device.serial`

Snapshot includes:

- `device_serial`
- `package`
- `activity`
- `window_size`
- `orientation`
- `rotation_degrees`
- `auto_rotate`
- `ui_hash`
- `elements[]`

`rotation_degrees` is the actual current display rotation parsed from `dumpsys window` when available. `orientation` is derived from that actual rotation plus `window_size`, not from the user-rotation preference. `auto_rotate` reflects the system `accelerometer_rotation` setting when available.

With no attached device, stdout should still be one JSON object with `error.code: "NO_DEVICE"`.

## find

```bash
node dist/cli/main.js find --text "Login"
node dist/cli/main.js find --resource-id "com.example:id/login"
node dist/cli/main.js find --content-desc "Login"
```

Selector flags:

- `--text`
- `--resource-id`
- `--content-desc`
- `--class`

At least one selector flag is required.
Selector values must not be empty or blank.

`find` returns:

- `snapshot_id`
- `device_serial`
- `selector`
- `count`
- `total_elements`
- `usable_only: true`
- `candidates[]`

`count` is the number of usable candidates after bounds filtering. It is not the raw number of XML nodes that matched the selector.
Each `candidate_index` is assigned from zero within that fresh result after source-order sorting and usable-bounds filtering.

Read-only semantics:

- `count: 0` is `ok: true`
- `count: 1` is `ok: true`
- `count > 1` is `ok: true`
- `find` must not call adb `input tap`

## tap

```bash
node dist/cli/main.js tap --text "Login"
node dist/cli/main.js tap --resource-id "com.example:id/login"
node dist/cli/main.js tap --text "OK" --candidate-index 1 --verify none
```

Default verification:

```text
screen_changed
```

`tap` observes before the action, taps the single matching candidate center, then observes up to three times for a changed `ui_hash`, package, or activity. When a selector matches multiple usable candidates, pass `--candidate-index` from a fresh `find` result to choose one candidate from the new observation.

Use `--verify none` only when the caller explicitly accepts no effect verification.

Rules:

- without `--candidate-index`, multiple usable candidates fail with `AMBIGUOUS_TARGET`
- `--candidate-index` is a fresh candidate list index, not a stable element identity
- if UI changes after `find`, rerun `find` before an indexed `tap`
- an absent candidate index fails with retriable `TARGET_NOT_FOUND` and returns the fresh candidates
- `--candidate-index` cannot be combined with raw coordinates

Unsafe raw coordinates:

```bash
node dist/cli/main.js tap --x 540 --y 1260 --unsafe --verify none
```

Raw coordinates without `--unsafe` must fail with `UNSAFE_OPERATION`.

## double-tap

```bash
node dist/cli/main.js double-tap --text "Photo"
node dist/cli/main.js double-tap --resource-id "com.example:id/photo" --interval 120
node dist/cli/main.js double-tap --text "Photo" --candidate-index 1 --verify none
```

Default verification:

```text
screen_changed
```

`double-tap` observes before the action, resolves one usable candidate center, then runs two Android `input tap` calls in one device-side shell session separated by `interval_ms`. It then observes up to three times for a changed `ui_hash`, package, or activity. When a selector matches multiple usable candidates, pass `--candidate-index` from a fresh `find` result to choose one candidate from the new observation.

Rules:

- selector flags match `tap`: `--text`, `--resource-id`, `--content-desc`, and `--class`
- without `--candidate-index`, multiple usable candidates fail with `AMBIGUOUS_TARGET`
- `--candidate-index` is a fresh candidate list index, not a stable element identity
- if UI changes after `find`, rerun `find` before an indexed `double-tap`
- an absent candidate index fails with retriable `TARGET_NOT_FOUND` and returns the fresh candidates
- `--candidate-index` cannot be combined with raw coordinates
- `--interval` is the delay between taps in milliseconds from `40` to `300`; default is `80`
- global `--timeout` must be at least `interval + 1000`
- default verification is `screen_changed`; this proves only a visible snapshot change, not semantic double-tap success
- use `--verify none` only when the caller explicitly accepts no effect verification

Unsafe raw coordinates:

```bash
node dist/cli/main.js --timeout 2000 double-tap --x 540 --y 1260 --unsafe --interval 80 --verify none
```

Raw coordinates without `--unsafe` must fail with `UNSAFE_OPERATION`.

`double-tap` returns:

- `candidate`
- `point`
- `interval_ms`
- `before`
- `after`
- `verify`

## long-press

```bash
node dist/cli/main.js long-press --text "Item"
node dist/cli/main.js long-press --resource-id "com.example:id/item" --duration 1000
node dist/cli/main.js long-press --text "Item" --candidate-index 1 --duration 1000 --verify none
```

Default verification:

```text
screen_changed
```

`long-press` observes before the action, resolves one usable candidate center, then executes Android `input swipe` with the same start and end point for `duration_ms`. It then observes up to three times for a changed `ui_hash`, package, or activity. When a selector matches multiple usable candidates, pass `--candidate-index` from a fresh `find` result to choose one candidate from the new observation.

Rules:

- selector flags match `tap`: `--text`, `--resource-id`, `--content-desc`, and `--class`
- without `--candidate-index`, multiple usable candidates fail with `AMBIGUOUS_TARGET`
- `--candidate-index` is a fresh candidate list index, not a stable element identity
- if UI changes after `find`, rerun `find` before an indexed `long-press`
- an absent candidate index fails with retriable `TARGET_NOT_FOUND` and returns the fresh candidates
- `--candidate-index` cannot be combined with raw coordinates
- `--duration` is press duration in milliseconds from `500` to `5000`; default is `800`
- global `--timeout` must be at least `duration + 1000`
- the implementation uses a zero-distance swipe, so very short or OEM-adjusted long-press thresholds may need a higher `--duration`
- default verification is `screen_changed`; use `--verify none` when the expected result is haptic-only, drag-handle state, or another effect not visible in the UI hierarchy

Unsafe raw coordinates:

```bash
node dist/cli/main.js --timeout 2000 long-press --x 540 --y 1260 --unsafe --duration 500 --verify none
```

Raw coordinates without `--unsafe` must fail with `UNSAFE_OPERATION`.

`long-press` returns:

- `candidate`
- `point`
- `duration_ms`
- `before`
- `after`
- `verify`

## drag

```bash
node dist/cli/main.js drag --from-text "Item" --to-text "Target"
node dist/cli/main.js drag --from-resource-id "com.example:id/source" --to-resource-id "com.example:id/target" --duration 1200
node dist/cli/main.js drag --from-text "Slider" --to-content-desc "75%" --gesture swipe --verify screen_changed
node dist/cli/main.js drag --from-text "Item" --from-candidate-index 1 --to-text "Target" --to-candidate-index 0
```

Default verification:

```text
none
```

`drag` observes once, resolves exactly one source candidate and one destination candidate from that same snapshot, rejects endpoints that are too close together, then executes Android `input draganddrop` by default. Use `--gesture swipe` only for slider, seekbar, or pan-like interactions where swipe semantics are intended.

Rules:

- source selector flags are `--from-text`, `--from-resource-id`, `--from-content-desc`, and `--from-class`
- destination selector flags are `--to-text`, `--to-resource-id`, `--to-content-desc`, and `--to-class`
- both source and destination selectors are required
- raw drag coordinates are not supported
- without candidate indexes, multiple usable source or destination candidates fail with `AMBIGUOUS_TARGET`
- `--from-candidate-index` and `--to-candidate-index` are fresh candidate list indexes, not stable element identities
- if UI changes after `find`, rerun `find` before an indexed `drag`
- absent endpoint candidate indexes fail with retriable `TARGET_NOT_FOUND` and return the fresh candidates for that endpoint
- `--duration` is gesture duration in milliseconds from `100` to `10000`; default is `1000`
- global `--timeout` must be at least `duration + 1000`
- default verification is `none` because visible snapshot changes do not prove semantic drag-and-drop success
- `--verify screen_changed` observes after the gesture and only requires changed `ui_hash`, package, or activity

`drag` returns:

- `from_candidate`
- `to_candidate`
- `start`
- `end`
- `gesture`
- `duration_ms`
- `before`
- `after`
- `verify`

## scroll

```bash
node dist/cli/main.js scroll --direction down
node dist/cli/main.js scroll --direction up --amount small
node dist/cli/main.js scroll --direction right --amount large --duration 500 --verify screen_changed
node dist/cli/main.js scroll --direction down --within-resource-id "com.example:id/list"
```

Direction is content movement, not finger movement:

- `--direction down`: content moves down; finger swipes up
- `--direction up`: content moves up; finger swipes down
- `--direction right`: content moves right; finger swipes left
- `--direction left`: content moves left; finger swipes right

Rules:

- `--direction` is required and must be `down`, `up`, `left`, or `right`.
- `--amount` is `small`, `medium`, or `large`; default is `medium`.
- `--duration` is swipe duration in milliseconds from `100` to `2000`; default is `300`.
- global `--timeout` must be greater than `--duration`.
- optional `--within-text`, `--within-resource-id`, `--within-content-desc`, and `--within-class` scope the gesture to one uniquely matched UI node.
- raw scroll coordinates are not supported.
- gesture points are derived from the observed `window_size` with safe edge insets by default.
- with `--within-*`, gesture points are derived from the matched element's UI-tree bounds clipped to the observed window, then safe edge insets are applied; `--amount` remains a fraction of that scoped safe region.
- missing or too-small `window_size` fails with retriable `WINDOW_SIZE_UNAVAILABLE`.
- missing, ambiguous, or too-small `--within-*` scopes fail before swiping with `TARGET_NOT_FOUND`, `AMBIGUOUS_TARGET`, or retriable `SCROLL_REGION_TOO_SMALL`.
- default verification is `none` because list boundaries and static screens can be legitimate no-ops.
- `--verify screen_changed` observes after the swipe and requires changed `ui_hash`, package, or activity.

`scroll` returns:

- `direction`
- `amount`
- `finger_direction`
- `start`
- `end`
- `scope`: `window` or `element`
- `within`: `null` for window scrolls, otherwise the selector and resolved candidate used for the scoped gesture
- `duration_ms`
- `before`
- `after`
- `verify`

## scroll-until

```bash
node dist/cli/main.js scroll-until --direction down --text "Target"
node dist/cli/main.js scroll-until --direction up --resource-id "com.example:id/item" --max-scrolls 5
node dist/cli/main.js scroll-until --direction right --content-desc "Next" --amount small
node dist/cli/main.js scroll-until --direction down --text "Target" --within-resource-id "com.example:id/list"
```

`scroll-until` is a bounded discovery command. It observes the current UI, returns immediately if the selector is already visible, otherwise sends safe window-derived or scoped element-derived scroll gestures in one explicit content direction until the selector appears, the scroll produces no changed snapshot, or `--max-scrolls` is exhausted. It never taps.

Rules:

- selector flags match `find`: `--text`, `--resource-id`, `--content-desc`, and `--class`
- `--direction` is required and uses content movement semantics: `down`, `up`, `left`, or `right`
- `--amount` is `small`, `medium`, or `large`; default is `medium`
- `--max-scrolls` is `1` to `25`; default is `10`
- `--duration` is swipe duration in milliseconds from `100` to `2000`; default is `300`
- global `--timeout` must be greater than `--duration`
- optional `--within-text`, `--within-resource-id`, `--within-content-desc`, and `--within-class` scope each scroll gesture to one uniquely matched UI node
- `--within-*` is resolved on the current snapshot before the initial target check and before every scroll attempt; if it later disappears or becomes ambiguous, the command fails instead of sending a guessed gesture
- `--within-*` scopes the scroll gesture only; the target selector is still matched against global visible usable candidates
- raw coordinates are not supported
- multiple visible candidates return `count > 1`; this command does not raise `AMBIGUOUS_TARGET`
- when the selector remains absent, the command still returns `ok:true` with `found:false`
- `reason` is `found_initial`, `found_after_scroll`, `end_reached`, or `budget_exhausted`
- use `tap`, `double-tap`, or `long-press` separately after `found:true`; rerun `find` if the UI changes

`scroll-until` returns:

- `selector`
- `direction`
- `amount`
- `scope`: `window` or `element`
- `within`: `null` or the scoped gesture selector
- `max_scrolls`
- `duration_ms`
- `scrolls`
- `found`
- `reason`
- `snapshot_id`
- `device_serial`
- `ui_hash`
- `count`
- `total_elements`
- `usable_only`
- `candidates`
- `last_scroll`, including `scope` and the scoped `within_candidate` when a scoped gesture was sent

## key press

```bash
node dist/cli/main.js key press --key BACK
node dist/cli/main.js key press --key APP_SWITCH
node dist/cli/main.js key press --key MOVE_END
node dist/cli/main.js key press --key DPAD_CENTER --verify screen_changed
```

Allowed keys:

- `BACK`
- `HOME`
- `ENTER`
- `TAB`
- `ESCAPE`
- `DEL`
- `DPAD_UP`
- `DPAD_DOWN`
- `DPAD_LEFT`
- `DPAD_RIGHT`
- `DPAD_CENTER`
- `APP_SWITCH`
- `MOVE_HOME`
- `MOVE_END`
- `MENU`
- `SEARCH`

Default verification:

```text
none
```

`MOVE_HOME` and `MOVE_END` send standalone movement keys; they do not clear text. `text clear` is the bounded deletion command for focused fields.

`APP_SWITCH` requests Android's recent-app switcher, but OEM and gesture-navigation behavior can vary. Command success only means the keyevent was accepted by adb.

`--verify screen_changed` observes before and after the key event and requires a changed `ui_hash`, package, or activity. No-op keys and transient overlays such as recent-app switching should normally use the default `none` policy.

## text input

```bash
node dist/cli/main.js text input --text "hello world"
node dist/cli/main.js text input --text "Alice_42" --verify screen_changed
node dist/cli/main.js text input --text "p@ss:w0rd! a+b/c?d#e"
node dist/cli/main.js text input --text "你好 Agent🙂" --via adb_keyboard --verify field_text
node dist/cli/main.js text input --text "你好" --via clipboard --verify field_text
```

Rules:

- text is sent to the currently focused Android input field
- default `--via input_text` accepts printable ASCII except `%` and backslash
- spaces are encoded as `%s` for Android `input text`; newly supported punctuation is shell-escaped before adb execution
- `%`, backslash, tabs, newlines, control characters, and non-ASCII text are rejected for default `--via input_text`
- `--via adb_keyboard` supports bounded UTF-8 committed text, including Chinese, emoji, `%`, and backslash, without reading or writing clipboard state
- `--via adb_keyboard` requires `com.android.adbkeyboard/.AdbIME` to already be current; it does not switch the IME implicitly and fails before dispatch with `DEVICE_IME_FAILED` when that precondition is not met
- ADBKeyboard receives a package-scoped `ADB_INPUT_B64` broadcast containing UTF-8 Base64; broadcast completion proves dispatch only, so use `--verify field_text`
- `--via clipboard` supports bounded UTF-8 text by setting the Android clipboard and sending `KEYCODE_PASTE`
- `--via clipboard` fails structurally (no paste dispatched) when the device clipboard shell command is unsupported, such as AOSP builds answering `No shell command implementation.`
- input must be non-blank and at most 256 Unicode codepoints; Unicode routes reject control characters and unpaired UTF-16 surrogate code units
- stdout never echoes raw or encoded text; results include lengths only
- failed requests redact the `--text` value in `trace.argv`
- default verification is `none`
- `--verify screen_changed` only checks whether `ui_hash`, package, or activity changed; it does not prove exact inserted text
- `--verify field_text` captures the focused element's text before input as a baseline, then requires the post-input focused text to equal `--text` exactly (hint-replaced fields) or baseline + `--text` (app-decorated fields that keep a semantic prefix, or appended input); it is the only policy that proves inserted content and is required for trustworthy `adb_keyboard` or clipboard workflows; failure details carry lengths and focus state only, never field content or low-entropy digests
- `adb_keyboard` commits final Unicode text; it does not simulate physical pinyin keystrokes, IME composition, or candidate selection

`text input` returns:

- `charset`: `"adb_shell_printable_ascii"`, `"adb_keyboard_utf8"`, or `"clipboard_utf8"`
- `via`
- `text_length`
- `encoded_length`
- `codepoint_length`
- `verify`

## clipboard get

```bash
node dist/cli/main.js clipboard get
```

Rules:

- returns clipboard metadata only
- never prints clipboard text
- result includes `present`, `length`, `sha256`, `charset`, and `preview_redacted`

## clipboard set

```bash
node dist/cli/main.js clipboard set --text "hello"
```

Rules:

- mutates Android clipboard text
- does not echo raw text in stdout
- does not read back clipboard content
- fails with `CLIPBOARD_UNSUPPORTED` when the device lacks a clipboard shell handler (AOSP `cmd clipboard` answers `No shell command implementation.` with exit code 0); success means the command was accepted, not that clipboard content was proven
- result includes text length, codepoint length, UTF-8 bytes, sha256, and command-accepted verification

## text clear

```bash
node dist/cli/main.js text clear
node dist/cli/main.js text clear --max-chars 128
node dist/cli/main.js text clear --verify field_text
```

Default verification:

```text
none
```

`text clear` sends one bounded best-effort key sequence to the currently focused Android input field: `KEYCODE_MOVE_END` followed by repeated `KEYCODE_DEL`. Only `--verify field_text` can prove the field is empty; other policies do not read field content.

Rules:

- the intended input field must already be focused
- `--max-chars` is the maximum number of backward-delete key events to send, from `1` to `512`; default is `64`
- the command sends the key sequence in one Android `input keyevent` invocation
- stdout never includes focused-field content
- default verification is `none`
- `--verify screen_changed` only checks whether `ui_hash`, package, or activity changed; it does not prove the field is empty
- `--verify field_text` proves emptiness only when the focused element's accessibility text becomes empty; otherwise the command fails with `VERIFY_FAILED` whose details set `possible_app_hint_text: true`, because non-empty accessibility text may be an app hint or semantic label rather than residual input; for hint-labeled fields prefer `screen_changed` or `none`
- clearing an already-empty field may be a legitimate no-op and should normally use the default `none` verification
- if the existing field value is longer than `--max-chars`, residual text may remain

`text clear` returns:

- `strategy`
- `max_chars`
- `key_events`
- `verify`

## wait ui

```bash
node dist/cli/main.js wait ui --text "Ready" --wait-timeout 10000 --interval 500
node dist/cli/main.js wait ui --text "Loading" --condition absent --wait-timeout 10000 --interval 500
```

Rules:

- selector flags match `find`
- `--condition` is `present` or `absent`; default is `present`
- `present` succeeds when the selector has at least one usable candidate
- `absent` succeeds only when no current UI node matches the selector at all, including unusable or off-screen matches
- `--wait-timeout` is the overall condition wait budget
- `--interval` is the delay between polls
- global `--timeout` remains the per-adb-call timeout and is capped by the remaining wait budget
- use a global `--timeout` lower than `--wait-timeout` only when per-adb timeout failures should surface separately
- driver errors such as `NO_DEVICE`, `DUMP_TIMEOUT`, and `UI_DUMP_FAILED` propagate immediately unless the lower-level timeout was caused by the exhausted wait budget
- `WAIT_TIMEOUT` means the condition did not become true in time, including when the final wait-budget-capped poll times out

`wait ui` returns:

- `condition.mode`
- `present`
- `matched_nodes`
- `count` and `candidates` for usable candidates
- `snapshot_id`
- `device_serial`

## wait app

```bash
node dist/cli/main.js wait app --package "com.example"
node dist/cli/main.js wait app --package "com.example" --activity ".MainActivity"
```

Package-only wait is preferred for app launches because splash and trampoline activities are common. Supplying `--activity` requires exact normalized activity equality.

The same wait budget rules apply as `wait ui`: device/adb failures propagate, but a lower-level timeout caused by the exhausted wait budget is reported as `WAIT_TIMEOUT`.

`wait app` returns:

- envelope `device.serial`
- `condition`
- `attempts`
- `elapsed_ms`
- `current.device_serial`
- `current.package`
- `current.activity`
- `current.focused`
