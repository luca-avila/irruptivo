import { describe, expect, it, vi } from "vitest";

import { DELIVERY_METHOD, ORDER_STATUS, type OrderStatus } from "../domain/rules";
import { type Order } from "../orders/order-creation";
import {
  ADMIN_FULFILLMENT_TRANSITION_ACTION,
  getAllowedAdminTransitions,
  transitionOrderFulfillmentStatus
} from "./order-transitions";

const now = "2026-05-30T12:00:00.000Z";

describe("admin fulfillment transitions", () => {
  it("moves shipping orders through the valid path in order", async () => {
    const repository = createOrderRepository(
      getOrder({ deliveryMethod: DELIVERY_METHOD.shipping, status: ORDER_STATUS.paid })
    );

    expect(
      getAllowedAdminTransitions(repository.getOrder()).map((action) => action.label)
    ).toEqual(["Marcar en preparación"]);

    expect(
      await transitionOrderFulfillmentStatus(
        {
          orderId: "order-001",
          actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.prepare
        },
        { orderRepository: repository }
      )
    ).toMatchObject({ ok: true, order: { status: ORDER_STATUS.preparing } });
    expect(
      await transitionOrderFulfillmentStatus(
        {
          orderId: "order-001",
          actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.markShipped
        },
        { orderRepository: repository }
      )
    ).toMatchObject({ ok: true, order: { status: ORDER_STATUS.shipped } });
    expect(
      await transitionOrderFulfillmentStatus(
        {
          orderId: "order-001",
          actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.markDelivered
        },
        { orderRepository: repository }
      )
    ).toMatchObject({ ok: true, order: { status: ORDER_STATUS.delivered } });
    expect(repository.transitionCount).toBe(3);
    expect(repository.lastUpdate).toMatchObject({
      reason: "admin_transition",
      actor: "admin"
    });
  });

  it("sends a fulfillment update email after shipping transitions", async () => {
    const repository = createOrderRepository(
      getOrder({
        deliveryMethod: DELIVERY_METHOD.shipping,
        status: ORDER_STATUS.preparing
      })
    );
    const emailSender = vi.fn(async () => ({
      status: "sent" as const,
      orderId: "order-001",
      recipientEmail: "luca@example.com",
      providerMessageId: "message-shipped"
    }));

    const result = await transitionOrderFulfillmentStatus(
      {
        orderId: "order-001",
        actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.markShipped
      },
      {
        orderRepository: repository,
        fulfillmentUpdateEmailSender: emailSender
      }
    );

    expect(result).toMatchObject({
      ok: true,
      order: { status: ORDER_STATUS.shipped }
    });
    expect(emailSender).toHaveBeenCalledTimes(1);
    expect(emailSender).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "order-001",
        status: ORDER_STATUS.shipped
      })
    );
  });

  it("moves pickup orders through the valid path in order", async () => {
    const repository = createOrderRepository(
      getOrder({ deliveryMethod: DELIVERY_METHOD.pickup, status: ORDER_STATUS.paid })
    );

    expect(
      await transitionOrderFulfillmentStatus(
        {
          orderId: "order-001",
          actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.prepare
        },
        { orderRepository: repository }
      )
    ).toMatchObject({ ok: true, order: { status: ORDER_STATUS.preparing } });
    expect(
      await transitionOrderFulfillmentStatus(
        {
          orderId: "order-001",
          actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.markReadyForPickup
        },
        { orderRepository: repository }
      )
    ).toMatchObject({
      ok: true,
      order: { status: ORDER_STATUS.readyForPickup }
    });
    expect(
      await transitionOrderFulfillmentStatus(
        {
          orderId: "order-001",
          actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.markPickedUp
        },
        { orderRepository: repository }
      )
    ).toMatchObject({ ok: true, order: { status: ORDER_STATUS.pickedUp } });
    expect(repository.transitionCount).toBe(3);
  });

  it("sends a fulfillment update email after ready-for-pickup transitions", async () => {
    const repository = createOrderRepository(
      getOrder({
        deliveryMethod: DELIVERY_METHOD.pickup,
        status: ORDER_STATUS.preparing
      })
    );
    const emailSender = vi.fn(async () => ({
      status: "sent" as const,
      orderId: "order-001",
      recipientEmail: "luca@example.com",
      providerMessageId: "message-pickup"
    }));

    const result = await transitionOrderFulfillmentStatus(
      {
        orderId: "order-001",
        actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.markReadyForPickup
      },
      {
        orderRepository: repository,
        fulfillmentUpdateEmailSender: emailSender
      }
    );

    expect(result).toMatchObject({
      ok: true,
      order: { status: ORDER_STATUS.readyForPickup }
    });
    expect(emailSender).toHaveBeenCalledTimes(1);
    expect(emailSender).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "order-001",
        status: ORDER_STATUS.readyForPickup
      })
    );
  });

  it("does not send fulfillment update emails for non-notifiable transitions", async () => {
    const repository = createOrderRepository(
      getOrder({ deliveryMethod: DELIVERY_METHOD.shipping, status: ORDER_STATUS.paid })
    );
    const emailSender = vi.fn(async () => ({
      status: "sent" as const,
      orderId: "order-001",
      recipientEmail: "luca@example.com",
      providerMessageId: "message-preparing"
    }));

    const result = await transitionOrderFulfillmentStatus(
      {
        orderId: "order-001",
        actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.prepare
      },
      {
        orderRepository: repository,
        fulfillmentUpdateEmailSender: emailSender
      }
    );

    expect(result).toMatchObject({
      ok: true,
      order: { status: ORDER_STATUS.preparing }
    });
    expect(emailSender).not.toHaveBeenCalled();
  });

  it("keeps the transition successful when the fulfillment email fails", async () => {
    const failedEmailRepository = createOrderRepository(
      getOrder({
        deliveryMethod: DELIVERY_METHOD.shipping,
        status: ORDER_STATUS.preparing
      })
    );
    const thrownEmailRepository = createOrderRepository(
      getOrder({
        deliveryMethod: DELIVERY_METHOD.pickup,
        status: ORDER_STATUS.preparing
      })
    );

    await expect(
      transitionOrderFulfillmentStatus(
        {
          orderId: "order-001",
          actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.markShipped
        },
        {
          orderRepository: failedEmailRepository,
          fulfillmentUpdateEmailSender: async () => ({
            status: "failed",
            orderId: "order-001",
            recipientEmail: "luca@example.com",
            message: "No pudimos enviar el email transaccional."
          })
        }
      )
    ).resolves.toMatchObject({
      ok: true,
      order: { status: ORDER_STATUS.shipped }
    });

    await expect(
      transitionOrderFulfillmentStatus(
        {
          orderId: "order-001",
          actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.markReadyForPickup
        },
        {
          orderRepository: thrownEmailRepository,
          fulfillmentUpdateEmailSender: async () => {
            throw new Error("provider unavailable");
          }
        }
      )
    ).resolves.toMatchObject({
      ok: true,
      order: { status: ORDER_STATUS.readyForPickup }
    });
  });

  it("rejects skipped, backward, and cross delivery-method transitions", async () => {
    expect(
      await transitionOrderFulfillmentStatus(
        {
          orderId: "order-001",
          actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.markShipped
        },
        {
          orderRepository: createOrderRepository(
            getOrder({
              deliveryMethod: DELIVERY_METHOD.shipping,
              status: ORDER_STATUS.paid
            })
          )
        }
      )
    ).toMatchObject({
      ok: false,
      error: { code: "invalid_transition" }
    });

    expect(
      await transitionOrderFulfillmentStatus(
        {
          orderId: "order-001",
          actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.prepare
        },
        {
          orderRepository: createOrderRepository(
            getOrder({
              deliveryMethod: DELIVERY_METHOD.shipping,
              status: ORDER_STATUS.shipped
            })
          )
        }
      )
    ).toMatchObject({
      ok: false,
      error: { code: "invalid_transition" }
    });

    expect(
      await transitionOrderFulfillmentStatus(
        {
          orderId: "order-001",
          actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.markReadyForPickup
        },
        {
          orderRepository: createOrderRepository(
            getOrder({
              deliveryMethod: DELIVERY_METHOD.shipping,
              status: ORDER_STATUS.preparing
            })
          )
        }
      )
    ).toMatchObject({
      ok: false,
      error: { code: "invalid_transition" }
    });

    expect(
      await transitionOrderFulfillmentStatus(
        {
          orderId: "order-001",
          actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.markShipped
        },
        {
          orderRepository: createOrderRepository(
            getOrder({
              deliveryMethod: DELIVERY_METHOD.pickup,
              status: ORDER_STATUS.preparing
            })
          )
        }
      )
    ).toMatchObject({
      ok: false,
      error: { code: "invalid_transition" }
    });
  });

  it.each([
    ORDER_STATUS.pendingPayment,
    ORDER_STATUS.paymentFailed,
    ORDER_STATUS.expired
  ])(
    "blocks admin movement from payment-controlled status %s",
    async (status) => {
      const repository = createOrderRepository(getOrder({ status }));

      expect(
        await transitionOrderFulfillmentStatus(
          {
            orderId: "order-001",
            actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.prepare
          },
          { orderRepository: repository }
        )
      ).toMatchObject({
        ok: false,
        error: { code: "payment_status_locked" }
      });
      expect(repository.transitionCount).toBe(0);
    }
  );

  it.each([ORDER_STATUS.delivered, ORDER_STATUS.pickedUp])(
    "has no forward MVP action for terminal status %s",
    async (status) => {
      const order = getOrder({ status });
      const repository = createOrderRepository(order);

      expect(getAllowedAdminTransitions(order)).toEqual([]);
      expect(
        await transitionOrderFulfillmentStatus(
          {
            orderId: "order-001",
            actionId: ADMIN_FULFILLMENT_TRANSITION_ACTION.prepare
          },
          { orderRepository: repository }
        )
      ).toMatchObject({
        ok: false,
        error: { code: "terminal_status" }
      });
      expect(repository.transitionCount).toBe(0);
    }
  );

  it("rejects unsupported actions without mutating the order", async () => {
    const repository = createOrderRepository(getOrder({ status: ORDER_STATUS.paid }));

    expect(
      await transitionOrderFulfillmentStatus(
        {
          orderId: "order-001",
          actionId: "paid"
        },
        { orderRepository: repository }
      )
    ).toMatchObject({
      ok: false,
      error: { code: "invalid_action" }
    });
    expect(repository.getOrder().status).toBe(ORDER_STATUS.paid);
    expect(repository.transitionCount).toBe(0);
  });
});

