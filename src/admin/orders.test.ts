import { beforeEach, describe, expect, it } from "vitest";

import { DELIVERY_METHOD, ORDER_STATUS, type OrderStatus } from "../domain/rules";
import { type Order } from "../orders/order-creation";
import {
  recordPaymentEventOnce,
  resetPaymentEventsForTests
} from "../payments/payment-events";
import { getAdminOrderDetail, listAdminOrders } from "./orders";

const now = "2026-05-30T12:00:00.000Z";

describe("admin order projection", () => {
  beforeEach(() => {
    resetPaymentEventsForTests();
  });

  it("shows only actionable fulfillment statuses in the default queue", async () => {
    const orders = [
      getOrder({ status: ORDER_STATUS.pendingPayment, orderNumber: "IRR-PENDING" }),
      getOrder({
        status: ORDER_STATUS.paid,
        orderNumber: "IRR-PAID",
        createdAt: "2026-05-30T12:01:00.000Z"
      }),
      getOrder({
        status: ORDER_STATUS.preparing,
        orderNumber: "IRR-PREPARING",
        createdAt: "2026-05-30T12:02:00.000Z"
      }),
      getOrder({
        status: ORDER_STATUS.readyForPickup,
        orderNumber: "IRR-READY",
        createdAt: "2026-05-30T12:03:00.000Z"
      }),
      getOrder({
        status: ORDER_STATUS.shipped,
        orderNumber: "IRR-SHIPPED",
        createdAt: "2026-05-30T12:04:00.000Z"
      }),
      getOrder({ status: ORDER_STATUS.expired, orderNumber: "IRR-EXPIRED" }),
      getOrder({ status: ORDER_STATUS.delivered, orderNumber: "IRR-DELIVERED" })
    ];

    const view = await listAdminOrders(
      {},
      { orderRepository: createOrderRepository(orders) }
    );

    expect(view.activeFilterLabel).toBe("Cola activa");
    expect(view.orders.map((order) => order.orderNumber)).toEqual([
      "IRR-SHIPPED",
      "IRR-READY",
      "IRR-PREPARING",
      "IRR-PAID"
    ]);
    expect(view.orders[0]).toMatchObject({
      customerName: "Luca Irruptivo",
      statusLabel: "Enviado",
      deliveryMethodLabel: "Envío a domicilio",
      shippingLocationLabel: "Benavidez, Buenos Aires",
      totalLabel: "$ 86.900"
    });
    expect(JSON.stringify(view.orders)).not.toContain(ORDER_STATUS.paid);
    expect(JSON.stringify(view.orders)).not.toContain(ORDER_STATUS.readyForPickup);
  });

  it("exposes history filters for non-actionable statuses without raw status values", async () => {
    const orders = [
      getOrder({ status: ORDER_STATUS.pendingPayment, orderNumber: "IRR-PENDING" }),
      getOrder({ status: ORDER_STATUS.paymentFailed, orderNumber: "IRR-FAILED" }),
      getOrder({ status: ORDER_STATUS.expired, orderNumber: "IRR-EXPIRED" }),
      getOrder({ status: ORDER_STATUS.delivered, orderNumber: "IRR-DELIVERED" }),
      getOrder({ status: ORDER_STATUS.pickedUp, orderNumber: "IRR-PICKED" })
    ];
    const repository = createOrderRepository(orders);
    const view = await listAdminOrders({}, { orderRepository: repository });

    expect(view.filters.map((filter) => filter.label)).toEqual([
      "Cola activa",
      "Pago pendiente",
      "Pago rechazado",
      "Pago vencido",
      "Entregados",
      "Retirados"
    ]);
    expect(JSON.stringify(view.filters)).not.toContain(ORDER_STATUS.pendingPayment);
    expect(JSON.stringify(view.filters)).not.toContain(ORDER_STATUS.paymentFailed);
    expect(JSON.stringify(view.filters)).not.toContain(ORDER_STATUS.pickedUp);

    expect(
      (await listAdminOrders({ filter: "pago-pendiente" }, { orderRepository: repository }))
        .orders
    ).toMatchObject([{ orderNumber: "IRR-PENDING" }]);
    expect(
      (await listAdminOrders({ filter: "pago-rechazado" }, { orderRepository: repository }))
        .orders
    ).toMatchObject([{ orderNumber: "IRR-FAILED" }]);
    expect(
      (await listAdminOrders({ filter: "vencidos" }, { orderRepository: repository }))
        .orders
    ).toMatchObject([{ orderNumber: "IRR-EXPIRED" }]);
    expect(
      (await listAdminOrders({ filter: "entregados" }, { orderRepository: repository }))
        .orders
    ).toMatchObject([{ orderNumber: "IRR-DELIVERED" }]);
    expect(
      (await listAdminOrders({ filter: "retirados" }, { orderRepository: repository }))
        .orders
    ).toMatchObject([{ orderNumber: "IRR-PICKED" }]);
  });

  it("builds order detail from immutable item snapshots", async () => {
    const order = getOrder({
      status: ORDER_STATUS.paid,
      orderNumber: "IRR-SNAPSHOT",
      items: [
        {
          productId: "historical-product",
          productName: "Nombre guardado",
          productSlug: "slug-guardado",
          productArea: "clothing",
          variantId: "historical-variant",
          variantName: "Negro / S guardado",
          sku: "SKU-GUARDADO",
          options: {
            color: "Negro",
            size: "S"
          },
          optionSummary: "Negro / S",
          quantity: 2,
          unitPriceArs: 26000,
          lineTotalArs: 52000
        }
      ]
    });

    const detail = await getAdminOrderDetail("order-001", {
      orderRepository: createOrderRepository([order])
    });

    expect(detail).toMatchObject({
      orderNumber: "IRR-SNAPSHOT",
      statusLabel: "Pago confirmado",
      fulfillment: {
        actions: [
          {
            id: "preparar",
            label: "Marcar en preparación",
            targetStatusLabel: "En preparación"
          }
        ],
        unavailableReason: null
      },
      items: [
        {
          productName: "Nombre guardado",
          productSlug: "slug-guardado",
          variantName: "Negro / S guardado",
          sku: "SKU-GUARDADO",
          optionSummary: "Negro / S",
          quantityLabel: "2 unidades",
          unitPriceLabel: "$ 26.000",
          lineTotalLabel: "$ 52.000"
        }
      ]
    });
  });

  it("marks financial fields as read-only in the detail view model", async () => {
    const detail = await getAdminOrderDetail("order-001", {
      orderRepository: createOrderRepository([getOrder({ status: ORDER_STATUS.paid })])
    });

    expect(detail?.financial.readOnlyLabel).toBe("Solo lectura");
    expect(detail?.financial.fields).toEqual([
      { label: "Subtotal", value: "$ 81.900", isReadOnly: true },
      { label: "Costo de entrega", value: "$ 5.000", isReadOnly: true },
      { label: "Total pagado", value: "$ 86.900", isReadOnly: true }
    ]);
  });

  it("surfaces late expired-payment manual review without exposing internal states", async () => {
    recordPaymentEventOnce({
      provider: "mercado_pago",
      providerEventId: "event-late-001",
      providerPaymentId: "payment-late-001",
      orderId: "order-001",
      type: "payment",
      action: "payment.updated",
      providerStatus: "approved",
      processingResult: "manual_review_required",
      receivedAt: now
    });

    const detail = await getAdminOrderDetail("order-001", {
      orderRepository: createOrderRepository([
        getOrder({ status: ORDER_STATUS.expired })
      ])
    });

    expect(detail?.manualReview).toMatchObject({
      required: true,
      label: "Revisión manual requerida",
      providerPaymentIds: ["payment-late-001"]
    });
    expect(JSON.stringify(detail)).not.toContain("manual_review_required");
    expect(JSON.stringify(detail)).not.toContain(ORDER_STATUS.expired);
    expect(JSON.stringify(detail)).not.toContain(ORDER_STATUS.pendingPayment);
  });

  it("shows only the valid next fulfillment action for the delivery method", async () => {
    const shippingDetail = await getAdminOrderDetail("order-001", {
      orderRepository: createOrderRepository([
        getOrder({
          deliveryMethod: DELIVERY_METHOD.shipping,
          status: ORDER_STATUS.preparing
        })
      ])
    });
    const pickupDetail = await getAdminOrderDetail("order-001", {
      orderRepository: createOrderRepository([
        getOrder({
          deliveryMethod: DELIVERY_METHOD.pickup,
          status: ORDER_STATUS.preparing
        })
      ])
    });

    expect(shippingDetail?.fulfillment.actions).toEqual([
      {
        id: "registrar-envio",
        label: "Marcar enviado",
        targetStatusLabel: "Enviado",
        description: "Avanza el envío al paso siguiente de cumplimiento."
      }
    ]);
    expect(pickupDetail?.fulfillment.actions).toEqual([
      {
        id: "marcar-listo-retiro",
        label: "Marcar listo para retirar",
        targetStatusLabel: "Listo para retirar",
        description: "Avanza el retiro al paso siguiente de cumplimiento."
      }
    ]);
    expect(JSON.stringify(shippingDetail?.fulfillment)).not.toContain(
      ORDER_STATUS.shipped
    );
    expect(JSON.stringify(pickupDetail?.fulfillment)).not.toContain(
      ORDER_STATUS.readyForPickup
    );
  });

  it("explains when fulfillment has no available admin action", async () => {
    const detail = await getAdminOrderDetail("order-001", {
      orderRepository: createOrderRepository([
        getOrder({ status: ORDER_STATUS.delivered })
      ])
    });

    expect(detail?.fulfillment.actions).toEqual([]);
    expect(detail?.fulfillment.unavailableReason).toBe(
      "Este pedido ya no tiene pasos de cumplimiento disponibles."
    );
  });
});

function createOrderRepository(orders: readonly Order[]) {
  return {
    listOrders: async () => orders.map(cloneOrder),
    findOrderById: async (orderId: string) =>
      orders.find((order) => order.id === orderId) ?? null
  };
}

function getOrder({
  status,
  orderNumber = "IRR-000001",
  createdAt = now,
  deliveryMethod = DELIVERY_METHOD.shipping,
  items
}: {
  status: OrderStatus;
  orderNumber?: string;
  createdAt?: string;
  deliveryMethod?: typeof DELIVERY_METHOD.shipping | typeof DELIVERY_METHOD.pickup;
  items?: Order["items"];
}): Order {
  return {
    id: "order-001",
    orderNumber,
    status,
    createdAt,
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
      notes: "Tocar timbre"
    },
    items:
      items ??
      [
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
    subtotalArs: items ? 52000 : 81900,
    deliveryCostArs: deliveryMethod === DELIVERY_METHOD.shipping ? 5000 : 0,
    totalArs: deliveryMethod === DELIVERY_METHOD.shipping ? 86900 : 81900,
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
