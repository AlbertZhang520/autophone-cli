import { resolve as resolvePath } from "node:path";
import type { AutophoneErrorBody } from "../contracts/index.js";

type RedactableError = AutophoneErrorBody;

type SensitiveFlagRule = {
  flag: string;
  argvReplacement: string;
  errorReplacement?: string | undefined;
  redactResolvedPath?: boolean | undefined;
};

type SensitiveRedactionRule = {
  commandName: string;
  argvPath: readonly string[];
  flags: readonly SensitiveFlagRule[];
  redactError?: (error: RedactableError) => RedactableError;
};

export const SENSITIVE_CLI_REDACTION_RULES = [
  {
    commandName: "text.input",
    argvPath: ["text", "input"],
    flags: [{ flag: "--text", argvReplacement: "<redacted>" }],
    redactError: redactTextInputError
  },
  {
    commandName: "clipboard.set",
    argvPath: ["clipboard", "set"],
    flags: [{ flag: "--text", argvReplacement: "<redacted>", errorReplacement: "<redacted>" }],
    redactError: redactTextInputError
  },
  {
    commandName: "recipe.run",
    argvPath: ["run"],
    flags: [{ flag: "--recipe", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>", redactResolvedPath: true }]
  },
  {
    commandName: "app.open_url",
    argvPath: ["app", "open-url"],
    flags: [{ flag: "--url", argvReplacement: "<redacted>", errorReplacement: "<redacted-url>" }]
  },
  {
    commandName: "app.resolve_url",
    argvPath: ["app", "resolve-url"],
    flags: [{ flag: "--url", argvReplacement: "<redacted>", errorReplacement: "<redacted-url>" }]
  },
  {
    commandName: "app.install",
    argvPath: ["app", "install"],
    flags: [{ flag: "--apk", argvReplacement: "<redacted>", errorReplacement: "<redacted>", redactResolvedPath: true }]
  },
  {
    commandName: "files.push",
    argvPath: ["files", "push"],
    flags: [
      { flag: "--local", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>", redactResolvedPath: true },
      { flag: "--remote", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>" }
    ]
  },
  {
    commandName: "files.pull",
    argvPath: ["files", "pull"],
    flags: [
      { flag: "--remote", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>" },
      { flag: "--output", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>", redactResolvedPath: true }
    ]
  },
  {
    commandName: "files.stat",
    argvPath: ["files", "stat"],
    flags: [{ flag: "--remote", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>" }]
  },
  {
    commandName: "files.hash",
    argvPath: ["files", "hash"],
    flags: [{ flag: "--remote", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>" }]
  },
  {
    commandName: "files.list",
    argvPath: ["files", "list"],
    flags: [{ flag: "--remote", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>" }]
  },
  {
    commandName: "files.mkdir",
    argvPath: ["files", "mkdir"],
    flags: [{ flag: "--remote", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>" }]
  },
  {
    commandName: "files.copy",
    argvPath: ["files", "copy"],
    flags: [
      { flag: "--source", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>" },
      { flag: "--dest", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>" }
    ]
  },
  {
    commandName: "files.move",
    argvPath: ["files", "move"],
    flags: [
      { flag: "--source", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>" },
      { flag: "--dest", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>" },
      { flag: "--confirm-source", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>" }
    ]
  },
  {
    commandName: "files.rm",
    argvPath: ["files", "rm"],
    flags: [
      { flag: "--remote", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>" },
      { flag: "--confirm-remote", argvReplacement: "<redacted>", errorReplacement: "<redacted-path>" }
    ]
  }
] as const satisfies readonly SensitiveRedactionRule[];

export function redactSensitiveArgv(argv: readonly string[], commandName: string): string[] {
  const redacted = [...argv];
  for (const rule of findMatchingRedactionRules(argv, commandName)) {
    for (const flag of rule.flags) {
      redactArgvFlag(redacted, flag);
    }
  }
  return redacted;
}

export function redactSensitiveError(error: RedactableError, argv: readonly string[], commandName: string): RedactableError {
  let redacted = error;
  for (const rule of findMatchingRedactionRules(argv, commandName)) {
    if (rule.redactError !== undefined) {
      redacted = rule.redactError(redacted);
    }
    for (const flag of rule.flags) {
      if (flag.errorReplacement === undefined) {
        continue;
      }
      for (const value of readFlagValues(argv, flag.flag)) {
        if (value.length === 0) {
          continue;
        }
        for (const needle of redactionNeedles(value, flag)) {
          redacted = {
            ...redacted,
            message: redacted.message.replaceAll(needle, flag.errorReplacement),
            details: redactExactValue(redacted.details, needle, flag.errorReplacement) as
              | Record<string, unknown>
              | undefined
          };
        }
      }
    }
  }
  return redacted;
}

function redactionNeedles(value: string, flag: SensitiveFlagRule): string[] {
  const needles = [value];
  if (flag.redactResolvedPath === true) {
    needles.push(resolvePath(value));
  }
  return [...new Set(needles)];
}

function findMatchingRedactionRules(argv: readonly string[], commandName: string): readonly SensitiveRedactionRule[] {
  if (commandName !== "unknown") {
    const commandMatches = SENSITIVE_CLI_REDACTION_RULES.filter((rule) => rule.commandName === commandName);
    if (commandMatches.length > 0) {
      return commandMatches;
    }
  }
  return SENSITIVE_CLI_REDACTION_RULES.filter((rule) => argvMatchesCommandPath(argv, rule.argvPath));
}

function argvMatchesCommandPath(argv: readonly string[], commandPath: readonly string[]): boolean {
  const tokens = argv.filter((value) => !value.startsWith("-"));
  return tokens.some((_, index) => commandPath.every((part, offset) => tokens[index + offset] === part));
}

function redactArgvFlag(argv: string[], flag: SensitiveFlagRule): void {
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === flag.flag && index + 1 < argv.length) {
      argv[index + 1] = flag.argvReplacement;
      continue;
    }
    if (value?.startsWith(`${flag.flag}=`)) {
      argv[index] = `${flag.flag}=${flag.argvReplacement}`;
    }
  }
}

function readFlagValues(argv: readonly string[], flag: string): string[] {
  const values: string[] = [];
  const prefix = `${flag}=`;
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === flag && argv[index + 1] !== undefined) {
      values.push(argv[index + 1]!);
    } else if (value?.startsWith(prefix)) {
      values.push(value.slice(prefix.length));
    }
  }
  return values;
}

function redactExactValue(value: unknown, needle: string, replacement: string): unknown {
  if (typeof value === "string") {
    return value.replaceAll(needle, replacement);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactExactValue(item, needle, replacement));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, redactExactValue(entry, needle, replacement)])
    );
  }
  return value;
}

function redactTextInputError(error: RedactableError): RedactableError {
  return {
    ...error,
    message: error.code === "ADB_ERROR" ? "adb text input command failed" : error.message,
    details: redactTextInputDetails(error.details)
  };
}

function redactTextInputDetails(details: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (details === undefined) {
    return undefined;
  }
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (key === "args" && Array.isArray(value)) {
      redacted[key] = redactAdbTextArgs(value);
    } else if (key === "stderr" || key === "stdout") {
      redacted[key] = "<redacted>";
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function redactAdbTextArgs(args: unknown[]): unknown[] {
  const redacted = [...args];
  for (let index = 0; index < redacted.length - 1; index += 1) {
    if (redacted[index] === "text" && redacted[index - 1] === "input") {
      redacted[index + 1] = "<redacted>";
    } else if (
      redacted[index] === "msg" &&
      redacted[index - 1] === "--es" &&
      redacted.includes("ADB_INPUT_B64")
    ) {
      redacted[index + 1] = "<redacted>";
    } else if (
      redacted[index] === "text" &&
      redacted[index - 1] === "set" &&
      redacted[index - 2] === "clipboard" &&
      redacted[index - 3] === "cmd"
    ) {
      redacted[index + 1] = "<redacted>";
    }
  }
  return redacted;
}
