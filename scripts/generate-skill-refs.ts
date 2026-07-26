import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocumentedResultPath, resultPathExists } from "./skill-refs-fields.js";
import { compareRenderedTree } from "./generated-tree.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "docs", "skill-src");
const outDir = join(root, "skills", "autophone-cli", "references");
const schemasDir = join(root, "schemas");
const domains = ["ui", "device", "app", "files", "media-logs"];

const failures: string[] = [];

function knownCommandIds(): Set<string> {
  const ids = new Set<string>();
  for (const file of readdirSync(schemasDir)) {
    if (file.endsWith("-request.schema.json")) {
      ids.add(file.replace("-request.schema.json", ""));
    }
  }
  ids.add("observe"); // request-less command; documented via observe-response.schema.json
  return ids;
}

function resultSchemaRoots(commandId: string): unknown[] | null {
  const read = (name: string): Record<string, unknown> | null => {
    try {
      return JSON.parse(readFileSync(join(schemasDir, name), "utf8")) as Record<string, unknown>;
    } catch {
      return null;
    }
  };
  const resultSchema = read(`${commandId}-result.schema.json`);
  if (resultSchema !== null) {
    return [resultSchema];
  }
  const response = read(`${commandId}-response.schema.json`);
  const responseProps = (response?.["properties"] ?? null) as Record<string, unknown> | null;
  const resultNode = responseProps?.["result"];
  return resultNode === undefined || resultNode === null ? null : [resultNode];
}

type Section = {
  title: string;
  covers: string[];
  bodyLines: string[];
};

function parseDomainFile(domain: string): { headLines: string[]; sections: Section[] } {
  const lines = readFileSync(join(srcDir, `${domain}.md`), "utf8").split("\n");
  const headLines: string[] = [];
  const sections: Section[] = [];
  let current: Section | null = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] as string;
    const heading = /^## (.+)$/.exec(line);
    if (heading && heading[1] !== "When to Use" && heading[1] !== "Constraints") {
      const title = (heading[1] as string).trim();
      const coversLine = lines[i + 1] ?? "";
      const covers = /^<!-- covers: (.+) -->$/.exec(coversLine);
      if (!covers) {
        failures.push(`${domain}.md: section "${title}" is missing a covers annotation`);
        current = { title, covers: [], bodyLines: [line] };
      } else {
        current = { title, covers: (covers[1] as string).split(/\s+/), bodyLines: [line] };
        i += 1; // skip the covers comment in output
      }
      sections.push(current);
      continue;
    }
    if (current) {
      current.bodyLines.push(line);
    } else {
      headLines.push(line);
    }
  }
  return { headLines, sections };
}

function checkResultFieldDrift(domain: string, section: Section): void {
  const documented: string[][] = [];
  for (const line of section.bodyLines) {
    const path = parseDocumentedResultPath(line);
    if (path) {
      documented.push(path);
    }
  }
  if (documented.length === 0) {
    return;
  }
  const roots: unknown[] = [];
  let sawSchema = false;
  for (const id of section.covers) {
    const schemaRoots = resultSchemaRoots(id);
    if (schemaRoots) {
      sawSchema = true;
      roots.push(...schemaRoots);
    }
  }
  if (!sawSchema) {
    failures.push(`${domain}.md: "${section.title}" documents result fields but no result schema was found for ${section.covers.join(", ")}`);
    return;
  }
  for (const path of documented) {
    if (!resultPathExists(roots, path)) {
      failures.push(`${domain}.md: "${section.title}" documents \`result.${path.join(".")}\` which does not resolve in the result schema of ${section.covers.join(", ")}`);
    }
  }
}

function main(): void {
  const check = process.argv.includes("--check");
  const known = knownCommandIds();
  const coveredBy = new Map<string, string>();
  const rendered = new Map<string, string>();

  for (const domain of domains) {
    const { headLines, sections } = parseDomainFile(domain);
    for (const section of sections) {
      for (const id of section.covers) {
        if (!known.has(id)) {
          failures.push(`${domain}.md: "${section.title}" covers unknown command id "${id}"`);
        }
        const previous = coveredBy.get(id);
        if (previous) {
          failures.push(`command id "${id}" is covered twice: ${previous} and ${domain}.md "${section.title}"`);
        }
        coveredBy.set(id, `${domain}.md "${section.title}"`);
      }
      checkResultFieldDrift(domain, section);
    }
    const header = `<!-- GENERATED FILE - do not edit. Source: docs/skill-src/${domain}.md. Regenerate with: pnpm skill:gen -->`;
    const body = [...headLines.join("\n").split("\n"), ...sections.flatMap((s) => s.bodyLines)]
      .join("\n")
      .replace(/^\n+/, "");
    rendered.set(`${domain}.md`, `${header}\n\n${body.trimEnd()}\n`);
  }

  for (const id of known) {
    if (!coveredBy.has(id)) {
      failures.push(`command id "${id}" has schemas but no documentation section covers it`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      process.stderr.write(`skill-refs: ${failure}\n`);
    }
    process.exit(1);
  }

  if (check) {
    const drift = compareRenderedTree(outDir, rendered);
    if (drift.length > 0) {
      process.stderr.write("Generated skill references are out of sync with docs/skill-src.\n");
      process.stderr.write("Run pnpm skill:gen and commit the resulting skills/autophone-cli/references changes.\n");
      for (const line of drift) {
        process.stderr.write(`  ${line}\n`);
      }
      process.exit(1);
    }
  } else {
    mkdirSync(outDir, { recursive: true });
    for (const [fileName, contents] of rendered) {
      writeFileSync(join(outDir, fileName), contents);
    }
  }

  process.stdout.write(`skill-refs: ${coveredBy.size} commands documented across ${domains.length} domain files\n`);
}

main();
