# Codex Fixes

Community-maintained diagnostics and workarounds for Codex issues.

This repository is a TypeScript-only monorepo with two main parts:

- `apps/site`: Astro website for issue pages, fix documentation, and install guidance.
- `packages/cli`: Node CLI for local diagnostics and future fix application.

## Requirements

- Node.js 22 or newer
- npm 10 or newer

## Getting Started

Install dependencies once:

```bash
npm install
```

Run the website locally:

```bash
npm run dev
```

Build everything in the workspace:

```bash
npm run build
```

Build only the website:

```bash
npm run build:site
```

## Workspace Layout

```text
apps/
  site/        Astro website
packages/
  cli/         Node CLI
  registry/    Shared issue and fix metadata types
```

The fix implementation model is intentionally not built yet. The next design
step is to decide the registry schema, safety model, and CLI command behavior.
