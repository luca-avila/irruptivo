import { beforeEach, describe, expect, it, type TestContext } from "vitest";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductRecord
} from "../catalog/catalog";
import { type Cart } from "../cart/cart";
import { DELIVERY_METHOD, ORDER_STATUS } from "../domain/rules";
import { prisma } from "../db/client";
import {
  createPendingOrderInStore,
  findOrderForPaymentReturn,
  findOrderByIdInStore,
  resetOrderStoreForTests,
  readOrderStoreSnapshot,
  storePendingOrderPaymentPreference,
  updateOrderInStore,
  updateOrderStatusInStore
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

describe.skipIf(!process.env.DATABASE_URL)("pending order database store", () => {
  beforeEach(async (ctx) => {
    await skipIfDatabaseUnavailable(ctx);
  });

  it("creates and reads a pending order round-trip", async () => {
    await resetOrderStoreForTests();

    const result = await createStoredOrder();
    const snapshot = await readOrderStoreSnapshot();

    expect(result).toMatchObject({
      status: "created",
      isDuplicate: false,
      order: {
        id: "order-001",
        status: ORDER_STATUS.pendingPayment,
        contact: {
          fullName: "Luca Irruptivo"
        },
        delivery: {
          method: DELIVERY_METHOD.pickup,
          shippingAddress: null
        },
        items: [
          {
            sku: "TEE-BLK-S",
            quantity: 2,
            unitPriceArs: 26000,
            lineTotalArs: 52000
          }
        ],
        paymentPreference: null
      }
    });
    expect(snapshot.orders).toMatchObject([
      {
        id: "order-001",
        orderNumber: "IRR-000001"
      }
    ]);
  });

  it("deduplicates repeated idempotency keys without inserting a second order", async () => {
    await resetOrderStoreForTests();

    await createStoredOrder();
    const duplicateResult = await createStoredOrder({
      orderId: "order-duplicate",
      orderNumber: "IRR-999999",
      guestAccessToken: "guest-token-duplicate",
      cart: {
        items: [
          {
            productId: "training-tee",
            variantId: "tee-black-s",
            sku: "TEE-BLK-S",
            quantity: 1,
            priceSnapshotArs: 26000,
            priceSnapshotAt: now
          }
        ]
      }
    });
    const store = await readOrderStoreSnapshot();

    expect(duplicateResult).toMatchObject({
      status: "created",
      order: {
        id: "order-001"
      },
      updatedCart: {
        items: [
          {
            quantity: 1
          }
        ]
      },
      isDuplicate: true
    });
    expect(store.orders).toHaveLength(1);
  });

  it("finds an order for payment result pages only with the matching guest token", async () => {
    await resetOrderStoreForTests();
    await createStoredOrder({
      orderId: "order-lookup",
      orderNumber: "IRR-000099",
      guestAccessToken: "guest-token-lookup"
    });

    const order = await findOrderForPaymentReturn({
      orderId: "order-lookup",
      guestAccessToken: "guest-token-lookup"
    });

    expect(order).toMatchObject({
      id: "order-lookup",
      guestAccessToken: "guest-token-lookup",
      orderNumber: "IRR-000099"
    });
    expect(
      await findOrderForPaymentReturn({
        orderId: "order-lookup",
        guestAccessToken: "wrong-token"
      })
    ).toBeNull();
  });

  it("updates status and appends status history", async () => {
    await resetOrderStoreForTests();
    await createStoredOrder();

    const updatedOrder = await updateOrderStatusInStore({
      orderId: "order-001",
      status: ORDER_STATUS.paid,
      reason: "payment_approved"
    });
    const history = await prisma.orderStatusHistory.findMany({
      where: {
        orderId: "order-001"
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    expect(updatedOrder?.status).toBe(ORDER_STATUS.paid);
    expect(history).toMatchObject([
      {
        fromStatus: null,
        toStatus: ORDER_STATUS.pendingPayment,
        reason: "checkout_created",
        actor: "system"
      },
      {
        fromStatus: ORDER_STATUS.pendingPayment,
        toStatus: ORDER_STATUS.paid,
        reason: "payment_approved",
        actor: "system"
      }
    ]);
  });

  it("persists payment preference and fulfillment edits", async () => {
    await resetOrderStoreForTests();
    await createStoredOrder();

    await storePendingOrderPaymentPreference({
      orderId: "order-001",
      paymentPreference: {
        provider: "mercado_pago",
        preferenceId: "pref-123",
        checkoutUrl: "https://www.mercadopago.com.ar/init/pref-123",
        initPoint: "https://www.mercadopago.com.ar/init/pref-123",
        sandboxInitPoint: null,
        externalReference: "order-001",
        createdAt: now
      }
    });

    const order = await findOrderByIdInStore("order-001");

    if (!order) {
      throw new Error("Expected order to exist.");
    }

    const editedOrder = await updateOrderInStore({
      ...order,
      contact: {
        ...order.contact,
        phone: "11 4444 4444"
      },
      delivery: {
        ...order.delivery,
        notes: "Retira el martes"
      },
      adminNotes: "Avisar por WhatsApp"
    });

    expect(editedOrder).toMatchObject({
      contact: {
        phone: "11 4444 4444"
      },
      delivery: {
        notes: "Retira el martes"
      },
      adminNotes: "Avisar por WhatsApp",
      paymentPreference: {
        provider: "mercado_pago",
        preferenceId: "pref-123",
        externalReference: "order-001"
      }
    });
  });
});

function createStoredOrder({
  orderId = "order-001",
  orderNumber = "IRR-000001",
  guestAccessToken = "guest-token-001",
  cart = getCart()
}: {
  orderId?: string;
  orderNumber?: string;
  guestAccessToken?: string;
  cart?: Cart;
} = {}) {
  return createPendingOrderInStore({
    idempotencyKey: "checkout-submit-001",
    cart,
    checkout: {
      fullName: "Luca Irruptivo",
      email: "luca@example.com",
      phone: "11 5555 5555",
      deliveryMethod: DELIVERY_METHOD.pickup
    },
    products,
    orderId,
    orderNumber,
    guestAccessToken,
    now
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
        priceSnapshotAt: now
      }
    ]
  };
}

async function skipIfDatabaseUnavailable(ctx: TestContext): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    ctx.skip("DATABASE_URL is set, but the database is not reachable.");
  }
}
