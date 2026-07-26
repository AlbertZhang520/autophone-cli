export type ParsedDeviceNotification = {
  key: string;
  packageName: string;
  userId: number | null;
  notificationId: number | null;
  tag: string | null;
  channelId: string | null;
  importance: number | null;
  groupKey: string | null;
  category: string | null;
  visibility: "public" | "private" | "secret" | "unknown";
  flags: string[];
  title: string | null;
  text: string | null;
  subText: string | null;
  bigText: string | null;
};

export type ParsedDeviceNotificationDump =
  | {
      ok: true;
      notifications: ParsedDeviceNotification[];
    }
  | {
      ok: false;
      failure: string;
    };

export function buildAdbDeviceNotificationsArgs(): string[] {
  return ["shell", "dumpsys", "notification", "--noredact"];
}

export function parseDumpsysNotificationOutput(stdout: string, stderr: string): ParsedDeviceNotificationDump {
  if (stderr.trim().length > 0) {
    return { ok: false, failure: "dumpsys notification wrote stderr" };
  }
  if (!stdout.includes("Current Notification Manager state:") || !/^\s*Notification List:\s*$/m.test(stdout)) {
    return { ok: false, failure: "notification manager dump markers missing" };
  }

  const blocks = notificationRecordBlocks(stdout);
  const notifications: ParsedDeviceNotification[] = [];
  for (const block of blocks) {
    const parsed = parseNotificationRecordBlock(block);
    if (parsed === null) {
      return { ok: false, failure: "notification record header was not parseable" };
    }
    notifications.push(parsed);
  }
  return { ok: true, notifications };
}

function notificationRecordBlocks(stdout: string): string[][] {
  const lines = stdout.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const listStart = lines.findIndex((line) => /^\s*Notification List:\s*$/.test(line));
  if (listStart < 0) {
    return [];
  }

  const blocks: string[][] = [];
  let current: string[] | undefined;
  for (const line of lines.slice(listStart + 1)) {
    if (/^\s*NotificationRecord\(/.test(line)) {
      if (current !== undefined) {
        blocks.push(current);
      }
      current = [line];
      continue;
    }
    if (current !== undefined) {
      current.push(line);
    }
  }
  if (current !== undefined) {
    blocks.push(current);
  }
  return blocks;
}

function parseNotificationRecordBlock(block: readonly string[]): ParsedDeviceNotification | null {
  const header = block[0]?.trim();
  if (header === undefined || !header.startsWith("NotificationRecord(")) {
    return null;
  }

  const packageName = readToken(header, "pkg");
  const key = readToken(header, "key");
  if (packageName === null || key === null) {
    return null;
  }

  return {
    key,
    packageName,
    userId: parseUserId(readToken(header, "user")),
    notificationId: parseInteger(readToken(header, "id")),
    tag: nullIfLiteralNull(readBetween(header, "tag=", " importance=")),
    channelId: nullIfLiteralNull(readInnerToken(header, "Notification(channel=")),
    importance: parseInteger(readToken(header, "importance")),
    groupKey: nullIfLiteralNull(readToken(header, "groupKey")),
    category: nullIfLiteralNull(readToken(header, "category")),
    visibility: parseVisibility(readToken(header, "vis")),
    flags: parseFlags(readToken(header, "flags")),
    title: readExtrasString(block, "android.title"),
    text: readExtrasString(block, "android.text"),
    subText: readExtrasString(block, "android.subText"),
    bigText: readExtrasString(block, "android.bigText")
  };
}

function readToken(line: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${escapeRegExp(name)}=([^\\s)]+)`).exec(line);
  return match?.[1] ?? null;
}

function readInnerToken(line: string, marker: string): string | null {
  const start = line.indexOf(marker);
  if (start < 0) {
    return null;
  }
  const valueStart = start + marker.length;
  const rest = line.slice(valueStart);
  const match = /^[^\s)]+/.exec(rest);
  return match?.[0] ?? null;
}

function readBetween(line: string, startMarker: string, endMarker: string): string | null {
  const start = line.indexOf(startMarker);
  if (start < 0) {
    return null;
  }
  const valueStart = start + startMarker.length;
  const end = line.indexOf(endMarker, valueStart);
  if (end < 0) {
    return null;
  }
  return line.slice(valueStart, end);
}

function readExtrasString(block: readonly string[], key: string): string | null {
  const prefix = `${key}=`;
  for (const rawLine of block) {
    const line = rawLine.trim();
    if (!line.startsWith(prefix)) {
      continue;
    }
    return parseExtrasValue(line.slice(prefix.length));
  }
  return null;
}

function parseExtrasValue(value: string): string | null {
  if (value === "null" || /^String \[length=\d+\]$/.test(value)) {
    return null;
  }
  const wrapped = /^(?:String|SpannableString|CharSequence)\s+\((.*)\)$/.exec(value);
  if (wrapped !== null) {
    return wrapped[1] ?? "";
  }
  return null;
}

function parseUserId(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const userHandle = /^UserHandle\{(-?\d+)\}$/.exec(value);
  if (userHandle !== null) {
    return parseInteger(userHandle[1] ?? null);
  }
  return parseInteger(value);
}

function parseInteger(value: string | null): number | null {
  if (value === null || !/^-?\d+$/.test(value)) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function nullIfLiteralNull(value: string | null): string | null {
  if (value === null || value === "" || value === "null") {
    return null;
  }
  return value;
}

function parseVisibility(value: string | null): "public" | "private" | "secret" | "unknown" {
  switch (value) {
    case "PUBLIC":
      return "public";
    case "PRIVATE":
      return "private";
    case "SECRET":
      return "secret";
    default:
      return "unknown";
  }
}

function parseFlags(value: string | null): string[] {
  if (value === null || value === "0") {
    return [];
  }
  return value.split("|").filter((flag) => flag.length > 0);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
