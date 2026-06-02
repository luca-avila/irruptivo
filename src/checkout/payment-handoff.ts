import { type CatalogProductRecord } from "../catalog/catalog";
import { type Cart } from "../cart/cart";
import {
  createPendingOrderInStore,
  storePendingOrderPaymentPreference
} from "../orders/order-store";
import {
  createPaymentPreferenceForOrder,
  type CreatePaymentPreferenceOptions
} from "../payments/payment-preference";
import {
  type CheckoutSummary,
  type CheckoutValidationErrors
} from "./checkout";
import {
  type PendingOrderCheckoutInput,
  type PendingOrderPaymentPreference
} from "../orders/order-creation";

export type PendingOrderPaymentHandoff = {
  orderId: string;
  orderNumber: string;
  guestAccessToken: string;
  totalArs: number;
};

export type CheckoutPaymentHandoffResult =
  | {
      status: "created";
      order: PendingOrderPaymentHandoff;
      payment: PendingOrderPaymentPreference;
      updatedCart: Cart;
      isDuplicate: boolean;
    }
  | {
      status: "invalid";
      errors: CheckoutValidationErrors;
      summary: CheckoutSummary | null;
      updatedCart: Cart;
    }
  | {
      status: "error";
      message: string;
      isRetryable: boolean;
      updatedCart: Cart;
    };

export type CreateCheckoutPaymentHandoffInput = {
  idempotencyKey: string;
  cart: Cart;
  checkout: PendingOrderCheckoutInput;
  products: readonly CatalogProductRecord[];
  orderId?: string;
  orderNumber?: string;
  guestAccessToken?: string;
  now?: Date | string;
  paymentPreferenceOptions?: CreatePaymentPreferenceOptions;
};

export async function createCheckoutPaymentHandoff({
  idempotencyKey,
  cart,
  checkout,
  products,
  orderId,
  orderNumber,
  guestAccessToken,
  now,
  paymentPreferenceOptions
}: CreateCheckoutPaymentHandoffInput): Promise<CheckoutPaymentHandoffResult> {
  const orderResult = createPendingOrderInStore({
    idempotencyKey,
    cart,
    checkout,
    products,
    orderId,
    orderNumber,
    guestAccessToken,
    now
  });

  if (orderResult.status === "invalid") {
    return {
      status: "invalid",
      errors: orderResult.errors,
      summary: orderResult.summary,
      updatedCart: cloneCart(orderResult.updatedCart)
    };
  }

  if (orderResult.order.paymentPreference) {
    return {
      status: "created",
      order: getOrderHandoff(orderResult.order),
      payment: orderResult.order.paymentPreference,
      updatedCart: cloneCart(orderResult.updatedCart),
      isDuplicate: orderResult.isDuplicate
    };
  }

  const paymentPreferenceResult = await createPaymentPreferenceForOrder(
    orderResult.order,
    paymentPreferenceOptions
  );

  if (paymentPreferenceResult.status === "error") {
    return {
      status: "error",
      message: paymentPreferenceResult.message,
      isRetryable: paymentPreferenceResult.isRetryable,
      updatedCart: cloneCart(orderResult.updatedCart)
    };
  }

  storePendingOrderPaymentPreference({
    orderId: orderResult.order.id,
    paymentPreference: paymentPreferenceResult.preference
  });

  return {
    status: "created",
    order: getOrderHandoff(orderResult.order),
    payment: paymentPreferenceResult.preference,
    updatedCart: cloneCart(orderResult.updatedCart),
    isDuplicate: orderResult.isDuplicate
  };
}

function getOrderHandoff(order: {
  id: string;
  orderNumber: string;
  guestAccessToken: string;
  totalArs: number;
}): PendingOrderPaymentHandoff {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    guestAccessToken: order.guestAccessToken,
    totalArs: order.totalArs
  };
}

function cloneCart(cart: Cart): Cart {
  return {
    items: cart.items.map((item) => ({
      ...item
    }))
  };
}
