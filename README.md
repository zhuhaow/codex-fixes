# Codex Fixes

Community-maintained fixes for Codex bugs.

<https://codexfixes.com>

Run the latest fixes with:

```bash
npx codex-fixes@latest
```

Help make Codex less annoying: report real bugs, share workarounds, verify
platforms, or tell us when OpenAI finally fixed one:
<https://github.com/zhuhaow/codex-fixes/issues>

## Development

This repository is a TypeScript-only monorepo:

- `apps/site`: Astro website for active issues, fix documentation, and contribution entry points.
- `packages/cli`: Node CLI for local diagnostics and fix application.
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

## Publishing

The CLI package is published from GitHub Actions with npm trusted publishing.
Release builds are verified in CI and published from protected version tags.

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
