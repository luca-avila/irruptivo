import {
  DELIVERY_METHOD,
  ORDER_STATUS,
  getOrderStatusLabel
} from "../domain/rules";
import { buildGuestOrderStatusPath } from "../orders/guest-order-status";
import { type PendingOrder } from "../orders/order-creation";

export type PaymentResultOrderStatus =
  | typeof ORDER_STATUS.pendingPayment
  | typeof ORDER_STATUS.paid
  | typeof ORDER_STATUS.paymentFailed
  | typeof ORDER_STATUS.expired;

export type PaymentResultOrder = Omit<PendingOrder, "status"> & {
  status: PaymentResultOrderStatus;
};

export type PaymentResultState =
  | "success"
  | "failure"
  | "pending"
  | "expired";

export type PaymentResultAction = {
  label: string;
  href: string;
};

export type PaymentResultView = {
  state: PaymentResultState;
  statusLabel: string;
  eyebrow: string;
  title: string;
  message: string;
  nextSteps: string[];
  order: {
    orderNumber: string;
    totalLabel: string;
    deliverySummary: string;
    guestStatusHref: string | null;
  };
  primaryAction: PaymentResultAction;
  supportAction: PaymentResultAction;
  guestStatusAction: PaymentResultAction | null;
  accountCreationCta: null;
};

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

const SUPPORT_ACTION = {
  label: "Escribir por WhatsApp",
  href: process.env.NEXT_PUBLIC_WHATSAPP_URL ?? "https://wa.me/5490000000000"
} as const satisfies PaymentResultAction;

export function getPaymentResultView(
  order: PaymentResultOrder
): PaymentResultView {
  const guestStatusHref = getGuestStatusHref(order);
  const stateView = getStateView(order);

  return {
    ...stateView,
    statusLabel: getOrderStatusLabel(order.status),
    order: {
      orderNumber: order.orderNumber,
      totalLabel: priceFormatter.format(order.totalArs),
      deliverySummary: getDeliverySummary(order),
      guestStatusHref
    },
    supportAction: SUPPORT_ACTION,
    guestStatusAction: guestStatusHref
      ? {
          label: "Ver estado del pedido",
          href: guestStatusHref
        }
      : null,
    accountCreationCta: null
  };
}

function getStateView(order: PaymentResultOrder): Omit<
  PaymentResultView,
  | "statusLabel"
  | "order"
  | "supportAction"
  | "guestStatusAction"
  | "accountCreationCta"
> {
  switch (order.status) {
    case ORDER_STATUS.paid:
      return {
        state: "success",
        eyebrow: "Pago seguro",
        title: "Pago confirmado",
        message:
          "Recibimos la confirmación del pago. Ya tenemos todo listo para avanzar con tu pedido.",
        nextSteps: [
          getFulfillmentNextStep(order),
          "Guardá el enlace de estado del pedido para volver a consultar la actualización."
        ],
        primaryAction: {
          label: "Seguir comprando",
          href: "/coleccion"
        }
      };
    case ORDER_STATUS.paymentFailed:
      return {
        state: "failure",
        eyebrow: "Pago no completado",
        title: "No pudimos confirmar el pago",
        message:
          "Mercado Pago informó que el pago no se completó. Para proteger el stock y los importes, necesitás iniciar una compra nueva desde la tienda.",
        nextSteps: [
          "Volvé a elegir los productos y completá un checkout nuevo.",
          "Si viste un débito o tenés dudas, escribinos por WhatsApp con el número de pedido."
        ],
        primaryAction: {
          label: "Iniciar compra nueva",
          href: "/coleccion"
        }
      };
    case ORDER_STATUS.expired:
      return {
        state: "expired",
        eyebrow: "Pago vencido",
        title: "El pedido pendiente venció",
        message:
          "Terminó el tiempo para completar el pago. Para comprar estos productos, volvé a la tienda e iniciá un checkout nuevo.",
        nextSteps: [
          "El pedido anterior ya no sigue pendiente de pago.",
          "Armá una compra nueva para confirmar disponibilidad y precio actual."
        ],
        primaryAction: {
          label: "Iniciar checkout nuevo",
          href: "/coleccion"
        }
      };
    case ORDER_STATUS.pendingPayment:
    default:
      return {
        state: "pending",
        eyebrow: "Confirmación en proceso",
        title: "Estamos confirmando el pago",
        message:
          "La confirmación de Mercado Pago puede tardar unos minutos. El servidor actualizará el estado cuando llegue la verificación.",
        nextSteps: [
          "No hace falta repetir el pago mientras la verificación esté en proceso.",
          "Podés guardar el enlace de estado del pedido y consultarlo de nuevo en unos minutos."
        ],
        primaryAction: {
          label: "Volver a la tienda",
          href: "/coleccion"
        }
      };
  }
}

function getFulfillmentNextStep(order: PaymentResultOrder): string {
  if (order.delivery.method === DELIVERY_METHOD.shipping) {
    return "Te escribimos por WhatsApp para coordinar el envío.";
  }

  return "Te escribimos por WhatsApp para coordinar el retiro.";
}

function getDeliverySummary(order: PaymentResultOrder): string {
  if (order.delivery.method === DELIVERY_METHOD.shipping) {
    const address = order.delivery.shippingAddress;

    if (!address) {
      return "Envío a domicilio.";
    }

    return `Envío a domicilio a ${address.addressLine}, ${address.city}, ${address.province} (${address.postalCode}).`;
  }

  return "Retiro local. Coordinamos punto y horario por WhatsApp.";
}

function getGuestStatusHref(order: PaymentResultOrder): string | null {
  return buildGuestOrderStatusPath(order.guestAccessToken);
}
