#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cancel, confirm, isCancel } from "@clack/prompts";
import { Command } from "commander";
import pc from "picocolors";
import { z } from "zod";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const packageJsonPath = path.resolve(currentDirectory, "../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
  version?: string;
};

const issueStatuses = ["active", "fixed", "deprecated"] as const;
const issueSeverities = ["low", "medium", "high", "critical"] as const;
const appliesValues = ["Yes", "No", "Unknown"] as const;
const codexSurfaces = ["cli", "desktop"] as const;
const targetIds = [
  "darwin-arm64",
  "darwin-x64",
  "linux-arm64",
  "linux-x64",
  "win32-arm64",
  "win32-x64",
] as const;

const targetSchema = z
  .object({
    applies: z.enum(appliesValues),
    script: z
      .string()
      .regex(/^scripts\/[A-Za-z0-9._/-]+\.ts$/)
      .optional(),
  })
  .strict();

const targetMapSchema = z
  .object(
    Object.fromEntries(
      targetIds.map((targetId) => [targetId, targetSchema.optional()]),
    ),
  )
  .strict();

const issueManifestSchema = z
  .object({
    $schema: z.string().optional(),
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1),
    status: z.enum(issueStatuses),
    severity: z.enum(issueSeverities),
    summary: z.string().min(1),
    sources: z
      .object({
        issues: z.array(z.string().url()),
        fixes: z.array(z.string().url()),
      })
      .strict(),
    targets: z
      .object(
        Object.fromEntries(
          codexSurfaces.map((surface) => [surface, targetMapSchema.optional()]),
        ),
      )
      .strict(),
  })
  .strict();

type IssueManifest = z.infer<typeof issueManifestSchema>;
type IssueSeverity = (typeof issueSeverities)[number];
type Applies = (typeof appliesValues)[number];
type CodexSurface = (typeof codexSurfaces)[number];
type TargetId = (typeof targetIds)[number];

interface LoadedIssue {
  directory: string;
  manifest: IssueManifest;
}

interface ApplyOptions {
  dryRun?: boolean;
  verbose?: boolean;
  yes?: boolean;
}

interface ApplicableFix {
  issue: LoadedIssue;
  scriptPath: string;
  surfaces: CodexSurface[];
}

const severityRank: Record<IssueSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const severityColors: Record<IssueSeverity, (value: string) => string> = {
  critical: pc.red,
  high: pc.yellow,
  medium: pc.cyan,
  low: pc.green,
};

const surfaceLabels: Record<CodexSurface, string> = {
  cli: "CLI",
  desktop: "Desktop",
};

const sectionWidth = 72;

function printSection(title: string, lines: string[] | string): void {
  const body = Array.isArray(lines) ? lines : lines.split("\n");

  console.log("");
  console.log(`${pc.cyan("◇")} ${pc.bold(title)}`);
  console.log(pc.dim("─".repeat(sectionWidth)));

  for (const line of body) {
    console.log(line);
  }
}

function printTitle(title: string): void {
  console.log(pc.bold(title));
}

function printDone(message: string): void {
  console.log("");
  console.log(pc.dim(message));
}

function wrapText(text: string, width = sectionWidth): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }

    if (current.length + word.length + 1 > width) {
      lines.push(current);
      current = word;
      continue;
    }

    current = `${current} ${word}`;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function formatFixPlan(fixes: ApplicableFix[]): string[] {
  return fixes.flatMap((fix, index) => {
    const surfaces = fix.surfaces.map((surface) => surfaceLabels[surface]);
    const summary = wrapText(fix.issue.manifest.summary, sectionWidth - 2).map(
      (line) => `  ${line}`,
    );
    const spacer = index === fixes.length - 1 ? [] : [""];

    return [
      `- ${pc.bold(fix.issue.manifest.id)} (${surfaces.join(", ")})`,
      `  ${fix.issue.manifest.title}`,
      ...summary,
      ...spacer,
    ];
  });
}

function getCurrentTarget(): TargetId | undefined {
  const target = `${process.platform}-${process.arch}`;

  if (targetIds.includes(target as TargetId)) {
    return target as TargetId;
  }

  return undefined;
}

function fail(message: string): never {
  console.error(`${pc.red("error")} ${message}`);
  process.exit(1);
}

function getRegistryRoot(): string {
  const candidates = [
    path.resolve(currentDirectory, "registry"),
    path.resolve(currentDirectory, "../../../registry"),
    path.resolve(process.cwd(), "registry"),
  ];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "issues"))) {
      return candidate;
    }
  }

  fail("Could not find the bundled codex-fixes registry.");
}

