# Codex Fixes

Community-maintained diagnostics and workarounds for Codex issues.

This repository is a TypeScript-only monorepo with two public surfaces:

- `apps/site`: Astro website for issue pages, fix documentation, and install guidance.
- `packages/cli`: Node CLI for local diagnostics and future fix application.

There is no backend. The website should be static, and the CLI should run locally on the user's machine.

## Requirements

- Node.js 22 or newer
- npm 10 or newer

## Commands

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm run cli -- doctor
```

## Workspace Layout

```text
apps/
  site/        Astro website
packages/
  cli/         Node CLI
  registry/    Shared issue and fix metadata types
```

The fix implementation model is intentionally not built yet. The next design step is to decide the registry schema, safety model, and CLI command behavior.
