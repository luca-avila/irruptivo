import {
  DELIVERY_METHOD,
  ORDER_STATUS,
  getOrderStatusLabel
} from "../domain/rules";
import { buildGuestOrderStatusPath } from "../orders/guest-order-status";
import {
  type Order,
  type PendingOrderDeliverySnapshot
} from "../orders/order-creation";
import {
  sendEmail,
  type EmailMessage,
  type EmailSendResult
} from "./email-provider";

export type OrderConfirmationEmailDeliveryStatus =
  | "sending"
  | "sent"
  | "configuration_missing"
  | "failed";

export type OrderConfirmationEmailDeliveryRecord = {
  orderId: string;
  recipientEmail: string;
  status: OrderConfirmationEmailDeliveryStatus;
  providerMessageId: string | null;
  attemptedAt: string;
  errorMessage: string | null;
};

export type OrderConfirmationEmailResult =
  | {
      status: "skipped";
      reason: "order_not_paid" | "missing_guest_status_link";
      orderId: string;
    }
  | {
      status: "duplicate";
      orderId: string;
      recipientEmail: string;
      previousStatus: OrderConfirmationEmailDeliveryStatus;
    }
  | {
      status: "sent";
      orderId: string;
      recipientEmail: string;
      providerMessageId: string;
    }
  | {
      status: "configuration_missing";
      orderId: string;
      recipientEmail: string;
      message: string;
    }
  | {
      status: "failed";
      orderId: string;
      recipientEmail: string;
      message: string;
    };

export type OrderConfirmationEmailSender = (
  order: Order
) => Promise<OrderConfirmationEmailResult>;

export type SendOrderConfirmationOnceOptions = {
  emailProvider?: (message: EmailMessage) => Promise<EmailSendResult>;
  appUrl?: string | null;
  whatsappUrl?: string | null;
  now?: Date | string;
};

type OrderConfirmationEmailConfig = {
  appUrl?: string | null;
  whatsappUrl?: string | null;
};

const SUPPORT_WHATSAPP_URL = "https://wa.me/5490000000000";

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

const orderConfirmationEmailDeliveries: OrderConfirmationEmailDeliveryRecord[] =
  [];

export async function sendOrderConfirmationOnce(
  order: Order,
  {
    emailProvider = sendEmail,
    appUrl = readOrderConfirmationEmailConfig().appUrl,
    whatsappUrl = readOrderConfirmationEmailConfig().whatsappUrl,
    now = new Date()
  }: SendOrderConfirmationOnceOptions = {}
): Promise<OrderConfirmationEmailResult> {
  if (order.status !== ORDER_STATUS.paid) {
    return {
      status: "skipped",
      reason: "order_not_paid",
      orderId: order.id
    };
  }

  const statusPath = buildGuestOrderStatusPath(order.guestAccessToken);

  if (!statusPath) {
    return {
      status: "skipped",
      reason: "missing_guest_status_link",
      orderId: order.id
    };
  }

  const recipientEmail = order.contact.email;
  const existingDelivery = orderConfirmationEmailDeliveries.find(
    (delivery) => delivery.orderId === order.id
  );

  if (existingDelivery) {
    return {
      status: "duplicate",
      orderId: order.id,
      recipientEmail,
      previousStatus: existingDelivery.status
    };
  }

  const attemptedAt = getDate(now, "now").toISOString();
  const deliveryRecord: OrderConfirmationEmailDeliveryRecord = {
    orderId: order.id,
    recipientEmail,
    status: "sending",
    providerMessageId: null,
    attemptedAt,
    errorMessage: null
  };
  orderConfirmationEmailDeliveries.push(deliveryRecord);

  const message = buildOrderConfirmationEmailMessage({
    order,
    guestStatusUrl: getGuestStatusUrl(statusPath, appUrl),
    whatsappUrl: whatsappUrl?.trim() || SUPPORT_WHATSAPP_URL
  });
  const sendResult = await sendEmailSafely(emailProvider, message);

  if (sendResult.status === "sent") {
    deliveryRecord.status = "sent";
    deliveryRecord.providerMessageId = sendResult.messageId;

    return {
      status: "sent",
      orderId: order.id,
      recipientEmail,
      providerMessageId: sendResult.messageId
    };
  }

  deliveryRecord.status = sendResult.status;
  deliveryRecord.errorMessage = sendResult.message;

  return {
    status: sendResult.status,
    orderId: order.id,
    recipientEmail,
    message: sendResult.message
  };
}

