import { describe, expect, it, vi, beforeEach } from "vitest";
import type OpenAI from "openai";
import { extractJson, importRows, setClient } from "../src/services/llm";


function stubClient(replies: string[]): OpenAI {
  const create = vi.fn(async () => {
    const content = replies.shift() ?? "{}";
    return { choices: [{ message: { content } }] };
  });
  return { chat: { completions: { create } } } as unknown as OpenAI;
}

describe("extractJson", () => {
  it("strips markdown code fences", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("pulls the first {...} block from surrounding prose", () => {
    expect(extractJson('Here you go: {"a":1} thanks')).toBe('{"a":1}');
  });
});

describe("importRows", () => {
  beforeEach(() => {
  });

  it("maps rows, applies enum coercion, and preserves order via index", async () => {
    const reply = JSON.stringify({
      records: [
        {
          index: 0,
          skip: false,
          reason: "",
          record: {
            created_at: "2025-03-14",
            name: "Priya",
            email: "priya@acme.io",
            country_code: "91",
            mobile_without_country_code: "9876543210",
            company: "",
            city: "Bengaluru",
            state: "",
            country: "",
            lead_owner: "",
            crm_status: "GOOD_LEAD_FOLLOW_UP",
            crm_note: "",
            data_source: "meridian_tower",
            possession_time: "",
            description: "",
          },
        },
        { index: 1, skip: true, reason: "no email or mobile", record: null },
      ],
    });
    setClient(stubClient([reply]));

    const result = await importRows([
      { "Full Name": "Priya", "E-mail": "priya@acme.io" },
      { "Full Name": "Walk-in" },
    ]);

    expect(result.stats).toEqual({ total: 2, imported: 1, skipped: 1 });
    expect(result.imported[0].name).toBe("Priya");
    expect(result.imported[0].crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(result.skipped[0].reason).toBe("no email or mobile");
  });

  it("recovers from a malformed first reply by retrying", async () => {
    const good = JSON.stringify({
      records: [{ index: 0, skip: false, reason: "", record: { email: "a@b.com" } }],
    });
    setClient(stubClient(["not json at all", good]));

    const result = await importRows([{ Email: "a@b.com" }]);
    expect(result.stats.imported).toBe(1);
    expect(result.imported[0].email).toBe("a@b.com");
  });

  it("reports progress after each batch", async () => {
    const reply = JSON.stringify({
      records: [{ index: 0, skip: false, reason: "", record: { email: "a@b.com" } }],
    });
    setClient(stubClient([reply]));

    const seen: Array<[number, number]> = [];
    await importRows([{ Email: "a@b.com" }], (p, t) => seen.push([p, t]));
    expect(seen).toContainEqual([1, 1]);
  });

  it("falls back to the deterministic skip rule when the model omits a row", async () => {
    setClient(stubClient([JSON.stringify({ records: [] })]));

    const result = await importRows([{ Name: "Nobody", Note: "brochure" }]);
    expect(result.stats.skipped).toBe(1);
    expect(result.skipped[0].reason).toBe("no email or mobile");
  });
});
