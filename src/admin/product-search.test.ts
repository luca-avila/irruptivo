import { describe, expect, it } from "vitest";

import { productNameMatchesQuery } from "./product-search";

describe("productNameMatchesQuery", () => {
  it("returns all rows for an empty or whitespace query", () => {
    expect(productNameMatchesQuery("Remera Oversize", "")).toBe(true);
    expect(productNameMatchesQuery("Remera Oversize", "   ")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(productNameMatchesQuery("Remera Oversize", "remera")).toBe(true);
    expect(productNameMatchesQuery("Remera Oversize", "OVERSIZE")).toBe(true);
  });

  it("matches accent-insensitively in both directions", () => {
    expect(productNameMatchesQuery("Camisetón Algodón", "camiseton")).toBe(true);
    expect(productNameMatchesQuery("Proteina Whey", "proteína")).toBe(true);
  });

  it("matches on a substring anywhere in the name", () => {
    expect(productNameMatchesQuery("Buzo Canguro Negro", "canguro")).toBe(true);
  });

  it("does not match when the query is absent from the name", () => {
    expect(productNameMatchesQuery("Remera Oversize", "buzo")).toBe(false);
  });
});
