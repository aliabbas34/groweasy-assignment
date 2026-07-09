"use client";

import { CRM_FIELDS, type ImportResult } from "@groweasy/shared";

interface ResultsViewProps {
  result: ImportResult;
  onReset: () => void;
}

function downloadJson(result: ImportResult) {
  const blob = new Blob([JSON.stringify(result.imported, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "crm-records.json";
  a.click();
  URL.revokeObjectURL(url);
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export function ResultsView({ result, onReset }: ResultsViewProps) {
  const { imported, skipped, stats } = result;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total rows" value={stats.total} tone="text-slate-700 dark:text-slate-200" />
        <StatCard label="Imported" value={stats.imported} tone="text-emerald-600" />
        <StatCard label="Skipped" value={stats.skipped} tone="text-amber-600" />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => downloadJson(result)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Download JSON
        </button>
        <button
          onClick={onReset}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Import another file
        </button>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          Imported records ({imported.length})
        </h3>
        <div className="max-h-[58vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
              <tr>
                {CRM_FIELDS.map((f) => (
                  <th key={f} className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                    {f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {imported.map((rec, i) => (
                <tr key={i} className="odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900 dark:even:bg-slate-950/40">
                  {CRM_FIELDS.map((f) => (
                    <td key={f} className="max-w-[200px] truncate px-3 py-1.5" title={String(rec[f])}>
                      {String(rec[f])}
                    </td>
                  ))}
                </tr>
              ))}
              {imported.length === 0 && (
                <tr>
                  <td colSpan={CRM_FIELDS.length} className="px-3 py-6 text-center text-slate-500">
                    No records were imported.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {skipped.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            Skipped rows ({skipped.length})
          </h3>
          <div className="max-h-[30vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Reason</th>
                  <th className="px-3 py-2 text-left font-semibold">Row data</th>
                </tr>
              </thead>
              <tbody>
                {skipped.map((s, i) => (
                  <tr key={i} className="odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900 dark:even:bg-slate-950/40">
                    <td className="whitespace-nowrap px-3 py-1.5 text-amber-700 dark:text-amber-400">{s.reason}</td>
                    <td className="px-3 py-1.5 font-mono text-[11px] text-slate-500">
                      {Object.entries(s.row)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join("  |  ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
