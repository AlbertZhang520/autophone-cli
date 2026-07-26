---
name: autophone-cli
description: Control Android phones or emulators over adb for agent workflows. Use when a task needs Android device state or settings (screen, network, storage, battery, time, locale, IME, brightness, animations, accessibility, orientation, statusbar, volume, ringer, notifications, users, readiness), app lifecycle/inspection/permissions (list, inspect, install, uninstall, launch, start, stop, clear-data, resolve or open URLs, appops, pids, memory, graphics), device file stat/hash/list/mkdir/copy/move/rm/push/pull, UI automation (observe, find, tap, double-tap, long-press, drag, scroll, wait, text, key, clipboard), screenshots, screen recording, bounded JSON recipes, proof manifests, or bounded app logs.
---

# autophone-cli

## Core Rule

Treat `autophone-cli` as an agent-facing Android control runtime, not a raw adb wrapper. Every agent command returns exactly one JSON envelope on stdout; act on parsed fields, never on prose.

The core loop for any on-device task:

```text
device ensure-ready (when screen/keyguard state is unknown) ->
app launch / app start (when a target app must be foreground) ->
observe -> find -> tap/double-tap/long-press/drag/scroll/text/key ->
wait ui / wait app -> verify
```

## Interaction Loop

1. Run `autophone observe` to get a fresh snapshot.
2. Run `autophone find` with a selector to inspect usable candidates.
3. If `find` returns `count: 1`, use `autophone tap`, `autophone double-tap`, `autophone long-press`, or one endpoint of `autophone drag` with the same selector.
4. If `find` returns `count: 0`, do not tap or double-tap; observe again or refine the task.
5. If `find` returns `count > 1`, refine the selector or pass a `candidate_index` from the fresh result to `tap`, `double-tap`, `long-press`, or the corresponding drag endpoint.
6. Treat `tap`, `double-tap`, `long-press`, or `drag` success as valid only when its verify block says `ok: true`.

`find` is intentionally safe for ambiguity: zero, one, or many candidates are all successful read-only results. `tap`, `double-tap`, `long-press`, and `drag` are intentionally strict: ambiguous selectors fail with `AMBIGUOUS_TARGET`.

Do not guess coordinates from screenshots. Controlled taps, double-taps, long presses, drags, and scrolls must derive their points from UI tree bounds returned by `find` or `observe`, or from observed window size. Use `screenshot` or `screenrecord` only for visual evidence, debugging, or reporting.

## Global Invariants

- stdout must be exactly one JSON object in agent command paths.
- help/version human paths write to stderr, leave stdout empty, and exit 0.
- logs and diagnostics go to stderr.
- raw coordinates require explicit unsafe opt-in.
- failed verification is command failure.
- agent agreement is not evidence; tests, fixtures, traces, or command output are evidence.

## Command Reference

Read only the domain file the current task needs. Each file lists when to use its commands, their behavioral constraints, exact command shapes, and response fields.

| Task needs | Read |
| --- | --- |
| UI automation: observe, find, tap, double-tap, long-press, drag, scroll, scroll-until, key press, text input/clear, clipboard, wait ui/app | `references/ui.md` |
| Device state and settings: list, info, screen, network, storage, battery, time, locale, IME, brightness, animations, accessibility, orientation, statusbar, volume, ringer, notifications, users, ensure-ready | `references/device.md` |
| App lifecycle, inspection, and permissions: list, inspect, activities, package-info, links, appops, pids, memory, graphics, install, uninstall, permissions, clear-data, resolve-url, open-url, launch, start, stop, current | `references/app.md` |
| Device files: stat, hash, list, mkdir, copy, move, rm, push, pull | `references/files.md` |
| Recipes, media evidence, and logs: run --recipe, screenshot, screenrecord, logs dump, --proof-dir | `references/media-logs.md` |
