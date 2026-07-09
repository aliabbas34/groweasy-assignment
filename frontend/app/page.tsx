"use client";

import { useState } from "react";
import type { ImportResult } from "@groweasy/shared";
import { parseCsvFile, type CsvRow } from "../lib/csv";
import { importRowsStreaming } from "../lib/api";
import { UploadZone } from "../components/UploadZone";
import { PreviewTable } from "../components/PreviewTable";
import { ProgressBar } from "../components/ProgressBar";
import { ResultsView } from "../components/ResultsView";

type Stage = "upload" | "preview" | "processing" | "results";

export default function Home() {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      const parsed = await parseCsvFile(file);
      if (parsed.rows.length === 0) {
        setError("That CSV appears to have no data rows.");
        return;
      }
      setFile(file);
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setStage("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse CSV.");
    }
  }

  async function handleConfirm() {
    if (!file) return;
    setError(null);
    setProgress({ processed: 0, total: rows.length });
    setStage("processing");
    try {
      const res = await importRowsStreaming(file, (processed, total) =>
        setProgress({ processed, total }),
      );
      setResult(res);
      setStage("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
      setStage("preview");
    }
  }

  function reset() {
    setStage("upload");
    setFile(null);
    setFileName("");
    setHeaders([]);
    setRows([]);
    setResult(null);
    setError(null);
    setProgress({ processed: 0, total: 0 });
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">AI CSV Importer</h1>
        <p className="mt-1 text-slate-500">
          Upload any spreadsheet — the AI maps it into standardized CRM fields.
        </p>
      </header>

      {error && (
        <div className="mb-6 shrink-0 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {stage === "upload" && <UploadZone onFile={handleFile} />}

      {stage === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              <span className="font-medium text-slate-700 dark:text-slate-200">{fileName}</span> —{" "}
              {rows.length} rows ready to import.
            </p>
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Choose another
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Confirm & import
              </button>
            </div>
          </div>
          <PreviewTable headers={headers} rows={rows} />
        </div>
      )}

      {stage === "processing" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <ProgressBar processed={progress.processed} total={progress.total} />
          <p className="mt-4 text-center text-sm text-slate-500">
            This runs the rows through the LLM in batches. Larger files take longer.
          </p>
        </div>
      )}

      {stage === "results" && result && <ResultsView result={result} onReset={reset} />}
    </main>
  );
}
