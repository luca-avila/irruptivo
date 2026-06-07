import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  type TestContext
} from "vitest";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductRecord
} from "../catalog/catalog";
import { type Cart } from "../cart/cart";
import { DELIVERY_METHOD, ORDER_STATUS } from "../domain/rules";
import { prisma } from "../db/client";
import {
  createPendingOrderInStore,
  findOrderByIdInStore,
  resetOrderStoreForTests,
  updateOrderStatusInStore
} from "../orders/order-store";
import {
  getPaymentManualReviewForOrder,
  readPaymentEventsForTests,
  resetPaymentEventsForTests
} from "./payment-events";
import {
  reconcileMercadoPagoEvent,
  type MercadoPagoPayment
} from "./payment-reconciliation";

const now = "2026-05-30T12:00:00.000Z";
const runId = `${Date.now()}-${process.pid}`;
const productIdPrefix = `phase7-payment-events-${runId}`;
let databaseAvailable = false;

describe.skipIf(!process.env.DATABASE_URL)(
  "Mercado Pago reconciliation persistence",
  () => {
    beforeEach(async (ctx) => {
      await skipIfDatabaseUnavailable(ctx);
      databaseAvailable = true;
      await resetPaymentEventsForTests();
      await resetOrderStoreForTests();
      await cleanupTestProducts();
    });

    afterAll(async () => {
      if (!databaseAvailable) {
        return;
      }

      await resetPaymentEventsForTests();
      await resetOrderStoreForTests();
      await cleanupTestProducts();
    });

    it("decrements stock once on approved payment and leaves failed/expired stock unchanged", async () => {
      const approved = await createProductAndOrder({
        suffix: "approved",
        orderId: "phase7-order-approved",
        stock: 5,
        quantity: 3
      });
      const approvedNotification = getNotification({
        id: "phase7-event-approved",
        dataId: "phase7-payment-approved"
      });

      const approvedResult = await reconcileMercadoPagoEvent(
        approvedNotification,
        {
          paymentProvider: async () =>
            getPayment({
              paymentId: "phase7-payment-approved",
              orderId: approved.orderId,
              transactionAmount: approved.totalArs
            }),
          confirmationEmailSender: async (order) => ({
            status: "sent",
            orderId: order.id,
            recipientEmail: order.contact.email,
            providerMessageId: `message-${order.id}`
          }),
          now
        }
      );
      const duplicateApprovedResult = await reconcileMercadoPagoEvent(
        approvedNotification,
        {
          paymentProvider: async () =>
            getPayment({
              paymentId: "phase7-payment-approved",
              orderId: approved.orderId,
              transactionAmount: approved.totalArs
            }),
          confirmationEmailSender: async (order) => ({
            status: "sent",
            orderId: order.id,
            recipientEmail: order.contact.email,
            providerMessageId: `message-${order.id}`
          }),
          now
        }
      );

      await expect(readVariantStock(approved.variantId)).resolves.toBe(2);
      await expect(findOrderByIdInStore(approved.orderId)).resolves.toMatchObject({
        status: ORDER_STATUS.paid
      });
      expect(approvedResult).toMatchObject({
        status: "paid",
        orderId: approved.orderId
      });
      expect(duplicateApprovedResult).toEqual({
        status: "duplicate",
        orderId: approved.orderId,
        providerPaymentId: "phase7-payment-approved"
      });

      const failed = await createProductAndOrder({
        suffix: "failed",
        orderId: "phase7-order-failed",
        stock: 5,
        quantity: 3
      });
      const failedResult = await reconcileMercadoPagoEvent(
        getNotification({
          id: "phase7-event-failed",
          dataId: "phase7-payment-failed"
        }),
        {
          paymentProvider: async () =>
            getPayment({
              paymentId: "phase7-payment-failed",
              orderId: failed.orderId,
              status: "rejected",
              transactionAmount: failed.totalArs
            }),
          now
        }
      );

      await expect(readVariantStock(failed.variantId)).resolves.toBe(5);
      expect(failedResult).toMatchObject({
        status: "payment_failed",
        orderId: failed.orderId
      });

      const expired = await createProductAndOrder({
        suffix: "expired",
        orderId: "phase7-order-expired",
        stock: 2,
        quantity: 2
      });
      await updateOrderStatusInStore({
        orderId: expired.orderId,
        status: ORDER_STATUS.expired,
        reason: "test_expired"
      });

      const expiredResult = await reconcileMercadoPagoEvent(
        getNotification({
          id: "phase7-event-expired",
          dataId: "phase7-payment-expired"
        }),
        {
          paymentProvider: async () =>
            getPayment({
              paymentId: "phase7-payment-expired",
              orderId: expired.orderId,
              transactionAmount: expired.totalArs
            }),
          now
        }
      );

      await expect(readVariantStock(expired.variantId)).resolves.toBe(2);
      expect(expiredResult).toEqual({
        status: "manual_review_required",
        orderId: expired.orderId,
        providerPaymentId: "phase7-payment-expired",
        orderStatus: ORDER_STATUS.expired
      });
      await expect(
        getPaymentManualReviewForOrder(expired.orderId)
      ).resolves.toMatchObject({
        required: true,
        providerPaymentIds: ["phase7-payment-expired"]
      });

      const processingResults = (await readPaymentEventsForTests()).map(
        (event) => event.processingResult
      );

      expect(processingResults).toHaveLength(3);
      expect(processingResults).toEqual(
        expect.arrayContaining([
          "paid",
          "payment_failed",
          "manual_review_required"
        ])
      );
    });

    it("does not oversell when two pending orders pay for the same scarce variant", async () => {
      const scarce = await createProductAndOrdersForVariant({
        suffix: "scarce",
        stock: 1,
        orders: [
          {
            orderId: "phase7-order-scarce-first",
            quantity: 1
          },
          {
            orderId: "phase7-order-scarce-second",
            quantity: 1
          }
        ]
      });
      const firstOrder = scarce.orders[0];
      const secondOrder = scarce.orders[1];

      if (!firstOrder || !secondOrder) {
        throw new Error("Expected two scarce-stock orders to be created.");
      }

      const firstResult = await reconcileMercadoPagoEvent(
        getNotification({
          id: "phase7-event-scarce-first",
          dataId: "phase7-payment-scarce-first"
        }),
        {
          paymentProvider: async () =>
            getPayment({
              paymentId: "phase7-payment-scarce-first",
              orderId: firstOrder.orderId,
              transactionAmount: firstOrder.totalArs
            }),
          confirmationEmailSender: async (order) => ({
            status: "sent",
            orderId: order.id,
            recipientEmail: order.contact.email,
            providerMessageId: `message-${order.id}`
          }),
          now
        }
      );
      const secondResult = await reconcileMercadoPagoEvent(
        getNotification({
          id: "phase7-event-scarce-second",
          dataId: "phase7-payment-scarce-second"
        }),
        {
          paymentProvider: async () =>
            getPayment({
              paymentId: "phase7-payment-scarce-second",
              orderId: secondOrder.orderId,
              transactionAmount: secondOrder.totalArs
            }),
          confirmationEmailSender: async (order) => ({
            status: "sent",
            orderId: order.id,
            recipientEmail: order.contact.email,
            providerMessageId: `message-${order.id}`
          }),
          now
        }
      );

      await expect(readVariantStock(scarce.variantId)).resolves.toBe(0);
      await expect(findOrderByIdInStore(firstOrder.orderId)).resolves.toMatchObject({
        status: ORDER_STATUS.paid
      });
      await expect(findOrderByIdInStore(secondOrder.orderId)).resolves.toMatchObject({
        status: ORDER_STATUS.expired
      });
      expect(firstResult).toMatchObject({
        status: "paid",
        orderId: firstOrder.orderId
      });
      expect(secondResult).toEqual({
        status: "manual_review_required",
        orderId: secondOrder.orderId,
        providerPaymentId: "phase7-payment-scarce-second",
        orderStatus: ORDER_STATUS.expired
      });
      await expect(
        getPaymentManualReviewForOrder(secondOrder.orderId)
      ).resolves.toMatchObject({
        required: true,
        providerPaymentIds: ["phase7-payment-scarce-second"]
      });
      expect(
        (await readPaymentEventsForTests())
          .filter((event) => event.orderId === secondOrder.orderId)
          .map((event) => event.processingResult)
      ).toEqual(["manual_review_required"]);
    });

    it("claims duplicate approved events atomically with a single stock decrement", async () => {
      const approved = await createProductAndOrder({
        suffix: "concurrent",
        orderId: "phase7-order-concurrent",
        stock: 5,
        quantity: 3
      });
      const notification = getNotification({
        id: "phase7-event-concurrent",
        dataId: "phase7-payment-concurrent"
      });

      const results = await Promise.all([
        reconcileMercadoPagoEvent(notification, {
          paymentProvider: async () =>
            getPayment({
              paymentId: "phase7-payment-concurrent",
              orderId: approved.orderId,
              transactionAmount: approved.totalArs
            }),
          confirmationEmailSender: async (order) => ({
            status: "sent",
            orderId: order.id,
            recipientEmail: order.contact.email,
            providerMessageId: `message-${order.id}`
          }),
          now
        }),
        reconcileMercadoPagoEvent(notification, {
          paymentProvider: async () =>
            getPayment({
              paymentId: "phase7-payment-concurrent",
              orderId: approved.orderId,
              transactionAmount: approved.totalArs
            }),
          confirmationEmailSender: async (order) => ({
            status: "sent",
            orderId: order.id,
            recipientEmail: order.contact.email,
            providerMessageId: `message-${order.id}`
          }),
          now
        })
      ]);

      await expect(readVariantStock(approved.variantId)).resolves.toBe(2);
      await expect(findOrderByIdInStore(approved.orderId)).resolves.toMatchObject({
        status: ORDER_STATUS.paid
      });
      expect(results.map((result) => result.status).sort()).toEqual([
        "duplicate",
        "paid"
      ]);
      expect(
        (await readPaymentEventsForTests()).filter(
          (event) => event.orderId === approved.orderId
        )
      ).toMatchObject([
        {
          providerEventId: "phase7-event-concurrent",
          processingResult: "paid"
        }
      ]);
    });
  }
);

