import { type AvailabilityLabel } from "../domain/rules";
import { getPublicImageSet } from "./product-images";
import { getAvailableStock } from "./stock";
import { getVariantAvailability, resolveUnitPrice } from "./variants";

export const PRODUCT_AREA = {
  clothing: "clothing",
  supplement: "supplement"
} as const;

export type ProductArea = (typeof PRODUCT_AREA)[keyof typeof PRODUCT_AREA];

export const PRODUCT_STATUS = {
  active: "active",
  inactive: "inactive"
} as const;

export type ProductStatus =
  (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

export type VariantOptionValues = {
  color?: string;
  size?: string;
  flavor?: string;
  weight?: string;
  presentation?: string;
};

export type CatalogProductVariantRecord = {
  id: string;
  sku: string;
  name: string;
  stock: number;
  priceOverrideArs?: number | null;
  options?: VariantOptionValues;
};

export type CatalogProductImageRecord = {
  id: string;
  path: string;
  alt: string;
  sortOrder: number;
  width?: number;
  height?: number;
  renditions?: CatalogProductImageRenditionsRecord;
  associatedColor?: string | null;
  variantId?: string | null;
  deletedAt?: string | null;
};

export type CatalogProductImageRenditionRecord = {
  path: string;
  width: number;
  height: number;
  byteSize?: number;
  mimeType?: string;
};

export type CatalogProductImageRenditionsRecord = {
  card: CatalogProductImageRenditionRecord;
  detail: CatalogProductImageRenditionRecord;
  original: CatalogProductImageRenditionRecord;
};

export type CatalogProductRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  area: ProductArea;
  status: ProductStatus;
  basePriceArs: number;
  clothingSubcategory?: string | null;
  supplementType?: string | null;
  variants: readonly CatalogProductVariantRecord[];
  images: readonly CatalogProductImageRecord[];
};

export type PublicProductImageView = {
  id: string;
  path: string;
  alt: string;
  width?: number;
  height?: number;
  cardPath?: string;
  detailPath?: string;
  originalPath?: string;
  associatedColor?: string | null;
  variantId?: string | null;
};

export type PublicProductCardView = {
  id: string;
  slug: string;
  name: string;
  area: ProductArea;
  contextLabel: string;
  image: PublicProductImageView | null;
  priceArs: number;
  availabilityLabel: AvailabilityLabel;
  isAvailable: boolean;
};

export type PublicProductVariantView = {
  id: string;
  sku: string;
  name: string;
  options: VariantOptionValues;
  effectivePriceArs: number;
  availabilityLabel: AvailabilityLabel;
  isAvailable: boolean;
};

export type PublicProductDetailView = PublicProductCardView & {
  description: string;
  images: PublicProductImageView[];
  variants: PublicProductVariantView[];
};

export type PublicUnavailableProductView = {
  id: string;
  slug: string;
  name: string;
  description: string;
  area: ProductArea;
  contextLabel: string;
  images: PublicProductImageView[];
};

export type PublicProductSlugLookup =
  | {
      status: "active";
      product: PublicProductDetailView;
    }
  | {
      status: "inactive";
      product: PublicUnavailableProductView;
    }
  | {
      status: "not_found";
    };

export const PRODUCT_LISTING_ALL_FILTER_VALUE = "todo";

export type ProductListingFilterOptionView = {
  label: string;
  value: string;
  isActive: boolean;
};

export type ProductListingEmptyState =
  | {
      reason: "empty_catalog";
    }
  | {
      reason: "empty_filter";
      selectedLabel: string;
    };

export type ClothingCollectionListingQuery = {
  subcategory?: string | null;
};

export type ClothingCollectionListingView = {
  filters: ProductListingFilterOptionView[];
  products: PublicProductCardView[];
  emptyState: ProductListingEmptyState | null;
  selectedSubcategory: string | null;
};

export type ProductSearchResultView = PublicProductCardView & {
  href: string;
  areaLabel: string;
};

export type ProductSearchEmptyState =
  | {
      reason: "empty_query";
    }
  | {
      reason: "no_results";
      query: string;
    };

export type ProductSearchView = {
  query: string;
  results: ProductSearchResultView[];
  emptyState: ProductSearchEmptyState | null;
};

