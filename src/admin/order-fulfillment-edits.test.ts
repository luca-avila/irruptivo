import { describe, expect, it } from "vitest";

import { DELIVERY_METHOD, ORDER_STATUS, type OrderStatus } from "../domain/rules";
import { type Order } from "../orders/order-creation";
import {
  canEditOrderField,
  updateOrderFulfillmentFields
} from "./order-fulfillment-edits";

const now = "2026-05-30T12:00:00.000Z";

describe("admin order fulfillment edits", () => {
  it("allows contact field edits after payment", () => {
    const repository = createOrderRepository([
      getOrder({ status: ORDER_STATUS.paid })
    ]);

    const result = updateOrderFulfillmentFields(
      {
        orderId: "order-001",
        fields: {
          "contact.fullName": "  Nina  Irruptivo ",
          "contact.email": " NINA@EXAMPLE.COM ",
          "contact.phone": " 11   4444  4444 "
        }
      },
      { orderRepository: repository }
    );

    expect(result).toMatchObject({
      ok: true,
      order: {
        contact: {
          fullName: "Nina Irruptivo",
          email: "nina@example.com",
          phone: "11 4444 4444"
        }
      }
    });
  });

  it("allows shipping address and delivery notes only for shipping orders", () => {
    const shippingOrder = getOrder({
      status: ORDER_STATUS.preparing,
      deliveryMethod: DELIVERY_METHOD.shipping
    });
    const pickupOrder = getOrder({
      status: ORDER_STATUS.preparing,
      deliveryMethod: DELIVERY_METHOD.pickup
    });
    const repository = createOrderRepository([shippingOrder]);

    expect(canEditOrderField("delivery.shippingAddress.addressLine", shippingOrder))
      .toBe(true);
    expect(canEditOrderField("delivery.shippingAddress.addressLine", pickupOrder))
      .toBe(false);

    const result = updateOrderFulfillmentFields(
      {
        orderId: "order-001",
        fields: {
          "delivery.shippingAddress.addressLine": " Av. Corrientes 1234 ",
          "delivery.shippingAddress.city": " CABA ",
          "delivery.shippingAddress.province": " Buenos Aires ",
          "delivery.shippingAddress.postalCode": " C1043 ",
          "delivery.notes": " Dejar en recepción "
        }
      },
      { orderRepository: repository }
    );

    expect(result).toMatchObject({
      ok: true,
      order: {
        delivery: {
          shippingAddress: {
            addressLine: "Av. Corrientes 1234",
            city: "CABA",
            province: "Buenos Aires",
            postalCode: "C1043"
          },
          notes: "Dejar en recepción"
        }
      }
    });
  });

  it("allows pickup coordination notes for pickup orders", () => {
    const repository = createOrderRepository([
      getOrder({
        status: ORDER_STATUS.readyForPickup,
        deliveryMethod: DELIVERY_METHOD.pickup
      })
    ]);

    const result = updateOrderFulfillmentFields(
      {
        orderId: "order-001",
        fields: {
          "delivery.notes": " Retira el martes por la tarde "
        }
      },
      { orderRepository: repository }
    );

    expect(result).toMatchObject({
      ok: true,
      order: {
        delivery: {
          notes: "Retira el martes por la tarde"
        }
      }
    });
  });

  it("allows internal admin notes to be added or updated", () => {
    const repository = createOrderRepository([
      getOrder({ status: ORDER_STATUS.shipped, adminNotes: "Avisar al entregar" })
    ]);

    const result = updateOrderFulfillmentFields(
      {
        orderId: "order-001",
        fields: {
          adminNotes: "Cliente pidió seguimiento por WhatsApp."
        }
      },
      { orderRepository: repository }
    );

    expect(result).toMatchObject({
      ok: true,
      order: {
        adminNotes: "Cliente pidió seguimiento por WhatsApp."
      }
    });
  });

  it("rejects item, quantity, price, total, payment, and status edits", () => {
    const order = getOrder({ status: ORDER_STATUS.paid });
    const immutableFields = [
      "items",
      "items.0.quantity",
      "items.0.unitPriceArs",
      "items.0.lineTotalArs",
      "subtotalArs",
      "deliveryCostArs",
      "totalArs",
      "paymentPreference",
      "paymentPreference.preferenceId",
      "status"
    ];

    for (const field of immutableFields) {
      expect(canEditOrderField(field, order)).toBe(false);
    }
  });

  it("rejects invalid updates without partially mutating the order", () => {
    const order = getOrder({
      status: ORDER_STATUS.paid,
      adminNotes: "Nota original"
    });
    const repository = createOrderRepository([order]);
    const before = repository.findOrderById("order-001");

    const result = updateOrderFulfillmentFields(
      {
        orderId: "order-001",
        fields: {
          "contact.fullName": "Nombre permitido",
          totalArs: "1"
        }
      },
      { orderRepository: repository }
    );

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "immutable_field",
        field: "totalArs"
      }
    });
    expect(repository.findOrderById("order-001")).toEqual(before);
  });
});

function createOrderRepository(orders: readonly Order[]) {
  let storedOrders = orders.map(cloneOrder);

  return {
    findOrderById: (orderId: string) =>
      cloneOrder(storedOrders.find((order) => order.id === orderId) ?? null),
    updateOrder: (order: Order) => {
      const orderIndex = storedOrders.findIndex(
        (storedOrder) => storedOrder.id === order.id
      );

      if (orderIndex === -1) {
        return null;
      }

      storedOrders = storedOrders.map((storedOrder, index) =>
        index === orderIndex ? cloneOrder(order) : storedOrder
      );

      return cloneOrder(order);
    }
  };
}

function getOrder({
  status,
  deliveryMethod = DELIVERY_METHOD.shipping,
  adminNotes = null
}: {
  status: OrderStatus;
  deliveryMethod?: typeof DELIVERY_METHOD.shipping | typeof DELIVERY_METHOD.pickup;
  adminNotes?: string | null;
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
      notes: "Tocar timbre"
    },
    adminNotes,
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

function cloneOrder<T extends Order | null>(order: T): T {
  if (!order) {
    return order;
  }

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
  } as T;
}
