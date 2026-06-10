import {
  getAllowedFulfillmentTransitions,
  getOrderStatusLabel,
  isAdminPaymentLockedOrderStatus,
  ORDER_STATUS,
  type OrderStatus
} from "../domain/rules";
import { type Order } from "../orders/order-creation";
import {
  findOrderByIdInStore,
  updateOrderStatusInStore
} from "../orders/order-store";
import {
  isFulfillmentUpdateEmailStatus,
  sendFulfillmentUpdateOnce,
  type FulfillmentUpdateEmailSender
} from "../notifications/fulfillment-update-email";

export const ADMIN_FULFILLMENT_TRANSITION_ACTION = {
  prepare: "preparar",
  markShipped: "registrar-envio",
  markDelivered: "registrar-entrega",
  markReadyForPickup: "marcar-listo-retiro",
  markPickedUp: "registrar-retiro"
} as const;

export type AdminFulfillmentTransitionActionId =
  (typeof ADMIN_FULFILLMENT_TRANSITION_ACTION)[keyof typeof ADMIN_FULFILLMENT_TRANSITION_ACTION];

export type AdminAllowedFulfillmentTransition = {
  id: AdminFulfillmentTransitionActionId;
  label: string;
  targetStatusLabel: string;
  description: string;
};

export type AdminOrderTransitionRepository = {
  findOrderById: (orderId: string) => Promise<Order | null>;
  updateOrderStatus: (input: {
    orderId: string;
    status: OrderStatus;
    reason?: string;
    actor?: string;
  }) => Promise<Order | null>;
};

export type TransitionOrderFulfillmentStatusInput = {
  orderId: string;
  actionId: string;
};

export type TransitionOrderFulfillmentStatusOptions = {
  orderRepository?: AdminOrderTransitionRepository;
  fulfillmentUpdateEmailSender?: FulfillmentUpdateEmailSender;
};

export type AdminOrderTransitionErrorCode =
  | "invalid_action"
  | "invalid_transition"
  | "order_not_found"
  | "payment_status_locked"
  | "terminal_status"
  | "update_failed";

export type AdminOrderTransitionResult =
  | {
      ok: true;
      order: Order;
      action: AdminAllowedFulfillmentTransition;
      message: string;
    }
  | {
      ok: false;
      error: {
        code: AdminOrderTransitionErrorCode;
        message: string;
      };
    };

type AdminFulfillmentTransitionDefinition = AdminAllowedFulfillmentTransition & {
  targetStatus: OrderStatus;
};

const ADMIN_FULFILLMENT_TRANSITIONS = [
  {
    id: ADMIN_FULFILLMENT_TRANSITION_ACTION.prepare,
    targetStatus: ORDER_STATUS.preparing,
    label: "Marcar en preparación",
    targetStatusLabel: getOrderStatusLabel(ORDER_STATUS.preparing),
    description: "Avanza el pedido al primer paso de cumplimiento."
  },
  {
    id: ADMIN_FULFILLMENT_TRANSITION_ACTION.markShipped,
    targetStatus: ORDER_STATUS.shipped,
    label: "Marcar enviado",
    targetStatusLabel: getOrderStatusLabel(ORDER_STATUS.shipped),
    description: "Avanza el envío al paso siguiente de cumplimiento."
  },
  {
    id: ADMIN_FULFILLMENT_TRANSITION_ACTION.markDelivered,
    targetStatus: ORDER_STATUS.delivered,
    label: "Marcar entregado",
    targetStatusLabel: getOrderStatusLabel(ORDER_STATUS.delivered),
    description: "Finaliza el camino de envío a domicilio."
  },
  {
    id: ADMIN_FULFILLMENT_TRANSITION_ACTION.markReadyForPickup,
    targetStatus: ORDER_STATUS.readyForPickup,
    label: "Marcar listo para retirar",
    targetStatusLabel: getOrderStatusLabel(ORDER_STATUS.readyForPickup),
    description: "Avanza el retiro al paso siguiente de cumplimiento."
  },
  {
    id: ADMIN_FULFILLMENT_TRANSITION_ACTION.markPickedUp,
    targetStatus: ORDER_STATUS.pickedUp,
    label: "Marcar retirado",
    targetStatusLabel: getOrderStatusLabel(ORDER_STATUS.pickedUp),
    description: "Finaliza el camino de retiro local."
  }
] as readonly AdminFulfillmentTransitionDefinition[];

