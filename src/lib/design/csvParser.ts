export type CsvDataError = {
  error: string;
};

export type SinglePlaceholderEntry = {
  rawValue: string;
  replacements: Record<string, string>;
};

export type MultiPlaceholderEntry = {
  rawValue: string;
  replacements: Record<string, string>;
};

export function parseSimpleList(valuesInput: string, placeholder: string): SinglePlaceholderEntry[] | CsvDataError {
  const values = valuesInput
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!values.length) {
    return { error: "Add at least one value." };
  }

  return values.map((value) => ({
    rawValue: value,
    replacements: { [placeholder]: value },
  }));
}

export function parseCsvByHeaders(valuesInput: string, requiredColumns: string[]): MultiPlaceholderEntry[] | CsvDataError {
  const rows = valuesInput
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!rows.length) {
    return { error: "CSV header is required for multiple placeholders." };
  }

  const headers = rows[0].split(",").map((cell) => cell.trim());
  if (!headers.length || headers.some((header) => !header)) {
    return { error: "CSV header is required for multiple placeholders." };
  }

  const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length) {
    return { error: `CSV column not found: ${missingColumns.join(", ")}.` };
  }

  const dataRows = rows.slice(1);
  if (!dataRows.length) {
    return { error: "CSV must include at least one data row." };
  }

  const headerIndexes = requiredColumns.map((column) => headers.indexOf(column));

  const entries: MultiPlaceholderEntry[] = [];

  for (const [rowIndex, row] of dataRows.entries()) {
    const cells = row.split(",").map((cell) => cell.trim());
    for (let index = 0; index < headerIndexes.length; index += 1) {
      const columnIndex = headerIndexes[index];
      if (columnIndex < 0 || columnIndex >= cells.length || !cells[columnIndex]) {
        return { error: `Incomplete CSV row at line ${rowIndex + 2}: missing value for column \"${requiredColumns[index]}\".` };
      }
    }

    const replacements: Record<string, string> = {};
    requiredColumns.forEach((column, idx) => {
      replacements[column] = cells[headerIndexes[idx]];
    });

    entries.push({
      rawValue: row,
      replacements,
    });
  }

  return entries;
}
