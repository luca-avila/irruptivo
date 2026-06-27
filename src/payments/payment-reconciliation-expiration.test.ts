import { describe, expect, it } from "vitest";

import { DELIVERY_METHOD, ORDER_STATUS, type OrderStatus } from "../domain/rules";
import { type Order } from "../orders/order-creation";
import {
  buildPaymentManualReviewState,
  type PaymentEventRecord,
  type RecordPaymentEventOnceResult
} from "./payment-events";
import {
  reconcileMercadoPagoEvent,
  type ApprovedPaymentSettlementResult,
  type MercadoPagoPayment,
  type PaymentReconciliationRepository
} from "./payment-reconciliation";

const createdAt = "2026-05-30T12:00:00.000Z";

describe("Mercado Pago reconciliation with pending-payment expiration", () => {
  it("keeps an already expired order out of automatic fulfillment after a late success", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.expired));

    const result = await reconcileMercadoPagoEvent(getNotification(), {
      paymentProvider: async () => getPayment({ status: "approved" }),
      repository,
      now: createdAt
    });

    expect(result).toEqual({
      status: "manual_review_required",
      orderId: "order-001",
      providerPaymentId: "payment-001",
      orderStatus: ORDER_STATUS.expired
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.expired);
    expect(
      buildPaymentManualReviewState("order-001", repository.readEvents())
    ).toMatchObject({
      required: true,
      label: "Revisión manual requerida",
      providerPaymentIds: ["payment-001"],
      latestEventAt: createdAt
    });
  });

  it("expires a still-pending order before a late success can enter fulfillment", async () => {
    const repository = createOrderRepository(getOrder(ORDER_STATUS.pendingPayment));

    const result = await reconcileMercadoPagoEvent(getNotification(), {
      paymentProvider: async () => getPayment({ status: "approved" }),
      repository,
      now: "2026-05-30T12:31:00.000Z"
    });

    expect(result).toEqual({
      status: "manual_review_required",
      orderId: "order-001",
      providerPaymentId: "payment-001",
      orderStatus: ORDER_STATUS.expired
    });
    expect(repository.getOrder()?.status).toBe(ORDER_STATUS.expired);
    expect(repository.transitionCount).toBe(1);
    expect(
      buildPaymentManualReviewState("order-001", repository.readEvents())
    ).toMatchObject({
      required: true,
      label: "Revisión manual requerida",
      providerPaymentIds: ["payment-001"]
    });
  });
});

function clonePaymentEvent(event: PaymentEventRecord): PaymentEventRecord {
  return {
    ...event
  };
}

function getNotification() {
  return {
    id: "event-001",
    liveMode: false,
    type: "payment",
    action: "payment.updated",
    dataId: "payment-001",
    dateCreated: createdAt
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

function createOrderRepository(order: Order | null): TestOrderRepository {
  let currentOrder = order ? cloneOrder(order) : null;
  let transitionCount = 0;
  const events: PaymentEventRecord[] = [];
  const findStoredPaymentEvent = ({
    providerEventId
  }: {
    providerEventId: string;
  }): PaymentEventRecord | null =>
    events.find(
      (candidateEvent) => candidateEvent.providerEventId === providerEventId
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
    get transitionCount() {
      return transitionCount;
    },
    async findOrderById(orderId: string): Promise<Order | null> {
      return currentOrder?.id === orderId ? cloneOrder(currentOrder) : null;
    },
    async updateOrderStatus({
      orderId,
      status
    }: {
      orderId: string;
      status: OrderStatus;
      reason?: string;
      actor?: string;
    }): Promise<Order | null> {
      if (!currentOrder || currentOrder.id !== orderId) {
        return null;
      }

      transitionCount += 1;
      currentOrder = {
        ...currentOrder,
        status
      };

      return cloneOrder(currentOrder);
    },
    recordPaymentEvent,
    async markOrderPaidAndDecrementStock(): Promise<ApprovedPaymentSettlementResult> {
      throw new Error(
        "markOrderPaidAndDecrementStock should not run in expiration tests"
      );
    },
    getOrder(): Order | null {
      return currentOrder ? cloneOrder(currentOrder) : null;
    },
    readEvents(): PaymentEventRecord[] {
      return events.map(clonePaymentEvent);
    }
  };
}

type TestOrderRepository = PaymentReconciliationRepository & {
  readonly transitionCount: number;
  getOrder: () => Order | null;
  readEvents: () => PaymentEventRecord[];
};

function getOrder(status: OrderStatus): Order {
  return {
    id: "order-001",
    orderNumber: "IRR-000001",
    status,
    createdAt,
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
