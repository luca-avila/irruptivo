import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  type TestContext
} from "vitest";

import { prisma } from "../db/client";
import { DELIVERY_METHOD, ORDER_STATUS, type OrderStatus } from "../domain/rules";
import { type Order } from "../orders/order-creation";
import { type EmailMessage } from "./email-provider";
import {
  buildFulfillmentUpdateEmailMessage,
  sendFulfillmentUpdateOnce
} from "./fulfillment-update-email";
import {
  getGuestStatusUrl,
  EMAIL_DELIVERY_RESEND_RECLAIM_AFTER_MS,
  claimOrderEmailDelivery,
  readOrderConfirmationEmailDeliveriesForTests,
  resetOrderConfirmationEmailDeliveriesForTests
} from "./order-confirmation-email";

const now = "2026-05-30T12:00:00.000Z";
let databaseAvailable = false;

describe("fulfillment update email content", () => {
  it("builds a Spanish shipped email with delivery and guest status details", () => {
    const message = buildFulfillmentUpdateEmailMessage({
      order: getOrder({
        status: ORDER_STATUS.shipped,
        deliveryMethod: DELIVERY_METHOD.shipping
      }),
      guestStatusUrl: getGuestStatusUrl(
        "/pedido/guest-access-token",
        "https://irruptivo.test"
      ),
      whatsappUrl: "https://wa.me/5491111111111"
    });

    expect(message).toMatchObject({
      to: {
        email: "luca@example.com",
        name: "Luca Irruptivo"
      },
      subject: "Tu pedido IRR-000001 ya está en camino - Irruptivo"
    });
    expect(message.text).toContain("Despachamos tu pedido");
    expect(message.text).toContain("enviado");
    expect(message.text).toContain(
      "Envío a domicilio: Av. Siempre Viva 742, Benavidez, Buenos Aires (1621)."
    );
    expect(message.text).toContain(
      "https://irruptivo.test/pedido/guest-access-token"
    );
    expect(message.text).toContain("https://wa.me/5491111111111");
    expect(message.text).not.toContain("shipped");
    expect(message.text).not.toContain("shipping");
  });

  it("builds a Spanish ready-for-pickup email without leaking raw enum values", () => {
    const message = buildFulfillmentUpdateEmailMessage({
      order: getOrder({
        status: ORDER_STATUS.readyForPickup,
        deliveryMethod: DELIVERY_METHOD.pickup
      }),
      guestStatusUrl: "/pedido/guest-access-token",
      whatsappUrl: "https://wa.me/5491111111111"
    });

    expect(message).toMatchObject({
      to: {
        email: "luca@example.com",
        name: "Luca Irruptivo"
      },
      subject: "Tu pedido IRR-000001 está listo para retirar - Irruptivo"
    });
    expect(message.text).toContain("listo para retirar");
    expect(message.text).toContain("punto y horario de retiro");
    expect(message.text).toContain("/pedido/guest-access-token");
    expect(message.text).toContain("https://wa.me/5491111111111");
    expect(message.text).not.toContain("ready_for_pickup");
    expect(message.text).not.toContain("pickup");
  });

  it("skips non-notifiable statuses and orders without guest status link", async () => {
    let providerCalled = false;

    const nonNotifiableResult = await sendFulfillmentUpdateOnce(
      getOrder({ status: ORDER_STATUS.preparing }),
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
        now
      }
    );
    const missingLinkResult = await sendFulfillmentUpdateOnce(
      getOrder({
        status: ORDER_STATUS.shipped,
        guestAccessToken: " "
      }),
      {
        emailProvider: async () => {
          providerCalled = true;

          return {
            status: "sent",
            provider: "test",
            messageId: "message-002"
          };
        },
        appUrl: "https://irruptivo.test",
        now
      }
    );

    expect(nonNotifiableResult).toEqual({
      status: "skipped",
      reason: "status_not_notifiable",
      orderId: "order-001"
    });
    expect(missingLinkResult).toEqual({
      status: "skipped",
      reason: "missing_guest_status_link",
      orderId: "order-001"
    });
    expect(providerCalled).toBe(false);
  });
});

