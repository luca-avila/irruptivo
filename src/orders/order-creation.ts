import { randomUUID } from "node:crypto";

import {
  type CatalogProductRecord,
  type CatalogProductVariantRecord,
  type ProductArea,
  type VariantOptionValues
} from "../catalog/catalog";
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
  type DeliveryMethodLabel
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
import {
  reserveStockForOrder,
  type ReservableStockVariant,
  type StockReservationRecord,
  type StockUnavailableItem
} from "./stock-reservation";

const STOCK_RESERVATION_ERROR_MESSAGE =
  "No pudimos reservar stock para uno o más productos. Revisá el carrito y volvé a intentar.";

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

export type PendingOrder = {
  id: string;
  orderNumber: string;
  status: typeof ORDER_STATUS.pendingPayment;
  createdAt: string;
  guestAccessToken: string;
  contact: CheckoutContact;
  delivery: PendingOrderDeliverySnapshot;
  items: PendingOrderItemSnapshot[];
  subtotalArs: number;
  deliveryCostArs: number;
  totalArs: number;
  paymentPreference: PendingOrderPaymentPreference | null;
};

export type PendingOrderCreationInput = {
  cart: Cart;
  checkout: PendingOrderCheckoutInput;
  products: readonly CatalogProductRecord[];
  existingReservations?: readonly StockReservationRecord[];
  orderId?: string;
  orderNumber?: string;
  guestAccessToken?: string;
  now?: Date | string;
};

export type PendingOrderCreationResult =
  | {
      status: "created";
      order: PendingOrder;
      reservations: StockReservationRecord[];
      updatedCart: Cart;
    }
  | {
      status: "invalid";
      errors: CheckoutValidationErrors;
      summary: CheckoutSummary | null;
      updatedCart: Cart;
    }
  | {
      status: "stock_unavailable";
      message: string;
      unavailableItems: StockUnavailableItem[];
      updatedCart: Cart;
    };

export function createPendingOrderFromCheckout({
  cart,
  checkout,
  products,
  existingReservations = [],
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
  const reservationResult = reserveStockForOrder({
    orderId,
    items: orderItems.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity
    })),
    variants: getReservableVariants(products),
    existingReservations,
    reservedAt: creationDate
  });

  if (reservationResult.status === "insufficient_stock") {
    return {
      status: "stock_unavailable",
      message: STOCK_RESERVATION_ERROR_MESSAGE,
      unavailableItems: reservationResult.unavailableItems,
      updatedCart: cloneCart(cartValidation.updatedCart)
    };
  }

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
      items: orderItems,
      subtotalArs: checkoutValidation.summary.subtotalArs,
      deliveryCostArs: checkoutValidation.summary.deliveryCostArs,
      totalArs: checkoutValidation.summary.totalArs,
      paymentPreference: null
    },
    reservations: reservationResult.reservations,
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
        options: cloneVariantOptions(variant.options),
        optionSummary: getOptionSummary(variant),
        quantity: item.quantity,
        unitPriceArs: item.unitPriceArs,
        lineTotalArs: item.lineTotalArs
      };
    });
}

function getReservableVariants(
  products: readonly CatalogProductRecord[]
): ReservableStockVariant[] {
  return products.flatMap((product) =>
    product.variants.map((variant) => ({
      id: variant.id,
      stock: variant.stock
    }))
  );
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

function cloneVariantOptions(
  options: CatalogProductVariantRecord["options"]
): VariantOptionValues {
  return {
    ...(options ?? {})
  };
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

function getDate(value: Date | string, name: string): Date {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`${name} must be a valid date`);
  }

  return date;
}
