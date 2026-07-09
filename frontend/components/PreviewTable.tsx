"use client";

import type { CsvRow } from "../lib/csv";

interface PreviewTableProps {
  headers: string[];
  rows: CsvRow[];
}

/** Scrollable preview of the uploaded CSV with a sticky header row. Renders every row. */
export function PreviewTable({ headers, rows }: PreviewTableProps) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-sm dark:border-slate-800">
        <span className="font-medium">Detected {headers.length} columns</span>
        <span className="text-slate-500">{rows.length} rows</span>
      </div>
      <div className="max-h-[66vh] overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="sticky left-0 z-20 border-b border-slate-200 bg-slate-100 px-3 py-2 text-left font-semibold dark:border-slate-700 dark:bg-slate-800">
                #
              </th>
              {headers.map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900 dark:even:bg-slate-950/40">
                <td className="sticky left-0 bg-inherit px-3 py-1.5 text-slate-400">{i + 1}</td>
                {headers.map((h) => (
                  <td key={h} className="max-w-[240px] truncate px-3 py-1.5" title={row[h]}>
                    {row[h]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
