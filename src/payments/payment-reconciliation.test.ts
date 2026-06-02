import { describe, expect, it } from "vitest";

import { DELIVERY_METHOD, ORDER_STATUS, type OrderStatus } from "../domain/rules";
import {
  type OrderConfirmationEmailResult
} from "../notifications/order-confirmation-email";
import { type Order } from "../orders/order-creation";
import {
  type PaymentEventRecord,
  type RecordPaymentEventOnceResult
} from "./payment-events";
import {
  reconcileMercadoPagoEvent,
  type MercadoPagoPayment,
  type PaymentEventRecorder,
  type PaymentReconciliationOrderRepository
} from "./payment-reconciliation";

const now = "2026-05-30T12:00:00.000Z";

describe("Mercado Pago payment reconciliation", () => {
  it("moves a pending order to paid and sends confirmation email after verified server-side approved payment", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));
    const eventRecorder = createTestPaymentEventRecorder();
    const confirmationEmails: Order[] = [];

    const result = await reconcileMercadoPagoEvent(getNotification(), {
      paymentProvider: async () => getPayment({ status: "approved" }),
      orderRepository: repository,
      eventRecorder: eventRecorder.record,
      confirmationEmailSender: async (order) => {
        confirmationEmails.push(order);

        return getSentConfirmationEmailResult(order);
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
      }
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.paid);
    expect(repository.transitionCount).toBe(1);
    expect(repository.lastUpdate).toMatchObject({
      reason: "payment_approved"
    });
    expect(confirmationEmails).toHaveLength(1);
    expect(confirmationEmails[0]).toMatchObject({
      id: "order-001",
      status: ORDER_STATUS.paid
    });
    expect(eventRecorder.read()).toMatchObject([
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
    const eventRecorder = createTestPaymentEventRecorder();

    const result = await reconcileMercadoPagoEvent(getNotification(), {
      paymentProvider: async () => getPayment({ status: "rejected" }),
      orderRepository: repository,
      eventRecorder: eventRecorder.record,
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
    const eventRecorder = createTestPaymentEventRecorder();
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
      orderRepository: repository,
      eventRecorder: eventRecorder.record,
      confirmationEmailSender,
      now
    });
    const duplicateResult = await reconcileMercadoPagoEvent(notification, {
      paymentProvider: async () => getPayment({ status: "approved" }),
      orderRepository: repository,
      eventRecorder: eventRecorder.record,
      confirmationEmailSender,
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

  it("does not repeat a failed transition for a duplicate failure event", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));
    const eventRecorder = createTestPaymentEventRecorder();
    const notification = getNotification();

    await reconcileMercadoPagoEvent(notification, {
      paymentProvider: async () => getPayment({ status: "rejected" }),
      orderRepository: repository,
      eventRecorder: eventRecorder.record,
      now
    });
    const duplicateResult = await reconcileMercadoPagoEvent(notification, {
      paymentProvider: async () => getPayment({ status: "rejected" }),
      orderRepository: repository,
      eventRecorder: eventRecorder.record,
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
    const eventRecorder = createTestPaymentEventRecorder();

    const result = await reconcileMercadoPagoEvent(getNotification(), {
      paymentProvider: async () => null,
      orderRepository: repository,
      eventRecorder: eventRecorder.record,
      now
    });

    expect(result).toEqual({
      status: "unverified",
      providerPaymentId: "payment-001"
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.pendingPayment);
    expect(eventRecorder.read()).toEqual([]);
  });

  it("ignores unknown webhook topics without mutating the order", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));
    const eventRecorder = createTestPaymentEventRecorder();

    const result = await reconcileMercadoPagoEvent(
      getNotification({
        type: "merchant_order",
        action: "merchant_order.updated"
      }),
      {
        paymentProvider: async () => {
          throw new Error("Payment provider should not be called");
        },
        orderRepository: repository,
        eventRecorder: eventRecorder.record,
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
    const eventRecorder = createTestPaymentEventRecorder();
    const notification = getNotification({
      id: "payment-001",
      dataId: "payment-001"
    });

    const pendingResult = await reconcileMercadoPagoEvent(notification, {
      paymentProvider: async () => getPayment({ status: "pending" }),
      orderRepository: repository,
      eventRecorder: eventRecorder.record,
      now
    });
    const approvedResult = await reconcileMercadoPagoEvent(notification, {
      paymentProvider: async () => getPayment({ status: "approved" }),
      orderRepository: repository,
      eventRecorder: eventRecorder.record,
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
    expect(eventRecorder.read()).toHaveLength(2);
  });

  it("does not automatically mark an expired order paid after a late success", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.expired));
    const eventRecorder = createTestPaymentEventRecorder();

    const result = await reconcileMercadoPagoEvent(getNotification(), {
      paymentProvider: async () => getPayment({ status: "approved" }),
      orderRepository: repository,
      eventRecorder: eventRecorder.record,
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

  it("surfaces confirmation email failure without rolling back the paid transition", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));
    const eventRecorder = createTestPaymentEventRecorder();

    const result = await reconcileMercadoPagoEvent(getNotification(), {
      paymentProvider: async () => getPayment({ status: "approved" }),
      orderRepository: repository,
      eventRecorder: eventRecorder.record,
      confirmationEmailSender: async (order) => ({
        status: "failed",
        orderId: order.id,
        recipientEmail: order.contact.email,
        message: "El proveedor de email rechazó el envío."
      }),
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
      }
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.paid);
  });
});

function createTestPaymentEventRecorder(): {
  record: PaymentEventRecorder;
  read: () => PaymentEventRecord[];
} {
  const events: PaymentEventRecord[] = [];

  return {
    record: async (
      event: PaymentEventRecord
    ): Promise<RecordPaymentEventOnceResult> => {
      const existingEvent = events.find(
        (candidateEvent) =>
          candidateEvent.provider === event.provider &&
          candidateEvent.providerEventId === event.providerEventId
      );

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
    },
    read: () => events.map(clonePaymentEvent)
  };
}

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

function createOrderRepository(order: Order | null): TestOrderRepository {
  let currentOrder = order ? cloneOrder(order) : null;

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
    getOrder(): Order | null {
      return currentOrder ? cloneOrder(currentOrder) : null;
    }
  };
}

type TestOrderRepository = PaymentReconciliationOrderRepository & {
  transitionCount: number;
  lastUpdate: {
    orderId: string;
    status: OrderStatus;
    reason?: string;
    actor?: string;
  } | null;
  getOrder: () => Order | null;
};

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
