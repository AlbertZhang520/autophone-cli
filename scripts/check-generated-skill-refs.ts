import { execFileSync } from "node:child_process";

const status = execFileSync("git", ["status", "--porcelain", "--", "skills/autophone-cli/references"], {
  encoding: "utf8"
});

if (status.trim().length > 0) {
  process.stderr.write("Generated skill references are out of sync with docs/skill-src.\n");
  process.stderr.write("Run pnpm skill:gen and commit the resulting skills/autophone-cli/references changes.\n");
  process.stderr.write(status);
  process.exit(1);
}
