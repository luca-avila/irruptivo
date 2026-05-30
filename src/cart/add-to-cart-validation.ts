import {
  PRODUCT_STATUS,
  type CatalogProductRecord
} from "../catalog/catalog";
import { resolveUnitPrice } from "../domain/rules";

export type AddToCartValidationError =
  | "product_unavailable"
  | "variant_unavailable"
  | "out_of_stock";

export type ValidatedAddToCartItem = {
  productId: string;
  variantId: string;
  sku: string;
  unitPriceArs: number;
  availableStock: number;
};

export type AddToCartValidationResult =
  | {
      status: "valid";
      item: ValidatedAddToCartItem;
    }
  | {
      status: "invalid";
      reason: AddToCartValidationError;
    };

export type AddToCartValidationInput = {
  productId: string;
  variantId: string;
  products: readonly CatalogProductRecord[];
};

export function validateAddToCartSelection({
  productId,
  variantId,
  products
}: AddToCartValidationInput): AddToCartValidationResult {
  const product = products.find((candidate) => candidate.id === productId);

  if (!product || product.status !== PRODUCT_STATUS.active) {
    return {
      status: "invalid",
      reason: "product_unavailable"
    };
  }

  const variant = product.variants.find((candidate) => candidate.id === variantId);

  if (!variant) {
    return {
      status: "invalid",
      reason: "variant_unavailable"
    };
  }

  if (variant.stock <= 0) {
    return {
      status: "invalid",
      reason: "out_of_stock"
    };
  }

  return {
    status: "valid",
    item: {
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku,
      unitPriceArs: resolveUnitPrice({
        productBasePriceArs: product.basePriceArs,
        variantPriceOverrideArs: variant.priceOverrideArs
      }),
      availableStock: variant.stock
    }
  };
}
