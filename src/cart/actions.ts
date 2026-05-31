"use server";

import {
  PRODUCT_AREA,
  demoCatalogProducts,
  type CatalogProductImageRecord,
  type CatalogProductRecord,
  type CatalogProductVariantRecord,
  type VariantOptionValues
} from "../catalog/catalog";
import { getVariantAvailability } from "../catalog/variants";
import {
  validateAddToCartSelection,
  type AddToCartValidationError,
  type ValidatedAddToCartItem
} from "./add-to-cart-validation";
import {
  getCartSummary,
  hydrateCart,
  serializeCart,
  type CartSummary
} from "./cart";
import {
  validateCart,
  type CartIssueClassification,
  type CartValidationItem,
  type CartValidationItemStatus
} from "./cart-validation";

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
  status: CartValidationItemStatus;
  isCheckoutEligible: boolean;
  issues: CartReviewIssue[];
};

export type CartReviewIssue = CartIssueClassification & {
  isBlocking: boolean;
};

export type CartReviewActionResult = {
  items: CartReviewItem[];
  serializedCart: string;
  summary: CartSummary;
  canCheckout: boolean;
  hasBlockingIssues: boolean;
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
  const validation = validateCart({
    cart,
    products: demoCatalogProducts
  });
  const reviewItems = getCartReviewItems(validation.items);

  return {
    items: reviewItems,
    serializedCart: serializeCart(validation.updatedCart),
    summary: getCartSummary(
      validation.items
        .filter((item) => item.isCheckoutEligible)
        .map((item) => ({
          unitPriceArs: item.unitPriceArs,
          quantity: item.quantity
        }))
    ),
    canCheckout: validation.canCheckout,
    hasBlockingIssues: validation.hasBlockingIssues
  };
}

function getCartReviewItems(
  validationItems: readonly CartValidationItem[]
): CartReviewItem[] {
  return validationItems.map((validationItem) => {
    const { cartItem, product, variant } = validationItem;
    const availability = variant ? getVariantAvailability(variant) : null;

    return {
      productId: cartItem.productId,
      variantId: cartItem.variantId,
      sku: variant?.sku ?? cartItem.sku,
      productName: product?.name ?? "Producto no disponible",
      productHref: product ? getProductHref(product) : "/coleccion",
      variantName: variant?.name ?? "Variante no disponible",
      optionSummary: variant
        ? getOptionSummary(variant.options, variant.name)
        : cartItem.sku,
      image: product ? getPrimaryImage(product.images) : null,
      availabilityLabel: getCartAvailabilityLabel(validationItem, availability),
      isAvailable:
        validationItem.isCheckoutEligible && Boolean(availability?.isAvailable),
      availableStock: variant?.stock ?? 0,
      quantity: validationItem.quantity,
      unitPriceArs: validationItem.unitPriceArs,
      lineTotalArs: validationItem.lineTotalArs,
      status: validationItem.status,
      isCheckoutEligible: validationItem.isCheckoutEligible,
      issues: validationItem.issues.map((issue) => ({
        ...issue,
        isBlocking: issue.severity === "blocking"
      }))
    };
  });
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

function getCartAvailabilityLabel(
  validationItem: CartValidationItem,
  availability: ReturnType<typeof getVariantAvailability> | null
): string {
  if (validationItem.isCheckoutEligible && availability) {
    return availability.availabilityLabel;
  }

  if (validationItem.issues.some((issue) => issue.code === "out_of_stock")) {
    return availability?.availabilityLabel ?? "Sin stock";
  }

  return "No disponible";
}
