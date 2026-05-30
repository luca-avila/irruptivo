import { describe, expect, it } from "vitest";

import { PRODUCT_AREA, PRODUCT_STATUS, type CatalogProductRecord } from "../catalog/catalog";
import { validateAddToCartSelection } from "./add-to-cart-validation";

const products = [
  {
    id: "training-tee",
    slug: "training-tee-negra",
    name: "Training Tee Negra",
    description: "Remera tecnica para entrenar.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 26000,
    clothingSubcategory: "Remeras",
    variants: [
      {
        id: "tee-black-s",
        sku: "TEE-BLK-S",
        name: "Negro / S",
        stock: 4,
        options: {
          color: "Negro",
          size: "S"
        }
      },
      {
        id: "tee-black-m",
        sku: "TEE-BLK-M",
        name: "Negro / M",
        stock: 0,
        priceOverrideArs: 28500,
        options: {
          color: "Negro",
          size: "M"
        }
      }
    ],
    images: []
  },
  {
    id: "archived-tee",
    slug: "remera-archivada",
    name: "Remera Archivada",
    description: "Producto pausado.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.inactive,
    basePriceArs: 24000,
    clothingSubcategory: "Remeras",
    variants: [
      {
        id: "archived-tee-s",
        sku: "TEE-OLD-S",
        name: "S",
        stock: 6,
        options: {
          color: "Blanco",
          size: "S"
        }
      }
    ],
    images: []
  }
] satisfies CatalogProductRecord[];

describe("add-to-cart variant validation", () => {
  it("validates an active in-stock variant and returns the current effective price", () => {
    expect(
      validateAddToCartSelection({
        productId: "training-tee",
        variantId: "tee-black-s",
        products
      })
    ).toEqual({
      status: "valid",
      item: {
        productId: "training-tee",
        variantId: "tee-black-s",
        sku: "TEE-BLK-S",
        unitPriceArs: 26000,
        availableStock: 4
      }
    });
  });

  it("uses the current variant price override during validation", () => {
    expect(
      validateAddToCartSelection({
        productId: "training-tee",
        variantId: "tee-black-m",
        products: [
          {
            ...products[0],
            variants: [
              {
                ...products[0].variants[1],
                stock: 2
              }
            ]
          }
        ]
      })
    ).toMatchObject({
      status: "valid",
      item: {
        unitPriceArs: 28500,
        availableStock: 2
      }
    });
  });

  it("rejects inactive products", () => {
    expect(
      validateAddToCartSelection({
        productId: "archived-tee",
        variantId: "archived-tee-s",
        products
      })
    ).toEqual({
      status: "invalid",
      reason: "product_unavailable"
    });
  });

  it("rejects missing variants", () => {
    expect(
      validateAddToCartSelection({
        productId: "training-tee",
        variantId: "missing-variant",
        products
      })
    ).toEqual({
      status: "invalid",
      reason: "variant_unavailable"
    });
  });

  it("rejects out-of-stock variants", () => {
    expect(
      validateAddToCartSelection({
        productId: "training-tee",
        variantId: "tee-black-m",
        products
      })
    ).toEqual({
      status: "invalid",
      reason: "out_of_stock"
    });
  });
});
