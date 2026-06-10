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
  EMAIL_DELIVERY_RECLAIM_AFTER_MS,
  buildOrderConfirmationEmailMessage,
  claimOrderEmailDelivery,
  getGuestStatusUrl,
  mapOrderConfirmationEmailDeliveryRecordToRow,
  mapOrderConfirmationEmailDeliveryRowToRecord,
  readOrderEmailDeliveryByOrderIdAndKind,
  readOrderConfirmationEmailDeliveriesForTests,
  resetOrderConfirmationEmailDeliveriesForTests,
  sendOrderConfirmationOnce
} from "./order-confirmation-email";

const now = "2026-05-30T12:00:00.000Z";
let databaseAvailable = false;

describe("order confirmation email content", () => {
  it("round-trips an EmailDelivery DB row and delivery record without a database", () => {
    const row = mapOrderConfirmationEmailDeliveryRecordToRow({
      orderId: " order-001 ",
      recipientEmail: " luca@example.com ",
      status: "sent",
      providerMessageId: " message-001 ",
      attemptedAt: now,
      errorMessage: null
    });

    expect(row).toMatchObject({
      orderId: "order-001",
      recipientEmail: "luca@example.com",
      status: "sent",
      providerMessageId: "message-001",
      errorMessage: null
    });
    expect(row.attemptedAt).toEqual(new Date(now));
    expect(mapOrderConfirmationEmailDeliveryRowToRecord(row)).toEqual({
      orderId: "order-001",
      recipientEmail: "luca@example.com",
      status: "sent",
      providerMessageId: "message-001",
      attemptedAt: now,
      errorMessage: null
    });
  });

  it("builds a Spanish confirmation email with order, fulfillment, contact, and guest status details", () => {
    const message = buildOrderConfirmationEmailMessage({
      order: getOrder(ORDER_STATUS.paid),
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
      subject: "Confirmación de compra IRR-000001 - Irruptivo"
    });
    expect(message.text).toContain("IRR-000001");
    expect(message.text).toContain("86.900");
    expect(message.text).toContain(
      "Envío a domicilio: Av. Siempre Viva 742, Benavidez, Buenos Aires (1621)."
    );
    expect(message.text).toContain("coordinar el envío");
    expect(message.text).toContain("https://wa.me/5491111111111");
    expect(message.text).toContain(
      "https://irruptivo.test/pedido/guest-access-token"
    );
    expect(message.text).not.toContain("pending_payment");
    expect(message.text).not.toContain("paid");
    expect(message.text).not.toContain("shipping");
  });
});

