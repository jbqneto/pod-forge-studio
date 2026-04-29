export type PlaceholderMode = "single-placeholder-list" | "multi-placeholder-csv";

export type PlaceholderParseSuccess = {
  mode: PlaceholderMode;
  placeholders: string[];
};

export type PlaceholderParseError = {
  error: string;
};

const PLACEHOLDER_REGEX = /\{([^}]+)\}/g;

export function parseTemplatePlaceholders(template: string): PlaceholderParseSuccess | PlaceholderParseError {
  const normalizedTemplate = template.trim();
  if (!normalizedTemplate) {
    return { error: "Template is required." };
  }

  const placeholders = Array.from(normalizedTemplate.matchAll(PLACEHOLDER_REGEX))
    .map((match) => match[1].trim())
    .filter(Boolean);

  if (!placeholders.length) {
    return { error: "Template must include at least one {placeholder}." };
  }

  const uniquePlaceholders = Array.from(new Set(placeholders));
  const mode: PlaceholderMode = uniquePlaceholders.length === 1 ? "single-placeholder-list" : "multi-placeholder-csv";

  return {
    mode,
    placeholders: uniquePlaceholders,
  };
}
