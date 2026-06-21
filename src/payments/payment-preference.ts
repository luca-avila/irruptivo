import { PENDING_PAYMENT_EXPIRATION_MS } from "../domain/rules";
import {
  type PendingOrder,
  type PendingOrderPaymentPreference
} from "../orders/order-creation";
import { getDate } from "../shared/date-utils";
import { normalizeAbsoluteUrlOrigin } from "../shared/url-utils";

const MERCADO_PAGO_API_BASE_URL = "https://api.mercadopago.com";

// Close the Mercado Pago checkout this much earlier than our internal pending-payment window.
// Anchored to the same `order.createdAt` clock, this makes MP stop accepting the payment before
// our lazy expirer flips the order to `expired`, removing the desync that would otherwise push a
// late (minute 31) payment into `expired` + `manual_review_required`. Must stay strictly between
// 0 and PENDING_PAYMENT_EXPIRATION_MS. Effective MP window = 30 - 5 = 25 min.
export const MERCADO_PAGO_EXPIRATION_SAFETY_MARGIN_MS = 5 * 60 * 1000;

export const PAYMENT_PREFERENCE_ERROR_MESSAGE =
  "No pudimos iniciar Mercado Pago. El pedido quedó pendiente; reintentá para continuar al pago.";

export type PaymentPreferenceConfig = {
  accessToken?: string | null;
  appUrl?: string | null;
  notificationUrl?: string | null;
  apiBaseUrl?: string | null;
};

export type MercadoPagoPreferenceItem = {
  id: string;
  title: string;
  description: string;
  quantity: number;
  currency_id: "ARS";
  unit_price: number;
};

export type MercadoPagoPreferenceRequest = {
  items: MercadoPagoPreferenceItem[];
  payer: {
    name: string;
    email: string;
  };
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return: "approved";
  external_reference: string;
  metadata: {
    internal_order_id: string;
    order_number: string;
  };
  expires: true;
  expiration_date_from: string;
  expiration_date_to: string;
  notification_url?: string;
};

export type PaymentPreferenceProviderResult = {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string | null;
};

export type NormalizedPaymentPreferenceConfig = {
  accessToken: string;
  appUrl: string;
  notificationUrl: string | null;
  apiBaseUrl: string;
};

export type PaymentPreferenceProvider = (
  request: MercadoPagoPreferenceRequest,
  config: NormalizedPaymentPreferenceConfig
) => Promise<PaymentPreferenceProviderResult>;

export type CreatePaymentPreferenceOptions = {
  config?: PaymentPreferenceConfig;
  provider?: PaymentPreferenceProvider;
  now?: Date | string;
};

export type PaymentPreferenceCreationResult =
  | {
      status: "created";
      preference: PendingOrderPaymentPreference;
    }
  | {
      status: "error";
      message: string;
      isRetryable: true;
    };

export async function createPaymentPreferenceForOrder(
  order: PendingOrder,
  {
    config = readPaymentPreferenceConfig(),
    provider = createMercadoPagoPreference,
    now = new Date()
  }: CreatePaymentPreferenceOptions = {}
): Promise<PaymentPreferenceCreationResult> {
  const normalizedConfig = normalizePaymentPreferenceConfig(config);

  if (!normalizedConfig) {
    return {
      status: "error",
      message: PAYMENT_PREFERENCE_ERROR_MESSAGE,
      isRetryable: true
    };
  }

  try {
    const request = buildMercadoPagoPreferenceRequest(order, normalizedConfig);
    const providerResult = await provider(request, normalizedConfig);

    return {
      status: "created",
      preference: {
        provider: "mercado_pago",
        preferenceId: providerResult.preferenceId,
        checkoutUrl: getCheckoutUrl(providerResult, normalizedConfig),
        initPoint: providerResult.initPoint,
        sandboxInitPoint: providerResult.sandboxInitPoint,
        externalReference: order.id,
        createdAt: getDate(now, "now").toISOString()
      }
    };
  } catch {
    return {
      status: "error",
      message: PAYMENT_PREFERENCE_ERROR_MESSAGE,
      isRetryable: true
    };
  }
}

export function readPaymentPreferenceConfig(
  env: Record<string, string | undefined> = process.env
): PaymentPreferenceConfig {
  return {
    accessToken: env.MERCADO_PAGO_ACCESS_TOKEN,
    appUrl:
      env.IRRUPTIVO_APP_URL ??
      env.NEXT_PUBLIC_APP_URL ??
      env.NEXT_PUBLIC_SITE_URL ??
      env.VERCEL_URL,
    notificationUrl: env.MERCADO_PAGO_NOTIFICATION_URL,
    apiBaseUrl: env.MERCADO_PAGO_API_BASE_URL
  };
}

export async function createMercadoPagoPreference(
  request: MercadoPagoPreferenceRequest,
  config: NormalizedPaymentPreferenceConfig
): Promise<PaymentPreferenceProviderResult> {
  const response = await fetch(`${config.apiBaseUrl}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.accessToken}`
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error("Mercado Pago preference creation failed.");
  }

  const responseBody: unknown = await response.json();

  return {
    preferenceId: readRequiredString(responseBody, "id"),
    initPoint: readRequiredString(responseBody, "init_point"),
    sandboxInitPoint: readOptionalString(responseBody, "sandbox_init_point")
  };
}

