import { describe, expect, it } from "vitest";

import { DELIVERY_METHOD, ORDER_STATUS } from "../domain/rules";
import { getPaymentResultView, type PaymentResultOrder } from "./payment-result";

const now = "2026-05-30T12:00:00.000Z";

describe("payment result presenter", () => {
  it("maps a paid order to a success result with order details and guest status link", () => {
    const view = getPaymentResultView(
      getPaymentResultOrder({ status: ORDER_STATUS.paid })
    );

    expect(view).toMatchObject({
      state: "success",
      statusLabel: "Pago confirmado",
      title: "Pago confirmado",
      order: {
        orderNumber: "IRR-000001",
        totalLabel: expect.stringMatching(/^\$\s86\.900$/),
        deliverySummary:
          "Envío a domicilio a Av. Siempre Viva 742, Benavidez, Buenos Aires (1621).",
        guestStatusHref: "/pedido/guest-access-token"
      },
      accountCreationCta: null
    });
    expect(view.nextSteps.join(" ")).toContain("coordinar el envío");
    expect(view.supportAction.label).toBe("Escribir por WhatsApp");
  });

  it("maps a failed payment to fresh-checkout guidance", () => {
    const view = getPaymentResultView(
      getPaymentResultOrder({ status: ORDER_STATUS.paymentFailed })
    );

    expect(view.state).toBe("failure");
    expect(view.statusLabel).toBe("Pago rechazado");
    expect(view.message).toContain("necesitás iniciar una compra nueva");
    expect(view.primaryAction).toMatchObject({
      label: "Iniciar compra nueva",
      href: "/coleccion"
    });
  });

  it("maps a pending payment to truthful server-confirmation guidance", () => {
    const view = getPaymentResultView(
      getPaymentResultOrder({ status: ORDER_STATUS.pendingPayment })
    );

    expect(view.state).toBe("pending");
    expect(view.statusLabel).toBe("Pago pendiente");
    expect(view.message).toContain("puede tardar unos minutos");
    expect(view.message).toContain("servidor");
    expect(view.nextSteps.join(" ")).toContain("verificación");
  });

  it("maps an expired payment to fresh-checkout guidance", () => {
    const view = getPaymentResultView(
      getPaymentResultOrder({ status: ORDER_STATUS.expired })
    );

    expect(view.state).toBe("expired");
    expect(view.statusLabel).toBe("Pago vencido");
    expect(view.message).toContain("Terminó el tiempo para completar el pago");
    expect(view.message).toContain("checkout nuevo");
  });

  it("never mutates order state while presenting a result", () => {
    const order = getPaymentResultOrder({ status: ORDER_STATUS.pendingPayment });
    const snapshot = JSON.stringify(order);

    getPaymentResultView(order);

    expect(JSON.stringify(order)).toBe(snapshot);
    expect(order.status).toBe(ORDER_STATUS.pendingPayment);
  });

  it("does not expose raw internal statuses or account creation CTA copy", () => {
    const views = [
      getPaymentResultView(getPaymentResultOrder({ status: ORDER_STATUS.paid })),
      getPaymentResultView(
        getPaymentResultOrder({ status: ORDER_STATUS.paymentFailed })
      ),
      getPaymentResultView(
        getPaymentResultOrder({ status: ORDER_STATUS.pendingPayment })
      ),
      getPaymentResultView(getPaymentResultOrder({ status: ORDER_STATUS.expired }))
    ];

    const renderedCopy = views.flatMap(getCustomerFacingCopy).join(" ");

    expect(renderedCopy).not.toContain("pending_payment");
    expect(renderedCopy).not.toContain("payment_failed");
    expect(renderedCopy).not.toContain("paid");
    expect(renderedCopy).not.toContain("expired");
    expect(renderedCopy.toLowerCase()).not.toContain("crear cuenta");
    expect(views.every((view) => view.accountCreationCta === null)).toBe(true);
  });
});

function getCustomerFacingCopy(
  view: ReturnType<typeof getPaymentResultView>
): string[] {
  return [
    view.statusLabel,
    view.eyebrow,
    view.title,
    view.message,
    view.order.orderNumber,
    view.order.totalLabel,
    view.order.deliverySummary,
    view.primaryAction.label,
    view.supportAction.label,
    view.guestStatusAction?.label,
    ...view.nextSteps
  ].filter((value): value is string => Boolean(value));
}

function getPaymentResultOrder({
  status
}: {
  status: PaymentResultOrder["status"];
}): PaymentResultOrder {
  return {
    id: "order-001",
    orderNumber: "IRR-000001",
    status,
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
    items: [
      {
        productId: "training-tee",
        productName: "Training Tee Negra",
        productSlug: "training-tee-negra",
        productArea: "clothing",
        variantId: "tee-black-s",
        variantName: "Negro / S",
        sku: "TEE-BLK-S",
        options: {
          color: "Negro",
          size: "S"
        },
        optionSummary: "Negro / S",
        quantity: 2,
        unitPriceArs: 26000,
        lineTotalArs: 52000
      },
      {
        productId: "creatina",
        productName: "Creatina Monohidrato 300 g",
        productSlug: "creatina-monohidrato-300g",
        productArea: "supplement",
        variantId: "creatina-300g",
        variantName: "300 g",
        sku: "CREATINA-300G",
        options: {
          weight: "300 g"
        },
        optionSummary: "300 g",
        quantity: 1,
        unitPriceArs: 29900,
        lineTotalArs: 29900
      }
    ],
    subtotalArs: 81900,
    deliveryCostArs: 5000,
    totalArs: 86900,
    paymentPreference: null
  };
}
