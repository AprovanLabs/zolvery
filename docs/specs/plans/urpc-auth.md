---
feature: universal-remote-procedure-call
dependencies:
  - urpc-core-types
status: draft
---

# URPC Authentication

## Goal

Implement authentication handling for providers (API keys, OAuth tokens, CLI credentials).

## Tasks

- [ ] Define auth types (apiKey, bearer, basic, oauth, cli-config)
- [ ] Implement `resolveAuth` to get credentials at runtime
- [ ] Support env vars, config files, and explicit values
- [ ] Inject auth into HTTP headers
- [ ] Inject auth into CLI environment
- [ ] Handle token refresh for OAuth (basic support)

## Notes

Auth config examples:

```ts
// API key from env
{ type: "apiKey", header: "X-API-Key", env: "OPENAI_API_KEY" }

// Bearer token
{ type: "bearer", env: "GITHUB_TOKEN" }

// CLI uses existing config (e.g., `aws configure`)
{ type: "cli-config" }
```
