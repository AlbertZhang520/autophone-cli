import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));

type FileBudget = {
  path: string;
  maxLines: number;
  targetLines: number;
  reason: string;
};

const TARGET_SOURCE_LINES = 1500;
const TARGET_TEST_PHASE1_LINES = 1500;
const MAX_FOCUSED_SOURCE_LINES = TARGET_SOURCE_LINES;
const MAX_FOCUSED_TEST_LINES = TARGET_TEST_PHASE1_LINES;

const ratchetBudgets: readonly FileBudget[] = [
  {
    path: "src/cli/main.ts",
    maxLines: 136,
    targetLines: 120,
    reason: "thin CLI composition root; command wiring belongs in focused command modules"
  },
  {
    path: "src/core/runtime.ts",
    maxLines: 8,
    targetLines: 8,
    reason: "thin runtime compatibility barrel; runtime behavior belongs in focused domain modules"
  },
  {
    path: "src/drivers/adb/adb-driver.ts",
    maxLines: 875,
    targetLines: 800,
    reason: "thin adb driver class and parser barrel; raw adb mechanics belong in focused helper modules"
  },
  {
    path: "src/drivers/adb/adb-driver-public-exports.ts",
    maxLines: 61,
    targetLines: 61,
    reason: "explicit adb public export whitelist; keep split parser internals out of the public driver entrypoint"
  },
  {
    path: "src/cli/command-context.ts",
    maxLines: 14,
    targetLines: 14,
    reason: "thin CLI registration context; avoid growing cross-command state"
  },
  {
    path: "src/cli/options.ts",
    maxLines: 203,
    targetLines: 180,
    reason: "shared CLI option parsers; split by command family before broad parser growth"
  },
  {
    path: "src/cli/file-inspection.ts",
    maxLines: 212,
    targetLines: 180,
    reason: "host file inspection helpers; keep APK, transfer, and media inspection from aggregating"
  },
  {
    path: "src/cli/commands/app.ts",
    maxLines: 888,
    targetLines: 800,
    reason: "focused app command registration; split read, mutate, and URL command groups before growth"
  },
  {
    path: "src/cli/commands/device.ts",
    maxLines: 928,
    targetLines: 800,
    reason: "focused device command registration; split telemetry and mutation groups before growth"
  },
  {
    path: "src/cli/commands/files.ts",
    maxLines: 475,
    targetLines: 450,
    reason: "focused file command registration; keep transfer and mutation commands isolated"
  },
  {
    path: "src/cli/commands/input.ts",
    maxLines: 117,
    targetLines: 117,
    reason: "focused input command registration; keep key and text commands compact"
  },
  {
    path: "src/cli/commands/interaction.ts",
    maxLines: 592,
    targetLines: 550,
    reason: "focused UI/media command registration; split media or gesture commands before growth"
  },
  {
    path: "src/cli/commands/wait-logs.ts",
    maxLines: 134,
    targetLines: 134,
    reason: "focused wait and log command registration; keep polling and diagnostic commands compact"
  },
  {
    path: "src/core/runtime/app.ts",
    maxLines: 1047,
    targetLines: 950,
    reason: "focused runtime app workflows; split lifecycle, telemetry, and logs before growth"
  },
  {
    path: "src/core/runtime/device.ts",
    maxLines: 1442,
    targetLines: 1200,
    reason: "focused runtime device workflows near source limit; split telemetry groups before growth"
  },
  {
    path: "src/core/runtime/interaction.ts",
    maxLines: 621,
    targetLines: 600,
    reason: "focused runtime interaction workflows; keep input, scroll, and gesture logic isolated"
  },
  {
    path: "src/core/runtime/media.ts",
    maxLines: 163,
    targetLines: 163,
    reason: "focused runtime media capture workflows; keep screenshot metadata compact"
  },
  {
    path: "src/core/runtime/observe.ts",
    maxLines: 166,
    targetLines: 166,
    reason: "focused runtime observe/find workflows; keep snapshot discovery compact"
  },
  {
    path: "src/core/runtime/shared.ts",
    maxLines: 1357,
    targetLines: 1100,
    reason: "runtime shared helpers near source limit; split wait, notification, and gesture helpers before growth"
  },
  {
    path: "src/core/runtime/types.ts",
    maxLines: 978,
    targetLines: 900,
    reason: "runtime driver contract types; split driver app/device/file types before growth"
  },
  {
    path: "src/core/runtime/wait.ts",
    maxLines: 263,
    targetLines: 250,
    reason: "focused runtime wait workflows; keep wait polling semantics compact"
  },
  {
    path: "src/drivers/adb/adb-driver-context.ts",
    maxLines: 36,
    targetLines: 36,
    reason: "thin adb execution context; avoid broadening the delegation surface"
  },
  {
    path: "src/drivers/adb/adb-driver-device-methods.ts",
    maxLines: 1387,
    targetLines: 1150,
    reason: "focused adb device method implementations near source limit; split device telemetry groups before growth"
  },
  {
    path: "src/drivers/adb/adb-driver-interaction-file-methods.ts",
    maxLines: 714,
    targetLines: 650,
    reason: "focused adb interaction and file method implementations; split file methods before growth"
  },
  {
    path: "src/drivers/adb/adb-driver-app-methods.ts",
    maxLines: 1090,
    targetLines: 950,
    reason: "focused adb app method implementations; split app metadata, install, and URL helpers before growth"
  },
  {
    path: "src/drivers/adb/adb-driver-parser-shared.ts",
    maxLines: 65,
    targetLines: 65,
    reason: "small adb parser shared leaf; avoid turning shared parsing into a dumping ground"
  },
  {
    path: "src/drivers/adb/adb-driver-parsers-core.ts",
    maxLines: 762,
    targetLines: 700,
    reason: "focused adb core parser helpers; split app permission parsing before growth"
  },
  {
    path: "src/drivers/adb/adb-driver-parsers-device.ts",
    maxLines: 544,
    targetLines: 500,
    reason: "focused adb device parser helpers; split connectivity, input, and brightness parsers before growth"
  },
  {
    path: "src/drivers/adb/adb-driver-parsers-app.ts",
    maxLines: 727,
    targetLines: 650,
    reason: "focused adb app parser helpers; split package, permission, and safety helpers before growth"
  },
  {
    path: "src/drivers/adb/adb-driver-parsers-details.ts",
    maxLines: 934,
    targetLines: 800,
    reason: "focused adb device detail parser helpers; split display, audio, and activity parsers before growth"
  },
  {
    path: "src/contracts/actions.ts",
    maxLines: 4,
    targetLines: 4,
    reason: "thin contract compatibility barrel; new contract content belongs in focused domain modules"
  },
  {
    path: "src/contracts/actions/app.ts",
    maxLines: 1324,
    targetLines: 1000,
    reason: "large app contract domain slice; split lifecycle, inspection, or permission contracts before broad additions"
  },
  {
    path: "src/contracts/actions/device.ts",
    maxLines: 1177,
    targetLines: 1000,
    reason: "large device contract domain slice; split telemetry or mutating device contracts before broad additions"
  },
  {
    path: "src/contracts/actions/file.ts",
    maxLines: 600,
    targetLines: 600,
    reason: "focused file contract domain slice; keep file contracts from regrowing into an aggregate"
  },
  {
    path: "src/contracts/actions/interaction.ts",
    maxLines: 572,
    targetLines: 572,
    reason: "focused interaction contract domain slice; keep UI/input contracts from regrowing into an aggregate"
  },
  {
    path: "src/contracts/actions/common.ts",
    maxLines: 7,
    targetLines: 7,
    reason: "small shared contract primitives leaf; avoid turning common schemas into a dumping ground"
  },
  {
    path: "src/cli/main.test.ts",
    maxLines: 25,
    targetLines: 25,
    reason: "CLI test shard inventory; CLI behavior assertions belong in focused command-domain shards"
  },
  {
    path: "src/cli/main-basics.test.ts",
    maxLines: 212,
    targetLines: 212,
    reason: "focused CLI basics tests; keep help/version/error-envelope coverage isolated"
  },
  {
    path: "src/cli/main-device.test.ts",
    maxLines: 952,
    targetLines: 900,
    reason: "focused CLI device command tests; split by device capability before regrowing"
  },
  {
    path: "src/cli/main-device-settings.test.ts",
    maxLines: 759,
    targetLines: 700,
    reason: "focused CLI device settings command tests; keep settings and readiness coverage isolated"
  },
  {
    path: "src/cli/main-app-read.test.ts",
    maxLines: 1178,
    targetLines: 1178,
    reason: "focused CLI read-only app command tests; split by app capability before regrowing"
  },
  {
    path: "src/cli/main-ui.test.ts",
    maxLines: 975,
    targetLines: 975,
    reason: "focused CLI UI action tests; split by interaction capability before regrowing"
  },
  {
    path: "src/cli/main-files.test.ts",
    maxLines: 940,
    targetLines: 900,
    reason: "focused CLI file command tests; split file transfer and file mutation flows before regrowing"
  },
  {
    path: "src/cli/main-files-mutation.test.ts",
    maxLines: 779,
    targetLines: 750,
    reason: "focused CLI file mutation command tests; keep copy, move, and remove coverage isolated"
  },
  {
    path: "src/cli/main-app-mutate.test.ts",
    maxLines: 857,
    targetLines: 800,
    reason: "focused CLI mutating app command tests; split install, permissions, and URL flows before regrowing"
  },
  {
    path: "src/cli/main-app-mutate-url.test.ts",
    maxLines: 762,
    targetLines: 720,
    reason: "focused CLI URL and app lifecycle mutation tests; keep URL redaction coverage isolated"
  },
  {
    path: "src/cli/main-input-media-wait.test.ts",
    maxLines: 983,
    targetLines: 983,
    reason: "focused CLI input, media, and wait command tests; split by command family before regrowing"
  },
  {
    path: "src/cli/main-test-utils.test-support.ts",
    maxLines: 957,
    targetLines: 900,
    reason: "CLI test support fixtures; split IO, driver, and domain fixtures before broad fixture growth"
  },
  {
    path: "src/core/runtime.test.ts",
    maxLines: 21,
    targetLines: 21,
    reason: "runtime test shard inventory; runtime behavior assertions belong in focused domain shards"
  },
  {
    path: "src/core/runtime-device.test.ts",
    maxLines: 1241,
    targetLines: 1100,
    reason: "focused runtime device behavior tests; split by device capability before regrowing"
  },
  {
    path: "src/core/runtime-device-settings.test.ts",
    maxLines: 582,
    targetLines: 550,
    reason: "focused runtime device settings behavior tests; keep IME, brightness, animation, and readiness coverage isolated"
  },
  {
    path: "src/core/runtime-app.test.ts",
    maxLines: 975,
    targetLines: 900,
    reason: "focused runtime app behavior tests; split app lifecycle or telemetry before regrowing"
  },
  {
    path: "src/core/runtime-app-lifecycle.test.ts",
    maxLines: 808,
    targetLines: 750,
    reason: "focused runtime app lifecycle and log tests; keep logs and foreground verification coverage isolated"
  },
  {
    path: "src/core/runtime-files.test.ts",
    maxLines: 846,
    targetLines: 800,
    reason: "focused runtime file behavior tests; split file mutation and transfer flows before regrowing"
  },
  {
    path: "src/core/runtime-files-mutation.test.ts",
    maxLines: 948,
    targetLines: 900,
    reason: "focused runtime file mutation tests; keep mkdir, copy, move, and rm coverage isolated"
  },
  {
    path: "src/core/runtime-interaction.test.ts",
    maxLines: 1272,
    targetLines: 1100,
    reason: "focused runtime interaction behavior tests; split UI, text, scroll, or media flows before regrowing"
  },
  {
    path: "src/core/runtime-interaction-scroll-media.test.ts",
    maxLines: 607,
    targetLines: 580,
    reason: "focused runtime scroll and media tests; keep scroll-until, screenshot, and screenrecord coverage isolated"
  },
  {
    path: "src/core/runtime-wait.test.ts",
    maxLines: 604,
    targetLines: 604,
    reason: "focused runtime wait behavior tests; keep wait polling semantics isolated"
  },
  {
    path: "src/core/runtime-test-utils.test-support.ts",
    maxLines: 1011,
    targetLines: 1000,
    reason: "runtime test support fixtures; split mock driver helpers before broad fixture growth"
  },
  {
    path: "src/drivers/adb/adb-driver.test.ts",
    maxLines: 25,
    targetLines: 25,
    reason: "adb driver test shard inventory; parser and behavior assertions belong in focused domain shards"
  },
  {
    path: "src/drivers/adb/adb-driver-parsing-core.test.ts",
    maxLines: 1272,
    targetLines: 1272,
    reason: "focused adb parser core/app tests; split parser domains before regrowing"
  },
  {
    path: "src/drivers/adb/adb-driver-parsing-device.test.ts",
    maxLines: 1040,
    targetLines: 1040,
    reason: "focused adb parser device tests; split device parser domains before regrowing"
  },
  {
    path: "src/drivers/adb/adb-driver-parsing-file.test.ts",
    maxLines: 761,
    targetLines: 761,
    reason: "focused adb parser file tests; keep file protocol parsers isolated"
  },
  {
    path: "src/drivers/adb/adb-driver-behavior-device.test.ts",
    maxLines: 1009,
    targetLines: 950,
    reason: "focused adb device behavior tests; split by device capability before regrowing"
  },
  {
    path: "src/drivers/adb/adb-driver-behavior-device-settings.test.ts",
    maxLines: 1081,
    targetLines: 1000,
    reason: "focused adb device settings behavior tests; keep brightness, statusbar, audio, and accessibility coverage isolated"
  },
  {
    path: "src/drivers/adb/adb-driver-behavior-app.test.ts",
    maxLines: 831,
    targetLines: 800,
    reason: "focused adb app behavior tests; split app metadata, install, and logs flows before regrowing"
  },
  {
    path: "src/drivers/adb/adb-driver-behavior-app-mutate.test.ts",
    maxLines: 900,
    targetLines: 850,
    reason: "focused adb mutating app behavior tests; keep logs, clear-data, and install coverage isolated"
  },
  {
    path: "src/drivers/adb/adb-driver-behavior-file.test.ts",
    maxLines: 755,
    targetLines: 720,
    reason: "focused adb file behavior tests; split file transfer and mutation flows before regrowing"
  },
  {
    path: "src/drivers/adb/adb-driver-behavior-file-app-permission.test.ts",
    maxLines: 944,
    targetLines: 900,
    reason: "focused adb file-adjacent app permission behavior tests; split permission inspection before growth"
  },
  {
    path: "src/drivers/adb/adb-driver-behavior-transport-ui.test.ts",
    maxLines: 1352,
    targetLines: 1352,
    reason: "focused adb transport and UI behavior tests; split transport, app launch, and input flows before regrowing"
  },
  {
    path: "src/drivers/adb/adb-driver-test-utils.test-support.ts",
    maxLines: 245,
    targetLines: 245,
    reason: "adb driver test support fixtures; keep fake adb helpers small and isolated"
  },
  {
    path: "tests/schema.test.ts",
    maxLines: 218,
    targetLines: 218,
    reason: "schema inventory coverage guard; domain schema assertions belong in focused schema test files"
  },
  {
    path: "tests/schema-app-contracts.test.ts",
    maxLines: 1313,
    targetLines: 1313,
    reason: "focused app schema contract tests; split by app capability before regrowing"
  },
  {
    path: "tests/schema-app-goldens.test.ts",
    maxLines: 995,
    targetLines: 995,
    reason: "focused app schema golden tests; split by app capability before regrowing"
  },
  {
    path: "tests/schema-device-contracts.test.ts",
    maxLines: 994,
    targetLines: 994,
    reason: "focused device schema contract tests; split by device capability before regrowing"
  },
  {
    path: "tests/schema-device-goldens.test.ts",
    maxLines: 1376,
    targetLines: 1376,
    reason: "focused device schema golden tests; split by device capability before regrowing"
  },
  {
    path: "tests/schema-file.test.ts",
    maxLines: 1267,
    targetLines: 1267,
    reason: "focused file schema contract and golden tests; split by file capability before regrowing"
  },
  {
    path: "tests/schema-interaction.test.ts",
    maxLines: 1158,
    targetLines: 1158,
    reason: "focused interaction schema contract and golden tests; split by UI/input capability before regrowing"
  }
] as const;

