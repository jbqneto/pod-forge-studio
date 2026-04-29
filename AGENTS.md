# AGENTS.md — PODForge Studio

## Project mission

PODForge Studio is a Next.js App Router application for Etsy and print-on-demand sellers who need to generate bulk print-ready PNG designs directly in the browser.

The product combines three client-side tools:

1. Text Templates — generate many text-only designs from a reusable placeholder template.
2. Graphic Remix — combine one uploaded graphic with many slogans.
3. Pattern Fill — fill heavy text with camo, leopard, cow print, plaid, floral, wood, flag, or uploaded patterns.

The application must remain private, browser-only, and export-focused. User files must never be uploaded to a server.

## Non-negotiable constraints

- Use Next.js App Router.
- Keep SEO, metadata, sitemap, robots, and static marketing shell on the server side where possible.
- Keep all design generation, file uploads, canvas/SVG rendering, font imports, previews, and downloads client-side.
- Do not add a backend unless explicitly requested by the user.
- Do not add authentication unless explicitly requested by the user.
- Do not add a database unless explicitly requested by the user.
- Do not send uploaded images, slogans, fonts, patterns, or generated designs to any external service.
- Do not silently introduce SaaS/cloud persistence.
- The current workspace is temporary browser memory. Closing or refreshing the tab may lose work.
- Imported fonts are temporary and session-scoped.
- Exports must be transparent PNGs at 4500x5400 px unless the user explicitly changes the target size.
- Preview backgrounds are preview-only and must never be included in PNG exports.
- Code identifiers, filenames, functions, types, comments, and commit-style messages must be written in English.
- User-facing product copy can be English unless the user explicitly asks for Portuguese UI.

## Design direction

Use the approved first mockup as the source of truth.

Visual style:

- Soft-brutalist utility UI.
- Warm off-white background: `#FAF7F0`.
- Thick black borders: 2–3px.
- Rust orange primary accent: `#B84A1F`.
- Mustard secondary accent: `#D4A017`.
- Cream: `#F5E6D3`.
- Forest: `#2D4F3F`.
- No soft shadows.
- No gradients on UI chrome.
- Large, practical panels.
- Desktop: three-panel layout.
- Mobile: stacked panels.
- Generated designs must stay clean and print-focused. The brutalist style belongs to the app UI, not to the exported designs.

## Architecture boundaries

### Server Components

Use Server Components for:

- `src/app/layout.tsx`
- `src/app/page.tsx` wrapper/shell when possible
- static SEO content
- Metadata API
- robots and sitemap
- non-interactive explanatory sections if added later

### Client Components

Use Client Components for anything that requires:

- React state
- file input
- drag-and-drop uploads
- image loading
- custom font loading
- DOM refs
- SVG serialization
- Canvas export
- ZIP export
- preview modal
- tab switching
- browser memory/session state

The main tool component is intentionally client-side.

## Current source layout

```txt
src/
  app/
    globals.css
    layout.tsx
    page.tsx
    robots.ts
    sitemap.ts
  components/
    PODDesignSuite.tsx
    PODDesignSuite.module.css
```

Add new files only when they reduce complexity. Prefer extracting reusable logic gradually instead of rewriting the entire app.

Recommended future structure:

```txt
src/
  app/
    layout.tsx
    page.tsx
    robots.ts
    sitemap.ts
  components/
    suite/
      PODDesignSuite.tsx
      SuiteHeader.tsx
      SuiteTabs.tsx
      BrowserMemoryWarning.tsx
      PreviewGrid.tsx
      PreviewCard.tsx
      ExportModal.tsx
    tools/
      text-template/
        TextTemplateTool.tsx
        TextTemplateControls.tsx
      graphic-remix/
        GraphicRemixTool.tsx
        GraphicInputPanel.tsx
        GraphicDesignControls.tsx
      pattern-fill/
        PatternFillTool.tsx
        PatternLibrary.tsx
        PatternControls.tsx
    shared/
      Button.tsx
      Panel.tsx
      Field.tsx
      SliderField.tsx
      ColorPicker.tsx
      FontPicker.tsx
      FileDropzone.tsx
  lib/
    export/
      canvasExport.ts
      svgExport.ts
      zipExport.ts
    fonts/
      fontRegistry.ts
      fontLoader.ts
    patterns/
      patternPresets.ts
    storage/
      workspaceState.ts
    design/
      slugify.ts
      svgTextPaths.ts
      colorPresets.ts
  types/
    design.ts
    fonts.ts
    patterns.ts
```

