# Fix Development

Use this skill when creating, reviewing, or running Codex Fixes issue manifests and fix scripts in this repository.

## Project Context

Codex Fixes documents real Codex bugs and provides small local fix scripts for affected users. Fixes live in the registry package as one folder per issue:

```text
packages/registry/issues/<issue-id>/
  issue.yaml
  scripts/
    fix.ts
```

The registry schema is the source of truth. Before creating or changing any issue manifest, read:

```text
packages/registry/schema/issue.schema.json
packages/registry/src/index.ts
```

If the schema or existing type definitions do not answer a product or safety question, ask the project owner for clarification before inventing new fields or behavior.

## Issue Manifest Rules

Create one issue folder for each distinct Codex problem. The folder name and `id` must use the schema's kebab-case identifier format.

Each `issue.yaml` must:

- Include a `yaml-language-server` schema comment that points to `../../schema/issue.schema.json`.
- Follow `packages/registry/schema/issue.schema.json` exactly.
- Use only the established statuses: `active`, `fixed`, or `deprecated`.
- Put GitHub issues or other reports in `sources.issues`.
- Put links that justify or explain the fix in `sources.fixes`.
- Use `targets` to distinguish Codex surfaces such as `cli` and `desktop`.
- Set each target's `applies` value to `Yes`, `No`, or `Unknown`.
- Add a `script` only when that target has a local fix script.

Do not add version ranges, deployment details, website metadata, CLI metadata, or extra operational fields unless the schema has first been changed intentionally.

## Fix Script Rules

All fix scripts must be TypeScript files that run on Node.js and use no external dependencies.

Required constraints:

- Use only Node.js standard library modules.
- Do not call external websites, APIs, package registries, telemetry endpoints, or any other network endpoint.
- Do not require shell-specific dependencies when Node APIs can do the work.
- Keep platform-specific behavior explicit and easy to inspect.
- Prefer small functions with clear names over clever abstractions.
- Keep the script as simple and straightforward as the fix allows.

Fix scripts must be idempotent. Running the same script repeatedly at any time should either apply the same harmless final state or report that no work is needed.

Fix scripts must be harmless. A fix should not corrupt user data, delete unrelated files, disable broad system functionality, or make Codex harder to reinstall or update.

Any persistent change must be easy to reverse by reinstalling or updating Codex. If that is not true, do not implement the fix without explicit approval from the project owner.

## Readability and Logging

Fix scripts should be very easy to read and audit. Use clear, direct control flow and avoid clever abstractions.

Each script should have extensive, useful runtime logging:

- Say what fix is being applied.
- Print the relevant local path or target being checked.
- Report each meaningful decision, such as "nothing to fix", "database not found", or "trigger already installed".
- Summarize the final result.

Use short code comments when they explain safety reasoning, a non-obvious platform difference, or the upstream workaround being implemented. Do not add comments that merely repeat the code.

## Safety Pattern

When a fix touches local files:

- Resolve paths from explicit inputs, `CODEX_HOME`, or documented Codex locations.
- Check that candidate paths are inside the intended Codex-owned directory before changing them.
- Prefer backups for destructive operations unless the operation is clearly safe and regenerable.
- Print a concise summary of what changed.
- Treat missing files as success when the desired fixed state is already true.

When a fix touches running Codex state:

- Check for running Codex processes only when that specific fix requires it.
- Provide an explicit override flag only when the risk is small and described in code or output.
- Avoid background processes, daemons, timers, and long-running watchers.

## Execution Guidance

Before running a fix script locally, inspect it. Confirm it has no network calls, no third-party imports, and no broad file operations.

Run scripts with the repository's Node-compatible TypeScript path. If the CLI has not implemented fix execution yet, use the project's existing TypeScript execution tooling only for local verification, and do not add dependencies just to run one script.

Do not run a script that may modify a user's real Codex data unless the user asked for execution or the script is pointed at a temporary test directory.

## Verification

For manifest changes:

- Validate YAML against `packages/registry/schema/issue.schema.json`.
- Run formatting on the changed files.
- Run the registry typecheck.

For fix script changes:

- Typecheck the registry package.
- Exercise the script against a temporary Codex home whenever possible.
- Verify repeat execution is safe.
- Do not test against real Codex data unless explicitly requested.

## Clarification Triggers

Ask the project owner before proceeding when:

- The issue is not clearly a real user-impacting Codex bug.
- The target surface or architecture is uncertain and cannot be represented with `Unknown`.
- A proposed fix needs network access, external packages, privilege escalation, global system changes, or irreversible edits.
- The schema does not have a field needed to express the issue accurately.
