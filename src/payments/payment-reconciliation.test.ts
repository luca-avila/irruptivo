import { describe, expect, it } from "vitest";

import { DELIVERY_METHOD, ORDER_STATUS, type OrderStatus } from "../domain/rules";
import {
  type OrderConfirmationEmailResult
} from "../notifications/order-confirmation-email";
import { type AdminOrderNotificationResult } from "../notifications/admin-order-notification-email";
import { type Order } from "../orders/order-creation";
import {
  type PaymentEventIdentity,
  type PaymentEventRecord,
  type RecordPaymentEventOnceResult
} from "./payment-events";
import {
  reconcileMercadoPagoEvent,
  reconcileMercadoPagoPaymentById,
  type MercadoPagoPayment,
  type PaymentReconciliationRepository
} from "./payment-reconciliation";

const now = "2026-05-30T12:00:00.000Z";

describe("Mercado Pago payment reconciliation", () => {
  it("moves a pending order to paid and sends buyer and admin emails after verified server-side approved payment", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));
    const confirmationEmails: Order[] = [];
    const adminNotifications: Order[] = [];

    const result = await reconcileMercadoPagoEvent(getNotification(), {
      paymentProvider: async () => getPayment({ status: "approved" }),
      repository,
      confirmationEmailSender: async (order) => {
        confirmationEmails.push(order);

        return getSentConfirmationEmailResult(order);
      },
      adminNotificationEmailSender: async (order) => {
        adminNotifications.push(order);

        return getSentAdminNotificationResult(order);
      },
      now
    });

    expect(result).toEqual({
      status: "paid",
      orderId: "order-001",
      providerPaymentId: "payment-001",
      orderStatus: ORDER_STATUS.paid,
      confirmationEmail: {
        status: "sent",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        providerMessageId: "message-order-001"
      },
      adminNotification: {
        status: "sent",
        orderId: "order-001",
        recipientEmail: "admin@irruptivo.test",
        providerMessageId: "admin-message-order-001"
      }
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.paid);
    expect(repository.readVariantStock("tee-black-s")).toBe(8);
    expect(repository.readVariantStock("creatina-300g")).toBe(9);
    expect(repository.transitionCount).toBe(1);
    expect(repository.lastUpdate).toMatchObject({
      reason: "payment_approved"
    });
    expect(confirmationEmails).toHaveLength(1);
    expect(confirmationEmails[0]).toMatchObject({
      id: "order-001",
      status: ORDER_STATUS.paid
    });
    expect(adminNotifications).toHaveLength(1);
    expect(adminNotifications[0]).toMatchObject({
      id: "order-001",
      status: ORDER_STATUS.paid
    });
    expect(repository.readEvents()).toMatchObject([
      {
        providerEventId: "event-001",
        providerPaymentId: "payment-001",
        orderId: "order-001",
        providerStatus: "approved",
        processingResult: "paid"
      }
    ]);
  });

  it("moves a pending order to payment_failed after verified failure", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));

    const result = await reconcileMercadoPagoEvent(getNotification(), {
      paymentProvider: async () => getPayment({ status: "rejected" }),
      repository,
      now
    });

    expect(result).toEqual({
      status: "payment_failed",
      orderId: "order-001",
      providerPaymentId: "payment-001",
      orderStatus: ORDER_STATUS.paymentFailed
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.paymentFailed);
    expect(repository.lastUpdate).toMatchObject({
      reason: "payment_failed"
    });
  });

  it("does not repeat a paid transition for a duplicate success event", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));
    const notification = getNotification();
    const confirmationEmails: Order[] = [];
    const confirmationEmailSender = async (
      order: Order
    ): Promise<OrderConfirmationEmailResult> => {
      confirmationEmails.push(order);

      return getSentConfirmationEmailResult(order);
    };

    await reconcileMercadoPagoEvent(notification, {
      paymentProvider: async () => getPayment({ status: "approved" }),
      repository,
      confirmationEmailSender,
      adminNotificationEmailSender: async (order) =>
        getSkippedAdminNotificationResult(order),
      now
    });
    const duplicateResult = await reconcileMercadoPagoEvent(notification, {
      paymentProvider: async () => getPayment({ status: "approved" }),
      repository,
      confirmationEmailSender,
      adminNotificationEmailSender: async (order) =>
        getSkippedAdminNotificationResult(order),
      now
    });

    expect(duplicateResult).toEqual({
      status: "duplicate",
      orderId: "order-001",
      providerPaymentId: "payment-001"
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.paid);
    expect(repository.transitionCount).toBe(1);
    expect(confirmationEmails).toHaveLength(1);
  });

  it("retries an approved payment when settlement rolls back before commit", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));
    const notification = getNotification();
    const failingRepository: TestOrderRepository = {
      ...repository,
      async markOrderPaidAndDecrementStock() {
        throw new Error("Simulated settlement rollback.");
      }
    };

    await expect(
      reconcileMercadoPagoEvent(notification, {
        paymentProvider: async () => getPayment({ status: "approved" }),
        repository: failingRepository,
        adminNotificationEmailSender: async (order) =>
          getSkippedAdminNotificationResult(order),
        now
      })
    ).rejects.toThrow("Simulated settlement rollback.");

    expect(repository.readEvents()).toEqual([]);
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.pendingPayment);
    expect(repository.readVariantStock("tee-black-s")).toBe(10);
    expect(repository.readVariantStock("creatina-300g")).toBe(10);

    const retryResult = await reconcileMercadoPagoEvent(notification, {
      paymentProvider: async () => getPayment({ status: "approved" }),
      repository,
      adminNotificationEmailSender: async (order) =>
        getSkippedAdminNotificationResult(order),
      now
    });

    expect(retryResult).toMatchObject({
      status: "paid",
      orderId: "order-001",
      providerPaymentId: "payment-001"
    });
    expect(repository.readEvents()).toMatchObject([
      {
        providerEventId: "event-001",
        processingResult: "paid"
      }
    ]);
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.paid);
    expect(repository.readVariantStock("tee-black-s")).toBe(8);
    expect(repository.readVariantStock("creatina-300g")).toBe(9);
  });

  it("does not decrement stock again for a second approved event with a different event id", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));

    const firstResult = await reconcileMercadoPagoEvent(
      getNotification({ id: "event-001" }),
      {
        paymentProvider: async () => getPayment({ status: "approved" }),
        repository,
        adminNotificationEmailSender: async (order) =>
          getSkippedAdminNotificationResult(order),
        now
      }
    );
    const secondResult = await reconcileMercadoPagoEvent(
      getNotification({ id: "event-002" }),
      {
        paymentProvider: async () => getPayment({ status: "approved" }),
        repository,
        adminNotificationEmailSender: async (order) =>
          getSkippedAdminNotificationResult(order),
        now
      }
    );

    expect(firstResult).toMatchObject({
      status: "paid",
      orderId: "order-001"
    });
    expect(secondResult).toEqual({
      status: "ignored",
      reason: "already_reconciled",
      providerPaymentId: "payment-001"
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.paid);
    expect(repository.transitionCount).toBe(1);
    expect(repository.readVariantStock("tee-black-s")).toBe(8);
    expect(repository.readVariantStock("creatina-300g")).toBe(9);
    expect(repository.readEvents()).toHaveLength(2);
  });

  it("does not repeat a failed transition for a duplicate failure event", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));
    const notification = getNotification();

    await reconcileMercadoPagoEvent(notification, {
      paymentProvider: async () => getPayment({ status: "rejected" }),
      repository,
      adminNotificationEmailSender: async (order) =>
        getSkippedAdminNotificationResult(order),
      now
    });
    const duplicateResult = await reconcileMercadoPagoEvent(notification, {
      paymentProvider: async () => getPayment({ status: "rejected" }),
      repository,
      adminNotificationEmailSender: async (order) =>
        getSkippedAdminNotificationResult(order),
      now
    });

    expect(duplicateResult).toEqual({
      status: "duplicate",
      orderId: "order-001",
      providerPaymentId: "payment-001"
    });
    expect(repository.transitionCount).toBe(1);
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.paymentFailed);
  });

  it("does not mark an order paid when the provider payment cannot be verified", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));

    const result = await reconcileMercadoPagoEvent(getNotification(), {
      paymentProvider: async () => null,
      repository,
      now
    });

    expect(result).toEqual({
      status: "unverified",
      providerPaymentId: "payment-001"
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.pendingPayment);
    expect(repository.readEvents()).toEqual([]);
  });

  it("ignores unknown webhook topics without mutating the order", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));

    const result = await reconcileMercadoPagoEvent(
      getNotification({
        type: "merchant_order",
        action: "merchant_order.updated"
      }),
      {
        paymentProvider: async () => {
          throw new Error("Payment provider should not be called");
        },
        repository,
        now
      }
    );

    expect(result).toEqual({
      status: "ignored",
      reason: "unsupported_event",
      providerPaymentId: "payment-001"
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.pendingPayment);
  });

  it("does not let an earlier pending provider status block a later approved update for the same payment", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));
    const notification = getNotification({
      id: "payment-001",
      dataId: "payment-001"
    });

    const pendingResult = await reconcileMercadoPagoEvent(notification, {
      paymentProvider: async () => getPayment({ status: "pending" }),
      repository,
      now
    });
    const approvedResult = await reconcileMercadoPagoEvent(notification, {
      paymentProvider: async () => getPayment({ status: "approved" }),
      repository,
      adminNotificationEmailSender: async (order) =>
        getSkippedAdminNotificationResult(order),
      now
    });

    expect(pendingResult).toEqual({
      status: "ignored",
      reason: "unsupported_payment_status",
      providerPaymentId: "payment-001"
    });
    expect(approvedResult).toMatchObject({
      status: "paid",
      orderId: "order-001",
      providerPaymentId: "payment-001"
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.paid);
    expect(repository.readEvents()).toHaveLength(2);
  });

  it("does not automatically mark an expired order paid after a late success", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.expired));

    const result = await reconcileMercadoPagoEvent(getNotification(), {
      paymentProvider: async () => getPayment({ status: "approved" }),
      repository,
      now
    });

    expect(result).toEqual({
      status: "manual_review_required",
      orderId: "order-001",
      providerPaymentId: "payment-001",
      orderStatus: ORDER_STATUS.expired
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.expired);
  });

  it("expires the order, flags manual review, and skips emails when approved payment has insufficient stock", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment), {
      stockByVariantId: {
        "tee-black-s": 1,
        "creatina-300g": 5
      }
    });
    const confirmationEmails: Order[] = [];
    const adminNotifications: Order[] = [];

    const result = await reconcileMercadoPagoEvent(getNotification(), {
      paymentProvider: async () => getPayment({ status: "approved" }),
      repository,
      confirmationEmailSender: async (order) => {
        confirmationEmails.push(order);

        return getSentConfirmationEmailResult(order);
      },
      adminNotificationEmailSender: async (order) => {
        adminNotifications.push(order);

        return getSentAdminNotificationResult(order);
      },
      now
    });

    expect(result).toEqual({
      status: "manual_review_required",
      orderId: "order-001",
      providerPaymentId: "payment-001",
      orderStatus: ORDER_STATUS.expired
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.expired);
    expect(repository.transitionCount).toBe(1);
    expect(repository.lastUpdate).toMatchObject({
      status: ORDER_STATUS.expired,
      reason: "insufficient_stock_on_payment"
    });
    expect(repository.readVariantStock("tee-black-s")).toBe(1);
    expect(repository.readVariantStock("creatina-300g")).toBe(5);
    expect(confirmationEmails).toEqual([]);
    expect(adminNotifications).toEqual([]);
    expect(repository.readEvents()).toMatchObject([
      {
        providerEventId: "event-001:insufficient_stock",
        providerPaymentId: "payment-001",
        orderId: "order-001",
        providerStatus: "approved",
        processingResult: "manual_review_required"
      }
    ]);
  });

  it("rolls back the whole paid settlement when one order line has insufficient stock", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment), {
      stockByVariantId: {
        "tee-black-s": 2,
        "creatina-300g": 0
      }
    });

    const result = await reconcileMercadoPagoEvent(getNotification(), {
      paymentProvider: async () => getPayment({ status: "approved" }),
      repository,
      adminNotificationEmailSender: async (order) =>
        getSkippedAdminNotificationResult(order),
      now
    });

    expect(result).toMatchObject({
      status: "manual_review_required",
      orderId: "order-001",
      orderStatus: ORDER_STATUS.expired
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.expired);
    expect(repository.readVariantStock("tee-black-s")).toBe(2);
    expect(repository.readVariantStock("creatina-300g")).toBe(0);
  });

  it("does not rerun settlement or emails after the insufficient-stock manual-review path", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment), {
      stockByVariantId: {
        "tee-black-s": 1,
        "creatina-300g": 5
      }
    });
    const notification = getNotification();
    const confirmationEmails: Order[] = [];
    const confirmationEmailSender = async (
      order: Order
    ): Promise<OrderConfirmationEmailResult> => {
      confirmationEmails.push(order);

      return getSentConfirmationEmailResult(order);
    };

    await reconcileMercadoPagoEvent(notification, {
      paymentProvider: async () => getPayment({ status: "approved" }),
      repository,
      confirmationEmailSender,
      adminNotificationEmailSender: async (order) =>
        getSkippedAdminNotificationResult(order),
      now
    });
    const duplicateResult = await reconcileMercadoPagoEvent(notification, {
      paymentProvider: async () => getPayment({ status: "approved" }),
      repository,
      confirmationEmailSender,
      adminNotificationEmailSender: async (order) =>
        getSkippedAdminNotificationResult(order),
      now
    });

    expect(duplicateResult).toEqual({
      status: "manual_review_required",
      orderId: "order-001",
      providerPaymentId: "payment-001",
      orderStatus: ORDER_STATUS.expired
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.expired);
    expect(repository.transitionCount).toBe(1);
    expect(repository.readVariantStock("tee-black-s")).toBe(1);
    expect(repository.readVariantStock("creatina-300g")).toBe(5);
    expect(confirmationEmails).toEqual([]);
    expect(repository.readEvents()).toHaveLength(2);
  });

  it("surfaces confirmation email failure without rolling back the paid transition", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));

    const result = await reconcileMercadoPagoEvent(getNotification(), {
      paymentProvider: async () => getPayment({ status: "approved" }),
      repository,
      confirmationEmailSender: async (order) => ({
        status: "failed",
        orderId: order.id,
        recipientEmail: order.contact.email,
        message: "El proveedor de email rechazó el envío."
      }),
      adminNotificationEmailSender: async (order) =>
        getSkippedAdminNotificationResult(order),
      now
    });

    expect(result).toEqual({
      status: "paid",
      orderId: "order-001",
      providerPaymentId: "payment-001",
      orderStatus: ORDER_STATUS.paid,
      confirmationEmail: {
        status: "failed",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        message: "El proveedor de email rechazó el envío."
      },
      adminNotification: {
        status: "skipped",
        reason: "no_recipient_configured",
        orderId: "order-001"
      }
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.paid);
  });

  it("reconciles to paid from only a payment id on the buyer's return", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));
    const fetchedPaymentIds: string[] = [];

    const result = await reconcileMercadoPagoPaymentById("payment-001", {
      paymentProvider: async (providerPaymentId) => {
        fetchedPaymentIds.push(providerPaymentId);

        return getPayment({ status: "approved" });
      },
      repository,
      confirmationEmailSender: async (order) =>
        getSentConfirmationEmailResult(order),
      adminNotificationEmailSender: async (order) =>
        getSkippedAdminNotificationResult(order),
      now
    });

    expect(fetchedPaymentIds).toEqual(["payment-001"]);
    expect(result).toMatchObject({
      status: "paid",
      orderId: "order-001",
      providerPaymentId: "payment-001",
      orderStatus: ORDER_STATUS.paid
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.paid);
  });

  it("ignores an empty payment id on return without touching the order or the API", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));
    let providerCalls = 0;

    const result = await reconcileMercadoPagoPaymentById("   ", {
      paymentProvider: async () => {
        providerCalls += 1;

        return getPayment({ status: "approved" });
      },
      repository,
      now
    });

    expect(providerCalls).toBe(0);
    expect(result).toMatchObject({
      status: "ignored",
      reason: "unsupported_event"
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.pendingPayment);
  });
});

