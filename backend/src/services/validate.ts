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


export function sanitizeLine(value: unknown): string {
  if (value == null) return "";
  return String(value).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}


export function isParsableDate(value: string): boolean {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

export interface NormalizedOutcome {
  skip: boolean;
  reason: string;
  record?: CrmRecord;
}

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

  if (!isParsableDate(record.created_at)) {
    record.created_at = "";
  }

  const status = sanitizeLine(src.crm_status).toUpperCase();
  record.crm_status = STATUS_SET.has(status) ? (status as CrmStatus) : "";

  const source = sanitizeLine(src.data_source).toLowerCase();
  record.data_source = SOURCE_SET.has(source) ? (source as DataSource) : "";

  if (!record.email && !record.mobile_without_country_code) {
    return { skip: true, reason: "no email or mobile" };
  }

  return { skip: false, reason: "", record };
}

export function rowHasContact(row: CsvRow): boolean {
  const joined = Object.values(row).join(" ").toLowerCase();
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(joined);
  const hasPhone = /\d{7,}/.test(joined.replace(/[\s()+-]/g, ""));
  return hasEmail || hasPhone;
}
