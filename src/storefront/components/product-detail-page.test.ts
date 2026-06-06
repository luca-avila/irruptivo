import { describe, expect, it } from "vitest";

import { PRODUCT_AREA } from "../../catalog/catalog";
import { getOptionHref } from "./product-detail-page";

describe("product detail option hrefs", () => {
  it("selects an inactive clothing option", () => {
    expect(
      getOptionHref({
        area: PRODUCT_AREA.clothing,
        basePath: "/coleccion/remera-training",
        selectedOptions: {
          color: "Negro"
        },
        optionKey: "size",
        optionValue: "M"
      })
    ).toBe("/coleccion/remera-training?color=Negro&talle=M");
  });

  it("deselects a middle supplement option and removes following options", () => {
    expect(
      getOptionHref({
        area: PRODUCT_AREA.supplement,
        basePath: "/suplementos/proteina",
        selectedOptions: {
          flavor: "Vainilla",
          weight: "1 kg",
          presentation: "Polvo"
        },
        optionKey: "weight",
        optionValue: "1 kg"
      })
    ).toBe("/suplementos/proteina?sabor=Vainilla");
  });

  it("deselects the first clothing option and removes all option params", () => {
    expect(
      getOptionHref({
        area: PRODUCT_AREA.clothing,
        basePath: "/coleccion/remera-training",
        selectedOptions: {
          color: "Negro",
          size: "M"
        },
        optionKey: "color",
        optionValue: "Negro"
      })
    ).toBe("/coleccion/remera-training");
  });

  it("deselects the last supplement option only", () => {
    expect(
      getOptionHref({
        area: PRODUCT_AREA.supplement,
        basePath: "/suplementos/proteina",
        selectedOptions: {
          flavor: "Vainilla",
          weight: "1 kg",
          presentation: "Polvo"
        },
        optionKey: "presentation",
        optionValue: "Polvo"
      })
    ).toBe("/suplementos/proteina?sabor=Vainilla&peso=1+kg");
  });

  it("returns the base path when deselection removes the only selected option", () => {
    expect(
      getOptionHref({
        area: PRODUCT_AREA.supplement,
        basePath: "/suplementos/proteina",
        selectedOptions: {
          flavor: "Vainilla"
        },
        optionKey: "flavor",
        optionValue: "Vainilla"
      })
    ).toBe("/suplementos/proteina");
  });
});
