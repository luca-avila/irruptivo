import { beforeEach, describe, expect, it } from "vitest";

import {
  getPaymentManualReviewForOrder,
  hasProcessedPaymentEvent,
  readPaymentEventsForTests,
  recordPaymentEventOnce,
  resetPaymentEventsForTests
} from "./payment-events";

const receivedAt = "2026-05-30T12:00:00.000Z";

describe("payment event idempotency module", () => {
  beforeEach(() => {
    resetPaymentEventsForTests();
  });

  it("records a verified Mercado Pago event once for auditability", () => {
    const result = recordPaymentEventOnce({
      provider: "mercado_pago",
      providerEventId: "event-001",
      providerPaymentId: "payment-001",
      orderId: "order-001",
      type: "payment",
      action: "payment.updated",
      providerStatus: "approved",
      processingResult: "paid",
      receivedAt
    });

    expect(result).toMatchObject({
      status: "recorded",
      event: {
        provider: "mercado_pago",
        providerEventId: "event-001",
        providerPaymentId: "payment-001",
        orderId: "order-001",
        providerStatus: "approved",
        processingResult: "paid",
        receivedAt
      }
    });
    expect(
      hasProcessedPaymentEvent({
        provider: "mercado_pago",
        providerEventId: "event-001"
      })
    ).toBe(true);
    expect(readPaymentEventsForTests()).toHaveLength(1);
  });

  it("does not record or process the same provider event twice", () => {
    recordPaymentEventOnce({
      provider: "mercado_pago",
      providerEventId: "event-001",
      providerPaymentId: "payment-001",
      orderId: "order-001",
      type: "payment",
      action: "payment.updated",
      providerStatus: "approved",
      processingResult: "paid",
      receivedAt
    });

    const duplicateResult = recordPaymentEventOnce({
      provider: "mercado_pago",
      providerEventId: "event-001",
      providerPaymentId: "payment-001",
      orderId: "order-001",
      type: "payment",
      action: "payment.updated",
      providerStatus: "approved",
      processingResult: "duplicate",
      receivedAt
    });

    expect(duplicateResult).toMatchObject({
      status: "duplicate",
      event: {
        providerEventId: "event-001",
        processingResult: "paid"
      }
    });
    expect(readPaymentEventsForTests()).toHaveLength(1);
  });

  it("exposes late expired-payment review state with Spanish admin copy", () => {
    recordPaymentEventOnce({
      provider: "mercado_pago",
      providerEventId: "event-late-001",
      providerPaymentId: "payment-late-001",
      orderId: "order-001",
      type: "payment",
      action: "payment.updated",
      providerStatus: "approved",
      processingResult: "manual_review_required",
      receivedAt
    });

    const review = getPaymentManualReviewForOrder(" order-001 ");
    const renderedCopy = `${review.label} ${review.description}`;

    expect(review).toEqual({
      required: true,
      label: "Revisión manual requerida",
      description:
        "Llegó un pago aprobado para un pedido con reserva vencida. Revisá el caso antes de preparar o devolver el pago.",
      providerPaymentIds: ["payment-late-001"],
      latestEventAt: receivedAt
    });
    expect(renderedCopy).not.toContain("manual_review_required");
    expect(renderedCopy).not.toContain("expired");
    expect(renderedCopy).not.toContain("pending_payment");
  });

  it("returns a neutral admin review state when an order has no late expired payment", () => {
    recordPaymentEventOnce({
      provider: "mercado_pago",
      providerEventId: "event-paid-001",
      providerPaymentId: "payment-paid-001",
      orderId: "order-001",
      type: "payment",
      action: "payment.updated",
      providerStatus: "approved",
      processingResult: "paid",
      receivedAt
    });

    expect(getPaymentManualReviewForOrder("order-001")).toEqual({
      required: false,
      label: "Sin revisión manual",
      description: "No hay pagos tardíos pendientes de revisión para este pedido.",
      providerPaymentIds: [],
      latestEventAt: null
    });
  });
});
