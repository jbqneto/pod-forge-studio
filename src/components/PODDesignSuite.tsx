"use client";

import { ChangeEvent, type PointerEvent as ReactPointerEvent, type RefObject, type WheelEvent as ReactWheelEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Align,
  BASE_FONTS,
  COLOR_PRESETS,
  HEIGHT,
  HEAVY_FONTS,
  OUTLINE_PRESETS,
  PATTERN_SLOGANS,
  SLOGAN_EXAMPLES,
  TEMPLATE_EXAMPLES,
  WIDTH,
  applyTransform,
  buildGraphicSvg,
  buildPatternSvg,
  defaultGraphicSettings,
  defaultPatternSettings,
  defaultTextSettings,
  downloadBlob,
  fileToDataUrl,
  formatFromMime,
  getBackgroundClass,
  getBackgroundStyle,
  getPatternPresets,
  lineTextSvg,
  parseLines,
  placeholderGraphic,
  slugify,
  splitText, svgToPngBlob,
  CustomFont,
  FontSource,
  GeneratedDesign,
  GeneratedDesignOverrides,
  GeneratedDesignSource,
  GeneratedDesignTool,
  GraphicSettings,
  PatternPreset,
  PatternSettings,
  PreviewBackground,
  ToolTab,
  TextEffect,
  TextSettings,
  Transform
} from "@/lib/podforge";

import styles from "./PODDesignSuite.module.css";
import { DEFAULT_MOCKUPS, MOCKUP_STORAGE_KEY, type MockupConfig, type MockupDrawArea } from "@/config/mockups";
import { parseTemplateInput } from "@/lib/templateParser";

type MockupRect = { x: number; y: number; w: number; h: number };
type CanvasView = { zoom: number; panX: number; panY: number };
type GuidePreset = "edges-center" | "quarters" | "thirds" | "eighths";
type MockupInteractionMode = "draw" | "pan";
type MockupEditorSnapshot = {
  mockupName: string;
  mockupBaseDataUrl: string;
  mockupX: number;
  mockupY: number;
  mockupW: number;
  mockupH: number;
  activeMockupPresetId: string;
  editingMockupId: string | null;
  mockupViewport: CanvasView;
  mockupSnapEnabled: boolean;
  mockupGuidePreset: GuidePreset;
  mockupSnapThreshold: number;
  mockupGridStep: number;
  mockupInteractionMode: MockupInteractionMode;
};
type PanGesture = {
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
};
type SnapGuide = { vertical: number | null; horizontal: number | null };

type ZipProgress = {
  active: boolean;
  cancelled: boolean;
  processed: number;
  total: number;
  ok: number;
  error: number;
  report: { filename: string; status: "ok" | "error"; message?: string }[];
}

type StylePresetType = "text" | "graphic" | "pattern";
type StylePreset = {
  id: string;
  name: string;
  type: StylePresetType;
  settings: TextSettings | GraphicSettings | PatternSettings;
  assetRef?: {
    kind: "image" | "tile";
    dataUrl: string;
  };
};

type MockupGesture =
  | {
      mode: "move";
      startClientX: number;
      startClientY: number;
      startRect: MockupRect;
      stageWidth: number;
      stageHeight: number;
    }
  | {
      mode: "resize";
      handle: "nw" | "ne" | "sw" | "se";
      startClientX: number;
      startClientY: number;
      startRect: MockupRect;
      stageWidth: number;
      stageHeight: number;
    };

type SelectedPreviewRef = {
  tool: GeneratedDesignTool;
  id: string;
};

type GraphicDragState = {
  startClientX: number;
  startClientY: number;
  startOffsetX: number;
  startOffsetY: number;
  stageWidth: number;
  stageHeight: number;
};

type MockupDrawGesture = {
  startClientX: number;
  startClientY: number;
  startPoint: { x: number; y: number };
  stageWidth: number;
  stageHeight: number;
};

function mergeTextSettings(settings: TextSettings, overrides: GeneratedDesignOverrides) {
  return {
    ...settings,
    fontSize: overrides.textFontSize ?? settings.fontSize,
  };
}

function mergeGraphicSettings(settings: GraphicSettings, overrides: GeneratedDesignOverrides) {
  return {
    ...settings,
    graphicOffsetX: overrides.graphicOffsetX ?? settings.graphicOffsetX ?? 0,
    graphicOffsetY: overrides.graphicOffsetY ?? settings.graphicOffsetY ?? 0,
  };
}

function mergePatternSettings(settings: PatternSettings, overrides: GeneratedDesignOverrides) {
  return {
    ...settings,
    fontSize: overrides.textFontSize ?? settings.fontSize,
  };
}

function renderGeneratedDesign(design: GeneratedDesign, customFonts: CustomFont[]) {
  if (design.tool === "templates") {
    const source = design.source as Extract<GeneratedDesignSource, { tool: "templates" }>;
    const settings = mergeTextSettings(source.settings, design.overrides);
    const lines = splitText(applyTransform(source.valuesRow, settings.transform), settings.lineBreakMode);
    return lineTextSvg(lines, settings, customFonts);
  }

  if (design.tool === "graphic") {
    const source = design.source as Extract<GeneratedDesignSource, { tool: "graphic" }>;
    const settings = mergeGraphicSettings(source.settings, design.overrides);
    return buildGraphicSvg({
      slogan: source.slogan,
      graphicDataUrl: source.graphicDataUrl,
      settings,
      customFonts,
      graphicOffsetX: settings.graphicOffsetX,
      graphicOffsetY: settings.graphicOffsetY,
    });
  }

  const source = design.source as Extract<GeneratedDesignSource, { tool: "pattern" }>;
  const settings = mergePatternSettings(source.settings, design.overrides);
  return buildPatternSvg({
    slogan: source.slogan,
    pattern: source.pattern,
    settings,
    customFonts,
  });
}

function getDesignTextFontSize(design: GeneratedDesign) {
  return design.overrides.textFontSize ?? design.source.settings.fontSize;
}

function getGraphicBox(settings: GraphicSettings, overrides: GeneratedDesignOverrides) {
  const width = WIDTH * (settings.graphicSize / 100);
  const height = width;
  const baseX =
    settings.graphicAlign === "left"
      ? WIDTH * 0.1
      : settings.graphicAlign === "right"
        ? WIDTH - width - WIDTH * 0.1
        : (WIDTH - width) / 2;
  const baseY = HEIGHT / 2 - height / 2 + settings.graphicVertical * 16;
  const x = baseX + (overrides.graphicOffsetX ?? settings.graphicOffsetX ?? 0);
  const y = baseY + (overrides.graphicOffsetY ?? settings.graphicOffsetY ?? 0);

  return { x, y, width, height };
}

const EMPTY_MOCKUP: MockupConfig = {
  id: "none",
  name: "No mockup",
  fileUrl: "",
  drawArea: { x: 0, y: 0, w: 0, h: 0 },
};
const GUIDE_PRESETS: Record<GuidePreset, number[]> = {
  "edges-center": [0, 0.5, 1],
  quarters: [0, 0.25, 0.5, 0.75, 1],
  thirds: [0, 1 / 3, 2 / 3, 1],
  eighths: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
};
const DEFAULT_CANVAS_VIEW: CanvasView = { zoom: 1, panX: 0, panY: 0 };
const MOCKUP_HISTORY_LIMIT = 30;

function getGuidePositions(size: number, preset: GuidePreset) {
  return GUIDE_PRESETS[preset].map((fraction) => size * fraction);
}

function snapLeadingCandidate(value: number, targets: number[], threshold: number) {
  let bestValue = value;
  let bestGuide: number | null = null;
  let bestDistance = threshold + 1;

  for (const target of targets) {
    const distance = Math.abs(value - target);
    if (distance <= threshold && distance < bestDistance) {
      bestDistance = distance;
      bestValue = target;
      bestGuide = target;
    }
  }

  return { value: bestValue, guide: bestGuide };
}

function snapRectMovement(
  rect: MockupRect,
  size: { width: number; height: number },
  threshold: number,
  preset: GuidePreset,
) {
  const xTargets = getGuidePositions(size.width, preset);
  const yTargets = getGuidePositions(size.height, preset);

  const xCandidates = [
    { comparison: rect.x, apply: (target: number) => target },
    { comparison: rect.x + rect.w / 2, apply: (target: number) => target - rect.w / 2 },
    { comparison: rect.x + rect.w, apply: (target: number) => target - rect.w },
  ];
  const yCandidates = [
    { comparison: rect.y, apply: (target: number) => target },
    { comparison: rect.y + rect.h / 2, apply: (target: number) => target - rect.h / 2 },
    { comparison: rect.y + rect.h, apply: (target: number) => target - rect.h },
  ];

  let nextX = rect.x;
  let nextY = rect.y;
  let guideX: number | null = null;
  let guideY: number | null = null;
  let bestXDistance = threshold + 1;
  let bestYDistance = threshold + 1;

  for (const candidate of xCandidates) {
    for (const target of xTargets) {
      const distance = Math.abs(candidate.comparison - target);
      if (distance <= threshold && distance < bestXDistance) {
        bestXDistance = distance;
        nextX = candidate.apply(target);
        guideX = target;
      }
    }
  }

  for (const candidate of yCandidates) {
    for (const target of yTargets) {
      const distance = Math.abs(candidate.comparison - target);
      if (distance <= threshold && distance < bestYDistance) {
        bestYDistance = distance;
        nextY = candidate.apply(target);
        guideY = target;
      }
    }
  }

  return {
    rect: { x: nextX, y: nextY, w: rect.w, h: rect.h },
    guide: { vertical: guideX, horizontal: guideY } satisfies SnapGuide,
  };
}

