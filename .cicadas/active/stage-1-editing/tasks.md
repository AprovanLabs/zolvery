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

**Status**: Complete

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

**Status**: Complete

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

**Status**: Complete

---

### P2.4 — Integrate EditableWidgetPlayer in App

**Files**: `apps/client/main.tsx`

**Steps**:
1. Replace `WidgetPlayer` usage with `EditableWidgetPlayer`
2. Pass `editable={true}` prop where editing should be allowed
3. Ensure edit mode doesn't break normal gameplay

**Test**: Play a game, click Edit, make a change, close, continue playing with updated widget.

**Status**: Complete

---

### P2.5 — Add Compile Function for Error Recovery

**Files**: `apps/client/src/components/widget-edit-modal.tsx`

**Steps**:
1. Pass `compile` function to `useEditSession` options
2. Implement compile function using `compiler.compile()`
3. Return `{ success: true }` or `{ success: false, error: message }`

**Test**: When edit causes compilation error, retry is triggered automatically.

**Status**: Complete

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

**Status**: Complete

---

### P3.2 — Update WidgetEditModal for Multi-file

**Files**: `apps/client/src/components/widget-edit-modal.tsx`, `../patchwork/packages/editor/src/components/edit/useEditSession.ts`

**Steps**:
1. Update patchwork `useEditSession` to accept `originalProject?: VirtualProject` option
2. Update patchwork `EditModal` to pass `originalProject` prop through
3. Update kossabos `WidgetEditModal` props to accept `VirtualProject` instead of `source: string`
4. Update `EditableWidgetPlayer` to pass full project from `useWidgetProject`

**Test**: File tree shows `client/main.tsx` and `kossabos.json`, switching files works.

**Status**: Complete

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

**Status**: Complete

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

**Status**: Complete

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

**Status**: Complete

---

## Partition 4: Extract Generic Components to Patchwork

### P4.1 — Add SaveConfirmDialog to patchwork-editor

**Files**: `../patchwork/packages/editor/src/components/edit/SaveConfirmDialog.tsx`, `../patchwork/packages/editor/src/components/edit/index.ts`

**Steps**:
1. Create `SaveConfirmDialog` component in patchwork-editor (lift from kossabos)
2. Export from edit index
3. Export from package index

**Test**: `import { SaveConfirmDialog } from '@aprovan/patchwork-editor'` compiles.

**Status**: Complete

---

### P4.2 — Add onSave to EditModal

**Files**: `../patchwork/packages/editor/src/components/edit/EditModal.tsx`, `../patchwork/packages/editor/src/components/edit/types.ts`

**Steps**:
1. Add `onSave?: (code: string) => Promise<void>` prop to `EditModalProps`
2. When `onSave` provided:
   - Show save button in header
   - Intercept close to check for unsaved changes
   - Show `SaveConfirmDialog` when closing with changes
3. Handle save/discard/cancel flow internally

**Test**: EditModal with `onSave` shows save button and confirmation dialog on close.

**Status**: Complete

---

### P4.3 — Simplify WidgetEditModal

**Files**: `apps/client/src/components/widget-edit-modal.tsx`

**Steps**:
1. Remove local `SaveConfirmDialog` component
2. Remove save flow state management (`showConfirm`, `pendingClose`, etc.)
3. Pass `onSave` prop directly to `EditModal`
4. Remove manual save button overlay

**Test**: Edit flow works identically with simplified implementation.

**Status**: Complete

---

### P4.4 — Configure pnpm Catalog Reference

**Files**: `pnpm-workspace.yaml`, `apps/client/package.json`

**Steps**:
1. Add `catalog:` section to workspace yaml with patchwork packages
2. Update client package.json to use `"catalog:"` for `@aprovan/patchwork-editor` and `@aprovan/bobbin`
3. Remove hardcoded `link:` paths

**Test**: `pnpm install` resolves dependencies correctly. Switch catalog entry to `link:` and back to verify both modes work.

**Status**: Complete

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

---

## Partition 5: Multi-File Type Support

> **Location**: Changes are in **Patchwork** (`../patchwork/packages/editor/`)

### P5.1 — Add File Type Detection Utility

**Files**: `../patchwork/packages/editor/src/components/edit/fileTypes.ts`

