import {
  AVAILABILITY_LABEL,
  getAvailabilityLabel,
  resolveUnitPrice as resolveDomainUnitPrice,
  type AvailabilityLabel
} from "../domain/rules";
import { getAvailableStock, setVariantStock } from "./stock";
import type {
  CatalogProductVariantRecord,
  ProductArea,
  VariantOptionValues
} from "./catalog";

export { resolveDomainUnitPrice as resolveUnitPrice };

export type PublicVariantAvailabilityView = {
  availabilityLabel: AvailabilityLabel;
  isAvailable: boolean;
};

export type VariantMutationInput = {
  area: ProductArea;
  sku: string;
  stock: number;
  priceOverrideArs?: number | null;
  options?: VariantOptionValues;
};

export type VariantCreateInput = VariantMutationInput & {
  productId: string;
  existingVariants?: readonly CatalogProductVariantRecord[];
};

const OPTION_ORDER_BY_AREA = {
  clothing: ["color", "size"],
  supplement: ["flavor", "weight", "presentation"]
} as const satisfies Record<ProductArea, readonly (keyof VariantOptionValues)[]>;

export function createVariant({
  productId,
  existingVariants = [],
  ...input
}: VariantCreateInput): CatalogProductVariantRecord | null {
  const normalizedInput = normalizeVariantInput(input);

  if (!normalizedInput) {
    return null;
  }

  return {
    id: generateUniqueVariantId(productId, normalizedInput.sku, existingVariants),
    sku: normalizedInput.sku,
    name: getVariantName(normalizedInput.area, normalizedInput.options, normalizedInput.sku),
    stock: normalizedInput.stock,
    priceOverrideArs: normalizedInput.priceOverrideArs,
    options: normalizedInput.options
  };
}

export function updateVariant(
  variant: CatalogProductVariantRecord,
  input: VariantMutationInput
): CatalogProductVariantRecord | null {
  const normalizedInput = normalizeVariantInput(input);

  if (!normalizedInput) {
    return null;
  }

  return setVariantStock(
    {
      ...variant,
      sku: normalizedInput.sku,
      name: getVariantName(normalizedInput.area, normalizedInput.options, normalizedInput.sku),
      priceOverrideArs: normalizedInput.priceOverrideArs,
      options: normalizedInput.options
    },
    normalizedInput.stock
  );
}

export function getVariantAvailability(
  variant: Pick<CatalogProductVariantRecord, "stock">
): PublicVariantAvailabilityView {
  const availabilityLabel = getAvailabilityLabel(getAvailableStock(variant));

  return {
    availabilityLabel,
    isAvailable: availabilityLabel !== AVAILABILITY_LABEL.outOfStock
  };
}

export function isValidSellableVariant(
  area: ProductArea,
  variant: CatalogProductVariantRecord
): boolean {
  return normalizeVariantInput({
    area,
    sku: variant.sku,
    stock: variant.stock,
    priceOverrideArs: variant.priceOverrideArs,
    options: variant.options
  }) !== null;
}

function normalizeVariantInput(
  input: VariantMutationInput
): (VariantMutationInput & { options: VariantOptionValues; priceOverrideArs: number | null }) | null {
  const sku = normalizeText(input.sku);
  const options = normalizeOptions(input.area, input.options);

  if (
    !sku ||
    !Number.isInteger(input.stock) ||
    input.stock < 0 ||
    !hasRequiredOptionValues(input.area, options) ||
    !isValidPriceOverride(input.priceOverrideArs)
  ) {
    return null;
  }

  return {
    area: input.area,
    sku,
    stock: input.stock,
    priceOverrideArs: input.priceOverrideArs ?? null,
    options
  };
}

function normalizeOptions(
  area: ProductArea,
  options: VariantOptionValues | undefined
): VariantOptionValues {
  const normalizedOptions: VariantOptionValues = {};

  for (const optionKey of OPTION_ORDER_BY_AREA[area]) {
    const value = normalizeOptionalText(options?.[optionKey]);

    if (value) {
      normalizedOptions[optionKey] = value;
    }
  }

  return normalizedOptions;
}

function hasRequiredOptionValues(
  area: ProductArea,
  options: VariantOptionValues
): boolean {
  if (area === "clothing") {
    return Boolean(options.color && options.size);
  }

  return Boolean(options.flavor || options.weight || options.presentation);
}

function isValidPriceOverride(priceOverrideArs: number | null | undefined): boolean {
  return (
    priceOverrideArs === null ||
    priceOverrideArs === undefined ||
    (Number.isInteger(priceOverrideArs) && priceOverrideArs > 0)
  );
}

function getVariantName(
  area: ProductArea,
  options: VariantOptionValues,
  fallbackSku: string
): string {
  const optionValues = OPTION_ORDER_BY_AREA[area]
    .map((optionKey) => options[optionKey])
    .filter((value): value is string => Boolean(value));

  return optionValues.length > 0 ? optionValues.join(" / ") : fallbackSku;
}

function generateUniqueVariantId(
  productId: string,
  sku: string,
  existingVariants: readonly CatalogProductVariantRecord[]
): string {
  const baseId = `${slugify(productId) || "product"}-${slugify(sku) || "sku"}`;
  const existingIds = new Set(existingVariants.map((variant) => variant.id));

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

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim().replace(/\s+/g, " ") ?? "";

  return normalizedValue || null;
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
