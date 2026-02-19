# Tasks: Stage 1 - Widget Editing Flow

## Partition 1: Service Infrastructure

### P1.1 — Configure Vite Proxy for Edit API

**Files**: `apps/client/vite.config.ts`

**Steps**:
1. Add proxy configuration for `/api/edit` → `http://127.0.0.1:6434`
2. Add proxy configuration for `/api/chat` → `http://127.0.0.1:6434` (for future chat-based editing)

**Test**: Start dev server, verify proxy routes are active in console output.

**Status**: Complete

---

### P1.2 — Update Dev Scripts for Stitchery

**Files**: `scripts/start-local.sh`, `package.json`

**Steps**:
1. Update `start-local.sh` to start Stitchery service in background
2. Add environment variable for Stitchery port (`STITCHERY_PORT=6434`)
3. Add script for standalone Stitchery start: `pnpm dev:stitchery`

**Test**: Run `pnpm dev`, verify Stitchery is running and accessible.

**Status**: Complete

---

### P1.3 — Verify Edit API Pipeline

**Files**: None (verification task)

**Steps**:
1. Start full dev environment
2. Test edit endpoint: `curl -X POST http://localhost:3700/api/edit -H "Content-Type: application/json" -d '{"code":"export default function App() { return <div>Hello</div>; }","prompt":"Change Hello to World"}'`
3. Verify response contains transformed code

**Test**: Response includes newCode with "World" instead of "Hello".

**Status**: Complete

---

## Partition 2: Edit Modal Integration

### P2.1 — Add Patchwork Editor Dependency

**Files**: `apps/client/package.json`

**Steps**:
1. Add `@aprovan/patchwork-editor` as workspace dependency
2. Run `pnpm install`
3. Verify types are available in IDE

**Test**: Import statement `import { EditModal } from '@aprovan/patchwork-editor'` compiles without error.

---

### P2.2 — Create WidgetEditModal Component

**Files**: `apps/client/src/components/widget-edit-modal.tsx`

**Steps**:
1. Create new component wrapping `EditModal`
2. Accept `appId`, `manifest`, `source` props
3. Pass through `renderPreview` that uses `usePatchwork` to compile and render
4. Configure `apiEndpoint` to use `/api/edit`
5. Handle `onClose` callback

**Interface**:
```typescript
interface WidgetEditModalProps {
  appId: string;
  manifest: KossabosManifest;
  source: string;
  isOpen: boolean;
  onClose: (finalCode: string, editCount: number) => void;
}
```

**Test**: Modal opens with current widget code, preview renders correctly.

---

### P2.3 — Create EditableWidgetPlayer Component

**Files**: `apps/client/src/components/editable-widget-player.tsx`

**Steps**:
1. Create wrapper around `WidgetPlayer`
2. Add toolbar with "Edit" button
3. Manage `isEditing` state
4. Render `WidgetEditModal` when editing
5. Update local source when edit completes

**Test**: Clicking Edit opens modal, making changes updates preview.

---

### P2.4 — Integrate EditableWidgetPlayer in App

**Files**: `apps/client/main.tsx`

**Steps**:
1. Replace `WidgetPlayer` usage with `EditableWidgetPlayer`
2. Pass `editable={true}` prop where editing should be allowed
3. Ensure edit mode doesn't break normal gameplay

**Test**: Play a game, click Edit, make a change, close, continue playing with updated widget.

---

### P2.5 — Add Compile Function for Error Recovery

**Files**: `apps/client/src/components/widget-edit-modal.tsx`

**Steps**:
1. Pass `compile` function to `useEditSession` options
2. Implement compile function using `compiler.compile()`
3. Return `{ success: true }` or `{ success: false, error: message }`

**Test**: When edit causes compilation error, retry is triggered automatically.

---

## Partition 3: Multi-file & Persistence

### P3.1 — Create useWidgetProject Hook

**Files**: `apps/client/src/hooks/use-widget-project.ts`

**Steps**:
1. Create hook that loads all widget files as `VirtualProject`
2. Fetch `main.tsx`, `kossabos.json`, and icon URL
3. Track dirty state for each file
4. Provide `updateFile(path, content)` method

**Interface**:
```typescript
interface UseWidgetProjectReturn {
  project: VirtualProject | null;
  manifest: KossabosManifest | null;
  isLoading: boolean;
  error: Error | null;
  isDirty: boolean;
  updateFile: (path: string, content: string) => void;
  save: () => Promise<void>;
}
```

**Test**: Hook loads all files, `isDirty` updates when file content changes.

---

### P3.2 — Update WidgetEditModal for Multi-file

**Files**: `apps/client/src/components/widget-edit-modal.tsx`

**Steps**:
1. Use `useWidgetProject` instead of single source
2. Pass full `VirtualProject` to `useEditSession`
3. Enable file tree toggle in UI
4. Handle active file switching

**Test**: File tree shows `main.tsx` and `kossabos.json`, switching files works.

---

### P3.3 — Add Save Endpoint to Server

**Files**: `apps/server/src/api/v1/app.ts`

**Steps**:
1. Add `POST /:appId+/save` route
2. Validate appId exists in examples
3. Validate path doesn't escape examples directory
4. Write files to disk using `fs.writeFile`
5. Return success response

**Interface**:
```typescript
// Request body
interface SaveRequest {
  files: Array<{
    path: string;        // Relative path within widget folder
    content: string;     // File content (text or base64)
    encoding?: 'utf8' | 'base64';
  }>;
}
```

**Security**:
- Reject if `appId` contains `..` or starts with `/`
- Only allow writes to `packages/examples/src/{appId}/`

**Test**: POST request saves file, file exists on disk with correct content.

---

### P3.4 — Implement Save Flow in Client

**Files**: `apps/client/src/components/widget-edit-modal.tsx`, `apps/client/src/hooks/use-widget-project.ts`

**Steps**:
1. Add "Save" button to modal (or use Done with confirmation)
2. On save, call `project.save()` which POSTs to save endpoint
3. Show loading state during save
4. Show success/error toast
5. Clear dirty state on success

**Test**: Make edit, click Done, confirm save, reload page, verify changes persist.

---

### P3.5 — Add Save Confirmation Dialog

**Files**: `apps/client/src/components/widget-edit-modal.tsx`

**Steps**:
1. When closing with unsaved changes, show confirmation dialog
2. Options: "Save", "Discard", "Cancel"
3. Save → call save endpoint, then close
4. Discard → close without saving
5. Cancel → return to editor

**Test**: Make changes, click Done, dialog appears with all three options working correctly.

---

## Verification Checklist

### End-to-End Flow

- [ ] Dev environment starts all services (client, server, stitchery)
- [ ] User can browse game catalog
- [ ] User can play a game
- [ ] User can click Edit to open modal
- [ ] User can type edit prompt and see preview update
- [ ] User can switch between code and preview views
- [ ] User can view file tree with `main.tsx` and `kossabos.json`
- [ ] User can switch active file and edit each
- [ ] User can save changes to disk
- [ ] Changes persist after page reload
- [ ] Compilation errors trigger retry mechanism
- [ ] Network errors display error message

### Edge Cases

- [ ] Very long code files display correctly
- [ ] Edit prompt with special characters works
- [ ] Save endpoint rejects path traversal attempts
- [ ] Modal handles missing manifest gracefully
- [ ] Revert button resets all changes
