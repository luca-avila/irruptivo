import { beforeEach, describe, expect, it, type TestContext } from "vitest";

import { DELIVERY_METHOD, ORDER_STATUS } from "../domain/rules";
import { prisma } from "../db/client";
import {
  getPaymentManualReviewForOrder,
  hasProcessedPaymentEvent,
  mapPaymentEventRecordToRow,
  mapPaymentEventRowToRecord,
  readPaymentEventsForTests,
  recordPaymentEventOnce,
  resetPaymentEventsForTests
} from "./payment-events";

const receivedAt = "2026-05-30T12:00:00.000Z";

describe("payment event mappers", () => {
  it("round-trips a PaymentEvent DB row and PaymentEventRecord without a database", () => {
    const row = mapPaymentEventRecordToRow({
      provider: "mercado_pago",
      providerEventId: " event-001 ",
      providerPaymentId: " payment-001 ",
      orderId: " order-001 ",
      type: " payment ",
      action: " payment.updated ",
      providerStatus: " approved ",
      processingResult: " paid ",
      receivedAt
    });

    expect(row).toMatchObject({
      provider: "mercado_pago",
      providerEventId: "event-001",
      providerPaymentId: "payment-001",
      orderId: "order-001",
      type: "payment",
      action: "payment.updated",
      providerStatus: "approved",
      processingResult: "paid"
    });
    expect(row.receivedAt).toEqual(new Date(receivedAt));
    expect(mapPaymentEventRowToRecord(row)).toEqual({
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
  });
});

describe.skipIf(!process.env.DATABASE_URL)(
  "payment event idempotency database store",
  () => {
    beforeEach(async (ctx) => {
      await skipIfDatabaseUnavailable(ctx);
      await resetPaymentEventsForTests();
      await resetOrdersForTests();
      await createTestOrder();
    });

    it("records a verified Mercado Pago event once for auditability", async () => {
      const result = await recordPaymentEventOnce({
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
      await expect(
        hasProcessedPaymentEvent({
          provider: "mercado_pago",
          providerEventId: "event-001"
        })
      ).resolves.toBe(true);
      await expect(readPaymentEventsForTests()).resolves.toHaveLength(1);
    });

    it("does not record or process the same provider event twice", async () => {
      await recordPaymentEventOnce({
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

      const duplicateResult = await recordPaymentEventOnce({
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
      await expect(readPaymentEventsForTests()).resolves.toHaveLength(1);
    });

    it("exposes late expired-payment review state with Spanish admin copy", async () => {
      await recordPaymentEventOnce({
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
      await recordPaymentEventOnce({
        provider: "mercado_pago",
        providerEventId: "event-late-002",
        providerPaymentId: "payment-late-002",
        orderId: "order-001",
        type: "payment",
        action: "payment.updated",
        providerStatus: "approved",
        processingResult: "manual_review_required",
        receivedAt: "2026-05-30T12:05:00.000Z"
      });

      const review = await getPaymentManualReviewForOrder(" order-001 ");
      const renderedCopy = `${review.label} ${review.description}`;

      expect(review).toEqual({
        required: true,
        label: "Revisión manual requerida",
        description:
          "Llegó un pago aprobado para un pedido con reserva vencida. Revisá el caso antes de preparar o devolver el pago.",
        providerPaymentIds: ["payment-late-001", "payment-late-002"],
        latestEventAt: "2026-05-30T12:05:00.000Z"
      });
      expect(renderedCopy).not.toContain("manual_review_required");
      expect(renderedCopy).not.toContain("expired");
      expect(renderedCopy).not.toContain("pending_payment");
    });

    it("returns a neutral admin review state when an order has no late expired payment", async () => {
      await recordPaymentEventOnce({
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

      await expect(getPaymentManualReviewForOrder("order-001")).resolves.toEqual({
        required: false,
        label: "Sin revisión manual",
        description: "No hay pagos tardíos pendientes de revisión para este pedido.",
        providerPaymentIds: [],
        latestEventAt: null
      });
    });
  }
);

async function createTestOrder(orderId = "order-001"): Promise<void> {
  await prisma.order.create({
    data: {
      id: orderId,
      orderNumber: `IRR-${orderId}`,
      guestAccessToken: `guest-${orderId}`,
      idempotencyKey: `idem-${orderId}`,
      status: ORDER_STATUS.pendingPayment,
      createdAt: new Date(receivedAt),
      contactFullName: "Luca Irruptivo",
      contactEmail: "luca@example.com",
      contactPhone: "11 5555 5555",
      deliveryMethod: DELIVERY_METHOD.pickup,
      deliveryMethodLabel: "Retiro local",
      deliveryNotes: null,
      shipAddressLine: null,
      shipCity: null,
      shipProvince: null,
      shipPostalCode: null,
      adminNotes: null,
      subtotalArs: 26000,
      deliveryCostArs: 0,
      totalArs: 26000,
      paymentProvider: null,
      paymentPreferenceId: null,
      paymentCheckoutUrl: null,
      paymentInitPoint: null,
      paymentSandboxInitPoint: null,
      paymentExternalReference: null,
      paymentCreatedAt: null
    }
  });
}

async function resetOrdersForTests(): Promise<void> {
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
}

async function skipIfDatabaseUnavailable(ctx: TestContext): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    ctx.skip("DATABASE_URL is set, but the database is not reachable.");
  }
}
