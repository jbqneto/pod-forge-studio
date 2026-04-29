"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { parseCsvByHeaders, parseSimpleList } from "../lib/design/csvParser";
import { parseTemplatePlaceholders } from "../lib/design/placeholderParser";
import styles from "./PODDesignSuite.module.css";

type ToolTab = "templates" | "graphic" | "pattern" | "info";
type Align = "left" | "center" | "right";
type Transform = "none" | "uppercase" | "lowercase" | "title";
type TextEffect = "straight" | "archUp" | "archDown" | "circle" | "wave";
type PreviewBackground = "transparent" | "white" | "black" | "brown" | "cream" | "forest";
type FontSource = "google" | "custom";

type CustomFont = {
  name: string;
  dataUrl: string;
  format: string;
};

type GeneratedDesign = {
  id: string;
  label: string;
  filename: string;
  svg: string;
};
type MockupPreset = {
  id: string;
  name: string;
  basePngPath: string;
  printArea: { x: number; y: number; w: number; h: number };
};

type TextSettings = {
  fontFamily: string;
  fontSource: FontSource;
  color: string;
  align: Align;
  lineBreakMode: "single" | "word" | "two";
  letterSpacing: number;
  transform: Transform;
  maxWidth: number;
  fontSize: number;
};

type GraphicSettings = {
  fontFamily: string;
  fontSource: FontSource;
  textColor: string;
  fontSize: number;
  letterSpacing: number;
  transform: Transform;
  effect: TextEffect;
  curveIntensity: number;
  sloganPosition: "above" | "below";
  graphicSize: number;
  graphicVertical: number;
  graphicAlign: Align;
  subText: string;
  subFontFamily: string;
  subFontSource: FontSource;
  subTextColor: string;
  subFontSize: number;
  subLetterSpacing: number;
  subEffect: TextEffect;
};

type PatternSettings = {
  fontFamily: string;
  fontSource: FontSource;
  fontSize: number;
  letterSpacing: number;
  transform: Transform;
  effect: "straight" | "archUp" | "archDown";
  curveIntensity: number;
  outlineColor: string;
  outlineWidth: number;
  patternScale: number;
  patternOffsetX: number;
  patternOffsetY: number;
};

type PatternPreset = {
  id: string;
  name: string;
  dataUrl: string;
};

const WIDTH = 4500;
const HEIGHT = 5400;
const MOCKUP_PRESETS: MockupPreset[] = [
  { id: "none", name: "No mockup", basePngPath: "", printArea: { x: 0, y: 0, w: 0, h: 0 } },
  { id: "tee-front-classic", name: "Classic Tee Front", basePngPath: "/forge/mockups/tee-front-classic.png", printArea: { x: 1320, y: 1290, w: 1860, h: 2232 } },
  { id: "hoodie-front-classic", name: "Classic Hoodie Front", basePngPath: "/forge/mockups/hoodie-front-classic.png", printArea: { x: 1410, y: 1450, w: 1680, h: 2016 } },
];

const BASE_FONTS = [
  "Bebas Neue",
  "Anton",
  "Archivo Black",
  "Oswald",
  "Playfair Display",
  "Abril Fatface",
  "DM Serif Display",
  "Bungee",
  "Space Grotesk",
  "Permanent Marker",
  "Caveat",
  "Fraunces",
];

const HEAVY_FONTS = [
  "Anton",
  "Archivo Black",
  "Bebas Neue",
  "Bungee",
  "Oswald",
  "Abril Fatface",
  "DM Serif Display",
  "Permanent Marker",
  "Playfair Display",
  "Fraunces",
];

const COLOR_PRESETS = [
  { label: "Black", value: "#111111" },
  { label: "White", value: "#FFFFFF" },
  { label: "Cream", value: "#F5E6D3" },
  { label: "Rust", value: "#B84A1F" },
  { label: "Forest", value: "#2D4F3F" },
  { label: "Mustard", value: "#D4A017" },
];

const OUTLINE_PRESETS = [
  { label: "White", value: "#FFFFFF" },
  { label: "Cream", value: "#F5E6D3" },
  { label: "Black", value: "#111111" },
  { label: "Rust", value: "#B84A1F" },
];

const TEMPLATE_EXAMPLES = [
  "{hobby} is my cardio",
  "Powered by coffee and {noun}",
  "Team {name}",
  "I paused my {activity} to be here",
  "{name}'s reading list",
];

const SLOGAN_EXAMPLES = [
  "Raised on sweet tea and Jesus",
  "Born to be wild, forced to work",
  "Just a girl who loves horses",
  "Small town girl, big city dreams",
].join("\n");

const PATTERN_SLOGANS = [
  "DARLIN'",
  "MAMA",
  "HOWDY",
  "Y'ALL",
  "HOT MESS",
  "WILD CHILD",
  "COWGIRL",
  "COUNTRY ROOTS",
].join("\n");

const defaultTextSettings: TextSettings = {
  fontFamily: "Anton",
  fontSource: "google",
  color: "#111111",
  align: "center",
  lineBreakMode: "single",
  letterSpacing: 3,
  transform: "uppercase",
  maxWidth: 76,
  fontSize: 480,
};

const defaultGraphicSettings: GraphicSettings = {
  fontFamily: "Anton",
  fontSource: "google",
  textColor: "#111111",
  fontSize: 330,
  letterSpacing: 8,
  transform: "uppercase",
  effect: "archUp",
  curveIntensity: 60,
  sloganPosition: "above",
  graphicSize: 42,
  graphicVertical: 0,
  graphicAlign: "center",
  subText: "NASHVILLE, TN",
  subFontFamily: "Bebas Neue",
  subFontSource: "google",
  subTextColor: "#111111",
  subFontSize: 210,
  subLetterSpacing: 10,
  subEffect: "straight",
};

const defaultPatternSettings: PatternSettings = {
  fontFamily: "Anton",
  fontSource: "google",
  fontSize: 760,
  letterSpacing: -5,
  transform: "uppercase",
  effect: "straight",
  curveIntensity: 35,
  outlineColor: "#FFFFFF",
  outlineWidth: 34,
  patternScale: 100,
  patternOffsetX: 0,
  patternOffsetY: 0,
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "design";
}

