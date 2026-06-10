import {
  DELIVERY_METHOD,
  ORDER_STATUS,
  getDeliveryMethodLabel,
  getOrderStatusLabel,
  isAdminPaymentLockedOrderStatus,
  type OrderStatus
} from "../domain/rules";
import {
  type Order,
  type PendingOrderItemSnapshot
} from "../orders/order-creation";
import {
  findOrderByIdInStore,
  readOrderStoreSnapshot
} from "../orders/order-store";
import {
  getPaymentManualReviewForOrder,
  type PaymentManualReviewState
} from "../payments/payment-events";
import { isOrderEditableAfterPayment } from "./order-fulfillment-edits";
import {
  getAllowedAdminTransitions,
  type AdminAllowedFulfillmentTransition
} from "./order-transitions";
import {
  getFulfillmentUpdateEmailDeliveryKind,
  isFulfillmentUpdateEmailStatus
} from "../notifications/fulfillment-update-email";
import {
  readOrderEmailDeliveryByOrderIdAndKind,
  type EmailDeliveryKind,
  type OrderConfirmationEmailDeliveryRecord,
  type OrderConfirmationEmailDeliveryStatus
} from "../notifications/order-confirmation-email";

export type AdminOrderRepository = {
  listOrders: () => Promise<readonly Order[]>;
  findOrderById: (orderId: string) => Promise<Order | null>;
};

export type AdminOrderProjectionOptions = {
  orderRepository?: AdminOrderRepository;
  getManualReviewForOrder?: (
    orderId: string
  ) => Promise<PaymentManualReviewState>;
  readEmailDelivery?: AdminOrderEmailDeliveryReader;
};

export type AdminOrderListInput = {
  filter?: string | null;
};

export type AdminOrderFilterOptionView = {
  label: string;
  value: string;
  isActive: boolean;
  orderCount: number;
};

export type AdminOrderListItemView = {
  id: string;
  orderNumber: string;
  customerName: string;
  createdAtLabel: string;
  statusLabel: string;
  statusTone: AdminOrderStatusTone;
  deliveryMethodLabel: string;
  shippingLocationLabel: string | null;
  totalLabel: string;
  detailHref: string;
  manualReviewRequired: boolean;
  manualReviewLabel: string | null;
};

export type AdminOrderListView = {
  orders: AdminOrderListItemView[];
  filters: AdminOrderFilterOptionView[];
  activeFilterLabel: string;
  activeFilterValue: string;
  emptyState: AdminOrderEmptyState | null;
  totalOrderCount: number;
  visibleOrderCount: number;
  queueOrderCount: number;
  manualReviewCount: number;
};

export type AdminOrderEmptyState = {
  title: string;
  description: string;
};

export type AdminOrderDetailView = {
  id: string;
  orderNumber: string;
  createdAtLabel: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  statusLabel: string;
  statusTone: AdminOrderStatusTone;
  delivery: {
    methodLabel: string;
    requiresShippingAddress: boolean;
    shippingAddress: AdminOrderShippingAddressView | null;
    notes: string | null;
    notesFallback: string;
  };
  fulfillmentEdit: {
    canEdit: boolean;
    unavailableReason: string | null;
    adminNotes: string | null;
    adminNotesFallback: string;
  };
  items: AdminOrderDetailItemView[];
  financial: AdminOrderFinancialView;
  payment: AdminOrderPaymentView;
  manualReview: AdminOrderManualReviewView;
  fulfillment: AdminOrderFulfillmentView;
};

export type AdminOrderShippingAddressView = {
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
  locationLabel: string;
};

export type AdminOrderDetailItemView = {
  productName: string;
  productSlug: string;
  productAreaLabel: string;
  variantName: string;
  sku: string;
  optionSummary: string;
  quantityLabel: string;
  unitPriceLabel: string;
  lineTotalLabel: string;
};

export type AdminOrderFinancialView = {
  readOnlyLabel: "Solo lectura";
  fields: AdminOrderFinancialFieldView[];
};

export type AdminOrderFinancialFieldView = {
  label: string;
  value: string;
  isReadOnly: true;
};

export type AdminOrderPaymentView = {
  statusLabel: string;
  providerLabel: string;
  preferenceLabel: string;
};

export type AdminOrderManualReviewView = PaymentManualReviewState & {
  latestEventAtLabel: string | null;
};

export type AdminOrderFulfillmentView = {
  actions: AdminAllowedFulfillmentTransition[];
  unavailableReason: string | null;
  notification: AdminOrderFulfillmentNotificationView | null;
};

export type AdminOrderFulfillmentNotificationView = {
  kind: EmailDeliveryKind;
  canResend: boolean;
  statusLabel: string;
};

