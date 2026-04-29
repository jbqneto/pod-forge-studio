export type TemplateParseRow = {
  sourceLine: number;
  values: string[];
};

export type ParsedTemplateInput = {
  placeholders: string[];
  rows: TemplateParseRow[];
};

export function extractPlaceholders(template: string): string[] {
  return Array.from(template.matchAll(/\{([^}]+)\}/g)).map((match) => match[1].trim()).filter(Boolean);
}

function parseCsvRow(row: string): string[] {
  return row.split(",").map((cell) => cell.trim());
}

export function parseTemplateInput(template: string, rawInput: string): ParsedTemplateInput {
  const placeholders = extractPlaceholders(template);
  if (!template.trim()) throw new Error("Template is required.");
  if (!placeholders.length) throw new Error("Template must include at least one {placeholder}.");

  const lines = rawInput.split(/\r?\n/g);
  const nonEmpty = lines
    .map((line, index) => ({ line: line.trim(), sourceLine: index + 1 }))
    .filter((entry) => entry.line.length > 0);

  if (!nonEmpty.length) throw new Error("Add at least one value.");

  if (placeholders.length === 1) {
    return {
      placeholders,
      rows: nonEmpty.map((entry) => ({ sourceLine: entry.sourceLine, values: [entry.line] })),
    };
  }

  const [headerRow, ...dataRows] = nonEmpty;
  const headers = parseCsvRow(headerRow.line);
  const missingHeaders = placeholders.filter((placeholder) => !headers.includes(placeholder));
  if (missingHeaders.length) {
    throw new Error(`CSV header is missing placeholder columns: ${missingHeaders.join(", ")}.`);
  }

  if (!dataRows.length) throw new Error("CSV input needs at least one data row below the header.");

  const mappedRows = dataRows.map((row) => {
    const values = parseCsvRow(row.line);
    if (values.length < headers.length) {
      throw new Error(`CSV row ${row.sourceLine} has fewer columns than header.`);
    }
    return {
      sourceLine: row.sourceLine,
      values: headers.map((header, index) => values[index] || header),
    };
  });

  return { placeholders, rows: mappedRows };
}
