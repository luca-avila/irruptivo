export const ORDER_STATUS = {
  pendingPayment: "pending_payment",
  paid: "paid",
  paymentFailed: "payment_failed",
  expired: "expired",
  preparing: "preparing",
  shipped: "shipped",
  delivered: "delivered",
  readyForPickup: "ready_for_pickup",
  pickedUp: "picked_up"
} as const;

export const ORDER_STATUSES = Object.values(ORDER_STATUS);

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LABEL = {
  [ORDER_STATUS.pendingPayment]: "Pago pendiente",
  [ORDER_STATUS.paid]: "Pago confirmado",
  [ORDER_STATUS.paymentFailed]: "Pago rechazado",
  [ORDER_STATUS.expired]: "Pago vencido",
  [ORDER_STATUS.preparing]: "En preparación",
  [ORDER_STATUS.shipped]: "Enviado",
  [ORDER_STATUS.delivered]: "Entregado",
  [ORDER_STATUS.readyForPickup]: "Listo para retirar",
  [ORDER_STATUS.pickedUp]: "Retirado"
} as const satisfies Record<OrderStatus, string>;

export type OrderStatusLabel =
  (typeof ORDER_STATUS_LABEL)[keyof typeof ORDER_STATUS_LABEL];

export const DELIVERY_METHOD = {
  shipping: "shipping",
  pickup: "pickup"
} as const;

export const DELIVERY_METHODS = Object.values(DELIVERY_METHOD);

export type DeliveryMethod =
  (typeof DELIVERY_METHOD)[keyof typeof DELIVERY_METHOD];

export const DELIVERY_METHOD_LABEL = {
  [DELIVERY_METHOD.shipping]: "Envío a domicilio",
  [DELIVERY_METHOD.pickup]: "Retiro local"
} as const satisfies Record<DeliveryMethod, string>;

export type DeliveryMethodLabel =
  (typeof DELIVERY_METHOD_LABEL)[keyof typeof DELIVERY_METHOD_LABEL];

export const DELIVERY_COST_ARS = {
  [DELIVERY_METHOD.shipping]: 5000,
  [DELIVERY_METHOD.pickup]: 0
} as const satisfies Record<DeliveryMethod, number>;

export const AVAILABILITY_LABEL = {
  available: "Disponible",
  lowStock: "Últimas unidades",
  outOfStock: "Sin stock"
} as const;

export type AvailabilityLabel =
  (typeof AVAILABILITY_LABEL)[keyof typeof AVAILABILITY_LABEL];

type PriceResolutionInput = {
  productBasePriceArs: number;
  variantPriceOverrideArs?: number | null;
};

type LineTotalInput = {
  unitPriceArs: number;
  quantity: number;
};

type OrderTotalInput = {
  subtotalArs: number;
  deliveryMethod: DeliveryMethod;
};

type FulfillmentTransitionInput = {
  deliveryMethod: DeliveryMethod;
  currentStatus: OrderStatus;
};

const SHIPPING_FULFILLMENT_TRANSITIONS = {
  [ORDER_STATUS.paid]: [ORDER_STATUS.preparing],
  [ORDER_STATUS.preparing]: [ORDER_STATUS.shipped],
  [ORDER_STATUS.shipped]: [ORDER_STATUS.delivered]
} as const satisfies Partial<Record<OrderStatus, readonly OrderStatus[]>>;

const PICKUP_FULFILLMENT_TRANSITIONS = {
  [ORDER_STATUS.paid]: [ORDER_STATUS.preparing],
  [ORDER_STATUS.preparing]: [ORDER_STATUS.readyForPickup],
  [ORDER_STATUS.readyForPickup]: [ORDER_STATUS.pickedUp]
} as const satisfies Partial<Record<OrderStatus, readonly OrderStatus[]>>;

const FULFILLMENT_TRANSITIONS = {
  [DELIVERY_METHOD.shipping]: SHIPPING_FULFILLMENT_TRANSITIONS,
  [DELIVERY_METHOD.pickup]: PICKUP_FULFILLMENT_TRANSITIONS
} as const satisfies Record<
  DeliveryMethod,
  Partial<Record<OrderStatus, readonly OrderStatus[]>>
>;

export function getDeliveryCost(deliveryMethod: DeliveryMethod): number {
  return DELIVERY_COST_ARS[deliveryMethod];
}

export function getDeliveryMethodLabel(
  deliveryMethod: DeliveryMethod
): DeliveryMethodLabel {
  return DELIVERY_METHOD_LABEL[deliveryMethod];
}

export function getOrderStatusLabel(orderStatus: OrderStatus): OrderStatusLabel {
  return ORDER_STATUS_LABEL[orderStatus];
}

export function getAvailabilityLabel(availableStock: number): AvailabilityLabel {
  assertNonNegativeInteger(availableStock, "availableStock");

  if (availableStock === 0) {
    return AVAILABILITY_LABEL.outOfStock;
  }

  if (availableStock <= 3) {
    return AVAILABILITY_LABEL.lowStock;
  }

  return AVAILABILITY_LABEL.available;
}

export function resolveUnitPrice({
  productBasePriceArs,
  variantPriceOverrideArs
}: PriceResolutionInput): number {
  assertMoney(productBasePriceArs, "productBasePriceArs");

  if (variantPriceOverrideArs === null || variantPriceOverrideArs === undefined) {
    return productBasePriceArs;
  }

  assertMoney(variantPriceOverrideArs, "variantPriceOverrideArs");
  return variantPriceOverrideArs;
}

export function calculateLineTotal({
  unitPriceArs,
  quantity
}: LineTotalInput): number {
  assertMoney(unitPriceArs, "unitPriceArs");
  assertPositiveInteger(quantity, "quantity");

  return unitPriceArs * quantity;
}

export function calculateSubtotal(lineTotalsArs: readonly number[]): number {
  return lineTotalsArs.reduce((subtotal, lineTotalArs, index) => {
    assertMoney(lineTotalArs, `lineTotalsArs[${index}]`);
    return subtotal + lineTotalArs;
  }, 0);
}

export function calculateOrderTotal({
  subtotalArs,
  deliveryMethod
}: OrderTotalInput): number {
  assertMoney(subtotalArs, "subtotalArs");

  return subtotalArs + getDeliveryCost(deliveryMethod);
}

export function getAllowedFulfillmentTransitions({
  deliveryMethod,
  currentStatus
}: FulfillmentTransitionInput): OrderStatus[] {
  const transitions: Partial<Record<OrderStatus, readonly OrderStatus[]>> =
    FULFILLMENT_TRANSITIONS[deliveryMethod];

  return [...(transitions[currentStatus] ?? [])];
}

export function isAdminPaymentLockedOrderStatus(status: OrderStatus): boolean {
  return (
    status === ORDER_STATUS.pendingPayment ||
    status === ORDER_STATUS.paymentFailed ||
    status === ORDER_STATUS.expired
  );
}

function assertMoney(value: number, name: string): void {
  assertNonNegativeInteger(value, name);
}

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}
