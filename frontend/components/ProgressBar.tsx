"use client";

interface ProgressBarProps {
  processed: number;
  total: number;
}


export function ProgressBar({ processed, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const active = total > 0 && processed < total;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">
          {active ? "Mapping rows with AI…" : "Finishing up…"}
        </span>
        <span className="text-slate-500">
          {processed} / {total} rows ({pct}%)
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
        {active && (
          <div
            className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-indigo-400/50"
            style={{ animation: "progress-slide 1.15s ease-in-out infinite" }}
          />
        )}
      </div>
    </div>
  );
}
