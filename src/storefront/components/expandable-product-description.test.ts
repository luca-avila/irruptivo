import { describe, expect, it } from "vitest";

import { getCollapsedProductDescription } from "./expandable-product-description";

describe("expandable product description", () => {
  it("keeps short descriptions unchanged", () => {
    expect(getCollapsedProductDescription("Remera liviana.", 30)).toEqual({
      canExpand: false,
      text: "Remera liviana."
    });
  });

  it("collapses long descriptions at a word boundary", () => {
    expect(
      getCollapsedProductDescription(
        "Remera oversize de algodón pesado con calce relajado y terminaciones reforzadas.",
        42
      )
    ).toEqual({
      canExpand: true,
      text: "Remera oversize de algodón pesado con…"
    });
  });

  it("keeps line breaks when collapsing multiline descriptions", () => {
    expect(
      getCollapsedProductDescription(
        "Primera línea\nSegunda línea con detalles importantes para la prenda.",
        35
      )
    ).toEqual({
      canExpand: true,
      text: "Primera línea\nSegunda línea con…"
    });
  });

  it("falls back to the exact limit when there is no useful word boundary", () => {
    expect(getCollapsedProductDescription("Supercalifragilistico", 10)).toEqual({
      canExpand: true,
      text: "Supercalif…"
    });
  });
});
