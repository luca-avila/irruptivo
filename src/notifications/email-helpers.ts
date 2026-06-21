import { type EmailMessage, type EmailSendResult } from "./email-provider";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendEmailSafely(
  emailProvider: (message: EmailMessage) => Promise<EmailSendResult>,
  message: EmailMessage
): Promise<EmailSendResult> {
  try {
    return await emailProvider(message);
  } catch {
    return {
      status: "failed",
      provider: "unknown",
      message: "No pudimos enviar el email transaccional."
    };
  }
}
