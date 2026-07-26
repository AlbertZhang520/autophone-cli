import type { DriverCommandResult } from "./types.js";

export type DriverClipboardGetRequest = {
  deviceSerial?: string | undefined;
  timeoutMs: number;
};

export type DriverClipboardGetResult = DriverCommandResult & {
  serial: string;
  present: boolean;
  text: string | null;
};

export type DriverClipboardSetRequest = {
  deviceSerial?: string | undefined;
  text: string;
  timeoutMs: number;
};

export type DriverClipboardSetResult = DriverCommandResult & {
  serial: string;
};