function parseLines(value: string) {
  return value
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

function applyTransform(value: string, transform: Transform) {
  if (transform === "uppercase") return value.toUpperCase();
  if (transform === "lowercase") return value.toLowerCase();
  if (transform === "title") {
    return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }
  return value;
}

function splitText(value: string, mode: TextSettings["lineBreakMode"]) {
  if (mode === "word") return value.split(/\s+/g).filter(Boolean);
  if (mode === "two") {
    const words = value.split(/\s+/g).filter(Boolean);
    const half = Math.ceil(words.length / 2);
    return [words.slice(0, half).join(" "), words.slice(half).join(" ")].filter(Boolean);
  }
  return [value];
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function formatFromMime(mime: string) {
  if (mime.includes("woff2")) return "woff2";
  if (mime.includes("woff")) return "woff";
  if (mime.includes("opentype")) return "opentype";
  return "truetype";
}

function fontFaceStyles(customFonts: CustomFont[]) {
  return customFonts
    .map(
      (font) => `@font-face{font-family:'${font.name}';src:url('${font.dataUrl}') format('${font.format}');font-weight:400 900;font-style:normal;}`,
    )
    .join("\n");
}

function lineTextSvg(lines: string[], settings: TextSettings, customFonts: CustomFont[]) {
  const x = settings.align === "left" ? WIDTH * 0.12 : settings.align === "right" ? WIDTH * 0.88 : WIDTH / 2;
  const anchor = settings.align === "left" ? "start" : settings.align === "right" ? "end" : "middle";
  const lineHeight = settings.fontSize * 1.05;
  const totalHeight = lineHeight * lines.length;
  const startY = HEIGHT / 2 - totalHeight / 2 + settings.fontSize * 0.85;
  const customStyle = fontFaceStyles(customFonts);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs><style>${customStyle}</style></defs>
    <rect width="100%" height="100%" fill="transparent"/>
    <g font-family="${escapeXml(settings.fontFamily)}" font-size="${settings.fontSize}" font-weight="900" fill="${settings.color}" letter-spacing="${settings.letterSpacing}" text-anchor="${anchor}">
      ${lines
        .map(
          (line, index) => `<text x="${x}" y="${startY + index * lineHeight}" dominant-baseline="middle">${escapeXml(line)}</text>`,
        )
        .join("\n")}
    </g>
  </svg>`;
}

function pathForEffect(effect: TextEffect | PatternSettings["effect"], intensity: number, y: number, id: string) {
  const depth = 120 + intensity * 5;
  if (effect === "archUp") {
    return `<path id="${id}" d="M 650 ${y} Q ${WIDTH / 2} ${y - depth} ${WIDTH - 650} ${y}" fill="none"/>`;
  }
  if (effect === "archDown") {
    return `<path id="${id}" d="M 650 ${y} Q ${WIDTH / 2} ${y + depth} ${WIDTH - 650} ${y}" fill="none"/>`;
  }
  if (effect === "wave") {
    return `<path id="${id}" d="M 550 ${y} C 1250 ${y - depth} 1600 ${y + depth} 2250 ${y} S 3300 ${y - depth} 3950 ${y}" fill="none"/>`;
  }
  return "";
}

function textWithEffect(params: {
  textValue: string;
  effect: TextEffect;
  intensity: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  letterSpacing: number;
  pathId: string;
  customFonts: CustomFont[];
}) {
  const value = escapeXml(params.textValue);
  if (params.effect === "straight") {
    return `<text x="${WIDTH / 2}" y="${params.y}" text-anchor="middle" dominant-baseline="middle" font-family="${escapeXml(params.fontFamily)}" font-size="${params.fontSize}" font-weight="900" fill="${params.color}" letter-spacing="${params.letterSpacing}">${value}</text>`;
  }
  if (params.effect === "circle") {
    return `<defs><path id="${params.pathId}" d="M ${WIDTH / 2} ${params.y - 940} a 940 940 0 1 1 -1 0" fill="none"/></defs>
      <text font-family="${escapeXml(params.fontFamily)}" font-size="${params.fontSize}" font-weight="900" fill="${params.color}" letter-spacing="${params.letterSpacing}">
        <textPath href="#${params.pathId}" startOffset="25%" text-anchor="middle">${value}</textPath>
      </text>`;
  }
  const path = pathForEffect(params.effect, params.intensity, params.y, params.pathId);
  return `<defs>${path}</defs>
    <text font-family="${escapeXml(params.fontFamily)}" font-size="${params.fontSize}" font-weight="900" fill="${params.color}" letter-spacing="${params.letterSpacing}">
      <textPath href="#${params.pathId}" startOffset="50%" text-anchor="middle">${value}</textPath>
    </text>`;
}

function placeholderGraphic() {
  const boot = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900">
    <rect width="900" height="900" fill="transparent"/>
    <g transform="translate(250 80)" fill="#d1b07c" stroke="#111" stroke-width="24" stroke-linejoin="round">
      <path d="M155 20 C265 20 310 82 287 212 L248 464 C240 522 278 558 348 568 L548 596 C616 606 650 642 632 700 C618 746 575 768 503 766 L132 758 C74 756 37 722 45 670 L75 538 C98 445 116 305 105 122 C101 58 115 24 155 20 Z"/>
      <path d="M95 546 C155 628 248 662 373 666 L616 670" fill="none"/>
      <path d="M116 102 C164 150 220 176 282 180" fill="none"/>
      <path d="M116 210 C164 250 213 270 262 270" fill="none"/>
      <path d="M105 323 C151 356 195 374 238 378" fill="none"/>
      <path d="M98 444 C142 474 184 488 224 492" fill="none"/>
    </g>
  </svg>`;
  return svgDataUrl(boot);
}

function buildGraphicSvg(params: {
  slogan: string;
  graphicDataUrl: string;
  settings: GraphicSettings;
  customFonts: CustomFont[];
}) {
  const slogan = applyTransform(params.slogan, params.settings.transform);
  const imageWidth = WIDTH * (params.settings.graphicSize / 100);
  const imageHeight = imageWidth;
  const x = params.settings.graphicAlign === "left" ? WIDTH * 0.1 : params.settings.graphicAlign === "right" ? WIDTH - imageWidth - WIDTH * 0.1 : (WIDTH - imageWidth) / 2;
  const y = HEIGHT / 2 - imageHeight / 2 + params.settings.graphicVertical * 16;
  const mainY = params.settings.sloganPosition === "above" ? 1170 : 4140;
  const subY = params.settings.sloganPosition === "above" ? 4180 : 1070;
  const customStyle = fontFaceStyles(params.customFonts);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs><style>${customStyle}</style></defs>
    <rect width="100%" height="100%" fill="transparent"/>
    ${textWithEffect({
      textValue: slogan,
      effect: params.settings.effect,
      intensity: params.settings.curveIntensity,
      y: mainY,
      fontFamily: params.settings.fontFamily,
      fontSize: params.settings.fontSize,
      color: params.settings.textColor,
      letterSpacing: params.settings.letterSpacing,
      pathId: "main-path",
      customFonts: params.customFonts,
    })}
    <image href="${params.graphicDataUrl}" x="${x}" y="${y}" width="${imageWidth}" height="${imageHeight}" preserveAspectRatio="xMidYMid meet"/>
    ${
      params.settings.subText.trim()
        ? textWithEffect({
            textValue: params.settings.subText.trim(),
            effect: params.settings.subEffect,
            intensity: 45,
            y: subY,
            fontFamily: params.settings.subFontFamily,
            fontSize: params.settings.subFontSize,
            color: params.settings.subTextColor,
            letterSpacing: params.settings.subLetterSpacing,
            pathId: "sub-path",
            customFonts: params.customFonts,
          })
        : ""
    }
  </svg>`;
}

function makePatternSvg(name: string, body: string) {
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160">${body}<text x="10" y="150" font-family="Arial" font-size="18" font-weight="900" fill="rgba(255,255,255,.88)" stroke="#111" stroke-width="2">${escapeXml(name)}</text></svg>`);
}

function getPatternPresets(): PatternPreset[] {
  return [
    {
      id: "realtree-camo",
      name: "Realtree Camo",
      dataUrl: makePatternSvg("CAMO", `<rect width="220" height="160" fill="#72522f"/><ellipse cx="45" cy="50" rx="55" ry="22" fill="#2f4325"/><ellipse cx="135" cy="35" rx="60" ry="20" fill="#8a6b35"/><path d="M20 125 C55 80 92 112 130 70 S190 90 218 40" fill="none" stroke="#1f311d" stroke-width="22"/><path d="M5 20 C38 78 82 10 120 72 S175 120 220 80" fill="none" stroke="#b2874c" stroke-width="16"/>`),
    },
    {
      id: "mossy-oak-camo",
      name: "Mossy Oak",
      dataUrl: makePatternSvg("MOSS", `<rect width="220" height="160" fill="#1f311d"/><ellipse cx="35" cy="32" rx="58" ry="28" fill="#455f34"/><ellipse cx="132" cy="72" rx="74" ry="34" fill="#24391f"/><ellipse cx="185" cy="28" rx="60" ry="22" fill="#6d7445"/><path d="M0 118 C55 78 104 140 160 86 S200 62 220 76" fill="none" stroke="#0f1d13" stroke-width="24"/>`),
    },
    {
      id: "leopard-print",
      name: "Leopard",
      dataUrl: makePatternSvg("LEOPARD", `<rect width="220" height="160" fill="#c99658"/>${Array.from({ length: 18 }).map((_, i) => `<ellipse cx="${(i * 47) % 220}" cy="${25 + ((i * 31) % 115)}" rx="${16 + (i % 3) * 5}" ry="${10 + (i % 2) * 5}" fill="#111"/><ellipse cx="${(i * 47) % 220}" cy="${25 + ((i * 31) % 115)}" rx="${8 + (i % 3) * 3}" ry="${5 + (i % 2) * 3}" fill="#d7ad6b"/>`).join("")}`),
    },
    {
      id: "cow-print",
      name: "Cow Print",
      dataUrl: makePatternSvg("COW", `<rect width="220" height="160" fill="#fff"/><path d="M20 10 C68 0 73 35 50 56 C18 84 -20 44 20 10Z" fill="#111"/><path d="M130 20 C190 5 218 38 190 70 C150 110 88 76 130 20Z" fill="#111"/><path d="M48 112 C90 84 126 128 91 158 C58 186 8 142 48 112Z" fill="#111"/>`),
    },
    {
      id: "american-flag",
      name: "American Flag",
      dataUrl: makePatternSvg("USA", `${Array.from({ length: 8 }).map((_, i) => `<rect y="${i * 20}" width="220" height="20" fill="${i % 2 ? "#fff" : "#b22234"}"/>`).join("")}<rect width="94" height="86" fill="#3c3b6e"/>${Array.from({ length: 18 }).map((_, i) => `<circle cx="${12 + (i % 6) * 14}" cy="${13 + Math.floor(i / 6) * 22}" r="3" fill="#fff"/>`).join("")}`),
    },
    {
      id: "buffalo-plaid",
      name: "Buffalo Plaid",
      dataUrl: makePatternSvg("PLAID", `<rect width="220" height="160" fill="#b31d1d"/>${Array.from({ length: 6 }).map((_, i) => `<rect x="${i * 44}" width="22" height="160" fill="rgba(0,0,0,.55)"/><rect y="${i * 32}" width="220" height="16" fill="rgba(0,0,0,.55)"/>`).join("")}`),
    },
    {
      id: "western-floral",
      name: "Western Floral",
      dataUrl: makePatternSvg("FLORAL", `<rect width="220" height="160" fill="#f4e2c9"/>${Array.from({ length: 10 }).map((_, i) => `<circle cx="${20 + (i * 43) % 200}" cy="${25 + (i * 29) % 110}" r="13" fill="#b66a6f"/><circle cx="${20 + (i * 43) % 200}" cy="${25 + (i * 29) % 110}" r="5" fill="#7c3e42"/><path d="M${25 + (i * 43) % 200} ${30 + (i * 29) % 110} q20 5 28 -14" stroke="#678456" stroke-width="7" fill="none"/>`).join("")}`),
    },
    {
      id: "wood-grain",
      name: "Wood Grain",
      dataUrl: makePatternSvg("WOOD", `<rect width="220" height="160" fill="#9b6332"/>${Array.from({ length: 9 }).map((_, i) => `<path d="M0 ${i * 18 + 8} C60 ${i * 18 - 22} 120 ${i * 18 + 48} 220 ${i * 18 + 4}" fill="none" stroke="#5d351b" stroke-width="6"/>`).join("")}<ellipse cx="105" cy="80" rx="30" ry="16" fill="none" stroke="#5d351b" stroke-width="5"/>`),
    },
    {
      id: "sunflower-field",
      name: "Sunflower",
      dataUrl: makePatternSvg("SUN", `<rect width="220" height="160" fill="#f4dd86"/>${Array.from({ length: 8 }).map((_, i) => `<g transform="translate(${25 + (i * 52) % 200} ${32 + (i * 41) % 110})"><circle r="8" fill="#51311d"/>${Array.from({ length: 10 }).map((__, j) => `<ellipse cx="${Math.cos((j/10)*6.28)*18}" cy="${Math.sin((j/10)*6.28)*18}" rx="6" ry="12" fill="#d8a017" transform="rotate(${j*36})"/>`).join("")}</g>`).join("")}`),
    },
    {
      id: "serape-stripes",
      name: "Serape Stripes",
      dataUrl: makePatternSvg("SERAPE", `<rect width="220" height="160" fill="#c73e2d"/><rect x="20" width="18" height="160" fill="#f6c445"/><rect x="48" width="12" height="160" fill="#2d7f74"/><rect x="78" width="28" height="160" fill="#101828"/><rect x="126" width="16" height="160" fill="#fff0c6"/><rect x="158" width="26" height="160" fill="#cf6b2e"/><rect x="196" width="10" height="160" fill="#2d4f3f"/>`),
    },
  ];
}

function buildPatternSvg(params: {
  slogan: string;
  pattern: PatternPreset;
  settings: PatternSettings;
  customFonts: CustomFont[];
}) {
  const textValue = applyTransform(params.slogan, params.settings.transform);
  const tile = Math.max(120, 900 - params.settings.patternScale * 2.3);
  const customStyle = fontFaceStyles(params.customFonts);
  const baseTextAttrs = `font-family="${escapeXml(params.settings.fontFamily)}" font-size="${params.settings.fontSize}" font-weight="900" letter-spacing="${params.settings.letterSpacing}" fill="url(#texture)" stroke="${params.settings.outlineColor}" stroke-width="${params.settings.outlineWidth}" stroke-linejoin="round" paint-order="stroke fill"`;
  const safeText = escapeXml(textValue);
  const defs = `<defs><style>${customStyle}</style><pattern id="texture" patternUnits="userSpaceOnUse" width="${tile}" height="${tile}" patternTransform="translate(${params.settings.patternOffsetX} ${params.settings.patternOffsetY})"><image href="${params.pattern.dataUrl}" width="${tile}" height="${tile}" preserveAspectRatio="xMidYMid slice"/></pattern>${pathForEffect(params.settings.effect, params.settings.curveIntensity, 2600, "patternPath")}</defs>`;
  const textNode = params.settings.effect === "straight"
    ? `<text x="${WIDTH / 2}" y="${HEIGHT / 2}" text-anchor="middle" dominant-baseline="middle" ${baseTextAttrs}>${safeText}</text>`
    : `<text ${baseTextAttrs}><textPath href="#patternPath" startOffset="50%" text-anchor="middle">${safeText}</textPath></text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    ${defs}
    <rect width="100%" height="100%" fill="transparent"/>
    ${textNode}
  </svg>`;
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function svgToPngBlob(svg: string): Promise<Blob> {
  await document.fonts.ready;
  const image = new Image();
  image.decoding = "async";
  const dataUrl = svgDataUrl(svg);
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Failed to load SVG for export."));
    image.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported by this browser.");
  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.drawImage(image, 0, 0, WIDTH, HEIGHT);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export PNG."));
    }, "image/png");
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

async function composeMockupPngBlob(svg: string, mockup: MockupPreset) {
  if (mockup.id === "none") throw new Error("Select a mockup preset before exporting showcase mockup.");
  const [designBlob, mockupImage] = await Promise.all([svgToPngBlob(svg), loadImage(mockup.basePngPath)]);
  const designUrl = URL.createObjectURL(designBlob);
  try {
    const designImage = await loadImage(designUrl);
    const canvas = document.createElement("canvas");
    canvas.width = mockupImage.naturalWidth || WIDTH;
    canvas.height = mockupImage.naturalHeight || HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not compose mockup export.");
    context.drawImage(mockupImage, 0, 0, canvas.width, canvas.height);
    context.drawImage(designImage, mockup.printArea.x, mockup.printArea.y, mockup.printArea.w, mockup.printArea.h);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not export mockup PNG."));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(designUrl);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getBackgroundClass(preview: PreviewBackground) {
  if (preview === "transparent") return styles.checker;
  return "";
}

function getBackgroundStyle(preview: PreviewBackground) {
  const map: Record<PreviewBackground, string> = {
    transparent: "transparent",
    white: "#ffffff",
    black: "#111111",
    brown: "#5C3B28",
    cream: "#F5E6D3",
    forest: "#2D4F3F",
  };
  return preview === "transparent" ? {} : { background: map[preview] };
}

export default function PODDesignSuite() {
  const [tab, setTab] = useState<ToolTab>("graphic");
  const [template, setTemplate] = useState(TEMPLATE_EXAMPLES[0]);
  const [templateValues, setTemplateValues] = useState("shopping\nreading\ngardening\ngaming");
  const [textSettings, setTextSettings] = useState<TextSettings>(defaultTextSettings);
  const [graphicDataUrl, setGraphicDataUrl] = useState(placeholderGraphic());
  const [graphicSlogans, setGraphicSlogans] = useState(SLOGAN_EXAMPLES);
  const [graphicSettings, setGraphicSettings] = useState<GraphicSettings>(defaultGraphicSettings);
  const [patternSlogans, setPatternSlogans] = useState(PATTERN_SLOGANS);
  const [patternSettings, setPatternSettings] = useState<PatternSettings>(defaultPatternSettings);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [customPatterns, setCustomPatterns] = useState<PatternPreset[]>([]);
  const [previewBackground, setPreviewBackground] = useState<PreviewBackground>("white");
  const [patternPreviewBackground, setPatternPreviewBackground] = useState<PreviewBackground>("brown");
  const [templateDesigns, setTemplateDesigns] = useState<GeneratedDesign[]>([]);
  const [graphicDesigns, setGraphicDesigns] = useState<GeneratedDesign[]>([]);
  const [patternDesigns, setPatternDesigns] = useState<GeneratedDesign[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<GeneratedDesign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeMockupPresetId, setActiveMockupPresetId] = useState(MOCKUP_PRESETS[0].id);
  const fontInputRef = useRef<HTMLInputElement | null>(null);

  const basePatterns = useMemo(() => getPatternPresets(), []);
  const patterns = useMemo(() => [...basePatterns, ...customPatterns], [basePatterns, customPatterns]);
  const [activePatternId, setActivePatternId] = useState("realtree-camo");
  const activePattern = patterns.find((item) => item.id === activePatternId) || patterns[0];

  const allFonts = useMemo(
    () => [
      ...BASE_FONTS.map((name) => ({ name, source: "google" as FontSource })),
      ...customFonts.map((font) => ({ name: font.name, source: "custom" as FontSource })),
    ],
    [customFonts],
  );

  function renderFontOptions(heavyOnly = false) {
    const base = heavyOnly ? HEAVY_FONTS : BASE_FONTS;
    return [
      ...base.map((name) => (
        <option key={name} value={name} style={{ fontFamily: name }}>
          {name}
        </option>
      )),
      ...customFonts.map((font) => (
        <option key={font.name} value={font.name} style={{ fontFamily: font.name }}>
          {font.name} — Custom
        </option>
      )),
    ];
  }

  function getFontSource(fontFamily: string): FontSource {
    return customFonts.some((font) => font.name === fontFamily) ? "custom" : "google";
  }

  async function handleFontImport(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setError(null);
    const loaded: CustomFont[] = [];
    for (const file of files) {
      try {
        const dataUrl = await fileToDataUrl(file);
        const rawName = file.name.replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/, "");
        const safeName = `Custom ${rawName.replace(/[^a-zA-Z0-9_-]+/g, " ").trim()}`;
        const format = formatFromMime(file.type || file.name);
        const fontFace = new FontFace(safeName, `url(${dataUrl})`);
        await fontFace.load();
        document.fonts.add(fontFace);
        loaded.push({ name: safeName, dataUrl, format });
      } catch (fontError) {
        setError(`Could not import font ${file.name}. ${(fontError as Error).message}`);
      }
    }
    setCustomFonts((current) => [...current, ...loaded]);
    event.target.value = "";
  }

  function generateTemplateDesigns() {
    setError(null);
    const placeholderResult = parseTemplatePlaceholders(template);
    if ("error" in placeholderResult) return setError(placeholderResult.error);

    const normalizedTemplate = template.trim();
    const parsedEntries = placeholderResult.mode === "single-placeholder-list"
      ? parseSimpleList(templateValues, placeholderResult.placeholders[0])
      : parseCsvByHeaders(templateValues, placeholderResult.placeholders);

    if ("error" in parsedEntries) return setError(parsedEntries.error);

    const designs: GeneratedDesign[] = [];
    for (const [index, entry] of parsedEntries.entries()) {
      let finalText = normalizedTemplate;
      for (const placeholder of placeholderResult.placeholders) {
        finalText = finalText.replaceAll(`{${placeholder}}`, entry.replacements[placeholder]);
      }

      const normalizedText = finalText.replace(/\s+/g, " ").trim();
      if (!normalizedText) return setError(`Generated text is empty at row ${index + 1}.`);

      const transformed = applyTransform(normalizedText, textSettings.transform);
      const lines = splitText(transformed, textSettings.lineBreakMode);
      const svg = lineTextSvg(lines, textSettings, customFonts);
      designs.push({
        id: `template-${index}`,
        label: normalizedText,
        filename: `${slugify(normalizedTemplate)}-${slugify(entry.rawValue)}.png`,
        svg,
      });
    }

    setTemplateDesigns(designs);
  }

  function generateGraphicDesigns() {
    setError(null);
    const slogans = parseLines(graphicSlogans);
    if (!slogans.length) return setError("Add at least one slogan.");
    const designs = slogans.map((slogan, index) => ({
      id: `graphic-${index}`,
      label: slogan,
      filename: `${slugify(slogan)}.png`,
      svg: buildGraphicSvg({ slogan, graphicDataUrl, settings: graphicSettings, customFonts }),
    }));
    setGraphicDesigns(designs);
  }

  function generatePatternDesigns() {
    setError(null);
    const slogans = parseLines(patternSlogans);
    if (!slogans.length) return setError("Add at least one pattern-fill slogan.");
    const designs = slogans.map((slogan, index) => ({
      id: `pattern-${index}`,
      label: slogan,
      filename: `${activePattern.id}-${slugify(slogan)}.png`,
      svg: buildPatternSvg({ slogan, pattern: activePattern, settings: patternSettings, customFonts }),
    }));
    setPatternDesigns(designs);
  }

  async function downloadDesign(design: GeneratedDesign) {
    try {
      const blob = await svgToPngBlob(design.svg);
      downloadBlob(blob, design.filename);
    } catch (downloadError) {
      setError((downloadError as Error).message);
    }
  }

  async function downloadZip(designs: GeneratedDesign[], filename: string) {
    if (!designs.length) return;
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const design of designs) {
        const blob = await svgToPngBlob(design.svg);
        zip.file(design.filename, blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, filename);
    } catch (zipError) {
      setError((zipError as Error).message);
    }
  }

  async function handleGraphicUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setGraphicDataUrl(await fileToDataUrl(file));
  }

  async function handlePatternUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image pattern file.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    const id = `custom-${slugify(file.name)}`;
    setCustomPatterns((current) => [
      ...current,
      {
        id,
        name: file.name.replace(/\.[^.]+$/, ""),
        dataUrl,
      },
    ]);
    setActivePatternId(id);
  }

  function exportWorkspace() {
    const workspace = {
      template,
      templateValues,
      textSettings,
      graphicSlogans,
      graphicSettings,
      graphicDataUrl,
      patternSlogans,
      patternSettings,
      customPatterns,
      activePatternId,
      exportedAt: new Date().toISOString(),
      note: "This workspace JSON excludes imported custom font binary data on purpose, but it includes custom pattern data URLs for the current session.",
    };
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json" });
    downloadBlob(blob, "podforge-workspace.json");
  }

  const currentDesigns = tab === "templates" ? templateDesigns : tab === "graphic" ? graphicDesigns : patternDesigns;
  const currentPreviewBackground = tab === "pattern" ? patternPreviewBackground : previewBackground;
  const activeMockupPreset = MOCKUP_PRESETS.find((preset) => preset.id === activeMockupPresetId) || MOCKUP_PRESETS[0];

  async function downloadMockupDesign(design: GeneratedDesign) {
    try {
      const blob = await composeMockupPngBlob(design.svg, activeMockupPreset);
      downloadBlob(blob, design.filename.replace(/\.png$/i, "-mockup.png"));
    } catch (downloadError) {
      setError((downloadError as Error).message);
    }
  }

  return (
    <section className={styles.appShell}>
      <input
        ref={fontInputRef}
        type="file"
        multiple
        accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
        onChange={handleFontImport}
        className="sr-only"
      />

      <header className={styles.topHeader}>
        <div className={styles.brand}>
          <h1>Etsy POD Design Suite</h1>
          <p>Bulk print-ready design generators for POD sellers</p>
        </div>
        <div className={styles.memoryWarning}>
          <strong>⚠</strong>
          <div>
            <strong>Browser memory only — work is temporary</strong>
            <span>Close this tab/browser and unsaved work may be lost. Export PNG/ZIP or workspace first.</span>
          </div>
        </div>
        <div className={styles.exportInfo}>ⓘ Exports are transparent PNGs at 4500×5400 px.</div>
      </header>

      <nav className={styles.tabs} aria-label="Design generators">
        <button className={`${styles.tabButton} ${tab === "templates" ? styles.activeTab : ""}`} onClick={() => setTab("templates")}>Tt Text Templates</button>
        <button className={`${styles.tabButton} ${tab === "graphic" ? styles.activeTab : ""}`} onClick={() => setTab("graphic")}>▧ Graphic Remix</button>
        <button className={`${styles.tabButton} ${tab === "pattern" ? styles.activeTab : ""}`} onClick={() => setTab("pattern")}>▦ Pattern Fill</button>
        <button className={`${styles.tabButton} ${tab === "info" ? styles.activeTab : ""}`} onClick={() => setTab("info")}>▤ Presets & Export Info</button>
      </nav>

      {error && <p className={styles.warningInline}>{error}</p>}

      {tab !== "info" ? (
        <div className={styles.workspace}>
          {tab === "templates" && (
            <>
              <TemplateInputPanel
                template={template}
                setTemplate={setTemplate}
                templateValues={templateValues}
                setTemplateValues={setTemplateValues}
                generate={generateTemplateDesigns}
              />
              <TemplateControls
                settings={textSettings}
                setSettings={setTextSettings}
                renderFontOptions={renderFontOptions}
                getFontSource={getFontSource}
                previewBackground={previewBackground}
                setPreviewBackground={setPreviewBackground}
                openFontImport={() => fontInputRef.current?.click()}
              />
            </>
          )}

          {tab === "graphic" && (
            <>
              <GraphicInputPanel
                graphicDataUrl={graphicDataUrl}
                handleGraphicUpload={handleGraphicUpload}
                slogans={graphicSlogans}
                setSlogans={setGraphicSlogans}
                settings={graphicSettings}
                setSettings={setGraphicSettings}
                generate={generateGraphicDesigns}
                openFontImport={() => fontInputRef.current?.click()}
              />
              <GraphicControls
                settings={graphicSettings}
                setSettings={setGraphicSettings}
                renderFontOptions={renderFontOptions}
                getFontSource={getFontSource}
                previewBackground={previewBackground}
                setPreviewBackground={setPreviewBackground}
                openFontImport={() => fontInputRef.current?.click()}
              />
            </>
          )}

          {tab === "pattern" && (
            <>
              <PatternInputPanel
                patterns={patterns}
                activePatternId={activePatternId}
                setActivePatternId={setActivePatternId}
                slogans={patternSlogans}
                setSlogans={setPatternSlogans}
                settings={patternSettings}
                setSettings={setPatternSettings}
                generate={generatePatternDesigns}
                handlePatternUpload={handlePatternUpload}
              />
              <PatternControls
                settings={patternSettings}
                setSettings={setPatternSettings}
                renderFontOptions={renderFontOptions}
                getFontSource={getFontSource}
                previewBackground={patternPreviewBackground}
                setPreviewBackground={setPatternPreviewBackground}
                openFontImport={() => fontInputRef.current?.click()}
              />
            </>
          )}

          <PreviewPanel
            designs={currentDesigns}
            background={currentPreviewBackground}
            onDownload={downloadDesign}
            onDownloadMockup={downloadMockupDesign}
            onDownloadZip={() => downloadZip(currentDesigns, `${tab}-designs.zip`)}
            onPreview={setSelectedPreview}
            mockupPresets={MOCKUP_PRESETS}
            activeMockupPresetId={activeMockupPresetId}
            setActiveMockupPresetId={setActiveMockupPresetId}
          />
        </div>
      ) : (
        <InfoPanel
          customFonts={customFonts}
          removeFont={(fontName) => setCustomFonts((fonts) => fonts.filter((font) => font.name !== fontName))}
          importFonts={() => fontInputRef.current?.click()}
          exportWorkspace={exportWorkspace}
        />
      )}

      <footer className={styles.footerBar}>
        <span>▣ 100% client-side: files never leave your browser.</span>
        <span>⚠ Current workspace is temporary browser memory.</span>
        <span>Aa Import custom fonts for this session.</span>
        <button className={styles.secondaryButton} onClick={exportWorkspace}>Export Workspace</button>
      </footer>

      {selectedPreview && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} onClick={() => setSelectedPreview(null)}>Close</button>
            </div>
            <div className={`${styles.designSurface} ${getBackgroundClass(currentPreviewBackground)}`} style={getBackgroundStyle(currentPreviewBackground)} dangerouslySetInnerHTML={{ __html: selectedPreview.svg }} />
          </div>
        </div>
      )}
    </section>
  );
}

