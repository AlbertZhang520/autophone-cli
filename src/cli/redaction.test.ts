import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { SENSITIVE_CLI_REDACTION_RULES, redactSensitiveError } from "./redaction.js";

const CURRENT_SECRET_BEARING_CLI_OPTIONS = [
  { command: "text.input", argv_path: ["text", "input"], flag: "--text" },
  { command: "clipboard.set", argv_path: ["clipboard", "set"], flag: "--text" },
  { command: "recipe.run", argv_path: ["run"], flag: "--recipe" },
  { command: "app.open_url", argv_path: ["app", "open-url"], flag: "--url" },
  { command: "app.resolve_url", argv_path: ["app", "resolve-url"], flag: "--url" },
  { command: "app.install", argv_path: ["app", "install"], flag: "--apk" },
  { command: "files.push", argv_path: ["files", "push"], flag: "--local" },
  { command: "files.push", argv_path: ["files", "push"], flag: "--remote" },
  { command: "files.pull", argv_path: ["files", "pull"], flag: "--remote" },
  { command: "files.pull", argv_path: ["files", "pull"], flag: "--output" },
  { command: "files.stat", argv_path: ["files", "stat"], flag: "--remote" },
  { command: "files.hash", argv_path: ["files", "hash"], flag: "--remote" },
  { command: "files.list", argv_path: ["files", "list"], flag: "--remote" },
  { command: "files.mkdir", argv_path: ["files", "mkdir"], flag: "--remote" },
  { command: "files.copy", argv_path: ["files", "copy"], flag: "--source" },
  { command: "files.copy", argv_path: ["files", "copy"], flag: "--dest" },
  { command: "files.move", argv_path: ["files", "move"], flag: "--source" },
  { command: "files.move", argv_path: ["files", "move"], flag: "--dest" },
  { command: "files.move", argv_path: ["files", "move"], flag: "--confirm-source" },
  { command: "files.rm", argv_path: ["files", "rm"], flag: "--remote" },
  { command: "files.rm", argv_path: ["files", "rm"], flag: "--confirm-remote" }
] as const;

const MIN_COMMAND_MODULE_COUNT = 6;
const MIN_REGISTERED_COMMAND_NAME_COUNT = 60;

describe("CLI redaction registry", () => {
  it("registers every current secret-bearing CLI option in one redaction registry", () => {
    expect(flattenRedactionRules()).toEqual(CURRENT_SECRET_BEARING_CLI_OPTIONS);
  });

  it("attaches sensitive redaction rules to real CLI command names without duplicate flag entries", async () => {
    const commandSources = await readCommandModuleSources();
    expect(commandSources.length).toBeGreaterThanOrEqual(MIN_COMMAND_MODULE_COUNT);

    const commandNames = new Set(
      commandSources.flatMap((source) =>
        [...source.matchAll(/setCurrentCommandName\("([^"]+)"\)/g)].map((match) => match[1]!)
      )
    );
    expect(commandNames.size).toBeGreaterThanOrEqual(MIN_REGISTERED_COMMAND_NAME_COUNT);

    const redactionCommandNames = SENSITIVE_CLI_REDACTION_RULES.map((rule) => rule.commandName);

    expect(redactionCommandNames.filter((commandName) => !commandNames.has(commandName))).toEqual([]);

    const seen = new Set<string>();
    const duplicates = SENSITIVE_CLI_REDACTION_RULES.flatMap((rule) =>
      rule.flags.flatMap((flag) => {
        const key = `${rule.commandName}\0${rule.argvPath.join(" ")}\0${flag.flag}`;
        if (seen.has(key)) {
          return [key];
        }
        seen.add(key);
        return [];
      })
    );

    expect(duplicates).toEqual([]);
  });

  it("redacts shell-quoted clipboard text from adb failure args", () => {
    const redacted = redactSensitiveError(
      {
        code: "ACTION_TIMEOUT",
        message: "adb command timed out",
        retriable: true,
        details: {
          args: ["shell", "cmd", "clipboard", "set", "text", "'alpha'\\''omega'"],
          stdout: "alpha",
          stderr: "omega"
        }
      },
      ["clipboard", "set", "--text", "alpha'omega"],
      "clipboard.set"
    );

    const serialized = JSON.stringify(redacted);
    expect(serialized).not.toContain("alpha");
    expect(serialized).not.toContain("omega");
    expect(redacted.details?.args).toEqual(["shell", "cmd", "clipboard", "set", "text", "<redacted>"]);
  });

  it("redacts ADBKeyboard Base64 payloads from adb failure args", () => {
    const payload = "5omL6K+V5Lit5paH";
    const redacted = redactSensitiveError(
      {
        code: "ADB_ERROR",
        message: "adb command failed",
        retriable: true,
        details: {
          args: [
            "shell",
            "am",
            "broadcast",
            "-a",
            "ADB_INPUT_B64",
            "-p",
            "com.android.adbkeyboard",
            "--es",
            "msg",
            payload
          ],
          stderr: payload
        }
      },
      ["text", "input", "--text", "测试中文", "--via", "adb_keyboard"],
      "text.input"
    );

    expect(JSON.stringify(redacted)).not.toContain(payload);
    expect(redacted.details?.args).toEqual([
      "shell",
      "am",
      "broadcast",
      "-a",
      "ADB_INPUT_B64",
      "-p",
      "com.android.adbkeyboard",
      "--es",
      "msg",
      "<redacted>"
    ]);
  });
});

async function readCommandModuleSources(): Promise<string[]> {
  const commandsDir = new URL("./commands/", import.meta.url);
  const commandFiles = (await readdir(commandsDir))
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts") && !name.endsWith(".d.ts"))
    .sort();

  return Promise.all(commandFiles.map((name) => readFile(new URL(name, commandsDir), "utf8")));
}

function flattenRedactionRules() {
  return SENSITIVE_CLI_REDACTION_RULES.flatMap((rule) =>
    rule.flags.map((flag) => ({
      command: rule.commandName,
      argv_path: rule.argvPath,
      flag: flag.flag
    }))
  );
}
