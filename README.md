# PODForge Studio

A Next.js App Router project for a browser-based Etsy / print-on-demand design suite.

## What it includes

- SEO-ready Next.js app shell using the App Router.
- Client-side design tools:
  - Text Template Generator
  - Graphic Remix Generator
  - Pattern Fill Text Generator
  - Presets & Export Info tab
- Soft-brutalist UI based on the approved mockup:
  - warm off-white background
  - thick black borders
  - rust orange active states
  - mustard accents
- Browser-memory warning banners.
- Custom font import for `.ttf`, `.otf`, `.woff`, `.woff2`.
- PNG export at `4500x5400` transparent canvas.
- ZIP export using JSZip.
- No backend. User files never leave the browser.

## Important storage behavior

This project intentionally keeps the workspace temporary. Uploaded graphics, generated previews, imported fonts and current settings are treated as browser-session data. The UI warns users to export PNG/ZIP or workspace JSON before closing the tab/browser.

## Run locally

```bash
npm install
npm run dev
```

Open:

```bash
http://localhost:3000
```

## Production build

```bash
npm run build
npm run start
```

## Notes

The current implementation is a functional MVP. It already generates previews and exports PNG/ZIP files client-side. The next improvement would be hardening typography export fidelity for remote Google Fonts by embedding font binaries during export or self-hosting font files.
