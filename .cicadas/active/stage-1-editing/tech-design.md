# Tech Design: Stage 1 - Widget Editing Flow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Kossabos Client                             │
│  ┌─────────────────┐    ┌─────────────────┐   ┌─────────────────┐  │
│  │  Game Catalog   │───▶│  Widget Player  │──▶│   Edit Modal    │  │
│  └─────────────────┘    └─────────────────┘   └────────┬────────┘  │
│                                                         │          │
│                              ┌───────────────────────────┘          │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    usePatchwork Hook                         │  │
│  │   - Compile JSX → ESM                                        │  │
│  │   - Mount widget to DOM                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │ HTTP /api/edit
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Stitchery Server                           │
│   POST /api/edit { code, prompt } → { newCode, summary }         │
│   - LLM processing via Copilot Proxy                             │
│   - Diff-based code transformation                               │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Copilot Proxy                              │
│   - Routes to Claude/GPT models                                  │
│   - Handles authentication                                       │
└──────────────────────────────────────────────────────────────────┘
```

## Components

### Client Components

#### 1. EditableWidgetPlayer

A wrapper around `WidgetPlayer` that adds edit mode capabilities.

```typescript
interface EditableWidgetPlayerProps extends WidgetPlayerProps {
  onSave?: (project: WidgetProject) => Promise<void>;
  editable?: boolean;
}
```

**Location**: `apps/client/src/components/editable-widget-player.tsx`

**Responsibilities**:
- Render widget via `WidgetPlayer`
- Provide "Edit" button in toolbar
- Open `EditModal` when edit mode activated
- Handle save operation on close

#### 2. WidgetEditModal

Extends `EditModal` from `@aprovan/patchwork-editor` with Kossabos-specific features.

```typescript
interface WidgetEditModalProps {
  appId: string;
  manifest: KossabosManifest;
  source: string;
  isOpen: boolean;
  onClose: (saved: boolean) => void;
  onSave: (project: WidgetProject) => Promise<void>;
}
```

**Location**: `apps/client/src/components/widget-edit-modal.tsx`

**Responsibilities**:
- Wrap `EditModal` with Kossabos styling
- Provide multi-file VirtualProject (code + manifest)
- Handle save to examples folder
- Configure compile function for preview

#### 3. useWidgetProject Hook

Extends `useWidgetSource` to support editing.

```typescript
interface WidgetProject {
  appId: string;
  files: Map<string, { path: string; content: string }>;
  manifest: KossabosManifest;
  isDirty: boolean;
}

interface UseWidgetProjectReturn {
  project: WidgetProject | null;
  isLoading: boolean;
  error: Error | null;
  save: () => Promise<void>;
  updateFile: (path: string, content: string) => void;
}
```

**Location**: `apps/client/src/hooks/use-widget-project.ts`

### Server Components

#### 1. Stitchery Service (External)

The Stitchery server from `@aprovan/stitchery` runs as a separate process.

**Endpoint**: `POST /api/edit`

```typescript
// Request
interface EditRequest {
  code: string;
  prompt: string;
}

// Response (streamed)
interface EditResponse {
  newCode: string;
  summary: string;
  progressNotes: string[];
}
```

#### 2. Vite Dev Server Proxy

Configure Vite to proxy edit requests to Stitchery.

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/edit': {
        target: 'http://127.0.0.1:6434',
        changeOrigin: true,
      },
    },
  },
});
```

#### 3. Save Endpoint (Kossabos Server)

New endpoint to save edited widgets to the examples folder.

**Endpoint**: `POST /api/v1/apps/:appId/save`

```typescript
// Request
interface SaveRequest {
  files: Array<{ path: string; content: string; encoding?: 'base64' }>;
}

// Response
interface SaveResponse {
  success: boolean;
  savedAt: string;
}
```

**Location**: `apps/server/src/api/v1/app.ts`

**Implementation**:
- Validate appId exists in examples
- Write files to `packages/examples/src/{appId}/`
- Return success/failure

## Data Flow

### Edit Flow

```
1. User clicks "Edit" on widget
2. WidgetEditModal opens with current source
3. User types edit prompt
4. useEditSession calls POST /api/edit
5. Stitchery processes with LLM
6. Response streamed back with diffs
7. Diffs applied to code
8. Compiler recompiles
9. Preview re-renders
10. History updated
```

### Save Flow

```
1. User clicks "Done" with changes
2. Confirmation dialog shown
3. On confirm: POST /api/v1/apps/{appId}/save
4. Server writes files to examples folder
5. Modal closes
6. Widget reloads with saved changes
```

## File Structure Changes

```
apps/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── editable-widget-player.tsx  # NEW
│   │   │   ├── widget-edit-modal.tsx       # NEW
│   │   │   └── widget-player.tsx           # MODIFIED (add edit button)
│   │   └── hooks/
│   │       ├── use-widget-project.ts       # NEW
│   │       └── use-widget-source.ts        # Unchanged
│   └── vite.config.ts                      # MODIFIED (add proxy)
└── server/
    └── src/
        └── api/
            └── v1/
                └── app.ts                  # MODIFIED (add save endpoint)
```

## Dependencies

### New Dependencies (client)

Uses pnpm catalog for patchwork dependencies:

```yaml
# pnpm-workspace.yaml
catalog:
  '@aprovan/patchwork-editor': ^0.1.0
  '@aprovan/bobbin': ^0.1.0
```

```json
// apps/client/package.json
{
  "dependencies": {
    "@aprovan/patchwork-editor": "catalog:",
    "@aprovan/bobbin": "catalog:"
  }
}
```

For local development against patchwork repo, use overrides in root `package.json`:

