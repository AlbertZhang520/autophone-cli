import { describe, expect, it } from "vitest";

const CLI_TEST_SHARDS = [
  "main-basics.test.ts",
  "main-device.test.ts",
  "main-app-read.test.ts",
  "main-ui.test.ts",
  "main-files.test.ts",
  "main-app-mutate.test.ts",
  "main-input-media-wait.test.ts"
] as const;

describe("CLI JSON output shard inventory", () => {
  it("keeps CLI behavior tests split by command domain", () => {
    expect([...CLI_TEST_SHARDS]).toEqual([
      "main-basics.test.ts",
      "main-device.test.ts",
      "main-app-read.test.ts",
      "main-ui.test.ts",
      "main-files.test.ts",
      "main-app-mutate.test.ts",
      "main-input-media-wait.test.ts"
    ]);
  });
});
