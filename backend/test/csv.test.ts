import { describe, expect, it } from "vitest";
import { chunk, parseCsv } from "../src/services/csv";

describe("parseCsv", () => {
  it("parses headers and trims values", () => {
    const rows = parseCsv("Name , Email\n Alice ,alice@x.com \nBob,bob@y.com");
    expect(rows).toEqual([
      { Name: "Alice", Email: "alice@x.com" },
      { Name: "Bob", Email: "bob@y.com" },
    ]);
  });

  it("handles quoted fields containing commas and newlines", () => {
    const raw = 'Name,Note\n"Doe, John","line1\nline2"';
    const rows = parseCsv(raw);
    expect(rows[0].Name).toBe("Doe, John");
    expect(rows[0].Note).toBe("line1\nline2");
  });

  it("skips fully empty lines", () => {
    const rows = parseCsv("A,B\n1,2\n\n3,4\n");
    expect(rows).toHaveLength(2);
  });
});

describe("chunk", () => {
  it("splits into batches of the given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it("returns an empty array for empty input", () => {
    expect(chunk([], 3)).toEqual([]);
  });
});
