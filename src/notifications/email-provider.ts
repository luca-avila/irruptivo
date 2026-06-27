import { randomUUID } from "node:crypto";

import { getDate } from "../shared/date-utils";
import { assertNonEmptyString } from "../shared/string-utils";

export type EmailRecipient = {
  email: string;
  name?: string;
};

export type EmailMessage = {
  to: EmailRecipient;
  subject: string;
  text: string;
  html?: string;
  replyTo?: EmailRecipient;
};

export type EmailProviderConfig = {
  provider?: string | null;
  providerToken?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  nodeEnv?: string | null;
};

export type EmailSendResult =
  | {
      status: "sent";
      provider: string;
      messageId: string;
    }
  | {
      status: "configuration_missing";
      provider: string;
      message: string;
      missingConfig: string[];
    }
  | {
      status: "failed";
      provider: string;
      message: string;
    };

export type SendEmailOptions = {
  config?: EmailProviderConfig;
  fetcher?: typeof fetch;
  now?: Date | string;
};

export type LocalEmailOutboxRecord = {
  message: EmailMessage;
  sentAt: string;
  messageId: string;
};

type NormalizedResendEmailProviderConfig = {
  providerToken: string;
  fromEmail: string;
  fromName: string;
};

const DEFAULT_FROM_NAME = "Irruptivo";
const LOCAL_EMAIL_PROVIDER = "local";
const RESEND_EMAIL_PROVIDER = "resend";
const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";

// Dev/demo-only transport outbox. Production email delivery state is persisted in
// `email_deliveries`; this array exists only for local provider inspection/tests.
const localEmailOutbox: LocalEmailOutboxRecord[] = [];

export async function sendEmail(
  message: EmailMessage,
  {
    config = readEmailProviderConfig(),
    fetcher = fetch,
    now = new Date()
  }: SendEmailOptions = {}
): Promise<EmailSendResult> {
  const normalizedMessage = normalizeEmailMessage(message);

  if (shouldUseLocalEmailProvider(config)) {
    return sendLocalEmail(normalizedMessage, now);
  }

  const normalizedConfig = normalizeResendEmailProviderConfig(config);

  if (normalizedConfig.status === "configured") {
    return sendResendEmail(normalizedMessage, normalizedConfig.config, fetcher);
  }

  return {
    status: "configuration_missing",
    provider: RESEND_EMAIL_PROVIDER,
    message: getMissingConfigMessage(normalizedConfig.missingConfig),
    missingConfig: normalizedConfig.missingConfig
  };
}

export function readEmailProviderConfig(
  env: Record<string, string | undefined> = process.env
): EmailProviderConfig {
  return {
    provider: env.IRRUPTIVO_EMAIL_PROVIDER,
    providerToken: env.IRRUPTIVO_EMAIL_PROVIDER_TOKEN,
    fromEmail: env.IRRUPTIVO_EMAIL_FROM_EMAIL ?? env.IRRUPTIVO_EMAIL_FROM,
    fromName: env.IRRUPTIVO_EMAIL_FROM_NAME,
    nodeEnv: env.NODE_ENV
  };
}

export function readLocalEmailOutboxForTests(): LocalEmailOutboxRecord[] {
  return localEmailOutbox.map(cloneLocalEmailOutboxRecord);
}

export function resetLocalEmailOutboxForTests(): void {
  localEmailOutbox.splice(0, localEmailOutbox.length);
}

