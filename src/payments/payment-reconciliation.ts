import { ORDER_STATUS, type OrderStatus } from "../domain/rules";
import { prisma } from "../db/client";
import { getAdminNotificationRecipient } from "../admin/settings";
import {
  sendAdminOrderNotificationOnce,
  type AdminOrderNotificationEmailSender,
  type AdminOrderNotificationResult
} from "../notifications/admin-order-notification-email";
import {
  sendOrderConfirmationOnce,
  type OrderConfirmationEmailResult,
  type OrderConfirmationEmailSender
} from "../notifications/order-confirmation-email";
import { expirePendingPaymentOrders } from "../orders/order-expiration";
import { type Order } from "../orders/order-creation";
import {
  findOrderByIdInStore,
  mapOrderRecordToOrder,
  updateOrderStatusInStore
} from "../orders/order-store";
import {
  PAYMENT_MANUAL_REVIEW_PROCESSING_RESULT,
  findPaymentEventByIdentity,
  mapPaymentEventRecordToRow,
  recordPaymentEventOnce,
  type PaymentEventIdentity,
  type PaymentEventRecord,
  type RecordPaymentEventOnceResult
} from "./payment-events";
import {
  fetchMercadoPagoPayment,
  type MercadoPagoPayment,
  type MercadoPagoWebhookNotification
} from "./mercado-pago-webhook";

export type { MercadoPagoPayment } from "./mercado-pago-webhook";

export type PaymentReconciliationRepository = {
  findOrderById: (orderId: string) => Promise<Order | null>;
  updateOrderStatus: (input: {
    orderId: string;
    status: OrderStatus;
    reason?: string;
    actor?: string;
  }) => Promise<Order | null>;
  markOrderPaidAndDecrementStock: (input: {
    orderId: string;
    reason?: string;
    actor?: string;
    paymentEvent?: PaymentEventRecord;
  }) => Promise<ApprovedPaymentSettlementResult>;
  findPaymentEvent: PaymentEventFinder;
  recordPaymentEvent: PaymentEventRecorder;
};

export type MercadoPagoPaymentProvider = (
  providerPaymentId: string
) => Promise<MercadoPagoPayment | null>;

export type PaymentEventRecorder = (
  event: PaymentEventRecord
) => Promise<RecordPaymentEventOnceResult>;

export type PaymentEventFinder = (
  identity: PaymentEventIdentity
) => Promise<PaymentEventRecord | null>;

export type ApprovedPaymentSettlementResult =
  | {
      status: "paid";
      order: Order;
    }
  | {
      status: "insufficient_stock";
      order: Order;
    }
  | {
      status: "already_reconciled";
      order: Order | null;
    }
  | {
      status: "duplicate";
      event: PaymentEventRecord;
    };

export type PaymentReconciliationConfig = {
  accessToken?: string | null;
  apiBaseUrl?: string | null;
};

export type ReconcileMercadoPagoEventOptions = {
  paymentProvider?: MercadoPagoPaymentProvider;
  repository?: PaymentReconciliationRepository;
  confirmationEmailSender?: OrderConfirmationEmailSender;
  adminNotificationEmailSender?: AdminOrderNotificationEmailSender;
  config?: PaymentReconciliationConfig;
  now?: Date | string;
};

export type PaymentReconciliationResult =
  | {
      status: "paid";
      orderId: string;
      providerPaymentId: string;
      orderStatus: typeof ORDER_STATUS.paid;
      confirmationEmail: OrderConfirmationEmailResult;
      adminNotification: AdminOrderNotificationResult;
    }
  | {
      status: "payment_failed";
      orderId: string;
      providerPaymentId: string;
      orderStatus: typeof ORDER_STATUS.paymentFailed;
    }
  | {
      status: "duplicate";
      orderId: string | null;
      providerPaymentId: string;
    }
  | {
      status: "manual_review_required";
      orderId: string;
      providerPaymentId: string;
      orderStatus: typeof ORDER_STATUS.expired;
    }
  | {
      status: "unverified";
      providerPaymentId: string;
    }
  | {
      status: "ignored";
      reason:
        | "unsupported_event"
        | "order_not_found"
        | "unsupported_payment_status"
        | "already_reconciled";
      providerPaymentId: string;
    };

const defaultRepository: PaymentReconciliationRepository = {
  findOrderById: findOrderByIdInStore,
  updateOrderStatus: updateOrderStatusInStore,
  markOrderPaidAndDecrementStock: markOrderPaidAndDecrementStockInStore,
  findPaymentEvent: findPaymentEventByIdentity,
  recordPaymentEvent: recordPaymentEventOnce
};

