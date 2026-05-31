import {
  PRODUCT_AREA,
  type ProductArea,
  type VariantOptionValues
} from "../catalog/catalog";
import {
  DELIVERY_METHOD,
  getOrderStatusLabel,
  type DeliveryMethod,
  type DeliveryMethodLabel,
  type OrderStatus,
  type OrderStatusLabel,
  ORDER_STATUS
} from "../domain/rules";
import {
  type PendingOrder,
  type PendingOrderDeliverySnapshot
} from "./order-creation";
import { readOrderStoreSnapshot } from "./order-store";

export type GuestOrderStatusTone =
  | "attention"
  | "danger"
  | "progress"
  | "success";

export type GuestOrderStatusView = {
  label: OrderStatusLabel;
  tone: GuestOrderStatusTone;
  description: string;
  nextStep: string;
};

export type GuestOrderStatusItem = {
  productName: string;
  productHref: string;
  variantName: string;
  sku: string;
  options: VariantOptionValues;
  optionSummary: string;
  quantity: number;
  unitPriceArs: number;
  lineTotalArs: number;
};

export type GuestOrderStatusDelivery = {
  methodLabel: DeliveryMethodLabel;
  summary: string;
  shippingAddress: PendingOrderDeliverySnapshot["shippingAddress"];
  notes: string | null;
};

export type GuestOrderStatusOrder = {
  orderNumber: string;
  createdAt: string;
  status: GuestOrderStatusView;
  contact: {
    fullName: string;
    email: string;
    phone: string;
  };
  delivery: GuestOrderStatusDelivery;
  items: GuestOrderStatusItem[];
  totals: {
    subtotalArs: number;
    deliveryCostArs: number;
    totalArs: number;
  };
};

export type GuestOrderStatusSourceOrder = Omit<PendingOrder, "status"> & {
  status: OrderStatus;
};

export function getGuestOrderStatusByToken(
  token: string | null | undefined,
  orders: readonly GuestOrderStatusSourceOrder[] = readOrderStoreSnapshot().orders
): GuestOrderStatusOrder | null {
  const normalizedToken = normalizeGuestOrderStatusToken(token);

  if (!normalizedToken) {
    return null;
  }

  const order = orders.find(
    (candidateOrder) => candidateOrder.guestAccessToken === normalizedToken
  );

  return order ? getGuestOrderStatusProjection(order) : null;
}

export function getGuestOrderStatusView({
  status,
  deliveryMethod
}: {
  status: OrderStatus;
  deliveryMethod?: DeliveryMethod;
}): GuestOrderStatusView {
  switch (status) {
    case ORDER_STATUS.pendingPayment:
      return {
        label: getOrderStatusLabel(status),
        tone: "attention",
        description: "Mercado Pago todavía no confirmó el pago de este pedido.",
        nextStep:
          "Si ya pagaste, esperá unos minutos y volvé a abrir este enlace para ver la actualización."
      };
    case ORDER_STATUS.paid:
      return {
        label: getOrderStatusLabel(status),
        tone: "success",
        description: "Recibimos la confirmación de pago por Mercado Pago.",
        nextStep:
          deliveryMethod === DELIVERY_METHOD.pickup
            ? "Vamos a preparar tu compra y después coordinamos el retiro por WhatsApp."
            : "Vamos a preparar tu compra y te avisamos cuando pase a envío."
      };
    case ORDER_STATUS.paymentFailed:
      return {
        label: getOrderStatusLabel(status),
        tone: "danger",
        description: "Mercado Pago informó que el pago no se completó.",
        nextStep:
          "Para comprar estos productos, iniciá una compra nueva o escribinos si necesitás ayuda."
      };
    case ORDER_STATUS.expired:
      return {
        label: getOrderStatusLabel(status),
        tone: "danger",
        description: "La reserva del pedido venció sin confirmación de pago.",
        nextStep:
          "Si querés avanzar, armá una compra nueva o consultanos por WhatsApp."
      };
    case ORDER_STATUS.preparing:
      return {
        label: getOrderStatusLabel(status),
        tone: "progress",
        description: "El pago está confirmado y estamos preparando tu pedido.",
        nextStep:
          deliveryMethod === DELIVERY_METHOD.pickup
            ? "Te avisamos cuando esté listo para coordinar el retiro."
            : "Te avisamos cuando el pedido salga para entrega."
      };
    case ORDER_STATUS.shipped:
      return {
        label: getOrderStatusLabel(status),
        tone: "progress",
        description: "El pedido ya salió para entrega.",
        nextStep:
          "Seguí este enlace para ver cuando quede marcado como entregado."
      };
    case ORDER_STATUS.delivered:
      return {
        label: getOrderStatusLabel(status),
        tone: "success",
        description: "El pedido figura como entregado.",
        nextStep:
          "Si hubo algún problema con la entrega, escribinos por WhatsApp con tu número de pedido."
      };
    case ORDER_STATUS.readyForPickup:
      return {
        label: getOrderStatusLabel(status),
        tone: "success",
        description: "Tu compra ya está lista para retirar.",
        nextStep:
          "Escribinos por WhatsApp con tu número de pedido para coordinar el retiro."
      };
    case ORDER_STATUS.pickedUp:
      return {
        label: getOrderStatusLabel(status),
        tone: "success",
        description: "El pedido figura como retirado.",
        nextStep:
          "Gracias por comprar en Irruptivo. Si necesitás soporte, escribinos por WhatsApp."
      };
  }
}

export function buildGuestOrderStatusPath(
  token: string | null | undefined
): string | null {
  const normalizedToken = normalizeGuestOrderStatusToken(token);

  return normalizedToken
    ? `/pedido/${encodeURIComponent(normalizedToken)}`
    : null;
}

function getGuestOrderStatusProjection(
  order: GuestOrderStatusSourceOrder
): GuestOrderStatusOrder {
  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: getGuestOrderStatusView({
      status: order.status,
      deliveryMethod: order.delivery.method
    }),
    contact: {
      ...order.contact
    },
    delivery: {
      methodLabel: order.delivery.methodLabel,
      summary: getDeliverySummary(order.delivery),
      shippingAddress: order.delivery.shippingAddress
        ? {
            ...order.delivery.shippingAddress
          }
        : null,
      notes: order.delivery.notes
    },
    items: order.items.map((item) => ({
      productName: item.productName,
      productHref: getProductHref(item.productArea, item.productSlug),
      variantName: item.variantName,
      sku: item.sku,
      options: {
        ...item.options
      },
      optionSummary: item.optionSummary,
      quantity: item.quantity,
      unitPriceArs: item.unitPriceArs,
      lineTotalArs: item.lineTotalArs
    })),
    totals: {
      subtotalArs: order.subtotalArs,
      deliveryCostArs: order.deliveryCostArs,
      totalArs: order.totalArs
    }
  };
}

function getDeliverySummary(delivery: PendingOrderDeliverySnapshot): string {
  if (delivery.method === DELIVERY_METHOD.shipping && delivery.shippingAddress) {
    const { addressLine, city, province, postalCode } = delivery.shippingAddress;

    return `${delivery.methodLabel}: ${addressLine}, ${city}, ${province} (${postalCode}).`;
  }

  return "Retiro local en Benavidez/Zona Norte. Coordinamos punto y horario por WhatsApp.";
}

function getProductHref(productArea: ProductArea, productSlug: string): string {
  return productArea === PRODUCT_AREA.supplement
    ? `/suplementos/${productSlug}`
    : `/coleccion/${productSlug}`;
}

function normalizeGuestOrderStatusToken(
  token: string | null | undefined
): string {
  return token?.trim() ?? "";
}
