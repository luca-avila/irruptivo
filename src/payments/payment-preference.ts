import {
  type PendingOrder,
  type PendingOrderPaymentPreference
} from "../orders/order-creation";

const MERCADO_PAGO_API_BASE_URL = "https://api.mercadopago.com";

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

  return {
    items,
    payer: {
      name: order.contact.fullName,
      email: order.contact.email
    },
    back_urls: {
      success: buildReturnUrl(config.appUrl, "/checkout/pago/exito", order.id),
      failure: buildReturnUrl(config.appUrl, "/checkout/pago/fallo", order.id),
      pending: buildReturnUrl(config.appUrl, "/checkout/pago/pendiente", order.id)
    },
    auto_return: "approved",
    external_reference: order.id,
    metadata: {
      internal_order_id: order.id,
      order_number: order.orderNumber
    },
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

function buildReturnUrl(appUrl: string, pathname: string, orderId: string): string {
  const url = new URL(pathname, appUrl);
  url.searchParams.set("order", orderId);

  return url.toString();
}

function normalizePaymentPreferenceConfig(
  config: PaymentPreferenceConfig
): NormalizedPaymentPreferenceConfig | null {
  const accessToken = config.accessToken?.trim() ?? "";
  const appUrl = normalizeAbsoluteUrl(config.appUrl, {
    allowVercelHostWithoutProtocol: true
  });
  const notificationUrl = normalizeAbsoluteUrl(config.notificationUrl);
  const apiBaseUrl =
    normalizeAbsoluteUrl(config.apiBaseUrl) ?? MERCADO_PAGO_API_BASE_URL;

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

function normalizeAbsoluteUrl(
  value: string | null | undefined,
  options: { allowVercelHostWithoutProtocol?: boolean } = {}
): string | null {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  const urlValue =
    options.allowVercelHostWithoutProtocol &&
    trimmedValue.endsWith(".vercel.app") &&
    !trimmedValue.includes("://")
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

function getDate(value: Date | string, name: string): Date {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`${name} must be a valid date`);
  }

  return date;
}
