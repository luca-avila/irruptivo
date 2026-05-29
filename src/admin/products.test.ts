import { describe, expect, it } from "vitest";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductRecord
} from "../catalog/catalog";
import {
  canPublishProduct,
  createProduct,
  setProductStatus,
  updateProduct,
  type ProductUpdateInput
} from "./products";

const baseProducts = [
  {
    id: "training-tee",
    slug: "training-tee-negra",
    name: "Training Tee Negra",
    description: "Remera deportiva.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 26000,
    clothingSubcategory: "Remeras",
    variants: [
      {
        id: "training-tee-m",
        sku: "TEE-BLK-M",
        name: "Negro / M",
        stock: 4
      }
    ],
    images: []
  },
  {
    id: "empty-shell",
    slug: "campera-negra",
    name: "Campera Negra",
    description: "Producto pendiente de variantes.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.inactive,
    basePriceArs: 52000,
    clothingSubcategory: "Camperas",
    variants: [],
    images: []
  }
] satisfies CatalogProductRecord[];

describe("admin product management", () => {
  it("creates products with globally unique generated slugs", () => {
    const result = createProduct(
      {
        name: "Training Tee Negra",
        description: "Nueva tanda de remeras.",
        area: PRODUCT_AREA.clothing,
        clothingSubcategory: "Remeras",
        basePriceArs: 28000,
        status: PRODUCT_STATUS.inactive
      },
      baseProducts
    );

    expect(result).toMatchObject({
      ok: true,
      product: {
        slug: "training-tee-negra-2",
        status: PRODUCT_STATUS.inactive,
        variants: []
      }
    });
  });

  it("does not allow edits to change an existing slug", () => {
    const result = updateProduct(
      "training-tee",
      {
        name: "Training Tee Actualizada",
        description: "Nueva descripcion.",
        area: PRODUCT_AREA.clothing,
        clothingSubcategory: "Remeras",
        basePriceArs: 30000,
        slug: "slug-forzado"
      } as ProductUpdateInput & { slug: string },
      baseProducts
    );

    expect(result).toMatchObject({
      ok: true,
      product: {
        name: "Training Tee Actualizada",
        slug: "training-tee-negra"
      }
    });
  });

  it("prevents products without variants from becoming active", () => {
    const result = setProductStatus(
      "empty-shell",
      PRODUCT_STATUS.active,
      baseProducts
    );

    expect(canPublishProduct(baseProducts[1])).toBe(false);
    expect(result).toEqual({
      ok: false,
      error: {
        code: "cannot_publish_without_variants",
        message: "El producto necesita al menos una variante/SKU para activarse."
      }
    });
  });

  it("allows products with variants to be deactivated and reactivated", () => {
    const inactiveResult = setProductStatus(
      "training-tee",
      PRODUCT_STATUS.inactive,
      baseProducts
    );

    expect(inactiveResult).toMatchObject({
      ok: true,
      product: {
        status: PRODUCT_STATUS.inactive
      }
    });

    const activeResult =
      inactiveResult.ok &&
      setProductStatus("training-tee", PRODUCT_STATUS.active, inactiveResult.products);

    expect(activeResult).toMatchObject({
      ok: true,
      product: {
        status: PRODUCT_STATUS.active
      }
    });
  });

  it("preserves the slug when valid product fields are updated", () => {
    const result = updateProduct(
      "training-tee",
      {
        name: "Training Tee Negra V2",
        description: "Remera deportiva actualizada.",
        area: PRODUCT_AREA.supplement,
        supplementType: "Proteina",
        basePriceArs: 31000
      },
      baseProducts
    );

    expect(result).toMatchObject({
      ok: true,
      product: {
        slug: "training-tee-negra",
        area: PRODUCT_AREA.supplement,
        supplementType: "Proteina",
        clothingSubcategory: null,
        basePriceArs: 31000
      }
    });
  });
});
