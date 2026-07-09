import type { ImportResult, ProgressEvent } from "@groweasy/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function fileBody(file: File): FormData {
  const form = new FormData();
  form.append("file", file, file.name);
  return form;
}


export async function importRowsStreaming(
  file: File,
  onProgress: (processed: number, total: number) => void,
): Promise<ImportResult> {
  const res = await fetch(`${API_URL}/api/import/stream`, {
    method: "POST",
    body: fileBody(file),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: ImportResult | null = null;

  const handleEvent = (event: ProgressEvent) => {
    if (event.type === "progress") {
      onProgress(event.processed, event.total);
    } else if (event.type === "done" && event.result) {
      onProgress(event.total, event.total);
      finalResult = event.result;
    } else if (event.type === "error") {
      throw new Error(event.message || "Import failed");
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.slice("data:".length).trim();
      if (json) handleEvent(JSON.parse(json) as ProgressEvent);
    }
  }

  if (!finalResult) throw new Error("Stream ended without a result");
  return finalResult;
}
