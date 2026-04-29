# ARCHITECTURE.md — PODForge Studio

## 1. Product overview

PODForge Studio is a browser-first Next.js application for bulk print-on-demand design generation.

It targets Etsy/POD sellers who want to quickly create many print-ready design variations from:

- text templates with placeholders;
- uploaded graphics plus slogan lists;
- pattern-filled text styles.

The key promise is privacy and speed: everything happens in the user's browser. No uploaded image, font, pattern, slogan, or generated PNG should leave the client.

## 2. Architectural principles

### 2.1 Server for SEO, client for design work

The app should use Next.js App Router for SEO-friendly pages, metadata, sitemap, robots, and future marketing content.

The interactive design tools must remain Client Components because they depend on browser-only APIs:

- File API;
- Drag and drop;
- Canvas;
- SVG serialization;
- FontFace API;
- object URLs;
- Blob downloads;
- JSZip;
- DOM refs.

### 2.2 No backend by default

This project is intentionally backend-free.

Do not add:

- API routes;
- database;
- authentication;
- cloud uploads;
- server-side image processing;
- server-side font processing.

These can be added only if explicitly requested later.

### 2.3 Temporary workspace

The current workspace is temporary. The UI must clearly warn users that closing or refreshing the browser may lose their work.

This is a product decision, not a bug.

The safe persistence path is manual export:

- PNG export;
- ZIP export;
- future Workspace JSON export/import.

## 3. High-level runtime architecture

```txt
Browser
  ├── Next.js-rendered app shell
  ├── Client-side PODDesignSuite
  │   ├── Text Template tool
  │   ├── Graphic Remix tool
  │   ├── Pattern Fill tool
  │   └── Presets & Export Info tab
  ├── Browser memory state
  ├── Uploaded images/fonts/patterns as temporary objects/data URLs
  ├── SVG/canvas renderers
  └── PNG/ZIP downloads
```

There is no server-side design generation pipeline.

## 4. Current implementation shape

Current MVP structure:

```txt
src/app/layout.tsx         # Server-side metadata and root shell
src/app/page.tsx           # Server page that renders the suite
src/app/robots.ts          # SEO robots route
src/app/sitemap.ts         # SEO sitemap route
src/app/globals.css        # Global reset/theme foundation
src/components/PODDesignSuite.tsx
src/components/PODDesignSuite.module.css
```

This is acceptable for the MVP, but the main suite component is large and should be split gradually.

## 5. Target modular architecture

Recommended next architecture:

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
      FooterNotice.tsx
      PreviewGrid.tsx
      PreviewCard.tsx
      PreviewModal.tsx

    tools/
      text-template/
        TextTemplateTool.tsx
        TextTemplateInputPanel.tsx
        TextTemplateControls.tsx
        textTemplateDefaults.ts

      graphic-remix/
        GraphicRemixTool.tsx
        GraphicInputPanel.tsx
        GraphicDesignControls.tsx
        graphicRemixDefaults.ts

      pattern-fill/
        PatternFillTool.tsx
        PatternLibrary.tsx
        PatternFillControls.tsx
        patternFillDefaults.ts

    shared/
      Button.tsx
      Panel.tsx
      Field.tsx
      TextArea.tsx
      SliderField.tsx
      SegmentedControl.tsx
      SelectField.tsx
      ColorPicker.tsx
      FontPicker.tsx
      FileDropzone.tsx
      WarningBanner.tsx

  lib/
    design/
      slugify.ts
      colorPresets.ts
      svgTextPaths.ts
      textLayout.ts
      placeholderParser.ts
      csvParser.ts

    export/
      pngExport.ts
      svgToPng.ts
      zipExport.ts
      canvasFactory.ts

    fonts/
      fontRegistry.ts
      fontLoader.ts
      fontTypes.ts

    patterns/
      patternPresets.ts
      patternGenerators.ts

    workspace/
      workspaceTypes.ts
      workspaceExport.ts
      workspaceImport.ts

  types/
    design.ts
    tools.ts
    fonts.ts
    patterns.ts
```

## 6. Component ownership

### Suite layer

Responsible for:

- active tab;
- global warning banner;
- global imported font registry;
- high-level layout;
- shared preview modal state if needed.

Not responsible for:

- parsing templates;
- drawing SVG paths;
- exporting PNGs;
- ZIP generation;
- file-to-data-url conversions.

### Tool layer

Each tool owns:

- its input state;
- its control state;
- its preview generation;
- its export naming logic;
- its default examples.

Each tool should delegate export logic to `src/lib/export`.

### Shared components

Shared components should be UI-only where possible.

Examples:

- `Button`
- `Panel`
- `SliderField`
- `FontPicker`
- `ColorPicker`
- `FileDropzone`

They should not know about Etsy, POD, slogans, or patterns.

## 7. Data model direction

Use explicit types.

Recommended core types:

```ts
export type PreviewBackground =
  | 'transparent'
  | 'white-shirt'
  | 'black-shirt'
  | 'brown'
  | 'cream'
  | 'forest';

