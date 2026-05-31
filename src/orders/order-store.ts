import { type Cart } from "../cart/cart";
import { type CatalogProductRecord } from "../catalog/catalog";
import { type OrderStatus } from "../domain/rules";
import {
  createPendingOrderFromCheckout,
  type Order,
  type PendingOrder,
  type PendingOrderCheckoutInput,
  type PendingOrderCreationResult,
  type PendingOrderPaymentPreference
} from "./order-creation";
import {
  releaseReservedStockForOrder,
  type StockReservationRecord,
  type StockReservationReleaseResult
} from "./stock-reservation";

type StoredPendingOrder = {
  idempotencyKey: string;
  order: Order;
  updatedCart: Cart;
};

export type CreatePendingOrderInStoreInput = {
  idempotencyKey: string;
  cart: Cart;
  checkout: PendingOrderCheckoutInput;
  products: readonly CatalogProductRecord[];
  orderId?: string;
  orderNumber?: string;
  guestAccessToken?: string;
  now?: Date | string;
};

export type PendingOrderStoreCreationResult =
  | (Extract<PendingOrderCreationResult, { status: "created" }> & {
      isDuplicate: boolean;
    })
  | Exclude<PendingOrderCreationResult, { status: "created" }>;

export type OrderStoreSnapshot = {
  orders: Order[];
  reservations: StockReservationRecord[];
};

export type PaymentReturnOrderLookupInput = {
  orderId: string | null | undefined;
  guestAccessToken: string | null | undefined;
};

export type UpdateOrderStatusInStoreInput = {
  orderId: string;
  status: OrderStatus;
};

const pendingOrders: StoredPendingOrder[] = [];
const stockReservations: StockReservationRecord[] = [];

export function createPendingOrderInStore({
  idempotencyKey,
  cart,
  checkout,
  products,
  orderId,
  orderNumber,
  guestAccessToken,
  now
}: CreatePendingOrderInStoreInput): PendingOrderStoreCreationResult {
  const normalizedIdempotencyKey = idempotencyKey.trim();

  if (!normalizedIdempotencyKey) {
    throw new RangeError("idempotencyKey must be a non-empty string");
  }

  const existingOrder = pendingOrders.find(
    (storedOrder) => storedOrder.idempotencyKey === normalizedIdempotencyKey
  );

  if (existingOrder) {
    return {
      status: "created",
      order: clonePendingOrder(existingOrder.order as PendingOrder),
      reservations: [],
      updatedCart: cloneCart(existingOrder.updatedCart),
      isDuplicate: true
    };
  }

  const result = createPendingOrderFromCheckout({
    cart,
    checkout,
    products,
    existingReservations: stockReservations,
    orderId,
    orderNumber,
    guestAccessToken,
    now
  });

  if (result.status !== "created") {
    return result;
  }

  pendingOrders.push({
    idempotencyKey: normalizedIdempotencyKey,
    order: clonePendingOrder(result.order),
    updatedCart: cloneCart(result.updatedCart)
  });
  stockReservations.push(
    ...result.reservations.map((reservation) => ({
      ...reservation
    }))
  );

  return {
    ...result,
    order: clonePendingOrder(result.order),
    reservations: result.reservations.map((reservation) => ({
      ...reservation
    })),
    updatedCart: cloneCart(result.updatedCart),
    isDuplicate: false
  };
}

export function readOrderStoreSnapshot(): OrderStoreSnapshot {
  return {
    orders: pendingOrders.map((storedOrder) => cloneOrder(storedOrder.order)),
    reservations: stockReservations.map((reservation) => ({
      ...reservation
    }))
  };
}

export function findOrderByIdInStore(orderId: string): Order | null {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return null;
  }

  const storedOrder = pendingOrders.find(
    ({ order }) => order.id === normalizedOrderId
  );

  return storedOrder ? cloneOrder(storedOrder.order) : null;
}

export function findOrderForPaymentReturn({
  orderId,
  guestAccessToken
}: PaymentReturnOrderLookupInput): PendingOrder | null {
  const normalizedOrderId = orderId?.trim() ?? "";
  const normalizedGuestAccessToken = guestAccessToken?.trim() ?? "";

  if (!normalizedOrderId || !normalizedGuestAccessToken) {
    return null;
  }

  const storedOrder = pendingOrders.find(
    ({ order }) =>
      order.id === normalizedOrderId &&
      order.guestAccessToken === normalizedGuestAccessToken
  );

  return storedOrder ? clonePendingOrder(storedOrder.order as PendingOrder) : null;
}

export function storePendingOrderPaymentPreference({
  orderId,
  paymentPreference
}: {
  orderId: string;
  paymentPreference: PendingOrderPaymentPreference;
}): PendingOrder | null {
  const storedOrder = pendingOrders.find(
    (pendingOrder) => pendingOrder.order.id === orderId
  );

  if (!storedOrder) {
    return null;
  }

  storedOrder.order = cloneOrder({
    ...storedOrder.order,
    paymentPreference: clonePaymentPreference(paymentPreference)
  });

  return clonePendingOrder(storedOrder.order as PendingOrder);
}

export function updateOrderStatusInStore({
  orderId,
  status
}: UpdateOrderStatusInStoreInput): Order | null {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return null;
  }

  const storedOrder = pendingOrders.find(
    ({ order }) => order.id === normalizedOrderId
  );

  if (!storedOrder) {
    return null;
  }

  storedOrder.order = cloneOrder({
    ...storedOrder.order,
    status
  });

  return cloneOrder(storedOrder.order);
}

export function releaseReservedStockForOrderInStore(
  orderId: string
): StockReservationReleaseResult {
  const releaseResult = releaseReservedStockForOrder({
    orderId,
    reservations: stockReservations
  });

  stockReservations.splice(
    0,
    stockReservations.length,
    ...releaseResult.remainingReservations
  );

  return releaseResult;
}

export function resetOrderStoreForTests(): void {
  pendingOrders.splice(0, pendingOrders.length);
  stockReservations.splice(0, stockReservations.length);
}

function clonePendingOrder(order: PendingOrder): PendingOrder {
  return cloneOrder(order);
}

function cloneOrder<T extends Order>(order: T): T {
  return {
    ...order,
    contact: {
      ...order.contact
    },
    delivery: {
      ...order.delivery,
      shippingAddress: order.delivery.shippingAddress
        ? {
            ...order.delivery.shippingAddress
          }
        : null
    },
    items: order.items.map((item) => ({
      ...item,
      options: {
        ...item.options
      }
    })),
    paymentPreference: order.paymentPreference
      ? clonePaymentPreference(order.paymentPreference)
      : null
  } as T;
}

function clonePaymentPreference(
  paymentPreference: PendingOrderPaymentPreference
): PendingOrderPaymentPreference {
  return {
    ...paymentPreference
  };
}

function cloneCart(cart: Cart): Cart {
  return {
    items: cart.items.map((item) => ({
      ...item
    }))
  };
}
