"use client";

import Link from "next/link";

import styles from "./page.module.css";

type SearchErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SearchError({ reset }: SearchErrorProps) {
  return (
    <section className={styles.searchPage}>
      <div className={styles.inner}>
        <div className={styles.emptyState} role="alert">
          <p className={styles.eyebrow}>Buscar</p>
          <h1 className={styles.title}>No pudimos cargar la búsqueda.</h1>
          <p>Intentá de nuevo o volvé a la colección principal.</p>
          <div className={styles.emptyActions}>
            <button className={styles.retryButton} type="button" onClick={reset}>
              Reintentar
            </button>
            <Link className={styles.secondaryAction} href="/coleccion">
              Ver colección
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
