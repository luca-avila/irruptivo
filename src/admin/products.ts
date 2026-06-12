import { Prisma } from "@prisma/client";
import { z } from "zod";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductImageRecord,
  type CatalogProductImageRenditionsRecord,
  type CatalogProductRecord,
  type CatalogProductVariantRecord,
  type ProductArea,
  type ProductStatus,
  type VariantOptionValues
} from "../catalog/catalog";
import { mapProductRowToRecord } from "../catalog/product-repository";
import { getAvailableStock } from "../catalog/stock";
import {
  createVariant as createCatalogVariant,
  getVariantAvailability,
  isValidSellableVariant,
  resolveUnitPrice,
  updateVariant as updateCatalogVariant
} from "../catalog/variants";
import { prisma } from "../db/client";
import { type AvailabilityLabel } from "../domain/rules";

export type ProductCreateInput = {
  name: string;
  description: string;
  area: ProductArea;
  clothingSubcategory?: string | null;
  supplementType?: string | null;
  basePriceArs: number;
  status?: ProductStatus;
};

export type ProductUpdateInput = {
  name: string;
  description: string;
  area: ProductArea;
  clothingSubcategory?: string | null;
  supplementType?: string | null;
  basePriceArs: number;
};

export type ProductVariantInput = {
  sku: string;
  stock: number;
  priceOverrideArs?: number | null;
  color?: string | null;
  size?: string | null;
  flavor?: string | null;
  weight?: string | null;
  presentation?: string | null;
};

export type ProductManagementErrorCode =
  | "validation"
  | "not_found"
  | "duplicate_variant_sku"
  | "cannot_publish_without_variants";

export type ProductManagementError = {
  code: ProductManagementErrorCode;
  message: string;
};

export type ProductManagementResult =
  | {
      ok: true;
      product: CatalogProductRecord;
      products: CatalogProductRecord[];
    }
  | {
      ok: false;
      error: ProductManagementError;
    };

export type AdminProductListItemView = {
  id: string;
  slug: string;
  name: string;
  areaLabel: string;
  contextLabel: string;
  status: ProductStatus;
  statusLabel: string;
  basePriceLabel: string;
  variantCountLabel: string;
  canActivate: boolean;
};

export type AdminProductStatusFilter = "todos" | "activos" | "inactivos";

export type AdminProductAreaFilterValue = "todas" | "coleccion" | "suplementos";

export type AdminProductListFilters = {
  status?: string | null;
  area?: string | null;
  category?: string | null;
};

export type AdminProductAreaFilterOptionView = {
  value: AdminProductAreaFilterValue;
  label: string;
  count: number;
  isActive: boolean;
};

export type AdminProductCategoryFilterOptionView = {
  value: string | null;
  label: string;
  count: number;
  isActive: boolean;
};

export type AdminProductListView = {
  products: AdminProductListItemView[];
  totalProductCount: number;
  activeProductCount: number;
  inactiveProductCount: number;
  selectedStatus: AdminProductStatusFilter;
  selectedArea: AdminProductAreaFilterValue;
  selectedCategory: string | null;
  areaFilters: AdminProductAreaFilterOptionView[];
  categoryFilters: AdminProductCategoryFilterOptionView[];
};

export type AdminProductVariantView = {
  id: string;
  sku: string;
  name: string;
  options: VariantOptionValues;
  optionSummary: string;
  stockCount: number;
  stockLabel: string;
  priceOverrideArs: number | null;
  priceOverrideLabel: string;
  effectivePriceArs: number;
  effectivePriceLabel: string;
  availabilityLabel: AvailabilityLabel;
  isAvailable: boolean;
};

export type CreateAdminProductImageRecordOnceResult =
  | {
      status: "created";
      image: CatalogProductImageRecord;
    }
  | {
      status: "duplicate";
    };

const productAreaSchema = z.enum([PRODUCT_AREA.clothing, PRODUCT_AREA.supplement]);
const productStatusSchema = z.enum([
  PRODUCT_STATUS.active,
  PRODUCT_STATUS.inactive
]);
const requiredTextSchema = z
  .string()
  .transform(normalizeText)
  .refine((value) => value.length > 0);
