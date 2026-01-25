---
feature: universal-remote-procedure-call
dependencies:
  - urpc-core-types
  - urpc-registry-schema
status: draft
---

# URPC CLI Executor

## Goal

Implement the executor for CLI-based providers (git, aws cli, ffmpeg, etc.).

## Tasks

- [ ] Implement `executeCliCommand` function
- [ ] Convert method args to CLI flags/arguments using registry schema
- [ ] Handle stdout/stderr parsing
- [ ] Support JSON output parsing when available
- [ ] Implement timeout and cancellation via AbortController
- [ ] Handle exit codes and error states

## Notes

Argument conversion examples:

```ts
// Input
{ message: "fix bug", all: true, verbose: false }

// Registry
{ message: { flag: "-m" }, all: { flag: "-a" }, verbose: { flag: "-v" } }

// Output
["-m", "fix bug", "-a"]
// Note: verbose=false is omitted
```
