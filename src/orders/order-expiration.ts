import { ORDER_STATUS, type OrderStatus } from "../domain/rules";
import { type Order } from "./order-creation";
import {
  readOrderStoreSnapshot,
  releaseReservedStockForOrderInStore,
  updateOrderStatusInStore
} from "./order-store";
import { type StockReservationReleaseResult } from "./stock-reservation";

const PENDING_PAYMENT_EXPIRATION_MS = 30 * 60 * 1000;

export type PendingPaymentExpirationOrderRepository = {
  listOrders: () => readonly Order[];
  updateOrderStatus: (input: {
    orderId: string;
    status: OrderStatus;
  }) => Order | null;
  releaseReservedStockForOrder: (
    orderId: string
  ) => StockReservationReleaseResult;
};

export type ExpiredPendingPaymentOrder = {
  orderId: string;
  orderNumber: string;
  expiredAt: string;
  releasedReservationCount: number;
  releaseStatus: StockReservationReleaseResult["status"];
};

export type ExpirePendingPaymentOrdersResult = {
  expiredOrders: ExpiredPendingPaymentOrder[];
  checkedOrderCount: number;
  expiredOrderCount: number;
};

export type ExpirePendingPaymentOrdersOptions = {
  now?: Date | string;
  orderRepository?: PendingPaymentExpirationOrderRepository;
};

const defaultOrderRepository: PendingPaymentExpirationOrderRepository = {
  listOrders: () => readOrderStoreSnapshot().orders,
  updateOrderStatus: updateOrderStatusInStore,
  releaseReservedStockForOrder: releaseReservedStockForOrderInStore
};

export function expirePendingPaymentOrders({
  now = new Date(),
  orderRepository = defaultOrderRepository
}: ExpirePendingPaymentOrdersOptions = {}): ExpirePendingPaymentOrdersResult {
  const currentDate = getDate(now, "now");
  const expiredAt = currentDate.toISOString();
  const orders = orderRepository.listOrders();
  const expiredOrders: ExpiredPendingPaymentOrder[] = [];

  for (const order of orders) {
    if (!shouldExpirePendingPaymentOrder(order, currentDate)) {
      continue;
    }

    const updatedOrder = orderRepository.updateOrderStatus({
      orderId: order.id,
      status: ORDER_STATUS.expired
    });

    if (updatedOrder?.status !== ORDER_STATUS.expired) {
      continue;
    }

    const releaseResult = orderRepository.releaseReservedStockForOrder(order.id);

    expiredOrders.push({
      orderId: order.id,
      orderNumber: order.orderNumber,
      expiredAt,
      releasedReservationCount: releaseResult.releasedReservations.length,
      releaseStatus: releaseResult.status
    });
  }

  return {
    expiredOrders,
    checkedOrderCount: orders.length,
    expiredOrderCount: expiredOrders.length
  };
}

function shouldExpirePendingPaymentOrder(order: Order, now: Date): boolean {
  if (order.status !== ORDER_STATUS.pendingPayment) {
    return false;
  }

  const createdAt = getDate(order.createdAt, "order.createdAt");

  return now.getTime() - createdAt.getTime() >= PENDING_PAYMENT_EXPIRATION_MS;
}

function getDate(value: Date | string, name: string): Date {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`${name} must be a valid date`);
  }

  return date;
}
