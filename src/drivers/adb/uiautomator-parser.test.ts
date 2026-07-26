import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeXmlAttributeEntities, parseBounds, parseUiAutomatorSnapshot } from "./uiautomator-parser.js";

const fixtureRoot = join(process.cwd(), "tests/fixtures/uiautomator");

describe("uiautomator parser", () => {
  it("extracts XML from adb output with trailing dump status text", async () => {
    const rawDump = await readFile(join(fixtureRoot, "trailing-output.txt"), "utf8");
    const snapshot = parseUiAutomatorSnapshot({
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

    expect(snapshot.rotation_degrees).toBe(0);
    expect(snapshot.auto_rotate).toBe(false);
    expect(snapshot.elements).toHaveLength(1);
    expect(snapshot.elements[0]?.text).toBe("12345");
    expect(snapshot.elements[0]?.bounds).toEqual([1, 2, 21, 22]);
    expect(snapshot.ui_hash).toMatch(/^sha256:/);
  });

  it("parses bounds without accepting malformed values", () => {
    expect(parseBounds("[10,20][30,40]")).toEqual([10, 20, 30, 40]);
    expect(parseBounds("[-10,-20][30,40]")).toEqual([-10, -20, 30, 40]);
    expect(parseBounds("10,20,30,40")).toBeNull();
  });

  it("decodes one XML attribute entity layer, including supplementary Unicode", () => {
    expect(decodeXmlAttributeEntities("中&#128578;文 &#x1F680; &amp; &quot;ok&quot;")).toBe(
      '中🙂文 🚀 & "ok"'
    );
    expect(decodeXmlAttributeEntities("&amp;#128578;")).toBe("&#128578;");
    expect(decodeXmlAttributeEntities("&#xD800; &#99999999;")).toBe("&#xD800; &#99999999;");
    expect(decodeXmlAttributeEntities("&#0; &#11; &#xFFFE; &#xFFFF;")).toBe(
      "&#0; &#11; &#xFFFE; &#xFFFF;"
    );
    expect(decodeXmlAttributeEntities("&#9;|&#10;|&#13;")).toBe("\t|\n|\r");
  });

  it("normalizes UiAutomator numeric character references without corrupting literal entity text", () => {
    const snapshot = parseUiAutomatorSnapshot({
      rawDump:
        '<hierarchy rotation="0"><node text="中&#128578;文" resource-id="id/emoji" content-desc="&amp;#128578;" class="android.widget.EditText" package="com.example" bounds="[1,2][21,22]" enabled="true" clickable="true" focused="true" /></hierarchy>',
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

    expect(snapshot.elements[0]).toMatchObject({
      text: "中🙂文",
      content_desc: "&#128578;"
    });
  });
});
