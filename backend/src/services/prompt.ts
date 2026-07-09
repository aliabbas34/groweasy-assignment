import { CRM_STATUSES, DATA_SOURCES } from "@groweasy/shared";
import type { CsvRow } from "./csv";

/**
 * Strategy:
 *  - A single, explicit system prompt fixes the role, the exact output schema,
 *    the enum, and every extraction rule.
 *  - Few-shot examples demonstrate the tricky cases (messy headers, multiple
 *    contacts overflowing into crm_note, country-code splitting, and skipping).
 *  - Few-shot exchange, embedded as prior messages to anchor behavior.
 *  - The model returns strict JSON keyed by input index so we can align outputs
 *    to inputs and never lose row order.
 */

export const SYSTEM_PROMPT = `You are a meticulous CRM data-mapping engine. You receive rows from an arbitrary
spreadsheet (any column names, any language, any layout) and convert each row into a
standardized CRM record. You never invent data: if a value is not present in the row,
you leave that field as an empty string "".

OUTPUT SHAPE
Return ONLY a JSON object of this exact shape (no prose, no markdown fences):
{
  "records": [
    { "index": <number>, "skip": <boolean>, "reason": <string>, "record": <CRM_RECORD_OR_NULL> }
  ]
}
- Emit exactly one entry per input row, preserving the input "index".
- If the row must be skipped, set "skip": true, "reason": "<short reason>", "record": null.
- Otherwise set "skip": false, "reason": "", and fill "record".

A CRM_RECORD has EXACTLY these 15 string fields:
  created_at, name, email, country_code, mobile_without_country_code, company,
  city, state, country, lead_owner, crm_status, crm_note, data_source,
  possession_time, description

FIELD RULES
- created_at: the lead's creation date/time from the row. It MUST be a string that
  JavaScript's new Date(...) can parse (ISO 8601 like "2025-03-14" or
  "2025-03-14T09:30:00Z" is safest). If absent, use "".
- name / company / city / state / country / lead_owner / possession_time / description:
  copy the best-matching value; else "".
- email: the PRIMARY email only (the first one). Lowercase it. If there are more emails,
  put the extras in crm_note (see below).
- Phone handling: split into country_code (e.g. "91", "1", with no "+" and no spaces) and
  mobile_without_country_code (digits only, no spaces/dashes/parentheses). Use the PRIMARY
  phone only; extra phones go to crm_note. If no country code is present in the number,
  leave country_code "" (do not guess) unless a separate country-code column exists.
- crm_status: MUST be one of exactly [${CRM_STATUSES.map((s) => `"${s}"`).join(", ")}].
  Map free-text statuses to the closest of these. If you cannot confidently map it, use "".
- data_source: MUST be one of exactly [${DATA_SOURCES.map((s) => `"${s}"`).join(", ")}].
  If there is no confident match, use "".
- crm_note: remarks, follow-up notes, comments, AND any extra contact details that did not
  fit the primary fields. When appending extra contacts, be explicit, e.g.
  "Additional email: a@b.com; Additional phone: +91 98765 43210". Merge multiple notes with "; ".
- Keep every value on a single line: replace newlines/tabs inside a value with a single space
  so the record stays valid in CSV and JSON.

SKIP RULE
- Skip a row (skip: true) ONLY when it has NEITHER a usable email NOR a usable phone/mobile.
  reason should be "no email or mobile".

Never output anything except the JSON object described above.`;


const FEWSHOT_INPUT = {
  rows: [
    {
      index: 0,
      row: {
        "Full Name": "Priya Sharma",
        "E-mail Address": "priya@acme.io, priya.sharma@gmail.com",
        "Phone Nos": "+91 98765 43210 / +91 91234 56780",
        "Lead Stage": "Interested - call back next week",
        Project: "Meridian Tower",
        "Created On": "14/03/2025",
        City: "Bengaluru",
      },
    },
    {
      index: 1,
      row: {
        "Full Name": "Walk-in visitor",
        Remarks: "Asked for brochure at the desk",
        Project: "Some Unknown Project",
      },
    },
    {
      index: 2,
      row: {
        Name: "John Doe",
        Mobile: "9876500011",
        Status: "Deal closed",
        Source: "leads on demand",
      },
    },
  ],
};

const FEWSHOT_OUTPUT = {
  records: [
    {
      index: 0,
      skip: false,
      reason: "",
      record: {
        created_at: "2025-03-14",
        name: "Priya Sharma",
        email: "priya@acme.io",
        country_code: "91",
        mobile_without_country_code: "9876543210",
        company: "",
        city: "Bengaluru",
        state: "",
        country: "",
        lead_owner: "",
        crm_status: "GOOD_LEAD_FOLLOW_UP",
        crm_note:
          "Interested - call back next week; Additional email: priya.sharma@gmail.com; Additional phone: +91 91234 56780",
        data_source: "meridian_tower",
        possession_time: "",
        description: "",
      },
    },
    {
      index: 1,
      skip: true,
      reason: "no email or mobile",
      record: null,
    },
    {
      index: 2,
      skip: false,
      reason: "",
      record: {
        created_at: "",
        name: "John Doe",
        email: "",
        country_code: "",
        mobile_without_country_code: "9876500011",
        company: "",
        city: "",
        state: "",
        country: "",
        lead_owner: "",
        crm_status: "SALE_DONE",
        crm_note: "",
        data_source: "leads_on_demand",
        possession_time: "",
        description: "",
      },
    },
  ],
};

export interface IndexedRow {
  index: number;
  row: CsvRow;
}


export function buildUserMessage(rows: IndexedRow[]): string {
  return JSON.stringify({ rows });
}


export function buildMessages(rows: IndexedRow[]) {
  return [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: JSON.stringify(FEWSHOT_INPUT) },
    { role: "assistant" as const, content: JSON.stringify(FEWSHOT_OUTPUT) },
    { role: "user" as const, content: buildUserMessage(rows) },
  ];
}
