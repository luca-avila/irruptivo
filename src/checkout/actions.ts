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

export type CheckoutFormValues = Omit<CheckoutInput, "cart">;

export type ValidateCheckoutActionInput = {
  rawCart: string | null;
  checkout: CheckoutFormValues;
};

export type ValidateCheckoutActionResult = {
  validation: CheckoutValidationResult;
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