async function createProductAndOrder({
  suffix,
  orderId,
  stock,
  quantity
}: {
  suffix: string;
  orderId: string;
  stock: number;
  quantity: number;
}): Promise<{ orderId: string; variantId: string; totalArs: number }> {
  const productId = `${productIdPrefix}-${suffix}`;
  const variantId = `${productId}-variant`;
  const product = getCatalogProduct({
    productId,
    variantId,
    stock
  });

  await prisma.product.create({
    data: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      area: product.area,
      status: product.status,
      basePriceArs: product.basePriceArs,
      clothingSubcategory: product.clothingSubcategory,
      supplementType: product.supplementType,
      variants: {
        create: product.variants.map((variant, index) => ({
          id: variant.id,
          sku: variant.sku,
          skuNormalized: variant.sku.toUpperCase(),
          name: variant.name,
          stock: variant.stock,
          position: index,
          priceOverrideArs: variant.priceOverrideArs ?? null,
          optionColor: variant.options?.color ?? null,
          optionSize: variant.options?.size ?? null,
          optionFlavor: variant.options?.flavor ?? null,
          optionWeight: variant.options?.weight ?? null,
          optionPresentation: variant.options?.presentation ?? null
        }))
      }
    }
  });

  const result = await createPendingOrderInStore({
    idempotencyKey: `idem-${orderId}`,
    cart: getCart({ productId, variantId, quantity }),
    checkout: {
      fullName: "Luca Irruptivo",
      email: "luca@example.com",
      phone: "11 5555 5555",
      deliveryMethod: DELIVERY_METHOD.pickup
    },
    products: [product],
    orderId,
    orderNumber: `IRR-${suffix.toUpperCase()}`,
    guestAccessToken: `guest-${orderId}`,
    now
  });

  if (result.status !== "created") {
    throw new Error(`Expected ${orderId} to be created.`);
  }

  return {
    orderId,
    variantId,
    totalArs: quantity * 26000
  };
}

