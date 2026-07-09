import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import multer from "multer";
import { config } from "./config";
import { importRouter } from "./routes/import";

const app = express();


app.use(cors({ origin: config.corsOrigin === "*" ? true : config.corsOrigin }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, model: config.nvidia.model, llmConfigured: Boolean(config.nvidia.apiKey) });
});

app.use("/api", importRouter);

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload failed: ${err.message}` });
  }
  return next(err);
});

app.listen(config.port, () => {
  console.log(`[backend] listening on http://localhost:${config.port}`);
  if (!config.nvidia.apiKey) {
    console.warn("[backend] WARNING: NVIDIA_API_KEY is not set — /api/import/stream will error.");
  }
});