function TemplateInputPanel(props: {
  template: string;
  setTemplate: (value: string) => void;
  templateValues: string;
  setTemplateValues: (value: string) => void;
  generate: () => void;
}) {
  return (
    <aside className={styles.panel}>
      <h2 className={styles.panelTitle}>Template Builder</h2>
      <div className={styles.chipList}>
        {TEMPLATE_EXAMPLES.map((item) => (
          <button key={item} className={styles.chip} onClick={() => props.setTemplate(item)}>{item}</button>
        ))}
      </div>
      <label className={styles.label}>Template with placeholders</label>
      <input className={styles.input} value={props.template} onChange={(event) => props.setTemplate(event.target.value)} />
      <p className={styles.helpText}>Use syntax like {"{hobby}"}, {"{name}"} or multiple placeholders with CSV values.</p>
      <label className={styles.label}>Bulk values</label>
      <textarea className={styles.textarea} value={props.templateValues} onChange={(event) => props.setTemplateValues(event.target.value)} />
      <div className={styles.row}>
        <button className={styles.secondaryButton}>♡ Save Template</button>
        <button className={styles.primaryButton} onClick={props.generate}>✦ Generate</button>
      </div>
    </aside>
  );
}

function TemplateControls(props: {
  settings: TextSettings;
  setSettings: (settings: TextSettings) => void;
  renderFontOptions: () => React.ReactNode;
  getFontSource: (font: string) => FontSource;
  previewBackground: PreviewBackground;
  setPreviewBackground: (background: PreviewBackground) => void;
  openFontImport: () => void;
}) {
  const update = (patch: Partial<TextSettings>) => props.setSettings({ ...props.settings, ...patch });
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Design Controls</h2>
      <div className={styles.controlGroup}>
        <h3>1. Text Controls</h3>
        <label className={styles.label}>Font</label>
        <select className={styles.select} value={props.settings.fontFamily} onChange={(event) => update({ fontFamily: event.target.value, fontSource: props.getFontSource(event.target.value) })}>
          {props.renderFontOptions()}
        </select>
        <div className={styles.row} style={{ marginTop: 10 }}>
          <button className={styles.smallButton} onClick={props.openFontImport}>Aa Import Fonts</button>
          <span className={styles.helpText}>Custom fonts are session-only.</span>
        </div>
        <ColorPicker value={props.settings.color} onChange={(color) => update({ color })} presets={COLOR_PRESETS} />
        <Range label="Font Size" value={props.settings.fontSize} min={120} max={900} step={10} onChange={(fontSize) => update({ fontSize })} suffix="px" />
        <Range label="Letter Spacing" value={props.settings.letterSpacing} min={-2} max={10} step={1} onChange={(letterSpacing) => update({ letterSpacing })} suffix="px" />
        <Range label="Max Text Width" value={props.settings.maxWidth} min={40} max={95} step={1} onChange={(maxWidth) => update({ maxWidth })} suffix="%" />
        <label className={styles.label}>Alignment</label>
        <Segmented options={["left", "center", "right"]} value={props.settings.align} onChange={(align) => update({ align: align as Align })} />
        <label className={styles.label}>Line Break Mode</label>
        <Segmented options={["single", "word", "two"]} value={props.settings.lineBreakMode} onChange={(lineBreakMode) => update({ lineBreakMode: lineBreakMode as TextSettings["lineBreakMode"] })} />
        <label className={styles.label}>Text Transform</label>
        <Segmented options={["none", "uppercase", "lowercase"]} value={props.settings.transform} onChange={(transform) => update({ transform: transform as Transform })} />
      </div>
      <PreviewBackgroundControl value={props.previewBackground} onChange={props.setPreviewBackground} options={["transparent", "white", "black"]} />
    </section>
  );
}

