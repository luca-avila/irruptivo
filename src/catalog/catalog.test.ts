import { describe, expect, it } from "vitest";

import { AVAILABILITY_LABEL } from "../domain/rules";
import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  getProductCardView,
  getProductDetailView,
  getPublicProductBySlug,
  listActiveProducts,
  listActiveProductsByArea,
  type CatalogProductRecord
} from "./catalog";

const products = [
  {
    id: "hoodie-black",
    slug: "hoodie-negro",
    name: "Hoodie Negro",
    description: "Hoodie pesado de algodon.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 42000,
    clothingSubcategory: "Buzos",
    variants: [
      {
        id: "hoodie-black-m",
        sku: "HOODIE-BLK-M",
        name: "Negro / M",
        stock: 2
      }
    ],
    images: [
      {
        id: "hoodie-secondary",
        path: "/products/hoodie-negro-02.webp",
        alt: "Hoodie negro visto de espalda",
        sortOrder: 2
      },
      {
        id: "hoodie-primary",
        path: "/products/hoodie-negro-01.webp",
        alt: "Hoodie negro frente",
        sortOrder: 1
      }
    ]
  },
  {
    id: "tee-white",
    slug: "remera-blanca",
    name: "Remera Blanca",
    description: "Remera oversized.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.inactive,
    basePriceArs: 24000,
    clothingSubcategory: "Remeras",
    variants: [
      {
        id: "tee-white-s",
        sku: "TEE-WHT-S",
        name: "Blanco / S",
        stock: 8
      }
    ],
    images: []
  },
  {
    id: "whey-chocolate",
    slug: "whey-chocolate",
    name: "Whey Chocolate",
    description: "Proteina sabor chocolate.",
    area: PRODUCT_AREA.supplement,
    status: PRODUCT_STATUS.active,
    basePriceArs: 31500,
    supplementType: "Proteina",
    variants: [
      {
        id: "whey-chocolate-1kg",
        sku: "WHEY-CHOC-1KG",
        name: "Chocolate / 1 kg",
        stock: 0,
        priceOverrideArs: 33700
      }
    ],
    images: []
  }
] satisfies CatalogProductRecord[];

describe("product catalog read path", () => {
  it("returns active products for public listings", () => {
    expect(listActiveProducts(products).map((product) => product.slug)).toEqual([
      "hoodie-negro",
      "whey-chocolate"
    ]);
  });

  it("excludes inactive products from public listings", () => {
    expect(listActiveProducts(products).map((product) => product.slug)).not.toContain(
      "remera-blanca"
    );
  });

  it("keeps active out-of-stock products visible with Sin stock", () => {
    const whey = listActiveProducts(products).find(
      (product) => product.slug === "whey-chocolate"
    );

    expect(whey).toMatchObject({
      slug: "whey-chocolate",
      availabilityLabel: AVAILABILITY_LABEL.outOfStock,
      isAvailable: false
    });
  });

  it("filters active products by area", () => {
    expect(
      listActiveProductsByArea(PRODUCT_AREA.clothing, products).map(
        (product) => product.slug
      )
    ).toEqual(["hoodie-negro"]);

    expect(
      listActiveProductsByArea(PRODUCT_AREA.supplement, products).map(
        (product) => product.slug
      )
    ).toEqual(["whey-chocolate"]);
  });

  it("distinguishes active, inactive, and missing slug lookups", () => {
    expect(getPublicProductBySlug("hoodie-negro", products)).toMatchObject({
      status: "active",
      product: { slug: "hoodie-negro" }
    });

    expect(getPublicProductBySlug("remera-blanca", products)).toEqual({
      status: "inactive"
    });

    expect(getPublicProductBySlug("no-existe", products)).toEqual({
      status: "not_found"
    });
  });

  it("orders images consistently for cards and product detail", () => {
    expect(getProductCardView(products[0]).image?.path).toBe(
      "/products/hoodie-negro-01.webp"
    );

    expect(
      getProductDetailView(products[0]).images.map((image) => image.path)
    ).toEqual([
      "/products/hoodie-negro-01.webp",
      "/products/hoodie-negro-02.webp"
    ]);
  });

  it("resolves public prices from variant override when present", () => {
    expect(getProductCardView(products[2])).toMatchObject({
      priceArs: 33700
    });

    expect(getProductDetailView(products[2]).variants[0]).toMatchObject({
      effectivePriceArs: 33700,
      availabilityLabel: AVAILABILITY_LABEL.outOfStock
    });
  });
});
