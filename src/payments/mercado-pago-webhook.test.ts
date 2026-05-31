import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  fetchMercadoPagoPayment,
  parseMercadoPagoWebhookNotification,
  verifyMercadoPagoWebhookSignature
} from "./mercado-pago-webhook";

const secret = "webhook-secret";
const requestId = "bb56a2f1-6aae-46ac-982e-9dcd3581d08e";
const timestamp = "1742505638683";

describe("Mercado Pago webhook verification", () => {
  it("validates the x-signature header using data.id, x-request-id, timestamp, and the webhook secret", () => {
    const signature = createSignature({
      dataId: "123456",
      requestId,
      timestamp,
      secret
    });

    expect(
      verifyMercadoPagoWebhookSignature({
        signatureHeader: signature,
        requestIdHeader: requestId,
        dataId: "123456",
        webhookSecret: secret,
        now: new Date(Number(timestamp) + 1000)
      })
    ).toBe(true);
    expect(
      verifyMercadoPagoWebhookSignature({
        signatureHeader: signature,
        requestIdHeader: requestId,
        dataId: "123456",
        webhookSecret: "wrong-secret",
        now: new Date(Number(timestamp) + 1000)
      })
    ).toBe(false);
  });

  it("parses the payment notification shape Mercado Pago sends to webhook endpoints", () => {
    const notification = parseMercadoPagoWebhookNotification({
      id: "event-001",
      live_mode: false,
      type: "payment",
      action: "payment.updated",
      data: {
        id: "payment-001"
      },
      date_created: "2026-05-30T12:00:00.000Z"
    });

    expect(notification).toEqual({
      id: "event-001",
      liveMode: false,
      type: "payment",
      action: "payment.updated",
      dataId: "payment-001",
      dateCreated: "2026-05-30T12:00:00.000Z"
    });
  });

  it("fetches payment details server-side before reconciliation", async () => {
    const requests: Array<{ url: string; authorization: string | null }> = [];

    const payment = await fetchMercadoPagoPayment("payment-001", {
      accessToken: "APP_USR-123",
      apiBaseUrl: "https://api.mercadopago.test",
      fetcher: async (input, init) => {
        const url = String(input);
        const headers = new Headers(init?.headers);
        requests.push({
          url,
          authorization: headers.get("authorization")
        });

        return new Response(
          JSON.stringify({
            id: 123456,
            status: "approved",
            status_detail: "accredited",
            external_reference: "order-001",
            transaction_amount: 86900,
            metadata: {
              internal_order_id: "order-001"
            }
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        );
      }
    });

    expect(requests).toEqual([
      {
        url: "https://api.mercadopago.test/v1/payments/payment-001",
        authorization: "Bearer APP_USR-123"
      }
    ]);
    expect(payment).toEqual({
      id: "123456",
      status: "approved",
      statusDetail: "accredited",
      externalReference: "order-001",
      transactionAmount: 86900,
      metadata: {
        internalOrderId: "order-001"
      }
    });
  });
});

function createSignature({
  dataId,
  requestId,
  timestamp,
  secret
}: {
  dataId: string;
  requestId: string;
  timestamp: string;
  secret: string;
}): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const hash = createHmac("sha256", secret).update(manifest).digest("hex");

  return `ts=${timestamp},v1=${hash}`;
}