export function readOrderConfirmationEmailDeliveriesForTests(): OrderConfirmationEmailDeliveryRecord[] {
  return orderConfirmationEmailDeliveries.map((delivery) => ({
    ...delivery
  }));
}

export function resetOrderConfirmationEmailDeliveriesForTests(): void {
  orderConfirmationEmailDeliveries.splice(
    0,
    orderConfirmationEmailDeliveries.length
  );
}

function readOrderConfirmationEmailConfig(
  env: Record<string, string | undefined> = process.env
): OrderConfirmationEmailConfig {
  return {
    appUrl:
      env.IRRUPTIVO_APP_URL ??
      env.NEXT_PUBLIC_APP_URL ??
      env.NEXT_PUBLIC_SITE_URL ??
      env.VERCEL_URL,
    whatsappUrl: env.NEXT_PUBLIC_WHATSAPP_URL
  };
}

function buildOrderConfirmationEmailMessage({
  order,
  guestStatusUrl,
  whatsappUrl
}: {
  order: Order;
  guestStatusUrl: string;
  whatsappUrl: string;
}): EmailMessage {
  const deliverySummary = getDeliverySummary(order.delivery);
  const fulfillmentNextStep = getFulfillmentNextStep(order.delivery);
  const paymentStatusLabel = getOrderStatusLabel(ORDER_STATUS.paid);
  const lines = [
    `Hola ${order.contact.fullName},`,
    `Recibimos tu ${paymentStatusLabel.toLowerCase()} por Mercado Pago para el pedido ${order.orderNumber}.`,
    `Total: ${priceFormatter.format(order.totalArs)}.`,
    `Entrega: ${deliverySummary}`,
    `Próximo paso: ${fulfillmentNextStep}`,
    `Estado del pedido: ${guestStatusUrl}`,
    `Consultas por WhatsApp: ${whatsappUrl}`,
    "Gracias por comprar en Irruptivo."
  ];

  return {
    to: {
      email: order.contact.email,
      name: order.contact.fullName
    },
    subject: `Confirmación de compra ${order.orderNumber} - Irruptivo`,
    text: lines.join("\n"),
    html: lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")
  };
}

async function sendEmailSafely(
  emailProvider: (message: EmailMessage) => Promise<EmailSendResult>,
  message: EmailMessage
): Promise<EmailSendResult> {
  try {
    return await emailProvider(message);
  } catch {
    return {
      status: "failed",
      provider: "unknown",
      message: "No pudimos enviar el email transaccional."
    };
  }
}

function getGuestStatusUrl(statusPath: string, appUrl: string | null | undefined): string {
  const normalizedAppUrl = normalizeAbsoluteUrl(appUrl);

  return normalizedAppUrl ? new URL(statusPath, normalizedAppUrl).toString() : statusPath;
}

function getDeliverySummary(delivery: PendingOrderDeliverySnapshot): string {
  if (delivery.method === DELIVERY_METHOD.shipping && delivery.shippingAddress) {
    const { addressLine, city, province, postalCode } = delivery.shippingAddress;

    return `${delivery.methodLabel}: ${addressLine}, ${city}, ${province} (${postalCode}).`;
  }

  return "Retiro local en Benavidez/Zona Norte. Coordinamos punto y horario por WhatsApp.";
}

function getFulfillmentNextStep(delivery: PendingOrderDeliverySnapshot): string {
  if (delivery.method === DELIVERY_METHOD.shipping) {
    return "Preparamos tu pedido y te escribimos por WhatsApp para coordinar el envío.";
  }

  return "Preparamos tu compra y te escribimos por WhatsApp para coordinar el retiro.";
}

function normalizeAbsoluteUrl(value: string | null | undefined): string | null {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  const urlValue =
    trimmedValue.endsWith(".vercel.app") && !trimmedValue.includes("://")
      ? `https://${trimmedValue}`
      : trimmedValue;

  try {
    const url = new URL(urlValue);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getDate(value: Date | string, name: string): Date {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`${name} must be a valid date`);
  }

  return date;
}
