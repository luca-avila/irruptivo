import { type EmailDelivery as EmailDeliveryRow } from "@prisma/client";

import { prisma } from "../db/client";
import { getDate } from "../shared/date-utils";
import { isUniqueConstraintError } from "../shared/prisma-utils";
import { normalizeAbsoluteUrlOrigin } from "../shared/url-utils";
import { assertNonEmptyString } from "../shared/string-utils";
import { escapeHtml, sendEmailSafely } from "./email-helpers";
import {
  DELIVERY_METHOD,
  ORDER_STATUS,
  getOrderStatusLabel
} from "../domain/rules";
import { buildGuestOrderStatusPath } from "../orders/guest-order-status";
import { getDeliverySummary } from "../orders/order-delivery";
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

export type EmailDeliveryKind =
  | "buyer_confirmation"
  | "admin_notification"
  | "buyer_shipped"
  | "buyer_ready_for_pickup";

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

// Retry throttle for non-sent deliveries, and staleness window for crashed sending rows.
export const EMAIL_DELIVERY_RECLAIM_AFTER_MS = 5 * 60_000;
// Short admin resend throttle: prevents double-submit resends while reclaiming stale failures quickly.
export const EMAIL_DELIVERY_RESEND_RECLAIM_AFTER_MS = 30_000;

const BUYER_CONFIRMATION_EMAIL_DELIVERY_KIND =
  "buyer_confirmation" as const satisfies EmailDeliveryKind;
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
  const claim = await claimOrderEmailDelivery({
    kind: BUYER_CONFIRMATION_EMAIL_DELIVERY_KIND,
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

  const message = buildOrderConfirmationEmailMessage({
    order,
    guestStatusUrl: getGuestStatusUrl(statusPath, appUrl),
    whatsappUrl: whatsappUrl?.trim() || DEFAULT_WHATSAPP_URL
  });
  const sendResult = await sendEmailSafely(emailProvider, message);

  if (sendResult.status === "sent") {
    await updateOrderEmailDelivery({
      orderId: order.id,
      kind: BUYER_CONFIRMATION_EMAIL_DELIVERY_KIND,
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
    kind: BUYER_CONFIRMATION_EMAIL_DELIVERY_KIND,
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
    kind: BUYER_CONFIRMATION_EMAIL_DELIVERY_KIND,
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

export async function claimOrderEmailDelivery({
  kind,
  delivery,
  reclaimAfterMs = EMAIL_DELIVERY_RECLAIM_AFTER_MS,
  now = new Date()
}: {
  kind: EmailDeliveryKind;
  delivery: OrderConfirmationEmailDeliveryRecord;
  reclaimAfterMs?: number;
  now?: Date | string;
}): Promise<
  | {
      status: "claimed";
      delivery: OrderConfirmationEmailDeliveryRecord;
    }
  | {
      status: "duplicate";
      delivery: OrderConfirmationEmailDeliveryRecord;
    }
> {
  const normalizedDelivery = {
    ...mapOrderConfirmationEmailDeliveryRecordToRow(delivery),
    kind
  };

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

    const existingDelivery = await readOrderEmailDeliveryByOrderIdAndKind({
      orderId: delivery.orderId,
      kind
    });

    if (!existingDelivery) {
      throw error;
    }

    if (existingDelivery.status === "sent") {
      return {
        status: "duplicate",
        delivery: existingDelivery
      };
    }

    const reclaimWindowMs = getNonNegativeMilliseconds(
      reclaimAfterMs,
      "reclaimAfterMs"
    );
    const claimDate = getDate(now, "now");
    const cutoff = new Date(claimDate.getTime() - reclaimWindowMs);
    const reclaim = await prisma.emailDelivery.updateMany({
      where: {
        orderId: normalizedDelivery.orderId,
        kind,
        status: {
          not: "sent"
        },
        attemptedAt: {
          lte: cutoff
        }
      },
      data: {
        status: "sending",
        recipientEmail: normalizedDelivery.recipientEmail,
        providerMessageId: null,
        errorMessage: null,
        attemptedAt: normalizedDelivery.attemptedAt
      }
    });

    if (reclaim.count !== 1) {
      return {
        status: "duplicate",
        delivery: existingDelivery
      };
    }

    const reclaimedDelivery = await readOrderEmailDeliveryByOrderIdAndKind({
      orderId: normalizedDelivery.orderId,
      kind
    });

    if (!reclaimedDelivery) {
      throw error;
    }

    return {
      status: "claimed",
      delivery: reclaimedDelivery
    };
  }
}

export async function updateOrderEmailDelivery({
  orderId,
  kind,
  status,
  providerMessageId,
  errorMessage
}: {
  orderId: string;
  kind: EmailDeliveryKind;
  status: OrderConfirmationEmailDeliveryStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
}): Promise<OrderConfirmationEmailDeliveryRecord> {
  const updatedDelivery = await prisma.emailDelivery.update({
    where: {
      orderId_kind: {
        orderId,
        kind
      }
    },
    data: {
      status,
      providerMessageId,
      errorMessage
    }
  });

  return mapOrderConfirmationEmailDeliveryRowToRecord(updatedDelivery);
}

export async function readOrderEmailDeliveryByOrderIdAndKind({
  orderId,
  kind
}: {
  orderId: string;
  kind: EmailDeliveryKind;
}): Promise<OrderConfirmationEmailDeliveryRecord | null> {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return null;
  }

  const delivery = await prisma.emailDelivery.findUnique({
    where: {
      orderId_kind: {
        orderId: normalizedOrderId,
        kind
      }
    }
  });

  return delivery ? mapOrderConfirmationEmailDeliveryRowToRecord(delivery) : null;
}

export function getGuestStatusUrl(
  statusPath: string,
  appUrl: string | null | undefined
): string {
  const normalizedAppUrl = normalizeAbsoluteUrlOrigin(appUrl, { allowVercelHostWithoutProtocol: true });

  return normalizedAppUrl ? new URL(statusPath, normalizedAppUrl).toString() : statusPath;
}

function getFulfillmentNextStep(delivery: PendingOrderDeliverySnapshot): string {
  if (delivery.method === DELIVERY_METHOD.shipping) {
    return "Preparamos tu pedido y te escribimos por WhatsApp para coordinar el envío.";
  }

  return "Preparamos tu compra y te escribimos por WhatsApp para coordinar el retiro.";
}

function getNonNegativeMilliseconds(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative number`);
  }

  return value;
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