const scannedRoots = ["src", "tests"] as const;
const ratchetPaths = new Set(ratchetBudgets.map((budget) => budget.path));

const countBudgets = [
  {
    label: "CLI legacy commandName assignments",
    count: countCliCommandNameAssignments,
    max: 0,
    reason: "command modules must update command names through CliRuntimeContext instead of direct string assignments"
  },
  {
    label: "CLI driverFactory call sites",
    count: countCliDriverFactoryCalls,
    max: 68,
    reason: "driver construction boilerplate should shrink behind a helper, not expand"
  },
  {
    label: "CLI success envelope call sites",
    count: countCliSuccessEnvelopeCalls,
    max: 69,
    reason: "response envelope boilerplate should shrink behind a helper, not expand"
  }
] as const;

const failures: string[] = [];

for (const budget of ratchetBudgets) {
  const lines = await countLines(budget.path);
  if (lines > budget.maxLines) {
    failures.push(
      `${budget.path}: ${lines} lines exceeds ratchet budget ${budget.maxLines} ` +
        `(target ${budget.targetLines}); ${budget.reason}`
    );
  }
}

for (const file of await listFilesInRoots(scannedRoots)) {
  if (isTypeScriptSource(file) && !ratchetPaths.has(file)) {
    const lines = await countLines(file);
    const limit = file.endsWith(".test.ts") ? MAX_FOCUSED_TEST_LINES : MAX_FOCUSED_SOURCE_LINES;
    if (lines > limit) {
      failures.push(`${file}: ${lines} lines exceeds focused-file budget ${limit}; split by command/domain seam`);
    }
  }
}

