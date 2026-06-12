import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductRecord
} from "../catalog/catalog";
import { getProductDetailView } from "../catalog/catalog";
import { AVAILABILITY_LABEL } from "../domain/rules";
import {
  addProductVariant,
  canPublishProduct,
  createProduct,
  getAdminProductVariantViews,
  isDuplicateVariantSkuPersistenceError,
  listAdminProducts,
  setProductStatus,
  updateProduct,
  updateProductVariant,
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
        stock: 4,
        options: {
          color: "Negro",
          size: "M"
        }
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

const productListFilterProducts = [
  {
    id: "buzo-training",
    slug: "buzo-training",
    name: "Buzo Training",
    description: "Buzo de entrenamiento.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.inactive,
    basePriceArs: 52000,
    clothingSubcategory: "Remeras",
    variants: [],
    images: []
  },
  {
    id: "creatina-monohidrato",
    slug: "creatina-monohidrato",
    name: "Creatina Monohidrato",
    description: "Creatina.",
    area: PRODUCT_AREA.supplement,
    status: PRODUCT_STATUS.active,
    basePriceArs: 31000,
    supplementType: "Creatina",
    variants: [],
    images: []
  },
  {
    id: "musculosa-lisa",
    slug: "musculosa-lisa",
    name: "Musculosa Lisa",
    description: "Musculosa sin subcategoría.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 24000,
    clothingSubcategory: null,
    variants: [],
    images: []
  },
  {
    id: "proteina-whey",
    slug: "proteina-whey",
    name: "Proteína Whey",
    description: "Proteína en polvo.",
    area: PRODUCT_AREA.supplement,
    status: PRODUCT_STATUS.active,
    basePriceArs: 42000,
    supplementType: "Proteína",
    variants: [],
    images: []
  },
  {
    id: "remera-oversize",
    slug: "remera-oversize",
    name: "Remera Oversize",
    description: "Remera oversize.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 26000,
    clothingSubcategory: "Remeras",
    variants: [],
    images: []
  },
  {
    id: "short-runner",
    slug: "short-runner",
    name: "Short Runner",
    description: "Short deportivo.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 28000,
    clothingSubcategory: "Short",
    variants: [],
    images: []
  },
  {
    id: "suplemento-pendiente",
    slug: "suplemento-pendiente",
    name: "Suplemento Pendiente",
    description: "Suplemento inactivo.",
    area: PRODUCT_AREA.supplement,
    status: PRODUCT_STATUS.inactive,
    basePriceArs: 39000,
    supplementType: "Proteína",
    variants: [],
    images: []
  },
  {
    id: "vitamina-daily",
    slug: "vitamina-daily",
    name: "Vitamina Daily",
    description: "Suplemento sin tipo.",
    area: PRODUCT_AREA.supplement,
    status: PRODUCT_STATUS.active,
    basePriceArs: 18000,
    supplementType: null,
    variants: [],
    images: []
  }
] satisfies CatalogProductRecord[];

function productIds(view: ReturnType<typeof listAdminProducts>): string[] {
  return view.products.map((product) => product.id);
}

function productStatusMetricCounts(
  view: ReturnType<typeof listAdminProducts>
): [number, number, number] {
  return [
    view.totalProductCount,
    view.activeProductCount,
    view.inactiveProductCount
  ];
}

describe("admin product list filters", () => {
  it("filters products by area and treats todas as unfiltered", () => {
    const allProducts = listAdminProducts(productListFilterProducts, {
      area: "todas"
    });
    const clothingProducts = listAdminProducts(productListFilterProducts, {
      area: "coleccion"
    });
    const supplementProducts = listAdminProducts(productListFilterProducts, {
      area: "suplementos"
    });

    expect(productIds(allProducts)).toEqual([
      "buzo-training",
      "creatina-monohidrato",
      "musculosa-lisa",
      "proteina-whey",
      "remera-oversize",
      "short-runner",
      "suplemento-pendiente",
      "vitamina-daily"
    ]);
    expect(productIds(clothingProducts)).toEqual([
      "buzo-training",
      "musculosa-lisa",
      "remera-oversize",
      "short-runner"
    ]);
    expect(productIds(supplementProducts)).toEqual([
      "creatina-monohidrato",
      "proteina-whey",
      "suplemento-pendiente",
      "vitamina-daily"
    ]);
  });

  it("scopes status metrics to the selected area", () => {
    const view = listAdminProducts(productListFilterProducts, {
      area: "coleccion"
    });

    expect(productStatusMetricCounts(view)).toEqual([4, 3, 1]);
  });

  it("scopes status metrics to the selected area and category", () => {
    const view = listAdminProducts(productListFilterProducts, {
      area: "coleccion",
      category: "remeras"
    });

    expect(productStatusMetricCounts(view)).toEqual([2, 1, 1]);
    expect(view.activeProductCount + view.inactiveProductCount).toBe(
      view.totalProductCount
    );
  });

  it("keeps status metrics global when all areas are selected", () => {
    const view = listAdminProducts(productListFilterProducts, {
      area: "todas"
    });

    expect(productStatusMetricCounts(view)).toEqual([8, 6, 2]);
  });

  it("keeps status metrics independent from the selected status", () => {
    const metricCounts = ["todos", "activos", "inactivos"].map((status) =>
      productStatusMetricCounts(
        listAdminProducts(productListFilterProducts, {
          status,
          area: "coleccion",
          category: "remeras"
        })
      )
    );

    expect(metricCounts).toEqual([
      [2, 1, 1],
      [2, 1, 1],
      [2, 1, 1]
    ]);
  });

  it("filters categories within one area and normalizes accented admin text", () => {
    const view = listAdminProducts(productListFilterProducts, {
      area: "suplementos",
      category: "PROTEÍNA"
    });

    expect(view.selectedCategory).toBe("proteina");
    expect(productIds(view)).toEqual(["proteina-whey", "suplemento-pendiente"]);
    expect(view.categoryFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Proteína",
          value: "proteina",
          count: 2,
          isActive: true
        })
      ])
    );
  });

  it("selects uncategorized products through the Sin asignar bucket only when it exists", () => {
    const view = listAdminProducts(productListFilterProducts, {
      area: "coleccion"
    });
    const unassignedFilter = view.categoryFilters.find(
      (filter) => filter.label === "Sin subcategoría"
    );

    expect(unassignedFilter).toEqual(
      expect.objectContaining({
        count: 1,
        isActive: false
      })
    );
    expect(unassignedFilter?.value).toBeTruthy();

    const selectedView = listAdminProducts(productListFilterProducts, {
      area: "coleccion",
      category: unassignedFilter?.value
    });

    expect(productIds(selectedView)).toEqual(["musculosa-lisa"]);
    expect(
      selectedView.categoryFilters.find(
        (filter) => filter.label === "Sin subcategoría"
      )
    ).toEqual(expect.objectContaining({ isActive: true }));

    const categorizedOnlyView = listAdminProducts(
      productListFilterProducts.filter(
        (product) => product.id !== "musculosa-lisa"
      ),
      {
        area: "coleccion"
      }
    );

    expect(
      categorizedOnlyView.categoryFilters.some(
        (filter) => filter.label === "Sin subcategoría"
      )
    ).toBe(false);
  });

  it("composes status, area and category as AND filters", () => {
    const view = listAdminProducts(productListFilterProducts, {
      status: "activos",
      area: "suplementos",
      category: "proteina"
    });

    expect(productIds(view)).toEqual(["proteina-whey"]);
    expect(view.areaFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: "coleccion",
          count: 3
        }),
        expect.objectContaining({
          value: "suplementos",
          count: 3
        })
      ])
    );
    expect(view.categoryFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Proteína",
          count: 1,
          isActive: true
        })
      ])
    );
  });

  it("hides category filters under todas and reports area/category counts from the active set", () => {
    const allAreasView = listAdminProducts(productListFilterProducts, {
      status: "activos",
      area: "todas"
    });
    const supplementsView = listAdminProducts(productListFilterProducts, {
      status: "activos",
      area: "suplementos"
    });

    expect(allAreasView.categoryFilters).toEqual([]);
    expect(allAreasView.areaFilters).toEqual([
      expect.objectContaining({
        value: "todas",
        count: 6,
        isActive: true
      }),
      expect.objectContaining({
        value: "coleccion",
        count: 3,
        isActive: false
      }),
      expect.objectContaining({
        value: "suplementos",
        count: 3,
        isActive: false
      })
    ]);
    expect(supplementsView.categoryFilters).toEqual([
      expect.objectContaining({
        value: null,
        label: "Todos",
        count: 3,
        isActive: true
      }),
      expect.objectContaining({
        label: "Creatina",
        count: 1
      }),
      expect.objectContaining({
        label: "Proteína",
        count: 1
      }),
      expect.objectContaining({
        label: "Sin tipo",
        count: 1
      })
    ]);
  });
});

