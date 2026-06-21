import { DELIVERY_METHOD, ORDER_STATUS } from "../domain/rules";
import { getDate } from "../shared/date-utils";
import { normalizeAbsoluteUrlOrigin } from "../shared/url-utils";
import { escapeHtml, sendEmailSafely } from "./email-helpers";
import { type Order } from "../orders/order-creation";
import {
  sendEmail,
  type EmailMessage,
  type EmailSendResult
} from "./email-provider";
import {
  claimOrderEmailDelivery,
  updateOrderEmailDelivery,
  type OrderConfirmationEmailDeliveryStatus
} from "./order-confirmation-email";

export type AdminOrderNotificationResult =
  | {
      status: "skipped";
      reason: "order_not_paid" | "no_recipient_configured";
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

export type AdminOrderNotificationEmailSender = (
  order: Order
) => Promise<AdminOrderNotificationResult>;

export type SendAdminOrderNotificationOnceOptions = {
  recipient: string | null | undefined;
  emailProvider?: (message: EmailMessage) => Promise<EmailSendResult>;
  appUrl?: string | null;
  now?: Date | string;
};

const ADMIN_NOTIFICATION_EMAIL_DELIVERY_KIND = "admin_notification";
const DEFAULT_APP_URL = "http://localhost:3000";
const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export async function sendAdminOrderNotificationOnce(
  order: Order,
  {
    recipient,
    emailProvider = sendEmail,
    appUrl = readAdminOrderNotificationEmailConfig().appUrl,
    now = new Date()
  }: SendAdminOrderNotificationOnceOptions
): Promise<AdminOrderNotificationResult> {
  if (order.status !== ORDER_STATUS.paid) {
    return {
      status: "skipped",
      reason: "order_not_paid",
      orderId: order.id
    };
  }

  const recipientEmail = recipient?.trim() ?? "";

  if (!recipientEmail) {
    return {
      status: "skipped",
      reason: "no_recipient_configured",
      orderId: order.id
    };
  }

  const attemptedAt = getDate(now, "now").toISOString();
  const claim = await claimOrderEmailDelivery({
    kind: ADMIN_NOTIFICATION_EMAIL_DELIVERY_KIND,
    delivery: {
      orderId: order.id,
      recipientEmail,
      status: "sending",
      providerMessageId: null,
      attemptedAt,
      errorMessage: null
    },
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

  const message = buildAdminOrderNotificationEmailMessage({
    order,
    recipient: recipientEmail,
    adminOrderUrl: getAdminOrderUrl(order.id, appUrl)
  });
  const sendResult = await sendEmailSafely(emailProvider, message);

  if (sendResult.status === "sent") {
    await updateOrderEmailDelivery({
      orderId: order.id,
      kind: ADMIN_NOTIFICATION_EMAIL_DELIVERY_KIND,
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
    kind: ADMIN_NOTIFICATION_EMAIL_DELIVERY_KIND,
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

export function buildAdminOrderNotificationEmailMessage({
  order,
  recipient,
  adminOrderUrl
}: {
  order: Order;
  recipient: string;
  adminOrderUrl: string;
}): EmailMessage {
  const lines = [
    `Nueva compra ${order.orderNumber}`,
    `Comprador: ${order.contact.fullName}`,
    `Email: ${order.contact.email}`,
    `Teléfono: ${order.contact.phone}`,
    `Total: ${priceFormatter.format(order.totalArs)}`,
    "Ítems:",
    ...order.items.map(
      (item) =>
        `- ${item.productName} x ${item.quantity} (${item.optionSummary}, SKU ${item.sku}) - ${priceFormatter.format(item.lineTotalArs)}`
    ),
    ...getDeliveryLines(order),
    `Ver pedido: ${adminOrderUrl}`
  ];

  return {
    to: {
      email: recipient
    },
    replyTo: {
      email: order.contact.email,
      name: order.contact.fullName
    },
    subject: `Nueva compra ${order.orderNumber} - Irruptivo`,
    text: lines.join("\n"),
    html: lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")
  };
}

function getDeliveryLines(order: Order): string[] {
  if (order.delivery.method === DELIVERY_METHOD.shipping) {
    const address = order.delivery.shippingAddress;
    const addressLine = address
      ? `Dirección: ${address.addressLine}, ${address.city}, ${address.province} (${address.postalCode}).`
      : "Dirección: revisar los datos de envío en el pedido.";
    const notes = order.delivery.notes
      ? [`Notas de entrega: ${order.delivery.notes}`]
      : [];

    return [`Entrega: ${order.delivery.methodLabel}`, addressLine, ...notes];
  }

  const notes = order.delivery.notes
    ? `Nota de retiro: ${order.delivery.notes}`
    : "Nota de retiro: coordinar punto y horario por WhatsApp.";

  return [`Entrega: ${order.delivery.methodLabel}`, notes];
}

function getAdminOrderUrl(orderId: string, appUrl: string | null | undefined): string {
  const origin = normalizeAbsoluteUrlOrigin(appUrl, { allowVercelHostWithoutProtocol: true }) ?? DEFAULT_APP_URL;

  return new URL(`/admin/pedidos/${encodeURIComponent(orderId)}`, origin).toString();
}

function readAdminOrderNotificationEmailConfig(
  env: Record<string, string | undefined> = process.env
): { appUrl?: string | null } {
  return {
    appUrl:
      env.IRRUPTIVO_APP_URL ??
      env.NEXT_PUBLIC_APP_URL ??
      env.NEXT_PUBLIC_SITE_URL ??
      env.VERCEL_URL
  };
}