```json
{
  "pnpm": {
    "overrides": {
      "@aprovan/patchwork-editor": "link:../patchwork/packages/editor",
      "@aprovan/bobbin": "link:../patchwork/packages/bobbin"
    }
  }
}
```

### Runtime Services

| Service | Port | Start Command |
|---------|------|---------------|
| Kossabos Client | 3700 | `pnpm -C apps/client dev` |
| Kossabos Server | 3000 | `pnpm -C apps/server dev` |
| Stitchery | 6434 | `STITCHERY_PORT=6434 pnpm dlx @aprovan/stitchery serve` |
| Copilot Proxy | 6433 | Required for LLM calls |

## Multi-File Editing

### VirtualProject Structure

```typescript
// From @aprovan/patchwork-compiler
interface VirtualProject {
  entry: string;           // e.g., "main.tsx"
  files: Map<string, VirtualFile>;
}

interface VirtualFile {
  path: string;
  content: string;
}
```

### Kossabos Widget Project

A widget project includes:
- `main.tsx` — React component source (entry point)
- `kossabos.json` — Widget manifest/metadata
- `icon.png` — Widget icon (binary, base64 encoded for editing)

### File Type Handling

| File | Edit Mode | Preview |
|------|-----------|---------|
| `main.tsx` | Text editor + LLM | Live compile + render |
| `kossabos.json` | JSON viewer + LLM | Parsed for manifest |
| `icon.png` | Read-only / upload | Image preview |

### Project Creation

```typescript
function createWidgetProject(
  appId: string,
  source: string,
  manifest: KossabosManifest,
  iconUrl?: string,
): VirtualProject {
  return {
    entry: 'main.tsx',
    files: new Map([
      ['main.tsx', { path: 'main.tsx', content: source }],
      ['kossabos.json', { path: 'kossabos.json', content: JSON.stringify(manifest, null, 2) }],
      // Icon handled separately (binary)
    ]),
  };
}
```

## Error Handling

### Compilation Errors

1. Compiler throws error
2. Error displayed in preview area
3. `useEditSession` auto-retries with error context
4. Up to 2 retry attempts
5. If all fail, error persists in UI

### Network Errors

1. /api/edit request fails
2. Error shown in modal
3. User can retry manually
4. No auto-retry for network errors

### Save Errors

1. Save request fails
2. Error dialog shown
3. User can retry or discard
4. Changes preserved in memory

## Security Considerations

- Save endpoint only writes to `packages/examples/src/`
- Path traversal prevention via appId validation
- No arbitrary file writes outside examples folder
- Dev-mode only (no auth) — will change in Stage 4

## Resolved Questions

1. **Multi-file LLM editing**: Patchwork's `EditModal` supports multi-file projects via `VirtualProject`. File tree toggle implemented.
2. **Save flow**: Implemented in patchwork-editor with `onSave` prop, `SaveConfirmDialog` for unsaved changes confirmation.

## File Type Handling

### Categories

Files in the editor are classified into categories that determine rendering and editing behavior:

| Category    | Extensions                          | Preview Mode | Edit Mode       |
|-------------|-------------------------------------|--------------|-----------------|
| Compilable  | `.tsx`, `.jsx`, `.ts`, `.js`        | React render | LLM + direct    |
| Text        | `.json`, `.yaml`, `.yml`, `.md`, `.txt`, `.css`, `.html` | Code block   | Direct + LLM    |
| Media       | `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.mp4`, `.mov`, `.webm` | Browser API  | Upload/replace  |
| Binary      | Other                               | N/A          | Upload/replace  |

### Rendering Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         EditModal                               │
│  ┌─────────────────┐                                           │
│  │   FileTree      │──── onReplaceFile (for media upload)      │
│  └─────────────────┘                                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Content Area                            │   │
│  │                                                          │   │
│  │  if (isCompilable):                                     │   │
│  │    showPreview ? renderPreview(code) : <pre>{code}</pre>│   │
│  │                                                          │   │
│  │  if (isText):                                           │   │
│  │    <CodeBlockView content={code} language={ext}         │   │
│  │                   editable onChange={updateFile} />     │   │
│  │                                                          │   │
│  │  if (isMedia):                                          │   │
│  │    <MediaPreview content={base64} mimeType={...} />     │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Code Block Rendering

Non-markdown text files are displayed wrapped in markdown code fences:

```
// For kossabos.json:
┌────────────────────────────────────┐
│ ```json                            │
│ {                                  │
│   "name": "My Widget",             │
│   "version": "1.0.0"               │
│ }                                  │
│ ```                                │
└────────────────────────────────────┘
```

This provides:
- Syntax highlighting via standard markdown renderer
- Consistent visual style across file types
- Language-aware formatting

### Media File Upload Flow

```
1. User hovers over media file in FileTree
2. Upload icon overlay appears
3. User clicks → file picker opens
4. User selects new file
5. File read as base64
6. onReplaceFile(path, base64, 'base64') called
7. VirtualProject updated with new content
8. MediaPreview re-renders with new data
9. On Save: base64 decoded, written as binary
```

### VirtualFile Encoding

```typescript
interface VirtualFile {
  path: string;
  content: string;
  encoding?: 'utf8' | 'base64';  // NEW: default 'utf8'
}
```

Save endpoint handles encoding:
- `utf8`: Write content as-is
- `base64`: Decode then write as Buffer

## Open Questions (deferred to future stages)

1. **AI-generated icons**: Could LLM generate/modify SVG icons from prompts?
2. **Live reload**: After save, should the client auto-reload the widget from disk?
3. **Drag-and-drop**: Support dropping files onto FileTree to add new files?
