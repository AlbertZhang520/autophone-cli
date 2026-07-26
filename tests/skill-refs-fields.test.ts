import { describe, expect, it } from "vitest";
import { parseDocumentedResultPath, resultPathExists } from "../scripts/skill-refs-fields.js";

const imeSetLikeSchema = {
  type: "object",
  properties: {
    requested_id: { type: "string" },
    previous_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    enable: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["not_needed", "already_enabled", "enabled_now"] },
        outcome: { anyOf: [{ type: "object", properties: { exit_code: { type: "integer" } } }, { type: "null" }] }
      }
    },
    verify: {
      type: "object",
      properties: {
        policy: { type: "string" },
        ok: { type: "boolean" }
      }
    },
    query: {
      type: "object",
      properties: {
        sources: { type: "array", items: { type: "object", properties: { method: { type: "string" } } } }
      }
    },
    enabled_ids: { type: "array", items: { type: "string" } }
  }
};

describe("parseDocumentedResultPath", () => {
  it("parses nested dotted paths with array markers", () => {
    expect(parseDocumentedResultPath('- `result.ime.enabled_ids[]` unique ids')).toEqual(["ime", "enabled_ids[]"]);
    expect(parseDocumentedResultPath('- `result.verify.policy: "ime_state_readback"`')).toEqual(["verify", "policy"]);
    expect(parseDocumentedResultPath("- plain prose line")).toBeNull();
    expect(parseDocumentedResultPath("- `command: \"device.ime_set\"`")).toBeNull();
  });
});

describe("resultPathExists", () => {
  it("resolves nested object paths", () => {
    expect(resultPathExists([imeSetLikeSchema], ["enable", "action"])).toBe(true);
    expect(resultPathExists([imeSetLikeSchema], ["verify", "policy"])).toBe(true);
  });

  it("rejects typos at any depth, not just the first segment", () => {
    expect(resultPathExists([imeSetLikeSchema], ["verify", "any_typo"])).toBe(false);
    expect(resultPathExists([imeSetLikeSchema], ["enable", "action", "deeper"])).toBe(false);
    expect(resultPathExists([imeSetLikeSchema], ["nope"])).toBe(false);
  });

  it("resolves through nullable anyOf branches", () => {
    expect(resultPathExists([imeSetLikeSchema], ["previous_id"])).toBe(true);
    expect(resultPathExists([imeSetLikeSchema], ["enable", "outcome", "exit_code"])).toBe(true);
  });

  it("descends into array items only with the [] marker", () => {
    expect(resultPathExists([imeSetLikeSchema], ["query", "sources[]", "method"])).toBe(true);
    expect(resultPathExists([imeSetLikeSchema], ["enabled_ids[]"])).toBe(true);
    expect(resultPathExists([imeSetLikeSchema], ["query", "sources", "method"])).toBe(false);
    expect(resultPathExists([imeSetLikeSchema], ["enabled_ids[]", "anything"])).toBe(false);
  });
});