function GraphicInputPanel(props: {
  graphicDataUrl: string;
  handleGraphicUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  slogans: string;
  setSlogans: (value: string) => void;
  settings: GraphicSettings;
  setSettings: (settings: GraphicSettings) => void;
  generate: () => void;
  openFontImport: () => void;
}) {
  const update = (patch: Partial<GraphicSettings>) => props.setSettings({ ...props.settings, ...patch });
  return (
    <aside className={styles.panel}>
      <h2 className={styles.panelTitle}>Graphic & Slogan Input</h2>
      <label className={styles.label}>Upload Graphic</label>
      <label className={styles.uploadBox}>
        <img src={props.graphicDataUrl} className={styles.uploadPreview} alt="Uploaded graphic preview" />
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={props.handleGraphicUpload} />
      </label>
      <p className={styles.helpText}>Best results with transparent PNGs.</p>
      <Range label="Graphic Size" value={props.settings.graphicSize} min={10} max={90} step={1} onChange={(graphicSize) => update({ graphicSize })} suffix="%" />
      <Range label="Vertical Position" value={props.settings.graphicVertical} min={-100} max={100} step={1} onChange={(graphicVertical) => update({ graphicVertical })} suffix="" />
      <label className={styles.label}>Horizontal Alignment</label>
      <Segmented options={["left", "center", "right"]} value={props.settings.graphicAlign} onChange={(graphicAlign) => update({ graphicAlign: graphicAlign as Align })} />
      <label className={styles.label}>Bulk Slogans</label>
      <textarea className={styles.textarea} value={props.slogans} onChange={(event) => props.setSlogans(event.target.value)} />
      <label className={styles.label}>Static Sub-text</label>
      <input className={styles.input} value={props.settings.subText} onChange={(event) => update({ subText: event.target.value })} />
      <div className={styles.warningInline} style={{ margin: "14px 0" }}>Custom fonts and uploaded graphics are temporary browser memory only.</div>
      <div className={styles.row}>
        <button className={styles.secondaryButton}>♡ Save as Preset</button>
        <button className={styles.smallButton} onClick={props.openFontImport}>Aa Import Fonts</button>
        <button className={styles.primaryButton} onClick={props.generate}>✦ Generate</button>
      </div>
    </aside>
  );
}

