/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "src-no-circular-deps",
      severity: "error",
      from: { path: "^src", pathNot: "\\.test\\.ts$" },
      to: { circular: true }
    },
    {
      name: "contracts-no-circular-deps",
      severity: "error",
      from: { path: "^src/contracts", pathNot: "\\.test\\.ts$" },
      to: { circular: true }
    },
    {
      name: "contracts-no-outward-deps",
      severity: "error",
      from: { path: "^src/contracts", pathNot: "\\.test\\.ts$" },
      to: { path: "^src/(core|drivers|cli)" }
    },
    {
      name: "core-no-driver-or-cli-deps",
      severity: "error",
      from: { path: "^src/core", pathNot: "\\.test\\.ts$" },
      to: { path: "^src/(drivers|cli)" }
    },
    {
      name: "drivers-no-cli-deps",
      severity: "error",
      from: { path: "^src/drivers", pathNot: "\\.test\\.ts$" },
      to: { path: "^src/cli" }
    },
    {
      name: "adb-spawn-only-in-adb-driver",
      severity: "error",
      from: { pathNot: "^src/drivers/adb/(transport|adb-driver)\\.ts$" },
      to: { path: "^node:child_process$" }
    }
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json"
    }
  }
};
