import { describe, expect, it } from "vitest";

import { AVAILABILITY_LABEL } from "../domain/rules";
import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  getClothingCollectionListing,
  getProductCardView,
  getProductDetailView,
  getPublicProductBySlug,
  listActiveProducts,
  listActiveProductsByArea,
  searchActiveProductsByName,
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
      status: "inactive",
      product: {
        id: "tee-white",
        slug: "remera-blanca",
        name: "Remera Blanca",
        description: "Remera oversized.",
        area: PRODUCT_AREA.clothing,
        contextLabel: "Remeras",
        images: []
      }
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

describe("global product name search", () => {
  it("returns an empty-query model for blank searches", () => {
    expect(searchActiveProductsByName("  ", products)).toEqual({
      query: "",
      results: [],
      emptyState: {
        reason: "empty_query"
      }
    });
  });

  it("matches active product names case-insensitively across product areas", () => {
    const search = searchActiveProductsByName("O", products);

    expect(search.results.map((product) => product.slug)).toEqual([
      "hoodie-negro",
      "whey-chocolate"
    ]);
    expect(search.emptyState).toBeNull();
  });

  it("excludes inactive products even when their names match", () => {
    const search = searchActiveProductsByName("remera", products);

    expect(search.results).toEqual([]);
    expect(search.emptyState).toEqual({
      reason: "no_results",
      query: "remera"
    });
  });

  it("maps clothing results to collection detail URLs", () => {
    const search = searchActiveProductsByName("hoodie", products);

    expect(search.results[0]).toMatchObject({
      slug: "hoodie-negro",
      areaLabel: "Colección",
      contextLabel: "Buzos",
      href: "/coleccion/hoodie-negro"
    });
  });

  it("maps supplement results to supplement detail URLs", () => {
    const search = searchActiveProductsByName("whey", products);

    expect(search.results[0]).toMatchObject({
      slug: "whey-chocolate",
      areaLabel: "Suplementos",
      contextLabel: "Proteina",
      href: "/suplementos/whey-chocolate"
    });
  });

  it("returns a no-results model when no active product name matches", () => {
    expect(searchActiveProductsByName("campera", products)).toEqual({
      query: "campera",
      results: [],
      emptyState: {
        reason: "no_results",
        query: "campera"
      }
    });
  });
});

const clothingListingProducts = [
  {
    id: "tee-black",
    slug: "remera-negra",
    name: "Remera Negra",
    description: "Remera liviana para entrenar.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 25000,
    clothingSubcategory: "Remeras",
    variants: [
      {
        id: "tee-black-m",
        sku: "TEE-BLK-M",
        name: "Negro / M",
        stock: 6
      }
    ],
    images: []
  },
  {
    id: "short-black",
    slug: "short-negro",
    name: "Short Negro",
    description: "Short deportivo.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 31000,
    clothingSubcategory: "Shorts",
    variants: [
      {
        id: "short-black-m",
        sku: "SHORT-BLK-M",
        name: "Negro / M",
        stock: 0
      }
    ],
    images: []
  },
  {
    id: "tee-white",
    slug: "remera-blanca",
    name: "Remera Blanca",
    description: "Remera fuera de catalogo.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.inactive,
    basePriceArs: 24000,
    clothingSubcategory: "Remeras",
    variants: [
      {
        id: "tee-white-s",
        sku: "TEE-WHT-S",
        name: "Blanco / S",
        stock: 3
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
        stock: 4
      }
    ],
    images: []
  }
] satisfies CatalogProductRecord[];

describe("clothing collection listing", () => {
  it("lists only active clothing products", () => {
    const listing = getClothingCollectionListing({}, clothingListingProducts);

    expect(listing.products.map((product) => product.slug)).toEqual([
      "remera-negra",
      "short-negro"
    ]);
    expect(listing.products.map((product) => product.slug)).not.toContain(
      "remera-blanca"
    );
    expect(listing.products.map((product) => product.slug)).not.toContain(
      "whey-chocolate"
    );
  });

  it("keeps active out-of-stock clothing visible with Sin stock", () => {
    const listing = getClothingCollectionListing({}, clothingListingProducts);
    const short = listing.products.find((product) => product.slug === "short-negro");

    expect(short).toMatchObject({
      slug: "short-negro",
      availabilityLabel: AVAILABILITY_LABEL.outOfStock,
      isAvailable: false
    });
  });

  it("builds data-driven clothing subcategory filters", () => {
    const listing = getClothingCollectionListing({}, clothingListingProducts);

    expect(listing.filters).toEqual([
      {
        label: "Todo",
        value: "todo",
        isActive: true
      },
      {
        label: "Remeras",
        value: "Remeras",
        isActive: false
      },
      {
        label: "Shorts",
        value: "Shorts",
        isActive: false
      }
    ]);
  });

  it("filters clothing products by subcategory", () => {
    const listing = getClothingCollectionListing(
      { subcategory: "Remeras" },
      clothingListingProducts
    );

    expect(listing.products.map((product) => product.slug)).toEqual(["remera-negra"]);
    expect(listing.filters.find((filter) => filter.value === "Remeras")).toMatchObject(
      {
        isActive: true
      }
    );
  });

  it("returns an empty-state model when a subcategory has no matches", () => {
    const listing = getClothingCollectionListing(
      { subcategory: "Buzos" },
      clothingListingProducts
    );

    expect(listing.products).toEqual([]);
    expect(listing.emptyState).toEqual({
      reason: "empty_filter",
      selectedLabel: "Buzos"
    });
  });

  it("returns an empty-state model when there are no active clothing products", () => {
    const listing = getClothingCollectionListing({}, [
      clothingListingProducts[2],
      clothingListingProducts[3]
    ]);

    expect(listing.products).toEqual([]);
    expect(listing.emptyState).toEqual({
      reason: "empty_catalog"
    });
  });
});
