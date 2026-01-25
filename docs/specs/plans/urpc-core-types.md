---
feature: universal-remote-procedure-call
status: draft
---

# URPC Core Types

## Goal

Define the foundational types for the URPC system: client configuration, provider registration, and method signatures.

## Tasks

- [ ] Define `UrpcProviderConfig` for per-provider settings (auth, base URL, rate limits)
- [ ] Define `UrpcGlobalConfig` for shared settings (caching, timeouts, retries)
- [ ] Define `UrpcMethodOptions` for per-call overrides (cache tags, timeout)
- [ ] Define `UrpcResponse<T>` wrapper with loading/error states
- [ ] Define pagination types (cursor, page, offset-based)
- [ ] Export types from `@kossabos/urpc`

## Notes

Types should be transport-agnostic. The same method signature works whether the underlying call is HTTP, CLI, WebSocket, etc.

```ts
// Shape of a provider config
interface UrpcProviderConfig {
  transport: UrpcTransport;
  auth?: UrpcAuth;
  baseUrl?: string;
  rateLimit?: { requests: number; windowMs: number };
  cache?: { ttlMs: number; tags?: string[] };
}

// Per-method options
interface UrpcMethodOptions {
  timeout?: number;
  cache?: { ttlMs: number; tags?: string[] } | false;
  retry?: { attempts: number; backoffMs: number };
}
```