export type AdminOrderStatusTone =
  | "confirmed"
  | "danger"
  | "done"
  | "in-progress"
  | "neutral"
  | "ready"
  | "sent"
  | "warning";

type AdminOrderFilterDefinition = {
  label: string;
  value: string;
  statuses: readonly OrderStatus[];
  emptyState: AdminOrderEmptyState;
};

type AdminOrderEmailDeliveryReader = (input: {
  orderId: string;
  kind: EmailDeliveryKind;
}) => Promise<OrderConfirmationEmailDeliveryRecord | null>;

const DEFAULT_QUEUE_STATUSES = [
  ORDER_STATUS.paid,
  ORDER_STATUS.preparing,
  ORDER_STATUS.readyForPickup,
  ORDER_STATUS.shipped
] as readonly OrderStatus[];

const ADMIN_ORDER_FILTERS = [
  {
    label: "Cola activa",
    value: "cola",
    statuses: DEFAULT_QUEUE_STATUSES,
    emptyState: {
      title: "No hay pedidos para preparar.",
      description:
        "Cuando se confirme un pago o avance un cumplimiento, va a aparecer en esta cola."
    }
  },
  {
    label: "Pago pendiente",
    value: "pago-pendiente",
    statuses: [ORDER_STATUS.pendingPayment],
    emptyState: {
      title: "No hay pedidos con pago pendiente.",
      description: "Los pedidos pendientes van a aparecer acá hasta que paguen o venzan."
    }
  },
  {
    label: "Pago rechazado",
    value: "pago-rechazado",
    statuses: [ORDER_STATUS.paymentFailed],
    emptyState: {
      title: "No hay pagos rechazados.",
      description: "Los pagos rechazados quedan en historial para consulta operativa."
    }
  },
  {
    label: "Pago vencido",
    value: "vencidos",
    statuses: [ORDER_STATUS.expired],
    emptyState: {
      title: "No hay pedidos vencidos.",
      description: "Los pedidos sin pago confirmado dentro de la ventana quedan acá."
    }
  },
  {
    label: "Entregados",
    value: "entregados",
    statuses: [ORDER_STATUS.delivered],
    emptyState: {
      title: "No hay pedidos entregados.",
      description: "El historial de envíos finalizados va a aparecer en este filtro."
    }
  },
  {
    label: "Retirados",
    value: "retirados",
    statuses: [ORDER_STATUS.pickedUp],
    emptyState: {
      title: "No hay pedidos retirados.",
      description: "El historial de retiros finalizados va a aparecer en este filtro."
    }
  }
] as readonly AdminOrderFilterDefinition[];

const DEFAULT_FILTER = ADMIN_ORDER_FILTERS[0];

const defaultOrderRepository: AdminOrderRepository = {
  listOrders: async () => (await readOrderStoreSnapshot()).orders,
  findOrderById: findOrderByIdInStore
};

const defaultEmailDeliveryReader: AdminOrderEmailDeliveryReader =
  readOrderEmailDeliveryByOrderIdAndKind;

export async function listAdminOrders(
  input: AdminOrderListInput = {},
  {
    orderRepository = defaultOrderRepository,
    getManualReviewForOrder = getPaymentManualReviewForOrder
  }: AdminOrderProjectionOptions = {}
): Promise<AdminOrderListView> {
  const orders = await orderRepository.listOrders();
  const manualReviews = await getManualReviewsByOrderId(
    orders,
    getManualReviewForOrder
  );
  const activeFilter = getFilterDefinition(input.filter);
  const visibleOrders = orders
    .filter((order) => activeFilter.statuses.includes(order.status))
    .sort(sortOrdersByMostRecent)
    .map((order) =>
      getAdminOrderListItemView(
        order,
        manualReviews.get(order.id) ?? getNeutralManualReviewState()
      )
    );
  const queueOrderCount = orders.filter((order) =>
    DEFAULT_QUEUE_STATUSES.includes(order.status)
  ).length;
  const manualReviewCount = [...manualReviews.values()].filter(
    (manualReview) => manualReview.required
  ).length;

  return {
    orders: visibleOrders,
    filters: getFilterOptionViews(orders, activeFilter),
    activeFilterLabel: activeFilter.label,
    activeFilterValue: activeFilter.value,
    emptyState: visibleOrders.length === 0 ? activeFilter.emptyState : null,
    totalOrderCount: orders.length,
    visibleOrderCount: visibleOrders.length,
    queueOrderCount,
    manualReviewCount
  };
}

