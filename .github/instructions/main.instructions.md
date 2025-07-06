---
applyTo: '**'
---

## Documentation

### Instructions

[../docs/INSTRUCTIONS.md](../docs/INSTRUCTIONS.md)

The instructions file may provide current instructions to follow. If the instructions are defined with checkboxes, update the box once each step is complete. If nothing defined, just use the current prompt for instructions.

### Briefing

[../docs/BRIEFING.md](../docs/BRIEFING.md)

The briefing file provides a spot to document high-level information and any particular technical details of note. Keep this as brief as possible, but make important updates clear.

## Tools

### PNPM

Use PNPM for commands. Use workspace commmands where possible

### TypeScript

For all TypeScript files:

- Prefer arrow functions for simple functions, especially when they are one-liners.
- Do not use `any` type. Use specific types or `unknown` if the type is not known.
- Use `const` for variables that are not reassigned.