async function sendResendEmail(
  message: EmailMessage,
  config: NormalizedResendEmailProviderConfig,
  fetcher: typeof fetch
): Promise<EmailSendResult> {
  const response = await fetcher(RESEND_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.providerToken}`
    },
    body: JSON.stringify({
      from: formatEmailAddress({
        email: config.fromEmail,
        name: config.fromName
      }),
      to: [message.to.email],
      subject: message.subject,
      ...(message.html ? { html: message.html } : {}),
      text: message.text,
      ...(message.replyTo
        ? {
            reply_to: formatEmailAddress(message.replyTo)
          }
        : {})
    })
  }).catch(() => null);

  if (!response?.ok) {
    return {
      status: "failed",
      provider: RESEND_EMAIL_PROVIDER,
      message: "No pudimos enviar el email transaccional con Resend."
    };
  }

  const responseBody: unknown = await response.json().catch(() => null);

  return {
    status: "sent",
    provider: RESEND_EMAIL_PROVIDER,
    messageId: readProviderMessageId(responseBody) ?? randomUUID()
  };
}

function sendLocalEmail(
  message: EmailMessage,
  now: Date | string
): EmailSendResult {
  const sentAt = getDate(now, "now").toISOString();
  const messageId = `local-email-${sentAt}-${localEmailOutbox.length + 1}`;

  localEmailOutbox.push({
    message: cloneEmailMessage(message),
    sentAt,
    messageId
  });

  return {
    status: "sent",
    provider: LOCAL_EMAIL_PROVIDER,
    messageId
  };
}

function normalizeResendEmailProviderConfig(config: EmailProviderConfig):
  | {
      status: "configured";
      config: NormalizedResendEmailProviderConfig;
      missingConfig: [];
    }
  | {
      status: "missing";
      missingConfig: string[];
    } {
  const providerToken = config.providerToken?.trim() ?? "";
  const fromEmail = config.fromEmail?.trim() ?? "";
  const fromName = config.fromName?.trim() || DEFAULT_FROM_NAME;
  const missingConfig = [
    providerToken ? null : "IRRUPTIVO_EMAIL_PROVIDER_TOKEN",
    fromEmail ? null : "IRRUPTIVO_EMAIL_FROM_EMAIL"
  ].filter((key): key is string => Boolean(key));

  if (!providerToken || !fromEmail) {
    return {
      status: "missing",
      missingConfig
    };
  }

  return {
    status: "configured",
    config: {
      providerToken,
      fromEmail,
      fromName
    },
    missingConfig: []
  };
}

function shouldUseLocalEmailProvider(config: EmailProviderConfig): boolean {
  const provider = config.provider?.trim().toLowerCase();

  if (provider === LOCAL_EMAIL_PROVIDER && config.nodeEnv !== "production") {
    return true;
  }

  if (provider === RESEND_EMAIL_PROVIDER) {
    return false;
  }

  return config.nodeEnv !== "production";
}

function normalizeEmailMessage(message: EmailMessage): EmailMessage {
  const toEmail = message.to.email.trim();
  const toName = message.to.name?.trim();
  const subject = message.subject.trim();
  const text = message.text.trim();
  const html = message.html?.trim();
  const replyToEmail = message.replyTo?.email.trim();
  const replyToName = message.replyTo?.name?.trim();

  assertNonEmptyString(toEmail, "message.to.email");
  assertNonEmptyString(subject, "message.subject");
  assertNonEmptyString(text, "message.text");

  return {
    to: {
      email: toEmail,
      ...(toName ? { name: toName } : {})
    },
    subject,
    text,
    ...(html ? { html } : {}),
    ...(replyToEmail
      ? {
          replyTo: {
            email: replyToEmail,
            ...(replyToName ? { name: replyToName } : {})
          }
        }
      : {})
  };
}

function getMissingConfigMessage(missingConfig: readonly string[]): string {
  return `Falta configurar ${formatSpanishList(
    missingConfig
  )} para enviar emails transaccionales en producción.`;
}

function formatSpanishList(values: readonly string[]): string {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  const [lastValue] = values.slice(-1);
  const previousValues = values.slice(0, -1);

  return `${previousValues.join(", ")} e ${lastValue}`;
}

function readProviderMessageId(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  return readOptionalString(record.messageId) ?? readOptionalString(record.id);
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatEmailAddress(recipient: EmailRecipient): string {
  return recipient.name
    ? `${recipient.name} <${recipient.email}>`
    : recipient.email;
}

function cloneLocalEmailOutboxRecord(
  record: LocalEmailOutboxRecord
): LocalEmailOutboxRecord {
  return {
    message: cloneEmailMessage(record.message),
    sentAt: record.sentAt,
    messageId: record.messageId
  };
}

function cloneEmailMessage(message: EmailMessage): EmailMessage {
  return {
    ...message,
    to: {
      ...message.to
    },
    ...(message.replyTo
      ? {
          replyTo: {
            ...message.replyTo
          }
        }
      : {})
  };
}