export async function getAdminOrderDetail(
  orderId: string,
  {
    orderRepository = defaultOrderRepository,
    getManualReviewForOrder = getPaymentManualReviewForOrder,
    readEmailDelivery = defaultEmailDeliveryReader
  }: AdminOrderProjectionOptions = {}
): Promise<AdminOrderDetailView | null> {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return null;
  }

  const order = await orderRepository.findOrderById(normalizedOrderId);

  if (!order) {
    return null;
  }

  const [manualReview, fulfillmentNotification] = await Promise.all([
    getManualReviewForOrder(order.id),
    getAdminOrderFulfillmentNotificationView(order, readEmailDelivery)
  ]);

  return getAdminOrderDetailView(order, manualReview, fulfillmentNotification);
}

function getAdminOrderListItemView(
  order: Order,
  manualReview: PaymentManualReviewState
): AdminOrderListItemView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.contact.fullName,
    createdAtLabel: formatDateTime(order.createdAt),
    statusLabel: getOrderStatusLabel(order.status),
    statusTone: getStatusTone(order.status),
    deliveryMethodLabel: getDeliveryMethodLabel(order.delivery.method),
    shippingLocationLabel: getShippingLocationLabel(order),
    totalLabel: formatPriceArs(order.totalArs),
    detailHref: `/admin/pedidos/${encodeURIComponent(order.id)}`,
    manualReviewRequired: manualReview.required,
    manualReviewLabel: manualReview.required ? manualReview.label : null
  };
}

async function getManualReviewsByOrderId(
  orders: readonly Order[],
  getManualReviewForOrder: (
    orderId: string
  ) => Promise<PaymentManualReviewState>
): Promise<Map<string, PaymentManualReviewState>> {
  return new Map(
    await Promise.all(
      orders.map(async (order) => [
        order.id,
        await getManualReviewForOrder(order.id)
      ] as const)
    )
  );
}

function getNeutralManualReviewState(): PaymentManualReviewState {
  return {
    required: false,
    label: "Sin revisión manual",
    description: "No hay pagos tardíos pendientes de revisión para este pedido.",
    providerPaymentIds: [],
    latestEventAt: null
  };
}

function getAdminOrderDetailView(
  order: Order,
  manualReview: PaymentManualReviewState,
  fulfillmentNotification: AdminOrderFulfillmentNotificationView | null
): AdminOrderDetailView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAtLabel: formatDateTime(order.createdAt),
    customer: {
      ...order.contact
    },
    statusLabel: getOrderStatusLabel(order.status),
    statusTone: getStatusTone(order.status),
    delivery: {
      methodLabel: getDeliveryMethodLabel(order.delivery.method),
      requiresShippingAddress: order.delivery.method === DELIVERY_METHOD.shipping,
      shippingAddress: getShippingAddressView(order),
      notes: order.delivery.notes,
      notesFallback: "Sin notas cargadas."
    },
    fulfillmentEdit: {
      canEdit: isOrderEditableAfterPayment(order),
      unavailableReason: isOrderEditableAfterPayment(order)
        ? null
        : "Los datos operativos se pueden editar cuando el pago está confirmado.",
      adminNotes: order.adminNotes ?? null,
      adminNotesFallback: "Sin notas internas cargadas."
    },
    items: order.items.map(getDetailItemView),
    financial: {
      readOnlyLabel: "Solo lectura",
      fields: [
        {
          label: "Subtotal",
          value: formatPriceArs(order.subtotalArs),
          isReadOnly: true
        },
        {
          label: "Costo de entrega",
          value: formatPriceArs(order.deliveryCostArs),
          isReadOnly: true
        },
        {
          label: "Total pagado",
          value: formatPriceArs(order.totalArs),
          isReadOnly: true
        }
      ]
    },
    payment: {
      statusLabel: getOrderStatusLabel(order.status),
      providerLabel: order.paymentPreference?.provider === "mercado_pago"
        ? "Mercado Pago"
        : "Sin preferencia asociada",
      preferenceLabel: order.paymentPreference?.preferenceId ?? "No registrada"
    },
    manualReview: {
      ...manualReview,
      providerPaymentIds: [...manualReview.providerPaymentIds],
      latestEventAtLabel: manualReview.latestEventAt
        ? formatDateTime(manualReview.latestEventAt)
        : null
    },
    fulfillment: getAdminOrderFulfillmentView(order, fulfillmentNotification)
  };
}

function getAdminOrderFulfillmentView(
  order: Order,
  notification: AdminOrderFulfillmentNotificationView | null
): AdminOrderFulfillmentView {
  const actions = getAllowedAdminTransitions(order);

  return {
    actions,
    unavailableReason:
      actions.length > 0 ? null : getAdminOrderFulfillmentUnavailableReason(order),
    notification
  };
}

