# Approach: Stage 1 - Widget Editing Flow

## Strategy

Implement the editing flow incrementally, starting with core infrastructure (services setup) before adding UI components. This allows early validation that the edit pipeline works before building the full UX.

## Sequencing

```
┌─────────────────────────────┐
│ P1: Service Infrastructure  │  ← Stitchery, proxy config
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ P2: Edit Modal Integration  │  ← EditModal, useEditSession
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ P3: Multi-file & Persistence│  ← VirtualProject, save API
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ P4: Extract to Patchwork    │  ← Generic components upstream
└─────────────────────────────┘
```

## Partitions

### Partition 1: Service Infrastructure

**Scope**: Set up the backend services required for LLM-powered editing.

**Modules**:
- `apps/client/vite.config.ts` — Proxy configuration
- `scripts/` — Dev script updates for starting services

**Deliverables**:
1. Vite dev server proxies `/api/edit` to Stitchery
2. Updated dev script starts Stitchery alongside other services
3. Verified: Edit API responds correctly

**Validation**:
- Manual test: `curl -X POST http://localhost:3700/api/edit` returns valid response

---

### Partition 2: Edit Modal Integration

**Scope**: Integrate `@aprovan/patchwork-editor` into the Zolvery client.

**Modules**:
- `apps/client/src/components/widget-edit-modal.tsx` — New component
- `apps/client/src/components/editable-widget-player.tsx` — New wrapper
- `apps/client/main.tsx` — Entry point updates
- `apps/client/package.json` — Dependencies

**Deliverables**:
1. `EditModal` from patchwork-editor rendered in Zolvery
2. Edit button visible in widget player toolbar
3. User can enter edit prompt and see updated preview
4. Edit history displays correctly

**Validation**:
- User can open a widget, click Edit, type "Change the title to Hello", and see the preview update
- Error states display correctly when compilation fails

---

### Partition 3: Multi-file & Persistence

**Scope**: Support editing multiple files (code + manifest) and saving changes to disk.

**Modules**:
- `apps/client/src/hooks/use-widget-project.ts` — New hook
- `apps/server/src/api/v1/app.ts` — Save endpoint
- `apps/client/src/components/widget-edit-modal.tsx` — Multi-file support

**Deliverables**:
1. File tree shows `main.tsx` and `zolvery.json`
2. User can switch between files and edit each
3. Save button writes changes to `packages/examples/src/{appId}/`
4. Widget reloads correctly after save

**Validation**:
- User edits manifest (e.g., change name), saves, and sees the change persist after page reload
- File writes are restricted to examples folder (no path traversal)

---

## Dependencies Between Partitions

| From | To | Dependency |
|------|-----|------------|
| P2 | P1 | Edit modal needs `/api/edit` proxy working |
| P3 | P2 | Multi-file extends the base edit modal |
| P3 | P1 | Save endpoint relies on server being running |
| P4 | P3 | Migration requires working save flow to validate |

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `@aprovan/patchwork-editor` API changes | High | Pin version, validate early |
| Stitchery service complexity | Medium | Use minimal config, defer advanced features |
| Multi-file editing gaps in Patchwork | High | Plan P3 as potentially requiring Patchwork changes |
| LLM quality for game code | Medium | Rely on retry mechanism for compilation errors |
| Cross-repo refactoring coordination | Medium | Use pnpm catalog for easy local/NPM switching |

## Partition 4: Extract Generic Components to Patchwork

**Scope**: Migrate generic editing components from Zolvery back to `@aprovan/patchwork-editor`.

**Rationale**: Stage 1 implementation added components that belong in the upstream package:
- `SaveConfirmDialog` - completely generic
- Save flow integration (onSave prop, unsaved changes detection)

Moving these upstream keeps Zolvery lean and benefits other Patchwork consumers.

**Modules**:
- `../patchwork/packages/editor/src/components/edit/` — Add SaveConfirmDialog, extend EditModal
- `apps/client/src/components/widget-edit-modal.tsx` — Simplify to use enhanced EditModal
- `apps/client/package.json`, `pnpm-workspace.yaml` — Catalog references

**Deliverables**:
1. `SaveConfirmDialog` exported from `@aprovan/patchwork-editor`
2. `EditModal` accepts optional `onSave` prop with built-in save button + confirmation
3. Zolvery uses catalog reference for easy local/NPM switching

**Validation**:
- Edit flow works identically after migration
- `WidgetEditModal` significantly simplified

---

## Out-of-Scope for Stage 1

- Authentication/authorization
- Cloud persistence (S3/DynamoDB)
- Creating new widgets from scratch
- Icon editing/generation
- Mobile-specific considerations

## Success Metrics

| Metric | Target |
|--------|--------|
| Edit round-trip time | < 5 seconds for simple edits |
| Compilation success rate | > 80% on first attempt |
| Save reliability | 100% (local filesystem) |

## Timeline Estimate

| Partition | Estimated Effort | Dependencies |
|-----------|------------------|--------------|
| P1: Infrastructure | 2-4 hours | Apprentice Stitchery available |
| P2: Edit Modal | 4-8 hours | P1 complete |
| P3: Multi-file & Save | 4-6 hours | P2 complete |
| P4: Extract to Patchwork | 2-4 hours | P3 complete |

**Total**: ~12-22 hours
