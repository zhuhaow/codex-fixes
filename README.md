# Codex Fixes

Community-maintained diagnostics and workarounds for Codex issues.

This repository is a TypeScript-only monorepo with three main parts:

- `apps/site`: Astro website for active issues, fix documentation, and contribution entry points.
- `packages/cli`: Node CLI for local diagnostics and future fix application.
- `registry`: Shared issue metadata and fix scripts.

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
registry/
  issues/      Issue manifests and fix scripts
  schema/      Registry JSON schema
```
