import Papa from "papaparse";

export type CsvRow = Record<string, string>;

export function parseCsv(raw: string): CsvRow[] {
  const result = Papa.parse<Record<string, unknown>>(raw, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  return result.data.map((row) => {
    const clean: CsvRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (!key) continue;
      clean[key] = value == null ? "" : String(value).trim();
    }
    return clean;
  });
}


export function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}
