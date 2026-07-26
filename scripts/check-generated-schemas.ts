import { execFileSync } from "node:child_process";

const status = execFileSync("git", ["status", "--porcelain", "--", "schemas"], {
  encoding: "utf8"
});

if (status.trim().length > 0) {
  process.stderr.write("Generated schemas are out of sync with src/contracts.\n");
  process.stderr.write("Run pnpm schemas and commit the resulting schemas/ changes.\n");
  process.stderr.write(status);
  process.exit(1);
}
