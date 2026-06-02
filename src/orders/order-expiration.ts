import { ORDER_STATUS, type OrderStatus } from "../domain/rules";
import { type Order } from "./order-creation";
import {
  readOrderStoreSnapshot,
  updateOrderStatusInStore
} from "./order-store";

const PENDING_PAYMENT_EXPIRATION_MS = 30 * 60 * 1000;

export type PendingPaymentExpirationOrderRepository = {
  listOrders: () => Promise<readonly Order[]>;
  updateOrderStatus: (input: {
    orderId: string;
    status: OrderStatus;
    reason?: string;
    actor?: string;
  }) => Promise<Order | null>;
};

export type ExpiredPendingPaymentOrder = {
  orderId: string;
  orderNumber: string;
  expiredAt: string;
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
  listOrders: async () => (await readOrderStoreSnapshot()).orders,
  updateOrderStatus: updateOrderStatusInStore
};

export async function expirePendingPaymentOrders({
  now = new Date(),
  orderRepository = defaultOrderRepository
}: ExpirePendingPaymentOrdersOptions = {}): Promise<ExpirePendingPaymentOrdersResult> {
  const currentDate = getDate(now, "now");
  const expiredAt = currentDate.toISOString();
  const orders = await orderRepository.listOrders();
  const expiredOrders = new Array<ExpiredPendingPaymentOrder>();

  for (const order of orders) {
    if (!shouldExpirePendingPaymentOrder(order, currentDate)) {
      continue;
    }

    const updatedOrder = await orderRepository.updateOrderStatus({
      orderId: order.id,
      status: ORDER_STATUS.expired,
      reason: "expired"
    });

    if (updatedOrder?.status !== ORDER_STATUS.expired) {
      continue;
    }

    expiredOrders.push({
      orderId: order.id,
      orderNumber: order.orderNumber,
      expiredAt
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
