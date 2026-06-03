"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "./auth";
import { setAdminNotificationEmail } from "./settings";
import { parseAdminNotificationEmailForm } from "./settings-validation";

export type AdminSettingsActionState = {
  tone: "success" | "error";
  message: string;
} | null;

export async function saveAdminNotificationEmailAction(
  _previousState: AdminSettingsActionState,
  formData: FormData
): Promise<AdminSettingsActionState> {
  await requireAdmin();

  const parsedForm = parseAdminNotificationEmailForm(formData);

  if (parsedForm.status === "invalid") {
    return {
      tone: "error",
      message: parsedForm.message
    };
  }

  await setAdminNotificationEmail(parsedForm.email);
  revalidatePath("/admin/configuracion");

  return {
    tone: "success",
    message: parsedForm.email
      ? "Email de notificaciones guardado."
      : "Notificaciones al admin desactivadas."
  };
}
