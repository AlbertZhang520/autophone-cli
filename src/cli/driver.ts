import type { AndroidDriver } from "../core/index.js";
import type { DriverFactory, GlobalCliOptions } from "./command-descriptor.js";

export function createCliDriver(factory: DriverFactory, globalOptions: Pick<GlobalCliOptions, "adb">): AndroidDriver {
  return factory({ adbPath: globalOptions.adb });
}