**Steps**:
1. Create `fileTypes.ts` with file type classification utilities
2. Define file type categories: `compilable`, `text`, `media`, `binary`
3. Implement `getFileType(path: string)` returning category + language hint
4. Implement `isCompilable(path: string)` for files the compiler can handle
5. Implement `getLanguageFromExt(path: string)` for syntax highlighting

**Interface**:
```typescript
type FileCategory = 'compilable' | 'text' | 'media' | 'binary';

interface FileTypeInfo {
  category: FileCategory;
  language: string | null;  // For code blocks: 'json', 'yaml', 'tsx', etc.
  mimeType: string;
}

const COMPILABLE_EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js'];
const MEDIA_EXTENSIONS = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mov', '.webm'];
const TEXT_EXTENSIONS = ['.json', '.yaml', '.yml', '.md', '.txt', '.css', '.html'];

function getFileType(path: string): FileTypeInfo;
function isCompilable(path: string): boolean;
function isMediaFile(path: string): boolean;
function getLanguageFromExt(path: string): string | null;
```

**Test**: `getFileType('foo.json')` returns `{ category: 'text', language: 'json', mimeType: 'application/json' }`.

**Status**: Pending

---

### P5.2 — Add MediaPreview Component

**Files**: `../patchwork/packages/editor/src/components/edit/MediaPreview.tsx`

**Steps**:
1. Create component that renders media files using browser/HTML APIs
2. Handle images: `<img src="data:..." />` with base64 data URL
3. Handle videos: `<video>` element with controls
4. Handle SVG: inline render or `<img>` with data URL
5. Center content with max-width/max-height constraints
6. Show file metadata (dimensions, size) below preview

**Interface**:
```typescript
interface MediaPreviewProps {
  content: string;       // Base64 or raw content
  mimeType: string;
  fileName: string;
}
```

**Test**: Pass base64-encoded PNG, renders as visible image.

**Status**: Pending

---

### P5.3 — Add CodeBlockView Component

**Files**: `../patchwork/packages/editor/src/components/edit/CodeBlockView.tsx`

**Steps**:
1. Create component for displaying non-markdown text files in code view
2. Wrap content in markdown code fence with language tag
3. Use `MarkdownEditor` in read-only mode OR a simple syntax-highlighted `<pre>` block
4. Support editing: when `editable={true}`, allow direct text editing
5. Auto-detect language from file extension using `getLanguageFromExt`

**Interface**:
```typescript
interface CodeBlockViewProps {
  content: string;
  language: string | null;
  editable?: boolean;
  onChange?: (content: string) => void;
}
```

**Rendering Logic**:
- For `.json` file with content `{"foo": "bar"}`:
  ```json
  {"foo": "bar"}
  ```
- For `.yml` file with content `foo: bar`:
  ```yml
  foo: bar
  ```

**Test**: JSON file renders with syntax highlighting, edits update content.

**Status**: Pending

---

### P5.4 — Update EditModal for File-Type Rendering

**Files**: `../patchwork/packages/editor/src/components/edit/EditModal.tsx`

**Steps**:
1. Import `getFileType`, `isCompilable`, `isMediaFile` from `fileTypes.ts`
2. Determine file type when `activeFile` changes
3. Conditionally disable Preview toggle for non-compilable files
4. Route rendering based on file type:
   - **Compilable** (tsx/jsx): Use existing `renderPreview` + Code toggle
   - **Text** (json/yaml/md): Show `CodeBlockView` with editing, hide Preview button
   - **Media** (png/svg/mp4): Show `MediaPreview`, hide Preview button
5. Update header button visibility based on file type

**Rendering Matrix**:
| File Type | Preview Button | Code Button | Editable | Component |
|-----------|----------------|-------------|----------|-----------|
| `.tsx`    | Shown (active) | Shown       | Via LLM  | `renderPreview` / `<pre>` |
| `.json`   | Hidden         | N/A         | Direct   | `CodeBlockView` |
| `.yaml`   | Hidden         | N/A         | Direct   | `CodeBlockView` |
| `.md`     | Hidden         | N/A         | Direct   | `MarkdownEditor` |
| `.png`    | Hidden         | N/A         | Upload   | `MediaPreview` |
| `.svg`    | Hidden         | N/A         | Upload   | `MediaPreview` |

