export type ToolTab = "templates" | "graphic" | "pattern" | "info";
export type Align = "left" | "center" | "right";
export type Transform = "none" | "uppercase" | "lowercase" | "title";
export type TextEffect = "straight" | "archUp" | "archDown" | "circle" | "wave";
export type PreviewBackground = "transparent" | "white" | "black" | "brown" | "cream" | "forest";
export type FontSource = "google" | "custom";

export type CustomFont = {
  name: string;
  dataUrl: string;
  format: string;
};

export type GeneratedDesign = {
  id: string;
  label: string;
  filename: string;
  svg: string;
};

export type TextSettings = {
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

export type GraphicSettings = {
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

export type PatternSettings = {
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

export type PatternPreset = {
  id: string;
  name: string;
  dataUrl: string;
};

export const WIDTH = 4500;
export const HEIGHT = 5400;

export const BASE_FONTS = [
  "Bebas Neue",
  "Anton",
  "Archivo Black",
  "Barlow Condensed",
  "Cinzel",
  "Oswald",
  "Kanit",
  "League Spartan",
  "Merriweather Sans",
  "Montserrat",
  "Mulish",
  "Nunito Sans",
  "Poppins",
  "Raleway",
  "Playfair Display",
  "Abril Fatface",
  "DM Serif Display",
  "Bungee",
  "Playfair Display SC",
  "Space Grotesk",
  "Permanent Marker",
  "Caveat",
  "Great Vibes",
  "Satisfy",
  "Roboto Slab",
  "Fraunces",
];

export const HEAVY_FONTS = [
  "Anton",
  "Archivo Black",
  "Barlow Condensed",
  "Bebas Neue",
  "Cinzel",
  "Bungee",
  "Oswald",
  "Kanit",
  "League Spartan",
  "Montserrat",
  "Poppins",
  "Raleway",
  "Abril Fatface",
  "DM Serif Display",
  "Permanent Marker",
  "Playfair Display",
  "Playfair Display SC",
  "Roboto Slab",
  "Fraunces",
];

export const COLOR_PRESETS = [
  { label: "Black", value: "#111111" },
  { label: "White", value: "#FFFFFF" },
  { label: "Cream", value: "#F5E6D3" },
  { label: "Rust", value: "#B84A1F" },
  { label: "Forest", value: "#2D4F3F" },
  { label: "Mustard", value: "#D4A017" },
];

export const OUTLINE_PRESETS = [
  { label: "White", value: "#FFFFFF" },
  { label: "Cream", value: "#F5E6D3" },
  { label: "Black", value: "#111111" },
  { label: "Rust", value: "#B84A1F" },
];

export const TEMPLATE_EXAMPLES = [
  "{hobby} is my cardio",
  "Powered by coffee and {noun}",
  "Team {name}",
  "I paused my {activity} to be here",
  "{name}'s reading list",
];

export const SLOGAN_EXAMPLES = [
  "Raised on sweet tea and Jesus",
  "Born to be wild, forced to work",
  "Just a girl who loves horses",
  "Small town girl, big city dreams",
].join("\n");

export const PATTERN_SLOGANS = [
  "DARLIN'",
  "MAMA",
  "HOWDY",
  "Y'ALL",
  "HOT MESS",
  "WILD CHILD",
  "COWGIRL",
  "COUNTRY ROOTS",
].join("\n");

export const defaultTextSettings: TextSettings = {
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

export const defaultGraphicSettings: GraphicSettings = {
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

export const defaultPatternSettings: PatternSettings = {
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

export function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "design";
}

export function parseLines(value: string) {
  return value
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function applyTransform(value: string, transform: Transform) {
  if (transform === "uppercase") return value.toUpperCase();
  if (transform === "lowercase") return value.toLowerCase();
  if (transform === "title") {
    return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }
  return value;
}

export function splitText(value: string, mode: TextSettings["lineBreakMode"]) {
  if (mode === "word") return value.split(/\s+/g).filter(Boolean);
  if (mode === "two") {
    const words = value.split(/\s+/g).filter(Boolean);
    const half = Math.ceil(words.length / 2);
    return [words.slice(0, half).join(" "), words.slice(half).join(" ")].filter(Boolean);
  }
  return [value];
}

export function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function formatFromMime(mime: string) {
  if (mime.includes("woff2")) return "woff2";
  if (mime.includes("woff")) return "woff";
  if (mime.includes("opentype")) return "opentype";
  return "truetype";
}

export function fontFaceStyles(customFonts: CustomFont[]) {
  return customFonts
    .map(
      (font) => `@font-face{font-family:'${font.name}';src:url('${font.dataUrl}') format('${font.format}');font-weight:400 900;font-style:normal;}`,
    )
    .join("\n");
}

export function lineTextSvg(lines: string[], settings: TextSettings, customFonts: CustomFont[]) {
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

export function pathForEffect(effect: TextEffect | PatternSettings["effect"], intensity: number, y: number, id: string) {
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

export function textWithEffect(params: {
  textValue: string;
  effect: TextEffect;
  intensity: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  letterSpacing: number;
  pathId: string;
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

export function placeholderGraphic() {
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

export function buildGraphicSvg(params: {
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
          })
        : ""
    }
  </svg>`;
}

export function makePatternSvg(name: string, body: string) {
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160">${body}<text x="10" y="150" font-family="Arial" font-size="18" font-weight="900" fill="rgba(255,255,255,.88)" stroke="#111" stroke-width="2">${escapeXml(name)}</text></svg>`);
}

export function getPatternPresets(): PatternPreset[] {
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
      dataUrl: makePatternSvg("LEOPARD", `<rect width="220" height="160" fill="#c99658"/>${Array.from({ length: 18 }).map((_, i) => `<ellipse cx="${(i * 47) % 220}" cy="${25 + ((i * 31) % 115)}" rx="${16 + (i % 4) * 4}" ry="${10 + (i % 5) * 2}" fill="none" stroke="#603813" stroke-width="5"/>`).join("")}`),
    },
    {
      id: "cow-print",
      name: "Cow Print",
      dataUrl: makePatternSvg("COW", `<rect width="220" height="160" fill="#f8f0e3"/><path d="M18 28 C38 18 52 38 68 50 C84 62 80 86 56 92 C34 98 18 84 20 60 C22 44 8 36 18 28 Z" fill="#111"/><path d="M132 18 C148 12 168 18 176 34 C184 52 174 72 156 76 C140 80 122 70 120 52 C118 36 120 24 132 18 Z" fill="#111"/><path d="M160 102 C178 94 198 104 204 126 C208 140 198 154 178 150 C160 148 148 130 150 116 C152 108 156 104 160 102 Z" fill="#111"/>`),
    },
    {
      id: "floral-rose",
      name: "Floral Rose",
      dataUrl: makePatternSvg("FLORAL", `<rect width="220" height="160" fill="#f7d7db"/><circle cx="40" cy="40" r="18" fill="#e68b97"/><circle cx="90" cy="72" r="16" fill="#c95a72"/><circle cx="156" cy="42" r="20" fill="#f5a1b0"/><circle cx="182" cy="108" r="18" fill="#d66a7f"/><path d="M20 140 C40 100 66 100 84 140" fill="none" stroke="#5d8a4d" stroke-width="12"/><path d="M120 138 C138 96 160 96 182 138" fill="none" stroke="#5d8a4d" stroke-width="12"/>`),
    },
    {
      id: "plaid-red",
      name: "Plaid",
      dataUrl: makePatternSvg("PLAID", `<rect width="220" height="160" fill="#d8c19b"/><rect x="20" width="24" height="160" fill="#9c2e2e"/><rect x="66" width="14" height="160" fill="#f2efe8"/><rect x="108" width="18" height="160" fill="#3b4d63"/><rect x="154" width="12" height="160" fill="#9c2e2e"/><rect x="186" width="20" height="160" fill="#f2efe8"/><rect y="26" width="220" height="10" fill="#9c2e2e"/><rect y="70" width="220" height="8" fill="#3b4d63"/><rect y="112" width="220" height="12" fill="#9c2e2e"/>`),
    },
    {
      id: "woodgrain",
      name: "Wood Grain",
      dataUrl: makePatternSvg("WOOD", `<rect width="220" height="160" fill="#b98553"/><path d="M0 18 C36 8 62 30 94 18 S162 12 220 24" fill="none" stroke="#8a5a33" stroke-width="10"/><path d="M0 58 C34 46 66 72 92 58 S160 50 220 64" fill="none" stroke="#a66f42" stroke-width="12"/><path d="M0 108 C40 92 70 122 102 108 S174 96 220 114" fill="none" stroke="#7a4e2d" stroke-width="11"/>`),
    },
    {
      id: "american-flag",
      name: "Flag",
      dataUrl: makePatternSvg("FLAG", `<rect width="220" height="160" fill="#ffffff"/><rect width="220" height="20" fill="#d72638"/><rect y="40" width="220" height="20" fill="#d72638"/><rect y="80" width="220" height="20" fill="#d72638"/><rect y="120" width="220" height="20" fill="#d72638"/><rect width="90" height="80" fill="#1d4ed8"/><circle cx="18" cy="18" r="3" fill="#fff"/><circle cx="34" cy="18" r="3" fill="#fff"/><circle cx="50" cy="18" r="3" fill="#fff"/><circle cx="66" cy="18" r="3" fill="#fff"/><circle cx="82" cy="18" r="3" fill="#fff"/><circle cx="18" cy="34" r="3" fill="#fff"/><circle cx="34" cy="34" r="3" fill="#fff"/><circle cx="50" cy="34" r="3" fill="#fff"/><circle cx="66" cy="34" r="3" fill="#fff"/><circle cx="82" cy="34" r="3" fill="#fff"/>`),
    },
    {
      id: "serape-stripes",
      name: "Serape Stripes",
      dataUrl: makePatternSvg("SERAPE", `<rect width="220" height="160" fill="#c73e2d"/><rect x="20" width="18" height="160" fill="#f6c445"/><rect x="48" width="12" height="160" fill="#2d7f74"/><rect x="78" width="28" height="160" fill="#101828"/><rect x="126" width="16" height="160" fill="#fff0c6"/><rect x="158" width="26" height="160" fill="#cf6b2e"/><rect x="196" width="10" height="160" fill="#2d4f3f"/>`),
    },
  ];
}

export function buildPatternSvg(params: {
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

export async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function svgToPngBlob(svg: string): Promise<Blob> {
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

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function getBackgroundClass(preview: PreviewBackground, styles: { checker: string }) {
  if (preview === "transparent") return styles.checker;
  return "";
}

export function getBackgroundStyle(preview: PreviewBackground) {
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
