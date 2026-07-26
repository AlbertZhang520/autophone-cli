import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseUiAutomatorSnapshot } from "../drivers/adb/uiautomator-parser.js";
import { centerFromBounds } from "./bounds.js";
import { findCandidates } from "./selector.js";

const fixtureRoot = join(process.cwd(), "tests/fixtures/uiautomator");

describe("selector matching", () => {
  it("returns one candidate with center derived from bounds", async () => {
    const snapshot = await loadSnapshot("basic.xml");
    const candidates = findCandidates(snapshot, { text: "Login" });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.center).toEqual([540, 1260]);
    expect(candidates[0]?.resource_id).toBe("com.example:id/login_primary");
  });

  it("returns stable ambiguous candidates and filters degenerate bounds", async () => {
    const snapshot = await loadSnapshot("duplicate-and-degenerate.xml");
    const candidates = findCandidates(snapshot, { text: "OK" });

    expect(candidates.map((candidate) => candidate.resource_id)).toEqual([
      "com.example:id/ok_top",
      "com.example:id/ok_bottom"
    ]);
    expect(candidates.map((candidate) => candidate.candidate_index)).toEqual([0, 1]);
  });

  it("filters candidates whose center is outside the window", async () => {
    const snapshot = await loadSnapshot("duplicate-and-degenerate.xml");
    const candidates = findCandidates(
      {
        ...snapshot,
        window_size: [100, 100]
      },
      { text: "OK" }
    );

    expect(candidates.map((candidate) => candidate.resource_id)).toEqual(["com.example:id/ok_top"]);
  });

  it("uses floor rounding for odd bounds centers", () => {
    expect(centerFromBounds([10, 10, 21, 21])).toEqual([15, 15]);
  });
});

async function loadSnapshot(name: string) {
  const rawDump = await readFile(join(fixtureRoot, name), "utf8");
  return parseUiAutomatorSnapshot({
    rawDump,
    serial: "emulator-5554",
    now: new Date("2026-06-28T00:00:00.000Z"),
    window: {
      packageName: "com.example",
      activity: "com.example.MainActivity",
      windowSize: [1080, 2400],
      orientation: "portrait",
      rotationDegrees: 0,
      autoRotate: false
    }
  });
}
