# codex-fixes

Community-maintained fixes for Codex bugs.

**https://codexfixes.com**

Help make Codex less annoying: report real bugs, share workarounds, verify
platforms, or tell us when OpenAI finally fixed one:
https://github.com/zhuhaow/codex-fixes/issues

## Usage

Run the latest published CLI:

```bash
npx codex-fixes@latest
```

Preview what would run without changing anything:

```bash
npx codex-fixes@latest --dry-run
```

Inspect your machine and applicable fixes:

```bash
npx codex-fixes@latest doctor
```

Show details for one issue:

```bash
npx codex-fixes@latest show sqlite-feedback-logs
```

Apply one specific fix:

```bash
npx codex-fixes@latest apply sqlite-feedback-logs
```

## Source

https://github.com/zhuhaow/codex-fixes
