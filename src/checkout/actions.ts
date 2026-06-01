"use server";

import { loadCatalogProducts } from "../catalog/product-repository";
import {
  getCartCount,
  getCartSummary,
  hydrateCart,
  serializeCart
} from "../cart/cart";
import { validateCart } from "../cart/cart-validation";
import {
  validateCheckoutInput,
  type CheckoutInput,
  type CheckoutValidationResult
} from "./checkout";
import {
  createCheckoutPaymentHandoff,
  type PendingOrderPaymentHandoff
} from "./payment-handoff";
import { type PendingOrderPaymentPreference } from "../orders/order-creation";

export type CheckoutFormValues = Omit<CheckoutInput, "cart">;

export type ValidateCheckoutActionInput = {
  rawCart: string | null;
  checkout: CheckoutFormValues;
};

export type ValidateCheckoutActionResult = {
  validation: CheckoutValidationResult;
  serializedCart: string;
};

export type CreatePendingOrderActionInput = {
  rawCart: string | null;
  checkout: CheckoutFormValues;
  idempotencyKey: string;
};

export type CreatePendingOrderActionResult =
  | {
      status: "created";
      order: PendingOrderPaymentHandoff;
      payment: PendingOrderPaymentPreference;
      serializedCart: string;
      isDuplicate: boolean;
    }
  | {
      status: "invalid";
      validation: Extract<CheckoutValidationResult, { status: "invalid" }>;
      serializedCart: string;
    }
  | {
      status: "error";
      message: string;
      isRetryable: boolean;
      serializedCart: string;
    };

export async function validateCheckoutAction({
  rawCart,
  checkout
}: ValidateCheckoutActionInput): Promise<ValidateCheckoutActionResult> {
  const cart = hydrateCart(rawCart);
  const products = await loadCatalogProducts();
  const cartValidation = validateCart({
    cart,
    products
  });
  const cartSummary = getCartSummary(
    cartValidation.items
      .filter((item) => item.isCheckoutEligible)
      .map((item) => ({
        unitPriceArs: item.unitPriceArs,
        quantity: item.quantity
      }))
  );

  return {
    validation: validateCheckoutInput({
      ...checkout,
      cart: {
        itemCount: getCartCount(cartValidation.updatedCart),
        subtotalArs: cartSummary.subtotalArs,
        canCheckout: cartValidation.canCheckout,
        hasBlockingIssues: cartValidation.hasBlockingIssues
      }
    }),
    serializedCart: serializeCart(cartValidation.updatedCart)
  };
}

export async function createPendingOrderAction({
  rawCart,
  checkout,
  idempotencyKey
}: CreatePendingOrderActionInput): Promise<CreatePendingOrderActionResult> {
  const cart = hydrateCart(rawCart);
  const products = await loadCatalogProducts();
  const result = await createCheckoutPaymentHandoff({
    idempotencyKey,
    cart,
    checkout,
    products
  });

  if (result.status === "created") {
    return {
      status: "created",
      order: result.order,
      payment: result.payment,
      serializedCart: serializeCart(result.updatedCart),
      isDuplicate: result.isDuplicate
    };
  }

  if (result.status === "invalid") {
    return {
      status: "invalid",
      validation: {
        status: "invalid",
        errors: result.errors,
        summary: result.summary
      },
      serializedCart: serializeCart(result.updatedCart)
    };
  }

  return {
    status: "error",
    message: result.message,
    isRetryable: result.isRetryable,
    serializedCart: serializeCart(result.updatedCart)
  };
}
