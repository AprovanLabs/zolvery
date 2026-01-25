---
feature: universal-remote-procedure-call
dependencies:
  - urpc-core-types
status: draft
---

# URPC Caching

## Goal

Implement in-memory caching with TTL and tag-based invalidation.

## Tasks

- [ ] Create `UrpcCache` class with get/set/invalidate
- [ ] Implement TTL-based expiration
- [ ] Implement tag-based invalidation (`cache.invalidate({ tags: ["user:123"] })`)
- [ ] Generate cache keys from method path + args
- [ ] Support per-method cache config
- [ ] Support cache bypass (`{ cache: false }`)

## Notes

Cache key generation:

```ts
// Method: gh.repos.get({ owner: "foo", repo: "bar" })
// Key: "gh:repos:get:{"owner":"foo","repo":"bar"}"

// With tags
cache.set(key, value, { ttlMs: 60000, tags: ["gh", "repos:foo/bar"] });
cache.invalidate({ tags: ["repos:foo/bar"] }); // Clears this entry
```