function snapRectResize(
  rect: MockupRect,
  handle: "nw" | "ne" | "sw" | "se",
  size: { width: number; height: number },
  threshold: number,
  preset: GuidePreset,
) {
  const xTargets = getGuidePositions(size.width, preset);
  const yTargets = getGuidePositions(size.height, preset);
  let nextX = rect.x;
  let nextY = rect.y;
  let nextW = rect.w;
  let nextH = rect.h;
  let guideX: number | null = null;
  let guideY: number | null = null;

  if (handle.includes("e")) {
    const edge = rect.x + rect.w;
    const snapped = snapLeadingCandidate(edge, xTargets, threshold);
    if (snapped.guide !== null) {
      nextW = snapped.value - rect.x;
      guideX = snapped.guide;
    }
  }

  if (handle.includes("w")) {
    const snapped = snapLeadingCandidate(rect.x, xTargets, threshold);
    if (snapped.guide !== null) {
      nextX = snapped.value;
      nextW = rect.x + rect.w - snapped.value;
      guideX = snapped.guide;
    }
  }

  if (handle.includes("s")) {
    const edge = rect.y + rect.h;
    const snapped = snapLeadingCandidate(edge, yTargets, threshold);
    if (snapped.guide !== null) {
      nextH = snapped.value - rect.y;
      guideY = snapped.guide;
    }
  }

  if (handle.includes("n")) {
    const snapped = snapLeadingCandidate(rect.y, yTargets, threshold);
    if (snapped.guide !== null) {
      nextY = snapped.value;
      nextH = rect.y + rect.h - snapped.value;
      guideY = snapped.guide;
    }
  }

  return {
    rect: { x: nextX, y: nextY, w: nextW, h: nextH },
    guide: { vertical: guideX, horizontal: guideY } satisfies SnapGuide,
  };
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

async function composeMockupPngBlob(svg: string, mockup: MockupConfig) {
  if (mockup.id === "none") throw new Error("Select a mockup preset before exporting showcase mockup.");
  const [designBlob, mockupImage] = await Promise.all([svgToPngBlob(svg), loadImage(mockup.fileUrl)]);
  const designUrl = URL.createObjectURL(designBlob);
  try {
    const designImage = await loadImage(designUrl);
    const canvas = document.createElement("canvas");
    canvas.width = mockupImage.naturalWidth || WIDTH;
    canvas.height = mockupImage.naturalHeight || HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not compose mockup export.");
    context.drawImage(mockupImage, 0, 0, canvas.width, canvas.height);
    context.drawImage(designImage, mockup.drawArea.x, mockup.drawArea.y, mockup.drawArea.w, mockup.drawArea.h);
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

type LegacyMockupShape = Partial<MockupConfig> & {
  basePngPath?: string;
  printArea?: MockupDrawArea;
  drawArea?: MockupDrawArea;
  fileUrl?: string;
};

function normalizeMockupConfig(mockup: LegacyMockupShape | null | undefined): MockupConfig | null {
  if (!mockup || typeof mockup.id !== "string" || typeof mockup.name !== "string") return null;
  const fileUrl = mockup.fileUrl ?? mockup.basePngPath;
  const drawArea = mockup.drawArea ?? mockup.printArea;
  if (typeof fileUrl !== "string" || !drawArea) return null;
  return {
    id: mockup.id,
    name: mockup.name,
    fileUrl,
    drawArea,
  };
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
  const [selectedPreviewRef, setSelectedPreviewRef] = useState<SelectedPreviewRef | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zipProgress, setZipProgress] = useState<ZipProgress>({
    active: false,
    cancelled: false,
    processed: 0,
    total: 0,
    ok: 0,
    error: 0,
    report: [],
  });
  
  const zipCancelRef = useRef(false);
  const [stylePresets, setStylePresets] = useState<StylePreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [activeMockupPresetId, setActiveMockupPresetId] = useState(DEFAULT_MOCKUPS[0].id);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [localMockups, setLocalMockups] = useState<MockupConfig[]>([]);
  const [mockupName, setMockupName] = useState("");
  const [mockupBaseDataUrl, setMockupBaseDataUrl] = useState("");
  const [mockupX, setMockupX] = useState(1320);
  const [mockupY, setMockupY] = useState(1290);
  const [mockupW, setMockupW] = useState(1860);
  const [mockupH, setMockupH] = useState(2232);
  const [editingMockupId, setEditingMockupId] = useState<string | null>(null);
  const [mockupNaturalSize, setMockupNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [mockupGesture, setMockupGesture] = useState<MockupGesture | null>(null);
  const [mockupViewport, setMockupViewport] = useState<CanvasView>(DEFAULT_CANVAS_VIEW);
  const [mockupPanGesture, setMockupPanGesture] = useState<PanGesture | null>(null);
  const [mockupSnapGuide, setMockupSnapGuide] = useState<SnapGuide>({ vertical: null, horizontal: null });
  const [mockupSnapEnabled, setMockupSnapEnabled] = useState(true);
  const [mockupGuidePreset, setMockupGuidePreset] = useState<GuidePreset>("quarters");
  const [mockupSnapThreshold, setMockupSnapThreshold] = useState(28);
  const [mockupGridStep, setMockupGridStep] = useState(24);
  const [mockupInteractionMode, setMockupInteractionMode] = useState<MockupInteractionMode>("draw");
  const [previewViewport, setPreviewViewport] = useState<CanvasView>(DEFAULT_CANVAS_VIEW);
  const [previewPanGesture, setPreviewPanGesture] = useState<PanGesture | null>(null);
  const [mockupUndoStack, setMockupUndoStack] = useState<MockupEditorSnapshot[]>([]);
  const [mockupRedoStack, setMockupRedoStack] = useState<MockupEditorSnapshot[]>([]);
  const [graphicEditorEnabled, setGraphicEditorEnabled] = useState(false);
  const fontInputRef = useRef<HTMLInputElement | null>(null);
  const workspaceInputRef = useRef<HTMLInputElement | null>(null);
  const mockupInputRef = useRef<HTMLInputElement | null>(null);
  const mockupStageRef = useRef<HTMLDivElement | null>(null);
  const previewStageRef = useRef<HTMLDivElement | null>(null);
  const graphicDragStateRef = useRef<GraphicDragState | null>(null);
  const mockupDrawGestureRef = useRef<MockupDrawGesture | null>(null);
  const mockupsLoadedRef = useRef(false);

  const checkerStyles = { checker: styles.checker };

  const basePatterns = useMemo(() => getPatternPresets(), []);
  const patterns = useMemo(() => [...basePatterns, ...customPatterns], [basePatterns, customPatterns]);
  const mockups = useMemo(() => [EMPTY_MOCKUP, ...DEFAULT_MOCKUPS, ...localMockups], [localMockups]);
  const [activePatternId, setActivePatternId] = useState("realtree-camo");
  const activePattern = patterns.find((item) => item.id === activePatternId) || patterns[0];
  const canUndoMockup = mockupUndoStack.length > 0;
  const canRedoMockup = mockupRedoStack.length > 0;
  const allDesigns = [...templateDesigns, ...graphicDesigns, ...patternDesigns];
  const selectedPreview =
    selectedPreviewRef ? allDesigns.find((design) => design.tool === selectedPreviewRef.tool && design.id === selectedPreviewRef.id) || null : null;
  const selectedPreviewTextFontSize = selectedPreview ? getDesignTextFontSize(selectedPreview) : null;
  const selectedPreviewGraphicBox =
    selectedPreview && selectedPreview.tool === "graphic"
      ? getGraphicBox(selectedPreview.source.settings as GraphicSettings, selectedPreview.overrides)
      : null;

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

  function captureMockupSnapshot(): MockupEditorSnapshot {
    return {
      mockupName,
      mockupBaseDataUrl,
      mockupX,
      mockupY,
      mockupW,
      mockupH,
      activeMockupPresetId,
      editingMockupId,
      mockupViewport,
      mockupSnapEnabled,
      mockupGuidePreset,
      mockupSnapThreshold,
      mockupGridStep,
      mockupInteractionMode,
    };
  }

  function restoreMockupSnapshot(snapshot: MockupEditorSnapshot) {
    setMockupName(snapshot.mockupName);
    setMockupBaseDataUrl(snapshot.mockupBaseDataUrl);
    setMockupX(snapshot.mockupX);
    setMockupY(snapshot.mockupY);
    setMockupW(snapshot.mockupW);
    setMockupH(snapshot.mockupH);
    setActiveMockupPresetId(snapshot.activeMockupPresetId);
    setEditingMockupId(snapshot.editingMockupId);
    setMockupViewport(snapshot.mockupViewport);
    setMockupSnapEnabled(snapshot.mockupSnapEnabled);
    setMockupGuidePreset(snapshot.mockupGuidePreset);
    setMockupSnapThreshold(snapshot.mockupSnapThreshold);
    setMockupGridStep(snapshot.mockupGridStep);
    setMockupInteractionMode(snapshot.mockupInteractionMode);
  }

  function pushMockupHistory() {
    const snapshot = captureMockupSnapshot();
    setMockupUndoStack((current) => {
      const next = [...current, snapshot];
      return next.length > MOCKUP_HISTORY_LIMIT ? next.slice(next.length - MOCKUP_HISTORY_LIMIT) : next;
    });
    setMockupRedoStack([]);
  }

  function undoMockupHistory() {
    setMockupUndoStack((current) => {
      if (!current.length) return current;
      const previous = current[current.length - 1];
      const currentSnapshot = captureMockupSnapshot();
      setMockupRedoStack((redo) => [currentSnapshot, ...redo].slice(0, MOCKUP_HISTORY_LIMIT));
      restoreMockupSnapshot(previous);
      return current.slice(0, -1);
    });
  }

  function redoMockupHistory() {
    setMockupRedoStack((current) => {
      if (!current.length) return current;
      const nextSnapshot = current[0];
      const currentSnapshot = captureMockupSnapshot();
      setMockupUndoStack((undo) => [...undo, currentSnapshot].slice(-MOCKUP_HISTORY_LIMIT));
      restoreMockupSnapshot(nextSnapshot);
      return current.slice(1);
    });
  }

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      return target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;

      if (event.key.toLowerCase() === "z" && tab === "info") {
        event.preventDefault();
        if (event.shiftKey) redoMockupHistory();
        else undoMockupHistory();
        return;
      }

      if (event.key.toLowerCase() === "y" && tab === "info") {
        event.preventDefault();
        redoMockupHistory();
        return;
      }

      if (event.key === "0") {
        event.preventDefault();
        if (selectedPreview) resetPreviewViewport();
        else if (tab === "info") resetMockupViewport();
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !selectedPreview) return;
      event.preventDefault();
      setPreviewPanGesture(null);
      setSelectedPreviewRef(null);
      setGraphicEditorEnabled(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [selectedPreview, tab, canRedoMockup, canUndoMockup]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MOCKUP_STORAGE_KEY) ?? window.localStorage.getItem("podforge-studio.mockups.v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const normalized = parsed.map((mockup) => normalizeMockupConfig(mockup as LegacyMockupShape)).filter((mockup): mockup is MockupConfig => mockup !== null);
      if (normalized.length) setLocalMockups(normalized);
    } catch {
      // Ignore malformed local storage and fall back to built-in mockups.
    } finally {
      mockupsLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!mockupsLoadedRef.current || typeof window === "undefined") return;
    window.localStorage.setItem(MOCKUP_STORAGE_KEY, JSON.stringify(localMockups));
  }, [localMockups]);

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
    try {
      if (templateDesigns.length > 0 && !window.confirm("Generating again will clear the custom config for individual files. Continue?")) {
        return;
      }
      const parsed = parseTemplateInput(template, templateValues);
      const designs = parsed.rows.map((row, index) => {
        const finalText = parsed.placeholders.reduce((accumulator, placeholder, placeholderIndex) => {
          return accumulator.replaceAll(`{${placeholder}}`, row.values[placeholderIndex] || placeholder);
        }, template.trim()).replace(/\s+/g, " ").trim();
        const sourceSettings = { ...textSettings };
        const svg = renderGeneratedDesign(
          {
            id: `template-${index}`,
            tool: "templates",
            label: finalText,
            filename: `${slugify(template)}-${slugify(row.values.join("-"))}.png`,
            svg: "",
            source: {
              tool: "templates",
              template: template.trim(),
              valuesRow: finalText,
              settings: sourceSettings,
            },
            overrides: {},
          },
          customFonts,
        );
        return {
          id: `template-${index}`,
          tool: "templates" as const,
          label: finalText,
          filename: `${slugify(template)}-${slugify(row.values.join("-"))}.png`,
          svg,
          source: {
            tool: "templates" as const,
            template: template.trim(),
            valuesRow: finalText,
            settings: sourceSettings,
          },
          overrides: {},
        };
      });
      setTemplateDesigns(designs);
    } catch (parseError) {
      setError((parseError as Error).message);
    }
  }

  function generateGraphicDesigns() {
    setError(null);
    if (graphicDesigns.length > 0 && !window.confirm("Generating again will clear the custom config for individual files. Continue?")) {
      return;
    }
    const slogans = parseLines(graphicSlogans);
    if (!slogans.length) return setError("Add at least one slogan.");
    const designs = slogans.map((slogan, index) => ({
      id: `graphic-${index}`,
      tool: "graphic" as const,
      label: slogan,
      filename: `${slugify(slogan)}.png`,
      svg: buildGraphicSvg({ slogan, graphicDataUrl, settings: { ...graphicSettings }, customFonts }),
      source: {
        tool: "graphic" as const,
        slogan,
        graphicDataUrl,
        settings: { ...graphicSettings },
      },
      overrides: {},
    }));
    setGraphicDesigns(designs);
  }

  function generatePatternDesigns() {
    setError(null);
    if (patternDesigns.length > 0 && !window.confirm("Generating again will clear the custom config for individual files. Continue?")) {
      return;
    }
    const slogans = parseLines(patternSlogans);
    if (!slogans.length) return setError("Add at least one pattern-fill slogan.");
    const designs = slogans.map((slogan, index) => ({
      id: `pattern-${index}`,
      tool: "pattern" as const,
      label: slogan,
      filename: `${activePattern.id}-${slugify(slogan)}.png`,
      svg: buildPatternSvg({ slogan, pattern: activePattern, settings: { ...patternSettings }, customFonts }),
      source: {
        tool: "pattern" as const,
        slogan,
        pattern: activePattern,
        settings: { ...patternSettings },
      },
      overrides: {},
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
    zipCancelRef.current = false;
    setZipProgress({ active: true, cancelled: false, processed: 0, total: designs.length, ok: 0, error: 0, report: [] });
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const chunkSize = 6;
      let processed = 0;
      let ok = 0;
      let errorCount = 0;
      const report: ZipProgress["report"] = [];
      for (let start = 0; start < designs.length; start += chunkSize) {
        if (zipCancelRef.current) {
          setZipProgress((current) => ({ ...current, active: false, cancelled: true, processed, ok, error: errorCount, report: [...report] }));
          return;
        }
        const chunk = designs.slice(start, start + chunkSize);
        await Promise.all(
          chunk.map(async (design) => {
            try {
              const blob = await svgToPngBlob(design.svg);
              zip.file(design.filename, blob);
              ok += 1;
              report.push({ filename: design.filename, status: "ok" });
            } catch (chunkError) {
              errorCount += 1;
              report.push({ filename: design.filename, status: "error", message: (chunkError as Error).message });
            } finally {
              processed += 1;
            }
          }),
        );
        setZipProgress((current) => ({ ...current, processed, ok, error: errorCount, report: [...report] }));
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, filename);
      setZipProgress((current) => ({ ...current, active: false, processed, ok, error: errorCount, report: [...report] }));
    } catch (zipError) {
      setError((zipError as Error).message);
      setZipProgress((current) => ({ ...current, active: false }));
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

  async function handleMockupImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file for the mockup base.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const derivedName = file.name.replace(/\.[^.]+$/, "");
      pushMockupHistory();
      setMockupBaseDataUrl(dataUrl);
      if (!mockupName.trim()) {
        setMockupName(derivedName);
      }
    } catch (mockupError) {
      setError(`Could not load mockup image. ${(mockupError as Error).message}`);
    } finally {
      event.target.value = "";
    }
  }

  function saveLocalMockup() {
    if (!mockupName.trim()) {
      setError("Enter a mockup name.");
      return;
    }
    if (!mockupBaseDataUrl) {
      setError("Upload a base image for the mockup.");
      return;
    }
    if (mockupW <= 0 || mockupH <= 0) {
      setError("Mockup width and height must be greater than zero.");
      return;
    }

    const nextPreset: MockupConfig = {
      id: editingMockupId ?? `local-${slugify(mockupName)}-${Date.now()}`,
      name: mockupName.trim(),
      fileUrl: mockupBaseDataUrl,
      drawArea: { x: mockupX, y: mockupY, w: mockupW, h: mockupH },
    };
    pushMockupHistory();
    setLocalMockups((current) => {
      const filtered = current.filter((mockup) => mockup.id !== nextPreset.id);
      return [nextPreset, ...filtered];
    });
    setActiveMockupPresetId(nextPreset.id);
    setEditingMockupId(nextPreset.id);
    setWorkspaceMenuOpen(false);
    setError(null);
  }

  function editLocalMockup(mockupId: string) {
    const mockup = localMockups.find((item) => item.id === mockupId);
    if (!mockup) return;
    pushMockupHistory();
    setMockupName(mockup.name);
    setMockupBaseDataUrl(mockup.fileUrl);
    setMockupX(mockup.drawArea.x);
    setMockupY(mockup.drawArea.y);
    setMockupW(mockup.drawArea.w);
    setMockupH(mockup.drawArea.h);
    setActiveMockupPresetId(mockup.id);
    setEditingMockupId(mockup.id);
    setError(null);
  }

  function resetMockupEditor() {
    pushMockupHistory();
    setMockupName("");
    setMockupBaseDataUrl("");
    setMockupX(1320);
    setMockupY(1290);
    setMockupW(1860);
    setMockupH(2232);
    setMockupNaturalSize(null);
    setMockupViewport(DEFAULT_CANVAS_VIEW);
    setMockupPanGesture(null);
    setMockupGesture(null);
    setMockupSnapGuide({ vertical: null, horizontal: null });
    setMockupSnapEnabled(true);
    setMockupGuidePreset("quarters");
    setMockupSnapThreshold(28);
    setMockupGridStep(24);
    setMockupInteractionMode("draw");
    mockupDrawGestureRef.current = null;
    setEditingMockupId(null);
    setActiveMockupPresetId(DEFAULT_MOCKUPS[0].id);
    setError(null);
  }

  function updateMockupRect(nextRect: MockupRect) {
    const safeRect = {
      x: Math.round(Math.max(0, nextRect.x)),
      y: Math.round(Math.max(0, nextRect.y)),
      w: Math.round(Math.max(40, nextRect.w)),
      h: Math.round(Math.max(40, nextRect.h)),
    };

    if (mockupNaturalSize) {
      safeRect.x = Math.min(safeRect.x, Math.max(0, mockupNaturalSize.width - safeRect.w));
      safeRect.y = Math.min(safeRect.y, Math.max(0, mockupNaturalSize.height - safeRect.h));
      safeRect.w = Math.min(safeRect.w, Math.max(40, mockupNaturalSize.width - safeRect.x));
      safeRect.h = Math.min(safeRect.h, Math.max(40, mockupNaturalSize.height - safeRect.y));
    }

    setMockupX(safeRect.x);
    setMockupY(safeRect.y);
    setMockupW(safeRect.w);
    setMockupH(safeRect.h);
  }

  function clientToMockupPoint(clientX: number, clientY: number, stageRect: DOMRect) {
    const scaleX = stageRect.width / (mockupNaturalSize?.width || stageRect.width);
    const scaleY = stageRect.height / (mockupNaturalSize?.height || stageRect.height);
    return {
      x: (clientX - stageRect.left - mockupViewport.panX) / Math.max(0.1, scaleX * mockupViewport.zoom),
      y: (clientY - stageRect.top - mockupViewport.panY) / Math.max(0.1, scaleY * mockupViewport.zoom),
    };
  }

  function adjustViewportZoom(view: CanvasView, nextZoom: number, point: { x: number; y: number }) {
    const clampedZoom = Math.min(2.5, Math.max(0.5, nextZoom));
    const scale = clampedZoom / view.zoom;
    return {
      zoom: clampedZoom,
      panX: point.x - (point.x - view.panX) * scale,
      panY: point.y - (point.y - view.panY) * scale,
    };
  }

  function startMockupPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (!mockupStageRef.current || !mockupBaseDataUrl) return;
    event.preventDefault();
    pushMockupHistory();
    setMockupPanGesture({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: mockupViewport.panX,
      startPanY: mockupViewport.panY,
    });
  }

  function handleMockupWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function resetMockupViewport() {
    pushMockupHistory();
    setMockupViewport(DEFAULT_CANVAS_VIEW);
    setMockupPanGesture(null);
  }

  function setMockupMode(mode: MockupInteractionMode) {
    setMockupInteractionMode(mode);
    setMockupPanGesture(null);
    mockupDrawGestureRef.current = null;
  }

  function startMockupDraw(event: ReactPointerEvent<HTMLDivElement>) {
    if (!mockupNaturalSize || !mockupStageRef.current) return;
    event.preventDefault();
    pushMockupHistory();
    const stageRect = mockupStageRef.current.getBoundingClientRect();
    mockupDrawGestureRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPoint: clientToMockupPoint(event.clientX, event.clientY, stageRect),
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
    };
  }

  function startMockupMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!mockupNaturalSize || !mockupStageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    pushMockupHistory();
    const stageRect = mockupStageRef.current.getBoundingClientRect();
    setMockupGesture({
      mode: "move",
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: { x: mockupX, y: mockupY, w: mockupW, h: mockupH },
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
    });
  }

  function startMockupResize(handle: "nw" | "ne" | "sw" | "se", event: ReactPointerEvent<HTMLButtonElement>) {
    if (!mockupNaturalSize || !mockupStageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    pushMockupHistory();
    const stageRect = mockupStageRef.current.getBoundingClientRect();
    setMockupGesture({
      mode: "resize",
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: { x: mockupX, y: mockupY, w: mockupW, h: mockupH },
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
    });
  }

  useEffect(() => {
    if (!mockupDrawGestureRef.current) return;

    const onPointerMove = (event: PointerEvent) => {
      const drag = mockupDrawGestureRef.current;
      if (!drag || !mockupStageRef.current) return;
      const stageRect = mockupStageRef.current.getBoundingClientRect();
      const currentPoint = clientToMockupPoint(event.clientX, event.clientY, stageRect);
      const nextRect = {
        x: Math.min(drag.startPoint.x, currentPoint.x),
        y: Math.min(drag.startPoint.y, currentPoint.y),
        w: Math.abs(currentPoint.x - drag.startPoint.x),
        h: Math.abs(currentPoint.y - drag.startPoint.y),
      };

      const snapped =
        mockupNaturalSize && mockupSnapEnabled
          ? snapRectMovement(nextRect, mockupNaturalSize, mockupSnapThreshold, mockupGuidePreset)
          : { rect: nextRect, guide: { vertical: null, horizontal: null } };

      setMockupSnapGuide(snapped.guide);
      updateMockupRect(snapped.rect);
    };

    const onPointerUp = () => {
      mockupDrawGestureRef.current = null;
      setMockupSnapGuide({ vertical: null, horizontal: null });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [mockupNaturalSize, mockupSnapEnabled, mockupSnapThreshold, mockupGuidePreset, mockupViewport.panX, mockupViewport.panY, mockupViewport.zoom]);

  useEffect(() => {
    if (!mockupGesture) return;

    const onPointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - mockupGesture.startClientX;
      const deltaY = event.clientY - mockupGesture.startClientY;
      const scaleX = mockupGesture.stageWidth / (mockupNaturalSize?.width || mockupGesture.stageWidth);
      const scaleY = mockupGesture.stageHeight / (mockupNaturalSize?.height || mockupGesture.stageHeight);
      const nextDeltaX = deltaX / Math.max(0.1, scaleX * mockupViewport.zoom);
      const nextDeltaY = deltaY / Math.max(0.1, scaleY * mockupViewport.zoom);

      if (mockupGesture.mode === "move") {
        const nextRect = {
          x: mockupGesture.startRect.x + nextDeltaX,
          y: mockupGesture.startRect.y + nextDeltaY,
          w: mockupGesture.startRect.w,
          h: mockupGesture.startRect.h,
        };
        const snapped = mockupNaturalSize && mockupSnapEnabled
          ? snapRectMovement(nextRect, mockupNaturalSize, mockupSnapThreshold, mockupGuidePreset)
          : { rect: nextRect, guide: { vertical: null, horizontal: null } };
        setMockupSnapGuide(snapped.guide);
        updateMockupRect(snapped.rect);
        return;
      }

      const { handle } = mockupGesture;
      let nextX = mockupGesture.startRect.x;
      let nextY = mockupGesture.startRect.y;
      let nextW = mockupGesture.startRect.w;
      let nextH = mockupGesture.startRect.h;

      if (handle.includes("e")) nextW = mockupGesture.startRect.w + nextDeltaX;
      if (handle.includes("s")) nextH = mockupGesture.startRect.h + nextDeltaY;
      if (handle.includes("w")) {
        nextX = mockupGesture.startRect.x + nextDeltaX;
        nextW = mockupGesture.startRect.w - nextDeltaX;
      }
      if (handle.includes("n")) {
        nextY = mockupGesture.startRect.y + nextDeltaY;
        nextH = mockupGesture.startRect.h - nextDeltaY;
      }

      const snapped = mockupNaturalSize && mockupSnapEnabled
        ? snapRectResize({ x: nextX, y: nextY, w: nextW, h: nextH }, handle, mockupNaturalSize, mockupSnapThreshold, mockupGuidePreset)
        : { rect: { x: nextX, y: nextY, w: nextW, h: nextH }, guide: { vertical: null, horizontal: null } };
      setMockupSnapGuide(snapped.guide);
      updateMockupRect(snapped.rect);
    };

    const onPointerUp = () => {
      setMockupGesture(null);
      setMockupSnapGuide({ vertical: null, horizontal: null });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [mockupGesture, mockupNaturalSize, mockupViewport.zoom]);

  useEffect(() => {
    if (!mockupPanGesture) return;

    const onPointerMove = (event: PointerEvent) => {
      setMockupViewport((current) => ({
        ...current,
        panX: mockupPanGesture.startPanX + (event.clientX - mockupPanGesture.startClientX),
        panY: mockupPanGesture.startPanY + (event.clientY - mockupPanGesture.startClientY),
      }));
    };

    const onPointerUp = () => setMockupPanGesture(null);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [mockupPanGesture]);

  function duplicateLocalMockup(mockupId: string) {
    const mockup = localMockups.find((item) => item.id === mockupId);
    if (!mockup) return;
    const duplicated: MockupConfig = {
      ...mockup,
      id: `local-${slugify(mockup.name)}-copy-${Date.now()}`,
      name: `${mockup.name} copy`,
    };
    setLocalMockups((current) => [duplicated, ...current]);
    setActiveMockupPresetId(duplicated.id);
    setEditingMockupId(duplicated.id);
  }

  function deleteLocalMockup(mockupId: string) {
    setLocalMockups((current) => current.filter((mockup) => mockup.id !== mockupId));
    if (activeMockupPresetId === mockupId) {
      setActiveMockupPresetId(DEFAULT_MOCKUPS[0].id);
    }
    if (editingMockupId === mockupId) {
      setEditingMockupId(null);
    }
  }

  function exportMockupLibrary() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            localMockups,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    downloadBlob(blob, "podforge-mockups.json");
  }

  async function importMockupLibrary(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as Partial<{ localMockups: MockupConfig[] }>;
      if (Array.isArray(parsed.localMockups)) {
        const normalized = parsed.localMockups
          .map((mockup) => normalizeMockupConfig(mockup as LegacyMockupShape))
          .filter((mockup): mockup is MockupConfig => mockup !== null);
        setLocalMockups(normalized);
      }
      setError("Mockup library imported.");
    } catch (mockupLibraryError) {
      setError(`Could not import mockup library. ${(mockupLibraryError as Error).message}`);
    } finally {
      event.target.value = "";
    }
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
      localMockups,
      activePatternId,
      activeMockupPresetId,
      exportedAt: new Date().toISOString(),
      note: "This workspace JSON excludes imported custom font binary data on purpose, but it includes custom pattern data URLs for the current session.",
    };
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json" });
    downloadBlob(blob, "podforge-workspace.json");
  }

  async function importWorkspaceFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const workspace = JSON.parse(raw) as Partial<{
        template: string;
        templateValues: string;
        textSettings: TextSettings;
        graphicSlogans: string;
        graphicSettings: GraphicSettings;
        graphicDataUrl: string;
        patternSlogans: string;
        patternSettings: PatternSettings;
        customPatterns: PatternPreset[];
        localMockups: MockupConfig[];
        activePatternId: string;
        activeMockupPresetId: string;
      }>;

      if (typeof workspace.template === "string") setTemplate(workspace.template);
      if (typeof workspace.templateValues === "string") setTemplateValues(workspace.templateValues);
      if (workspace.textSettings) setTextSettings(workspace.textSettings);
      if (typeof workspace.graphicSlogans === "string") setGraphicSlogans(workspace.graphicSlogans);
      if (workspace.graphicSettings) setGraphicSettings(workspace.graphicSettings);
      if (typeof workspace.graphicDataUrl === "string") setGraphicDataUrl(workspace.graphicDataUrl);
      if (typeof workspace.patternSlogans === "string") setPatternSlogans(workspace.patternSlogans);
      if (workspace.patternSettings) setPatternSettings(workspace.patternSettings);
      if (Array.isArray(workspace.customPatterns)) setCustomPatterns(workspace.customPatterns);
      if (Array.isArray(workspace.localMockups)) {
        const normalized = workspace.localMockups
          .map((mockup) => normalizeMockupConfig(mockup as LegacyMockupShape))
          .filter((mockup): mockup is MockupConfig => mockup !== null);
        setLocalMockups(normalized);
      }
      if (typeof workspace.activePatternId === "string") setActivePatternId(workspace.activePatternId);
      if (typeof workspace.activeMockupPresetId === "string") setActiveMockupPresetId(workspace.activeMockupPresetId);
      setError("Workspace imported. Regenerate to refresh previews.");
    } catch (workspaceError) {
      setError(`Could not import workspace. ${(workspaceError as Error).message}`);
    } finally {
      event.target.value = "";
      setWorkspaceMenuOpen(false);
    }
  }

  function saveStylePreset(type: StylePresetType) {
    const trimmedName = presetName.trim() || `${type}-preset-${stylePresets.filter((preset) => preset.type === type).length + 1}`;
    const preset: StylePreset = {
      id: `${type}-${Date.now()}`,
      name: trimmedName,
      type,
      settings: type === "text" ? { ...textSettings } : type === "graphic" ? { ...graphicSettings } : { ...patternSettings },
      assetRef: type === "graphic" ? { kind: "image", dataUrl: graphicDataUrl } : type === "pattern" ? { kind: "tile", dataUrl: activePattern.dataUrl } : undefined,
    };
    setStylePresets((current) => [preset, ...current]);
    setPresetName("");
  }

  function duplicateStylePreset(presetId: string) {
    const preset = stylePresets.find((entry) => entry.id === presetId);
    if (!preset) return;
    setStylePresets((current) => [{ ...preset, id: `${preset.type}-${Date.now()}`, name: `${preset.name} copy` }, ...current]);
  }

  function applyStylePreset(preset: StylePreset) {
    if (preset.type === "text") setTextSettings({ ...(preset.settings as TextSettings) });
    if (preset.type === "graphic") {
      setGraphicSettings({ ...(preset.settings as GraphicSettings) });
      if (preset.assetRef?.kind === "image") setGraphicDataUrl(preset.assetRef.dataUrl);
    }
    if (preset.type === "pattern") {
      setPatternSettings({ ...(preset.settings as PatternSettings) });
      if (preset.assetRef?.kind === "tile") {
        const existing = patterns.find((pattern) => pattern.dataUrl === preset.assetRef?.dataUrl);
        if (existing) {
          setActivePatternId(existing.id);
        } else {
          const id = `preset-tile-${Date.now()}`;
          setCustomPatterns((current) => [...current, { id, name: `${preset.name} tile`, dataUrl: preset.assetRef!.dataUrl }]);
          setActivePatternId(id);
        }
      }
    }
  }

  const activeDesigns = tab === "templates" ? templateDesigns : tab === "graphic" ? graphicDesigns : patternDesigns;
  const currentPreviewBackground = tab === "pattern" ? patternPreviewBackground : previewBackground;
  const activeMockupPreset = mockups.find((preset) => preset.id === activeMockupPresetId) || mockups[0];

  function openPreview(design: GeneratedDesign) {
    setSelectedPreviewRef({ tool: design.tool, id: design.id });
    setPreviewViewport(DEFAULT_CANVAS_VIEW);
    setPreviewPanGesture(null);
    setGraphicEditorEnabled(false);
    graphicDragStateRef.current = null;
  }

  function updateDesignOverrides(tool: GeneratedDesignTool, id: string, patch: GeneratedDesignOverrides) {
    const updateCollection = (setCollection: typeof setTemplateDesigns | typeof setGraphicDesigns | typeof setPatternDesigns) => {
      setCollection((current) =>
        current.map((design) => {
          if (design.tool !== tool || design.id !== id) return design;
          const nextOverrides = { ...design.overrides, ...patch };
          return {
            ...design,
            overrides: nextOverrides,
            svg: renderGeneratedDesign({ ...design, overrides: nextOverrides }, customFonts),
          };
        }),
      );
    };

    if (tool === "templates") updateCollection(setTemplateDesigns);
    if (tool === "graphic") updateCollection(setGraphicDesigns);
    if (tool === "pattern") updateCollection(setPatternDesigns);
  }

  function adjustPreviewZoom(view: CanvasView, nextZoom: number, point: { x: number; y: number }) {
    const clampedZoom = Math.min(2.5, Math.max(0.5, nextZoom));
    const scale = clampedZoom / view.zoom;
    return {
      zoom: clampedZoom,
      panX: point.x - (point.x - view.panX) * scale,
      panY: point.y - (point.y - view.panY) * scale,
    };
  }

  function startPreviewPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (!previewStageRef.current) return;
    event.preventDefault();
    setPreviewPanGesture({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: previewViewport.panX,
      startPanY: previewViewport.panY,
    });
  }

  function handlePreviewWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!previewStageRef.current) return;
    event.preventDefault();
    const rect = previewStageRef.current.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setPreviewViewport((current) => adjustPreviewZoom(current, current.zoom + delta, point));
  }

  function resetPreviewViewport() {
    setPreviewViewport(DEFAULT_CANVAS_VIEW);
    setPreviewPanGesture(null);
  }

  function startGraphicDrag(event: ReactPointerEvent<HTMLButtonElement>, design: GeneratedDesign) {
    if (design.tool !== "graphic" || !previewStageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    if (!graphicEditorEnabled) return;

    const rect = previewStageRef.current.getBoundingClientRect();
    graphicDragStateRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: design.overrides.graphicOffsetX ?? 0,
      startOffsetY: design.overrides.graphicOffsetY ?? 0,
      stageWidth: rect.width,
      stageHeight: rect.height,
    };
  }

  useEffect(() => {
    if (!graphicDragStateRef.current || !selectedPreview || selectedPreview.tool !== "graphic") return;

    const onPointerMove = (event: PointerEvent) => {
      const drag = graphicDragStateRef.current;
      if (!drag) return;
      const zoomFactor = Math.max(0.5, previewViewport.zoom);
      const nextOffsetX = drag.startOffsetX + (((event.clientX - drag.startClientX) / Math.max(1, drag.stageWidth)) * WIDTH) / zoomFactor;
      const nextOffsetY = drag.startOffsetY + (((event.clientY - drag.startClientY) / Math.max(1, drag.stageHeight)) * HEIGHT) / zoomFactor;
      updateDesignOverrides(selectedPreview.tool, selectedPreview.id, {
        graphicOffsetX: nextOffsetX,
        graphicOffsetY: nextOffsetY,
      });
    };

    const onPointerUp = () => {
      graphicDragStateRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [selectedPreview, graphicEditorEnabled, previewViewport.zoom]);

  useEffect(() => {
    if (!previewPanGesture) return;

    const onPointerMove = (event: PointerEvent) => {
      setPreviewViewport((current) => ({
        ...current,
        panX: previewPanGesture.startPanX + (event.clientX - previewPanGesture.startClientX),
        panY: previewPanGesture.startPanY + (event.clientY - previewPanGesture.startClientY),
      }));
    };

    const onPointerUp = () => setPreviewPanGesture(null);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [previewPanGesture]);

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
      <input
        ref={workspaceInputRef}
        type="file"
        accept="application/json,.json"
        onChange={importWorkspaceFile}
        className="sr-only"
      />
      <input
        ref={mockupInputRef}
        type="file"
        accept="application/json,.json"
        onChange={importMockupLibrary}
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
                savePreset={() => saveStylePreset("text")}
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
                savePreset={() => saveStylePreset("graphic")}
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
                savePreset={() => saveStylePreset("pattern")}
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
            designs={activeDesigns}
            background={currentPreviewBackground}
            onDownload={downloadDesign}
            onDownloadMockup={downloadMockupDesign}
            onDownloadZip={() => downloadZip(activeDesigns, `${tab}-designs.zip`)}
            onPreview={openPreview}
            zipProgress={zipProgress}
            onCancelZip={() => {
              zipCancelRef.current = true;
            }}
            mockupPresets={mockups}
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
          mockups={mockups}
          activeMockupPresetId={activeMockupPresetId}
          setActiveMockupPresetId={setActiveMockupPresetId}
          mockupName={mockupName}
          setMockupName={setMockupName}
          mockupBaseDataUrl={mockupBaseDataUrl}
          mockupNaturalSize={mockupNaturalSize}
          setMockupNaturalSize={setMockupNaturalSize}
          mockupStageRef={mockupStageRef}
          mockupSnapGuide={mockupSnapGuide}
          mockupSnapEnabled={mockupSnapEnabled}
          setMockupSnapEnabled={setMockupSnapEnabled}
          mockupGuidePreset={mockupGuidePreset}
          setMockupGuidePreset={setMockupGuidePreset}
          mockupSnapThreshold={mockupSnapThreshold}
          setMockupSnapThreshold={setMockupSnapThreshold}
          mockupGridStep={mockupGridStep}
          setMockupGridStep={setMockupGridStep}
          pushMockupHistory={pushMockupHistory}
          mockupX={mockupX}
          setMockupX={(value) => {
            pushMockupHistory();
            setMockupX(value);
          }}
          mockupY={mockupY}
          setMockupY={(value) => {
            pushMockupHistory();
            setMockupY(value);
          }}
          mockupW={mockupW}
          setMockupW={(value) => {
            pushMockupHistory();
            setMockupW(value);
          }}
          mockupH={mockupH}
          setMockupH={(value) => {
            pushMockupHistory();
            setMockupH(value);
          }}
          handleMockupImageUpload={handleMockupImageUpload}
          startMockupDraw={startMockupDraw}
          handleMockupWheel={handleMockupWheel}
          startMockupResize={startMockupResize}
          saveLocalMockup={saveLocalMockup}
          resetMockupEditor={resetMockupEditor}
          canUndoMockup={canUndoMockup}
          canRedoMockup={canRedoMockup}
          undoMockupHistory={undoMockupHistory}
          redoMockupHistory={redoMockupHistory}
          deleteLocalMockup={deleteLocalMockup}
          duplicateLocalMockup={duplicateLocalMockup}
          editLocalMockup={editLocalMockup}
          exportMockupLibrary={exportMockupLibrary}
          importMockupLibrary={() => mockupInputRef.current?.click()}
          stylePresets={stylePresets}
          presetName={presetName}
          setPresetName={setPresetName}
          applyStylePreset={applyStylePreset}
          duplicateStylePreset={duplicateStylePreset}
          activeTab={tab}
        />
      )}

      <footer className={styles.footerBar}>
        <span>▣ 100% client-side: files never leave your browser.</span>
        <span>⚠ Current workspace is temporary browser memory.</span>
        <span className={styles.footerCredits}>
          Created by <a href="https://dev.jbqneto.com/" target="_blank" rel="noreferrer">JBQNETO</a>, but Credits to <a target="_blank" rel="noreferrer" href="https://www.youtube.com/watch?v=6VvXdQr-vzY">Alek</a>
        </span>
        <div className={styles.footerActions}>
          <a className={styles.githubLink} href="https://github.com/jbqneto/podforge-studio" target="_blank" rel="noreferrer" aria-label="Open the GitHub repository">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.68c-2.78.61-3.37-1.18-3.37-1.18-.46-1.17-1.12-1.48-1.12-1.48-.92-.63.07-.62.07-.62 1.02.07 1.56 1.05 1.56 1.05.9 1.55 2.36 1.1 2.93.84.09-.66.35-1.1.64-1.35-2.22-.26-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.26-.45-1.33.1-2.77 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.44.2 2.51.1 2.77.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.91.68 1.84v2.72c0 .26.18.58.69.48A10 10 0 0 0 12 2Z" />
            </svg>
            GitHub
          </a>
          <div className={styles.workspaceMenuWrap}>
            <button className={styles.secondaryButton} onClick={() => setWorkspaceMenuOpen((current) => !current)}>Workspace</button>
            {workspaceMenuOpen && (
              <div className={styles.workspaceMenu} role="menu" aria-label="Workspace actions">
                <button className={styles.workspaceMenuItem} onClick={() => workspaceInputRef.current?.click()}>Import</button>
                <button className={styles.workspaceMenuItem} onClick={exportWorkspace}>Export</button>
              </div>
            )}
          </div>
        </div>
      </footer>

      {selectedPreview && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.modalActions}>
              <div className={styles.modalViewTools}>
                <button className={styles.smallButton} onClick={() => {
                  const rect = previewStageRef.current?.getBoundingClientRect();
                  const point = rect ? { x: rect.width / 2, y: rect.height / 2 } : { x: 0, y: 0 };
                  setPreviewViewport((current) => adjustPreviewZoom(current, current.zoom - 0.1, point));
                }}>-</button>
                <button className={styles.smallButton} onClick={() => {
                  const rect = previewStageRef.current?.getBoundingClientRect();
                  const point = rect ? { x: rect.width / 2, y: rect.height / 2 } : { x: 0, y: 0 };
                  setPreviewViewport((current) => adjustPreviewZoom(current, current.zoom + 0.1, point));
                }}>+</button>
                <button className={styles.smallButton} onClick={resetPreviewViewport}>Reset View</button>
              </div>
              <button className={styles.secondaryButton} onClick={() => {
                setPreviewPanGesture(null);
                setSelectedPreviewRef(null);
                setGraphicEditorEnabled(false);
                graphicDragStateRef.current = null;
              }}>Close</button>
            </div>
            <div className={styles.modalBody}>
              <div
                ref={previewStageRef}
                className={styles.modalPreviewFrame}
                onPointerDown={startPreviewPan}
                onWheel={handlePreviewWheel}
              >
                <div
                  className={styles.modalPreviewCanvas}
                  style={{
                    transform: `translate(${previewViewport.panX}px, ${previewViewport.panY}px) scale(${previewViewport.zoom})`,
                  }}
                >
                  <div
                    className={`${styles.designSurface} ${styles.modalPreview} ${getBackgroundClass(currentPreviewBackground, checkerStyles)}`}
                    style={getBackgroundStyle(currentPreviewBackground)}
                    dangerouslySetInnerHTML={{ __html: selectedPreview.svg }}
                  />
                  {selectedPreview.tool === "graphic" && selectedPreviewGraphicBox && (
                    <button
                      type="button"
                      className={`${styles.graphicEditorOverlay} ${graphicEditorEnabled ? styles.graphicEditorOverlayActive : ""}`}
                      style={{
                        left: `${(selectedPreviewGraphicBox.x / WIDTH) * 100}%`,
                        top: `${(selectedPreviewGraphicBox.y / HEIGHT) * 100}%`,
                        width: `${(selectedPreviewGraphicBox.width / WIDTH) * 100}%`,
                        height: `${(selectedPreviewGraphicBox.height / HEIGHT) * 100}%`,
                      }}
                      aria-label="Drag graphic remix image"
                      onDoubleClick={() => setGraphicEditorEnabled((current) => !current)}
                      onPointerDown={(event) => startGraphicDrag(event, selectedPreview)}
                    >
                      <span>{graphicEditorEnabled ? "Drag image" : "Double-click to edit image"}</span>
                    </button>
                  )}
                </div>
              </div>
              <aside className={styles.modalSidebar}>
                {selectedPreview.tool === "templates" && selectedPreviewTextFontSize !== null && (
                  <div className={styles.modalInspectorCard}>
                    <h3>Item config</h3>
                    <p className={styles.helpText}>Adjust the font size only for this card.</p>
                    <Range
                      label="Font Size"
                      value={selectedPreviewTextFontSize}
                      min={120}
                      max={900}
                      step={10}
                      suffix="px"
                      onChange={(fontSize) => updateDesignOverrides(selectedPreview.tool, selectedPreview.id, { textFontSize: fontSize })}
                    />
                  </div>
                )}
                {selectedPreview.tool === "graphic" && selectedPreviewGraphicBox && (
                  <div className={styles.modalInspectorCard}>
                    <h3>Graphic remix edit</h3>
                    <p className={styles.helpText}>Double-click the image area, then drag it to shift this item only.</p>
                    <label className={styles.toggleRow}>
                      <input
                        type="checkbox"
                        checked={graphicEditorEnabled}
                        onChange={(event) => {
                          setGraphicEditorEnabled(event.target.checked);
                          if (!event.target.checked) graphicDragStateRef.current = null;
                        }}
                      />
                      <span>Enable image drag editor</span>
                    </label>
                    <Range
                      label="Slogan Font Size"
                      value={getDesignTextFontSize(selectedPreview)}
                      min={120}
                      max={700}
                      step={10}
                      suffix="px"
                      onChange={(fontSize) => updateDesignOverrides(selectedPreview.tool, selectedPreview.id, { textFontSize: fontSize })}
                    />
                    <div className={styles.gridTwo}>
                      <div>
                        <label className={styles.label}>Offset X</label>
                        <input
                          className={styles.input}
                          type="number"
                          value={Math.round(selectedPreview.overrides.graphicOffsetX ?? 0)}
                          onChange={(event) => updateDesignOverrides(selectedPreview.tool, selectedPreview.id, { graphicOffsetX: Number(event.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className={styles.label}>Offset Y</label>
                        <input
                          className={styles.input}
                          type="number"
                          value={Math.round(selectedPreview.overrides.graphicOffsetY ?? 0)}
                          onChange={(event) => updateDesignOverrides(selectedPreview.tool, selectedPreview.id, { graphicOffsetY: Number(event.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <p className={styles.helpText}>The overlay box matches the graphic position in the SVG preview.</p>
                  </div>
                )}
                {selectedPreview.tool === "pattern" && (
                  <div className={styles.modalInspectorCard}>
                    <h3>Item config</h3>
                    <p className={styles.helpText}>Adjust the font size only for this card.</p>
                    <Range
                      label="Font Size"
                      value={getDesignTextFontSize(selectedPreview)}
                      min={200}
                      max={1200}
                      step={10}
                      suffix="px"
                      onChange={(fontSize) => updateDesignOverrides(selectedPreview.tool, selectedPreview.id, { textFontSize: fontSize })}
                    />
                  </div>
                )}
                <div className={styles.modalInspectorCard}>
                  <h3>Preview controls</h3>
                  <p className={styles.helpText}>Use zoom and pan to inspect the current card before exporting.</p>
                  <button className={styles.smallButton} onClick={() => downloadDesign(selectedPreview)}>Download PNG</button>
                </div>
              </aside>
            </div>
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
  savePreset: () => void;
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
        <button className={styles.secondaryButton} onClick={props.savePreset}>♡ Save StylePreset</button>
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
  savePreset: () => void;
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
        <button className={styles.secondaryButton} onClick={props.savePreset}>♡ Save StylePreset</button>
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
  savePreset: () => void;
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
      <div className={styles.row}>
        <button className={styles.secondaryButton} onClick={props.savePreset}>♡ Save StylePreset</button>
        <button className={styles.primaryButton} onClick={props.generate}>✦ Generate</button>
      </div>
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
  zipProgress: ZipProgress;
  onCancelZip: () => void;
  mockupPresets: MockupConfig[];
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
      {props.zipProgress.total > 0 && (
        <div className={styles.zipStatus}>
          <p>
            ZIP progress: {props.zipProgress.processed}/{props.zipProgress.total} · ok {props.zipProgress.ok} · erro {props.zipProgress.error}
            {props.zipProgress.cancelled ? " · cancelled" : ""}
          </p>
          {props.zipProgress.active && <button className={styles.smallButton} onClick={props.onCancelZip}>Cancel ZIP</button>}
          {!!props.zipProgress.report.length && (
            <details>
              <summary>Export report (ok/error by file)</summary>
              <ul>
                {props.zipProgress.report.map((item) => (
                  <li key={`${item.filename}-${item.status}`}>
                    {item.filename}: {item.status}{item.message ? ` (${item.message})` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      <div className={styles.controlGroup}>
        <h3>Showcase Mockup (Optional)</h3>
        <label className={styles.label}>Built-in and saved mockups</label>
        <select className={styles.select} value={props.activeMockupPresetId} onChange={(event) => props.setActiveMockupPresetId(event.target.value)}>
          {props.mockupPresets.map((preset) => (
            <option key={preset.id} value={preset.id}>{preset.name}</option>
          ))}
        </select>
        {selectedMockup.id !== "none" && <p className={styles.helpText}>Area: x {selectedMockup.drawArea.x}, y {selectedMockup.drawArea.y}, w {selectedMockup.drawArea.w}, h {selectedMockup.drawArea.h}</p>}
      </div>
      {!props.designs.length ? (
        <div className={styles.warningInline}>Generate designs to see previews here.</div>
      ) : (
        <div className={styles.previewGrid}>
          {props.designs.map((design) => (
            <article key={design.id} className={styles.previewCard}>
              <button
                aria-label={`Open enlarged preview for ${design.label}`}
                className={`${styles.designSurface} ${getBackgroundClass(props.background, { checker: styles.checker })}`}
                style={getBackgroundStyle(props.background)}
                onClick={() => props.onPreview(design)}
                dangerouslySetInnerHTML={{ __html: design.svg }}
              />
              <div className={styles.cardActions}>
                <button className={styles.smallButton} onClick={() => props.onDownload(design)}>↓ Download PNG</button>
                <button className={styles.smallButton} disabled={props.activeMockupPresetId === "none"} onClick={() => props.onDownloadMockup(design)}>↓ Download Mockup</button>
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
  mockups: MockupConfig[];
  activeMockupPresetId: string;
  setActiveMockupPresetId: (value: string) => void;
  mockupName: string;
  setMockupName: (value: string) => void;
  mockupBaseDataUrl: string;
  mockupNaturalSize: { width: number; height: number } | null;
  setMockupNaturalSize: (value: { width: number; height: number } | null) => void;
  mockupStageRef: RefObject<HTMLDivElement | null>;
  mockupSnapGuide: SnapGuide;
  mockupSnapEnabled: boolean;
  setMockupSnapEnabled: (value: boolean) => void;
  mockupGuidePreset: GuidePreset;
  setMockupGuidePreset: (value: GuidePreset) => void;
  mockupSnapThreshold: number;
  setMockupSnapThreshold: (value: number) => void;
  mockupGridStep: number;
  setMockupGridStep: (value: number) => void;
  pushMockupHistory: () => void;
  mockupX: number;
  setMockupX: (value: number) => void;
  mockupY: number;
  setMockupY: (value: number) => void;
  mockupW: number;
  setMockupW: (value: number) => void;
  mockupH: number;
  setMockupH: (value: number) => void;
  handleMockupImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  startMockupDraw: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handleMockupWheel: (event: ReactWheelEvent<HTMLDivElement>) => void;
  startMockupResize: (handle: "nw" | "ne" | "sw" | "se", event: ReactPointerEvent<HTMLButtonElement>) => void;
  saveLocalMockup: () => void;
  resetMockupEditor: () => void;
  canUndoMockup: boolean;
  canRedoMockup: boolean;
  undoMockupHistory: () => void;
  redoMockupHistory: () => void;
  editLocalMockup: (id: string) => void;
  deleteLocalMockup: (id: string) => void;
  duplicateLocalMockup: (id: string) => void;
  exportMockupLibrary: () => void;
  importMockupLibrary: () => void;
  stylePresets: StylePreset[];
  presetName: string;
  setPresetName: (value: string) => void;
  applyStylePreset: (preset: StylePreset) => void;
  duplicateStylePreset: (presetId: string) => void;
  activeTab: ToolTab;
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
        <h3>Local Mockups</h3>
        <p className={styles.helpText}>Three defaults are built in. Save reusable custom mockups with a base image and a drawing area in this browser only.</p>
        <div className={styles.mockupToolbar}>
          <div className={styles.mockupZoomControls}>
            <button className={styles.smallButton} disabled={!props.canUndoMockup} onClick={props.undoMockupHistory}>Undo</button>
            <button className={styles.smallButton} disabled={!props.canRedoMockup} onClick={props.redoMockupHistory}>Redo</button>
          </div>
          <p className={styles.helpText}>
            Drag across the image to define the print area. The canvas does not zoom or pan with the mouse wheel.
          </p>
        </div>
        <div className={styles.controlGroup}>
          <h3>Snap & Guides</h3>
          <label className={styles.toggleRow}>
            <input type="checkbox" checked={props.mockupSnapEnabled} onChange={(event) => props.setMockupSnapEnabled(event.target.checked)} />
            <span>Enable snapping</span>
          </label>
          <label className={styles.label}>Guide preset</label>
          <select className={styles.select} value={props.mockupGuidePreset} onChange={(event) => props.setMockupGuidePreset(event.target.value as GuidePreset)}>
            <option value="edges-center">Edges + center</option>
            <option value="quarters">Quarters</option>
            <option value="thirds">Thirds</option>
            <option value="eighths">Fine grid</option>
          </select>
          <Range label="Snap tolerance" value={props.mockupSnapThreshold} min={8} max={60} step={1} onChange={props.setMockupSnapThreshold} suffix="px" />
          <Range label="Grid step" value={props.mockupGridStep} min={12} max={80} step={2} onChange={props.setMockupGridStep} suffix="px" />
        </div>
        <div
          ref={props.mockupStageRef}
          className={styles.mockupStageViewport}
          onPointerDown={props.startMockupDraw}
          onWheel={props.handleMockupWheel}
          style={props.mockupNaturalSize ? { aspectRatio: `${props.mockupNaturalSize.width} / ${props.mockupNaturalSize.height}` } : undefined}
        >
          {props.mockupBaseDataUrl ? (
            <>
              <div className={styles.mockupRulerTop} />
              <div className={styles.mockupRulerLeft} />
              <div
                className={styles.mockupCanvas}
                style={{
                  transform: "translate(0px, 0px) scale(1)",
                }}
              >
                <img
                  src={props.mockupBaseDataUrl}
                  className={styles.mockupStageImage}
                  alt="Mockup base preview"
                  onLoad={(event) => props.setMockupNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                />
                <div className={styles.mockupStageGrid} style={{ backgroundSize: `${props.mockupGridStep}px ${props.mockupGridStep}px` }} />
                <div
                  className={styles.mockupStageOverlay}
                  style={{
                    left: props.mockupNaturalSize ? `${(Math.max(0, props.mockupX) / props.mockupNaturalSize.width) * 100}%` : `${Math.max(0, props.mockupX)}px`,
                    top: props.mockupNaturalSize ? `${(Math.max(0, props.mockupY) / props.mockupNaturalSize.height) * 100}%` : `${Math.max(0, props.mockupY)}px`,
                    width: props.mockupNaturalSize ? `${(Math.max(1, props.mockupW) / props.mockupNaturalSize.width) * 100}%` : `${Math.max(1, props.mockupW)}px`,
                    height: props.mockupNaturalSize ? `${(Math.max(1, props.mockupH) / props.mockupNaturalSize.height) * 100}%` : `${Math.max(1, props.mockupH)}px`,
                  }}
                />
                <div className={styles.mockupOverlayMeta}>
                  x {Math.round(props.mockupX)} y {Math.round(props.mockupY)} w {Math.round(props.mockupW)} h {Math.round(props.mockupH)}
                </div>
                <div className={styles.mockupDrawHint}>
                  Drag anywhere to set the print area
                </div>
                {props.mockupSnapGuide.vertical !== null && props.mockupNaturalSize && (
                  <div
                    className={styles.mockupGuideVertical}
                    style={{ left: `${(props.mockupSnapGuide.vertical / props.mockupNaturalSize.width) * 100}%` }}
                  />
                )}
                {props.mockupSnapGuide.horizontal !== null && props.mockupNaturalSize && (
                  <div
                    className={styles.mockupGuideHorizontal}
                    style={{ top: `${(props.mockupSnapGuide.horizontal / props.mockupNaturalSize.height) * 100}%` }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className={styles.mockupStageEmpty}>Upload a base image to edit the print area visually.</div>
          )}
        </div>
        <label className={styles.label}>Mockup name</label>
        <input className={styles.input} value={props.mockupName} onChange={(event) => {
          props.pushMockupHistory();
          props.setMockupName(event.target.value);
        }} />
        <label className={styles.label}>Mockup base image</label>
        <input className={styles.input} type="file" accept="image/png,image/jpeg,image/webp" onChange={props.handleMockupImageUpload} />
        <div className={styles.mockupSummaryGrid}>
          <div className={styles.mockupSummaryItem}>
            <span>Position</span>
            <strong>x {Math.round(props.mockupX)} / y {Math.round(props.mockupY)}</strong>
          </div>
          <div className={styles.mockupSummaryItem}>
            <span>Size</span>
            <strong>w {Math.round(props.mockupW)} / h {Math.round(props.mockupH)}</strong>
          </div>
          <div className={styles.mockupSummaryItem}>
            <span>Editing</span>
            <strong>{props.mockupNaturalSize ? "Active" : "Waiting for image"}</strong>
          </div>
        </div>
        <div className={styles.row} style={{ marginTop: 12 }}>
          <button className={styles.primaryButton} onClick={props.saveLocalMockup}>Save Mockup</button>
          <button className={styles.secondaryButton} onClick={props.resetMockupEditor}>New Mockup</button>
          <button className={styles.secondaryButton} onClick={props.exportMockupLibrary}>Export Library</button>
          <button className={styles.secondaryButton} onClick={props.importMockupLibrary}>Import Library</button>
        </div>
        <div className={styles.controlGroup} style={{ marginTop: 16 }}>
          <h3>Saved mockups</h3>
          <label className={styles.label}>Choose mockup</label>
          <select className={styles.select} value={props.activeMockupPresetId} onChange={(event) => {
            props.pushMockupHistory();
            props.setActiveMockupPresetId(event.target.value);
          }}>
            {props.mockups.map((mockup) => (
              <option key={mockup.id} value={mockup.id}>{mockup.name}</option>
            ))}
          </select>
          <div className={styles.chipList} style={{ marginTop: 12 }}>
            {props.mockups.filter((mockup) => mockup.id.startsWith("local-")).map((mockup) => (
              <div key={mockup.id} className={styles.row}>
                <button className={`${styles.chip} ${props.activeMockupPresetId === mockup.id ? styles.activeChip : ""}`} onClick={() => props.editLocalMockup(mockup.id)}>{mockup.name}</button>
                <button className={styles.smallButton} onClick={() => props.duplicateLocalMockup(mockup.id)}>Duplicate</button>
                <button className={styles.smallButton} onClick={() => props.deleteLocalMockup(mockup.id)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.infoCard}>
        <h3>StylePreset Entity</h3>
        <p>Save a reusable visual style (type + complete settings + image/tile reference when applicable), duplicate it, and apply it for batch generation.</p>
        <label className={styles.label}>Preset name</label>
        <input className={styles.input} value={props.presetName} onChange={(event) => props.setPresetName(event.target.value)} placeholder="Ex: western-vintage-v1" />
        {!props.stylePresets.length ? (
          <p>No StylePreset saved yet. Save from Text, Graphic, or Pattern tabs.</p>
        ) : (
          <div className={styles.chipList}>
            {props.stylePresets.map((preset) => (
              <div key={preset.id} className={styles.row}>
                <button className={styles.chip} onClick={() => props.applyStylePreset(preset)}>
                  {preset.name} [{preset.type}]
                </button>
                <button className={styles.smallButton} onClick={() => props.duplicateStylePreset(preset.id)}>Duplicate</button>
              </div>
            ))}
          </div>
        )}
        <p className={styles.helpText}>Apply a preset, go to the matching tab, edit the phrase list and click Generate to create N designs with the same visual style.</p>
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
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const isCustomColor = !props.presets.some((preset) => preset.value.toLowerCase() === props.value.toLowerCase());
  const customLabel = isCustomColor ? props.value.toUpperCase() : "Custom";

  return (
    <>
      <label className={styles.label}>Color</label>
      <div className={styles.colorGrid}>
        {props.presets.map((preset) => (
          <button type="button" key={preset.value} className={`${styles.colorChip} ${props.value === preset.value ? styles.activeChip : ""}`} onClick={() => props.onChange(preset.value)}>
            <span className={styles.colorSwatch} style={{ background: preset.value }} />
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          className={`${styles.colorChip} ${styles.customColorChip} ${isCustomColor ? styles.activeChip : ""}`}
          onClick={() => colorInputRef.current?.click()}
        >
          <span className={styles.colorSwatch} style={{ background: props.value }} />
          {customLabel}
        </button>
      </div>
      <input
        ref={colorInputRef}
        className="sr-only"
        type="color"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
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
