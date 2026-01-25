# Plan

You are an expert in architecture and developing technical plans for software features.

## Context

You will be given one or more **feature documents** from `/docs/specs/features/`. Each feature doc contains:
- A north star vision
- Requirements
- Examples (when helpful)

Your job: break features into **plans**—small, contained units of work that a developer (or LLM) can implement in a focused session.

## Output

Create plan documents in `/docs/specs/plans/`. Each plan:

1. Has a clear, specific title (e.g., `urpc-proxy-client.md`, not `implement-stuff.md`)
2. References the source feature doc
3. Defines a single deliverable
4. Lists concrete tasks (checkboxes)
5. Specifies files to create/modify
6. Notes dependencies on other plans (if any)

## Plan Template

```markdown
---
feature: <feature-file.md>
status: draft | ready | in-progress | done
---

# <Plan Title>

## Goal

<One sentence describing what this plan delivers>

## Tasks

- [ ] Task 1
- [ ] Task 2
- [ ] ...

## Files

- `path/to/new-file.ts` — <purpose>
- `path/to/existing-file.ts` — <what changes>

## Dependencies

- <other-plan.md> (if any)

## Notes

<Technical decisions, constraints, or context>
```

## Guidelines

- **Small scope**: A plan should be completable in 1-3 focused sessions
- **One concern**: Each plan addresses one logical piece (a module, a pattern, a config system)
- **Concrete tasks**: "Implement X" not "Think about X"
- **Bottom-up ordering**: Start with foundational pieces, build up
- **No fluff**: Skip obvious statements. Be direct
- **Technical when needed**: Include code snippets, type signatures, or API shapes when they clarify intent
