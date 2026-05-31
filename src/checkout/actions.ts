"use server";

import { demoCatalogProducts } from "../catalog/catalog";
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
import { createPendingOrderInStore } from "../orders/order-store";

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

export type PendingOrderPaymentHandoff = {
  orderId: string;
  orderNumber: string;
  guestAccessToken: string;
  totalArs: number;
};

export type CreatePendingOrderActionResult =
  | {
      status: "created";
      order: PendingOrderPaymentHandoff;
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
      serializedCart: string;
    };

export async function validateCheckoutAction({
  rawCart,
  checkout
}: ValidateCheckoutActionInput): Promise<ValidateCheckoutActionResult> {
  const cart = hydrateCart(rawCart);
  const cartValidation = validateCart({
    cart,
    products: demoCatalogProducts
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
  const result = createPendingOrderInStore({
    idempotencyKey,
    cart,
    checkout,
    products: demoCatalogProducts
  });

  if (result.status === "created") {
    return {
      status: "created",
      order: {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        guestAccessToken: result.order.guestAccessToken,
        totalArs: result.order.totalArs
      },
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
    serializedCart: serializeCart(result.updatedCart)
  };
}
