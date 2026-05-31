import { beforeEach, describe, expect, it } from "vitest";

import {
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
});
