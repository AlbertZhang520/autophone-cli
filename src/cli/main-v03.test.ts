import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "./main.js";
import { makeDriver, makeIo } from "./main-test-utils.test-support.js";
import { AutophoneError } from "../contracts/index.js";

describe("CLI v0.3 flows", () => {
  it("sets clipboard text without echoing raw text", async () => {
    const io = makeIo();
    const driver = makeDriver([]);
    const exitCode = await runCli(["clipboard", "set", "--text", "secret-你好"], {
      io,
      driverFactory: () => driver,
      requestIdFactory: () => "req-clipboard-set"
    });

    expect(exitCode).toBe(0);
    expect(io.stdoutText()).not.toContain("secret-你好");
    expect(driver.setClipboard).toHaveBeenCalledWith({
      deviceSerial: undefined,
      text: "secret-你好",
      timeoutMs: 10_000
    });
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed).toMatchObject({
      command: "clipboard.set",
      device: { serial: "emulator-5554" },
      result: {
        device_serial: "emulator-5554",
        charset: "utf8",
        codepoint_length: 9,
        verify: { policy: "clipboard_command_accepted", ok: true }
      }
    });
    expect(parsed.result.sha256).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("redacts shell-quoted clipboard text from failure envelopes", async () => {
    const io = makeIo();
    const driver = makeDriver([]);
    driver.setClipboard.mockRejectedValue(
      new AutophoneError({
        code: "ACTION_TIMEOUT",
        message: "adb command timed out",
        retriable: true,
        details: {
          args: ["shell", "cmd", "clipboard", "set", "text", "'alpha'\\''omega'"],
          stdout: "alpha",
          stderr: "omega"
        }
      })
    );

    const exitCode = await runCli(["clipboard", "set", "--text", "alpha'omega"], {
      io,
      driverFactory: () => driver,
      requestIdFactory: () => "req-clipboard-fail"
    });

    const output = io.stdoutText();
    expect(exitCode).toBe(2);
    expect(output).not.toContain("alpha");
    expect(output).not.toContain("omega");
    expect(JSON.parse(output).error.details.args).toEqual(["shell", "cmd", "clipboard", "set", "text", "<redacted>"]);
  });

  it("writes an opt-in redacted proof manifest under trace.proof", async () => {
    const proofDir = await mkdtemp(join(tmpdir(), "autophone-proof-test-"));
    const io = makeIo();
    const exitCode = await runCli(["--proof-dir", proofDir, "clipboard", "get"], {
      io,
      driverFactory: () => makeDriver([]),
      requestIdFactory: () => "req-proof"
    });

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(io.stdoutText());
    expect(parsed.trace.proof).toMatchObject({ artifact_count: 1, redacted: true });
    const manifest = JSON.parse(await readFile(join(proofDir, "proof-req-proof", "manifest.json"), "utf8"));
    expect(manifest).toMatchObject({
      proof_version: "0.3",
      command: "clipboard.get",
      request_id: "req-proof",
      artifacts: [],
      redacted: true
    });
    expect(JSON.stringify(manifest)).not.toContain("hello");
  });

  it("runs a bounded JSON recipe and redacts the recipe path", async () => {
    const recipePath = join(await mkdtemp(join(tmpdir(), "autophone-recipe-test-")), "recipe.json");
    await writeFile(
      recipePath,
      JSON.stringify({
        recipe_version: "0.3",
        name: "smoke",
        steps: [
          { id: "copy", action: "clipboard_set", with: { text: "copied" } },
          { id: "back", action: "key_press", with: { key: "BACK" } }
        ]
      })
    );
    const io = makeIo();
    const driver = makeDriver([]);
    const exitCode = await runCli(["run", "--recipe", recipePath], {
      io,
      driverFactory: () => driver,
      requestIdFactory: () => "req-recipe"
    });

    expect(exitCode).toBe(0);
    expect(io.stdoutText()).not.toContain(recipePath);
    expect(driver.setClipboard).toHaveBeenCalledTimes(1);
    expect(driver.keyEvent).toHaveBeenCalledWith("KEYCODE_BACK", { deviceSerial: "emulator-5554", timeoutMs: 10_000 });
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      command: "recipe.run",
      result: { recipe_name: "smoke", total_steps: 2, succeeded_steps: 2, failed_steps: 0, aborted: false },
      trace: { recipe_path: "<redacted>", step_count: 2 }
    });
  });
});