describe.skipIf(!process.env.DATABASE_URL)(
  "fulfillment update email delivery database store",
  () => {
    beforeEach(async (ctx) => {
      await skipIfDatabaseUnavailable(ctx);
      databaseAvailable = true;
      await resetOrderConfirmationEmailDeliveriesForTests();
      await resetOrdersForTests();
    });

    afterAll(async () => {
      if (!databaseAvailable) {
        return;
      }

      await resetOrderConfirmationEmailDeliveriesForTests();
      await resetOrdersForTests();
    });

    it("sends a shipped update once and returns duplicate status without re-sending", async () => {
      const sentMessages: EmailMessage[] = [];
      const order = getOrder({
        status: ORDER_STATUS.shipped,
        deliveryMethod: DELIVERY_METHOD.shipping
      });
      await createTestOrder(order);

      const result = await sendFulfillmentUpdateOnce(order, {
        emailProvider: async (message) => {
          sentMessages.push(message);

          return {
            status: "sent",
            provider: "test",
            messageId: "message-shipped"
          };
        },
        appUrl: "https://irruptivo.test",
        whatsappUrl: "https://wa.me/5491111111111",
        now
      });
      const duplicateResult = await sendFulfillmentUpdateOnce(order, {
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

      expect(result).toEqual({
        status: "sent",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        providerMessageId: "message-shipped"
      });
      expect(duplicateResult).toEqual({
        status: "duplicate",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        previousStatus: "sent"
      });
      expect(sentMessages).toHaveLength(1);
      await expect(
        readOrderConfirmationEmailDeliveriesForTests()
      ).resolves.toMatchObject([
        {
          orderId: "order-001",
          status: "sent",
          recipientEmail: "luca@example.com",
          providerMessageId: "message-shipped"
        }
      ]);
      await expect(readEmailDeliveryKinds()).resolves.toEqual(["buyer_shipped"]);
    });

    it("sends a ready-for-pickup update with its own delivery kind", async () => {
      const sentMessages: EmailMessage[] = [];
      const order = getOrder({
        status: ORDER_STATUS.readyForPickup,
        deliveryMethod: DELIVERY_METHOD.pickup
      });
      await createTestOrder(order);

      const result = await sendFulfillmentUpdateOnce(order, {
        emailProvider: async (message) => {
          sentMessages.push(message);

          return {
            status: "sent",
            provider: "test",
            messageId: "message-pickup"
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
        providerMessageId: "message-pickup"
      });
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0]?.text).not.toContain("ready_for_pickup");
      await expect(readEmailDeliveryKinds()).resolves.toEqual([
        "buyer_ready_for_pickup"
      ]);
    });

    it("keeps a fresh failed fulfillment update within resend throttle as duplicate", async () => {
      const sentMessages: EmailMessage[] = [];
      const order = getOrder({
        status: ORDER_STATUS.shipped,
        deliveryMethod: DELIVERY_METHOD.shipping
      });
      await createTestOrder(order);

      const failedResult = await sendFulfillmentUpdateOnce(order, {
        emailProvider: async (message) => {
          sentMessages.push(message);

          return {
            status: "failed",
            provider: "test",
            message: "El proveedor de email rechazó el envío."
          };
        },
        appUrl: "https://irruptivo.test",
        now
      });
      const resendWithinThrottleResult = await sendFulfillmentUpdateOnce(order, {
        emailProvider: async (message) => {
          sentMessages.push(message);

          return {
            status: "sent",
            provider: "test",
            messageId: "message-force-retry"
          };
        },
        appUrl: "https://irruptivo.test",
        reclaimAfterMs: EMAIL_DELIVERY_RESEND_RECLAIM_AFTER_MS,
        now
      });

      expect(failedResult).toEqual({
        status: "failed",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        message: "El proveedor de email rechazó el envío."
      });
      expect(resendWithinThrottleResult).toEqual({
        status: "duplicate",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        previousStatus: "failed"
      });
      expect(sentMessages).toHaveLength(1);
      await expect(
        readOrderConfirmationEmailDeliveriesForTests()
      ).resolves.toMatchObject([
        {
          orderId: "order-001",
          status: "failed",
          providerMessageId: null,
          errorMessage: "El proveedor de email rechazó el envío.",
          attemptedAt: now
        }
      ]);
    });

    it("reclaims an older failed fulfillment update with the resend throttle", async () => {
      const sentMessages: EmailMessage[] = [];
      const order = getOrder({
        status: ORDER_STATUS.shipped,
        deliveryMethod: DELIVERY_METHOD.shipping
      });
      const retryAfterThrottle = addMilliseconds(
        now,
        EMAIL_DELIVERY_RESEND_RECLAIM_AFTER_MS + 1
      );
      await createTestOrder(order);

      const failedResult = await sendFulfillmentUpdateOnce(order, {
        emailProvider: async (message) => {
          sentMessages.push(message);

          return {
            status: "failed",
            provider: "test",
            message: "El proveedor de email rechazó el envío."
          };
        },
        appUrl: "https://irruptivo.test",
        now
      });
      const retryResult = await sendFulfillmentUpdateOnce(order, {
        emailProvider: async (message) => {
          sentMessages.push(message);

          return {
            status: "sent",
            provider: "test",
            messageId: "message-resend-retry"
          };
        },
        appUrl: "https://irruptivo.test",
        reclaimAfterMs: EMAIL_DELIVERY_RESEND_RECLAIM_AFTER_MS,
        now: retryAfterThrottle
      });

      expect(failedResult.status).toBe("failed");
      expect(retryResult).toEqual({
        status: "sent",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        providerMessageId: "message-resend-retry"
      });
      expect(sentMessages).toHaveLength(2);
      await expect(
        readOrderConfirmationEmailDeliveriesForTests()
      ).resolves.toMatchObject([
        {
          orderId: "order-001",
          status: "sent",
          providerMessageId: "message-resend-retry",
          errorMessage: null,
          attemptedAt: retryAfterThrottle
        }
      ]);
    });

    it("reclaims an older crashed sending fulfillment update with the resend throttle", async () => {
      const sentMessages: EmailMessage[] = [];
      const staleAttempt = addMilliseconds(
        now,
        -(EMAIL_DELIVERY_RESEND_RECLAIM_AFTER_MS + 1)
      );
      const order = getOrder({
        status: ORDER_STATUS.readyForPickup,
        deliveryMethod: DELIVERY_METHOD.pickup
      });
      await createTestOrder(order);

      const initialClaim = await claimOrderEmailDelivery({
        kind: "buyer_ready_for_pickup",
        delivery: {
          orderId: order.id,
          recipientEmail: order.contact.email,
          status: "sending",
          providerMessageId: null,
          attemptedAt: staleAttempt,
          errorMessage: null
        },
        now: staleAttempt
      });
      const retryResult = await sendFulfillmentUpdateOnce(order, {
        emailProvider: async (message) => {
          sentMessages.push(message);

          return {
            status: "sent",
            provider: "test",
            messageId: "message-sending-retry"
          };
        },
        appUrl: "https://irruptivo.test",
        reclaimAfterMs: EMAIL_DELIVERY_RESEND_RECLAIM_AFTER_MS,
        now
      });

      expect(initialClaim.status).toBe("claimed");
      expect(retryResult).toEqual({
        status: "sent",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        providerMessageId: "message-sending-retry"
      });
      expect(sentMessages).toHaveLength(1);
    });

    it("does not force-reclaim a sent fulfillment update", async () => {
      const sentMessages: EmailMessage[] = [];
      const order = getOrder({
        status: ORDER_STATUS.readyForPickup,
        deliveryMethod: DELIVERY_METHOD.pickup
      });
      await createTestOrder(order);

      await sendFulfillmentUpdateOnce(order, {
        emailProvider: async (message) => {
          sentMessages.push(message);

          return {
            status: "sent",
            provider: "test",
            messageId: "message-pickup"
          };
        },
        appUrl: "https://irruptivo.test",
        now
      });
      const forceRetryResult = await sendFulfillmentUpdateOnce(order, {
        emailProvider: async (message) => {
          sentMessages.push(message);

          return {
            status: "sent",
            provider: "test",
            messageId: "message-force-retry"
          };
        },
        appUrl: "https://irruptivo.test",
        reclaimAfterMs: EMAIL_DELIVERY_RESEND_RECLAIM_AFTER_MS,
        now
      });

      expect(forceRetryResult).toEqual({
        status: "duplicate",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        previousStatus: "sent"
      });
      expect(sentMessages).toHaveLength(1);
    });
  }
);

async function readEmailDeliveryKinds(): Promise<string[]> {
  const deliveries = await prisma.emailDelivery.findMany({
    orderBy: {
      attemptedAt: "asc"
    },
    select: {
      kind: true
    }
  });

  return deliveries.map((delivery) => delivery.kind);
}

function getOrder({
  status,
  deliveryMethod = DELIVERY_METHOD.shipping,
  guestAccessToken = "guest-access-token"
}: {
  status: OrderStatus;
  deliveryMethod?: typeof DELIVERY_METHOD.shipping | typeof DELIVERY_METHOD.pickup;
  guestAccessToken?: string;
}): Order {
  return {
    id: "order-001",
    orderNumber: "IRR-000001",
    status,
    createdAt: now,
    guestAccessToken,
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

async function createTestOrder(order: Order): Promise<void> {
  await prisma.order.create({
    data: {
      id: order.id,
      orderNumber: order.orderNumber,
      guestAccessToken: order.guestAccessToken,
      idempotencyKey: `fulfillment-email-${order.id}`,
      status: order.status,
      createdAt: new Date(order.createdAt),
      contactFullName: order.contact.fullName,
      contactEmail: order.contact.email,
      contactPhone: order.contact.phone,
      deliveryMethod: order.delivery.method,
      deliveryMethodLabel: order.delivery.methodLabel,
      deliveryNotes: order.delivery.notes,
      shipAddressLine: order.delivery.shippingAddress?.addressLine ?? null,
      shipCity: order.delivery.shippingAddress?.city ?? null,
      shipProvince: order.delivery.shippingAddress?.province ?? null,
      shipPostalCode: order.delivery.shippingAddress?.postalCode ?? null,
      adminNotes: null,
      subtotalArs: order.subtotalArs,
      deliveryCostArs: order.deliveryCostArs,
      totalArs: order.totalArs
    }
  });
}

async function resetOrdersForTests(): Promise<void> {
  await prisma.paymentEvent.deleteMany();
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

function addMilliseconds(value: string, milliseconds: number): string {
  return new Date(new Date(value).getTime() + milliseconds).toISOString();
}
