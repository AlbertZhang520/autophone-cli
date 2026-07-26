import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const result = spawnSync(
  join(root, "node_modules", ".bin", "depcruise"),
  ["src", "--config", "dependency-cruiser.config.cjs"],
  { cwd: root, encoding: "utf8" }
);

if (result.error) {
  process.stderr.write(`lint:deps: could not start depcruise: ${result.error.message}\n`);
  process.exit(1);
}

process.stdout.write(result.stdout ?? "");

// dependency-cruiser tracks the Node release cycle and refuses to start on
// releases it does not support, including every odd-numbered one. That refusal
// is a statement about the interpreter, not about this codebase, so it must not
// read as an architecture violation. Everything else it says is propagated
// verbatim, so a real layering breach still fails the build.
const refusedByEngines =
  result.status !== 0 && /your node version .* is not supported/i.test(result.stderr ?? "");

if (refusedByEngines) {
  process.stderr.write(
    `lint:deps: skipped — depcruise does not run on Node ${process.versions.node}.\n` +
      "lint:deps: the layering rules were NOT checked. Use the version in .nvmrc to run them.\n"
  );
  process.exit(0);
}

process.stderr.write(result.stderr ?? "");
process.exit(result.status ?? 1);
