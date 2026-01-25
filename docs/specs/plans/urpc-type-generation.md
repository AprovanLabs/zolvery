---
feature: universal-remote-procedure-call
dependencies:
  - urpc-registry-schema
status: draft
---

# URPC Type Generation

## Goal

Generate TypeScript client types from registry JSON files and external documentation sources.

## Tasks

- [ ] Create `generate-types` CLI tool
- [ ] Parse registry JSON files into TypeScript types
- [ ] Parse OpenAPI specs into registry format (for HTTP APIs)
- [ ] Parse CLI `--help` / `man` output into registry format (LLM-assisted)
- [ ] Generate method signatures and arg types from commands
- [ ] Output `.d.ts` files per provider

## Notes

From registry:

```json
{
  "name": "git",
  "commands": {
    "status": {
      "args": { "short": { "type": "boolean" } },
      "output": "string"
    }
  }
}
```

Generate:

```ts
export interface GitClient {
  status(args?: { short?: boolean }): Promise<string>;
}
```
