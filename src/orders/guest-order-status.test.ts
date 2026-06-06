import { describe, expect, it } from "vitest";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductRecord
} from "../catalog/catalog";
import { type Cart } from "../cart/cart";
import {
  DELIVERY_METHOD,
  ORDER_STATUS,
  ORDER_STATUSES
} from "../domain/rules";
import { createPendingOrderFromCheckout } from "./order-creation";
import {
  buildGuestOrderStatusPath,
  getGuestOrderStatusByToken,
  getGuestOrderStatusView
} from "./guest-order-status";

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
        stock: 6,
        options: {
          color: "Negro",
          size: "S"
        }
      }
    ],
    images: []
  }
] satisfies CatalogProductRecord[];

describe("guest order status access", () => {
  it("returns only the order that matches a valid guest access token", async () => {
    const orders = [
      createStoredOrder({
      idempotencyKey: "checkout-submit-001",
      orderId: "order-001",
      orderNumber: "IRR-000001",
      guestAccessToken: "guest-token-001"
      }),
      createStoredOrder({
      idempotencyKey: "checkout-submit-002",
      orderId: "order-002",
      orderNumber: "IRR-000002",
      guestAccessToken: "guest-token-002"
      })
    ];

    const order = await getGuestOrderStatusByToken(" guest-token-002 ", orders);

    expect(order).toMatchObject({
      orderNumber: "IRR-000002",
      status: {
        label: "Pago pendiente"
      },
      items: [
        {
          productName: "Training Tee Negra",
          variantName: "Negro / S",
          optionSummary: "Negro / S",
          quantity: 1,
          unitPriceArs: 26000,
          lineTotalArs: 26000
        }
      ],
      totals: {
        subtotalArs: 26000,
        deliveryCostArs: 0,
        totalArs: 26000
      }
    });
    expect(order).not.toHaveProperty("id");
    expect(order).not.toHaveProperty("guestAccessToken");
    expect(JSON.stringify(order)).not.toContain("guest-token-002");
  });

  it("threads manual-review payment state into the guest status projection", async () => {
    const expiredOrder = {
      ...createStoredOrder({
        idempotencyKey: "checkout-submit-003",
        orderId: "order-003",
        orderNumber: "IRR-000003",
        guestAccessToken: "guest-token-003"
      }),
      status: ORDER_STATUS.expired
    };

    const order = await getGuestOrderStatusByToken(
      "guest-token-003",
      [expiredOrder],
      {
        getManualReviewForOrder: async () => ({
          required: true,
          label: "Revisión manual requerida",
          description: "Revisión manual requerida.",
          providerPaymentIds: ["payment-003"],
          latestEventAt: now
        })
      }
    );

    expect(order?.status).toMatchObject({
      label: "Verificando tu pago",
      tone: "attention"
    });
    expect(order?.status.nextStep.toLowerCase()).toContain("no vuelvas a pagar");
  });

  it("does not read manual-review payment state for non-expired guest orders", async () => {
    const paidOrder = {
      ...createStoredOrder({
        idempotencyKey: "checkout-submit-004",
        orderId: "order-004",
        orderNumber: "IRR-000004",
        guestAccessToken: "guest-token-004"
      }),
      status: ORDER_STATUS.paid
    };
    let manualReviewReads = 0;

    const order = await getGuestOrderStatusByToken(
      "guest-token-004",
      [paidOrder],
      {
        getManualReviewForOrder: async () => {
          manualReviewReads += 1;

          throw new Error("Manual review should only be read for expired orders.");
        }
      }
    );

    expect(order?.status).toMatchObject({
      label: "Pago confirmado",
      tone: "success"
    });
    expect(manualReviewReads).toBe(0);
  });

  it("returns null for invalid or missing tokens without exposing order data", async () => {
    const orders = [
      createStoredOrder({
      idempotencyKey: "checkout-submit-001",
      orderId: "order-001",
      orderNumber: "IRR-000001",
      guestAccessToken: "guest-token-001"
      })
    ];

    expect(await getGuestOrderStatusByToken("missing-token", orders)).toBeNull();
    expect(await getGuestOrderStatusByToken("", orders)).toBeNull();
    expect(await getGuestOrderStatusByToken(null, orders)).toBeNull();
  });

  it("returns a detached read-only projection instead of mutable store data", async () => {
    const orders = [
      createStoredOrder({
      idempotencyKey: "checkout-submit-001",
      orderId: "order-001",
      orderNumber: "IRR-000001",
      guestAccessToken: "guest-token-001"
      })
    ];

    const order = await getGuestOrderStatusByToken("guest-token-001", orders);

    if (!order) {
      throw new Error("Expected guest order status projection.");
    }

    order.contact.fullName = "Nombre cambiado";
    order.items[0].productName = "Producto cambiado";
    order.delivery.notes = "Nota cambiada";

    expect(await getGuestOrderStatusByToken("guest-token-001", orders)).toMatchObject({
      contact: {
        fullName: "Luca Irruptivo"
      },
      delivery: {
        notes: "Paso por la tarde"
      },
      items: [
        {
          productName: "Training Tee Negra"
        }
      ]
    });
  });

  it("shows financial and item snapshots from the stored order, not current product data", async () => {
    const orderSnapshot = createStoredOrder({
      idempotencyKey: "checkout-submit-001",
      orderId: "order-001",
      orderNumber: "IRR-000001",
      guestAccessToken: "guest-token-001"
    });
    products[0].basePriceArs = 99999;

    const order = await getGuestOrderStatusByToken("guest-token-001", [
      orderSnapshot
    ]);

    expect(order).toMatchObject({
      items: [
        {
          unitPriceArs: 26000,
          lineTotalArs: 26000
        }
      ],
      totals: {
        subtotalArs: 26000,
        totalArs: 26000
      }
    });
  });

  it("builds a guest status path only when a secure token is available", () => {
    expect(buildGuestOrderStatusPath(" guest-token-001 ")).toBe(
      "/pedido/guest-token-001"
    );
    expect(buildGuestOrderStatusPath("")).toBeNull();
    expect(buildGuestOrderStatusPath(null)).toBeNull();
  });
});

