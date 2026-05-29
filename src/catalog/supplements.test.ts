import { describe, expect, it } from "vitest";

import { AVAILABILITY_LABEL } from "../domain/rules";
import { PRODUCT_AREA, PRODUCT_STATUS, type CatalogProductRecord } from "./catalog";
import { listSupplementProducts } from "./supplements";

const products = [
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
        stock: 6
      }
    ],
    images: [
      {
        id: "whey-front",
        path: "/products/whey-chocolate-01.webp",
        alt: "Proteina whey sabor chocolate",
        sortOrder: 1
      }
    ]
  },
  {
    id: "creatina-monohidrato",
    slug: "creatina-monohidrato-300g",
    name: "Creatina Monohidrato 300 g",
    description: "Creatina monohidrato en presentacion de 300 gramos.",
    area: PRODUCT_AREA.supplement,
    status: PRODUCT_STATUS.active,
    basePriceArs: 28500,
    supplementType: "Creatina",
    variants: [
      {
        id: "creatina-300g",
        sku: "CREATINA-300G",
        name: "300 g",
        stock: 0
      }
    ],
    images: []
  },
  {
    id: "pre-entreno",
    slug: "pre-entreno-frutilla",
    name: "Pre-entreno Frutilla",
    description: "Pre-entreno sabor frutilla.",
    area: PRODUCT_AREA.supplement,
    status: PRODUCT_STATUS.inactive,
    basePriceArs: 22100,
    supplementType: "Pre-entreno",
    variants: [
      {
        id: "pre-entreno-frutilla-300g",
        sku: "PRE-FRU-300G",
        name: "Frutilla / 300 g",
        stock: 4
      }
    ],
    images: []
  },
  {
    id: "training-tee",
    slug: "training-tee",
    name: "Training Tee",
    description: "Remera para entrenamiento.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 26000,
    clothingSubcategory: "Remeras",
    variants: [
      {
        id: "training-tee-m",
        sku: "TEE-M",
        name: "M",
        stock: 3
      }
    ],
    images: []
  }
] satisfies CatalogProductRecord[];

describe("supplement listing", () => {
  it("lists only active supplement products", () => {
    const listing = listSupplementProducts({ products });

    expect(listing.products.map((product) => product.slug)).toEqual([
      "whey-chocolate",
      "creatina-monohidrato-300g"
    ]);
  });

  it("keeps active out-of-stock supplements visible with Sin stock", () => {
    const listing = listSupplementProducts({ products });

    expect(
      listing.products.find((product) => product.slug === "creatina-monohidrato-300g")
    ).toMatchObject({
      availabilityLabel: AVAILABILITY_LABEL.outOfStock,
      isAvailable: false
    });
  });

  it("builds card links for supplement detail URLs", () => {
    const listing = listSupplementProducts({ products });

    expect(listing.products[0]).toMatchObject({
      slug: "whey-chocolate",
      href: "/suplementos/whey-chocolate"
    });
  });

  it("filters supplements by type and excludes non-matches", () => {
    const listing = listSupplementProducts({
      products,
      selectedType: "proteina"
    });

    expect(listing.products.map((product) => product.slug)).toEqual([
      "whey-chocolate"
    ]);
    expect(listing.filters).toContainEqual(
      expect.objectContaining({
        label: "Proteína",
        value: "proteina",
        isActive: true
      })
    );
  });

  it("returns an actionable empty state when the catalog has no active supplements", () => {
    const listing = listSupplementProducts({
      products: products.filter((product) => product.area === PRODUCT_AREA.clothing)
    });

    expect(listing.products).toEqual([]);
    expect(listing.emptyState).toEqual({
      title: "Todavía no hay suplementos disponibles.",
      description: "Mientras tanto podés seguir explorando la colección principal.",
      actionLabel: "Ver colección",
      actionHref: "/coleccion"
    });
  });

  it("returns an actionable empty state when a filter has no matches", () => {
    const listing = listSupplementProducts({
      products,
      selectedType: "pre-entreno"
    });

    expect(listing.products).toEqual([]);
    expect(listing.emptyState).toEqual({
      title: "No hay suplementos para este filtro.",
      description: "Probá con otro tipo o volvé a ver todos los suplementos activos.",
      actionLabel: "Ver todos",
      actionHref: "/suplementos"
    });
  });
});
