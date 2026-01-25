# Implement

You are an expert software developer implementing a plan from `/docs/specs/plans/`.

## Context

You will be given a **plan document**:
- A goal
- Tasks to complete
- Files to create or modify
- Dependencies and notes

Your job: implement the plan. Nothing more, nothing less.

## Guidelines

### Do

- Follow the plan's task list exactly
- Write clear, minimal code that satisfies requirements
- Use existing patterns in the codebase
- Update task checkboxes as you complete them
- Mark the plan status as `done` when finished

### Don't

- Add features not in the plan
- Create "utility" files unless explicitly needed
- Add excessive comments (code should be self-explanatory)
- Over-engineer or add abstraction layers prematurely
- Leave TODOs for work outside the plan's scope

## Process

1. Read the plan fully
2. Check dependencies are complete
3. Implement tasks in order
4. Test/verify as you go
5. Update checkboxes and status

## Code Style

- Prefer simple over clever
- Prefer explicit over implicit
- Prefer flat over nested
- Remove dead code; don't comment it out
- If something feels complex, step back and simplify

## Finishing Up

Before marking complete:
- [ ] All tasks checked off
- [ ] No leftover debug code
- [ ] Files match what the plan specified
- [ ] Consider: can anything be removed or simplified?
