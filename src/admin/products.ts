import { z } from "zod";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  demoCatalogProducts,
  type CatalogProductImageRecord,
  type CatalogProductImageRenditionsRecord,
  type CatalogProductRecord,
  type CatalogProductVariantRecord,
  type ProductArea,
  type ProductStatus,
  type VariantOptionValues
} from "../catalog/catalog";
import { getAvailableStock } from "../catalog/stock";
import {
  createVariant as createCatalogVariant,
  getVariantAvailability,
  isValidSellableVariant,
  resolveUnitPrice,
  updateVariant as updateCatalogVariant
} from "../catalog/variants";
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

export type AdminProductListView = {
  products: AdminProductListItemView[];
  totalProductCount: number;
  activeProductCount: number;
  inactiveProductCount: number;
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

export function addProductVariant(
  productId: string,
  input: ProductVariantInput,
  products: readonly CatalogProductRecord[] = readAdminProductRecords()
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
  products: readonly CatalogProductRecord[] = readAdminProductRecords()
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

function getVariantOptionSummary(
  area: ProductArea,
  options: VariantOptionValues | undefined
): string {
  const optionKeys: (keyof VariantOptionValues)[] =
    area === PRODUCT_AREA.clothing
      ? ["color", "size"]
      : ["flavor", "weight", "presentation"];
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
