import { describe, expect, it } from "vitest";
import {
  isParsableDate,
  normalizeRecord,
  rowHasContact,
  sanitizeLine,
} from "../src/services/validate";

describe("sanitizeLine", () => {
  it("collapses newlines and tabs to single spaces", () => {
    expect(sanitizeLine("a\nb\tc\r\nd")).toBe("a b c d");
  });
  it("trims and collapses runs of whitespace", () => {
    expect(sanitizeLine("  hello    world  ")).toBe("hello world");
  });
  it("handles null/undefined", () => {
    expect(sanitizeLine(null)).toBe("");
    expect(sanitizeLine(undefined)).toBe("");
  });
});

describe("isParsableDate", () => {
  it("accepts ISO dates", () => {
    expect(isParsableDate("2025-03-14")).toBe(true);
    expect(isParsableDate("2025-03-14T09:30:00Z")).toBe(true);
  });
  it("rejects empty and garbage", () => {
    expect(isParsableDate("")).toBe(false);
    expect(isParsableDate("not a date")).toBe(false);
  });
});

describe("normalizeRecord — enum enforcement", () => {
  it("keeps a valid crm_status and blanks an invalid one", () => {
    expect(normalizeRecord({ email: "a@b.com", crm_status: "SALE_DONE" }).record?.crm_status).toBe(
      "SALE_DONE",
    );
    expect(
      normalizeRecord({ email: "a@b.com", crm_status: "totally-made-up" }).record?.crm_status,
    ).toBe("");
  });

  it("uppercases status before matching", () => {
    expect(normalizeRecord({ email: "a@b.com", crm_status: "bad_lead" }).record?.crm_status).toBe(
      "BAD_LEAD",
    );
  });

  it("blanks an invalid data_source but keeps a valid one", () => {
    expect(
      normalizeRecord({ email: "a@b.com", data_source: "meridian_tower" }).record?.data_source,
    ).toBe("meridian_tower");
    expect(
      normalizeRecord({ email: "a@b.com", data_source: "unknown_project" }).record?.data_source,
    ).toBe("");
  });
});

describe("normalizeRecord — date handling", () => {
  it("blanks an unparseable created_at", () => {
    expect(normalizeRecord({ email: "a@b.com", created_at: "sometime" }).record?.created_at).toBe(
      "",
    );
  });
  it("keeps a parseable created_at", () => {
    expect(normalizeRecord({ email: "a@b.com", created_at: "2025-01-02" }).record?.created_at).toBe(
      "2025-01-02",
    );
  });
});

describe("normalizeRecord — contact fields & skip rule", () => {
  it("skips a record with neither email nor mobile", () => {
    const out = normalizeRecord({ name: "Nobody" });
    expect(out.skip).toBe(true);
    expect(out.reason).toBe("no email or mobile");
  });

  it("keeps a record with only a mobile", () => {
    const out = normalizeRecord({ mobile_without_country_code: "9876500011" });
    expect(out.skip).toBe(false);
    expect(out.record?.mobile_without_country_code).toBe("9876500011");
  });

  it("lowercases email and strips non-digits from phone fields", () => {
    const out = normalizeRecord({
      email: "PRIYA@ACME.IO",
      country_code: "+91",
      mobile_without_country_code: "98765 43210",
    });
    expect(out.record?.email).toBe("priya@acme.io");
    expect(out.record?.country_code).toBe("91");
    expect(out.record?.mobile_without_country_code).toBe("9876543210");
  });

  it("preserves extra contacts placed in crm_note by the model", () => {
    const out = normalizeRecord({
      email: "a@b.com",
      crm_note: "Additional email: c@d.com;\nAdditional phone: 12345",
    });
    expect(out.record?.crm_note).toBe("Additional email: c@d.com; Additional phone: 12345");
  });
});

describe("rowHasContact", () => {
  it("detects an email anywhere in the row", () => {
    expect(rowHasContact({ foo: "bar", mail: "x@y.com" })).toBe(true);
  });
  it("detects a phone number", () => {
    expect(rowHasContact({ phone: "+91 98765 43210" })).toBe(true);
  });
  it("returns false for a row with no contact info", () => {
    expect(rowHasContact({ name: "Walk-in", note: "brochure" })).toBe(false);
  });
});
