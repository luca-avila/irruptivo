import { beforeEach, describe, expect, it } from "vitest";

import { DELIVERY_METHOD, ORDER_STATUS, type OrderStatus } from "../domain/rules";
import { type Order } from "../orders/order-creation";
import {
  readOrderConfirmationEmailDeliveriesForTests,
  resetOrderConfirmationEmailDeliveriesForTests,
  sendOrderConfirmationOnce
} from "./order-confirmation-email";
import { type EmailMessage } from "./email-provider";

const now = "2026-05-30T12:00:00.000Z";

describe("order confirmation email notification", () => {
  beforeEach(() => {
    resetOrderConfirmationEmailDeliveriesForTests();
  });

  it("does not trigger email for unpaid orders", async () => {
    let providerCalled = false;

    const result = await sendOrderConfirmationOnce(
      getOrder(ORDER_STATUS.pendingPayment),
      {
        emailProvider: async () => {
          providerCalled = true;
          return {
            status: "sent",
            provider: "test",
            messageId: "message-001"
          };
        },
        appUrl: "https://irruptivo.test",
        whatsappUrl: "https://wa.me/5491111111111",
        now
      }
    );

    expect(result).toEqual({
      status: "skipped",
      reason: "order_not_paid",
      orderId: "order-001"
    });
    expect(providerCalled).toBe(false);
    expect(readOrderConfirmationEmailDeliveriesForTests()).toEqual([]);
  });

  it("sends a Spanish confirmation email with order, fulfillment, contact, and guest status details", async () => {
    const sentMessages: EmailMessage[] = [];

    const result = await sendOrderConfirmationOnce(getOrder(ORDER_STATUS.paid), {
      emailProvider: async (message) => {
        sentMessages.push(message);

        return {
          status: "sent",
          provider: "test",
          messageId: "message-001"
        };
      },
      appUrl: "https://irruptivo.test",
      whatsappUrl: "https://wa.me/5491111111111",
      now
    });

    expect(result).toEqual({
      status: "sent",
      orderId: "order-001",
      recipientEmail: "luca@example.com",
      providerMessageId: "message-001"
    });
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]).toMatchObject({
      to: {
        email: "luca@example.com",
        name: "Luca Irruptivo"
      },
      subject: "Confirmación de compra IRR-000001 - Irruptivo"
    });
    expect(sentMessages[0].text).toContain("IRR-000001");
    expect(sentMessages[0].text).toContain("86.900");
    expect(sentMessages[0].text).toContain(
      "Envío a domicilio: Av. Siempre Viva 742, Benavidez, Buenos Aires (1621)."
    );
    expect(sentMessages[0].text).toContain("coordinar el envío");
    expect(sentMessages[0].text).toContain("https://wa.me/5491111111111");
    expect(sentMessages[0].text).toContain(
      "https://irruptivo.test/pedido/guest-access-token"
    );
    expect(sentMessages[0].text).not.toContain("pending_payment");
    expect(sentMessages[0].text).not.toContain("paid");
    expect(sentMessages[0].text).not.toContain("shipping");
  });

  it("does not send duplicate confirmation emails for the same paid order", async () => {
    const sentMessages: EmailMessage[] = [];
    const order = getOrder(ORDER_STATUS.paid);

    await sendOrderConfirmationOnce(order, {
      emailProvider: async (message) => {
        sentMessages.push(message);

        return {
          status: "sent",
          provider: "test",
          messageId: "message-001"
        };
      },
      appUrl: "https://irruptivo.test",
      now
    });
    const duplicateResult = await sendOrderConfirmationOnce(order, {
      emailProvider: async (message) => {
        sentMessages.push(message);

        return {
          status: "sent",
          provider: "test",
          messageId: "message-duplicate"
        };
      },
      appUrl: "https://irruptivo.test",
      now
    });

    expect(duplicateResult).toEqual({
      status: "duplicate",
      orderId: "order-001",
      recipientEmail: "luca@example.com",
      previousStatus: "sent"
    });
    expect(sentMessages).toHaveLength(1);
    expect(readOrderConfirmationEmailDeliveriesForTests()).toHaveLength(1);
  });

  it("records provider failures without pretending the email was sent", async () => {
    const result = await sendOrderConfirmationOnce(getOrder(ORDER_STATUS.paid), {
      emailProvider: async () => ({
        status: "failed",
        provider: "test",
        message: "El proveedor de email rechazó el envío."
      }),
      appUrl: "https://irruptivo.test",
      now
    });

    expect(result).toEqual({
      status: "failed",
      orderId: "order-001",
      recipientEmail: "luca@example.com",
      message: "El proveedor de email rechazó el envío."
    });
    expect(readOrderConfirmationEmailDeliveriesForTests()).toMatchObject([
      {
        orderId: "order-001",
        status: "failed",
        recipientEmail: "luca@example.com"
      }
    ]);
  });
});

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
