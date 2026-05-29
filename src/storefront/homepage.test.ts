import { describe, expect, it } from "vitest";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductRecord,
  type ProductArea,
  type ProductStatus
} from "../catalog/catalog";
import { getHomepageFeaturedProducts } from "./homepage";

describe("homepage featured product selection", () => {
  it("selects active clothing and supplements into separate homepage groups", () => {
    const featuredProducts = getHomepageFeaturedProducts([
      product("training-tee", PRODUCT_AREA.clothing),
      product("creatina", PRODUCT_AREA.supplement),
      product("inactive-short", PRODUCT_AREA.clothing, PRODUCT_STATUS.inactive)
    ]);

    expect(featuredProducts.clothing.map((productView) => productView.slug)).toEqual([
      "training-tee"
    ]);
    expect(featuredProducts.supplements.map((productView) => productView.slug)).toEqual([
      "creatina"
    ]);
  });

  it("keeps the homepage selections intentionally small", () => {
    const featuredProducts = getHomepageFeaturedProducts([
      product("tee-1", PRODUCT_AREA.clothing),
      product("tee-2", PRODUCT_AREA.clothing),
      product("tee-3", PRODUCT_AREA.clothing),
      product("tee-4", PRODUCT_AREA.clothing),
      product("supplement-1", PRODUCT_AREA.supplement),
      product("supplement-2", PRODUCT_AREA.supplement),
      product("supplement-3", PRODUCT_AREA.supplement),
      product("supplement-4", PRODUCT_AREA.supplement),
      product("supplement-5", PRODUCT_AREA.supplement)
    ]);

    expect(featuredProducts.clothing.map((productView) => productView.slug)).toEqual([
      "tee-1",
      "tee-2",
      "tee-3"
    ]);
    expect(featuredProducts.supplements.map((productView) => productView.slug)).toEqual([
      "supplement-1",
      "supplement-2",
      "supplement-3",
      "supplement-4"
    ]);
  });

  it("returns empty groups when no active products exist", () => {
    expect(getHomepageFeaturedProducts([])).toEqual({
      clothing: [],
      supplements: []
    });
  });
});

function product(
  slug: string,
  area: ProductArea,
  status: ProductStatus = PRODUCT_STATUS.active
): CatalogProductRecord {
  const isClothing = area === PRODUCT_AREA.clothing;

  return {
    id: slug,
    slug,
    name: slug,
    description: `${slug} demo`,
    area,
    status,
    basePriceArs: 1000,
    clothingSubcategory: isClothing ? "Remeras" : null,
    supplementType: isClothing ? null : "Creatina",
    variants: [
      {
        id: `${slug}-variant`,
        sku: slug.toUpperCase(),
        name: "Única",
        stock: 1
      }
    ],
    images: []
  };
}
