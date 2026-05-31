import { describe, expect, it } from "vitest";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductRecord
} from "../catalog/catalog";
import { type Cart } from "../cart/cart";
import { DELIVERY_METHOD } from "../domain/rules";
import {
  createPendingOrderInStore,
  resetOrderStoreForTests,
  readOrderStoreSnapshot
} from "./order-store";

const now = "2026-05-30T12:00:00.000Z";

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

describe("pending order in-memory store", () => {
  it("returns the existing pending order for a repeated idempotency key without reserving stock twice", () => {
    resetOrderStoreForTests();

    const firstResult = createPendingOrderInStore({
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
      now
    });

    const duplicateResult = createPendingOrderInStore({
      idempotencyKey: "checkout-submit-001",
      cart: getCart(),
      checkout: {
        fullName: "Luca Irruptivo",
        email: "luca@example.com",
        phone: "11 5555 5555",
        deliveryMethod: DELIVERY_METHOD.pickup
      },
      products,
      orderId: "order-002",
      orderNumber: "IRR-000002",
      guestAccessToken: "guest-token-002",
      now
    });

    const store = readOrderStoreSnapshot();

    expect(firstResult).toMatchObject({
      status: "created",
      order: {
        id: "order-001"
      },
      isDuplicate: false
    });
    expect(duplicateResult).toMatchObject({
      status: "created",
      order: {
        id: "order-001"
      },
      isDuplicate: true
    });
    expect(store.orders).toHaveLength(1);
    expect(store.reservations).toEqual([
      {
        orderId: "order-001",
        variantId: "tee-black-s",
        quantity: 2,
        reservedAt: now
      }
    ]);
  });
});

function getCart(): Cart {
  return {
    items: [
      {
        productId: "training-tee",
        variantId: "tee-black-s",
        sku: "TEE-BLK-S",
        quantity: 2,
        priceSnapshotArs: 26000,
        priceSnapshotAt: now
      }
    ]
  };
}