function buildMercadoPagoPreferenceRequest(
  order: PendingOrder,
  config: NormalizedPaymentPreferenceConfig
): MercadoPagoPreferenceRequest {
  const items = getPreferenceItems(order);

  if (getPreferenceItemsTotal(items) !== order.totalArs) {
    throw new Error("Mercado Pago preference total must match order total.");
  }

  const createdAtDate = getDate(order.createdAt, "order.createdAt");
  const expirationMs =
    PENDING_PAYMENT_EXPIRATION_MS - MERCADO_PAGO_EXPIRATION_SAFETY_MARGIN_MS;

  if (expirationMs <= 0) {
    throw new Error(
      "Mercado Pago expiration window must be positive (safety margin too large)."
    );
  }

  const expirationDate = new Date(createdAtDate.getTime() + expirationMs);

  return {
    items,
    payer: {
      name: order.contact.fullName,
      email: order.contact.email
    },
    back_urls: {
      success: buildReturnUrl(
        config.appUrl,
        "/checkout/pago/exito",
        order
      ),
      failure: buildReturnUrl(
        config.appUrl,
        "/checkout/pago/fallo",
        order
      ),
      pending: buildReturnUrl(
        config.appUrl,
        "/checkout/pago/pendiente",
        order
      )
    },
    auto_return: "approved",
    external_reference: order.id,
    metadata: {
      internal_order_id: order.id,
      order_number: order.orderNumber
    },
    expires: true,
    expiration_date_from: formatMercadoPagoDateTime(createdAtDate),
    expiration_date_to: formatMercadoPagoDateTime(expirationDate),
    ...(config.notificationUrl
      ? {
          notification_url: config.notificationUrl
        }
      : {})
  };
}

function getPreferenceItems(order: PendingOrder): MercadoPagoPreferenceItem[] {
  return [
    ...order.items.map((item) => ({
      id: item.variantId,
      title: `${item.productName} - ${item.optionSummary}`,
      description: `SKU ${item.sku}`,
      quantity: item.quantity,
      currency_id: "ARS" as const,
      unit_price: item.unitPriceArs
    })),
    ...(order.deliveryCostArs > 0
      ? [
          {
            id: `delivery-${order.delivery.method}`,
            title: `Entrega - ${order.delivery.methodLabel}`,
            description: `Costo de entrega del pedido ${order.orderNumber}`,
            quantity: 1,
            currency_id: "ARS" as const,
            unit_price: order.deliveryCostArs
          }
        ]
      : [])
  ];
}

function getPreferenceItemsTotal(
  items: readonly MercadoPagoPreferenceItem[]
): number {
  return items.reduce(
    (total, item) => total + item.unit_price * item.quantity,
    0
  );
}

function buildReturnUrl(
  appUrl: string,
  pathname: string,
  order: PendingOrder
): string {
  const url = new URL(pathname, appUrl);
  url.searchParams.set("order", order.id);
  url.searchParams.set("token", order.guestAccessToken);

  return url.toString();
}

function normalizePaymentPreferenceConfig(
  config: PaymentPreferenceConfig
): NormalizedPaymentPreferenceConfig | null {
  const accessToken = config.accessToken?.trim() ?? "";
  const appUrl = normalizeAbsoluteUrlOrigin(config.appUrl, {
    allowVercelHostWithoutProtocol: true
  });
  const notificationUrl = normalizeAbsoluteUrlOrigin(config.notificationUrl);
  const apiBaseUrl =
    normalizeAbsoluteUrlOrigin(config.apiBaseUrl) ?? MERCADO_PAGO_API_BASE_URL;

  if (!accessToken || !appUrl) {
    return null;
  }

  return {
    accessToken,
    appUrl,
    notificationUrl,
    apiBaseUrl
  };
}

function getCheckoutUrl(
  providerResult: PaymentPreferenceProviderResult,
  config: NormalizedPaymentPreferenceConfig
): string {
  if (config.accessToken.startsWith("TEST-") && providerResult.sandboxInitPoint) {
    return providerResult.sandboxInitPoint;
  }

  return providerResult.initPoint;
}

function readRequiredString(value: unknown, key: string): string {
  const stringValue = readOptionalString(value, key);

  if (!stringValue) {
    throw new Error(`Mercado Pago response is missing ${key}.`);
  }

  return stringValue;
}

function readOptionalString(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object" || !(key in value)) {
    return null;
  }

  const fieldValue = (value as Record<string, unknown>)[key];

  return typeof fieldValue === "string" && fieldValue.trim()
    ? fieldValue
    : null;
}

// Argentina has no DST and sits at a fixed UTC-03:00.
const MERCADO_PAGO_TIMEZONE_OFFSET_MINUTES = -3 * 60;

// Mercado Pago preferences require ISO 8601 with milliseconds AND an explicit timezone offset
// (e.g. "2026-06-11T15:30:00.000-03:00"); a plain "Z" / Date.toISOString() is not the format MP
// documents, so we render the instant in Argentina local time with an explicit offset.
function formatMercadoPagoDateTime(date: Date): string {
  const offsetMinutes = MERCADO_PAGO_TIMEZONE_OFFSET_MINUTES;
  const local = new Date(date.getTime() + offsetMinutes * 60 * 1000);

  const year = local.getUTCFullYear();
  const month = pad2(local.getUTCMonth() + 1);
  const day = pad2(local.getUTCDate());
  const hours = pad2(local.getUTCHours());
  const minutes = pad2(local.getUTCMinutes());
  const seconds = pad2(local.getUTCSeconds());
  const millis = String(local.getUTCMilliseconds()).padStart(3, "0");

  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offset = `${sign}${pad2(Math.floor(absOffset / 60))}:${pad2(absOffset % 60)}`;

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}${offset}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
