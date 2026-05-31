"use client";

import { AlertTriangle } from "lucide-react";

import styles from "../admin.module.css";

type AdminOrdersErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminOrdersError({ reset }: AdminOrdersErrorProps) {
  return (
    <>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Operación</p>
        <h1 className={styles.title}>No pudimos cargar pedidos.</h1>
        <p className={styles.copy}>
          Reintentá la carga o volvé al inicio administrativo.
        </p>
      </header>

      <section className={styles.emptyPanel} role="alert">
        <AlertTriangle aria-hidden="true" size={24} strokeWidth={1.9} />
        <h2>La vista de pedidos no respondió.</h2>
        <p>Si el problema continúa, revisá el estado del servidor.</p>
        <button className={styles.primaryButton} type="button" onClick={reset}>
          Reintentar
        </button>
      </section>
    </>
  );
}
