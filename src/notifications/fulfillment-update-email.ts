import {
  DELIVERY_METHOD,
  ORDER_STATUS,
  getOrderStatusLabel,
  type OrderStatus
} from "../domain/rules";
import { buildGuestOrderStatusPath } from "../orders/guest-order-status";
import {
  type Order,
  type PendingOrderDeliverySnapshot
} from "../orders/order-creation";
import { DEFAULT_WHATSAPP_URL } from "../storefront/navigation";
import {
  sendEmail,
  type EmailMessage,
  type EmailSendResult
} from "./email-provider";
import {
  claimOrderEmailDelivery,
  getGuestStatusUrl,
  updateOrderEmailDelivery,
  type EmailDeliveryKind,
  type OrderConfirmationEmailDeliveryStatus
} from "./order-confirmation-email";

export type FulfillmentUpdateEmailResult =
  | {
      status: "skipped";
      reason: "status_not_notifiable" | "missing_guest_status_link";
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

export type FulfillmentUpdateEmailSender = (
  order: Order
) => Promise<FulfillmentUpdateEmailResult>;

export type SendFulfillmentUpdateOnceOptions = {
  emailProvider?: (message: EmailMessage) => Promise<EmailSendResult>;
  appUrl?: string | null;
  whatsappUrl?: string | null;
  now?: Date | string;
  reclaimAfterMs?: number;
};

type FulfillmentUpdateEmailConfig = {
  appUrl?: string | null;
  whatsappUrl?: string | null;
};

const FULFILLMENT_UPDATE_EMAIL_DELIVERY_KIND_BY_STATUS: Partial<
  Record<OrderStatus, EmailDeliveryKind>
> = {
  [ORDER_STATUS.shipped]: "buyer_shipped",
  [ORDER_STATUS.readyForPickup]: "buyer_ready_for_pickup"
};

export async function sendFulfillmentUpdateOnce(
  order: Order,
  options: SendFulfillmentUpdateOnceOptions = {}
): Promise<FulfillmentUpdateEmailResult> {
  const config = readFulfillmentUpdateEmailConfig();
  const {
    emailProvider = sendEmail,
    appUrl = config.appUrl,
    whatsappUrl = config.whatsappUrl,
    now = new Date(),
    reclaimAfterMs
  } = options;
  const kind = getFulfillmentUpdateEmailDeliveryKind(order.status);

  if (!kind) {
    return {
      status: "skipped",
      reason: "status_not_notifiable",
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
  const attemptedAt = getDate(now, "now").toISOString();
  const claim = await claimOrderEmailDelivery({
    kind,
    delivery: {
      orderId: order.id,
      recipientEmail,
      status: "sending",
      providerMessageId: null,
      attemptedAt,
      errorMessage: null
    },
    reclaimAfterMs,
    now
  });

  if (claim.status === "duplicate") {
    return {
      status: "duplicate",
      orderId: order.id,
      recipientEmail: claim.delivery.recipientEmail,
      previousStatus: claim.delivery.status
    };
  }

  const message = buildFulfillmentUpdateEmailMessage({
    order,
    guestStatusUrl: getGuestStatusUrl(statusPath, appUrl),
    whatsappUrl: whatsappUrl?.trim() || DEFAULT_WHATSAPP_URL
  });
  const sendResult = await sendEmailSafely(emailProvider, message);

  if (sendResult.status === "sent") {
    await updateOrderEmailDelivery({
      orderId: order.id,
      kind,
      status: "sent",
      providerMessageId: sendResult.messageId,
      errorMessage: null
    });

    return {
      status: "sent",
      orderId: order.id,
      recipientEmail,
      providerMessageId: sendResult.messageId
    };
  }

  await updateOrderEmailDelivery({
    orderId: order.id,
    kind,
    status: sendResult.status,
    providerMessageId: null,
    errorMessage: sendResult.message
  });

  return {
    status: sendResult.status,
    orderId: order.id,
    recipientEmail,
    message: sendResult.message
  };
}

export function buildFulfillmentUpdateEmailMessage({
  order,
  guestStatusUrl,
  whatsappUrl
}: {
  order: Order;
  guestStatusUrl: string;
  whatsappUrl: string;
}): EmailMessage {
  const statusLabel = getOrderStatusLabel(order.status);
  const deliverySummary = getDeliverySummary(order.delivery);
  const lines =
    order.status === ORDER_STATUS.shipped
      ? [
          `Hola ${order.contact.fullName},`,
          `Despachamos tu pedido ${order.orderNumber}. El estado actual es ${statusLabel.toLowerCase()}.`,
          `Entrega: ${deliverySummary}`,
          `Podés seguir el estado del pedido acá: ${guestStatusUrl}`,
          `Consultas por WhatsApp: ${whatsappUrl}`,
          "Gracias por comprar en Irruptivo."
        ]
      : [
          `Hola ${order.contact.fullName},`,
          `Tu pedido ${order.orderNumber} está ${statusLabel.toLowerCase()}.`,
          "Coordinamos punto y horario de retiro por WhatsApp.",
          `Podés seguir el estado del pedido acá: ${guestStatusUrl}`,
          `Consultas por WhatsApp: ${whatsappUrl}`,
          "Gracias por comprar en Irruptivo."
        ];

  return {
    to: {
      email: order.contact.email,
      name: order.contact.fullName
    },
    subject: getFulfillmentUpdateSubject(order),
    text: lines.join("\n"),
    html: lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")
  };
}

export function isFulfillmentUpdateEmailStatus(status: OrderStatus): boolean {
  return Boolean(getFulfillmentUpdateEmailDeliveryKind(status));
}

export function getFulfillmentUpdateEmailDeliveryKind(
  status: OrderStatus
): EmailDeliveryKind | null {
  return FULFILLMENT_UPDATE_EMAIL_DELIVERY_KIND_BY_STATUS[status] ?? null;
}

function getFulfillmentUpdateSubject(order: Order): string {
  if (order.status === ORDER_STATUS.shipped) {
    return `Tu pedido ${order.orderNumber} ya está en camino - Irruptivo`;
  }

  return `Tu pedido ${order.orderNumber} está listo para retirar - Irruptivo`;
}

function getDeliverySummary(delivery: PendingOrderDeliverySnapshot): string {
  if (delivery.method === DELIVERY_METHOD.shipping && delivery.shippingAddress) {
    const { addressLine, city, province, postalCode } = delivery.shippingAddress;

    return `${delivery.methodLabel}: ${addressLine}, ${city}, ${province} (${postalCode}).`;
  }

  return "Retiro local en Benavidez/Zona Norte. Coordinamos punto y horario por WhatsApp.";
}

function readFulfillmentUpdateEmailConfig(
  env: Record<string, string | undefined> = process.env
): FulfillmentUpdateEmailConfig {
  return {
    appUrl:
      env.IRRUPTIVO_APP_URL ??
      env.NEXT_PUBLIC_APP_URL ??
      env.NEXT_PUBLIC_SITE_URL ??
      env.VERCEL_URL,
    whatsappUrl: env.NEXT_PUBLIC_WHATSAPP_URL
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