describe("guest order status presenter", () => {
  it("maps every MVP order status to Spanish customer-readable copy", () => {
    expect(ORDER_STATUSES.map((status) => getGuestOrderStatusView({ status })))
      .toMatchObject([
        { label: "Pago pendiente", tone: "attention" },
        { label: "Pago confirmado", tone: "success" },
        { label: "Pago rechazado", tone: "danger" },
        { label: "Pago vencido", tone: "danger" },
        { label: "En preparación", tone: "progress" },
        { label: "Enviado", tone: "progress" },
        { label: "Entregado", tone: "success" },
        { label: "Listo para retirar", tone: "success" },
        { label: "Retirado", tone: "success" }
      ]);
  });

  it("does not expose raw internal status values in presenter copy", () => {
    for (const status of ORDER_STATUSES) {
      const viewCopy = JSON.stringify(getGuestOrderStatusView({ status }));

      expect(viewCopy).not.toContain(status);
    }
  });

  it("shows reassuring copy for an expired order with a payment under review", () => {
    const view = getGuestOrderStatusView({
      status: ORDER_STATUS.expired,
      paymentUnderReview: true
    });
    const viewCopy = JSON.stringify(view);

    expect(view).toMatchObject({
      label: "Verificando tu pago",
      tone: "attention"
    });
    expect(view.label).not.toBe("Pago vencido");
    expect(view.description).toContain("Recibimos el pago");
    expect(view.nextStep.toLowerCase()).toContain("no vuelvas a pagar");
    expect(view.nextStep).toContain("WhatsApp");
    expect(viewCopy).not.toContain("manual_review_required");
    expect(viewCopy).not.toContain("expired");
    expect(viewCopy).not.toContain("compra nueva");
  });

  it("keeps genuine expired orders on fresh-checkout guidance", () => {
    const view = getGuestOrderStatusView({
      status: ORDER_STATUS.expired,
      paymentUnderReview: false
    });

    expect(view).toMatchObject({
      label: "Pago vencido",
      tone: "danger",
      description: "La reserva del pedido venció sin confirmación de pago.",
      nextStep:
        "Si querés avanzar, armá una compra nueva o consultanos por WhatsApp."
    });
  });

  it("uses pickup-specific next steps when an order is ready for pickup", () => {
    expect(
      getGuestOrderStatusView({
        status: ORDER_STATUS.readyForPickup,
        deliveryMethod: DELIVERY_METHOD.pickup
      }).nextStep
    ).toContain("retiro");
  });
});

function createStoredOrder({
  idempotencyKey,
  orderId,
  orderNumber,
  guestAccessToken
}: {
  idempotencyKey: string;
  orderId: string;
  orderNumber: string;
  guestAccessToken: string;
}) {
  const result = createPendingOrderFromCheckout({
    cart: getCart(),
    checkout: {
      fullName: "Luca Irruptivo",
      email: "luca@example.com",
      phone: "11 5555 5555",
      deliveryMethod: DELIVERY_METHOD.pickup,
      notes: "Paso por la tarde"
    },
    products,
    orderId,
    orderNumber,
    guestAccessToken,
    now
  });

  if (result.status !== "created") {
    throw new Error(`Expected stored order ${idempotencyKey} to be valid.`);
  }

  return result.order;
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