function clonePaymentEvent(event: PaymentEventRecord): PaymentEventRecord {
  return {
    ...event
  };
}

function getNotification({
  id = "event-001",
  type = "payment",
  action = "payment.updated",
  dataId = "payment-001"
}: {
  id?: string;
  type?: string;
  action?: string;
  dataId?: string;
} = {}) {
  return {
    id,
    liveMode: false,
    type,
    action,
    dataId,
    dateCreated: now
  };
}

function getPayment({
  status,
  paymentId = "payment-001",
  orderId = "order-001"
}: {
  status: string;
  paymentId?: string;
  orderId?: string;
}): MercadoPagoPayment {
  return {
    id: paymentId,
    status,
    statusDetail: status === "approved" ? "accredited" : "cc_rejected_other_reason",
    externalReference: orderId,
    transactionAmount: 86900,
    metadata: {
      internalOrderId: orderId
    }
  };
}

function getSentConfirmationEmailResult(
  order: Order
): OrderConfirmationEmailResult {
  return {
    status: "sent",
    orderId: order.id,
    recipientEmail: order.contact.email,
    providerMessageId: `message-${order.id}`
  };
}

function getSentAdminNotificationResult(
  order: Order
): AdminOrderNotificationResult {
  return {
    status: "sent",
    orderId: order.id,
    recipientEmail: "admin@irruptivo.test",
    providerMessageId: `admin-message-${order.id}`
  };
}

