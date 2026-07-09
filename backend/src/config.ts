import dotenv from "dotenv";
import path from "node:path";

// Loaded the repo-root .env (one level up from backend/) so a single file serves both apps.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY ?? "",
    baseUrl: process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
    model: process.env.LLM_MODEL ?? "mistralai/mistral-medium-3.5-128b",
    maxTokens: Math.max(512, Number(process.env.LLM_MAX_TOKENS ?? 8192)),
    reasoningEffort: process.env.LLM_REASONING_EFFORT || undefined,
  },
  batchSize: Math.max(1, Number(process.env.BATCH_SIZE ?? 6)),
};

export function assertLlmConfigured(): void {
  if (!config.nvidia.apiKey) {
    throw new Error(
      "NVIDIA_API_KEY is not set. Copy .env.example to .env and add a free key from https://build.nvidia.com",
    );
  }
}