export async function reconcileMercadoPagoEvent(
  notification: MercadoPagoWebhookNotification,
  {
    paymentProvider,
    repository = defaultRepository,
    confirmationEmailSender = sendOrderConfirmationOnce,
    adminNotificationEmailSender = sendConfiguredAdminOrderNotificationOnce,
    config = {},
    now = new Date()
  }: ReconcileMercadoPagoEventOptions = {}
): Promise<PaymentReconciliationResult> {
  if (!isPaymentNotification(notification)) {
    return {
      status: "ignored",
      reason: "unsupported_event",
      providerPaymentId: notification.dataId
    };
  }

  const provider =
    paymentProvider ?? createConfiguredMercadoPagoPaymentProvider(config);
  const payment = await provider(notification.dataId);

  if (!isVerifiedPaymentForNotification(payment, notification)) {
    return {
      status: "unverified",
      providerPaymentId: notification.dataId
    };
  }

  const orderId = getPaymentOrderId(payment);

  if (!orderId) {
    return {
      status: "unverified",
      providerPaymentId: payment.id
    };
  }

  const order = await repository.findOrderById(orderId);

  if (!order || !isPaymentForOrder(payment, order)) {
    return !order
      ? {
          status: "ignored",
          reason: "order_not_found",
          providerPaymentId: payment.id
        }
      : {
          status: "unverified",
          providerPaymentId: payment.id
      };
  }

  const providerEventId = getProviderEventId(notification, payment);
  const existingEvent = await repository.findPaymentEvent({
    provider: "mercado_pago",
    providerEventId
  });

  if (existingEvent) {
    return {
      status: "duplicate",
      orderId: existingEvent.orderId,
      providerPaymentId: existingEvent.providerPaymentId
    };
  }

  const providerStatus = mapMercadoPagoPaymentStatus(payment.status);
  const reconciledOrder = await expirePendingPaymentOrderIfNeeded({
    order,
    repository,
    now
  });
  const processingResult = getProcessingResult(
    reconciledOrder.status,
    providerStatus
  );
  const paymentEventRecord = buildPaymentEventRecord({
    notification,
    payment,
    orderId: order.id,
    providerEventId,
    processingResult,
    receivedAt: getDate(now, "now").toISOString()
  });
  const recordsPaymentEventInSettlement =
    providerStatus === "approved" &&
    reconciledOrder.status === ORDER_STATUS.pendingPayment;

  if (!recordsPaymentEventInSettlement) {
    const recordResult = await repository.recordPaymentEvent(paymentEventRecord);

    if (recordResult.status === "duplicate") {
      return {
        status: "duplicate",
        orderId: recordResult.event.orderId,
        providerPaymentId: recordResult.event.providerPaymentId
      };
    }
  }

  if (!providerStatus) {
    return {
      status: "ignored",
      reason: "unsupported_payment_status",
      providerPaymentId: payment.id
    };
  }

  if (providerStatus === "approved") {
    return await reconcileApprovedPayment({
      order: reconciledOrder,
      notification,
      payment,
      providerEventId,
      paymentEventRecord: recordsPaymentEventInSettlement
        ? paymentEventRecord
        : null,
      repository,
      confirmationEmailSender,
      adminNotificationEmailSender,
      now
    });
  }

  return reconcileFailedPayment({
    order: reconciledOrder,
    payment,
    repository
  });
}

/**
 * Reconciles a payment using only its provider id, for the buyer's return to
 * the success page. The payment id comes from Mercado Pago's redirect params,
 * but the status, order ownership, and amount are all verified server-side
 * against the Mercado Pago API (the same checks as the webhook path), so the
 * redirect params act only as a trigger and cannot be forged into a
 * confirmation. Idempotent with the webhook via the order-level paid guard.
 */
export async function reconcileMercadoPagoPaymentById(
  providerPaymentId: string,
  options: ReconcileMercadoPagoEventOptions = {}
): Promise<PaymentReconciliationResult> {
  const paymentId = providerPaymentId.trim();

  if (!paymentId) {
    return {
      status: "ignored",
      reason: "unsupported_event",
      providerPaymentId: ""
    };
  }

  return reconcileMercadoPagoEvent(
    {
      id: paymentId,
      liveMode: null,
      type: "payment",
      action: "payment.updated",
      dataId: paymentId,
      dateCreated: null
    },
    options
  );
}

