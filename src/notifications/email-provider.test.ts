import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  readLocalEmailOutboxForTests,
  resetLocalEmailOutboxForTests,
  sendEmail,
  type EmailMessage
} from "./email-provider";

const message = {
  to: {
    email: "luca@example.com",
    name: "Luca Irruptivo"
  },
  subject: "Confirmación de compra IRR-000001 - Irruptivo",
  text: "Recibimos tu pago confirmado.",
  html: "<p>Recibimos tu pago confirmado.</p>"
} satisfies EmailMessage;

const messageWithReplyTo = {
  ...message,
  replyTo: {
    email: "soporte@irruptivo.com",
    name: "Soporte Irruptivo"
  }
} satisfies EmailMessage;

describe("email provider adapter", () => {
  beforeEach(() => {
    resetLocalEmailOutboxForTests();
  });

  it("uses a local adapter outside production when provider credentials are missing", async () => {
    const result = await sendEmail(message, {
      config: {
        nodeEnv: "test"
      },
      now: "2026-05-30T12:00:00.000Z"
    });

    expect(result).toEqual({
      status: "sent",
      provider: "local",
      messageId: "local-email-2026-05-30T12:00:00.000Z-1"
    });
    expect(readLocalEmailOutboxForTests()).toMatchObject([
      {
        message,
        sentAt: "2026-05-30T12:00:00.000Z"
      }
    ]);
  });

  it("surfaces missing production provider configuration clearly", async () => {
    const result = await sendEmail(message, {
      config: {
        nodeEnv: "production"
      }
    });

    expect(result).toEqual({
      status: "configuration_missing",
      provider: "resend",
      message:
        "Falta configurar IRRUPTIVO_EMAIL_PROVIDER_TOKEN e IRRUPTIVO_EMAIL_FROM_EMAIL para enviar emails transaccionales en producción.",
      missingConfig: [
        "IRRUPTIVO_EMAIL_PROVIDER_TOKEN",
        "IRRUPTIVO_EMAIL_FROM_EMAIL"
      ]
    });
    expect(readLocalEmailOutboxForTests()).toEqual([]);
  });

  it("sends production email through Resend with Resend API payload shape", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ id: "resend-email-123" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    });

    const result = await sendEmail(messageWithReplyTo, {
      config: {
        provider: "resend",
        providerToken: "re_secret",
        fromEmail: "ventas@irruptivo.com",
        fromName: "Irruptivo",
        nodeEnv: "production"
      },
      fetcher
    });

    expect(result).toEqual({
      status: "sent",
      provider: "resend",
      messageId: "resend-email-123"
    });
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer re_secret"
        },
        body: JSON.stringify({
          from: "Irruptivo <ventas@irruptivo.com>",
          to: ["luca@example.com"],
          subject: "Confirmación de compra IRR-000001 - Irruptivo",
          html: "<p>Recibimos tu pago confirmado.</p>",
          text: "Recibimos tu pago confirmado.",
          reply_to: "Soporte Irruptivo <soporte@irruptivo.com>"
        })
      }
    );
  });

  it("surfaces missing Resend production configuration without requiring provider URL", async () => {
    const result = await sendEmail(message, {
      config: {
        provider: "resend",
        nodeEnv: "production"
      }
    });

    expect(result).toEqual({
      status: "configuration_missing",
      provider: "resend",
      message:
        "Falta configurar IRRUPTIVO_EMAIL_PROVIDER_TOKEN e IRRUPTIVO_EMAIL_FROM_EMAIL para enviar emails transaccionales en producción.",
      missingConfig: [
        "IRRUPTIVO_EMAIL_PROVIDER_TOKEN",
        "IRRUPTIVO_EMAIL_FROM_EMAIL"
      ]
    });
    expect(readLocalEmailOutboxForTests()).toEqual([]);
  });
});
