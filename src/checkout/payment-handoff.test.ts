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
  readOrderStoreSnapshot,
  resetOrderStoreForTests
} from "../orders/order-store";
import { createCheckoutPaymentHandoff } from "./payment-handoff";

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

describe.skipIf(!process.env.DATABASE_URL)("checkout payment handoff", () => {
  beforeEach(async (ctx) => {
    await skipIfDatabaseUnavailable(ctx);
  });

  it("persists a Mercado Pago preference reference against the pending order", async () => {
    await resetOrderStoreForTests();

    const result = await createCheckoutPaymentHandoff({
      idempotencyKey: "checkout-submit-001",
      cart: getCart(),
      checkout: getCheckout(),
      products,
      orderId: "order-001",
      orderNumber: "IRR-000001",
      guestAccessToken: "guest-token-001",
      now,
      paymentPreferenceOptions: {
        config: {
          accessToken: "APP_USR-123",
          appUrl: "https://irruptivo.test"
        },
        provider: async () => ({
          preferenceId: "pref-123",
          initPoint: "https://www.mercadopago.com.ar/init/pref-123",
          sandboxInitPoint: null
        }),
        now
      }
    });

    expect(result).toMatchObject({
      status: "created",
      order: {
        orderId: "order-001",
        orderNumber: "IRR-000001",
        guestAccessToken: "guest-token-001",
        totalArs: 26000
      },
      payment: {
        preferenceId: "pref-123",
        checkoutUrl: "https://www.mercadopago.com.ar/init/pref-123"
      }
    });
    expect((await readOrderStoreSnapshot()).orders).toMatchObject([
      {
        id: "order-001",
        status: ORDER_STATUS.pendingPayment,
        paymentPreference: {
          provider: "mercado_pago",
          preferenceId: "pref-123",
          externalReference: "order-001"
        }
      }
    ]);
  });

  it("leaves the order pending and returns a retryable Spanish error when preference creation fails", async () => {
    await resetOrderStoreForTests();

    const result = await createCheckoutPaymentHandoff({
      idempotencyKey: "checkout-submit-002",
      cart: getCart(),
      checkout: getCheckout(),
      products,
      orderId: "order-002",
      orderNumber: "IRR-000002",
      guestAccessToken: "guest-token-002",
      now,
      paymentPreferenceOptions: {
        config: {
          accessToken: "APP_USR-123",
          appUrl: "https://irruptivo.test"
        },
        provider: async () => {
          throw new Error("Mercado Pago unavailable");
        },
        now
      }
    });

    expect(result).toEqual({
      status: "error",
      message:
        "No pudimos iniciar Mercado Pago. El pedido quedó pendiente; reintentá para continuar al pago.",
      isRetryable: true,
      updatedCart: getCart()
    });
    expect(await readOrderStoreSnapshot()).toMatchObject({
      orders: [
        {
          id: "order-002",
          status: ORDER_STATUS.pendingPayment,
          paymentPreference: null
        }
      ]
    });
  });
});

function getCheckout() {
  return {
    fullName: "Luca Irruptivo",
    email: "luca@example.com",
    phone: "11 5555 5555",
    deliveryMethod: DELIVERY_METHOD.pickup
  };
}

function getCart(): Cart {
  return {
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
  };
}

async function skipIfDatabaseUnavailable(ctx: TestContext): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    ctx.skip("DATABASE_URL is set, but the database is not reachable.");
  }
}