function GraphicControls(props: {
  settings: GraphicSettings;
  setSettings: (settings: GraphicSettings) => void;
  renderFontOptions: () => React.ReactNode;
  getFontSource: (font: string) => FontSource;
  previewBackground: PreviewBackground;
  setPreviewBackground: (background: PreviewBackground) => void;
  openFontImport: () => void;
}) {
  const update = (patch: Partial<GraphicSettings>) => props.setSettings({ ...props.settings, ...patch });
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Design Controls</h2>
      <div className={styles.controlGroup}>
        <h3>1. Layout</h3>
        <label className={styles.label}>Main slogan position</label>
        <Segmented options={["above", "below"]} value={props.settings.sloganPosition} onChange={(sloganPosition) => update({ sloganPosition: sloganPosition as "above" | "below" })} two />
        <label className={styles.label}>Layout Preset</label>
        <select className={styles.select} onChange={(event) => {
          if (event.target.value === "Vintage Athletic") update({ effect: "archUp", subEffect: "archDown", sloganPosition: "above" });
          if (event.target.value === "Minimalist Stack") update({ effect: "straight", subText: "", sloganPosition: "above" });
          if (event.target.value === "Circle Badge") update({ effect: "circle", subEffect: "straight" });
          if (event.target.value === "Simple Below") update({ effect: "straight", sloganPosition: "below" });
        }}>
          <option>Vintage Athletic</option>
          <option>Minimalist Stack</option>
          <option>Circle Badge</option>
          <option>Simple Below</option>
          <option>Custom</option>
        </select>
      </div>
      <div className={styles.controlGroup}>
        <h3>2. Slogan Text Controls</h3>
        <label className={styles.label}>Font</label>
        <select className={styles.select} value={props.settings.fontFamily} onChange={(event) => update({ fontFamily: event.target.value, fontSource: props.getFontSource(event.target.value) })}>{props.renderFontOptions()}</select>
        <button className={styles.smallButton} onClick={props.openFontImport} style={{ marginTop: 10 }}>Aa Import Fonts</button>
        <ColorPicker value={props.settings.textColor} onChange={(textColor) => update({ textColor })} presets={COLOR_PRESETS} />
        <Range label="Font Size" value={props.settings.fontSize} min={120} max={700} step={10} onChange={(fontSize) => update({ fontSize })} suffix="px" />
        <Range label="Letter Spacing" value={props.settings.letterSpacing} min={-2} max={15} step={1} onChange={(letterSpacing) => update({ letterSpacing })} suffix="px" />
        <label className={styles.label}>Text Effect</label>
        <select className={styles.select} value={props.settings.effect} onChange={(event) => update({ effect: event.target.value as TextEffect })}>
          <option value="straight">Straight</option>
          <option value="archUp">Arch Up</option>
          <option value="archDown">Arch Down</option>
          <option value="circle">Circle</option>
          <option value="wave">Wave</option>
        </select>
        <Range label="Curve Intensity" value={props.settings.curveIntensity} min={0} max={100} step={1} onChange={(curveIntensity) => update({ curveIntensity })} suffix="%" />
      </div>
      <div className={styles.controlGroup}>
        <h3>3. Sub-text Controls</h3>
        <label className={styles.label}>Sub-text Font</label>
        <select className={styles.select} value={props.settings.subFontFamily} onChange={(event) => update({ subFontFamily: event.target.value, subFontSource: props.getFontSource(event.target.value) })}>{props.renderFontOptions()}</select>
        <Range label="Sub-text Size" value={props.settings.subFontSize} min={80} max={420} step={10} onChange={(subFontSize) => update({ subFontSize })} suffix="px" />
      </div>
      <PreviewBackgroundControl value={props.previewBackground} onChange={props.setPreviewBackground} options={["transparent", "white", "black"]} />
    </section>
  );
}

