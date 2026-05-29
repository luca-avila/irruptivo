import { z } from "zod";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  demoCatalogProducts,
  type CatalogProductImageRecord,
  type CatalogProductRecord,
  type CatalogProductVariantRecord,
  type ProductArea,
  type ProductStatus,
  type VariantOptionValues
} from "../catalog/catalog";

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

export type ProductManagementErrorCode =
  | "validation"
  | "not_found"
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

export type AdminProductListView = {
  products: AdminProductListItemView[];
  totalProductCount: number;
  activeProductCount: number;
  inactiveProductCount: number;
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
const optionalTextSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) => normalizeOptionalText(value));
const productInputSchema = z
  .object({
    name: requiredTextSchema,
    description: requiredTextSchema,
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

const mutableDemoCatalogProducts =
  demoCatalogProducts as unknown as CatalogProductRecord[];

export function readAdminProductRecords(): CatalogProductRecord[] {
  return cloneProductRecords(mutableDemoCatalogProducts);
}

export function saveAdminProductRecords(
  products: readonly CatalogProductRecord[]
): void {
  mutableDemoCatalogProducts.splice(
    0,
    mutableDemoCatalogProducts.length,
    ...cloneProductRecords(products)
  );
}

export function listAdminProducts(
  products: readonly CatalogProductRecord[] = readAdminProductRecords()
): AdminProductListView {
  const productViews = [...products]
    .sort((first, second) => first.name.localeCompare(second.name, "es-AR"))
    .map(getAdminProductListItemView);

  return {
    products: productViews,
    totalProductCount: productViews.length,
    activeProductCount: productViews.filter(
      (product) => product.status === PRODUCT_STATUS.active
    ).length,
    inactiveProductCount: productViews.filter(
      (product) => product.status === PRODUCT_STATUS.inactive
    ).length
  };
}

export function getAdminProductById(
  id: string,
  products: readonly CatalogProductRecord[] = readAdminProductRecords()
): CatalogProductRecord | null {
  return products.find((product) => product.id === id) ?? null;
}

export function createProduct(
  input: ProductCreateInput,
  products: readonly CatalogProductRecord[] = readAdminProductRecords()
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
  products: readonly CatalogProductRecord[] = readAdminProductRecords()
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
  products: readonly CatalogProductRecord[] = readAdminProductRecords()
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

export function canPublishProduct(
  product: Pick<CatalogProductRecord, "variants">
): boolean {
  return product.variants.length > 0;
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

function normalizeProductInput(
  input: ProductCreateInput
): NormalizedProductInput | null {
  const parsedInput = productInputSchema.safeParse(input);

  return parsedInput.success ? parsedInput.data : null;
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
  return { ...image };
}

function formatPriceArs(priceArs: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(priceArs);
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

function getCannotPublishWithoutVariantsError(): ProductManagementResult {
  return {
    ok: false,
    error: {
      code: "cannot_publish_without_variants",
      message: "El producto necesita al menos una variante/SKU para activarse."
    }
  };
}
