# UX: Stage 1 - Widget Editing Flow

## Overview

The editing experience integrates Patchwork's `EditModal` component into the Kossabos client, allowing users to enter an "edit mode" from any running widget. The modal provides side-by-side code/preview views, a natural language editor, and edit history.

## User Flows

### Flow 1: Enter Edit Mode

```
[Playing Widget] → [Edit Button] → [Edit Modal Opens]
```

1. User is viewing/playing a widget
2. User clicks "Edit" button in the widget toolbar
3. Edit modal opens with:
   - Current widget source code loaded
   - Live preview of the widget
   - Empty edit prompt input

### Flow 2: Make an Edit

```
[Edit Modal] → [Type Prompt] → [Submit] → [See Updated Preview]
```

1. User types a natural language edit request (e.g., "Change the background color to blue")
2. User clicks Send (or presses Ctrl+Enter)
3. Loading state shows "Applying edits..."
4. Edit history updates with the request
5. Preview re-renders with the updated code
6. If compilation fails:
   - Error is shown briefly
   - System automatically attempts to fix via retry
   - Retry entry added to history

### Flow 3: Edit Metadata

```
[Edit Modal] → [Toggle File Tree] → [Select kossabos.json] → [Edit]
```

1. User clicks the folder/tree toggle button
2. File tree panel appears showing:
   - `main.tsx` (active)
   - `kossabos.json`
   - `icon.png` (view-only)
3. User selects `kossabos.json`
4. JSON content displayed in code view
5. User edits via natural language or manual edit

### Flow 4: Save and Close

```
[Edit Modal] → [Done Button] → [Save Dialog] → [Catalog]
```

1. User clicks "Done" button
2. If changes were made:
   - Confirmation dialog: "Save changes to {widget-name}?"
   - Options: "Save", "Discard", "Cancel"
3. On Save: Files written to examples folder
4. Modal closes, returns to catalog or widget view

## UI Components

### Edit Modal Layout

```
┌───────────────────────────────────────────────────────────┐
│ ✏️ Edit Mode          [Revert] [Files] [Preview] [Done]   │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┬─────────────────────────────────────┐   │
│  │ main.tsx    │                                     │   │
│  │ kossabos.   │      [Live Preview Area]            │   │
│  │   json      │                                     │   │
│  │ icon.png    │                                     │   │
│  └─────────────┴─────────────────────────────────────┘   │
│                                                           │
├───────────────────────────────────────────────────────────┤
│  ▶ "Changed background color"                   [✓]      │
│  ▶ "Fix: Compilation error..."                  [✓]      │
├───────────────────────────────────────────────────────────┤
│  [Markdown Editor: "Describe changes..."]       [Send]   │
└───────────────────────────────────────────────────────────┘
```

### Toolbar Actions

| Button | Icon | Action |
|--------|------|--------|
| Revert | ↩️ | Reset to original code (only visible when changes exist) |
| Files | 📁 | Toggle file tree panel |
| Preview/Code | 👁️/< > | Toggle between preview and code view |
| Done | ✕ | Close edit modal |

### Edit History Panel

- Shows chronological list of edit prompts
- Each entry shows:
  - Prompt text (truncated)
  - Success/retry indicator
- Streaming notes shown during processing

### File Tree Panel

- Collapsible panel on left side
- Lists all files in the widget project:
  - `main.tsx` — React component source
  - `kossabos.json` — Widget metadata/manifest
  - `icon.png` — Widget icon (view-only indicator)
- Active file highlighted
- Click to switch active file

## States

### Loading States

| State | Visual |
|-------|--------|
| Opening editor | Spinner + "Loading widget..." |
| Applying edit | Blue pill "Applying edits..." + disabled input |
| Rendering preview | Spinner in preview area |

### Error States

| State | Visual |
|-------|--------|
| Compilation error | Red banner with error message, auto-retry |
| Edit failed | Red banner with error, keep original code |
| Preview error | Red text in preview area with alert icon |

### Empty States

| State | Visual |
|-------|--------|
| No changes yet | Preview shows current widget, history empty |

## Entry Points

### From Widget Player

Add an edit button to the widget player toolbar:

```tsx
<button onClick={() => setEditMode(true)}>
  <Pencil className="h-4 w-4" />
  Edit
</button>
```

### From Game Catalog (Future)

Long-press or context menu on a game card could open edit mode directly.

## Accessibility

- All buttons have title/aria-label attributes
- Keyboard navigation: Tab through toolbar, Ctrl+Enter to submit
- Focus management: Focus edit input when modal opens
- Screen reader: Announce edit progress and results

## Responsive Behavior

- Modal fills 90% of viewport (max 6xl width)
- On smaller screens:
  - File tree collapses to icon-only
  - Preview/code toggle becomes tab-like
  - History panel collapsible
