import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { normalizeAbsoluteUrlOrigin } from "../shared/url-utils";

const MERCADO_PAGO_API_BASE_URL = "https://api.mercadopago.com";
const WEBHOOK_SIGNATURE_TOLERANCE_MS = 10 * 60 * 1000;

export type MercadoPagoWebhookNotification = {
  id: string;
  liveMode: boolean | null;
  type: string;
  action: string;
  dataId: string;
  dateCreated: string | null;
};

export type MercadoPagoPayment = {
  id: string;
  status: string;
  statusDetail: string | null;
  externalReference: string | null;
  transactionAmount: number | null;
  metadata: {
    internalOrderId: string | null;
  };
};

export type MercadoPagoWebhookConfig = {
  accessToken?: string | null;
  webhookSecret?: string | null;
  apiBaseUrl?: string | null;
};

export type NormalizedMercadoPagoWebhookConfig = {
  accessToken: string;
  webhookSecret: string;
  apiBaseUrl: string;
};

export type MercadoPagoPaymentFetchConfig = {
  accessToken: string;
  apiBaseUrl?: string | null;
  fetcher?: typeof fetch;
};

export type VerifyMercadoPagoWebhookSignatureInput = {
  signatureHeader: string | null | undefined;
  requestIdHeader: string | null | undefined;
  dataId: string | null | undefined;
  webhookSecret: string | null | undefined;
  now?: Date;
  toleranceMs?: number;
};

export function readMercadoPagoWebhookConfig(
  env: Record<string, string | undefined> = process.env
): MercadoPagoWebhookConfig {
  return {
    accessToken: env.MERCADO_PAGO_ACCESS_TOKEN,
    webhookSecret: env.MERCADO_PAGO_WEBHOOK_SECRET,
    apiBaseUrl: env.MERCADO_PAGO_API_BASE_URL
  };
}

export function normalizeMercadoPagoWebhookConfig(
  config: MercadoPagoWebhookConfig
): NormalizedMercadoPagoWebhookConfig | null {
  const accessToken = config.accessToken?.trim() ?? "";
  const webhookSecret = config.webhookSecret?.trim() ?? "";
  const apiBaseUrl =
    normalizeAbsoluteUrlOrigin(config.apiBaseUrl) ?? MERCADO_PAGO_API_BASE_URL;

  if (!accessToken || !webhookSecret) {
    return null;
  }

  return {
    accessToken,
    webhookSecret,
    apiBaseUrl
  };
}

// Mercado Pago sends ids as either strings or numbers and includes many extra
// keys we ignore. These schemas describe the shape we depend on, while the
// field coercion (number → string, lenient money parsing) stays in the helpers
// below, so the parser tolerates an untrusted third-party payload without
// trusting it.
const requiredWebhookStringSchema = z
  .unknown()
  .transform(readRequiredWebhookString)
  .pipe(z.string());

const optionalWebhookStringSchema = z
  .unknown()
  .transform((value) => readOptionalWebhookString(value));

const webhookNotificationSchema = z
  .object({
    id: requiredWebhookStringSchema,
    type: requiredWebhookStringSchema,
    action: requiredWebhookStringSchema,
    live_mode: z
      .unknown()
      .transform((value) => (typeof value === "boolean" ? value : null)),
    date_created: optionalWebhookStringSchema,
    data: z.object({ id: requiredWebhookStringSchema })
  })
  .transform((notification) => ({
    id: notification.id,
    liveMode: notification.live_mode,
    type: notification.type,
    action: notification.action,
    dataId: notification.data.id,
    dateCreated: notification.date_created
  }));

const webhookPaymentSchema = z
  .object({
    id: requiredWebhookStringSchema,
    status: requiredWebhookStringSchema,
    status_detail: optionalWebhookStringSchema,
    external_reference: optionalWebhookStringSchema,
    transaction_amount: z.unknown().transform(readMoney),
    metadata: z.unknown().transform(readMetadataInternalOrderId)
  })
  .transform((payment) => ({
    id: payment.id,
    status: payment.status,
    statusDetail: payment.status_detail,
    externalReference: payment.external_reference,
    transactionAmount: payment.transaction_amount,
    metadata: {
      internalOrderId: payment.metadata
    }
  }));

export function parseMercadoPagoWebhookNotification(
  value: unknown
): MercadoPagoWebhookNotification | null {
  const result = webhookNotificationSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function verifyMercadoPagoWebhookSignature({
  signatureHeader,
  requestIdHeader,
  dataId,
  webhookSecret,
  now = new Date(),
  toleranceMs = WEBHOOK_SIGNATURE_TOLERANCE_MS
}: VerifyMercadoPagoWebhookSignatureInput): boolean {
  const signature = parseSignatureHeader(signatureHeader);
  const requestId = requestIdHeader?.trim() ?? "";
  const normalizedDataId = dataId?.trim().toLowerCase() ?? "";
  const secret = webhookSecret?.trim() ?? "";

  if (!signature || !requestId || !normalizedDataId || !secret) {
    return false;
  }

  const timestamp = Number(signature.timestamp);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  if (Math.abs(now.getTime() - timestamp) > toleranceMs) {
    return false;
  }

  const manifest = `id:${normalizedDataId};request-id:${requestId};ts:${signature.timestamp};`;
  const expectedSignature = createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return timingSafeHexEqual(expectedSignature, signature.v1);
}

export async function fetchMercadoPagoPayment(
  paymentId: string,
  {
    accessToken,
    apiBaseUrl = MERCADO_PAGO_API_BASE_URL,
    fetcher = fetch
  }: MercadoPagoPaymentFetchConfig
): Promise<MercadoPagoPayment | null> {
  const normalizedPaymentId = paymentId.trim();
  const normalizedAccessToken = accessToken.trim();
  const normalizedApiBaseUrl =
    normalizeAbsoluteUrlOrigin(apiBaseUrl) ?? MERCADO_PAGO_API_BASE_URL;

  if (!normalizedPaymentId || !normalizedAccessToken) {
    return null;
  }

  const response = await fetcher(
    `${normalizedApiBaseUrl}/v1/payments/${encodeURIComponent(
      normalizedPaymentId
    )}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${normalizedAccessToken}`
      }
    }
  );

  if (!response.ok) {
    return null;
  }

  const responseBody: unknown = await response.json();

  return normalizeMercadoPagoPayment(responseBody);
}

function normalizeMercadoPagoPayment(value: unknown): MercadoPagoPayment | null {
  const result = webhookPaymentSchema.safeParse(value);

  return result.success ? result.data : null;
}

function parseSignatureHeader(
  signatureHeader: string | null | undefined
): { timestamp: string; v1: string } | null {
  const header = signatureHeader?.trim();

  if (!header) {
    return null;
  }

  const parts = new Map<string, string>();

  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);

    if (key && value) {
      parts.set(key.trim(), value.trim());
    }
  }

  const timestamp = parts.get("ts");
  const v1 = parts.get("v1");

  return timestamp && v1 ? { timestamp, v1 } : null;
}

function timingSafeHexEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, "hex");
  const bBuffer = Buffer.from(b, "hex");

  if (aBuffer.byteLength !== bBuffer.byteLength) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

function readMetadataInternalOrderId(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  return (
    readOptionalWebhookString(record.internal_order_id) ??
    readOptionalWebhookString(record.internalOrderId)
  );
}

function readMoney(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const numericValue = Number(value);

    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
}

function readRequiredWebhookString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function readOptionalWebhookString(value: unknown): string | null {
  return readRequiredWebhookString(value);
}