async function expirePendingPaymentOrderIfNeeded({
  order,
  repository,
  now
}: {
  order: Order;
  repository: PaymentReconciliationRepository;
  now: Date | string;
}): Promise<Order> {
  const expirationResult = await expirePendingPaymentOrders({
    now,
    orderRepository: {
      listOrders: async () => [order],
      updateOrderStatus: (input) => repository.updateOrderStatus(input)
    }
  });

  if (expirationResult.expiredOrderCount === 0) {
    return order;
  }

  return (
    (await repository.findOrderById(order.id)) ?? {
      ...order,
      status: ORDER_STATUS.expired
    }
  );
}

async function reconcileApprovedPayment({
  order,
  notification,
  payment,
  providerEventId,
  paymentEventRecord,
  repository,
  confirmationEmailSender,
  adminNotificationEmailSender,
  now
}: {
  order: Order;
  notification: MercadoPagoWebhookNotification;
  payment: MercadoPagoPayment;
  providerEventId: string;
  paymentEventRecord: PaymentEventRecord | null;
  repository: PaymentReconciliationRepository;
  confirmationEmailSender: OrderConfirmationEmailSender;
  adminNotificationEmailSender: AdminOrderNotificationEmailSender;
  now: Date | string;
}): Promise<PaymentReconciliationResult> {
  if (order.status === ORDER_STATUS.expired) {
    return {
      status: "manual_review_required",
      orderId: order.id,
      providerPaymentId: payment.id,
      orderStatus: ORDER_STATUS.expired
    };
  }

  if (order.status !== ORDER_STATUS.pendingPayment) {
    return {
      status: "ignored",
      reason: "already_reconciled",
      providerPaymentId: payment.id
    };
  }

  const settlementResult = await repository.markOrderPaidAndDecrementStock({
    orderId: order.id,
    reason: "payment_approved",
    paymentEvent: paymentEventRecord ?? undefined
  });

  if (settlementResult.status === "insufficient_stock") {
    await repository.updateOrderStatus({
      orderId: settlementResult.order.id,
      status: ORDER_STATUS.expired,
      reason: "insufficient_stock_on_payment"
    });
    await repository.recordPaymentEvent(
      buildPaymentEventRecord({
        notification,
        payment,
        orderId: settlementResult.order.id,
        providerEventId: getInsufficientStockProviderEventId(providerEventId),
        processingResult: PAYMENT_MANUAL_REVIEW_PROCESSING_RESULT,
        receivedAt: getDate(now, "now").toISOString()
      })
    );

    return {
      status: "manual_review_required",
      orderId: settlementResult.order.id,
      providerPaymentId: payment.id,
      orderStatus: ORDER_STATUS.expired
    };
  }

  if (settlementResult.status === "already_reconciled") {
    return {
      status: "ignored",
      reason: "already_reconciled",
      providerPaymentId: payment.id
    };
  }

  if (settlementResult.status === "duplicate") {
    return {
      status: "duplicate",
      orderId: settlementResult.event.orderId,
      providerPaymentId: settlementResult.event.providerPaymentId
    };
  }

  const { confirmationEmail, adminNotification } =
    await sendPaidOrderEmailsSafely({
      order: settlementResult.order,
      confirmationEmailSender,
      adminNotificationEmailSender
    });

  return {
    status: "paid",
    orderId: order.id,
    providerPaymentId: payment.id,
    orderStatus: ORDER_STATUS.paid,
    confirmationEmail,
    adminNotification
  };
}

