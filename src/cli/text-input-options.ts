import { InvalidArgumentError } from "commander";
import type { TextInputRequest } from "../contracts/index.js";

export function parseTextInputVia(value: string): "input_text" | "adb_keyboard" | "clipboard" {
  if (value === "input_text" || value === "adb_keyboard" || value === "clipboard") {
    return value;
  }
  throw new InvalidArgumentError("must be input_text, adb_keyboard, or clipboard");
}

export function parseTextInputVerifyPolicy(value: string): "field_text" | "screen_changed" | "none" {
  if (value === "field_text" || value === "screen_changed" || value === "none") {
    return value;
  }
  throw new InvalidArgumentError("must be field_text, screen_changed, or none");
}

export function textInputWarnings(
  request: Pick<TextInputRequest, "verify" | "via">,
  verifyWasExplicit: boolean
): string[] {
  if (request.verify === "screen_changed" && verifyWasExplicit) {
    return ["screen_changed verification does not confirm exact inserted text"];
  }
  if (request.via === "adb_keyboard" && request.verify === "none") {
    return ["adb_keyboard dispatch does not confirm inserted field content; use --verify field_text for exact verification"];
  }
  return [];
}
