---
feature: universal-remote-procedure-call
dependencies:
  - urpc-core-types
  - urpc-proxy-client
status: draft
---

# URPC Pagination

## Goal

Implement pagination support for APIs that return paginated data.

## Tasks

- [ ] Define pagination types in registry schema (cursor, page, offset)
- [ ] Implement `paginate` async generator for iterating pages
- [ ] Auto-detect pagination style from response
- [ ] Support `for await` iteration
- [ ] Support collecting all pages (`toArray()`)

## Notes

Usage:

```ts
// Iterate
for await (const issue of client.gh.issues.list({ repo: "x/y" }).paginate()) {
  console.log(issue.title);
}

// Collect all
const allIssues = await client.gh.issues.list({ repo: "x/y" }).paginate().toArray();
```

Registry pagination config:

```json
{
  "pagination": {
    "type": "cursor",
    "cursorParam": "after",
    "cursorPath": "pageInfo.endCursor",
    "hasNextPath": "pageInfo.hasNextPage",
    "dataPath": "data.items"
  }
}
```