export const demoCatalogProducts = [
  {
    id: "irruptivo-training-tee",
    slug: "training-tee-negra",
    name: "Training Tee Negra",
    description: "Remera deportiva de calce relajado para entrenamiento diario.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 26000,
    clothingSubcategory: "Remeras",
    variants: [
      {
        id: "training-tee-black-s",
        sku: "TEE-BLK-S",
        name: "Negro / S",
        stock: 4,
        options: {
          color: "Negro",
          size: "S"
        }
      },
      {
        id: "training-tee-black-m",
        sku: "TEE-BLK-M",
        name: "Negro / M",
        stock: 2,
        options: {
          color: "Negro",
          size: "M"
        }
      }
    ],
    images: [
      {
        id: "training-tee-black-front",
        path: "/products/training-tee-negra-01.webp",
        alt: "Remera negra Irruptivo frente",
        sortOrder: 1
      },
      {
        id: "training-tee-black-detail",
        path: "/products/training-tee-negra-02.webp",
        alt: "Detalle de tela de la remera negra Irruptivo",
        sortOrder: 2
      }
    ]
  },
  {
    id: "irruptivo-essential-short",
    slug: "essential-short-negro",
    name: "Essential Short Negro",
    description: "Short liviano para entrenamiento y uso diario.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 32000,
    clothingSubcategory: "Shorts",
    variants: [
      {
        id: "essential-short-black-m",
        sku: "SHORT-BLK-M",
        name: "Negro / M",
        stock: 0,
        options: {
          color: "Negro",
          size: "M"
        }
      }
    ],
    images: [
      {
        id: "essential-short-black-front",
        path: "/products/essential-short-negro-01.webp",
        alt: "Short negro Irruptivo frente",
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
        stock: 5,
        priceOverrideArs: 29900,
        options: {
          weight: "300 g"
        }
      }
    ],
    images: [
      {
        id: "creatina-300g-front",
        path: "/products/creatina-monohidrato-300g-01.webp",
        alt: "Creatina monohidrato 300 gramos",
        sortOrder: 1
      }
    ]
  }
] satisfies CatalogProductRecord[];

export function listActiveProducts(
  products: readonly CatalogProductRecord[] = demoCatalogProducts
): PublicProductCardView[] {
  assertUniqueSlugs(products);

  return getActiveProductRecords(products).map(getProductCardView);
}

export function listActiveProductsByArea(
  area: ProductArea,
  products: readonly CatalogProductRecord[] = demoCatalogProducts
): PublicProductCardView[] {
  assertUniqueSlugs(products);

  return getActiveProductRecordsByArea(area, products).map(getProductCardView);
}

export function searchActiveProductsByName(
  query: string | null | undefined,
  products: readonly CatalogProductRecord[] = demoCatalogProducts
): ProductSearchView {
  assertUniqueSlugs(products);

  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return {
      query: "",
      results: [],
      emptyState: {
        reason: "empty_query"
      }
    };
  }

  const normalizedMatchText = normalizeSearchText(normalizedQuery);
  const results = getActiveProductRecords(products)
    .filter((product) =>
      normalizeSearchText(product.name).includes(normalizedMatchText)
    )
    .map(getProductSearchResultView);

  return {
    query: normalizedQuery,
    results,
    emptyState:
      results.length > 0
        ? null
        : {
            reason: "no_results",
            query: normalizedQuery
          }
  };
}

export function getClothingCollectionListing(
  query: ClothingCollectionListingQuery = {},
  products: readonly CatalogProductRecord[] = demoCatalogProducts
): ClothingCollectionListingView {
  assertUniqueSlugs(products);

  const activeClothingProducts = getActiveProductRecordsByArea(
    PRODUCT_AREA.clothing,
    products
  );
  const selectedSubcategory = normalizeListingFilterValue(query.subcategory);
  const filteredProducts = selectedSubcategory
    ? activeClothingProducts.filter(
        (product) => getClothingSubcategoryLabel(product) === selectedSubcategory
      )
    : activeClothingProducts;

  return {
    filters: getClothingSubcategoryFilters(
      activeClothingProducts,
      selectedSubcategory
    ),
    products: filteredProducts.map(getProductCardView),
    emptyState: getProductListingEmptyState({
      totalProducts: activeClothingProducts.length,
      visibleProducts: filteredProducts.length,
      selectedLabel: selectedSubcategory
    }),
    selectedSubcategory
  };
}

export function getPublicProductBySlug(
  slug: string,
  products: readonly CatalogProductRecord[] = demoCatalogProducts
): PublicProductSlugLookup {
  assertUniqueSlugs(products);

  const product = products.find((candidate) => candidate.slug === slug);

  if (!product) {
    return { status: "not_found" };
  }

  if (product.status !== PRODUCT_STATUS.active) {
    return {
      status: "inactive",
      product: getUnavailableProductView(product)
    };
  }

  return {
    status: "active",
    product: getProductDetailView(product)
  };
}

export function getProductCardView(
  product: CatalogProductRecord
): PublicProductCardView {
  const sortedImages = getPublicImageSet(product.images, { usage: "card" });
  const totalStock = getTotalStock(product);
  const availability = getVariantAvailability({ stock: totalStock });

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    area: product.area,
    contextLabel: getContextLabel(product),
    image: sortedImages[0] ?? null,
    priceArs: getLowestEffectivePrice(product),
    availabilityLabel: availability.availabilityLabel,
    isAvailable: availability.isAvailable
  };
}

function getProductSearchResultView(
  product: CatalogProductRecord
): ProductSearchResultView {
  return {
    ...getProductCardView(product),
    href: getProductDetailHref(product),
    areaLabel: getProductAreaLabel(product.area)
  };
}

