import { randomUUID } from "node:crypto";

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
  providerUrl?: string | null;
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

type NormalizedHttpEmailProviderConfig = {
  providerUrl: string;
  providerToken: string;
  fromEmail: string;
  fromName: string;
};

const DEFAULT_FROM_NAME = "Irruptivo";
const LOCAL_EMAIL_PROVIDER = "local";
const HTTP_EMAIL_PROVIDER = "http";

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
  const normalizedConfig = normalizeHttpEmailProviderConfig(config);

  if (normalizedConfig.status === "configured") {
    return sendHttpEmail(normalizedMessage, normalizedConfig.config, fetcher);
  }

  if (shouldUseLocalEmailProvider(config)) {
    return sendLocalEmail(normalizedMessage, now);
  }

  return {
    status: "configuration_missing",
    provider: HTTP_EMAIL_PROVIDER,
    message: getMissingConfigMessage(normalizedConfig.missingConfig),
    missingConfig: normalizedConfig.missingConfig
  };
}

export function readEmailProviderConfig(
  env: Record<string, string | undefined> = process.env
): EmailProviderConfig {
  return {
    provider: env.IRRUPTIVO_EMAIL_PROVIDER,
    providerUrl: env.IRRUPTIVO_EMAIL_PROVIDER_URL,
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

async function sendHttpEmail(
  message: EmailMessage,
  config: NormalizedHttpEmailProviderConfig,
  fetcher: typeof fetch
): Promise<EmailSendResult> {
  const response = await fetcher(config.providerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.providerToken}`
    },
    body: JSON.stringify({
      from: {
        email: config.fromEmail,
        name: config.fromName
      },
      ...message
    })
  }).catch(() => null);

  if (!response?.ok) {
    return {
      status: "failed",
      provider: HTTP_EMAIL_PROVIDER,
      message: "No pudimos enviar el email transaccional con el proveedor configurado."
    };
  }

  const responseBody: unknown = await response.json().catch(() => null);

  return {
    status: "sent",
    provider: HTTP_EMAIL_PROVIDER,
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

function normalizeHttpEmailProviderConfig(config: EmailProviderConfig):
  | {
      status: "configured";
      config: NormalizedHttpEmailProviderConfig;
      missingConfig: [];
    }
  | {
      status: "missing";
      missingConfig: string[];
    } {
  const providerUrl = normalizeAbsoluteUrl(config.providerUrl);
  const providerToken = config.providerToken?.trim() ?? "";
  const fromEmail = config.fromEmail?.trim() ?? "";
  const fromName = config.fromName?.trim() || DEFAULT_FROM_NAME;
  const missingConfig = [
    providerUrl ? null : "IRRUPTIVO_EMAIL_PROVIDER_URL",
    providerToken ? null : "IRRUPTIVO_EMAIL_PROVIDER_TOKEN",
    fromEmail ? null : "IRRUPTIVO_EMAIL_FROM_EMAIL"
  ].filter((key): key is string => Boolean(key));

  if (!providerUrl || !providerToken || !fromEmail) {
    return {
      status: "missing",
      missingConfig
    };
  }

  return {
    status: "configured",
    config: {
      providerUrl,
      providerToken,
      fromEmail,
      fromName
    },
    missingConfig: []
  };
}

function shouldUseLocalEmailProvider(config: EmailProviderConfig): boolean {
  const provider = config.provider?.trim().toLowerCase();

  if (provider === LOCAL_EMAIL_PROVIDER) {
    return true;
  }

  if (provider === HTTP_EMAIL_PROVIDER) {
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

function normalizeAbsoluteUrl(value: string | null | undefined): string | null {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
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

function getDate(value: Date | string, name: string): Date {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`${name} must be a valid date`);
  }

  return date;
}

function assertNonEmptyString(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new RangeError(`${name} must be a non-empty string`);
  }
}
