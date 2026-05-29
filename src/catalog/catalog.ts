import {
  AVAILABILITY_LABEL,
  getAvailabilityLabel,
  resolveUnitPrice,
  type AvailabilityLabel
} from "../domain/rules";

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

export type PublicProductSlugLookup =
  | {
      status: "active";
      product: PublicProductDetailView;
    }
  | {
      status: "inactive";
    }
  | {
      status: "not_found";
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

  return products
    .filter((product) => product.status === PRODUCT_STATUS.active)
    .map(getProductCardView);
}

export function listActiveProductsByArea(
  area: ProductArea,
  products: readonly CatalogProductRecord[] = demoCatalogProducts
): PublicProductCardView[] {
  return listActiveProducts(products).filter((product) => product.area === area);
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
    return { status: "inactive" };
  }

  return {
    status: "active",
    product: getProductDetailView(product)
  };
}

export function getProductCardView(
  product: CatalogProductRecord
): PublicProductCardView {
  const sortedImages = getSortedImages(product.images);
  const totalStock = getTotalStock(product);
  const availabilityLabel = getAvailabilityLabel(totalStock);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    area: product.area,
    contextLabel: getContextLabel(product),
    image: sortedImages[0] ?? null,
    priceArs: getLowestEffectivePrice(product),
    availabilityLabel,
    isAvailable: availabilityLabel !== AVAILABILITY_LABEL.outOfStock
  };
}

export function getProductDetailView(
  product: CatalogProductRecord
): PublicProductDetailView {
  return {
    ...getProductCardView(product),
    description: product.description,
    images: getSortedImages(product.images),
    variants: product.variants.map((variant) => {
      const availabilityLabel = getAvailabilityLabel(variant.stock);

      return {
        id: variant.id,
        sku: variant.sku,
        name: variant.name,
        options: variant.options ?? {},
        effectivePriceArs: getEffectiveVariantPrice(product, variant),
        availabilityLabel,
        isAvailable: availabilityLabel !== AVAILABILITY_LABEL.outOfStock
      };
    })
  };
}

function getSortedImages(
  images: readonly CatalogProductImageRecord[]
): PublicProductImageView[] {
  return [...images]
    .sort(
      (first, second) =>
        first.sortOrder - second.sortOrder || first.id.localeCompare(second.id)
    )
    .map((image) => ({
      id: image.id,
      path: image.path,
      alt: image.alt
    }));
}

function getTotalStock(product: CatalogProductRecord): number {
  return product.variants.reduce((total, variant) => total + variant.stock, 0);
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
    return product.clothingSubcategory ?? "Colección";
  }

  return product.supplementType ?? "Suplementos";
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