describe("admin product management", () => {
  it("preserves product description line breaks while normalizing horizontal whitespace", () => {
    const result = createProduct(
      {
        name: "Remera multilinea",
        description:
          "  Línea uno\t\tcon   espacios\r\n  Línea dos\r\n\r\n\r\nLínea tres  ",
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
        description: "Línea uno con espacios\nLínea dos\n\nLínea tres"
      }
    });
  });

  it("enforces product descriptions between 1 and 5000 normalized characters", () => {
    const accepted = createProduct(
      {
        name: "Descripción larga válida",
        description: "x".repeat(5000),
        area: PRODUCT_AREA.clothing,
        clothingSubcategory: "Remeras",
        basePriceArs: 28000,
        status: PRODUCT_STATUS.inactive
      },
      baseProducts
    );
    const tooLong = createProduct(
      {
        name: "Descripción demasiado larga",
        description: "x".repeat(5001),
        area: PRODUCT_AREA.clothing,
        clothingSubcategory: "Remeras",
        basePriceArs: 28000,
        status: PRODUCT_STATUS.inactive
      },
      baseProducts
    );
    const empty = createProduct(
      {
        name: "Descripción vacía",
        description: " \n\t\r\n ",
        area: PRODUCT_AREA.clothing,
        clothingSubcategory: "Remeras",
        basePriceArs: 28000,
        status: PRODUCT_STATUS.inactive
      },
      baseProducts
    );

    expect(accepted).toMatchObject({
      ok: true,
      product: {
        description: "x".repeat(5000)
      }
    });
    expect(tooLong).toMatchObject({
      ok: false,
      error: {
        code: "validation"
      }
    });
    expect(empty).toMatchObject({
      ok: false,
      error: {
        code: "validation"
      }
    });
  });

  it("keeps shared text normalization unchanged for product names and variant SKUs", () => {
    const productResult = createProduct(
      {
        name: "  Training\nTee\t\tNegra  ",
        description: "Descripción válida.",
        area: PRODUCT_AREA.clothing,
        clothingSubcategory: "Remeras",
        basePriceArs: 28000,
        status: PRODUCT_STATUS.inactive
      },
      []
    );

    if (!productResult.ok) {
      throw new Error("Expected product creation to succeed");
    }

    const variantResult = addProductVariant(
      productResult.product.id,
      {
        sku: " tee\nblk\t\tm ",
        color: "Negro",
        size: "M",
        stock: 2,
        priceOverrideArs: null
      },
      productResult.products
    );

    expect(productResult.product.name).toBe("Training Tee Negra");
    expect(variantResult).toMatchObject({
      ok: true,
      product: {
        variants: [
          {
            sku: "tee blk m"
          }
        ]
      }
    });
  });

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

  it("adds clothing variants with option values, exact stock and price overrides", () => {
    const result = addProductVariant(
      "empty-shell",
      {
        sku: "CAMP-BLK-M",
        color: "Negro",
        size: "M",
        stock: 2,
        priceOverrideArs: 61000
      },
      baseProducts
    );

    expect(result).toMatchObject({
      ok: true,
      product: {
        variants: [
          {
            sku: "CAMP-BLK-M",
            name: "Negro / M",
            stock: 2,
            priceOverrideArs: 61000,
            options: {
              color: "Negro",
              size: "M"
            }
          }
        ]
      }
    });

    if (!result.ok) {
      throw new Error("Expected variant creation to succeed");
    }

    expect(getAdminProductVariantViews(result.product)[0]).toMatchObject({
      sku: "CAMP-BLK-M",
      stockCount: 2,
      stockLabel: "2 unidades",
      effectivePriceArs: 61000,
      availabilityLabel: AVAILABILITY_LABEL.lowStock
    });
  });

  it("adds supplement variants with flavor, weight and presentation values", () => {
    const supplementProducts = [
      ...baseProducts,
      {
        id: "whey-shell",
        slug: "whey-shell",
        name: "Whey",
        description: "Proteina en polvo.",
        area: PRODUCT_AREA.supplement,
        status: PRODUCT_STATUS.inactive,
        basePriceArs: 32000,
        supplementType: "Proteina",
        variants: [],
        images: []
      }
    ] satisfies CatalogProductRecord[];

    const result = addProductVariant(
      "whey-shell",
      {
        sku: "WHEY-CHO-1KG",
        flavor: "Chocolate",
        weight: "1 kg",
        presentation: "Polvo",
        stock: 5,
        priceOverrideArs: null
      },
      supplementProducts
    );

    expect(result).toMatchObject({
      ok: true,
      product: {
        variants: [
          {
            sku: "WHEY-CHO-1KG",
            name: "Chocolate / 1 kg / Polvo",
            stock: 5,
            priceOverrideArs: null,
            options: {
              flavor: "Chocolate",
              weight: "1 kg",
              presentation: "Polvo"
            }
          }
        ]
      }
    });
  });

  it("allows activation once a valid variant exists", () => {
    const withVariant = addProductVariant(
      "empty-shell",
      {
        sku: "CAMP-BLK-M",
        color: "Negro",
        size: "M",
        stock: 0,
        priceOverrideArs: null
      },
      baseProducts
    );

    if (!withVariant.ok) {
      throw new Error("Expected variant creation to succeed");
    }

    expect(canPublishProduct(withVariant.product)).toBe(true);
    expect(
      setProductStatus("empty-shell", PRODUCT_STATUS.active, withVariant.products)
    ).toMatchObject({
      ok: true,
      product: {
        status: PRODUCT_STATUS.active
      }
    });
  });

  it("updates variant stock and keeps exact counts admin-only", () => {
    const withVariant = addProductVariant(
      "empty-shell",
      {
        sku: "CAMP-BLK-M",
        color: "Negro",
        size: "M",
        stock: 4,
        priceOverrideArs: null
      },
      baseProducts
    );

    if (!withVariant.ok) {
      throw new Error("Expected variant creation to succeed");
    }

    const variantId = withVariant.product.variants[0]?.id;
    const updated = updateProductVariant(
      "empty-shell",
      variantId ?? "",
      {
        sku: "CAMP-BLK-M",
        color: "Negro",
        size: "M",
        stock: 0,
        priceOverrideArs: 58000
      },
      withVariant.products
    );

    expect(updated).toMatchObject({
      ok: true,
      product: {
        variants: [
          {
            stock: 0,
            priceOverrideArs: 58000
          }
        ]
      }
    });

    if (!updated.ok) {
      throw new Error("Expected variant update to succeed");
    }

    const adminVariant = getAdminProductVariantViews(updated.product)[0];
    const publicDetail = getProductDetailView(updated.product);

    expect(adminVariant).toMatchObject({
      stockCount: 0,
      stockLabel: "0 unidades",
      availabilityLabel: AVAILABILITY_LABEL.outOfStock
    });
    expect(publicDetail.variants[0]).toMatchObject({
      availabilityLabel: AVAILABILITY_LABEL.outOfStock,
      effectivePriceArs: 58000,
      isAvailable: false
    });
    expect(publicDetail.variants[0]).not.toHaveProperty("stock");
    expect(JSON.stringify(publicDetail)).not.toContain('"stock"');
  });

  it("rejects duplicate SKUs within a product with a localized error", () => {
    const result = addProductVariant(
      "training-tee",
      {
        sku: "tee-blk-m",
        color: "Negro",
        size: "L",
        stock: 3,
        priceOverrideArs: null
      },
      baseProducts
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "duplicate_variant_sku",
        message: "Ya existe una variante/SKU con ese código."
      }
    });
  });

  it("rejects updating a variant to an SKU used by another variant", () => {
    const withSecondVariant = addProductVariant(
      "training-tee",
      {
        sku: "TEE-BLK-L",
        color: "Negro",
        size: "L",
        stock: 2,
        priceOverrideArs: null
      },
      baseProducts
    );

    if (!withSecondVariant.ok) {
      throw new Error("Expected variant creation to succeed");
    }

    const secondVariantId = withSecondVariant.product.variants[1]?.id;
    const result = updateProductVariant(
      "training-tee",
      secondVariantId ?? "",
      {
        sku: "tee-blk-m",
        color: "Negro",
        size: "L",
        stock: 2,
        priceOverrideArs: null
      },
      withSecondVariant.products
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "duplicate_variant_sku" }
    });
  });

  it("recognizes database duplicate SKU conflicts for the action backstop", () => {
    const duplicateSkuError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "test",
        meta: {
          target: ["product_id", "sku_normalized"]
        }
      }
    );
    const unrelatedUniqueError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "test",
        meta: {
          target: ["slug"]
        }
      }
    );

    expect(isDuplicateVariantSkuPersistenceError(duplicateSkuError)).toBe(true);
    expect(isDuplicateVariantSkuPersistenceError(unrelatedUniqueError)).toBe(false);
  });
});