function PatternInputPanel(props: {
  patterns: PatternPreset[];
  activePatternId: string;
  setActivePatternId: (id: string) => void;
  slogans: string;
  setSlogans: (value: string) => void;
  settings: PatternSettings;
  setSettings: (settings: PatternSettings) => void;
  generate: () => void;
  handlePatternUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const update = (patch: Partial<PatternSettings>) => props.setSettings({ ...props.settings, ...patch });
  return (
    <aside className={styles.panel}>
      <h2 className={styles.panelTitle}>Pattern & Slogans</h2>
      <div className={styles.patternGrid}>
        {props.patterns.map((pattern) => (
          <button key={pattern.id} className={`${styles.patternButton} ${pattern.id === props.activePatternId ? styles.activePattern : ""}`} style={{ backgroundImage: `url(${pattern.dataUrl})` }} onClick={() => props.setActivePatternId(pattern.id)}>
            <span>{pattern.name}</span>
          </button>
        ))}
      </div>
      <label className={styles.label}>Upload custom pattern</label>
      <input className={styles.input} type="file" accept="image/png,image/jpeg,image/webp" onChange={props.handlePatternUpload} />
      <Range label="Pattern Scale" value={props.settings.patternScale} min={10} max={300} step={5} onChange={(patternScale) => update({ patternScale })} suffix="%" />
      <Range label="Pattern Offset X" value={props.settings.patternOffsetX} min={-600} max={600} step={10} onChange={(patternOffsetX) => update({ patternOffsetX })} suffix="" />
      <Range label="Pattern Offset Y" value={props.settings.patternOffsetY} min={-600} max={600} step={10} onChange={(patternOffsetY) => update({ patternOffsetY })} suffix="" />
      <label className={styles.label}>Bulk Slogans</label>
      <textarea className={styles.textarea} value={props.slogans} onChange={(event) => props.setSlogans(event.target.value)} />
      <button className={styles.primaryButton} onClick={props.generate}>✦ Generate</button>
    </aside>
  );
}

function PatternControls(props: {
  settings: PatternSettings;
  setSettings: (settings: PatternSettings) => void;
  renderFontOptions: (heavyOnly?: boolean) => React.ReactNode;
  getFontSource: (font: string) => FontSource;
  previewBackground: PreviewBackground;
  setPreviewBackground: (background: PreviewBackground) => void;
  openFontImport: () => void;
}) {
  const update = (patch: Partial<PatternSettings>) => props.setSettings({ ...props.settings, ...patch });
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Text & Outline Controls</h2>
      <div className={styles.controlGroup}>
        <h3>1. Font & Sizing</h3>
        <label className={styles.label}>Font</label>
        <select className={styles.select} value={props.settings.fontFamily} onChange={(event) => update({ fontFamily: event.target.value, fontSource: props.getFontSource(event.target.value) })}>{props.renderFontOptions(true)}</select>
        <button className={styles.smallButton} onClick={props.openFontImport} style={{ marginTop: 10 }}>Aa Import Fonts</button>
        <Range label="Font Size" value={props.settings.fontSize} min={200} max={1200} step={10} onChange={(fontSize) => update({ fontSize })} suffix="px" />
        <Range label="Letter Spacing" value={props.settings.letterSpacing} min={-5} max={20} step={1} onChange={(letterSpacing) => update({ letterSpacing })} suffix="px" />
        <label className={styles.label}>Text Transform</label>
        <Segmented options={["uppercase", "lowercase", "none"]} value={props.settings.transform} onChange={(transform) => update({ transform: transform as Transform })} />
      </div>
      <div className={styles.controlGroup}>
        <h3>2. Curve Effect</h3>
        <Segmented options={["straight", "archUp", "archDown"]} value={props.settings.effect} onChange={(effect) => update({ effect: effect as PatternSettings["effect"] })} />
        <Range label="Curve Intensity" value={props.settings.curveIntensity} min={0} max={100} step={1} onChange={(curveIntensity) => update({ curveIntensity })} suffix="%" />
      </div>
      <div className={styles.controlGroup}>
        <h3>3. Outline</h3>
        <ColorPicker value={props.settings.outlineColor} onChange={(outlineColor) => update({ outlineColor })} presets={OUTLINE_PRESETS} />
        <Range label="Outline Thickness" value={props.settings.outlineWidth} min={0} max={80} step={1} onChange={(outlineWidth) => update({ outlineWidth })} suffix="px" />
      </div>
      <PreviewBackgroundControl value={props.previewBackground} onChange={props.setPreviewBackground} options={["brown", "black", "white", "cream", "forest"]} />
    </section>
  );
}

