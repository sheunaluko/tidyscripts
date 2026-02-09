# Component Viewer

## Overview
Registry-based showcase for testing Tidyscripts laboratory components in isolation. Accessible at `/laboratory/component_viewer` and linked from the sidebar under Laboratory.

## Structure
```
component_viewer/
├── page.tsx                  # Next.js page (force-dynamic, renders client component)
├── ComponentViewerClient.tsx # Main UI — demo registry, category tabs, accordion viewer
└── CLAUDE.md
```

## How It Works

### Demo Registry
`ComponentViewerClient.tsx` maintains an inline `demos: ComponentDemo[]` array. Each entry defines:
- `name` — display name
- `category` — used for tab filtering (auto-collected into category tabs)
- `description` — short summary
- `component` — live React node rendered in a sandbox area
- `code` — string code example shown in a monospace block
- `props` — optional array of `{ name, type, description }` for props documentation

### UI
- **Category tabs** at top — "ALL" plus one tab per unique category
- **Accordion list** — one expandable panel per demo, showing:
  - Live demo (rendered component)
  - Code example (preformatted block)
  - Props table (if provided)
- MUI-based, uses theme-aware alpha blending and blur effects

### Current Demos
| Demo | Category | Component |
|-|-|-|
| Tidyscripts Voice Interface (Tivi) | voice | `<Tivi>` from `../components/tivi` |

## Adding a New Demo
1. Import the component at the top of `ComponentViewerClient.tsx`
2. Add an entry to the `demos` array with name, category, description, component JSX, code string, and optional props
3. The category tab and accordion entry appear automatically

## Related
- Reusable components live in `app/laboratory/components/` (see `components/README.md` for architecture guidelines)
- The README checklist includes "Add demo to `/component_viewer/page.tsx`" as a step when creating new components
