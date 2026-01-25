---
feature: universal-remote-procedure-call
dependencies:
  - urpc-core-types
status: draft
---

# URPC Registry Schema

## Goal

Define a JSON schema for registering 3rd-party tools and their commands/methods, enabling type generation and runtime execution.

## Tasks

- [ ] Define registry JSON schema with TypeScript types
- [ ] Support CLI commands with args/flags structure (parsed from `--help` / `man` output)
- [ ] Support HTTP endpoints with method, path, params, body (parsed from OpenAPI specs)
- [ ] Support WebSocket events
- [ ] Add validation for registry files
- [ ] Create example registries for common tools (git, aws)

## Notes

Current registry files are minimal placeholders. Expand to capture:

```json
{
  "name": "git",
  "transport": "cli",
  "commands": {
    "status": {
      "cmd": "git status",
      "args": {
        "short": { "flag": "-s", "type": "boolean" },
        "branch": { "flag": "-b", "type": "boolean" }
      },
      "output": "string"
    },
    "commit": {
      "cmd": "git commit",
      "args": {
        "message": { "flag": "-m", "type": "string", "required": true },
        "all": { "flag": "-a", "type": "boolean" }
      }
    }
  }
}
```
