"use client";

import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  onFile: (file: File) => void;
}

/** Drag-and-drop CSV dropzone with a click-to-browse fallback. */
export function UploadZone({ onFile }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = useCallback(
    (file: File | undefined) => {
      setError(null);
      if (!file) return;
      const isCsv =
        file.type === "text/csv" ||
        file.type === "application/vnd.ms-excel" ||
        file.name.toLowerCase().endsWith(".csv");
      if (!isCsv) {
        setError("Please choose a .csv file.");
        return;
      }
      onFile(file);
    },
    [onFile],
  );

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        className={[
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition cursor-pointer",
          dragging
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
            : "border-slate-300 bg-white hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-900",
        ].join(" ")}
      >
        <div className="text-4xl">📄</div>
        <div className="text-lg font-medium">
          {dragging ? "Drop your CSV here" : "Drag & drop a CSV, or click to browse"}
        </div>
        <div className="text-sm text-slate-500">Any column layout — the AI figures out the mapping.</div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