for (const budget of countBudgets) {
  const count = await budget.count();
  if (count > budget.max) {
    failures.push(`${budget.label}: ${count} exceeds ratchet budget ${budget.max}; ${budget.reason}`);
  }
}

const androidDriverMethodCount = await countAndroidDriverMethods();
if (androidDriverMethodCount > 67) {
  failures.push(
    `AndroidDriver method count: ${androidDriverMethodCount} exceeds ratchet budget 67; ` +
      "the legacy mega-interface should be segmented before new capabilities expand it"
  );
}

if (failures.length > 0) {
  process.stderr.write("Architecture guardrail check failed:\n");
  for (const failure of failures) {
    process.stderr.write(`- ${failure}\n`);
  }
  process.exit(1);
}

async function readText(path: string): Promise<string> {
  return readFile(join(root, path), "utf8");
}

async function countLines(path: string): Promise<number> {
  const text = await readText(path);
  return text.length === 0 ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
}

async function listFiles(directory: string): Promise<string[]> {
  const absolute = join(root, directory);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const child = join(absolute, entry.name);
    const rel = relative(root, child);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(rel)));
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }

  return files.sort();
}

async function listFilesInRoots(roots: readonly string[]): Promise<string[]> {
  const nested = await Promise.all(roots.map((directory) => listFiles(directory)));
  return nested.flat().sort();
}

