import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  type TestContext
} from "vitest";

import { prisma } from "../db/client";
import { DELIVERY_METHOD, ORDER_STATUS } from "../domain/rules";
import { type Order } from "../orders/order-creation";
import { type EmailMessage } from "./email-provider";
import {
  buildAdminOrderNotificationEmailMessage,
  sendAdminOrderNotificationOnce
} from "./admin-order-notification-email";
import {
  readOrderConfirmationEmailDeliveriesForTests,
  resetOrderConfirmationEmailDeliveriesForTests
} from "./order-confirmation-email";

const now = "2026-05-30T12:00:00.000Z";
let databaseAvailable = false;

describe("admin order notification email content", () => {
  it("builds a shipping notification with buyer contact, items, total, address, and admin link", () => {
    const message = buildAdminOrderNotificationEmailMessage({
      order: getOrder({ deliveryMethod: DELIVERY_METHOD.shipping }),
      recipient: "admin@irruptivo.test",
      adminOrderUrl: "https://irruptivo.test/admin/pedidos/order-001"
    });

    expect(message).toMatchObject({
      to: {
        email: "admin@irruptivo.test"
      },
      subject: "Nueva compra IRR-000001 - Irruptivo",
      replyTo: {
        email: "luca@example.com",
        name: "Luca Irruptivo"
      }
    });
    expect(message.text).toContain("Comprador: Luca Irruptivo");
    expect(message.text).toContain("Email: luca@example.com");
    expect(message.text).toContain("Teléfono: 11 5555 5555");
    expect(message.text).toContain("Total: $ 86.900");
    expect(message.text).toContain("Training Tee Negra x 2");
    expect(message.text).toContain(
      "Dirección: Av. Siempre Viva 742, Benavidez, Buenos Aires (1621)."
    );
    expect(message.text).toContain(
      "https://irruptivo.test/admin/pedidos/order-001"
    );
    expect(message.text).not.toContain("shipping");
  });

  it("builds a pickup notification with pickup coordination copy", () => {
    const message = buildAdminOrderNotificationEmailMessage({
      order: getOrder({ deliveryMethod: DELIVERY_METHOD.pickup }),
      recipient: "admin@irruptivo.test",
      adminOrderUrl: "https://irruptivo.test/admin/pedidos/order-001"
    });

    expect(message.text).toContain("Entrega: Retiro local");
    expect(message.text).toContain(
      "Nota de retiro: coordinar punto y horario por WhatsApp."
    );
    expect(message.text).not.toContain("Dirección:");
    expect(message.text).not.toContain("pickup");
  });
});

describe.skipIf(!process.env.DATABASE_URL)(
  "admin order notification delivery database store",
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

    it("skips without a configured recipient and does not write a delivery row", async () => {
      const order = getOrder({ deliveryMethod: DELIVERY_METHOD.shipping });
      await createTestOrder(order);

      await expect(
        sendAdminOrderNotificationOnce(order, {
          recipient: null,
          appUrl: "https://irruptivo.test",
          now
        })
      ).resolves.toEqual({
        status: "skipped",
        reason: "no_recipient_configured",
        orderId: "order-001"
      });
      await expect(readOrderConfirmationEmailDeliveriesForTests()).resolves.toEqual(
        []
      );
    });

    it("sends a paid order once per admin notification kind", async () => {
      const sentMessages: EmailMessage[] = [];
      const order = getOrder({ deliveryMethod: DELIVERY_METHOD.shipping });
      await createTestOrder(order);

      const result = await sendAdminOrderNotificationOnce(order, {
        recipient: "admin@irruptivo.test",
        appUrl: "https://irruptivo.test",
        emailProvider: async (message) => {
          sentMessages.push(message);

          return {
            status: "sent",
            provider: "test",
            messageId: "admin-message-001"
          };
        },
        now
      });
      const duplicateResult = await sendAdminOrderNotificationOnce(order, {
        recipient: "admin@irruptivo.test",
        appUrl: "https://irruptivo.test",
        emailProvider: async (message) => {
          sentMessages.push(message);

          return {
            status: "sent",
            provider: "test",
            messageId: "admin-message-duplicate"
          };
        },
        now
      });

      expect(result).toEqual({
        status: "sent",
        orderId: "order-001",
        recipientEmail: "admin@irruptivo.test",
        providerMessageId: "admin-message-001"
      });
      expect(duplicateResult).toEqual({
        status: "duplicate",
        orderId: "order-001",
        recipientEmail: "admin@irruptivo.test",
        previousStatus: "sent"
      });
      expect(sentMessages).toHaveLength(1);
      await expect(
        readOrderConfirmationEmailDeliveriesForTests()
      ).resolves.toMatchObject([
        {
          orderId: "order-001",
          status: "sent",
          recipientEmail: "admin@irruptivo.test",
          providerMessageId: "admin-message-001"
        }
      ]);
    });
  }
);

function getOrder({
  deliveryMethod
}: {
  deliveryMethod: typeof DELIVERY_METHOD.shipping | typeof DELIVERY_METHOD.pickup;
}): Order {
  return {
    id: "order-001",
    orderNumber: "IRR-000001",
    status: ORDER_STATUS.paid,
    createdAt: now,
    guestAccessToken: "guest-access-token",
    contact: {
      fullName: "Luca Irruptivo",
      email: "luca@example.com",
      phone: "11 5555 5555"
    },
    delivery:
      deliveryMethod === DELIVERY_METHOD.shipping
        ? {
            method: DELIVERY_METHOD.shipping,
            methodLabel: "Envío a domicilio",
            shippingAddress: {
              addressLine: "Av. Siempre Viva 742",
              city: "Benavidez",
              province: "Buenos Aires",
              postalCode: "1621"
            },
            notes: "Timbre 2"
          }
        : {
            method: DELIVERY_METHOD.pickup,
            methodLabel: "Retiro local",
            shippingAddress: null,
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
      idempotencyKey: `phase-admin-email-${order.id}`,
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