async function createProductAndOrdersForVariant({
  suffix,
  stock,
  orders
}: {
  suffix: string;
  stock: number;
  orders: readonly { orderId: string; quantity: number }[];
}): Promise<{
  variantId: string;
  orders: { orderId: string; totalArs: number }[];
}> {
  const productId = `${productIdPrefix}-${suffix}`;
  const variantId = `${productId}-variant`;
  const product = getCatalogProduct({
    productId,
    variantId,
    stock
  });

  await prisma.product.create({
    data: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      area: product.area,
      status: product.status,
      basePriceArs: product.basePriceArs,
      clothingSubcategory: product.clothingSubcategory,
      supplementType: product.supplementType,
      variants: {
        create: product.variants.map((variant, index) => ({
          id: variant.id,
          sku: variant.sku,
          skuNormalized: variant.sku.toUpperCase(),
          name: variant.name,
          stock: variant.stock,
          position: index,
          priceOverrideArs: variant.priceOverrideArs ?? null,
          optionColor: variant.options?.color ?? null,
          optionSize: variant.options?.size ?? null,
          optionFlavor: variant.options?.flavor ?? null,
          optionWeight: variant.options?.weight ?? null,
          optionPresentation: variant.options?.presentation ?? null
        }))
      }
    }
  });

  const createdOrders: { orderId: string; totalArs: number }[] = [];

  for (const order of orders) {
    const result = await createPendingOrderInStore({
      idempotencyKey: `idem-${order.orderId}`,
      cart: getCart({ productId, variantId, quantity: order.quantity }),
      checkout: {
        fullName: "Luca Irruptivo",
        email: "luca@example.com",
        phone: "11 5555 5555",
        deliveryMethod: DELIVERY_METHOD.pickup
      },
      products: [product],
      orderId: order.orderId,
      orderNumber: `IRR-${suffix.toUpperCase()}-${createdOrders.length + 1}`,
      guestAccessToken: `guest-${order.orderId}`,
      now
    });

    if (result.status !== "created") {
      throw new Error(`Expected ${order.orderId} to be created.`);
    }

    createdOrders.push({
      orderId: order.orderId,
      totalArs: order.quantity * 26000
    });
  }

  return {
    variantId,
    orders: createdOrders
  };
}