function loadIssues(): LoadedIssue[] {
  const registryRoot = getRegistryRoot();
  const issuesRoot = path.join(registryRoot, "issues");

  return readdirSync(issuesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const directory = path.join(issuesRoot, entry.name);
      const filePath = path.join(directory, "issue.json");
      const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
      const parsed = issueManifestSchema.safeParse(raw);

      if (!parsed.success) {
        const errorMessage = parsed.error.issues
          .map(
            (issue) =>
              `- ${issue.path.join(".") || "(root)"}: ${issue.message}`,
          )
          .join("\n");

        fail(`Invalid registry issue at ${filePath}\n${errorMessage}`);
      }

      return {
        directory,
        manifest: parsed.data,
      };
    })
    .sort((left, right) => left.manifest.id.localeCompare(right.manifest.id));
}

function sortIssues(issues: LoadedIssue[]): LoadedIssue[] {
  return [...issues].sort(
    (left, right) =>
      severityRank[left.manifest.severity] -
        severityRank[right.manifest.severity] ||
      left.manifest.id.localeCompare(right.manifest.id),
  );
}

function findIssue(issues: LoadedIssue[], issueId: string): LoadedIssue {
  const issue = issues.find((candidate) => candidate.manifest.id === issueId);

  if (!issue) {
    fail(`Unknown issue id: ${issueId}`);
  }

  return issue;
}

function getTarget(
  issue: IssueManifest,
  surface: CodexSurface,
  targetId: TargetId,
) {
  return issue.targets[surface]?.[targetId];
}

function getApplicableFixes(
  issue: LoadedIssue,
  targetId: TargetId,
): ApplicableFix[] {
  const fixesByScript = new Map<string, ApplicableFix>();

  for (const surface of codexSurfaces) {
    const target = getTarget(issue.manifest, surface, targetId);

    if (target?.applies !== "Yes" || !target.script) {
      continue;
    }

    const scriptPath = path
      .resolve(issue.directory, target.script)
      .replace(/\.ts$/, ".js");
    const existing = fixesByScript.get(scriptPath);

    if (existing) {
      existing.surfaces.push(surface);
      continue;
    }

    fixesByScript.set(scriptPath, {
      issue,
      scriptPath,
      surfaces: [surface],
    });
  }

  return [...fixesByScript.values()];
}

function collectTargets(issue: IssueManifest, applies: Applies): string[] {
  const targets: string[] = [];

  for (const surface of codexSurfaces) {
    const targetMap = issue.targets[surface];

    if (!targetMap) {
      continue;
    }

    for (const targetId of targetIds) {
      if (targetMap[targetId]?.applies === applies) {
        targets.push(`${surfaceLabels[surface]} ${targetId}`);
      }
    }
  }

  return targets;
}

function formatSeverity(severity: IssueSeverity): string {
  return severityColors[severity](severity.padEnd(8));
}

function printTargets(title: string, values: string[]): void {
  printSection(
    title,
    values.length === 0
      ? [pc.dim("none")]
      : values.map((value) => `- ${value}`),
  );
}

function listIssues(): void {
  printTitle("codex-fixes");

  const targetId = getCurrentTarget();
  const issues = sortIssues(loadIssues());

  const rows = issues
    .map((issue) => {
      const fixes = targetId ? getApplicableFixes(issue, targetId) : [];
      const status =
        fixes.length > 0 ? pc.green("fix available") : issue.manifest.status;

      return `${formatSeverity(issue.manifest.severity)} ${pc.bold(
        issue.manifest.id.padEnd(24),
      )} ${status.padEnd(21)} ${issue.manifest.title}`;
    })
    .join("\n");

  printSection(targetId ? `Known fixes for ${targetId}` : "Known fixes", rows);
  printDone("Use codex-fixes show <issue-id> for details.");
}

function showIssue(issueId: string): void {
  printTitle("codex-fixes");

  const targetId = getCurrentTarget();
  const issue = findIssue(loadIssues(), issueId);
  const fixes = targetId ? getApplicableFixes(issue, targetId) : [];

  printSection("Issue", [
    `${pc.bold(issue.manifest.title)}`,
    "",
    `ID:       ${issue.manifest.id}`,
    `Status:   ${issue.manifest.status}`,
    `Severity: ${issue.manifest.severity}`,
    targetId
      ? `This machine: ${targetId} (${fixes.length > 0 ? "fix available" : "no matching fix"})`
      : `This machine: unsupported target ${process.platform}-${process.arch}`,
    "",
    ...wrapText(issue.manifest.summary),
  ]);

  printTargets("Known affected", collectTargets(issue.manifest, "Yes"));
  printTargets("Needs verification", collectTargets(issue.manifest, "Unknown"));
  printTargets("Related issues", issue.manifest.sources.issues);
  printTargets("Fix sources", issue.manifest.sources.fixes);

  printDone("Done.");
}

