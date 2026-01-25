---
feature: universal-remote-procedure-call
dependencies:
  - urpc-core-types
status: draft
---

# URPC Retry & Rate Limiting

## Goal

Implement retry logic with backoff and provider-level rate limiting.

## Tasks

- [ ] Implement `withRetry` wrapper with exponential backoff
- [ ] Support configurable retry conditions (status codes, error types)
- [ ] Implement `RateLimiter` class (token bucket or sliding window)
- [ ] Queue requests when rate limit hit
- [ ] Support per-provider rate limit config

## Notes

```ts
// Retry config
{ attempts: 3, backoffMs: 1000, retryOn: [429, 500, 502, 503] }

// Rate limit config
{ requests: 100, windowMs: 60000 } // 100 req/min
```
