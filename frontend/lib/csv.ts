import Papa from "papaparse";

export type CsvRow = Record<string, string>;

export interface ParsedCsv {
  headers: string[];
  rows: CsvRow[];
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const headers = (result.meta.fields ?? []).filter(Boolean) as string[];
        const rows: CsvRow[] = result.data.map((row) => {
          const clean: CsvRow = {};
          for (const h of headers) {
            const v = (row as Record<string, unknown>)[h];
            clean[h] = v == null ? "" : String(v).trim();
          }
          return clean;
        });
        resolve({ headers, rows });
      },
      error: (err) => reject(err),
    });
  });
}
