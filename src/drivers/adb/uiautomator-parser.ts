import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { AutophoneError, SnapshotSchema, type Bounds, type Snapshot, type UiNode } from "../../contracts/index.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: false,
  allowBooleanAttributes: true,
  // UiAutomator emits supplementary Unicode characters as numeric references in
  // attribute values. Keep all entities raw here so we can decode exactly one
  // XML layer below; recursive decoding would corrupt literal text such as
  // "&#128578;" entered by the user.
  processEntities: false
});

export type ParsedWindowInfo = {
  packageName: string;
  activity: string;
  windowSize: [number, number] | null;
  orientation: "portrait" | "landscape" | "unknown";
  rotationDegrees: 0 | 90 | 180 | 270 | null;
  autoRotate: boolean | null;
};

export function parseUiAutomatorSnapshot(input: {
  rawDump: string;
  serial: string;
  window: ParsedWindowInfo;
  now?: Date;
}): Snapshot {
  const xml = extractHierarchyXml(input.rawDump);
  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch (error) {
    throw new AutophoneError({
      code: "UI_DUMP_FAILED",
      message: error instanceof Error ? error.message : "failed to parse UI hierarchy XML",
      retriable: true
    });
  }

  const hierarchy = getRecord(parsed).hierarchy;
  if (hierarchy === undefined) {
    throw new AutophoneError({
      code: "UI_DUMP_FAILED",
      message: "UI hierarchy XML does not contain hierarchy root",
      retriable: true
    });
  }

  const elements: UiNode[] = [];
  collectNodes(hierarchy, elements);

  return SnapshotSchema.parse({
    snapshot_id: `snap_${createHash("sha256").update(xml).digest("hex").slice(0, 16)}`,
    created_at: (input.now ?? new Date()).toISOString(),
    device_serial: input.serial,
    package: input.window.packageName,
    activity: input.window.activity,
    window_size: input.window.windowSize,
    orientation: input.window.orientation,
    rotation_degrees: input.window.rotationDegrees,
    auto_rotate: input.window.autoRotate,
    ui_hash: `sha256:${createHash("sha256").update(xml).digest("hex")}`,
    elements
  });
}

export function extractHierarchyXml(rawDump: string): string {
  const start = rawDump.search(/<\?xml|<hierarchy/);
  const end = rawDump.lastIndexOf("</hierarchy>");
  if (start === -1 || end === -1) {
    throw new AutophoneError({
      code: "UI_DUMP_FAILED",
      message: "adb output does not contain a complete UI hierarchy",
      retriable: true
    });
  }
  return rawDump.slice(start, end + "</hierarchy>".length).trim();
}

function collectNodes(value: unknown, elements: UiNode[]): void {
  const record = getRecord(value);
  const nodeValue = record.node;
  for (const node of normalizeArray(nodeValue)) {
    const nodeRecord = getRecord(node);
    elements.push({
      source_index: elements.length,
      text: getString(nodeRecord.text),
      resource_id: getString(nodeRecord["resource-id"]),
      content_desc: getString(nodeRecord["content-desc"]),
      class_name: getString(nodeRecord.class),
      package_name: getString(nodeRecord.package),
      bounds: parseBounds(getString(nodeRecord.bounds)),
      enabled: getNullableBoolean(nodeRecord.enabled),
      clickable: getNullableBoolean(nodeRecord.clickable),
      focused: getNullableBoolean(nodeRecord.focused)
    });
    collectNodes(nodeRecord, elements);
  }
}

export function parseBounds(rawBounds: string): Bounds | null {
  const match = rawBounds.match(/^\[(-?\d+),(-?\d+)]\[(-?\d+),(-?\d+)]$/);
  if (match === null) {
    return null;
  }
  const [, left, top, right, bottom] = match;
  return [Number(left), Number(top), Number(right), Number(bottom)];
}

function getRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeArray(value: unknown): unknown[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function getString(value: unknown): string {
  return typeof value === "string" ? decodeXmlAttributeEntities(value) : "";
}

export function decodeXmlAttributeEntities(value: string): string {
  return value.replace(
    /&(?:#(\d+)|#x([0-9a-fA-F]+)|amp|lt|gt|quot|apos);/g,
    (entity, decimal: string | undefined, hexadecimal: string | undefined) => {
      if (decimal !== undefined || hexadecimal !== undefined) {
        const codePoint = Number.parseInt(decimal ?? hexadecimal!, decimal === undefined ? 16 : 10);
        if (!Number.isInteger(codePoint) || !isXml10Character(codePoint)) {
          return entity;
        }
        return String.fromCodePoint(codePoint);
      }
      switch (entity) {
        case "&amp;":
          return "&";
        case "&lt;":
          return "<";
        case "&gt;":
          return ">";
        case "&quot;":
          return '"';
        case "&apos;":
          return "'";
        default:
          return entity;
      }
    }
  );
}

function isXml10Character(codePoint: number): boolean {
  return codePoint === 0x9 ||
    codePoint === 0xa ||
    codePoint === 0xd ||
    (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
    (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
    (codePoint >= 0x10000 && codePoint <= 0x10ffff);
}

function getNullableBoolean(value: unknown): boolean | null {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}