const descriptionSchema = z
  .string()
  .transform(normalizeDescription)
  .pipe(z.string().min(1).max(5000));
const optionalTextSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) => normalizeOptionalText(value));
const productInputSchema = z
  .object({
    name: requiredTextSchema,
    description: descriptionSchema,
    area: productAreaSchema,
    clothingSubcategory: optionalTextSchema,
    supplementType: optionalTextSchema,
    basePriceArs: z.coerce.number().int().positive(),
    status: productStatusSchema.default(PRODUCT_STATUS.inactive)
  })
  .transform((input) => ({
    ...input,
    clothingSubcategory:
      input.area === PRODUCT_AREA.clothing ? input.clothingSubcategory : null,
    supplementType:
      input.area === PRODUCT_AREA.supplement ? input.supplementType : null
  }));

type NormalizedProductInput = z.infer<typeof productInputSchema>;

const priceOverrideSchema = z
  .union([z.coerce.number().int().positive(), z.null()])
  .optional()
  .transform((value) => value ?? null);
const variantInputSchema = z.object({
  sku: requiredTextSchema,
  stock: z.coerce.number().int().min(0),
  priceOverrideArs: priceOverrideSchema,
  color: optionalTextSchema,
  size: optionalTextSchema,
  flavor: optionalTextSchema,
  weight: optionalTextSchema,
  presentation: optionalTextSchema
});

type NormalizedVariantInput = z.infer<typeof variantInputSchema>;

const ADMIN_PRODUCT_CATEGORY_UNASSIGNED_FILTER_VALUE = "__sin-asignar";

export async function readAdminProductRecords(): Promise<CatalogProductRecord[]> {
  const products = await prisma.product.findMany({
    include: {
      variants: {
        orderBy: [
          {
            position: "asc"
          },
          {
            id: "asc"
          }
        ]
      },
      images: {
        orderBy: [
          {
            sortOrder: "asc"
          },
          {
            id: "asc"
          }
        ]
      }
    },
    orderBy: [
      {
        createdAt: "asc"
      },
      {
        id: "asc"
      }
    ]
  });

  return products.map(mapProductRowToRecord);
}

export async function saveAdminProductRecords(
  products: readonly CatalogProductRecord[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const product of products) {
      await tx.product.upsert({
        where: {
          id: product.id
        },
        update: getProductPersistenceData(product),
        create: {
          id: product.id,
          ...getProductPersistenceData(product)
        }
      });

      await Promise.all(
        product.variants.map((variant, position) =>
          tx.productVariant.upsert({
            where: {
              id: variant.id
            },
            update: getVariantPersistenceData(product.id, variant, position),
            create: {
              id: variant.id,
              ...getVariantPersistenceData(product.id, variant, position)
            }
          })
        )
      );

      await Promise.all(
        product.images.map((image) =>
          tx.productImage.upsert({
            where: {
              id: image.id
            },
            update: getImagePersistenceData(product.id, image),
            create: {
              id: image.id,
              ...getImagePersistenceData(product.id, image)
            }
          })
        )
      );
    }
  });
}

export async function deleteAdminProductRecord(
  productId: string
): Promise<CatalogProductRecord | null> {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: {
        id: productId
      },
      include: {
        variants: {
          orderBy: [
            {
              position: "asc"
            },
            {
              id: "asc"
            }
          ]
        },
        images: {
          orderBy: [
            {
              sortOrder: "asc"
            },
            {
              id: "asc"
            }
          ]
        }
      }
    });

    if (!product) {
      return null;
    }

    await tx.product.delete({
      where: {
        id: productId
      }
    });

    return mapProductRowToRecord(product);
  });
}

export async function saveAdminProductImageRecord(
  productId: string,
  image: CatalogProductImageRecord
): Promise<void> {
  await saveAdminProductImageRecords(productId, [image]);
}

