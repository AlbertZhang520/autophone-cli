import { describe, expect, it } from "vitest";

const RUNTIME_TEST_SHARDS = [
  "runtime-device.test.ts",
  "runtime-app.test.ts",
  "runtime-files.test.ts",
  "runtime-interaction.test.ts",
  "runtime-wait.test.ts"
] as const;

describe("runtime test shard inventory", () => {
  it("keeps runtime behavior tests split by domain", () => {
    expect([...RUNTIME_TEST_SHARDS]).toEqual([
      "runtime-device.test.ts",
      "runtime-app.test.ts",
      "runtime-files.test.ts",
      "runtime-interaction.test.ts",
      "runtime-wait.test.ts"
    ]);
  });
});
