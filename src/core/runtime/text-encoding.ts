import { AutophoneError } from "../../contracts/index.js";

export function assertClipboardTextSupported(text: string): void {
  if (Array.from(text).length > 256 || containsControlCharacter(text)) {
    throw new AutophoneError({
      code: "TEXT_ENCODING_UNSUPPORTED",
      message: "clipboard text input supports at most 256 Unicode codepoints and rejects control characters",
      retriable: false,
      details: { codepoint_length: Array.from(text).length }
    });
  }
}

export function codepointLength(text: string): number {
  return Array.from(text).length;
}

export function utf8ByteLength(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((char) => {
    const codePoint = char.codePointAt(0);
    return codePoint !== undefined && (codePoint < 0x20 || codePoint === 0x7f);
  });
}
