import { describe, expect, it } from "vitest";

import { getAvailableStock, setVariantStock } from "./stock";

const variant = {
  id: "tee-black-m",
  sku: "TEE-BLK-M",
  name: "Negro / M",
  stock: 2
};

describe("variant stock validation module", () => {
  it("exposes exact available stock for admin and validation flows", () => {
    expect(getAvailableStock(variant)).toBe(2);
  });

  it("sets exact stock counts without mutating the original variant", () => {
    const updatedVariant = setVariantStock(variant, 0);

    expect(updatedVariant).toMatchObject({ stock: 0 });
    expect(variant.stock).toBe(2);
  });

  it("rejects negative stock counts", () => {
    expect(() => setVariantStock(variant, -1)).toThrow(
      "stock must be a non-negative integer"
    );
  });
});