function PreviewPanel(props: {
  designs: GeneratedDesign[];
  background: PreviewBackground;
  onDownload: (design: GeneratedDesign) => void;
  onDownloadMockup: (design: GeneratedDesign) => void;
  onDownloadZip: () => void;
  onPreview: (design: GeneratedDesign) => void;
  mockupPresets: MockupPreset[];
  activeMockupPresetId: string;
  setActiveMockupPresetId: (value: string) => void;
}) {
  const selectedMockup = props.mockupPresets.find((preset) => preset.id === props.activeMockupPresetId) || props.mockupPresets[0];
  return (
    <section className={styles.panel}>
      <div className={styles.previewHeader}>
        <h2 className={styles.panelTitle}>Preview Grid</h2>
        <button className={styles.primaryButton} disabled={!props.designs.length} onClick={props.onDownloadZip}>↓ Download All ZIP</button>
      </div>
      <div className={styles.controlGroup}>
        <h3>Showcase Mockup (Optional)</h3>
        <label className={styles.label}>Base PNG from forge/mockups</label>
        <select className={styles.select} value={props.activeMockupPresetId} onChange={(event) => props.setActiveMockupPresetId(event.target.value)}>
          {props.mockupPresets.map((preset) => (
            <option key={preset.id} value={preset.id}>{preset.name}</option>
          ))}
        </select>
        {selectedMockup.id !== "none" && <p className={styles.helpText}>Area: x {selectedMockup.printArea.x}, y {selectedMockup.printArea.y}, w {selectedMockup.printArea.w}, h {selectedMockup.printArea.h}</p>}
      </div>
      {!props.designs.length ? (
        <div className={styles.warningInline}>Generate designs to see previews here.</div>
      ) : (
        <div className={styles.previewGrid}>
          {props.designs.map((design) => (
            <article key={design.id} className={styles.previewCard}>
              <button
                aria-label={`Open enlarged preview for ${design.label}`}
                className={`${styles.designSurface} ${getBackgroundClass(props.background)}`}
                style={getBackgroundStyle(props.background)}
                onClick={() => props.onPreview(design)}
                dangerouslySetInnerHTML={{ __html: design.svg }}
              />
              <div className={styles.cardActions}>
                <button className={styles.smallButton} onClick={() => props.onDownload(design)}>↓ Download PNG</button>
                <button className={styles.smallButton} disabled={props.activeMockupPresetId === "none"} onClick={() => props.onDownloadMockup(design)}>↓ Download Mockup</button>
                <span className={styles.cardMeta}>4500×5400 px<br />transparent</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function InfoPanel(props: {
  customFonts: CustomFont[];
  removeFont: (fontName: string) => void;
  importFonts: () => void;
  exportWorkspace: () => void;
}) {
  return (
    <section className={styles.infoGrid}>
      <div className={styles.infoCard}>
        <h3>Export Standards</h3>
        <ul>
          <li>PNG exports at 4500×5400 px.</li>
          <li>Transparent export background.</li>
          <li>Preview backgrounds are only visual simulation.</li>
          <li>Bulk ZIP export packages every generated design.</li>
        </ul>
        <button className={styles.primaryButton} onClick={props.exportWorkspace}>Export Workspace JSON</button>
      </div>
      <div className={styles.infoCard}>
        <h3>Browser Storage Notice</h3>
        <p>This app runs 100% in your browser. Nothing is uploaded to a server.</p>
        <p>Current work lives in browser memory during this session. Export PNG/ZIP before closing the tab.</p>
      </div>
      <div className={styles.infoCard}>
        <h3>Imported Fonts</h3>
        <button className={styles.secondaryButton} onClick={props.importFonts}>Aa Import Fonts</button>
        {!props.customFonts.length ? <p>No custom font imported.</p> : (
          <div className={styles.chipList}>
            {props.customFonts.map((font) => (
              <button key={font.name} className={styles.chip} style={{ fontFamily: font.name }} onClick={() => props.removeFont(font.name)}>
                {font.name} ×
              </button>
            ))}
          </div>
        )}
        <p className={styles.helpText}>Supported: .ttf, .otf, .woff, .woff2. Imported fonts are session-only.</p>
      </div>
      <div className={styles.infoCard}>
        <h3>Usage Tips</h3>
        <ul>
          <li>Use short slogans for better readability.</li>
          <li>Use transparent PNGs for graphic remix.</li>
          <li>Use heavy fonts for pattern-fill designs.</li>
          <li>Test every design on light and dark shirt previews.</li>
        </ul>
      </div>
    </section>
  );
}

function ColorPicker(props: { value: string; onChange: (value: string) => void; presets: { label: string; value: string }[] }) {
  return (
    <>
      <label className={styles.label}>Color</label>
      <div className={styles.colorGrid}>
        {props.presets.map((preset) => (
          <button key={preset.value} className={`${styles.colorChip} ${props.value === preset.value ? styles.activeChip : ""}`} onClick={() => props.onChange(preset.value)}>
            <span className={styles.colorSwatch} style={{ background: preset.value }} />
            {preset.label}
          </button>
        ))}
      </div>
      <input className={styles.input} type="color" value={props.value} onChange={(event) => props.onChange(event.target.value)} style={{ marginTop: 10 }} />
    </>
  );
}

function Range(props: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <label className={styles.label}>{props.label}
      <span className={styles.rangeRow}>
        <input type="range" min={props.min} max={props.max} step={props.step} value={props.value} onChange={(event) => props.onChange(Number(event.target.value))} />
        <strong>{props.value}{props.suffix}</strong>
      </span>
    </label>
  );
}

function Segmented(props: { options: string[]; value: string; onChange: (value: string) => void; two?: boolean }) {
  return (
    <div className={`${styles.segmented} ${props.two ? styles.two : ""}`}>
      {props.options.map((option) => (
        <button key={option} className={props.value === option ? styles.selected : ""} onClick={() => props.onChange(option)}>{option}</button>
      ))}
    </div>
  );
}

function PreviewBackgroundControl(props: { value: PreviewBackground; onChange: (value: PreviewBackground) => void; options: PreviewBackground[] }) {
  return (
    <div className={styles.controlGroup}>
      <h3>Background Preview</h3>
      <div className={styles.segmented} style={{ gridTemplateColumns: `repeat(${props.options.length}, 1fr)` }}>
        {props.options.map((option) => (
          <button key={option} className={props.value === option ? styles.selected : ""} onClick={() => props.onChange(option)}>{option}</button>
        ))}
      </div>
      <p className={styles.helpText}>Preview only. Exported PNGs remain transparent.</p>
    </div>
  );
}
