"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";

import {
  saveAdminNotificationEmailAction,
  type AdminSettingsActionState
} from "../../../../src/admin/settings-actions";
import styles from "../admin.module.css";

type AdminNotificationEmailFormProps = {
  initialEmail: string | null;
};

const initialState = null satisfies AdminSettingsActionState;

export function AdminNotificationEmailForm({
  initialEmail
}: AdminNotificationEmailFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveAdminNotificationEmailAction,
    initialState
  );

  return (
    <form className={styles.formPanel} action={formAction}>
      <label className={styles.field}>
        <span>Email para avisos de compra</span>
        <input
          type="email"
          name="adminNotificationEmail"
          defaultValue={initialEmail ?? ""}
          placeholder="ventas@irruptivo.com"
          autoComplete="email"
        />
      </label>

      {state ? (
        <div className={styles.feedbackInline} data-tone={state.tone} role="status">
          {state.message}
        </div>
      ) : null}

      <button className={styles.primaryButton} type="submit" disabled={isPending}>
        <Save aria-hidden="true" size={18} strokeWidth={2.1} />
        <span>{isPending ? "Guardando" : "Guardar configuración"}</span>
      </button>
    </form>
  );
}
