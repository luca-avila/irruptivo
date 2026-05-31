import styles from "../admin.module.css";

export default function AdminOrdersLoading() {
  return (
    <>
      <header className={styles.pageHeader} aria-live="polite" aria-busy="true">
        <p className={styles.eyebrow}>Operación</p>
        <h1 className={styles.title}>Cargando pedidos.</h1>
        <p className={styles.copy}>
          Estamos preparando la cola administrativa y el historial de pedidos.
        </p>
      </header>

      <section className={styles.loadingPanel} aria-hidden="true">
        <div />
        <div />
        <div />
      </section>
    </>
  );
}
