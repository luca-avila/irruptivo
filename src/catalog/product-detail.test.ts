import { describe, expect, it } from "vitest";

import { AVAILABILITY_LABEL } from "../domain/rules";
import { PRODUCT_AREA, PRODUCT_STATUS, type CatalogProductRecord } from "./catalog";
import {
  getProductDetailPageView,
  getVariantAvailability,
  resolveSelectedVariant
} from "./product-detail";

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
    id: "creatina",
    slug: "creatina-monohidrato",
    name: "Creatina Monohidrato",
    description: "Creatina monohidrato en polvo.",
    area: PRODUCT_AREA.supplement,
    status: PRODUCT_STATUS.active,
    basePriceArs: 29500,
    supplementType: "Creatina",
    variants: [
      {
        id: "creatina-vainilla-300g",
        sku: "CRE-VAI-300G",
        name: "Vainilla / 300 g",
        stock: 2,
        priceOverrideArs: 31500,
        options: {
          flavor: "Vainilla",
          weight: "300 g",
          presentation: "Polvo"
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

describe("product detail variant resolution", () => {
  it("blocks add-to-cart when no variant is selected and shows the base price", () => {
    const selection = resolveSelectedVariant(products[0], {});

    expect(selection).toMatchObject({
      status: "no_selection",
      selectedVariant: null,
      effectivePriceArs: 26000,
      canAddToCart: false,
      availabilityLabel: "Elegí una variante"
    });
  });

  it("blocks add-to-cart when the selected option combination is unavailable", () => {
    const selection = resolveSelectedVariant(products[0], {
      color: "Blanco",
      size: "S"
    });

    expect(selection).toMatchObject({
      status: "unavailable_selection",
      selectedVariant: null,
      effectivePriceArs: 26000,
      canAddToCart: false,
      availabilityLabel: "Combinación no disponible"
    });
  });

  it("blocks add-to-cart when a combined SKU selection is incomplete", () => {
    const selection = resolveSelectedVariant(products[0], {
      color: "Negro"
    });

    expect(selection).toMatchObject({
      status: "no_selection",
      selectedVariant: null,
      effectivePriceArs: 26000,
      canAddToCart: false
    });
  });

  it("enables add-to-cart for a selected in-stock variant", () => {
    const selection = resolveSelectedVariant(products[0], {
      color: "Negro",
      size: "S"
    });

    expect(selection).toMatchObject({
      status: "selected",
      selectedVariant: {
        id: "tee-black-s",
        sku: "TEE-BLK-S",
        availabilityLabel: AVAILABILITY_LABEL.available
      },
      effectivePriceArs: 26000,
      canAddToCart: true,
      availabilityLabel: AVAILABILITY_LABEL.available
    });
  });

  it("disables add-to-cart for a selected out-of-stock variant", () => {
    const selection = resolveSelectedVariant(products[0], {
      color: "Negro",
      size: "M"
    });

    expect(selection).toMatchObject({
      status: "selected",
      selectedVariant: {
        id: "tee-black-m",
        availabilityLabel: AVAILABILITY_LABEL.outOfStock
      },
      effectivePriceArs: 28500,
      canAddToCart: false,
      availabilityLabel: AVAILABILITY_LABEL.outOfStock
    });
  });

  it("uses the selected supplement variant price override", () => {
    const selection = resolveSelectedVariant(products[1], {
      flavor: "Vainilla",
      weight: "300 g",
      presentation: "Polvo"
    });

    expect(selection).toMatchObject({
      selectedVariant: {
        id: "creatina-vainilla-300g"
      },
      effectivePriceArs: 31500,
      canAddToCart: true
    });
  });

  it("returns an unavailable page model for inactive direct URLs", () => {
    expect(
      getProductDetailPageView({
        area: PRODUCT_AREA.clothing,
        slug: "remera-archivada",
        selectedOptions: {},
        products
      })
    ).toMatchObject({
      status: "unavailable",
      backHref: "/coleccion",
      title: "Producto no disponible"
    });
  });

  it("does not expose exact stock counts in public selection models", () => {
    const availability = getVariantAvailability(products[0].variants[0]);
    const selection = resolveSelectedVariant(products[0], {
      color: "Negro",
      size: "S"
    });
    const detail = getProductDetailPageView({
      area: PRODUCT_AREA.clothing,
      slug: "training-tee-negra",
      selectedOptions: {
        color: "Negro",
        size: "S"
      },
      products
    });

    expect(availability).not.toHaveProperty("stock");
    expect(selection.selectedVariant).not.toHaveProperty("stock");
    expect(JSON.stringify(detail)).not.toContain('"stock"');
  });
});
