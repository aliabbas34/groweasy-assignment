import OpenAI from "openai";
import type { CrmRecord, ImportResult, SkippedRow } from "@groweasy/shared";
import { config } from "../config";
import { chunk, type CsvRow } from "./csv";
import { buildMessages, type IndexedRow } from "./prompt";
import { normalizeRecord, rowHasContact } from "./validate";

/** Lazily constructed so importing this module never requires a key (tests mock it). */
let client: OpenAI | null = null;
export function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: config.nvidia.apiKey,
      baseURL: config.nvidia.baseUrl,
    });
  }
  return client;
}

// Allow tests to inject a stub client.
export function setClient(stub: OpenAI): void {
  client = stub;
}

interface LlmEntry {
  index: number;
  skip?: boolean;
  reason?: string;
  record?: unknown;
}

// Strip markdown code fences and pull the first block out of a model reply.
export function extractJson(text: string): string {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    t = t.slice(start, end + 1);
  }
  return t;
}

function parseEntries(content: string): LlmEntry[] {
  const parsed = JSON.parse(extractJson(content));
  const records = (parsed?.records ?? parsed) as unknown;
  if (!Array.isArray(records)) {
    throw new Error("LLM response did not contain a records array");
  }
  return records as LlmEntry[];
}

type ChatMessages = Parameters<
  ReturnType<typeof getClient>["chat"]["completions"]["create"]
>[0]["messages"];


async function callModel(messages: ChatMessages): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model: config.nvidia.model,
    temperature: 0,
    max_tokens: config.nvidia.maxTokens,
    messages,
    ...(config.nvidia.reasoningEffort
      ? { reasoning_effort: config.nvidia.reasoningEffort as any }
      : {}),
    response_format: { type: "json_object" as const },
  });
  return completion.choices[0]?.message?.content ?? "";
}

/**
 * Call the model for one batch and return its raw entries.
 * Retries once on a JSON *parse* failure, nudging the model to fix its formatting
 * (JSON mode guarantees valid JSON, not the required {records:[...]} shape).
 */
async function mapBatch(rows: IndexedRow[]): Promise<LlmEntry[]> {
  const messages = buildMessages(rows);

  for (let attempt = 0; attempt < 2; attempt++) {
    const content = await callModel(messages);

    try {
      return parseEntries(content);
    } catch (err) {
      if (attempt === 1) throw err;
      // Nudge the model to fix its formatting on the retry.
      messages.push({ role: "assistant", content });
      messages.push({
        role: "user",
        content:
          'Your previous reply was not valid JSON of the required shape. Reply again with ONLY {"records":[...]}.',
      });
    }
  }
  return [];
}

export type ProgressCallback = (processed: number, total: number) => void;

/**
 * Map every CSV row to a validated CRM record.
 * Rows are processed in batches; `onProgress` is called after each batch with the
 * number of source rows processed so far.
 */
export async function importRows(
  rows: CsvRow[],
  onProgress?: ProgressCallback,
): Promise<ImportResult> {
  const imported: CrmRecord[] = [];
  const skipped: SkippedRow[] = [];
  const total = rows.length;

  const indexed: IndexedRow[] = rows.map((row, index) => ({ index, row }));
  const batches = chunk(indexed, config.batchSize);
  let processed = 0;

  for (const batch of batches) {
    const entries = await mapBatch(batch);
    const byIndex = new Map<number, LlmEntry>();
    for (const e of entries) {
      if (typeof e?.index === "number") byIndex.set(e.index, e);
    }

    for (const { index, row } of batch) {
      const entry = byIndex.get(index);

      // If the model dropped a row entirely, fall back to the deterministic skip rule.
      if (!entry) {
        if (rowHasContact(row)) {
          skipped.push({ row, reason: "model returned no mapping for this row" });
        } else {
          skipped.push({ row, reason: "no email or mobile" });
        }
        continue;
      }

      if (entry.skip) {
        skipped.push({ row, reason: entry.reason || "skipped by model" });
        continue;
      }

      const outcome = normalizeRecord(entry.record);
      if (outcome.skip || !outcome.record) {
        skipped.push({ row, reason: outcome.reason || "no email or mobile" });
      } else {
        imported.push(outcome.record);
      }
    }

    processed += batch.length;
    onProgress?.(processed, total);
  }

  return {
    imported,
    skipped,
    stats: { total, imported: imported.length, skipped: skipped.length },
  };
}
