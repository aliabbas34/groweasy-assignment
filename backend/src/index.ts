import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import multer from "multer";
import { config } from "./config";
import { importRouter } from "./routes/import";

const app = express();

// CORS_ORIGIN="*" reflects any request origin (handy for local testing / previews).
app.use(cors({ origin: config.corsOrigin === "*" ? true : config.corsOrigin }));
// Note: no body parser here — the import endpoint takes a multipart file upload, which
// multer parses per-route. No JSON/text body is consumed anywhere.

app.get("/health", (_req, res) => {
  res.json({ ok: true, model: config.nvidia.model, llmConfigured: Boolean(config.nvidia.apiKey) });
});

app.use("/api", importRouter);

// Turn multer failures (e.g. file too large) into a clean JSON 400 instead of
// Express's default HTML error page. Runs before any SSE headers are written.
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload failed: ${err.message}` });
  }
  return next(err);
});

app.listen(config.port, () => {
  console.log(`[backend] listening on http://localhost:${config.port}`);
  console.log(`[backend] model: ${config.nvidia.model}`);
  if (!config.nvidia.apiKey) {
    console.warn("[backend] WARNING: NVIDIA_API_KEY is not set — /api/import/stream will error.");
  }
});
