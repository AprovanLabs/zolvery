---
feature: universal-remote-procedure-call
dependencies:
  - urpc-core-types
  - urpc-registry-schema
status: draft
---

# URPC Proxy Client

## Goal

Implement the core proxy mechanism that converts `client.provider.method(args)` into actual 3rd-party calls.

## Tasks

- [ ] Create `createUrpcClient` factory function
- [ ] Implement JavaScript Proxy for lazy property access
- [ ] Route method calls to the appropriate executor based on transport
- [ ] Support nested paths (e.g., `gh.pr.view`)
- [ ] Lazy-load provider configs on first access

## Notes

The proxy intercepts property access and method calls:

```ts
const client = createUrpcClient({ providers: { gh: ghConfig } });

// This:
client.gh.pr.view({ number: "123" });

// Becomes:
// 1. Proxy intercepts `gh` → returns provider proxy
// 2. Proxy intercepts `pr` → builds path ["pr"]
// 3. Proxy intercepts `view` → builds path ["pr", "view"]
// 4. Function call → executes with args
```
