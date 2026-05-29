import styles from "./page.module.css";

export default function SearchLoading() {
  return (
    <section className={styles.searchPage} aria-live="polite" aria-busy="true">
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Buscar</p>
          <h1 className={styles.title}>Cargando búsqueda.</h1>
        </header>
        <div className={styles.loadingBlock} aria-hidden="true">
          <div className={styles.loadingLine} />
          <div className={styles.loadingLine} />
          <div className={styles.loadingLine} />
        </div>
      </div>
    </section>
  );
}
