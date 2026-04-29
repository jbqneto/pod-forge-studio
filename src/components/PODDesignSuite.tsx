"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import {
  type Align,
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
  splitText,
  svgDataUrl,
  svgToPngBlob,
  type CustomFont,
  type FontSource,
  type GeneratedDesign,
  type GraphicSettings,
  type PatternPreset,
  type PatternSettings,
  type PreviewBackground,
  type ToolTab,
  type TextEffect,
  type TextSettings,
  type Transform,
} from "@/lib/podforge";
import styles from "./PODDesignSuite.module.css";

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
  const fontInputRef = useRef<HTMLInputElement | null>(null);

  const checkerStyles = { checker: styles.checker };

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
    const values = parseLines(templateValues);
    if (!template.trim()) return setError("Template is required.");
    if (!values.length) return setError("Add at least one value.");
    const placeholderMatches = Array.from(template.matchAll(/\{([^}]+)\}/g)).map((match) => match[1]);
    if (!placeholderMatches.length) return setError("Template must include at least one {placeholder}.");

    const designs = values.map((rawValue, index) => {
      let finalText = template;
      if (placeholderMatches.length === 1) {
        finalText = template.replaceAll(`{${placeholderMatches[0]}}`, rawValue);
      } else {
        const rows = templateValues.split(/\r?\n/g).filter(Boolean);
        const headers = rows[0]?.split(",").map((header) => header.trim()) || [];
        const data = rows[index + 1]?.split(",").map((cell) => cell.trim()) || rawValue.split(",").map((cell) => cell.trim());
        placeholderMatches.forEach((placeholder) => {
          const dataIndex = headers.indexOf(placeholder);
          finalText = finalText.replaceAll(`{${placeholder}}`, data[dataIndex] || data[0] || placeholder);
        });
      }
      const transformed = applyTransform(finalText, textSettings.transform);
      const lines = splitText(transformed, textSettings.lineBreakMode);
      const svg = lineTextSvg(lines, textSettings, customFonts);
      return {
        id: `template-${index}`,
        label: finalText,
        filename: `${slugify(template)}-${slugify(rawValue)}.png`,
        svg,
      };
    });
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
            onDownloadZip={() => downloadZip(currentDesigns, `${tab}-designs.zip`)}
            onPreview={setSelectedPreview}
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
            <div className={`${styles.designSurface} ${getBackgroundClass(currentPreviewBackground, checkerStyles)}`} style={getBackgroundStyle(currentPreviewBackground)} dangerouslySetInnerHTML={{ __html: selectedPreview.svg }} />
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
  onDownloadZip: () => void;
  onPreview: (design: GeneratedDesign) => void;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.previewHeader}>
        <h2 className={styles.panelTitle}>Preview Grid</h2>
        <button className={styles.primaryButton} disabled={!props.designs.length} onClick={props.onDownloadZip}>↓ Download All ZIP</button>
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