function isTypeScriptSource(path: string): boolean {
  return path.endsWith(".ts") && !path.endsWith(".d.ts");
}

function isTestSource(path: string): boolean {
  return path.endsWith(".test.ts") || path.endsWith(".test-support.ts");
}

async function listProductionTypeScriptFiles(directory: string): Promise<string[]> {
  return (await listFiles(directory)).filter((file) => isTypeScriptSource(file) && !isTestSource(file));
}

async function countCliCommandNameAssignments(): Promise<number> {
  const files = await listProductionTypeScriptFiles("src/cli");
  let count = 0;

  for (const file of files) {
    const sourceFile = await parseSourceFile(file);
    visit(sourceFile, (node) => {
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(node.left) &&
        node.left.text === "commandName" &&
        ts.isStringLiteral(node.right)
      ) {
        count += 1;
      }
    });
  }

  return count;
}

async function countCliDriverFactoryCalls(): Promise<number> {
  return countIdentifierCallsInFiles(await listProductionTypeScriptFiles("src/cli"), "driverFactory");
}

async function countCliSuccessEnvelopeCalls(): Promise<number> {
  return countIdentifierCallsInFiles(await listProductionTypeScriptFiles("src/cli"), "createSuccessResponse");
}

async function countIdentifierCallsInFiles(files: readonly string[], identifier: string): Promise<number> {
  let count = 0;

  for (const file of files) {
    const sourceFile = await parseSourceFile(file);
    visit(sourceFile, (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === identifier) {
        count += 1;
      }
    });
  }

  return count;
}

