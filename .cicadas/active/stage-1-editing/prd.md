# PRD: Stage 1 - Widget Editing Flow

## Problem Statement

Zolvery currently supports **running** widgets (games) through the Patchwork compiler, but lacks the ability to **edit** them via the UI. Developers and content creators must manually edit source files, which is slow and error-prone. We need to integrate Patchwork's editing components to enable in-app widget editing with LLM-powered assistance.

## Users

| Persona | Description | Needs |
|---------|-------------|-------|
| **Game Developer** | Technical user creating/refining games | Edit game logic, UI, and settings via natural language prompts |
| **Content Creator** | Non-technical user customizing games | Modify game appearance, metadata, and icons without coding |

## Goals

1. **Enable in-app editing**: Users can edit widget source code through a visual editor interface
2. **LLM-powered assistance**: Support natural language edit requests via the Stitchery service
3. **Multi-file support**: Edit code files, metadata (zolvery.json), and icons as a cohesive project
4. **Local persistence**: Save edited widgets to the examples folder (dev-mode 'path' feature)
5. **Live preview**: See changes reflected in real-time as edits are applied

## Non-Goals (for Stage 1)

- Cloud persistence (AWS/S3) — reserved for Stage 4
- User authentication for editing — reserved for Stage 4
- Mobile editing experience — reserved for Stage 3+
- Creating new widgets from scratch — focus is on editing existing widgets

## Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| Edit existing widget | User can open editor, make a natural language edit request, and see updated preview |
| Save to disk | Edited widget persists to the examples folder and loads correctly on restart |
| Multi-file editing | User can edit metadata and icon alongside code |
| Error recovery | Editor handles compilation errors gracefully with retry mechanism |

## Constraints

- Must use existing `@aprovan/patchwork-editor` components from NPM
- Must run Stitchery service locally for edit requests (no external API dependency)
- Save only to local filesystem (examples package) — no cloud storage
- Edits must work with the existing `@aprovan/patchwork-image-boardgameio` image

## Dependencies

| Dependency | Package | Status |
|-----------|---------|--------|
| Patchwork Compiler | `@aprovan/patchwork-compiler` | ✅ Already integrated |
| Patchwork Editor | `@aprovan/patchwork-editor` | ⏳ Needs integration |
| Stitchery Backend | `@aprovan/stitchery` | ⏳ Needs to be run as service |
| Multi-file editing support | `@aprovan/patchwork-editor` | ⚠️ May need Patchwork refactoring |

## Key Decisions

1. **Use EditModal from patchwork-editor**: Leverage existing components rather than building custom
2. **Run Stitchery locally**: No cloud service dependency for Stage 1
3. **File-based storage**: Edited widgets save directly to the `packages/examples/src/` folder
4. **Dev-mode path feature**: Use a "path" parameter to specify where edits should be saved
