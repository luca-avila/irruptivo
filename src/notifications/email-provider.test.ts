import { beforeEach, describe, expect, it } from "vitest";

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
      provider: "http",
      message:
        "Falta configurar IRRUPTIVO_EMAIL_PROVIDER_URL, IRRUPTIVO_EMAIL_PROVIDER_TOKEN e IRRUPTIVO_EMAIL_FROM_EMAIL para enviar emails transaccionales en producción.",
      missingConfig: [
        "IRRUPTIVO_EMAIL_PROVIDER_URL",
        "IRRUPTIVO_EMAIL_PROVIDER_TOKEN",
        "IRRUPTIVO_EMAIL_FROM_EMAIL"
      ]
    });
    expect(readLocalEmailOutboxForTests()).toEqual([]);
  });
});
