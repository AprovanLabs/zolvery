---
feature: universal-remote-procedure-call
dependencies:
  - urpc-core-types
  - urpc-registry-schema
status: draft
---

# URPC HTTP Executor

## Goal

Implement the executor for HTTP-based APIs.

## Tasks

- [ ] Implement `executeHttpRequest` function
- [ ] Support GET, POST, PUT, PATCH, DELETE methods
- [ ] Handle path params, query params, and request body
- [ ] Parse JSON responses
- [ ] Implement timeout via AbortController
- [ ] Handle HTTP error status codes

## Notes

Use native `fetch`. No external HTTP libraries.

```ts
// Registry entry for an HTTP endpoint
{
  "method": "GET",
  "path": "/repos/{owner}/{repo}/pulls/{number}",
  "params": {
    "owner": { "in": "path" },
    "repo": { "in": "path" },
    "number": { "in": "path" }
  }
}
```
