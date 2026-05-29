import styles from "../admin.module.css";

export default function AdminProductsPage() {
  return (
    <>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Catálogo</p>
        <h1 className={styles.title}>Productos</h1>
        <p className={styles.copy}>
          La navegación protegida ya está lista para conectar la gestión de
          productos, variantes, stock e imágenes en los próximos pasos.
        </p>
      </header>

      <section className={styles.notice} aria-labelledby="products-placeholder-title">
        <strong id="products-placeholder-title">Sección protegida</strong>
        <p>
          Esta pantalla no crea ni edita productos todavía. Solo confirma el
          acceso administrativo para la futura gestión del catálogo.
        </p>
      </section>
    </>
  );
}