const defaultOrderRepository: AdminOrderTransitionRepository = {
  findOrderById: findOrderByIdInStore,
  updateOrderStatus: updateOrderStatusInStore
};

export function getAllowedAdminTransitions(
  order: Order
): AdminAllowedFulfillmentTransition[] {
  if (isAdminPaymentLockedOrderStatus(order.status)) {
    return [];
  }

  const allowedStatuses = getAllowedFulfillmentTransitions({
    deliveryMethod: order.delivery.method,
    currentStatus: order.status
  });

  return ADMIN_FULFILLMENT_TRANSITIONS.filter((transition) =>
    allowedStatuses.includes(transition.targetStatus)
  ).map(toAllowedTransition);
}

export async function transitionOrderFulfillmentStatus(
  input: TransitionOrderFulfillmentStatusInput,
  {
    orderRepository = defaultOrderRepository,
    fulfillmentUpdateEmailSender = sendFulfillmentUpdateOnce
  }: TransitionOrderFulfillmentStatusOptions = {}
): Promise<AdminOrderTransitionResult> {
  const normalizedOrderId = input.orderId.trim();
  const transition = getTransitionDefinition(input.actionId);

  if (!transition) {
    return {
      ok: false,
      error: {
        code: "invalid_action",
        message: "La acción solicitada no existe."
      }
    };
  }

  if (!normalizedOrderId) {
    return {
      ok: false,
      error: {
        code: "order_not_found",
        message: "No encontramos el pedido para actualizar."
      }
    };
  }

  const order = await orderRepository.findOrderById(normalizedOrderId);

  if (!order) {
    return {
      ok: false,
      error: {
        code: "order_not_found",
        message: "No encontramos el pedido para actualizar."
      }
    };
  }

  if (isAdminPaymentLockedOrderStatus(order.status)) {
    return {
      ok: false,
      error: {
        code: "payment_status_locked",
        message: `El pedido está en ${getOrderStatusLabel(
          order.status
        )} y no puede avanzar desde cumplimiento.`
      }
    };
  }

  const allowedStatuses = getAllowedFulfillmentTransitions({
    deliveryMethod: order.delivery.method,
    currentStatus: order.status
  });

  if (allowedStatuses.length === 0) {
    return {
      ok: false,
      error: {
        code: "terminal_status",
        message: "Este pedido ya no tiene pasos de cumplimiento disponibles."
      }
    };
  }

  if (!allowedStatuses.includes(transition.targetStatus)) {
    return {
      ok: false,
      error: {
        code: "invalid_transition",
        message:
          "La acción no está disponible para el estado y método de entrega actuales."
      }
    };
  }

  const updatedOrder = await orderRepository.updateOrderStatus({
    orderId: order.id,
    status: transition.targetStatus,
    reason: "admin_transition",
    actor: "admin"
  });

  if (updatedOrder?.status !== transition.targetStatus) {
    return {
      ok: false,
      error: {
        code: "update_failed",
        message: "No pudimos guardar el nuevo estado del pedido."
      }
    };
  }

  if (isFulfillmentUpdateEmailStatus(updatedOrder.status)) {
    try {
      await fulfillmentUpdateEmailSender(updatedOrder);
    } catch {
      // Fulfillment emails are best-effort and must not block admin transitions.
    }
  }

  return {
    ok: true,
    order: updatedOrder,
    action: toAllowedTransition(transition),
    message: `Pedido actualizado: ${transition.targetStatusLabel}.`
  };
}

function getTransitionDefinition(
  actionId: string
): AdminFulfillmentTransitionDefinition | null {
  const normalizedActionId = actionId.trim();

  return (
    ADMIN_FULFILLMENT_TRANSITIONS.find(
      (transition) => transition.id === normalizedActionId
    ) ?? null
  );
}

function toAllowedTransition(
  transition: AdminFulfillmentTransitionDefinition
): AdminAllowedFulfillmentTransition {
  return {
    id: transition.id,
    label: transition.label,
    targetStatusLabel: transition.targetStatusLabel,
    description: transition.description
  };
}
