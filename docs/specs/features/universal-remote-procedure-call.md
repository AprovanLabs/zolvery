---
version: 260cb5b
---

# Universal Remote Procedure Call (URPC)

## Overview

The universal remote procedure call (URPC) packages and toolchain provide a method for calling remote tools as if they were library calls.

### The North Star

Calling 3rd party applications should be as simple as possible, designed for LLMs to easily parse and generate complex interactions via scripting languages.


_Example running a code review of a GitHub PR_

```ts
import { gh, mastra } from "@urpc/clients";

export default async ({
  number,
  repo,
}: {
  number: string;
  repo: string;
}): Promise<{
  overview: string;
  bugs?: {
    description: string;
    severity: "low" | "medium" | "high";
    link?: string;
  }[];
}> => {
  const [prDetails, diff] = await Promise.all([
    gh.pr.view({
      number,
      repo,
      json: "title,body",
    }),
    gh.pr.diff({ number, repo }),
  ]);

  const { title, body } = prDetails;

  return mastra.generate({
    messages: [
      {
        role: "system",
        content:
          "You are a code review assistant. Analyze the PR and provide insights.",
      },
      {
        role: "user",
        content: `Generate a description of the changes made in this PR:\n\nTitle: ${title}\n\nBody: ${body}\n\nDiff:\n${diff}`,
      },
    ],
    structuredOutput: {
      type: "object",
      properties: {
        overview: {
          type: "string",
          description: "Main changes made in the PR",
        },
        bugs: {
          type: "array",
          description: "Any bugs found in the PR",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              severity: {
                type: "string",
                enum: ["low", "medium", "high"],
              },
              link: { type: "string" },
            },
            required: ["description", "severity"],
          },
        },
      },
      required: ["overview"],
    },
  });
};
```

## Requirements

URPC is composed of two separate core features: a library for handling the proxied calls to 3rd party services and a library for generating these new client type files.

### Proxied Calls

A library that abstracts away external calls via proxied methods.

The proxied call library should handle converting run-time field and method access to actual 3rd party calls, based on the registered and authenticated providers.

1. Register and authenticate with libraries on startup via config or a dependency-injection-style initialization file
2. Scripts will lazy-load the authenticated clients when the APIs an 

**Requirements**:

- Global/per-provider configuration for authentication and other method-level configuration. Dependency injection-esque
- All authentication should take place automatically
- Very minimal dependencies are loaded to run the 3rd party clients
- Pagination (cursor-based, page, limit/offset, based on the specific API implementation). All available via an iteration method
- In-memory caching and cache invalidation via tags (must be able to be set at a method level and/or configured globally per-provider)
- Loading/error states
- Debouncing, timeouts, throttling, rate limiting, request queueing/batching, cancellation

### Client Generation

A library for generating new 3rd party client type files. These files are intended to be incredibly slim and almost entirely composed of types used by the proxied call library.

**Primary Sources for Client Generation**:

- **OpenAPI/Swagger specs** — For HTTP APIs, parse OpenAPI docs to extract endpoints, parameters, and response types
- **CLI help output** — For command-line tools, parse `man` pages and `--help` output to extract commands, flags, and arguments
- **LLM-assisted generation** — Use LLMs to interpret documentation, resolve ambiguities, and generate idiomatic TypeScript types

The 3rd party client generation should support as inputs: bash scripts, HTTP, Websockets, and Kafka events