async function markOrderPaidAndDecrementStockInStore({
  orderId,
  reason = "payment_approved",
  actor = "system",
  paymentEvent
}: {
  orderId: string;
  reason?: string;
  actor?: string;
  paymentEvent?: PaymentEventRecord;
}): Promise<ApprovedPaymentSettlementResult> {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return {
      status: "already_reconciled",
      order: null
    };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (paymentEvent) {
        try {
          await tx.paymentEvent.create({
            data: mapPaymentEventRecordToRow(paymentEvent)
          });
        } catch (error) {
          if (isPrismaKnownError(error, "P2002")) {
            throw new DuplicatePaymentEventSettlementError(paymentEvent);
          }

          throw error;
        }
      }

      const existingOrder = await tx.order.findUnique({
        where: {
          id: normalizedOrderId
        },
        include: {
          items: true
        }
      });

      if (!existingOrder) {
        throw new AlreadyReconciledSettlementError(null);
      }

      const currentOrder = mapOrderRecordToOrder(existingOrder);

      if (existingOrder.status !== ORDER_STATUS.pendingPayment) {
        throw new AlreadyReconciledSettlementError(currentOrder);
      }

      const paidOrderUpdate = await tx.order.updateMany({
        where: {
          id: normalizedOrderId,
          status: ORDER_STATUS.pendingPayment
        },
        data: {
          status: ORDER_STATUS.paid
        }
      });

      if (paidOrderUpdate.count !== 1) {
        const latestOrder = await tx.order.findUnique({
          where: {
            id: normalizedOrderId
          },
          include: {
            items: true
          }
        });

        throw new AlreadyReconciledSettlementError(
          latestOrder ? mapOrderRecordToOrder(latestOrder) : null
        );
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: normalizedOrderId,
          fromStatus: existingOrder.status,
          toStatus: ORDER_STATUS.paid,
          reason,
          actor
        }
      });

      for (const [variantId, quantity] of getVariantQuantityTotals(
        existingOrder.items
      )) {
        const updatedRows = await tx.$executeRaw`
          UPDATE "product_variants"
          SET "stock" = "stock" - ${quantity},
              "updated_at" = NOW()
          WHERE "id" = ${variantId}
            AND "stock" >= ${quantity}
        `;

        if (updatedRows !== 1) {
          throw new InsufficientStockSettlementError(currentOrder);
        }
      }

      const paidOrder = await tx.order.findUnique({
        where: {
          id: normalizedOrderId
        },
        include: {
          items: true
        }
      });

      if (!paidOrder) {
        throw new Error("Paid order disappeared during payment settlement.");
      }

      return {
        status: "paid",
        order: mapOrderRecordToOrder(paidOrder)
      };
    });
  } catch (error) {
    if (error instanceof InsufficientStockSettlementError) {
      return {
        status: "insufficient_stock",
        order: error.order
      };
    }

    if (error instanceof DuplicatePaymentEventSettlementError) {
      return {
        status: "duplicate",
        event:
          (await findPaymentEventByIdentity({
            provider: error.event.provider,
            providerEventId: error.event.providerEventId
          })) ?? error.event
      };
    }

    if (error instanceof AlreadyReconciledSettlementError) {
      return {
        status: "already_reconciled",
        order: error.order
      };
    }

    throw error;
  }
}

function getVariantQuantityTotals(
  items: readonly { variantId: string; quantity: number }[]
): Map<string, number> {
  const totals = new Map<string, number>();

  for (const item of items) {
    totals.set(item.variantId, (totals.get(item.variantId) ?? 0) + item.quantity);
  }

  return totals;
}

async function sendConfirmationEmailSafely(
  confirmationEmailSender: OrderConfirmationEmailSender,
  order: Order
): Promise<OrderConfirmationEmailResult> {
  try {
    return await confirmationEmailSender(order);
  } catch {
    return {
      status: "failed",
      orderId: order.id,
      recipientEmail: order.contact.email,
      message: "No pudimos enviar el email transaccional."
    };
  }
}

async function sendPaidOrderEmailsSafely({
  order,
  confirmationEmailSender,
  adminNotificationEmailSender
}: {
  order: Order;
  confirmationEmailSender: OrderConfirmationEmailSender;
  adminNotificationEmailSender: AdminOrderNotificationEmailSender;
}): Promise<{
  confirmationEmail: OrderConfirmationEmailResult;
  adminNotification: AdminOrderNotificationResult;
}> {
  const [confirmationEmail, adminNotification] = await Promise.all([
    sendConfirmationEmailSafely(confirmationEmailSender, order),
    sendAdminNotificationEmailSafely(adminNotificationEmailSender, order)
  ]);

  return {
    confirmationEmail,
    adminNotification
  };
}

async function sendAdminNotificationEmailSafely(
  adminNotificationEmailSender: AdminOrderNotificationEmailSender,
  order: Order
): Promise<AdminOrderNotificationResult> {
  try {
    return await adminNotificationEmailSender(order);
  } catch {
    return {
      status: "failed",
      orderId: order.id,
      recipientEmail: "",
      message: "No pudimos enviar el aviso interno de compra."
    };
  }
}

async function sendConfiguredAdminOrderNotificationOnce(
  order: Order
): Promise<AdminOrderNotificationResult> {
  return sendAdminOrderNotificationOnce(order, {
    recipient: await getAdminNotificationRecipient()
  });
}