## State and storage rules

Default rule: keep the workspace in React state and browser memory only.

Allowed:

- React state for the active workspace.
- `URL.createObjectURL` for temporary file references.
- In-memory data URLs for immediate preview/export.
- Optional manual `Export Workspace JSON` / `Import Workspace JSON` if explicitly implemented.

Avoid unless explicitly requested:

- `localStorage` for persistent automatic saving.
- IndexedDB.
- Cloud persistence.
- Backend persistence.

If persistence is requested later, implement it as an explicit user action first:

- Export workspace JSON.
- Import workspace JSON.
- Clear workspace.

Do not create hidden persistence that contradicts the browser-memory warning.

## Font import rules

Custom font import must support:

- `.ttf`
- `.otf`
- `.woff`
- `.woff2`

Implementation requirements:

- Use the browser `FontFace` API.
- Load fonts only on the client.
- Add loaded fonts to `document.fonts`.
- Add imported fonts to all font dropdowns.
- Mark imported fonts as `Custom`.
- Wait for fonts before exporting.
- Show a clear error if a font fails to load.
- Do not upload fonts anywhere.
- Do not permanently store imported commercial fonts.

## Export rules

All exports must use transparent backgrounds.

Standard output:

- Width: 4500px
- Height: 5400px
- Format: PNG
- Background: transparent
- Filename: slugified and lowercase

Text Template and Graphic Remix:

- Canvas/SVG export is preferred for fidelity.
- If using DOM capture, verify font rendering and transparency carefully.

Pattern Fill:

- Use inline SVG with native `<pattern>`.
- Do not use html2canvas for pattern fill exports.
- Serialize SVG, load into `Image`, draw to `<canvas>`, then export with `canvas.toBlob('image/png')`.

ZIP:

- Use JSZip.
- ZIP generation must be client-side.

## SEO rules

Use the App Router Metadata API for:

- title
- description
- openGraph
- twitter card
- canonical URL if a production domain exists
- robots and sitemap

Keep the main landing content indexable. The interactive tools may be client-side, but the page must still expose meaningful server-rendered text about what the product does.

Do not move the entire page into a client-only blank shell if that would hurt SEO.

## Accessibility rules

- Every input must have a visible label.
- Buttons must use real `<button>` elements.
- File inputs must be keyboard-accessible.
- Tabs must expose selected state.
- Avoid clickable divs unless they also handle keyboard interaction and ARIA roles.
- Do not rely on color alone for active/error states.

## Performance rules

- Avoid rendering many full-size 4500x5400 elements directly in the visible DOM.
- Use scaled previews.
- Generate full-size export only when downloading.
- Batch ZIP export carefully to avoid freezing the UI for large batches.
- Consider progress state for large batches.
- Revoke object URLs when no longer needed.
- Keep heavy operations inside client-only utilities.

## TypeScript rules

- Avoid `any` unless unavoidable around browser APIs.
- Prefer explicit types for design state, font records, pattern records, and export payloads.
- Keep pure transformation functions in `src/lib`.
- Keep React components focused on UI and orchestration.
- Do not mix unrelated tool state in a single giant object if extracting modules.

## Testing and validation expectations

Before considering a task complete, manually verify:

- App starts with `npm run dev`.
- App builds with `npm run build`.
- All tabs render.
- Text Template generates previews.
- Graphic Remix accepts image upload and generates previews.
- Pattern Fill generates previews.
- Custom font import updates dropdowns.
- Individual PNG export downloads a transparent file.
- ZIP export downloads multiple PNGs.
- Preview background does not appear in exported PNG.
- Browser-memory warning remains visible.
- Mobile layout stacks correctly.

If tests are added later, prioritize:

- Pure utility tests for slugify, placeholder parsing, CSV parsing, SVG generation, pattern sizing.
- Component tests only after the component structure is split.
- E2E tests for the full generation/export flow.

## Work style for Codex

When editing this project:

1. Read `README.md`, `ARCHITECTURE.md`, and this file first.
2. Make small, focused changes.
3. Preserve the approved visual direction.
4. Do not rewrite the project from scratch unless explicitly asked.
5. Prefer extraction/refactor over behavior changes.
6. Explain any tradeoff that affects export fidelity, SEO, browser privacy, or storage behavior.
7. Keep code in English.
8. Keep generated UI consistent with the existing style.
