import { type AvailabilityLabel } from "../domain/rules";
import { getVariantAvailability, resolveUnitPrice } from "./variants";
import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  demoCatalogProducts,
  getProductDetailView,
  type CatalogProductRecord,
  type CatalogProductVariantRecord,
  type ProductArea,
  type PublicProductDetailView,
  type PublicProductVariantView,
  type VariantOptionValues
} from "./catalog";

export { getVariantAvailability } from "./variants";

export type ProductVariantSelectionStatus =
  | "no_selection"
  | "unavailable_selection"
  | "selected";

export type ProductVariantSelectionView = {
  status: ProductVariantSelectionStatus;
  selectedVariant: PublicProductVariantView | null;
  effectivePriceArs: number;
  availabilityLabel: AvailabilityLabel | "Elegí una variante" | "Combinación no disponible";
  canAddToCart: boolean;
};

export type ProductDetailPageView =
  | {
      status: "active";
      product: PublicProductDetailView;
      selection: ProductVariantSelectionView;
      backHref: string;
      backLabel: string;
    }
  | {
      status: "unavailable";
      title: string;
      description: string;
      backHref: string;
      backLabel: string;
    }
  | {
      status: "not_found";
    };

type ProductDetailPageInput = {
  area: ProductArea;
  slug: string;
  selectedOptions: VariantOptionValues;
  products?: readonly CatalogProductRecord[];
};

export function resolveSelectedVariant(
  product: CatalogProductRecord,
  selectedOptions: VariantOptionValues
): ProductVariantSelectionView {
  const productOptionKeys = getProductOptionKeys(product);
  const selectedOptionKeys = getSelectedProductOptionKeys(
    productOptionKeys,
    selectedOptions
  );

  if (
    selectedOptionKeys.length === 0 ||
    selectedOptionKeys.length < productOptionKeys.length
  ) {
    return getBlockedVariantSelection("no_selection", product.basePriceArs);
  }

  const selectedVariant = product.variants.find((variant) =>
    productOptionKeys.every(
      (optionKey) => variant.options?.[optionKey] === selectedOptions[optionKey]
    )
  );

  if (!selectedVariant) {
    return getBlockedVariantSelection("unavailable_selection", product.basePriceArs);
  }

  const publicVariant = getPublicVariantView(product, selectedVariant);
  const availability = getVariantAvailability(selectedVariant);

  return {
    status: "selected",
    selectedVariant: publicVariant,
    effectivePriceArs: publicVariant.effectivePriceArs,
    availabilityLabel: availability.availabilityLabel,
    canAddToCart: availability.isAvailable
  };
}

export function getProductDetailPageView({
  area,
  slug,
  selectedOptions,
  products = demoCatalogProducts
}: ProductDetailPageInput): ProductDetailPageView {
  const product = products.find((candidate) => candidate.slug === slug);

  if (!product || product.area !== area) {
    return { status: "not_found" };
  }

  const route = getAreaRoute(area);

  if (product.status !== PRODUCT_STATUS.active) {
    return {
      status: "unavailable",
      title: "Producto no disponible",
      description:
        "Este producto no está disponible para compra en este momento. Podés seguir explorando productos publicados o consultarnos por una alternativa.",
      backHref: route.href,
      backLabel: route.backLabel
    };
  }

  return {
    status: "active",
    product: getProductDetailView(product),
    selection: resolveSelectedVariant(product, selectedOptions),
    backHref: route.href,
    backLabel: route.backLabel
  };
}

function getBlockedVariantSelection(
  status: "no_selection" | "unavailable_selection",
  basePriceArs: number
): ProductVariantSelectionView {
  return {
    status,
    selectedVariant: null,
    effectivePriceArs: basePriceArs,
    availabilityLabel:
      status === "no_selection"
        ? "Elegí una variante"
        : "Combinación no disponible",
    canAddToCart: false
  };
}

function getSelectedProductOptionKeys(
  productOptionKeys: readonly (keyof VariantOptionValues)[],
  selectedOptions: VariantOptionValues
): (keyof VariantOptionValues)[] {
  return productOptionKeys.filter((optionKey) => {
    const value = selectedOptions[optionKey];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function getProductOptionKeys(
  product: CatalogProductRecord
): (keyof VariantOptionValues)[] {
  const optionKeys = new Set<keyof VariantOptionValues>();

  for (const variant of product.variants) {
    for (const optionKey of Object.keys(variant.options ?? {}) as (keyof VariantOptionValues)[]) {
      optionKeys.add(optionKey);
    }
  }

  return [...optionKeys];
}

function getPublicVariantView(
  product: CatalogProductRecord,
  variant: CatalogProductVariantRecord
): PublicProductVariantView {
  const availability = getVariantAvailability(variant);

  return {
    id: variant.id,
    sku: variant.sku,
    name: variant.name,
    options: variant.options ?? {},
    effectivePriceArs: resolveUnitPrice({
      productBasePriceArs: product.basePriceArs,
      variantPriceOverrideArs: variant.priceOverrideArs
    }),
    availabilityLabel: availability.availabilityLabel,
    isAvailable: availability.isAvailable
  };
}

function getAreaRoute(area: ProductArea): { href: string; backLabel: string } {
  if (area === PRODUCT_AREA.clothing) {
    return {
      href: "/coleccion",
      backLabel: "Volver a la colección"
    };
  }

  return {
    href: "/suplementos",
    backLabel: "Volver a suplementos"
  };
}
