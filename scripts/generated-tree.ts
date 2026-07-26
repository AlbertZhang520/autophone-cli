import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Compares an in-memory render against the committed files on disk and returns
 * one human-readable line per discrepancy, or an empty array when they match.
 *
 * Freshness is decided by comparing bytes, not by asking git whether the working
 * tree is dirty: the check must reach the same verdict inside a repository, in a
 * released tarball, and in a container that has no git at all, and it must not
 * have to overwrite the files it is judging in order to reach it.
 */
export function compareRenderedTree(directory: string, rendered: Map<string, string>): string[] {
  let onDisk: string[];
  try {
    onDisk = readdirSync(directory);
  } catch {
    return [`${directory} does not exist`];
  }

  const drift: string[] = [];
  for (const [fileName, expected] of rendered) {
    let actual: string;
    try {
      actual = readFileSync(join(directory, fileName), "utf8");
    } catch {
      drift.push(`${fileName}: missing`);
      continue;
    }
    if (actual !== expected) {
      drift.push(`${fileName}: differs from the generated output`);
    }
  }
  for (const fileName of onDisk) {
    if (!rendered.has(fileName)) {
      drift.push(`${fileName}: not produced by the generator`);
    }
  }
  return drift;
}