function doctor(): void {
  printTitle("codex-fixes doctor");

  const registryRoot = getRegistryRoot();
  const issues = loadIssues().filter(
    (issue) => issue.manifest.status === "active",
  );
  const targetId = getCurrentTarget();

  printSection("Environment", [
    `Registry:     ${registryRoot}`,
    `Platform:     ${process.platform}`,
    `Architecture: ${process.arch}`,
    `Target:       ${targetId ?? "unsupported"}`,
  ]);

  if (!targetId) {
    printDone("This platform is not listed in the registry yet.");
    return;
  }

  const applicable = issues.filter(
    (issue) => getApplicableFixes(issue, targetId).length > 0,
  );
  const unknown = issues.filter((issue) =>
    codexSurfaces.some(
      (surface) =>
        getTarget(issue.manifest, surface, targetId)?.applies === "Unknown",
    ),
  );

  printTargets(
    "Applicable fixes",
    applicable.map((issue) => issue.manifest.id),
  );
  printTargets(
    "Needs verification on this machine",
    unknown.map((issue) => issue.manifest.id),
  );

  printDone("No changes were made.");
}

async function applyFixes(issueId: string | undefined, options: ApplyOptions) {
  printTitle("codex-fixes apply");

  const targetId = getCurrentTarget();

  if (!targetId) {
    fail(`Unsupported platform target: ${process.platform}-${process.arch}`);
  }

  const issues = loadIssues();
  const selectedIssues = issueId
    ? [findIssue(issues, issueId)]
    : issues.filter((issue) => issue.manifest.status === "active");
  const fixes = selectedIssues.flatMap((issue) =>
    getApplicableFixes(issue, targetId),
  );

  if (fixes.length === 0) {
    printDone("No applicable fixes found for this machine.");
    return;
  }

  printSection(
    options.dryRun ? "Would run" : "Ready to run",
    formatFixPlan(fixes),
  );

  if (options.dryRun) {
    printDone("Dry run complete. No changes were made.");
    return;
  }

  if (!options.yes && process.stdin.isTTY) {
    const shouldApply = await confirm({
      message: "Apply these fixes now?",
      initialValue: true,
    });

    if (isCancel(shouldApply) || !shouldApply) {
      cancel("Cancelled. No changes were made.");
      process.exit(0);
    }
  } else if (!options.yes && !process.stdin.isTTY) {
    fail("Refusing to apply fixes non-interactively without --yes.");
  }

  let failures = 0;

  for (const fix of fixes) {
    console.log("");
    console.log(`${pc.cyan("◇")} Applying ${pc.bold(fix.issue.manifest.id)}`);

    if (options.verbose) {
      console.log(pc.dim(fix.scriptPath));
    }

    if (!existsSync(fix.scriptPath)) {
      console.log(`${pc.red("✗")} Missing compiled script ${fix.scriptPath}`);
      failures += 1;
      continue;
    }

    const result = spawnSync(process.execPath, [fix.scriptPath], {
      stdio: "pipe",
      encoding: "utf8",
    });

    if (result.stdout.trim()) {
      console.log(result.stdout.trim());
    }

    if (result.stderr.trim()) {
      console.warn(result.stderr.trim());
    }

    if (result.status === 0) {
      console.log(`${pc.green("✓")} Applied ${fix.issue.manifest.id}`);
    } else {
      failures += 1;
      console.log(`${pc.red("✗")} Failed ${fix.issue.manifest.id}`);
    }
  }

  if (failures > 0) {
    printDone(`${failures} fix${failures === 1 ? "" : "es"} failed.`);
    process.exitCode = 1;
    return;
  }

  printDone("All applicable fixes completed.");
}

const program = new Command();

program
  .name("codex-fixes")
  .description("Community-maintained fixes for Codex bugs.")
  .version(packageJson.version ?? "0.0.0")
  .option("--dry-run", "show what would run without applying fixes")
  .option("--yes", "apply fixes without prompting")
  .option("--verbose", "print extra details")
  .action(() => {
    void applyFixes(undefined, program.opts() as ApplyOptions);
  });

program
  .command("apply")
  .description("Run active fixes that apply to this machine.")
  .argument("[issue-id]", "run one specific issue fix")
  .option("--dry-run", "show what would run without applying fixes")
  .option("--yes", "apply fixes without prompting")
  .option("--verbose", "print extra details")
  .action((issueId: string | undefined, options: ApplyOptions) => {
    void applyFixes(issueId, {
      ...(program.opts() as ApplyOptions),
      ...options,
    });
  });

program
  .command("list")
  .description("List known issues and available fixes.")
  .action(() => {
    listIssues();
  });

program
  .command("show")
  .description("Show one issue, sources, and supported targets.")
  .argument("<issue-id>", "issue id")
  .action((issueId: string) => {
    showIssue(issueId);
  });

program
  .command("doctor")
  .description(
    "Inspect this machine and applicable fixes without changing files.",
  )
  .action(() => {
    doctor();
  });

program.parse();
