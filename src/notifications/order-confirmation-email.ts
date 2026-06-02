import { type EmailDelivery as EmailDeliveryRow } from "@prisma/client";

import { prisma } from "../db/client";
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

export type OrderConfirmationEmailDeliveryWriteRow = Omit<
  EmailDeliveryRow,
  "id"
>;

const SUPPORT_WHATSAPP_URL = "https://wa.me/5490000000000";
const orderConfirmationEmailDeliveryStatuses = [
  "sending",
  "sent",
  "configuration_missing",
  "failed"
] as const satisfies readonly OrderConfirmationEmailDeliveryStatus[];

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

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
  const attemptedAt = getDate(now, "now").toISOString();
  const claim = await claimOrderConfirmationEmailDelivery({
    orderId: order.id,
    recipientEmail,
    status: "sending",
    providerMessageId: null,
    attemptedAt,
    errorMessage: null
  });

  if (claim.status === "duplicate") {
    return {
      status: "duplicate",
      orderId: order.id,
      recipientEmail: claim.delivery.recipientEmail,
      previousStatus: claim.delivery.status
    };
  }

  const message = buildOrderConfirmationEmailMessage({
    order,
    guestStatusUrl: getGuestStatusUrl(statusPath, appUrl),
    whatsappUrl: whatsappUrl?.trim() || SUPPORT_WHATSAPP_URL
  });
  const sendResult = await sendEmailSafely(emailProvider, message);

  if (sendResult.status === "sent") {
    await updateOrderConfirmationEmailDelivery({
      orderId: order.id,
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

  await updateOrderConfirmationEmailDelivery({
    orderId: order.id,
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

export async function readOrderConfirmationEmailDeliveriesForTests(): Promise<
  OrderConfirmationEmailDeliveryRecord[]
> {
  const deliveries = await prisma.emailDelivery.findMany({
    orderBy: [
      {
        attemptedAt: "asc"
      },
      {
        id: "asc"
      }
    ]
  });

  return deliveries.map(mapOrderConfirmationEmailDeliveryRowToRecord);
}

export async function resetOrderConfirmationEmailDeliveriesForTests(): Promise<void> {
  await prisma.emailDelivery.deleteMany();
}

export function mapOrderConfirmationEmailDeliveryRowToRecord(
  row: EmailDeliveryRow | OrderConfirmationEmailDeliveryWriteRow
): OrderConfirmationEmailDeliveryRecord {
  return {
    orderId: row.orderId,
    recipientEmail: row.recipientEmail,
    status: toOrderConfirmationEmailDeliveryStatus(row.status),
    providerMessageId: row.providerMessageId,
    attemptedAt: row.attemptedAt.toISOString(),
    errorMessage: row.errorMessage
  };
}

export function mapOrderConfirmationEmailDeliveryRecordToRow(
  delivery: OrderConfirmationEmailDeliveryRecord
): OrderConfirmationEmailDeliveryWriteRow {
  return {
    orderId: assertNonEmptyString(delivery.orderId, "orderId"),
    recipientEmail: assertNonEmptyString(
      delivery.recipientEmail,
      "recipientEmail"
    ),
    status: toOrderConfirmationEmailDeliveryStatus(delivery.status),
    providerMessageId: delivery.providerMessageId?.trim() || null,
    attemptedAt: getDate(delivery.attemptedAt, "attemptedAt"),
    errorMessage: delivery.errorMessage?.trim() || null
  };
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

export function buildOrderConfirmationEmailMessage({
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

async function claimOrderConfirmationEmailDelivery(
  delivery: OrderConfirmationEmailDeliveryRecord
): Promise<
  | {
      status: "claimed";
      delivery: OrderConfirmationEmailDeliveryRecord;
    }
  | {
      status: "duplicate";
      delivery: OrderConfirmationEmailDeliveryRecord;
    }
> {
  const normalizedDelivery = mapOrderConfirmationEmailDeliveryRecordToRow(delivery);

  try {
    const createdDelivery = await prisma.emailDelivery.create({
      data: normalizedDelivery
    });

    return {
      status: "claimed",
      delivery: mapOrderConfirmationEmailDeliveryRowToRecord(createdDelivery)
    };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const existingDelivery = await readOrderConfirmationEmailDeliveryByOrderId(
      delivery.orderId
    );

    if (!existingDelivery) {
      throw error;
    }

    return {
      status: "duplicate",
      delivery: existingDelivery
    };
  }
}

async function updateOrderConfirmationEmailDelivery({
  orderId,
  status,
  providerMessageId,
  errorMessage
}: {
  orderId: string;
  status: OrderConfirmationEmailDeliveryStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
}): Promise<OrderConfirmationEmailDeliveryRecord> {
  const updatedDelivery = await prisma.emailDelivery.update({
    where: {
      orderId
    },
    data: {
      status,
      providerMessageId,
      errorMessage
    }
  });

  return mapOrderConfirmationEmailDeliveryRowToRecord(updatedDelivery);
}

async function readOrderConfirmationEmailDeliveryByOrderId(
  orderId: string
): Promise<OrderConfirmationEmailDeliveryRecord | null> {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return null;
  }

  const delivery = await prisma.emailDelivery.findUnique({
    where: {
      orderId: normalizedOrderId
    }
  });

  return delivery ? mapOrderConfirmationEmailDeliveryRowToRecord(delivery) : null;
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

export function getGuestStatusUrl(
  statusPath: string,
  appUrl: string | null | undefined
): string {
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

function assertNonEmptyString(value: string, name: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new RangeError(`${name} must be a non-empty string`);
  }

  return trimmedValue;
}

function toOrderConfirmationEmailDeliveryStatus(
  status: string
): OrderConfirmationEmailDeliveryStatus {
  if (
    !orderConfirmationEmailDeliveryStatuses.includes(
      status as OrderConfirmationEmailDeliveryStatus
    )
  ) {
    throw new RangeError(`Unknown email delivery status "${status}".`);
  }

  return status as OrderConfirmationEmailDeliveryStatus;
}

function isUniqueConstraintError(error: unknown): boolean {
  return isPrismaKnownError(error, "P2002");
}

function isPrismaKnownError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}