async function getAdminOrderFulfillmentNotificationView(
  order: Order,
  readEmailDelivery: AdminOrderEmailDeliveryReader
): Promise<AdminOrderFulfillmentNotificationView | null> {
  if (!isFulfillmentUpdateEmailStatus(order.status)) {
    return null;
  }

  const kind = getFulfillmentUpdateEmailDeliveryKind(order.status);

  if (!kind) {
    return null;
  }

  const delivery = await readEmailDelivery({
    orderId: order.id,
    kind
  });

  return {
    kind,
    canResend: delivery?.status !== "sent",
    statusLabel: getEmailDeliveryStatusLabel(delivery?.status ?? null)
  };
}

function getEmailDeliveryStatusLabel(
  status: OrderConfirmationEmailDeliveryStatus | null
): string {
  switch (status) {
    case "sent":
      return "Email enviado";
    case "sending":
      return "Envío pendiente";
    case "configuration_missing":
      return "Falta configuración de email";
    case "failed":
      return "Falló el envío";
    case null:
    default:
      return "Email no enviado";
  }
}

function getAdminOrderFulfillmentUnavailableReason(order: Order): string {
  if (isAdminPaymentLockedOrderStatus(order.status)) {
    return `No se puede avanzar desde ${getOrderStatusLabel(order.status)}.`;
  }

  return "Este pedido ya no tiene pasos de cumplimiento disponibles.";
}

function getDetailItemView(
  item: PendingOrderItemSnapshot
): AdminOrderDetailItemView {
  return {
    productName: item.productName,
    productSlug: item.productSlug,
    productAreaLabel: item.productArea === "clothing" ? "Colección" : "Suplementos",
    variantName: item.variantName,
    sku: item.sku,
    optionSummary: item.optionSummary,
    quantityLabel: formatUnitCount(item.quantity),
    unitPriceLabel: formatPriceArs(item.unitPriceArs),
    lineTotalLabel: formatPriceArs(item.lineTotalArs)
  };
}

function getFilterOptionViews(
  orders: readonly Order[],
  activeFilter: AdminOrderFilterDefinition
): AdminOrderFilterOptionView[] {
  return ADMIN_ORDER_FILTERS.map((filter) => ({
    label: filter.label,
    value: filter.value,
    isActive: filter.value === activeFilter.value,
    orderCount: orders.filter((order) => filter.statuses.includes(order.status)).length
  }));
}

function getFilterDefinition(
  filterValue: string | null | undefined
): AdminOrderFilterDefinition {
  const normalizedValue = filterValue?.trim() ?? "";

  return (
    ADMIN_ORDER_FILTERS.find((filter) => filter.value === normalizedValue) ??
    DEFAULT_FILTER
  );
}

function sortOrdersByMostRecent(first: Order, second: Order): number {
  const firstTime = Date.parse(first.createdAt);
  const secondTime = Date.parse(second.createdAt);

  if (firstTime !== secondTime) {
    return secondTime - firstTime;
  }

  return second.orderNumber.localeCompare(first.orderNumber, "es-AR");
}

function getShippingLocationLabel(order: Order): string | null {
  if (
    order.delivery.method !== DELIVERY_METHOD.shipping ||
    !order.delivery.shippingAddress
  ) {
    return null;
  }

  return `${order.delivery.shippingAddress.city}, ${order.delivery.shippingAddress.province}`;
}

function getShippingAddressView(order: Order): AdminOrderShippingAddressView | null {
  const address = order.delivery.shippingAddress;

  if (order.delivery.method !== DELIVERY_METHOD.shipping || !address) {
    return null;
  }

  return {
    ...address,
    locationLabel: `${address.city}, ${address.province}`
  };
}

function getStatusTone(status: OrderStatus): AdminOrderStatusTone {
  switch (status) {
    case ORDER_STATUS.paid:
      return "confirmed";
    case ORDER_STATUS.paymentFailed:
      return "danger";
    case ORDER_STATUS.expired:
      return "warning";
    case ORDER_STATUS.preparing:
      return "in-progress";
    case ORDER_STATUS.readyForPickup:
      return "ready";
    case ORDER_STATUS.shipped:
      return "sent";
    case ORDER_STATUS.delivered:
    case ORDER_STATUS.pickedUp:
      return "done";
    case ORDER_STATUS.pendingPayment:
    default:
      return "neutral";
  }
}

function formatPriceArs(priceArs: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  })
    .format(priceArs)
    .replace(/\u00a0/g, " ");
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(new Date(value));
}

function formatUnitCount(quantity: number): string {
  return quantity === 1 ? "1 unidad" : `${quantity} unidades`;
}