export function getProductDetailView(
  product: CatalogProductRecord
): PublicProductDetailView {
  return {
    ...getProductCardView(product),
    description: product.description,
    images: getPublicImageSet(product.images, { usage: "detail" }),
    variants: product.variants.map((variant) => {
      const availability = getVariantAvailability(variant);

      return {
        id: variant.id,
        sku: variant.sku,
        name: variant.name,
        options: variant.options ?? {},
        effectivePriceArs: getEffectiveVariantPrice(product, variant),
        availabilityLabel: availability.availabilityLabel,
        isAvailable: availability.isAvailable
      };
    })
  };
}

function getUnavailableProductView(
  product: CatalogProductRecord
): PublicUnavailableProductView {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    area: product.area,
    contextLabel: getContextLabel(product),
    images: getPublicImageSet(product.images, { usage: "detail" })
  };
}

function getTotalStock(product: CatalogProductRecord): number {
  return product.variants.reduce(
    (total, variant) => total + getAvailableStock(variant),
    0
  );
}

function getLowestEffectivePrice(product: CatalogProductRecord): number {
  assertHasVariant(product);

  return Math.min(
    ...product.variants.map((variant) => getEffectiveVariantPrice(product, variant))
  );
}

function getEffectiveVariantPrice(
  product: CatalogProductRecord,
  variant: CatalogProductVariantRecord
): number {
  return resolveUnitPrice({
    productBasePriceArs: product.basePriceArs,
    variantPriceOverrideArs: variant.priceOverrideArs
  });
}

function getContextLabel(product: CatalogProductRecord): string {
  if (product.area === PRODUCT_AREA.clothing) {
    return getClothingSubcategoryLabel(product) ?? "Colección";
  }

  return product.supplementType ?? "Suplementos";
}

function getActiveProductRecords(
  products: readonly CatalogProductRecord[]
): CatalogProductRecord[] {
  return products.filter((product) => product.status === PRODUCT_STATUS.active);
}

function getActiveProductRecordsByArea(
  area: ProductArea,
  products: readonly CatalogProductRecord[]
): CatalogProductRecord[] {
  return getActiveProductRecords(products).filter((product) => product.area === area);
}

function getProductDetailHref(product: CatalogProductRecord): string {
  if (product.area === PRODUCT_AREA.clothing) {
    return `/coleccion/${product.slug}`;
  }

  return `/suplementos/${product.slug}`;
}

function getProductAreaLabel(area: ProductArea): string {
  if (area === PRODUCT_AREA.clothing) {
    return "Colección";
  }

  return "Suplementos";
}

function normalizeSearchQuery(query: string | null | undefined): string {
  return query?.trim() ?? "";
}

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase("es-AR");
}

function getClothingSubcategoryFilters(
  activeClothingProducts: readonly CatalogProductRecord[],
  selectedSubcategory: string | null
): ProductListingFilterOptionView[] {
  const filters: ProductListingFilterOptionView[] = [
    {
      label: "Todo",
      value: PRODUCT_LISTING_ALL_FILTER_VALUE,
      isActive: selectedSubcategory === null
    }
  ];

  for (const subcategory of getUniqueClothingSubcategories(activeClothingProducts)) {
    filters.push({
      label: subcategory,
      value: subcategory,
      isActive: selectedSubcategory === subcategory
    });
  }

  return filters;
}

function getUniqueClothingSubcategories(
  activeClothingProducts: readonly CatalogProductRecord[]
): string[] {
  const seenSubcategories = new Set<string>();
  const subcategories: string[] = [];

  for (const product of activeClothingProducts) {
    const subcategory = getClothingSubcategoryLabel(product);

    if (!subcategory || seenSubcategories.has(subcategory)) {
      continue;
    }

    seenSubcategories.add(subcategory);
    subcategories.push(subcategory);
  }

  return subcategories;
}

function getClothingSubcategoryLabel(
  product: CatalogProductRecord
): string | null {
  return product.clothingSubcategory?.trim() || null;
}

function normalizeListingFilterValue(value?: string | null): string | null {
  const normalizedValue = value?.trim();

  if (
    !normalizedValue ||
    normalizedValue.toLowerCase() === PRODUCT_LISTING_ALL_FILTER_VALUE
  ) {
    return null;
  }

  return normalizedValue;
}

function getProductListingEmptyState({
  totalProducts,
  visibleProducts,
  selectedLabel
}: {
  totalProducts: number;
  visibleProducts: number;
  selectedLabel: string | null;
}): ProductListingEmptyState | null {
  if (visibleProducts > 0) {
    return null;
  }

  if (totalProducts === 0) {
    return {
      reason: "empty_catalog"
    };
  }

  return {
    reason: "empty_filter",
    selectedLabel: selectedLabel ?? ""
  };
}

function assertHasVariant(product: CatalogProductRecord): void {
  if (product.variants.length === 0) {
    throw new Error(`Product ${product.slug} must have at least one variant`);
  }
}

function assertUniqueSlugs(products: readonly CatalogProductRecord[]): void {
  const slugs = new Set<string>();

  for (const product of products) {
    if (slugs.has(product.slug)) {
      throw new Error(`Product slug must be globally unique: ${product.slug}`);
    }

    slugs.add(product.slug);
  }
}
