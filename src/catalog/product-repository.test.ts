import { describe, expect, it } from "vitest";

import { PRODUCT_AREA, PRODUCT_STATUS } from "./catalog";
import {
  mapProductRowToRecord,
  type CatalogProductRow
} from "./product-repository";

describe("catalog product repository mapping", () => {
  it("maps database rows to catalog records without requiring a database", () => {
    const deletedAt = new Date("2026-05-30T12:00:00.000Z");
    const renditions = {
      card: {
        path: "products/test/card.webp",
        width: 640,
        height: 853,
        byteSize: 12000,
        mimeType: "image/webp"
      },
      detail: {
        path: "products/test/detail.webp",
        width: 1200,
        height: 1600,
        byteSize: 32000,
        mimeType: "image/webp"
      },
      original: {
        path: "products/test/original.webp",
        width: 1800,
        height: 2400,
        byteSize: 76000,
        mimeType: "image/webp"
      }
    };
    const row: CatalogProductRow = {
      id: "test-product",
      slug: "test-product",
      name: "Test Product",
      description: "Product mapped from a database row.",
      area: PRODUCT_AREA.clothing,
      status: PRODUCT_STATUS.inactive,
      basePriceArs: 45000,
      clothingSubcategory: "Remeras",
      supplementType: null,
      variants: [
        {
          id: "variant-m",
          sku: "SKU-M",
          name: "Negro / M",
          stock: 0,
          position: 1,
          priceOverrideArs: 47000,
          optionColor: "Negro",
          optionSize: "M",
          optionFlavor: "Chocolate",
          optionWeight: "500 g",
          optionPresentation: "Polvo"
        },
        {
          id: "variant-s",
          sku: "SKU-S",
          name: "Negro / S",
          stock: 2,
          position: 0,
          priceOverrideArs: null,
          optionColor: "Negro",
          optionSize: "S",
          optionFlavor: null,
          optionWeight: null,
          optionPresentation: null
        }
      ],
      images: [
        {
          id: "deleted-image",
          path: "products/test/deleted.webp",
          alt: "Imagen eliminada",
          sortOrder: 2,
          width: null,
          height: null,
          renditions: null,
          associatedColor: "Negro",
          variantId: "variant-m",
          deletedAt
        },
        {
          id: "rendition-image",
          path: "products/test/detail.webp",
          alt: "Imagen con renditions",
          sortOrder: 1,
          width: 1200,
          height: 1600,
          renditions,
          associatedColor: null,
          variantId: null,
          deletedAt: null
        }
      ]
    };

    const record = mapProductRowToRecord(row);

    expect(record.variants.map((variant) => variant.id)).toEqual([
      "variant-s",
      "variant-m"
    ]);
    expect(record.variants[0]).toMatchObject({
      id: "variant-s",
      priceOverrideArs: null,
      options: {
        color: "Negro",
        size: "S"
      }
    });
    expect(record.variants[1]).toMatchObject({
      id: "variant-m",
      priceOverrideArs: 47000,
      options: {
        color: "Negro",
        size: "M",
        flavor: "Chocolate",
        weight: "500 g",
        presentation: "Polvo"
      }
    });
    expect(record.images.map((image) => image.id)).toEqual([
      "rendition-image",
      "deleted-image"
    ]);
    expect(record.images[0]).toMatchObject({
      path: "products/test/detail.webp",
      width: 1200,
      height: 1600,
      renditions
    });
    expect(record.images[1]).toMatchObject({
      path: "products/test/deleted.webp",
      renditions: undefined,
      associatedColor: "Negro",
      variantId: "variant-m",
      deletedAt: "2026-05-30T12:00:00.000Z"
    });
  });
});
