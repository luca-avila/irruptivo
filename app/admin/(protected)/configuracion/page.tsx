import { MailCheck } from "lucide-react";

import { getStoreSettings } from "../../../../src/admin/settings";
import styles from "../admin.module.css";
import { AdminNotificationEmailForm } from "./admin-notification-email-form";

export default async function AdminSettingsPage() {
  const settings = await getStoreSettings();

  return (
    <>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Configuración</p>
        <h1 className={styles.title}>Configuración</h1>
        <p className={styles.copy}>
          Definí a qué casilla llegan los avisos internos cuando Mercado Pago
          confirma una compra.
        </p>
      </header>

      <section className={styles.grid} aria-label="Configuración de la tienda">
        <article className={styles.tile}>
          <div className={styles.tileHeader}>
            <h2>Notificaciones de compra</h2>
            <span className={styles.tileIcon}>
              <MailCheck aria-hidden="true" size={21} strokeWidth={2} />
            </span>
          </div>
          <p>
            Si el campo queda vacío, el sistema usa el fallback de entorno. Si
            tampoco está configurado, no se envía aviso interno.
          </p>
          <AdminNotificationEmailForm
            initialEmail={settings.adminNotificationEmail}
          />
        </article>
      </section>
    </>
  );
}
