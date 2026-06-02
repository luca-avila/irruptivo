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
  findOrderForPaymentReturn,
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
  it("returns the existing pending order for a repeated idempotency key without duplicating the order", () => {
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
  });

  it("finds an order for payment result pages only with the matching guest token", () => {
    resetOrderStoreForTests();

    createPendingOrderInStore({
      idempotencyKey: "checkout-submit-lookup",
      cart: getCart(),
      checkout: {
        fullName: "Luca Irruptivo",
        email: "luca@example.com",
        phone: "11 5555 5555",
        deliveryMethod: DELIVERY_METHOD.pickup
      },
      products,
      orderId: "order-lookup",
      orderNumber: "IRR-000099",
      guestAccessToken: "guest-token-lookup",
      now
    });

    const order = findOrderForPaymentReturn({
      orderId: "order-lookup",
      guestAccessToken: "guest-token-lookup"
    });

    expect(order).toMatchObject({
      id: "order-lookup",
      guestAccessToken: "guest-token-lookup",
      orderNumber: "IRR-000099"
    });
    expect(
      findOrderForPaymentReturn({
        orderId: "order-lookup",
        guestAccessToken: "wrong-token"
      })
    ).toBeNull();
    expect(
      findOrderForPaymentReturn({
        orderId: "order-lookup",
        guestAccessToken: ""
      })
    ).toBeNull();
  });

  it("returns a cloned order for payment result lookup", () => {
    resetOrderStoreForTests();

    createPendingOrderInStore({
      idempotencyKey: "checkout-submit-clone",
      cart: getCart(),
      checkout: {
        fullName: "Luca Irruptivo",
        email: "luca@example.com",
        phone: "11 5555 5555",
        deliveryMethod: DELIVERY_METHOD.pickup
      },
      products,
      orderId: "order-clone",
      orderNumber: "IRR-000100",
      guestAccessToken: "guest-token-clone",
      now
    });

    const order = findOrderForPaymentReturn({
      orderId: "order-clone",
      guestAccessToken: "guest-token-clone"
    });

    if (!order) {
      throw new Error("Expected order lookup to succeed.");
    }

    order.contact.fullName = "Mutated Name";
    order.items[0].quantity = 99;

    expect(
      findOrderForPaymentReturn({
        orderId: "order-clone",
        guestAccessToken: "guest-token-clone"
      })
    ).toMatchObject({
      contact: {
        fullName: "Luca Irruptivo"
      },
      items: [
        {
          quantity: 2
        }
      ]
    });
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
