import dotenv from "dotenv";
import path from "node:path";

// Load the repo-root .env (one level up from backend/) so a single file serves both apps.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
// Also load a backend-local .env if present (takes lower precedence — already-set vars win).
dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY ?? "",
    baseUrl: process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
    model: process.env.LLM_MODEL ?? "mistralai/mistral-medium-3.5-128b",
    // Upper bound on tokens per batch reply. A 15-row batch returns a large JSON
    // payload; too low a cap truncates the reply and breaks JSON parsing.
    maxTokens: Math.max(512, Number(process.env.LLM_MAX_TOKENS ?? 8192)),
    // Optional reasoning budget for reasoning-capable NIM models (e.g. "low" | "high").
    // Left unset by default to keep latency and token usage down.
    reasoningEffort: process.env.LLM_REASONING_EFFORT || undefined,
  },
  // Smaller batches = more frequent progress updates and faster first feedback. The free NIM
  // endpoint generates ~15 tokens/sec, so a large batch can take minutes before its first update.
  batchSize: Math.max(1, Number(process.env.BATCH_SIZE ?? 6)),
};

export function assertLlmConfigured(): void {
  if (!config.nvidia.apiKey) {
    throw new Error(
      "NVIDIA_API_KEY is not set. Copy .env.example to .env and add a free key from https://build.nvidia.com",
    );
  }
}
