import { describe, expect, it } from "vitest";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductRecord
} from "../catalog/catalog";
import { type Cart } from "../cart/cart";
import { DELIVERY_METHOD, ORDER_STATUS } from "../domain/rules";
import { createPendingOrderFromCheckout } from "./order-creation";

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
  },
  {
    id: "creatina",
    slug: "creatina-monohidrato-300g",
    name: "Creatina Monohidrato 300 g",
    description: "Creatina monohidrato.",
    area: PRODUCT_AREA.supplement,
    status: PRODUCT_STATUS.active,
    basePriceArs: 28500,
    supplementType: "Creatina",
    variants: [
      {
        id: "creatina-300g",
        sku: "CREATINA-300G",
        name: "300 g",
        stock: 5,
        priceOverrideArs: 29900,
        options: {
          weight: "300 g"
        }
      }
    ],
    images: []
  }
] satisfies CatalogProductRecord[];

describe("pending order creation from checkout", () => {
  it("creates a pending payment shipping order with immutable item, contact, delivery, and total snapshots", () => {
    const result = createPendingOrderFromCheckout({
      cart: getCart(),
      checkout: {
        fullName: "  Luca Irruptivo  ",
        email: "  LUCA@EXAMPLE.COM ",
        phone: "  11 5555 5555 ",
        deliveryMethod: DELIVERY_METHOD.shipping,
        addressLine: "Av. Siempre Viva 742",
        city: "Benavidez",
        province: "Buenos Aires",
        postalCode: "1621",
        notes: "Tocar timbre"
      },
      products,
      orderId: "order-001",
      orderNumber: "IRR-000001",
      guestAccessToken: "guest-access-token",
      now
    });

    expect(result.status).toBe("created");

    if (result.status !== "created") {
      throw new Error("Expected pending order creation to succeed.");
    }

    expect(result.order).toMatchObject({
      id: "order-001",
      orderNumber: "IRR-000001",
      status: ORDER_STATUS.pendingPayment,
      createdAt: now,
      guestAccessToken: "guest-access-token",
      contact: {
        fullName: "Luca Irruptivo",
        email: "luca@example.com",
        phone: "11 5555 5555"
      },
      delivery: {
        method: DELIVERY_METHOD.shipping,
        methodLabel: "Envío a domicilio",
        shippingAddress: {
          addressLine: "Av. Siempre Viva 742",
          city: "Benavidez",
          province: "Buenos Aires",
          postalCode: "1621"
        },
        notes: "Tocar timbre"
      },
      subtotalArs: 81900,
      deliveryCostArs: 5000,
      totalArs: 86900,
      items: [
        {
          productId: "training-tee",
          productName: "Training Tee Negra",
          productSlug: "training-tee-negra",
          variantId: "tee-black-s",
          variantName: "Negro / S",
          sku: "TEE-BLK-S",
          optionSummary: "Negro / S",
          quantity: 2,
          unitPriceArs: 26000,
          lineTotalArs: 52000
        },
        {
          productId: "creatina",
          productName: "Creatina Monohidrato 300 g",
          productSlug: "creatina-monohidrato-300g",
          variantId: "creatina-300g",
          variantName: "300 g",
          sku: "CREATINA-300G",
          optionSummary: "300 g",
          quantity: 1,
          unitPriceArs: 29900,
          lineTotalArs: 29900
        }
      ]
    });
  });

  it("snapshots pickup totals with zero delivery cost", () => {
    const result = createPendingOrderFromCheckout({
      cart: getCart({
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
      }),
      checkout: {
        fullName: "Luca Irruptivo",
        email: "luca@example.com",
        phone: "11 5555 5555",
        deliveryMethod: DELIVERY_METHOD.pickup,
        notes: "Paso por la tarde"
      },
      products,
      orderId: "order-002",
      orderNumber: "IRR-000002",
      guestAccessToken: "guest-access-token-2",
      now
    });

    expect(result).toMatchObject({
      status: "created",
      order: {
        delivery: {
          method: DELIVERY_METHOD.pickup,
          methodLabel: "Retiro local",
          shippingAddress: null,
          notes: "Paso por la tarde"
        },
        subtotalArs: 26000,
        deliveryCostArs: 0,
        totalArs: 26000
      }
    });
  });

  it("refreshes expired cart prices before snapshotting order totals", () => {
    const result = createPendingOrderFromCheckout({
      cart: getCart({
        items: [
          {
            productId: "training-tee",
            variantId: "tee-black-s",
            sku: "TEE-BLK-S",
            quantity: 1,
            priceSnapshotArs: 24500,
            priceSnapshotAt: "2026-05-29T11:59:59.999Z"
          }
        ]
      }),
      checkout: {
        fullName: "Luca Irruptivo",
        email: "luca@example.com",
        phone: "11 5555 5555",
        deliveryMethod: DELIVERY_METHOD.pickup
      },
      products,
      orderId: "order-002-price",
      orderNumber: "IRR-000002-P",
      guestAccessToken: "guest-access-token-price",
      now
    });

    expect(result).toMatchObject({
      status: "created",
      order: {
        subtotalArs: 26000,
        totalArs: 26000,
        items: [
          {
            unitPriceArs: 26000,
            lineTotalArs: 26000
          }
        ]
      },
      updatedCart: {
        items: [
          {
            priceSnapshotArs: 26000,
            priceSnapshotAt: now
          }
        ]
      }
    });
  });

  it("blocks order creation when cart or checkout data is invalid", () => {
    const result = createPendingOrderFromCheckout({
      cart: getCart({
        items: [
          {
            productId: "training-tee",
            variantId: "missing-variant",
            sku: "TEE-MISSING",
            quantity: 1,
            priceSnapshotArs: 26000,
            priceSnapshotAt: now
          }
        ]
      }),
      checkout: {
        fullName: "",
        email: "luca@example.com",
        phone: "11 5555 5555",
        deliveryMethod: DELIVERY_METHOD.pickup
      },
      products,
      orderId: "order-003",
      guestAccessToken: "guest-access-token-3",
      now
    });

    expect(result).toMatchObject({
      status: "invalid",
      errors: {
        fullName: ["Ingresá tu nombre y apellido."],
        cart: ["El carrito tiene productos para corregir antes de pagar."]
      }
    });
    expect(result).not.toHaveProperty("order");
  });

  it("generates a guest access token when one is not supplied", () => {
    const result = createPendingOrderFromCheckout({
      cart: getCart(),
      checkout: {
        fullName: "Luca Irruptivo",
        email: "luca@example.com",
        phone: "11 5555 5555",
        deliveryMethod: DELIVERY_METHOD.pickup
      },
      products,
      orderId: "order-004",
      orderNumber: "IRR-000004",
      now
    });

    expect(result).toMatchObject({
      status: "created",
      order: {
        guestAccessToken: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/)
      }
    });
  });
});

function getCart(overrides: Partial<Cart> = {}): Cart {
  return {
    items: [
      {
        productId: "training-tee",
        variantId: "tee-black-s",
        sku: "TEE-BLK-S",
        quantity: 2,
        priceSnapshotArs: 26000,
        priceSnapshotAt: now
      },
      {
        productId: "creatina",
        variantId: "creatina-300g",
        sku: "CREATINA-300G",
        quantity: 1,
        priceSnapshotArs: 29900,
        priceSnapshotAt: now
      }
    ],
    ...overrides
  };
}
