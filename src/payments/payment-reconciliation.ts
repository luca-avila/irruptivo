import { ORDER_STATUS, type OrderStatus } from "../domain/rules";
import { type Order } from "../orders/order-creation";
import {
  findOrderByIdInStore,
  releaseReservedStockForOrderInStore,
  updateOrderStatusInStore
} from "../orders/order-store";
import { type StockReservationReleaseResult } from "../orders/stock-reservation";
import {
  recordPaymentEventOnce,
  type PaymentEventRecord
} from "./payment-events";
import {
  fetchMercadoPagoPayment,
  type MercadoPagoPayment,
  type MercadoPagoWebhookNotification
} from "./mercado-pago-webhook";

export type { MercadoPagoPayment } from "./mercado-pago-webhook";

export type PaymentReconciliationOrderRepository = {
  findOrderById: (orderId: string) => Order | null;
  updateOrderStatus: (input: {
    orderId: string;
    status: OrderStatus;
  }) => Order | null;
  releaseReservedStockForOrder: (
    orderId: string
  ) => StockReservationReleaseResult;
};

export type MercadoPagoPaymentProvider = (
  providerPaymentId: string
) => Promise<MercadoPagoPayment | null>;

export type PaymentReconciliationConfig = {
  accessToken?: string | null;
  apiBaseUrl?: string | null;
};

export type ReconcileMercadoPagoEventOptions = {
  paymentProvider?: MercadoPagoPaymentProvider;
  orderRepository?: PaymentReconciliationOrderRepository;
  config?: PaymentReconciliationConfig;
  now?: Date | string;
};

export type PaymentReconciliationResult =
  | {
      status: "paid";
      orderId: string;
      providerPaymentId: string;
      orderStatus: typeof ORDER_STATUS.paid;
    }
  | {
      status: "payment_failed";
      orderId: string;
      providerPaymentId: string;
      orderStatus: typeof ORDER_STATUS.paymentFailed;
      releasedReservationCount: number;
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

const defaultOrderRepository: PaymentReconciliationOrderRepository = {
  findOrderById: findOrderByIdInStore,
  updateOrderStatus: updateOrderStatusInStore,
  releaseReservedStockForOrder: releaseReservedStockForOrderInStore
};

export async function reconcileMercadoPagoEvent(
  notification: MercadoPagoWebhookNotification,
  {
    paymentProvider,
    orderRepository = defaultOrderRepository,
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

  const order = orderRepository.findOrderById(orderId);

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

  const providerStatus = mapMercadoPagoPaymentStatus(payment.status);
  const processingResult = getProcessingResult(order.status, providerStatus);
  const recordResult = recordPaymentEventOnce(
    buildPaymentEventRecord({
      notification,
      payment,
      orderId: order.id,
      processingResult,
      receivedAt: getDate(now, "now").toISOString()
    })
  );

  if (recordResult.status === "duplicate") {
    return {
      status: "duplicate",
      orderId: recordResult.event.orderId,
      providerPaymentId: recordResult.event.providerPaymentId
    };
  }

  if (!providerStatus) {
    return {
      status: "ignored",
      reason: "unsupported_payment_status",
      providerPaymentId: payment.id
    };
  }

  if (providerStatus === "approved") {
    return reconcileApprovedPayment({
      order,
      payment,
      orderRepository
    });
  }

  return reconcileFailedPayment({
    order,
    payment,
    orderRepository
  });
}

function reconcileApprovedPayment({
  order,
  payment,
  orderRepository
}: {
  order: Order;
  payment: MercadoPagoPayment;
  orderRepository: PaymentReconciliationOrderRepository;
}): PaymentReconciliationResult {
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

  const updatedOrder = orderRepository.updateOrderStatus({
    orderId: order.id,
    status: ORDER_STATUS.paid
  });

  return {
    status: "paid",
    orderId: order.id,
    providerPaymentId: payment.id,
    orderStatus: updatedOrder?.status === ORDER_STATUS.paid
      ? updatedOrder.status
      : ORDER_STATUS.paid
  };
}

function reconcileFailedPayment({
  order,
  payment,
  orderRepository
}: {
  order: Order;
  payment: MercadoPagoPayment;
  orderRepository: PaymentReconciliationOrderRepository;
}): PaymentReconciliationResult {
  if (order.status !== ORDER_STATUS.pendingPayment) {
    return {
      status: "ignored",
      reason: "already_reconciled",
      providerPaymentId: payment.id
    };
  }

  const updatedOrder = orderRepository.updateOrderStatus({
    orderId: order.id,
    status: ORDER_STATUS.paymentFailed
  });
  const releaseResult = orderRepository.releaseReservedStockForOrder(order.id);

  return {
    status: "payment_failed",
    orderId: order.id,
    providerPaymentId: payment.id,
    orderStatus:
      updatedOrder?.status === ORDER_STATUS.paymentFailed
        ? updatedOrder.status
        : ORDER_STATUS.paymentFailed,
    releasedReservationCount: releaseResult.releasedReservations.length
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
      ? "manual_review_required"
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
  processingResult,
  receivedAt
}: {
  notification: MercadoPagoWebhookNotification;
  payment: MercadoPagoPayment;
  orderId: string;
  processingResult: string;
  receivedAt: string;
}): PaymentEventRecord {
  return {
    provider: "mercado_pago",
    providerEventId: getProviderEventId(notification, payment),
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

function getDate(value: Date | string, name: string): Date {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`${name} must be a valid date`);
  }

  return date;
}
