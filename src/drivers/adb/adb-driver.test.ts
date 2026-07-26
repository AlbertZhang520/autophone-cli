import { describe, expect, it } from "vitest";

const ADB_DRIVER_TEST_SHARDS = [
  "adb-driver-parsing-core.test.ts",
  "adb-driver-parsing-device.test.ts",
  "adb-driver-parsing-file.test.ts",
  "adb-driver-behavior-device.test.ts",
  "adb-driver-behavior-app.test.ts",
  "adb-driver-behavior-file.test.ts",
  "adb-driver-behavior-transport-ui.test.ts"
] as const;

describe("adb driver test shard inventory", () => {
  it("keeps adb driver tests split by parser and behavior domain", () => {
    expect([...ADB_DRIVER_TEST_SHARDS]).toEqual([
      "adb-driver-parsing-core.test.ts",
      "adb-driver-parsing-device.test.ts",
      "adb-driver-parsing-file.test.ts",
      "adb-driver-behavior-device.test.ts",
      "adb-driver-behavior-app.test.ts",
      "adb-driver-behavior-file.test.ts",
      "adb-driver-behavior-transport-ui.test.ts"
    ]);
  });
});
