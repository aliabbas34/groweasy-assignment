import { describe, expect, it } from "vitest";
import { extractRows, stripBom } from "../src/routes/import";

const req = (file?: { buffer: Buffer }) => ({ file }) as any;
const asFile = (csv: string) => ({ buffer: Buffer.from(csv, "utf8") });

describe("stripBom", () => {
  it("removes a leading UTF-8 BOM", () => {
    expect(stripBom("﻿Name,Email")).toBe("Name,Email");
  });
  it("leaves BOM-free text untouched", () => {
    expect(stripBom("Name,Email")).toBe("Name,Email");
  });
});

describe("extractRows", () => {
  it("parses an uploaded CSV file into records", () => {
    const rows = extractRows(req(asFile("Name,Email\nAlice,alice@x.com")));
    expect(rows).toEqual([{ Name: "Alice", Email: "alice@x.com" }]);
  });

  it("strips a BOM on the uploaded file so the first header is clean", () => {
    const rows = extractRows(req(asFile("﻿Name,Email\nBob,bob@y.com")));
    expect(Object.keys(rows[0])).toEqual(["Name", "Email"]);
  });

  it("throws when no file is uploaded", () => {
    expect(() => extractRows(req())).toThrow(/CSV file upload is required/);
  });

  it("throws when the uploaded CSV has no data rows", () => {
    expect(() => extractRows(req(asFile("Name,Email\n")))).toThrow(/no data rows/);
  });
});
