"use server";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  demoCatalogProducts,
  type CatalogProductImageRecord,
  type CatalogProductRecord,
  type CatalogProductVariantRecord,
  type VariantOptionValues
} from "../catalog/catalog";
import { getVariantAvailability } from "../catalog/variants";
import { resolveUnitPrice } from "../domain/rules";
import {
  validateAddToCartSelection,
  type AddToCartValidationError,
  type ValidatedAddToCartItem
} from "./add-to-cart-validation";
import {
  getCartSummary,
  getLineTotal,
  hydrateCart,
  serializeCart,
  type Cart,
  type CartItem,
  type CartSummary
} from "./cart";

export type ValidateAddToCartActionInput = {
  productId: string;
  variantId: string;
};

export type ValidateAddToCartActionResult =
  | {
      status: "success";
      item: ValidatedAddToCartItem & {
        snapshotAt: string;
      };
    }
  | {
      status: "error";
      reason: AddToCartValidationError;
      message: string;
    };

export type CartReviewImage = {
  path: string;
  alt: string;
};

export type CartReviewItem = {
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  productHref: string;
  variantName: string;
  optionSummary: string;
  image: CartReviewImage | null;
  availabilityLabel: string;
  isAvailable: boolean;
  availableStock: number;
  quantity: number;
  unitPriceArs: number;
  lineTotalArs: number;
};

export type CartReviewActionResult = {
  items: CartReviewItem[];
  serializedCart: string;
  summary: CartSummary;
};

const ADD_TO_CART_ERROR_COPY = {
  product_unavailable:
    "Este producto ya no está disponible. Volvé a la categoría o consultanos por WhatsApp.",
  variant_unavailable:
    "Esa variante ya no está disponible. Elegí otra opción y volvé a intentar.",
  out_of_stock:
    "La variante seleccionada se quedó sin stock. Elegí otra opción o consultanos por WhatsApp."
} as const satisfies Record<AddToCartValidationError, string>;

export async function validateAddToCartAction(
  input: ValidateAddToCartActionInput
): Promise<ValidateAddToCartActionResult> {
  const productId = input.productId.trim();
  const variantId = input.variantId.trim();

  if (!productId || !variantId) {
    return {
      status: "error",
      reason: "variant_unavailable",
      message: ADD_TO_CART_ERROR_COPY.variant_unavailable
    };
  }

  const validation = validateAddToCartSelection({
    productId,
    variantId,
    products: demoCatalogProducts
  });

  if (validation.status === "invalid") {
    return {
      status: "error",
      reason: validation.reason,
      message: ADD_TO_CART_ERROR_COPY[validation.reason]
    };
  }

  return {
    status: "success",
    item: {
      ...validation.item,
      snapshotAt: new Date().toISOString()
    }
  };
}

export async function refreshCartReviewAction(
  rawCart: string | null
): Promise<CartReviewActionResult> {
  const cart = hydrateCart(rawCart);
  const reviewItems = getCartReviewItems(cart);
  const adjustedCart = getAdjustedCart(cart, reviewItems);

  return {
    items: reviewItems,
    serializedCart: serializeCart(adjustedCart),
    summary: getCartSummary(
      reviewItems.map((item) => ({
        unitPriceArs: item.unitPriceArs,
        quantity: item.quantity
      }))
    )
  };
}

function getCartReviewItems(cart: Cart): CartReviewItem[] {
  return cart.items.flatMap((cartItem) => {
    const product = getActiveProductById(cartItem.productId);
    const variant = product?.variants.find(
      (candidate) => candidate.id === cartItem.variantId
    );

    if (!product || !variant) {
      return [];
    }

    const availability = getVariantAvailability(variant);
    const availableStock = variant.stock;
    const quantity =
      availableStock > 0
        ? Math.min(cartItem.quantity, availableStock)
        : cartItem.quantity;
    const unitPriceArs = resolveUnitPrice({
      productBasePriceArs: product.basePriceArs,
      variantPriceOverrideArs: variant.priceOverrideArs
    });

    return [
      {
        productId: product.id,
        variantId: variant.id,
        sku: variant.sku,
        productName: product.name,
        productHref: getProductHref(product),
        variantName: variant.name,
        optionSummary: getOptionSummary(variant.options, variant.name),
        image: getPrimaryImage(product.images),
        availabilityLabel: availability.availabilityLabel,
        isAvailable: availability.isAvailable,
        availableStock,
        quantity,
        unitPriceArs,
        lineTotalArs: getLineTotal({
          unitPriceArs,
          quantity
        })
      }
    ];
  });
}

function getAdjustedCart(cart: Cart, reviewItems: readonly CartReviewItem[]): Cart {
  const reviewItemByVariantId = new Map(
    reviewItems.map((item) => [item.variantId, item])
  );

  return {
    items: cart.items.flatMap((item) => {
      const reviewItem = reviewItemByVariantId.get(item.variantId);

      if (!reviewItem) {
        return [];
      }

      return [
        {
          ...item,
          quantity: reviewItem.quantity
        } satisfies CartItem
      ];
    })
  };
}

function getActiveProductById(productId: string): CatalogProductRecord | null {
  return (
    demoCatalogProducts.find(
      (product) =>
        product.id === productId && product.status === PRODUCT_STATUS.active
    ) ?? null
  );
}

function getProductHref(product: CatalogProductRecord): string {
  if (product.area === PRODUCT_AREA.clothing) {
    return `/coleccion/${product.slug}`;
  }

  return `/suplementos/${product.slug}`;
}

function getPrimaryImage(
  images: readonly CatalogProductImageRecord[]
): CartReviewImage | null {
  const image = [...images].sort(
    (first, second) =>
      first.sortOrder - second.sortOrder || first.id.localeCompare(second.id)
  )[0];

  return image
    ? {
        path: image.path,
        alt: image.alt
      }
    : null;
}

function getOptionSummary(
  options: CatalogProductVariantRecord["options"],
  fallbackName: string
): string {
  const orderedValues = getOrderedOptionValues(options ?? {});

  return orderedValues.length > 0 ? orderedValues.join(" / ") : fallbackName;
}

function getOrderedOptionValues(options: VariantOptionValues): string[] {
  return [
    options.color,
    options.size,
    options.flavor,
    options.weight,
    options.presentation
  ].filter((value): value is string => Boolean(value));
}