async function countAndroidDriverMethods(): Promise<number> {
  const declarations = await collectNamedTypeDeclarations(await listProductionTypeScriptFiles("src/core"));
  const declaration = declarations.get("AndroidDriver");
  const count = declaration === undefined ? undefined : countTypeDeclarationMethods(declaration, declarations, new Set());

  if (count === undefined) {
    failures.push("src/core: could not locate AndroidDriver method signatures for architecture budget check");
    return 0;
  }

  return count;
}

type NamedTypeDeclaration = ts.InterfaceDeclaration | ts.TypeAliasDeclaration;

async function collectNamedTypeDeclarations(files: readonly string[]): Promise<Map<string, NamedTypeDeclaration>> {
  const declarations = new Map<string, NamedTypeDeclaration>();

  for (const file of files) {
    const sourceFile = await parseSourceFile(file);
    visit(sourceFile, (node) => {
      if ((ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) && !declarations.has(node.name.text)) {
        declarations.set(node.name.text, node);
      }
    });
  }

  return declarations;
}

function countTypeDeclarationMethods(
  declaration: NamedTypeDeclaration,
  declarations: ReadonlyMap<string, NamedTypeDeclaration>,
  seen: Set<string>
): number | undefined {
  const name = declaration.name.text;
  if (seen.has(name)) {
    return 0;
  }
  seen.add(name);

  if (ts.isTypeAliasDeclaration(declaration)) {
    return countTypeNodeMethods(declaration.type, declarations, seen);
  }

  let count = countTypeMembersMethods(declaration.members);
  for (const clause of declaration.heritageClauses ?? []) {
    for (const type of clause.types) {
      const inheritedCount = countTypeReferenceMethods(type, declarations, seen);
      if (inheritedCount === undefined) {
        return undefined;
      }
      count += inheritedCount;
    }
  }

  return count;
}