function getCatalogProduct({
  productId,
  variantId,
  stock
}: {
  productId: string;
  variantId: string;
  stock: number;
}): CatalogProductRecord {
  return {
    id: productId,
    slug: `${productId}-slug`,
    name: `Phase 7 Product ${productId}`,
    description: "Producto de test para reconciliacion de pagos.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 26000,
    clothingSubcategory: "Remeras",
    supplementType: null,
    variants: [
      {
        id: variantId,
        sku: `${productId}-sku`,
        name: "Negro / S",
        stock,
        priceOverrideArs: null,
        options: {
          color: "Negro",
          size: "S"
        }
      }
    ],
    images: []
  };
}

function getCart({
  productId,
  variantId,
  quantity
}: {
  productId: string;
  variantId: string;
  quantity: number;
}): Cart {
  return {
    items: [
      {
        productId,
        variantId,
        sku: `${productId}-sku`,
        quantity,
        priceSnapshotArs: 26000,
        priceSnapshotAt: now
      }
    ]
  };
}

function getNotification({
  id,
  dataId
}: {
  id: string;
  dataId: string;
}) {
  return {
    id,
    liveMode: false,
    type: "payment",
    action: "payment.updated",
    dataId,
    dateCreated: now
  };
}

function getPayment({
  paymentId,
  orderId,
  status = "approved",
  transactionAmount = 26000
}: {
  paymentId: string;
  orderId: string;
  status?: string;
  transactionAmount?: number;
}): MercadoPagoPayment {
  return {
    id: paymentId,
    status,
    statusDetail: status === "approved" ? "accredited" : "cc_rejected_other_reason",
    externalReference: orderId,
    transactionAmount,
    metadata: {
      internalOrderId: orderId
    }
  };
}

async function readVariantStock(variantId: string): Promise<number> {
  const variant = await prisma.productVariant.findUnique({
    where: {
      id: variantId
    },
    select: {
      stock: true
    }
  });

  if (!variant) {
    throw new Error(`Expected variant ${variantId} to exist.`);
  }

  return variant.stock;
}

async function cleanupTestProducts(): Promise<void> {
  await prisma.product.deleteMany({
    where: {
      id: {
        startsWith: productIdPrefix
      }
    }
  });
}

async function skipIfDatabaseUnavailable(ctx: TestContext): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    ctx.skip("DATABASE_URL is set, but the database is not reachable.");
  }
}
