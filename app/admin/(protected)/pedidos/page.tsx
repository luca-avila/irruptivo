import styles from "../admin.module.css";

export default function AdminOrdersPage() {
  return (
    <>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Operación</p>
        <h1 className={styles.title}>Pedidos</h1>
        <p className={styles.copy}>
          La navegación protegida ya está lista para conectar la cola de pedidos
          y el seguimiento de cumplimiento en los próximos pasos.
        </p>
      </header>

      <section className={styles.notice} aria-labelledby="orders-placeholder-title">
        <strong id="orders-placeholder-title">Sección protegida</strong>
        <p>
          Esta pantalla no muestra ni modifica pedidos todavía. Solo confirma el
          acceso administrativo para la futura operación de cumplimiento.
        </p>
      </section>
    </>
  );
}