export async function createAdminProductImageRecordOnce(
  productId: string,
  image: CatalogProductImageRecord
): Promise<CreateAdminProductImageRecordOnceResult> {
  try {
    const createdImage = await prisma.$transaction(async (tx) => {
      const lockedProducts = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "products" WHERE id = ${productId} FOR UPDATE
      `;

      if (lockedProducts.length === 0) {
        throw new Error("Product not found while creating image record");
      }

      const sortOrder = await getNextProductImageSortOrder(productId, tx);
      const imageWithSortOrder: CatalogProductImageRecord = {
        ...image,
        sortOrder
      };

      await tx.productImage.create({
        data: {
          id: image.id,
          ...getImagePersistenceData(productId, imageWithSortOrder)
        }
      });

      return imageWithSortOrder;
    });

    return {
      status: "created",
      image: createdImage
    };
  } catch (error) {
    if (isDuplicateProductImagePersistenceError(error)) {
      return { status: "duplicate" };
    }

    throw error;
  }
}

export async function saveAdminProductImageRecords(
  productId: string,
  images: readonly CatalogProductImageRecord[]
): Promise<void> {
  if (images.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      images.map((image) =>
        tx.productImage.upsert({
          where: {
            id: image.id
          },
          update: getImagePersistenceData(productId, image),
          create: {
            id: image.id,
            ...getImagePersistenceData(productId, image)
          }
        })
      )
    );
  });
}

export function isDuplicateProductImagePersistenceError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.includes("id");
  }

  if (typeof target === "string") {
    return (
      target === "product_images_pkey" ||
      target.includes("product_images_pkey") ||
      target === "ProductImage_pkey"
    );
  }

  return false;
}

export function isDuplicateVariantSkuPersistenceError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return (
      (target.includes("product_id") && target.includes("sku_normalized")) ||
      (target.includes("productId") && target.includes("skuNormalized"))
    );
  }

  if (typeof target === "string") {
    return (
      target === "product_variants_product_id_sku_normalized_key" ||
      target.includes("product_id_sku_normalized") ||
      target.includes("productId_skuNormalized")
    );
  }

  return false;
}

export function listAdminProducts(
  products: readonly CatalogProductRecord[],
  filters: AdminProductListFilters = {}
): AdminProductListView {
  const selectedStatus = getAdminProductStatusFilter(filters.status);
  const selectedArea = getAdminProductAreaFilter(filters.area);
  const selectedCategory =
    selectedArea === "todas"
      ? null
      : getAdminProductCategoryFilterValue(filters.category);
  const areaScopedProducts = products.filter((product) =>
    matchesAdminProductAreaFilter(product, selectedArea)
  );
  const categoryScopedProducts = selectedCategory
    ? areaScopedProducts.filter(
        (product) => getProductCategoryFilterValue(product) === selectedCategory
      )
    : areaScopedProducts;
  const statusFilteredProducts = products.filter((product) =>
    matchesAdminProductStatusFilter(product, selectedStatus)
  );
  const areaFilteredProducts = statusFilteredProducts.filter((product) =>
    matchesAdminProductAreaFilter(product, selectedArea)
  );
  const visibleProducts = selectedCategory
    ? areaFilteredProducts.filter(
        (product) => getProductCategoryFilterValue(product) === selectedCategory
      )
    : areaFilteredProducts;
  const productViews = [...visibleProducts]
    .sort((first, second) => first.name.localeCompare(second.name, "es-AR"))
    .map(getAdminProductListItemView);

  return {
    products: productViews,
    totalProductCount: categoryScopedProducts.length,
    activeProductCount: categoryScopedProducts.filter(
      (product) => product.status === PRODUCT_STATUS.active
    ).length,
    inactiveProductCount: categoryScopedProducts.filter(
      (product) => product.status === PRODUCT_STATUS.inactive
    ).length,
    selectedStatus,
    selectedArea,
    selectedCategory,
    areaFilters: getAdminProductAreaFilters(statusFilteredProducts, selectedArea),
    categoryFilters: getAdminProductCategoryFilters(
      areaFilteredProducts,
      selectedArea,
      selectedCategory
    )
  };
}

function getAdminProductStatusFilter(
  value: string | null | undefined
): AdminProductStatusFilter {
  if (value === "activos" || value === "inactivos") {
    return value;
  }

  return "todos";
}

function matchesAdminProductStatusFilter(
  product: CatalogProductRecord,
  filter: AdminProductStatusFilter
): boolean {
  if (filter === "activos") {
    return product.status === PRODUCT_STATUS.active;
  }

  if (filter === "inactivos") {
    return product.status === PRODUCT_STATUS.inactive;
  }

  return true;
}

function getAdminProductAreaFilter(
  value: string | null | undefined
): AdminProductAreaFilterValue {
  if (value === "coleccion" || value === "suplementos") {
    return value;
  }

  return "todas";
}

function matchesAdminProductAreaFilter(
  product: CatalogProductRecord,
  filter: AdminProductAreaFilterValue
): boolean {
  if (filter === "todas") {
    return true;
  }

  return getProductAreaFilterValue(product.area) === filter;
}

function getProductAreaFilterValue(area: ProductArea): AdminProductAreaFilterValue {
  if (area === PRODUCT_AREA.clothing) {
    return "coleccion";
  }

  return "suplementos";
}

function getAdminProductAreaFilters(
  products: readonly CatalogProductRecord[],
  selectedArea: AdminProductAreaFilterValue
): AdminProductAreaFilterOptionView[] {
  return [
    {
      value: "todas",
      label: "Todas",
      count: products.length,
      isActive: selectedArea === "todas"
    },
    {
      value: "coleccion",
      label: getAdminProductAreaLabel(PRODUCT_AREA.clothing),
      count: products.filter((product) => product.area === PRODUCT_AREA.clothing)
        .length,
      isActive: selectedArea === "coleccion"
    },
    {
      value: "suplementos",
      label: getAdminProductAreaLabel(PRODUCT_AREA.supplement),
      count: products.filter((product) => product.area === PRODUCT_AREA.supplement)
        .length,
      isActive: selectedArea === "suplementos"
    }
  ];
}

function getAdminProductCategoryFilterValue(
  value: string | null | undefined
): string | null {
  const rawValue = value?.trim();

  if (!rawValue) {
    return null;
  }

  if (
    rawValue.toLocaleLowerCase("es-AR") ===
    ADMIN_PRODUCT_CATEGORY_UNASSIGNED_FILTER_VALUE
  ) {
    return ADMIN_PRODUCT_CATEGORY_UNASSIGNED_FILTER_VALUE;
  }

  return slugify(rawValue) || null;
}

function getAdminProductCategoryFilters(
  products: readonly CatalogProductRecord[],
  selectedArea: AdminProductAreaFilterValue,
  selectedCategory: string | null
): AdminProductCategoryFilterOptionView[] {
  const productArea = getProductAreaFromFilter(selectedArea);

  if (!productArea) {
    return [];
  }

  const allLabel = productArea === PRODUCT_AREA.clothing ? "Todas" : "Todos";
  const categoryFilters = [...getAdminProductCategoryEntries(products).values()]
    .sort((first, second) => first.label.localeCompare(second.label, "es-AR"))
    .map((entry) => ({
      value: entry.value,
      label: entry.label,
      count: entry.count,
      isActive: selectedCategory === entry.value
    }));

  return [
    {
      value: null,
      label: allLabel,
      count: products.length,
      isActive: selectedCategory === null
    },
    ...categoryFilters
  ];
}

function getProductAreaFromFilter(
  filter: AdminProductAreaFilterValue
): ProductArea | null {
  if (filter === "coleccion") {
    return PRODUCT_AREA.clothing;
  }

  if (filter === "suplementos") {
    return PRODUCT_AREA.supplement;
  }

  return null;
}

type AdminProductCategoryEntry = {
  value: string;
  label: string;
  count: number;
};

function getAdminProductCategoryEntries(
  products: readonly CatalogProductRecord[]
): Map<string, AdminProductCategoryEntry> {
  return products.reduce((entries, product) => {
    const entry = getAdminProductCategoryEntry(product);
    const existingEntry = entries.get(entry.value);

    if (existingEntry) {
      existingEntry.count += 1;
    } else {
      entries.set(entry.value, entry);
    }

    return entries;
  }, new Map<string, AdminProductCategoryEntry>());
}

function getAdminProductCategoryEntry(
  product: CatalogProductRecord
): AdminProductCategoryEntry {
  const label = getAdminProductAssignedCategoryLabel(product);
  const value = label ? slugify(label) : "";

  if (!label || !value) {
    return {
      value: ADMIN_PRODUCT_CATEGORY_UNASSIGNED_FILTER_VALUE,
      label: getAdminProductContextLabel(product),
      count: 1
    };
  }

  return {
    value,
    label,
    count: 1
  };
}

function getProductCategoryFilterValue(product: CatalogProductRecord): string {
  return getAdminProductCategoryEntry(product).value;
}

export function getAdminProductById(
  id: string,
  products: readonly CatalogProductRecord[]
): CatalogProductRecord | null {
  return products.find((product) => product.id === id) ?? null;
}

export function createProduct(
  input: ProductCreateInput,
  products: readonly CatalogProductRecord[]
): ProductManagementResult {
  const normalizedInput = normalizeProductInput(input);

  if (!normalizedInput) {
    return getValidationError();
  }

  const product: CatalogProductRecord = {
    id: generateUniqueProductId(normalizedInput.name, products),
    slug: generateUniqueSlug(normalizedInput.name, products),
    name: normalizedInput.name,
    description: normalizedInput.description,
    area: normalizedInput.area,
    status: normalizedInput.status,
    basePriceArs: normalizedInput.basePriceArs,
    clothingSubcategory: normalizedInput.clothingSubcategory,
    supplementType: normalizedInput.supplementType,
    variants: [],
    images: []
  };

  if (product.status === PRODUCT_STATUS.active && !canPublishProduct(product)) {
    return getCannotPublishWithoutVariantsError();
  }

  return {
    ok: true,
    product,
    products: [...cloneProductRecords(products), product]
  };
}

export function updateProduct(
  productId: string,
  input: ProductUpdateInput,
  products: readonly CatalogProductRecord[]
): ProductManagementResult {
  const productIndex = products.findIndex((product) => product.id === productId);

  if (productIndex === -1) {
    return getNotFoundError();
  }

  const normalizedInput = normalizeProductInput({
    ...input,
    status: products[productIndex].status
  });

  if (!normalizedInput) {
    return getValidationError();
  }

  const currentProduct = products[productIndex];
  const nextProduct: CatalogProductRecord = {
    ...currentProduct,
    name: normalizedInput.name,
    description: normalizedInput.description,
    area: normalizedInput.area,
    basePriceArs: normalizedInput.basePriceArs,
    clothingSubcategory: normalizedInput.clothingSubcategory,
    supplementType: normalizedInput.supplementType
  };
  const nextProducts = cloneProductRecords(products);
  nextProducts[productIndex] = nextProduct;

  return {
    ok: true,
    product: nextProduct,
    products: nextProducts
  };
}

export function setProductStatus(
  productId: string,
  status: ProductStatus,
  products: readonly CatalogProductRecord[]
): ProductManagementResult {
  if (!isProductStatus(status)) {
    return getValidationError();
  }

  const productIndex = products.findIndex((product) => product.id === productId);

  if (productIndex === -1) {
    return getNotFoundError();
  }

  const currentProduct = products[productIndex];

  if (status === PRODUCT_STATUS.active && !canPublishProduct(currentProduct)) {
    return getCannotPublishWithoutVariantsError();
  }

  const nextProduct: CatalogProductRecord = {
    ...currentProduct,
    status
  };
  const nextProducts = cloneProductRecords(products);
  nextProducts[productIndex] = nextProduct;

  return {
    ok: true,
    product: nextProduct,
    products: nextProducts
  };
}

export function addProductVariant(
  productId: string,
  input: ProductVariantInput,
  products: readonly CatalogProductRecord[]
): ProductManagementResult {
  const productIndex = products.findIndex((product) => product.id === productId);

  if (productIndex === -1) {
    return getNotFoundError();
  }

  const normalizedInput = normalizeVariantInput(input);

  if (!normalizedInput) {
    return getValidationError();
  }

  const currentProduct = products[productIndex];

  if (hasDuplicateVariantSku(normalizedInput.sku, currentProduct.variants)) {
    return getDuplicateVariantSkuError();
  }

  const variant = createCatalogVariant({
    productId: currentProduct.id,
    area: currentProduct.area,
    sku: normalizedInput.sku,
    stock: normalizedInput.stock,
    priceOverrideArs: normalizedInput.priceOverrideArs,
    options: getVariantOptions(normalizedInput),
    existingVariants: currentProduct.variants
  });

  if (!variant) {
    return getValidationError();
  }

  const nextProduct: CatalogProductRecord = {
    ...currentProduct,
    variants: [...currentProduct.variants.map(cloneVariantRecord), variant]
  };
  const nextProducts = cloneProductRecords(products);
  nextProducts[productIndex] = nextProduct;

  return {
    ok: true,
    product: nextProduct,
    products: nextProducts
  };
}

export function updateProductVariant(
  productId: string,
  variantId: string,
  input: ProductVariantInput,
  products: readonly CatalogProductRecord[]
): ProductManagementResult {
  const productIndex = products.findIndex((product) => product.id === productId);

  if (productIndex === -1) {
    return getNotFoundError();
  }

  const normalizedInput = normalizeVariantInput(input);

  if (!normalizedInput) {
    return getValidationError();
  }

  const currentProduct = products[productIndex];
  const variantIndex = currentProduct.variants.findIndex(
    (variant) => variant.id === variantId
  );

  if (variantIndex === -1) {
    return getNotFoundError();
  }

  if (
    hasDuplicateVariantSku(
      normalizedInput.sku,
      currentProduct.variants,
      currentProduct.variants[variantIndex].id
    )
  ) {
    return getDuplicateVariantSkuError();
  }

  const variant = updateCatalogVariant(currentProduct.variants[variantIndex], {
    area: currentProduct.area,
    sku: normalizedInput.sku,
    stock: normalizedInput.stock,
    priceOverrideArs: normalizedInput.priceOverrideArs,
    options: getVariantOptions(normalizedInput)
  });

  if (!variant) {
    return getValidationError();
  }

  const nextVariants = currentProduct.variants.map((currentVariant, index) =>
    index === variantIndex ? variant : cloneVariantRecord(currentVariant)
  );
  const nextProduct: CatalogProductRecord = {
    ...currentProduct,
    variants: nextVariants
  };
  const nextProducts = cloneProductRecords(products);
  nextProducts[productIndex] = nextProduct;

  return {
    ok: true,
    product: nextProduct,
    products: nextProducts
  };
}

export function canPublishProduct(
  product: Pick<CatalogProductRecord, "area" | "variants">
): boolean {
  return product.variants.some((variant) =>
    isValidSellableVariant(product.area, variant)
  );
}

export function getAdminProductVariantViews(
  product: CatalogProductRecord
): AdminProductVariantView[] {
  return product.variants.map((variant) => {
    const availability = getVariantAvailability(variant);
    const effectivePriceArs = resolveUnitPrice({
      productBasePriceArs: product.basePriceArs,
      variantPriceOverrideArs: variant.priceOverrideArs
    });

    return {
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      options: variant.options ?? {},
      optionSummary: getVariantOptionSummary(product.area, variant.options),
      stockCount: getAvailableStock(variant),
      stockLabel: formatUnitCount(getAvailableStock(variant)),
      priceOverrideArs: variant.priceOverrideArs ?? null,
      priceOverrideLabel:
        variant.priceOverrideArs === null || variant.priceOverrideArs === undefined
          ? "Usa precio base"
          : formatPriceArs(variant.priceOverrideArs),
      effectivePriceArs,
      effectivePriceLabel: formatPriceArs(effectivePriceArs),
      availabilityLabel: availability.availabilityLabel,
      isAvailable: availability.isAvailable
    };
  });
}

export function getAdminProductAreaLabel(area: ProductArea): string {
  if (area === PRODUCT_AREA.clothing) {
    return "Colección";
  }

  return "Suplementos";
}

export function getAdminProductStatusLabel(status: ProductStatus): string {
  if (status === PRODUCT_STATUS.active) {
    return "Activo";
  }

  return "Inactivo";
}

function getProductPersistenceData(product: CatalogProductRecord) {
  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    area: product.area,
    status: product.status,
    basePriceArs: product.basePriceArs,
    clothingSubcategory: product.clothingSubcategory ?? null,
    supplementType: product.supplementType ?? null
  };
}

function getVariantPersistenceData(
  productId: string,
  variant: CatalogProductVariantRecord,
  position: number
) {
  const options = variant.options ?? {};

  return {
    productId,
    sku: variant.sku,
    skuNormalized: normalizeSku(variant.sku),
    name: variant.name,
    stock: variant.stock,
    position,
    priceOverrideArs: variant.priceOverrideArs ?? null,
    optionColor: options.color ?? null,
    optionSize: options.size ?? null,
    optionFlavor: options.flavor ?? null,
    optionWeight: options.weight ?? null,
    optionPresentation: options.presentation ?? null
  };
}

function getImagePersistenceData(
  productId: string,
  image: CatalogProductImageRecord
) {
  return {
    productId,
    path: image.path,
    alt: image.alt,
    sortOrder: image.sortOrder,
    width: image.width ?? null,
    height: image.height ?? null,
    associatedColor: image.associatedColor ?? null,
    variantId: image.variantId ?? null,
    renditions: image.renditions ?? Prisma.DbNull,
    deletedAt: image.deletedAt ? new Date(image.deletedAt) : null
  };
}

async function getNextProductImageSortOrder(
  productId: string,
  client: Prisma.TransactionClient
): Promise<number> {
  const aggregate = await client.productImage.aggregate({
    where: {
      productId
    },
    _max: {
      sortOrder: true
    }
  });

  return (aggregate._max.sortOrder ?? 0) + 1;
}

function normalizeProductInput(
  input: ProductCreateInput
): NormalizedProductInput | null {
  const parsedInput = productInputSchema.safeParse(input);

  return parsedInput.success ? parsedInput.data : null;
}

function normalizeVariantInput(
  input: ProductVariantInput
): NormalizedVariantInput | null {
  const parsedInput = variantInputSchema.safeParse(input);

  return parsedInput.success ? parsedInput.data : null;
}

function getVariantOptions(input: NormalizedVariantInput): VariantOptionValues {
  return {
    color: input.color ?? undefined,
    size: input.size ?? undefined,
    flavor: input.flavor ?? undefined,
    weight: input.weight ?? undefined,
    presentation: input.presentation ?? undefined
  };
}

function hasDuplicateVariantSku(
  sku: string,
  variants: readonly CatalogProductVariantRecord[],
  ignoredVariantId?: string
): boolean {
  return variants.some(
    (variant) =>
      variant.id !== ignoredVariantId &&
      normalizeSku(variant.sku) === normalizeSku(sku)
  );
}

function getAdminProductListItemView(
  product: CatalogProductRecord
): AdminProductListItemView {
  const variantCount = product.variants.length;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    areaLabel: getAdminProductAreaLabel(product.area),
    contextLabel: getAdminProductContextLabel(product),
    status: product.status,
    statusLabel: getAdminProductStatusLabel(product.status),
    basePriceLabel: formatPriceArs(product.basePriceArs),
    variantCountLabel:
      variantCount === 1 ? "1 variante/SKU" : `${variantCount} variantes/SKU`,
    canActivate: canPublishProduct(product)
  };
}

function getAdminProductContextLabel(product: CatalogProductRecord): string {
  if (product.area === PRODUCT_AREA.clothing) {
    return product.clothingSubcategory?.trim() || "Sin subcategoría";
  }

  return product.supplementType?.trim() || "Sin tipo";
}

function getAdminProductAssignedCategoryLabel(
  product: CatalogProductRecord
): string | null {
  if (product.area === PRODUCT_AREA.clothing) {
    return product.clothingSubcategory?.trim() || null;
  }

  return product.supplementType?.trim() || null;
}

function getVariantOptionSummary(
  area: ProductArea,
  options: VariantOptionValues | undefined
): string {
  const optionKeys = (
    area === PRODUCT_AREA.clothing
      ? ["color", "size"]
      : ["flavor", "weight", "presentation"]
  ) as (keyof VariantOptionValues)[];
  const optionValues = optionKeys
    .map((optionKey) => options?.[optionKey])
    .filter((value): value is string => Boolean(value));

  return optionValues.length > 0 ? optionValues.join(" / ") : "Sin opciones";
}

function generateUniqueProductId(
  productName: string,
  products: readonly CatalogProductRecord[]
): string {
  const baseId = `product-${slugify(productName) || "producto"}`;
  const existingIds = new Set(products.map((product) => product.id));

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  let candidate = `${baseId}-${suffix}`;

  while (existingIds.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }

  return candidate;
}

function generateUniqueSlug(
  productName: string,
  products: readonly CatalogProductRecord[]
): string {
  const baseSlug = slugify(productName) || "producto";
  const existingSlugs = new Set(products.map((product) => product.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  let candidate = `${baseSlug}-${suffix}`;

  while (existingSlugs.has(candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeDescription(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .trim()
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function normalizeSku(value: string): string {
  return normalizeText(value).toLocaleUpperCase("es-AR");
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim().replace(/\s+/g, " ") ?? "";

  return normalizedValue || null;
}

function isProductStatus(value: string): value is ProductStatus {
  return productStatusSchema.safeParse(value).success;
}

function cloneProductRecords(
  products: readonly CatalogProductRecord[]
): CatalogProductRecord[] {
  return products.map((product) => ({
    ...product,
    variants: product.variants.map(cloneVariantRecord),
    images: product.images.map(cloneImageRecord)
  }));
}

function cloneVariantRecord(
  variant: CatalogProductVariantRecord
): CatalogProductVariantRecord {
  return {
    ...variant,
    options: cloneVariantOptions(variant.options)
  };
}

function cloneVariantOptions(
  options: VariantOptionValues | undefined
): VariantOptionValues | undefined {
  return options ? { ...options } : undefined;
}

function cloneImageRecord(
  image: CatalogProductImageRecord
): CatalogProductImageRecord {
  return {
    ...image,
    renditions: image.renditions ? cloneImageRenditions(image.renditions) : undefined
  };
}

function cloneImageRenditions(
  renditions: CatalogProductImageRenditionsRecord
): CatalogProductImageRenditionsRecord {
  return {
    card: { ...renditions.card },
    detail: { ...renditions.detail },
    original: { ...renditions.original }
  };
}

function formatPriceArs(priceArs: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(priceArs);
}

function formatUnitCount(stock: number): string {
  return stock === 1 ? "1 unidad" : `${stock} unidades`;
}

function getValidationError(): ProductManagementResult {
  return {
    ok: false,
    error: {
      code: "validation",
      message: "Revisá los campos obligatorios y el precio base."
    }
  };
}

function getNotFoundError(): ProductManagementResult {
  return {
    ok: false,
    error: {
      code: "not_found",
      message: "No encontramos el producto solicitado."
    }
  };
}

function getDuplicateVariantSkuError(): ProductManagementResult {
  return {
    ok: false,
    error: {
      code: "duplicate_variant_sku",
      message: "Ya existe una variante/SKU con ese código."
    }
  };
}

function getCannotPublishWithoutVariantsError(): ProductManagementResult {
  return {
    ok: false,
    error: {
      code: "cannot_publish_without_variants",
      message: "El producto necesita al menos una variante/SKU para activarse."
    }
  };
}