function getSkippedAdminNotificationResult(
  order: Order
): AdminOrderNotificationResult {
  return {
    status: "skipped",
    reason: "no_recipient_configured",
    orderId: order.id
  };
}

function createOrderRepository(
  order: Order | null,
  {
    stockByVariantId
  }: {
    stockByVariantId?: Record<string, number>;
  } = {}
): TestOrderRepository {
  let currentOrder = order ? cloneOrder(order) : null;
  const variantStock = new Map<string, number>(
    Object.entries(stockByVariantId ?? getDefaultVariantStock(order))
  );
  const events: PaymentEventRecord[] = [];
  const findStoredPaymentEvent = ({
    provider,
    providerEventId
  }: PaymentEventIdentity): PaymentEventRecord | null =>
    events.find(
      (candidateEvent) =>
        candidateEvent.provider === provider &&
        candidateEvent.providerEventId === providerEventId
    ) ?? null;
  const recordPaymentEvent = async (
    event: PaymentEventRecord
  ): Promise<RecordPaymentEventOnceResult> => {
    const existingEvent = findStoredPaymentEvent(event);

    if (existingEvent) {
      return {
        status: "duplicate",
        event: clonePaymentEvent(existingEvent)
      };
    }

    events.push(clonePaymentEvent(event));

    return {
      status: "recorded",
      event: clonePaymentEvent(event)
    };
  };

  return {
    transitionCount: 0,
    lastUpdate: null,
    async findOrderById(orderId: string): Promise<Order | null> {
      return currentOrder?.id === orderId ? cloneOrder(currentOrder) : null;
    },
    async updateOrderStatus(input: {
      orderId: string;
      status: OrderStatus;
      reason?: string;
      actor?: string;
    }): Promise<Order | null> {
      const { orderId, status } = input;

      if (!currentOrder || currentOrder.id !== orderId) {
        return null;
      }

      this.transitionCount += 1;
      this.lastUpdate = input;
      currentOrder = {
        ...currentOrder,
        status
      };

      return cloneOrder(currentOrder);
    },
    recordPaymentEvent,
    async markOrderPaidAndDecrementStock(input: {
      orderId: string;
      reason?: string;
      actor?: string;
      paymentEvent?: PaymentEventRecord;
    }) {
      const { orderId } = input;

      if (!currentOrder || currentOrder.id !== orderId) {
        return {
          status: "already_reconciled",
          order: null
        };
      }

      if (currentOrder.status !== ORDER_STATUS.pendingPayment) {
        return {
          status: "already_reconciled",
          order: cloneOrder(currentOrder)
        };
      }

      const quantityByVariantId = getQuantityByVariantId(currentOrder);

      for (const [variantId, quantity] of quantityByVariantId) {
        if ((variantStock.get(variantId) ?? 0) < quantity) {
          return {
            status: "insufficient_stock",
            order: cloneOrder(currentOrder)
          };
        }
      }

      if (input.paymentEvent) {
        const claimResult = await recordPaymentEvent(input.paymentEvent);

        if (claimResult.status === "duplicate") {
          return {
            status: "duplicate",
            event: claimResult.event
          };
        }
      }

      for (const [variantId, quantity] of quantityByVariantId) {
        variantStock.set(variantId, (variantStock.get(variantId) ?? 0) - quantity);
      }

      this.transitionCount += 1;
      this.lastUpdate = {
        orderId,
        status: ORDER_STATUS.paid,
        reason: input.reason,
        actor: input.actor
      };
      currentOrder = {
        ...currentOrder,
        status: ORDER_STATUS.paid
      };

      return {
        status: "paid",
        order: cloneOrder(currentOrder)
      };
    },
    getOrder(): Order | null {
      return currentOrder ? cloneOrder(currentOrder) : null;
    },
    readVariantStock(variantId: string): number | null {
      return variantStock.get(variantId) ?? null;
    },
    readEvents(): PaymentEventRecord[] {
      return events.map(clonePaymentEvent);
    }
  };
}

