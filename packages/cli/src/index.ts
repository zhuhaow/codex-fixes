#!/usr/bin/env node

const command = process.argv[2] ?? "help";

function printHelp(): void {
  console.log(`codex-fixes

Usage:
  codex-fixes doctor
  codex-fixes explain <issue-id>
  codex-fixes apply <issue-id>
  codex-fixes undo <issue-id>

The CLI is scaffolded only. Diagnostics and fix logic will be added after the
registry and safety model are designed.
`);
}

switch (command) {
  case "doctor":
    console.log("codex-fixes doctor: no diagnostics implemented yet.");
    break;
  case "explain":
  case "apply":
  case "undo": {
    const issueId = process.argv[3];

    if (!issueId) {
      console.error(`Missing issue id for '${command}'.`);
      process.exitCode = 1;
      break;
    }

    console.log(`codex-fixes ${command} ${issueId}: not implemented yet.`);
    break;
  }
  case "help":
  case "--help":
  case "-h":
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
}
