import { describe, expect, it } from "vitest";

import { AVAILABILITY_LABEL } from "../domain/rules";
import { PRODUCT_AREA } from "./catalog";
import { createVariant, getVariantAvailability, resolveUnitPrice } from "./variants";

describe("variant availability module", () => {
  it.each([
    [0, AVAILABILITY_LABEL.outOfStock, false],
    [1, AVAILABILITY_LABEL.lowStock, true],
    [3, AVAILABILITY_LABEL.lowStock, true],
    [4, AVAILABILITY_LABEL.available, true]
  ])(
    "maps %i units to the public availability label",
    (stock, availabilityLabel, isAvailable) => {
      expect(getVariantAvailability({ stock })).toEqual({
        availabilityLabel,
        isAvailable
      });
    }
  );

  it("uses a variant price override before the product base price", () => {
    expect(
      resolveUnitPrice({
        productBasePriceArs: 28000,
        variantPriceOverrideArs: 31500
      })
    ).toBe(31500);
  });

  it("creates clothing variants with combined color and size option values", () => {
    const variant = createVariant({
      productId: "training-tee",
      area: PRODUCT_AREA.clothing,
      sku: " TEE-BLK-M ",
      stock: 4,
      priceOverrideArs: null,
      options: {
        color: " Negro ",
        size: " M "
      },
      existingVariants: []
    });

    expect(variant).toMatchObject({
      id: "training-tee-tee-blk-m",
      sku: "TEE-BLK-M",
      name: "Negro / M",
      stock: 4,
      priceOverrideArs: null,
      options: {
        color: "Negro",
        size: "M"
      }
    });
  });

  it("requires a complete clothing option combination", () => {
    expect(
      createVariant({
        productId: "training-tee",
        area: PRODUCT_AREA.clothing,
        sku: "TEE-BLK",
        stock: 4,
        priceOverrideArs: null,
        options: {
          color: "Negro"
        },
        existingVariants: []
      })
    ).toBeNull();
  });
});
