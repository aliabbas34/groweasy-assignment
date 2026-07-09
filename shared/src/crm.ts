import { z } from "zod";

/**
 * Single source of truth for the CRM schema shared by the backend and frontend.
 *
 * The assignment fixes:
 *  - 15 output fields
 *  - 4 allowed crm_status values
 *  - 5 allowed data_source values
 */

/** Allowed CRM lead statuses. crm_status must be exactly one of these. */
export const CRM_STATUSES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;
export type CrmStatus = (typeof CRM_STATUSES)[number];

/** Allowed data sources. data_source is one of these or "" (blank) when there is no confident match. */
export const DATA_SOURCES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

/** The 15 standardized CRM fields, in canonical order. */
export const CRM_FIELDS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
] as const;
export type CrmField = (typeof CRM_FIELDS)[number];

/** A single normalized CRM record. Unknown values are represented as empty strings. */
export interface CrmRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus | "";
  crm_note: string;
  data_source: DataSource | "";
  possession_time: string;
  description: string;
}

/**
 * Zod schema mirroring CrmRecord. Used by the backend to validate/coerce raw LLM
 * output. Enum fields allow "" so the validation layer can blank-out low-confidence
 * or invalid values rather than dropping the whole record.
 */
export const crmRecordSchema = z.object({
  created_at: z.string(),
  name: z.string(),
  email: z.string(),
  country_code: z.string(),
  mobile_without_country_code: z.string(),
  company: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  lead_owner: z.string(),
  crm_status: z.union([z.enum(CRM_STATUSES), z.literal("")]),
  crm_note: z.string(),
  data_source: z.union([z.enum(DATA_SOURCES), z.literal("")]),
  possession_time: z.string(),
  description: z.string(),
});

/** A source row that was skipped, with the reason why. */
export interface SkippedRow {
  row: Record<string, string>;
  reason: string;
}

/** Result of an import — delivered via the `done` event of POST /api/import/stream. */
export interface ImportResult {
  imported: CrmRecord[];
  skipped: SkippedRow[];
  stats: {
    total: number;
    imported: number;
    skipped: number;
  };
}

/** SSE progress event emitted while batches are processed. */
export interface ProgressEvent {
  type: "progress" | "done" | "error";
  processed: number;
  total: number;
  /** Present only on the final "done" event. */
  result?: ImportResult;
  /** Present only on "error". */
  message?: string;
}

/** An empty record with every field blanked — handy default. */
export function emptyCrmRecord(): CrmRecord {
  return {
    created_at: "",
    name: "",
    email: "",
    country_code: "",
    mobile_without_country_code: "",
    company: "",
    city: "",
    state: "",
    country: "",
    lead_owner: "",
    crm_status: "",
    crm_note: "",
    data_source: "",
    possession_time: "",
    description: "",
  };
}