export type TextEffect = 'straight' | 'arch-up' | 'arch-down' | 'circle' | 'wave';

export type FontSource = 'google' | 'system' | 'custom';

export type FontRecord = {
  id: string;
  family: string;
  label: string;
  source: FontSource;
  objectUrl?: string;
  fileType?: string;
};

export type GeneratedDesign = {
  id: string;
  label: string;
  fileName: string;
  svgMarkup?: string;
  previewDataUrl?: string;
};
```

Avoid loosely shaped state objects that make tools hard to extract.

## 8. Rendering strategy

### 8.1 Preview rendering

Previews can be CSS-scaled representations of SVG/canvas output.

Do not render dozens of 4500x5400 DOM nodes visibly.

### 8.2 Export rendering

Exports must be generated at full size:

```txt
4500 x 5400 px
transparent PNG
```

Use a dedicated export path instead of relying only on visible preview DOM.

### 8.3 Pattern Fill rendering

Pattern Fill should use SVG-native patterns:

```xml
<pattern id="texture" patternUnits="userSpaceOnUse">
  <image href="..." />
</pattern>
<text fill="url(#texture)" stroke="...">...</text>
```

Export should serialize SVG and draw it to canvas. This is more reliable for pattern fills than DOM screenshot approaches.

## 9. Font architecture

### 9.1 Built-in fonts

Google fonts can be loaded for the UI/tool dropdowns. For production hardening, prefer `next/font` or self-hosted fonts where possible.

### 9.2 Custom fonts

Custom fonts must be loaded client-side using `FontFace`.

Flow:

```txt
User uploads font file
  -> validate extension/MIME
  -> create object URL or ArrayBuffer
  -> new FontFace(customFamily, source)
  -> await font.load()
  -> document.fonts.add(font)
  -> add to font registry
  -> update dropdowns
```

Before export:

```ts
await document.fonts.ready;
```

If the design uses a newly imported custom font, verify that the font is available before rendering the final PNG.

## 10. Storage architecture

Current rule:

- Browser memory/session only.

Do not create auto-save persistence without changing the product messaging.

Future optional feature:

```txt
Export Workspace JSON
Import Workspace JSON
Clear Workspace
```

Workspace JSON can include:

- slogans;
- settings;
- selected built-in pattern id;
- generated SVG settings;
- optionally data URLs for uploaded assets if the user explicitly accepts large files.

Warn that exported workspace JSON may contain embedded image/pattern data.

## 11. SEO architecture

The app should preserve SEO value even though the tool is client-side.

Use:

- static `metadata` in `layout.tsx` or route-level metadata;
- `robots.ts`;
- `sitemap.ts`;
- indexable landing text explaining the product;
- semantic headings;
- meaningful descriptions for each tool.

Future suggested routes:

```txt
/
/tools/text-template-generator
/tools/graphic-remix-generator
/tools/pattern-fill-text-generator
/guides/etsy-pod-bulk-designs
/guides/how-to-create-pattern-fill-shirts
```

These can be static SEO landing pages that mount the relevant client tool below the fold.

## 12. Static deployment direction

The app can stay compatible with static deployment if no backend features are introduced.

If static export is desired later, configure:

```js
// next.config.mjs
const nextConfig = {
  output: 'export'
};

export default nextConfig;
```

Do not add API routes if static export is a goal.

## 13. Known MVP limitations

- The main suite component is currently too large and should be split.
- Export fidelity for fonts should be hardened.
- Batch export should show progress for large design sets.
- The preview/export pipeline should be centralized.
- Pattern presets should become dedicated SVG/data URL generators.
- Workspace JSON import/export is not yet implemented.
- Automated tests are not yet implemented.

## 14. Recommended next milestones

### Milestone 1 — Refactor without changing behavior

- Split `PODDesignSuite.tsx` into tool components.
- Extract shared UI components.
- Extract utility functions into `src/lib`.
- Preserve visual output and behavior.

### Milestone 2 — Export fidelity

- Centralize PNG export.
- Improve SVG-to-PNG flow.
- Ensure transparent backgrounds.
- Ensure font readiness.
- Add export progress state.

### Milestone 3 — Workspace portability

- Add Export Workspace JSON.
- Add Import Workspace JSON.
- Add Clear Workspace.
- Keep warnings explicit.

### Milestone 4 — SEO expansion

- Add static landing sections/pages for each generator.
- Add structured content and FAQs.
- Add Open Graph image.
- Add canonical URL once the domain is known.

### Milestone 5 — Testing

- Add unit tests for utilities.
- Add E2E smoke tests for generation and downloads.

## 15. Definition of done

A change is done only when:

- `npm run build` passes;
- TypeScript passes;
- main visual style is preserved;
- all tabs still render;
- no uploaded file leaves the browser;
- export remains transparent PNG;
- warning about temporary browser memory remains visible;
- the change is documented if it affects architecture, privacy, storage, or export behavior.