**Test**: Open `kossabos.json`, Preview button hidden, content renders as formatted JSON code block.

**Status**: Pending

---

### P5.5 — Add Direct Text Editing Support

**Files**: `../patchwork/packages/editor/src/components/edit/EditModal.tsx`, `../patchwork/packages/editor/src/components/edit/useEditSession.ts`

**Steps**:
1. For text files, replace read-only `<pre>` with editable textarea/CodeBlockView
2. Wire `onChange` to `session.updateActiveFile(content)`
3. Track dirty state per-file (already exists via project comparison)
4. Keep LLM prompt input available for AI-assisted edits even on text files
5. Ensure Save button works with direct edits (no LLM round-trip required)

**UX**:
- User can directly type in JSON/YAML/text files
- User can still use prompt input for AI edits
- Save tracks all changes regardless of edit method

**Test**: Open `kossabos.json`, directly edit text, Save persists changes.

**Status**: Pending

---

### P5.6 — Add File Upload to FileTree

**Files**: `../patchwork/packages/editor/src/components/edit/FileTree.tsx`

**Steps**:
1. Detect media files using `isMediaFile(path)`
2. On hover over media file, show upload icon overlay
3. On click upload icon, open file picker (`<input type="file">`)
4. On file selection:
   - Read file as base64
   - Call `onReplaceFile(path, base64Content, encoding: 'base64')`
5. Add `onReplaceFile` callback prop to `FileTreeProps`

**Interface**:
```typescript
interface FileTreeProps {
  files: VirtualFile[];
  activeFile: string;
  onSelectFile: (path: string) => void;
  onReplaceFile?: (path: string, content: string, encoding: 'utf8' | 'base64') => void;
}
```

**Test**: Hover over `icon.png` in tree, click upload, select new image, preview updates.

**Status**: Pending

---

### P5.7 — Wire File Upload Through EditModal

**Files**: `../patchwork/packages/editor/src/components/edit/EditModal.tsx`, `../patchwork/packages/editor/src/components/edit/useEditSession.ts`

**Steps**:
1. Add `replaceFile(path, content, encoding)` to `useEditSession` actions
2. Pass `onReplaceFile` from EditModal to FileTree
3. When file replaced:
   - Update project files map with new content
   - Mark file as dirty
   - If replaced file is active, refresh preview
4. Ensure base64 content is preserved through save flow

**Interface addition to useEditSession**:
```typescript
interface EditSessionActions {
  // ... existing
  replaceFile: (path: string, content: string, encoding?: 'utf8' | 'base64') => void;
}
```

**Test**: Upload new icon, Save, reload, new icon persists.

**Status**: Pending

---

### P5.8 — Update Save Flow for Multi-Type Files

**Files**: `../patchwork/packages/editor/src/components/edit/types.ts`, kossabos save endpoint

**Steps**:
1. Ensure `VirtualFile` can carry encoding hint: `encoding?: 'utf8' | 'base64'`
2. When saving project, include encoding in save request payload
3. Update Kossabos save endpoint to handle `encoding: 'base64'` files:
   - Decode base64 before writing
   - Write as binary buffer for media files
4. Verify round-trip: upload image → save → reload → image displays correctly

**Test**: Replace icon.png via upload, Save, restart server, icon.png is correct binary file.

**Status**: Pending

---

## Verification Checklist: Partition 5

### File Type Rendering
- [ ] `.tsx` files show Preview/Code toggle, Preview renders compiled React
- [ ] `.json` files show formatted JSON in code block, no Preview button
- [ ] `.yaml` files show formatted YAML in code block, no Preview button
- [ ] `.md` files show in MarkdownEditor (or similar), editable directly
- [ ] `.png`/`.jpg` files show image preview, no Preview button
- [ ] `.svg` files render inline or as image
- [ ] `.mp4`/`.mov` files show video player

### Direct Editing
- [ ] Can type directly in `.json` files and Save
- [ ] Can type directly in `.yaml` files and Save
- [ ] Can still use LLM prompt on any text file
- [ ] Changes tracked correctly for Save confirmation

### Media Upload
- [ ] Hover over media file in tree shows upload indicator
- [ ] Click upload opens file picker
- [ ] Selecting file updates preview immediately
- [ ] Save persists new media file to disk correctly
- [ ] Binary files not corrupted through save round-trip
