import { Router, type Request } from "express";
import multer from "multer";
import type { ProgressEvent } from "@groweasy/shared";
import { assertLlmConfigured } from "../config";
import { parseCsv, type CsvRow } from "../services/csv";
import { importRows } from "../services/llm";

export const importRouter = Router();

// Buffer the uploaded CSV in memory (files are small) and cap size so a huge upload
// can't exhaust the process. A wrong/extra field or an oversize file surfaces as a
// MulterError, which the error handler in index.ts turns into a clean JSON 400.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});


export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}



export function extractRows(req: Pick<Request, "file">): CsvRow[] {
  const file = req.file;
  if (!file?.buffer) {
    throw new Error("A CSV file upload is required (multipart/form-data, field 'file').");
  }
  const rows = parseCsv(stripBom(file.buffer.toString("utf8")));
  if (rows.length === 0) {
    throw new Error("The uploaded CSV contains no data rows.");
  }
  return rows;
}

/**
 * SSE endpoint: streams progress events while batches are processed, then a final
 * "done" event carrying the complete ImportResult. Accepts a CSV file upload only.
 */
importRouter.post("/import/stream", upload.single("file"), async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const send = (event: ProgressEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    assertLlmConfigured();
    const rows = extractRows(req);
    send({ type: "progress", processed: 0, total: rows.length });

    const result = await importRows(rows, (processed, total) => {
      send({ type: "progress", processed, total });
    });

    send({ type: "done", processed: result.stats.total, total: result.stats.total, result });
  } catch (err) {
    send({
      type: "error",
      processed: 0,
      total: 0,
      message: err instanceof Error ? err.message : "Import failed",
    });
  } finally {
    res.end();
  }
});
