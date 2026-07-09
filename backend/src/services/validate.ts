import {
  CRM_STATUSES,
  DATA_SOURCES,
  emptyCrmRecord,
  type CrmRecord,
  type CrmStatus,
  type DataSource,
} from "@groweasy/shared";
import type { CsvRow } from "./csv";

const STATUS_SET = new Set<string>(CRM_STATUSES);
const SOURCE_SET = new Set<string>(DATA_SOURCES);

/** Collapse newlines/tabs and runs of whitespace into single spaces. */
export function sanitizeLine(value: unknown): string {
  if (value == null) return "";
  return String(value).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

/** Whether created_at is a non-empty string parseable by new Date(). */
export function isParsableDate(value: string): boolean {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

export interface NormalizedOutcome {
  skip: boolean;
  reason: string;
  record?: CrmRecord;
}

/**
 * Coerce a single raw record object emitted by the LLM into a guaranteed-valid
 * CrmRecord, re-enforcing every assignment rule regardless of what the model said:
 *  - enum whitelists (invalid crm_status/data_source are blanked)
 *  - created_at must survive new Date(); otherwise blanked
 *  - all values sanitized to a single line
 *  - skip rule: no email AND no mobile => skip
 *
 * `raw` is untrusted (any shape). `sourceRow` is only used for the skip reason.
 */
export function normalizeRecord(raw: unknown): NormalizedOutcome {
  const record = emptyCrmRecord();
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  record.created_at = sanitizeLine(src.created_at);
  record.name = sanitizeLine(src.name);
  record.email = sanitizeLine(src.email).toLowerCase();
  record.country_code = sanitizeLine(src.country_code).replace(/[^\d]/g, "");
  record.mobile_without_country_code = sanitizeLine(
    src.mobile_without_country_code,
  ).replace(/[^\d]/g, "");
  record.company = sanitizeLine(src.company);
  record.city = sanitizeLine(src.city);
  record.state = sanitizeLine(src.state);
  record.country = sanitizeLine(src.country);
  record.lead_owner = sanitizeLine(src.lead_owner);
  record.crm_note = sanitizeLine(src.crm_note);
  record.possession_time = sanitizeLine(src.possession_time);
  record.description = sanitizeLine(src.description);

  // created_at must be parseable by new Date(); otherwise drop it.
  if (!isParsableDate(record.created_at)) {
    record.created_at = "";
  }

  // Enum enforcement.
  const status = sanitizeLine(src.crm_status).toUpperCase();
  record.crm_status = STATUS_SET.has(status) ? (status as CrmStatus) : "";

  const source = sanitizeLine(src.data_source).toLowerCase();
  record.data_source = SOURCE_SET.has(source) ? (source as DataSource) : "";

  // Skip rule: neither email nor mobile present.
  if (!record.email && !record.mobile_without_country_code) {
    return { skip: true, reason: "no email or mobile" };
  }

  return { skip: false, reason: "", record };
}

/** Apply the skip rule directly to a source row (used as a fallback when the LLM omits a row). */
export function rowHasContact(row: CsvRow): boolean {
  const joined = Object.values(row).join(" ").toLowerCase();
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(joined);
  const hasPhone = /\d{7,}/.test(joined.replace(/[\s()+-]/g, ""));
  return hasEmail || hasPhone;
}