describe.skipIf(!process.env.DATABASE_URL)(
  "order confirmation email delivery database store",
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

    it("sends a paid order once and returns duplicate status without re-sending", async () => {
      const sentMessages: EmailMessage[] = [];
      const order = getOrder(ORDER_STATUS.paid);
      await createTestOrder(order);

      const result = await sendOrderConfirmationOnce(order, {
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

      expect(result).toEqual({
        status: "sent",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        providerMessageId: "message-001"
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
          providerMessageId: "message-001"
        }
      ]);
    });

    it("sends only once when two invocations race for the same order and kind", async () => {
      const sentMessages: EmailMessage[] = [];
      const order = getOrder(ORDER_STATUS.paid);
      await createTestOrder(order);

      const emailProvider = async (message: EmailMessage) => {
        sentMessages.push(message);

        return {
          status: "sent" as const,
          provider: "test",
          messageId: "message-concurrent"
        };
      };

      const results = await Promise.all([
        sendOrderConfirmationOnce(order, {
          emailProvider,
          appUrl: "https://irruptivo.test",
          now
        }),
        sendOrderConfirmationOnce(order, {
          emailProvider,
          appUrl: "https://irruptivo.test",
          now
        })
      ]);

      expect(results.map((result) => result.status).sort()).toEqual([
        "duplicate",
        "sent"
      ]);
      expect(sentMessages).toHaveLength(1);
      await expect(
        readOrderConfirmationEmailDeliveriesForTests()
      ).resolves.toHaveLength(1);
    });

    it("does not write delivery rows when the order is unpaid or has no guest status link", async () => {
      let providerCalled = false;

      const unpaidResult = await sendOrderConfirmationOnce(
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
          now
        }
      );
      const missingLinkResult = await sendOrderConfirmationOnce(
        getOrder(ORDER_STATUS.paid, {
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

      expect(unpaidResult).toEqual({
        status: "skipped",
        reason: "order_not_paid",
        orderId: "order-001"
      });
      expect(missingLinkResult).toEqual({
        status: "skipped",
        reason: "missing_guest_status_link",
        orderId: "order-001"
      });
      expect(providerCalled).toBe(false);
      await expect(readOrderConfirmationEmailDeliveriesForTests()).resolves.toEqual(
        []
      );
    });

    it("throttles failed deliveries before backoff and reclaims them after backoff", async () => {
      const providerCalls: EmailMessage[] = [];
      const order = getOrder(ORDER_STATUS.paid);
      await createTestOrder(order);
      const retryAfterBackoff = addMilliseconds(
        now,
        EMAIL_DELIVERY_RECLAIM_AFTER_MS + 1
      );

      const result = await sendOrderConfirmationOnce(order, {
        emailProvider: async (message) => {
          providerCalls.push(message);

          return {
            status: "failed",
            provider: "test",
            message: "El proveedor de email rechazó el envío."
          };
        },
        appUrl: "https://irruptivo.test",
        now
      });
      const duplicateBeforeBackoffResult = await sendOrderConfirmationOnce(order, {
        emailProvider: async (message) => {
          providerCalls.push(message);

          return {
            status: "sent",
            provider: "test",
            messageId: "message-before-backoff"
          };
        },
        appUrl: "https://irruptivo.test",
        now
      });
      const retryAfterBackoffResult = await sendOrderConfirmationOnce(order, {
        emailProvider: async (message) => {
          providerCalls.push(message);

          return {
            status: "sent",
            provider: "test",
            messageId: "message-retry"
          };
        },
        appUrl: "https://irruptivo.test",
        now: retryAfterBackoff
      });

      expect(result).toEqual({
        status: "failed",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        message: "El proveedor de email rechazó el envío."
      });
      expect(duplicateBeforeBackoffResult).toEqual({
        status: "duplicate",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        previousStatus: "failed"
      });
      expect(retryAfterBackoffResult).toEqual({
        status: "sent",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        providerMessageId: "message-retry"
      });
      expect(providerCalls).toHaveLength(2);
      await expect(
        readOrderConfirmationEmailDeliveriesForTests()
      ).resolves.toMatchObject([
        {
          orderId: "order-001",
          status: "sent",
          providerMessageId: "message-retry",
          errorMessage: null,
          attemptedAt: retryAfterBackoff
        }
      ]);
    });

    it("throttles configuration-missing deliveries before backoff and reclaims them after backoff", async () => {
      const providerCalls: EmailMessage[] = [];
      const order = getOrder(ORDER_STATUS.paid);
      await createTestOrder(order);
      const retryAfterBackoff = addMilliseconds(
        now,
        EMAIL_DELIVERY_RECLAIM_AFTER_MS + 1
      );

      const result = await sendOrderConfirmationOnce(order, {
        emailProvider: async (message) => {
          providerCalls.push(message);

          return {
            status: "configuration_missing",
            provider: "test",
            message: "Falta configurar el proveedor de email.",
            missingConfig: ["IRRUPTIVO_EMAIL_PROVIDER_URL"]
          };
        },
        appUrl: "https://irruptivo.test",
        now
      });
      const duplicateBeforeBackoffResult = await sendOrderConfirmationOnce(order, {
        emailProvider: async (message) => {
          providerCalls.push(message);

          return {
            status: "sent",
            provider: "test",
            messageId: "message-before-backoff"
          };
        },
        appUrl: "https://irruptivo.test",
        now
      });
      const retryAfterBackoffResult = await sendOrderConfirmationOnce(order, {
        emailProvider: async (message) => {
          providerCalls.push(message);

          return {
            status: "sent",
            provider: "test",
            messageId: "message-retry"
          };
        },
        appUrl: "https://irruptivo.test",
        now: retryAfterBackoff
      });

      expect(result).toEqual({
        status: "configuration_missing",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        message: "Falta configurar el proveedor de email."
      });
      expect(duplicateBeforeBackoffResult).toEqual({
        status: "duplicate",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        previousStatus: "configuration_missing"
      });
      expect(retryAfterBackoffResult).toEqual({
        status: "sent",
        orderId: "order-001",
        recipientEmail: "luca@example.com",
        providerMessageId: "message-retry"
      });
      expect(providerCalls).toHaveLength(2);
      await expect(
        readOrderConfirmationEmailDeliveriesForTests()
      ).resolves.toMatchObject([
        {
          orderId: "order-001",
          status: "sent",
          providerMessageId: "message-retry",
          errorMessage: null,
          attemptedAt: retryAfterBackoff
        }
      ]);
    });

    it("reclaims a stale sending delivery row atomically", async () => {
      const order = getOrder(ORDER_STATUS.paid);
      const staleAttempt = addMilliseconds(
        now,
        -(EMAIL_DELIVERY_RECLAIM_AFTER_MS + 1)
      );
      await createTestOrder(order);

      const initialClaim = await claimOrderEmailDelivery({
        kind: "buyer_confirmation",
        delivery: {
          orderId: order.id,
          recipientEmail: "old-recipient@example.com",
          status: "sending",
          providerMessageId: null,
          attemptedAt: staleAttempt,
          errorMessage: null
        },
        now: staleAttempt
      });
      const reclaim = await claimOrderEmailDelivery({
        kind: "buyer_confirmation",
        delivery: {
          orderId: order.id,
          recipientEmail: order.contact.email,
          status: "sending",
          providerMessageId: null,
          attemptedAt: now,
          errorMessage: null
        },
        now
      });

      expect(initialClaim.status).toBe("claimed");
      expect(reclaim).toEqual({
        status: "claimed",
        delivery: {
          orderId: order.id,
          recipientEmail: order.contact.email,
          status: "sending",
          providerMessageId: null,
          attemptedAt: now,
          errorMessage: null
        }
      });
    });

    it("never reclaims a sent delivery row, even after backoff", async () => {
      const providerCalls: EmailMessage[] = [];
      const order = getOrder(ORDER_STATUS.paid);
      await createTestOrder(order);

      await sendOrderConfirmationOnce(order, {
        emailProvider: async (message) => {
          providerCalls.push(message);

          return {
            status: "sent",
            provider: "test",
            messageId: "message-001"
          };
        },
        appUrl: "https://irruptivo.test",
        now
      });
      const reclaimAfterBackoff = await claimOrderEmailDelivery({
        kind: "buyer_confirmation",
        delivery: {
          orderId: order.id,
          recipientEmail: "retry@example.com",
          status: "sending",
          providerMessageId: null,
          attemptedAt: addMilliseconds(now, EMAIL_DELIVERY_RECLAIM_AFTER_MS + 1),
          errorMessage: null
        },
        now: addMilliseconds(now, EMAIL_DELIVERY_RECLAIM_AFTER_MS + 1)
      });

      expect(reclaimAfterBackoff).toEqual({
        status: "duplicate",
        delivery: {
          orderId: order.id,
          recipientEmail: order.contact.email,
          status: "sent",
          providerMessageId: "message-001",
          attemptedAt: now,
          errorMessage: null
        }
      });
      expect(providerCalls).toHaveLength(1);
      await expect(
        readOrderEmailDeliveryByOrderIdAndKind({
          orderId: order.id,
          kind: "buyer_confirmation"
        })
      ).resolves.toMatchObject({
        status: "sent",
        recipientEmail: order.contact.email,
        providerMessageId: "message-001"
      });
    });
  }
);

function getOrder(
  status: OrderStatus,
  { guestAccessToken = "guest-access-token" }: { guestAccessToken?: string } = {}
): Order {
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

async function createTestOrder(order: Order): Promise<void> {
  await prisma.order.create({
    data: {
      id: order.id,
      orderNumber: order.orderNumber,
      guestAccessToken: order.guestAccessToken,
      idempotencyKey: `phase8-email-${order.id}`,
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
      totalArs: order.totalArs,
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
