import { access } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const databaseName = "logs_2.sqlite";
const triggerName = "block_log_inserts";
const triggerSql = `
CREATE TRIGGER IF NOT EXISTS block_log_inserts
BEFORE INSERT ON logs
BEGIN
  SELECT RAISE(IGNORE);
END;
`;

type DatabaseSync = InstanceType<typeof import("node:sqlite").DatabaseSync>;
type SqliteRow = Record<string, unknown>;

function readOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

function candidateDatabasePaths(): string[] {
  const explicitDatabase = readOption("database");

  if (explicitDatabase) {
    return [path.resolve(explicitDatabase)];
  }

  const explicitCodexHome = readOption("codex-home");
  const codexHome =
    explicitCodexHome ??
    process.env.CODEX_HOME ??
    path.join(homedir(), ".codex");

  return [
    path.resolve(codexHome, databaseName),
    path.resolve(codexHome, "sqlite", databaseName),
  ];
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function findDatabase(candidates: string[]): Promise<string | undefined> {
  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function loadDatabaseSync(): Promise<
  typeof import("node:sqlite").DatabaseSync
> {
  try {
    const sqlite = await import("node:sqlite");
    return sqlite.DatabaseSync;
  } catch {
    throw new Error("Node.js 22.5.0 or newer is required for node:sqlite.");
  }
}

function sqliteObjectExists(
  database: DatabaseSync,
  type: "table" | "trigger",
  name: string,
): boolean {
  const row = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = ? AND name = ? LIMIT 1",
    )
    .get(type, name) as SqliteRow | undefined;

  return row?.name === name;
}

function installTrigger(
  databasePath: string,
  DatabaseSync: typeof import("node:sqlite").DatabaseSync,
): "created" | "already-present" {
  const database = new DatabaseSync(databasePath);

  try {
    if (!sqliteObjectExists(database, "table", "logs")) {
      throw new Error("The database does not contain a logs table.");
    }

    if (sqliteObjectExists(database, "trigger", triggerName)) {
      return "already-present";
    }

    // This is the linked community workaround: preserve the database, but make
    // future inserts into the verbose logs table no-ops.
    database.exec(triggerSql);
    return "created";
  } finally {
    database.close();
  }
}

async function main(): Promise<void> {
  console.log("Codex Fixes: block SQLite feedback log inserts");

  const candidates = candidateDatabasePaths();
  console.log("Looking for logs_2.sqlite:");
  for (const candidate of candidates) {
    console.log(`  ${candidate}`);
  }

  const databasePath = await findDatabase(candidates);

  if (!databasePath) {
    console.log("");
    console.log("No logs_2.sqlite database found. Nothing to fix.");
    console.log(
      "Use --database=/path/to/logs_2.sqlite if Codex stores it elsewhere.",
    );
    return;
  }

  console.log("");
  console.log(`Using database: ${databasePath}`);

  const DatabaseSync = await loadDatabaseSync();
  const result = installTrigger(databasePath, DatabaseSync);

  if (result === "already-present") {
    console.log("The block_log_inserts trigger is already installed.");
  } else {
    console.log("Installed the block_log_inserts trigger.");
  }

  console.log("Done. New rows inserted into the logs table will be ignored.");
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("");
  console.error(`Fix failed: ${message}`);
  process.exitCode = 2;
}
