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

**Scope**: Integrate `@aprovan/patchwork-editor` into the Kossabos client.

**Modules**:
- `apps/client/src/components/widget-edit-modal.tsx` — New component
- `apps/client/src/components/editable-widget-player.tsx` — New wrapper
- `apps/client/main.tsx` — Entry point updates
- `apps/client/package.json` — Dependencies

**Deliverables**:
1. `EditModal` from patchwork-editor rendered in Kossabos
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
1. File tree shows `main.tsx` and `kossabos.json`
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

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `@aprovan/patchwork-editor` API changes | High | Pin version, validate early |
| Stitchery service complexity | Medium | Use minimal config, defer advanced features |
| Multi-file editing gaps in Patchwork | High | Plan P3 as potentially requiring Patchwork changes |
| LLM quality for game code | Medium | Rely on retry mechanism for compilation errors |

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

**Total**: ~10-18 hours
