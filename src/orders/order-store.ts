import { type Cart } from "../cart/cart";
import { type CatalogProductRecord } from "../catalog/catalog";
import {
  createPendingOrderFromCheckout,
  type PendingOrder,
  type PendingOrderCheckoutInput,
  type PendingOrderCreationResult
} from "./order-creation";
import { type StockReservationRecord } from "./stock-reservation";

type StoredPendingOrder = {
  idempotencyKey: string;
  order: PendingOrder;
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
  orders: PendingOrder[];
  reservations: StockReservationRecord[];
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
      order: clonePendingOrder(existingOrder.order),
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
    orders: pendingOrders.map((storedOrder) =>
      clonePendingOrder(storedOrder.order)
    ),
    reservations: stockReservations.map((reservation) => ({
      ...reservation
    }))
  };
}

export function resetOrderStoreForTests(): void {
  pendingOrders.splice(0, pendingOrders.length);
  stockReservations.splice(0, stockReservations.length);
}

function clonePendingOrder(order: PendingOrder): PendingOrder {
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
    }))
  };
}

function cloneCart(cart: Cart): Cart {
  return {
    items: cart.items.map((item) => ({
      ...item
    }))
  };
}
