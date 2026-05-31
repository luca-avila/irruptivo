import { beforeEach, describe, expect, it } from "vitest";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductRecord
} from "../catalog/catalog";
import { type Cart } from "../cart/cart";
import { DELIVERY_METHOD, ORDER_STATUS } from "../domain/rules";
import {
  createPendingOrderInStore,
  readOrderStoreSnapshot,
  resetOrderStoreForTests
} from "./order-store";
import { expirePendingPaymentOrders } from "./order-expiration";

const createdAt = "2026-05-30T12:00:00.000Z";

const products = [
  {
    id: "training-tee",
    slug: "training-tee-negra",
    name: "Training Tee Negra",
    description: "Remera tecnica para entrenar.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 26000,
    clothingSubcategory: "Remeras",
    variants: [
      {
        id: "tee-black-s",
        sku: "TEE-BLK-S",
        name: "Negro / S",
        stock: 4,
        options: {
          color: "Negro",
          size: "S"
        }
      }
    ],
    images: []
  }
] satisfies CatalogProductRecord[];

describe("pending payment expiration", () => {
  beforeEach(() => {
    resetOrderStoreForTests();
  });

  it("keeps a pending order active before the 30 minute reservation window ends", () => {
    createStoredOrder();

    const result = expirePendingPaymentOrders({
      now: "2026-05-30T12:29:59.999Z"
    });

    expect(result).toEqual({
      expiredOrders: [],
      checkedOrderCount: 1,
      expiredOrderCount: 0
    });
    expect(readOrderStoreSnapshot()).toMatchObject({
      orders: [
        {
          id: "order-001",
          status: ORDER_STATUS.pendingPayment
        }
      ],
      reservations: [
        {
          orderId: "order-001",
          variantId: "tee-black-s",
          quantity: 2,
          reservedAt: createdAt
        }
      ]
    });
  });

  it("expires a pending order at the 30 minute threshold and releases reserved stock", () => {
    createStoredOrder();

    const result = expirePendingPaymentOrders({
      now: "2026-05-30T12:30:00.000Z"
    });

    expect(result).toEqual({
      expiredOrders: [
        {
          orderId: "order-001",
          orderNumber: "IRR-000001",
          expiredAt: "2026-05-30T12:30:00.000Z",
          releasedReservationCount: 1,
          releaseStatus: "released"
        }
      ],
      checkedOrderCount: 1,
      expiredOrderCount: 1
    });
    expect(readOrderStoreSnapshot()).toMatchObject({
      orders: [
        {
          id: "order-001",
          status: ORDER_STATUS.expired
        }
      ],
      reservations: []
    });
  });

  it("is safe to run repeatedly without releasing stock more than once", () => {
    createStoredOrder();

    const firstResult = expirePendingPaymentOrders({
      now: "2026-05-30T12:31:00.000Z"
    });
    const secondResult = expirePendingPaymentOrders({
      now: "2026-05-30T12:32:00.000Z"
    });

    expect(firstResult.expiredOrderCount).toBe(1);
    expect(secondResult).toEqual({
      expiredOrders: [],
      checkedOrderCount: 1,
      expiredOrderCount: 0
    });
    expect(readOrderStoreSnapshot()).toMatchObject({
      orders: [
        {
          id: "order-001",
          status: ORDER_STATUS.expired
        }
      ],
      reservations: []
    });
  });
});

function createStoredOrder() {
  return createPendingOrderInStore({
    idempotencyKey: "checkout-submit-001",
    cart: getCart(),
    checkout: {
      fullName: "Luca Irruptivo",
      email: "luca@example.com",
      phone: "11 5555 5555",
      deliveryMethod: DELIVERY_METHOD.pickup
    },
    products,
    orderId: "order-001",
    orderNumber: "IRR-000001",
    guestAccessToken: "guest-token-001",
    now: createdAt
  });
}

function getCart(): Cart {
  return {
    items: [
      {
        productId: "training-tee",
        variantId: "tee-black-s",
        sku: "TEE-BLK-S",
        quantity: 2,
        priceSnapshotArs: 26000,
        priceSnapshotAt: createdAt
      }
    ]
  };
}
