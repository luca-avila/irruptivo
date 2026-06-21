import { randomUUID } from "node:crypto";

import {
  type CatalogProductRecord,
  type CatalogProductVariantRecord,
  type ProductArea,
  type VariantOptionValues
} from "../catalog/catalog";
import { getDate } from "../shared/date-utils";
import {
  getCartCount,
  getCartSummary,
  type Cart
} from "../cart/cart";
import {
  validateCart,
  type CartValidationItem
} from "../cart/cart-validation";
import {
  ORDER_STATUS,
  type DeliveryMethod,
  type DeliveryMethodLabel,
  type OrderStatus
} from "../domain/rules";
import {
  validateCheckoutInput,
  type CheckoutContact,
  type CheckoutDelivery,
  type CheckoutInput,
  type CheckoutShippingAddress,
  type CheckoutSummary,
  type CheckoutValidationErrors
} from "../checkout/checkout";
import { createGuestOrderAccessToken } from "./guest-access-token";

export type PendingOrderCheckoutInput = Omit<CheckoutInput, "cart">;

export type PendingOrderItemSnapshot = {
  productId: string;
  productName: string;
  productSlug: string;
  productArea: ProductArea;
  variantId: string;
  variantName: string;
  sku: string;
  options: VariantOptionValues;
  optionSummary: string;
  quantity: number;
  unitPriceArs: number;
  lineTotalArs: number;
};

export type PendingOrderDeliverySnapshot = {
  method: DeliveryMethod;
  methodLabel: DeliveryMethodLabel;
  shippingAddress: CheckoutShippingAddress | null;
  notes: string | null;
};

export type PendingOrderPaymentPreference = {
  provider: "mercado_pago";
  preferenceId: string;
  checkoutUrl: string;
  initPoint: string;
  sandboxInitPoint: string | null;
  externalReference: string;
  createdAt: string;
};

type OrderSnapshot = {
  id: string;
  orderNumber: string;
  createdAt: string;
  guestAccessToken: string;
  contact: CheckoutContact;
  delivery: PendingOrderDeliverySnapshot;
  adminNotes?: string | null;
  items: PendingOrderItemSnapshot[];
  subtotalArs: number;
  deliveryCostArs: number;
  totalArs: number;
  paymentPreference: PendingOrderPaymentPreference | null;
};

export type Order = OrderSnapshot & {
  status: OrderStatus;
};

export type PendingOrder = OrderSnapshot & {
  status: typeof ORDER_STATUS.pendingPayment;
};

export type PendingOrderCreationInput = {
  cart: Cart;
  checkout: PendingOrderCheckoutInput;
  products: readonly CatalogProductRecord[];
  orderId?: string;
  orderNumber?: string;
  guestAccessToken?: string;
  now?: Date | string;
};

export type PendingOrderCreationResult =
  | {
      status: "created";
      order: PendingOrder;
      updatedCart: Cart;
    }
  | {
      status: "invalid";
      errors: CheckoutValidationErrors;
      summary: CheckoutSummary | null;
      updatedCart: Cart;
    };

export function createPendingOrderFromCheckout({
  cart,
  checkout,
  products,
  orderId = randomUUID(),
  orderNumber,
  guestAccessToken = createGuestOrderAccessToken(),
  now = new Date()
}: PendingOrderCreationInput): PendingOrderCreationResult {
  const creationDate = getDate(now, "now");
  const cartValidation = validateCart({
    cart,
    products,
    now: creationDate
  });
  const cartSummary = getCartSummary(
    cartValidation.items
      .filter((item) => item.isCheckoutEligible)
      .map((item) => ({
        unitPriceArs: item.unitPriceArs,
        quantity: item.quantity
      }))
  );
  const checkoutValidation = validateCheckoutInput({
    ...checkout,
    cart: {
      itemCount: getCartCount(cartValidation.updatedCart),
      subtotalArs: cartSummary.subtotalArs,
      canCheckout: cartValidation.canCheckout,
      hasBlockingIssues: cartValidation.hasBlockingIssues
    }
  });

  if (checkoutValidation.status === "invalid") {
    return {
      status: "invalid",
      errors: checkoutValidation.errors,
      summary: checkoutValidation.summary,
      updatedCart: cloneCart(cartValidation.updatedCart)
    };
  }

  const orderItems = getOrderItemSnapshots(cartValidation.items);

  return {
    status: "created",
    order: {
      id: orderId,
      orderNumber: orderNumber ?? createOrderNumber(creationDate, orderId),
      status: ORDER_STATUS.pendingPayment,
      createdAt: creationDate.toISOString(),
      guestAccessToken,
      contact: {
        ...checkoutValidation.checkout.contact
      },
      delivery: snapshotDelivery(checkoutValidation.checkout.delivery),
      adminNotes: null,
      items: orderItems,
      subtotalArs: checkoutValidation.summary.subtotalArs,
      deliveryCostArs: checkoutValidation.summary.deliveryCostArs,
      totalArs: checkoutValidation.summary.totalArs,
      paymentPreference: null
    },
    updatedCart: cloneCart(cartValidation.updatedCart)
  };
}

function getOrderItemSnapshots(
  validationItems: readonly CartValidationItem[]
): PendingOrderItemSnapshot[] {
  return validationItems
    .filter((item) => item.isCheckoutEligible)
    .map((item) => {
      const product = item.product;
      const variant = item.variant;

      if (!product || !variant) {
        throw new Error(
          "Checkout cart validation returned an eligible item without product data."
        );
      }

      return {
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        productArea: product.area,
        variantId: variant.id,
        variantName: variant.name,
        sku: variant.sku,
        options: { ...(variant.options ?? {}) },
        optionSummary: getOptionSummary(variant),
        quantity: item.quantity,
        unitPriceArs: item.unitPriceArs,
        lineTotalArs: item.lineTotalArs
      };
    });
}

function snapshotDelivery(delivery: CheckoutDelivery): PendingOrderDeliverySnapshot {
  return {
    method: delivery.method,
    methodLabel: delivery.methodLabel,
    shippingAddress: delivery.shippingAddress
      ? {
          ...delivery.shippingAddress
        }
      : null,
    notes: delivery.notes
  };
}

function getOptionSummary(variant: CatalogProductVariantRecord): string {
  const orderedValues = getOrderedOptionValues(variant.options ?? {});

  return orderedValues.length > 0 ? orderedValues.join(" / ") : variant.name;
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

function cloneCart(cart: Cart): Cart {
  return {
    items: cart.items.map((item) => ({
      ...item
    }))
  };
}

function createOrderNumber(createdAt: Date, orderId: string): string {
  const year = createdAt.getUTCFullYear();
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(createdAt.getUTCDate()).padStart(2, "0");
  const suffix = orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();

  return `IRR-${year}${month}${day}-${suffix || "PEDIDO"}`;
}
