import {
  normalizeMercadoPagoWebhookConfig,
  parseMercadoPagoWebhookNotification,
  readMercadoPagoWebhookConfig,
  verifyMercadoPagoWebhookSignature
} from "../../../../src/payments/mercado-pago-webhook";
import { reconcileMercadoPagoEvent } from "../../../../src/payments/payment-reconciliation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = normalizeMercadoPagoWebhookConfig(
    readMercadoPagoWebhookConfig()
  );

  if (!config) {
    return jsonResponse(
      {
        status: "configuration_error"
      },
      500
    );
  }

  const url = new URL(request.url);
  const signatureHeader = request.headers.get("x-signature");
  const requestIdHeader = request.headers.get("x-request-id");
  const signedDataId = url.searchParams.get("data.id");

  if (
    !verifyMercadoPagoWebhookSignature({
      signatureHeader,
      requestIdHeader,
      dataId: signedDataId,
      webhookSecret: config.webhookSecret
    })
  ) {
    return jsonResponse(
      {
        status: "unverified"
      },
      401
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const notification = parseMercadoPagoWebhookNotification(body);

  if (!notification) {
    return jsonResponse(
      {
        status: "invalid_event"
      },
      400
    );
  }

  if (notification.dataId !== signedDataId?.trim()) {
    return jsonResponse(
      {
        status: "unverified"
      },
      401
    );
  }

  const result = await reconcileMercadoPagoEvent(notification, {
    config: {
      accessToken: config.accessToken,
      apiBaseUrl: config.apiBaseUrl
    }
  });

  return jsonResponse(result, 200);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}
