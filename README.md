# autophone-cli

An agent-facing CLI for controlling Android devices. It wraps `adb` and
uiautomator into a set of commands that print exactly one JSON envelope on
stdout, so a coding agent — or a plain shell script — can drive a real device
through an `observe → find → act → verify` loop.

**Status:** pre-1.0, under active development. Command names and response
shapes may still change.

## What is in this repository

| Path | Contents |
| --- | --- |
| `src/` | CLI entry points, Zod command contracts, ADB/uiautomator driver |
| `schemas/` | JSON Schemas generated from the contracts |
| `docs/skill-src/` | Annotated documentation sources |
| `skills/autophone-cli/` | Agent skill docs generated from those sources |
| `tests/`, `src/**/*.test.ts` | Unit and contract tests |

## Requirements

Node.js >= 20, `adb` available on `PATH`, and an Android device with USB
debugging enabled (or an emulator).

The `pnpm check` suite additionally needs Node 22, 24, or >= 26, because the
dependency linter refuses to run on other releases.

## Build and run

```bash
pnpm install
pnpm build

node dist/cli/main.js device list
node dist/cli/main.js --serial <serial> observe
node dist/cli/main.js --serial <serial> find --text "Sign in"
```

## Conventions worth knowing

- On agent paths, stdout carries a single JSON object; help text and
  diagnostics go to stderr.
- Every command has a Zod request/response contract; the JSON Schemas are
  generated from it, not written by hand.
- Failed verification is a command failure, not a warning.
- Text and clipboard values are redacted from output by default.

## License

[Apache-2.0](LICENSE). See [NOTICE](NOTICE).
