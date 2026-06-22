import { spawnSync } from "node:child_process";
import { cpSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(currentDirectory, "..");
const workspaceRoot = path.resolve(cliRoot, "../..");
const source = path.join(workspaceRoot, "registry");
const destination = path.join(cliRoot, "dist", "registry");
const registryBuildConfig = path.join(source, "tsconfig.build.json");
const tscPath = path.join(
  workspaceRoot,
  "node_modules",
  "typescript",
  "bin",
  "tsc",
);

function removeTypeScriptFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      removeTypeScriptFiles(entryPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      rmSync(entryPath);
    }
  }
}

rmSync(destination, { force: true, recursive: true });
cpSync(source, destination, { recursive: true });

const result = spawnSync(
  process.execPath,
  [tscPath, "-p", registryBuildConfig],
  {
    cwd: workspaceRoot,
    stdio: "inherit",
  },
);

removeTypeScriptFiles(path.join(destination, "issues"));
rmSync(path.join(destination, "tsconfig.build.json"), { force: true });
rmSync(path.join(destination, "tsconfig.json"), { force: true });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