async function reconcileFailedPayment({
  order,
  payment,
  repository
}: {
  order: Order;
  payment: MercadoPagoPayment;
  repository: PaymentReconciliationRepository;
}): Promise<PaymentReconciliationResult> {
  if (order.status !== ORDER_STATUS.pendingPayment) {
    return {
      status: "ignored",
      reason: "already_reconciled",
      providerPaymentId: payment.id
    };
  }

  const updatedOrder = await repository.updateOrderStatus({
    orderId: order.id,
    status: ORDER_STATUS.paymentFailed,
    reason: "payment_failed"
  });

  return {
    status: "payment_failed",
    orderId: order.id,
    providerPaymentId: payment.id,
    orderStatus:
      updatedOrder?.status === ORDER_STATUS.paymentFailed
        ? updatedOrder.status
        : ORDER_STATUS.paymentFailed
  };
}

function createConfiguredMercadoPagoPaymentProvider({
  accessToken,
  apiBaseUrl
}: PaymentReconciliationConfig): MercadoPagoPaymentProvider {
  return async (providerPaymentId) => {
    const normalizedAccessToken = accessToken?.trim();

    if (!normalizedAccessToken) {
      return null;
    }

    return fetchMercadoPagoPayment(providerPaymentId, {
      accessToken: normalizedAccessToken,
      apiBaseUrl
    });
  };
}

function isPaymentNotification(
  notification: MercadoPagoWebhookNotification
): boolean {
  return (
    notification.type === "payment" ||
    notification.action.startsWith("payment.")
  );
}

function isVerifiedPaymentForNotification(
  payment: MercadoPagoPayment | null,
  notification: MercadoPagoWebhookNotification
): payment is MercadoPagoPayment {
  return Boolean(payment && payment.id === notification.dataId);
}

function isPaymentForOrder(
  payment: MercadoPagoPayment,
  order: Order
): boolean {
  return (
    getPaymentOrderId(payment) === order.id &&
    payment.transactionAmount === order.totalArs
  );
}

function getPaymentOrderId(payment: MercadoPagoPayment): string | null {
  return payment.externalReference ?? payment.metadata.internalOrderId;
}

function mapMercadoPagoPaymentStatus(
  status: string
): "approved" | "failed" | null {
  const normalizedStatus = status.trim().toLowerCase();

  if (normalizedStatus === "approved") {
    return "approved";
  }

  if (
    normalizedStatus === "rejected" ||
    normalizedStatus === "cancelled" ||
    normalizedStatus === "canceled"
  ) {
    return "failed";
  }

  return null;
}

function getProcessingResult(
  orderStatus: OrderStatus,
  providerStatus: ReturnType<typeof mapMercadoPagoPaymentStatus>
): string {
  if (!providerStatus) {
    return "ignored";
  }

  if (providerStatus === "approved") {
    return orderStatus === ORDER_STATUS.expired
      ? PAYMENT_MANUAL_REVIEW_PROCESSING_RESULT
      : orderStatus === ORDER_STATUS.pendingPayment
        ? "paid"
        : "ignored";
  }

  return orderStatus === ORDER_STATUS.pendingPayment
    ? "payment_failed"
    : "ignored";
}

function buildPaymentEventRecord({
  notification,
  payment,
  orderId,
  providerEventId,
  processingResult,
  receivedAt
}: {
  notification: MercadoPagoWebhookNotification;
  payment: MercadoPagoPayment;
  orderId: string;
  providerEventId: string;
  processingResult: string;
  receivedAt: string;
}): PaymentEventRecord {
  return {
    provider: "mercado_pago",
    providerEventId,
    providerPaymentId: payment.id,
    orderId,
    type: notification.type,
    action: notification.action,
    providerStatus: payment.status,
    processingResult,
    receivedAt
  };
}

function getProviderEventId(
  notification: MercadoPagoWebhookNotification,
  payment: MercadoPagoPayment
): string {
  if (notification.id !== notification.dataId) {
    return notification.id;
  }

  return `${notification.dataId}:${notification.action}:${payment.status}`;
}

function getInsufficientStockProviderEventId(providerEventId: string): string {
  return `${providerEventId}:insufficient_stock`;
}

class InsufficientStockSettlementError extends Error {
  constructor(readonly order: Order) {
    super("Insufficient stock during paid order settlement.");
    this.name = "InsufficientStockSettlementError";
  }
}

class DuplicatePaymentEventSettlementError extends Error {
  constructor(readonly event: PaymentEventRecord) {
    super("Payment event was already claimed during payment settlement.");
    this.name = "DuplicatePaymentEventSettlementError";
  }
}

class AlreadyReconciledSettlementError extends Error {
  constructor(readonly order: Order | null) {
    super("Order was already reconciled during payment settlement.");
    this.name = "AlreadyReconciledSettlementError";
  }
}

function isPrismaKnownError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

function getDate(value: Date | string, name: string): Date {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`${name} must be a valid date`);
  }

  return date;
}
