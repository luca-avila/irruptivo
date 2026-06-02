import { describe, expect, it } from "vitest";

import { DELIVERY_METHOD, ORDER_STATUS, type OrderStatus } from "../domain/rules";
import { type Order } from "./order-creation";
import { expirePendingPaymentOrders } from "./order-expiration";

const createdAt = "2026-05-30T12:00:00.000Z";

describe("pending payment expiration", () => {
  it("keeps a pending order active before the 30 minute payment window ends", async () => {
    const repository = createOrderRepository([getOrder(ORDER_STATUS.pendingPayment)]);

    const result = await expirePendingPaymentOrders({
      now: "2026-05-30T12:29:59.999Z",
      orderRepository: repository
    });

    expect(result).toEqual({
      expiredOrders: [],
      checkedOrderCount: 1,
      expiredOrderCount: 0
    });
    expect(await repository.listOrders()).toMatchObject([
      {
        id: "order-001",
        status: ORDER_STATUS.pendingPayment
      }
    ]);
  });

  it("expires a pending order at the 30 minute threshold", async () => {
    const repository = createOrderRepository([getOrder(ORDER_STATUS.pendingPayment)]);

    const result = await expirePendingPaymentOrders({
      now: "2026-05-30T12:30:00.000Z",
      orderRepository: repository
    });

    expect(result).toEqual({
      expiredOrders: [
        {
          orderId: "order-001",
          orderNumber: "IRR-000001",
          expiredAt: "2026-05-30T12:30:00.000Z"
        }
      ],
      checkedOrderCount: 1,
      expiredOrderCount: 1
    });
    expect(await repository.listOrders()).toMatchObject([
      {
        id: "order-001",
        status: ORDER_STATUS.expired
      }
    ]);
    expect(repository.lastUpdate).toMatchObject({
      reason: "expired"
    });
  });

  it("is safe to run repeatedly without expiring the same order more than once", async () => {
    const repository = createOrderRepository([getOrder(ORDER_STATUS.pendingPayment)]);

    const firstResult = await expirePendingPaymentOrders({
      now: "2026-05-30T12:31:00.000Z",
      orderRepository: repository
    });
    const secondResult = await expirePendingPaymentOrders({
      now: "2026-05-30T12:32:00.000Z",
      orderRepository: repository
    });

    expect(firstResult.expiredOrderCount).toBe(1);
    expect(secondResult).toEqual({
      expiredOrders: [],
      checkedOrderCount: 1,
      expiredOrderCount: 0
    });
    expect(await repository.listOrders()).toMatchObject([
      {
        id: "order-001",
        status: ORDER_STATUS.expired
      }
    ]);
  });
});

function createOrderRepository(orders: readonly Order[]) {
  let storedOrders = orders.map(cloneOrder);
  let lastUpdate:
    | {
        orderId: string;
        status: OrderStatus;
        reason?: string;
        actor?: string;
      }
    | null = null;

  return {
    async listOrders() {
      return storedOrders.map(cloneOrder);
    },
    async updateOrderStatus(input: {
      orderId: string;
      status: OrderStatus;
      reason?: string;
      actor?: string;
    }) {
      lastUpdate = input;
      const orderIndex = storedOrders.findIndex(
        (order) => order.id === input.orderId
      );

      if (orderIndex === -1) {
        return null;
      }

      storedOrders = storedOrders.map((order, index) =>
        index === orderIndex ? cloneOrder({ ...order, status: input.status }) : order
      );

      return cloneOrder(storedOrders[orderIndex]);
    },
    get lastUpdate() {
      return lastUpdate;
    }
  };
}

function getOrder(status: OrderStatus): Order {
  return {
    id: "order-001",
    orderNumber: "IRR-000001",
    status,
    createdAt,
    guestAccessToken: "guest-token-001",
    contact: {
      fullName: "Luca Irruptivo",
      email: "luca@example.com",
      phone: "11 5555 5555"
    },
    delivery: {
      method: DELIVERY_METHOD.pickup,
      methodLabel: "Retiro local",
      shippingAddress: null,
      notes: null
    },
    adminNotes: null,
    items: [],
    subtotalArs: 52000,
    deliveryCostArs: 0,
    totalArs: 52000,
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
