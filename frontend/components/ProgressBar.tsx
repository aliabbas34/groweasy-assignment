"use client";

interface ProgressBarProps {
  processed: number;
  total: number;
}

/**
 * Progress bar for batch AI processing.
 *
 * The backend reports `processed` only after each batch completes, so for a file that
 * fits in a single batch there is no intermediate value to show. To avoid a bar that
 * looks frozen at 0% while the model works, we overlay an animated "sweep" whenever a
 * batch is still in flight (processed < total). Completed batches fill the bar for real.
 */
export function ProgressBar({ processed, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const active = total > 0 && processed < total; // a batch is currently being processed

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
        {/* Determinate fill: completed batches. */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
        {/* Indeterminate sweep while a batch is in flight. */}
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