function createOrderRepository(initialOrder: Order) {
  let order = cloneOrder(initialOrder);
  let transitionCount = 0;
  let lastUpdate:
    | {
        orderId: string;
        status: OrderStatus;
        reason?: string;
        actor?: string;
      }
    | null = null;

  return {
    async findOrderById(orderId: string) {
      return order.id === orderId ? cloneOrder(order) : null;
    },
    async updateOrderStatus(input: {
      orderId: string;
      status: OrderStatus;
      reason?: string;
      actor?: string;
    }) {
      lastUpdate = input;

      if (order.id !== input.orderId) {
        return null;
      }

      transitionCount += 1;
      order = cloneOrder({
        ...order,
        status: input.status
      });

      return cloneOrder(order);
    },
    getOrder: () => cloneOrder(order),
    get transitionCount() {
      return transitionCount;
    },
    get lastUpdate() {
      return lastUpdate;
    }
  };
}

function getOrder({
  status,
  deliveryMethod = DELIVERY_METHOD.shipping
}: {
  status: OrderStatus;
  deliveryMethod?: typeof DELIVERY_METHOD.shipping | typeof DELIVERY_METHOD.pickup;
}): Order {
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
      method: deliveryMethod,
      methodLabel:
        deliveryMethod === DELIVERY_METHOD.shipping
          ? "Envío a domicilio"
          : "Retiro local",
      shippingAddress:
        deliveryMethod === DELIVERY_METHOD.shipping
          ? {
              addressLine: "Av. Siempre Viva 742",
              city: "Benavidez",
              province: "Buenos Aires",
              postalCode: "1621"
            }
          : null,
      notes: null
    },
    adminNotes: null,
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
      }
    ],
    subtotalArs: 52000,
    deliveryCostArs: deliveryMethod === DELIVERY_METHOD.shipping ? 5000 : 0,
    totalArs: deliveryMethod === DELIVERY_METHOD.shipping ? 57000 : 52000,
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