function countTypeNodeMethods(
  node: ts.TypeNode,
  declarations: ReadonlyMap<string, NamedTypeDeclaration>,
  seen: Set<string>
): number | undefined {
  if (ts.isTypeLiteralNode(node)) {
    return countTypeMembersMethods(node.members);
  }

  if (ts.isIntersectionTypeNode(node)) {
    let count = 0;
    for (const type of node.types) {
      const typeCount = countTypeNodeMethods(type, declarations, seen);
      if (typeCount === undefined) {
        return undefined;
      }
      count += typeCount;
    }
    return count;
  }

  if (ts.isTypeReferenceNode(node)) {
    return countTypeReferenceMethods(node, declarations, seen);
  }

  if (ts.isParenthesizedTypeNode(node)) {
    return countTypeNodeMethods(node.type, declarations, seen);
  }

  return undefined;
}

function countTypeReferenceMethods(
  node: ts.TypeReferenceNode | ts.ExpressionWithTypeArguments,
  declarations: ReadonlyMap<string, NamedTypeDeclaration>,
  seen: Set<string>
): number | undefined {
  const typeName = ts.isTypeReferenceNode(node) ? node.typeName : node.expression;
  if (!ts.isIdentifier(typeName)) {
    return undefined;
  }

  const declaration = declarations.get(typeName.text);
  return declaration === undefined ? undefined : countTypeDeclarationMethods(declaration, declarations, seen);
}

function countTypeMembersMethods(members: ts.NodeArray<ts.TypeElement>): number {
  let count = 0;

  for (const member of members) {
    if (
      ts.isMethodSignature(member) ||
      (ts.isPropertySignature(member) && member.type !== undefined && ts.isFunctionTypeNode(member.type))
    ) {
      count += 1;
    }
  }

  return count;
}

async function parseSourceFile(path: string): Promise<ts.SourceFile> {
  return ts.createSourceFile(path, await readText(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function visit(node: ts.Node, callback: (node: ts.Node) => void): void {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}
