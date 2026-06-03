import { z } from "zod";

export type AdminNotificationEmailFormResult =
  | {
      status: "valid";
      email: string | null;
    }
  | {
      status: "invalid";
      message: string;
    };

const adminNotificationEmailSchema = z
  .string()
  .transform((value) => value.trim())
  .refine(
    (value) => value.length === 0 || z.email().safeParse(value).success,
    "Ingresá un email válido o dejá el campo vacío."
  )
  .transform((value) => (value.length > 0 ? value : null));

export function parseAdminNotificationEmailForm(
  formData: FormData
): AdminNotificationEmailFormResult {
  const result = adminNotificationEmailSchema.safeParse(
    readStringField(formData, "adminNotificationEmail")
  );

  if (!result.success) {
    return {
      status: "invalid",
      message: result.error.issues[0]?.message ?? "Revisá el email ingresado."
    };
  }

  return {
    status: "valid",
    email: result.data
  };
}

function readStringField(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}
