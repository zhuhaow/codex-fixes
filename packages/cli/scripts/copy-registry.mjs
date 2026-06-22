import { cpSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(currentDirectory, "..");
const workspaceRoot = path.resolve(cliRoot, "../..");
const source = path.join(workspaceRoot, "registry");
const destination = path.join(cliRoot, "dist", "registry");

rmSync(destination, { force: true, recursive: true });
cpSync(source, destination, { recursive: true });