type TestOrderRepository = PaymentReconciliationRepository & {
  transitionCount: number;
  lastUpdate: {
    orderId: string;
    status: OrderStatus;
    reason?: string;
    actor?: string;
  } | null;
  getOrder: () => Order | null;
  readVariantStock: (variantId: string) => number | null;
  readEvents: () => PaymentEventRecord[];
};

function getDefaultVariantStock(order: Order | null): Record<string, number> {
  if (!order) {
    return {};
  }

  return Object.fromEntries(
    order.items.map((item) => [item.variantId, 10])
  );
}

function getQuantityByVariantId(order: Order): Map<string, number> {
  const quantityByVariantId = new Map<string, number>();

  for (const item of order.items) {
    quantityByVariantId.set(
      item.variantId,
      (quantityByVariantId.get(item.variantId) ?? 0) + item.quantity
    );
  }

  return quantityByVariantId;
}

function getOrder(status: OrderStatus): Order {
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
      notes: null
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

function cloneOrder(order: Order): Order {
  return {
    ...order,
    contact: {
      ...order.contact
    },
    delivery: {
      ...order.delivery,
      shippingAddress: order.delivery.shippingAddress
        ? {
            ...order.delivery.shippingAddress
          }
        : null
    },
    items: order.items.map((item) => ({
      ...item,
      options: {
        ...item.options
      }
    })),
    paymentPreference: order.paymentPreference
      ? {
          ...order.paymentPreference
        }
      : null
  };
}
