import Link from "next/link";

export default function HomePage() {
  return (
    <section className="page-shell">
      <div className="page-panel">
        <p className="eyebrow">Storefront</p>
        <h1 className="page-title">IRRUPTIVO</h1>
        <p className="page-copy">
          Shell publico mobile-first para navegar la coleccion, suplementos,
          busqueda, carrito y paginas de confianza del MVP.
        </p>
        <Link className="primary-link" href="/coleccion">
          Ver coleccion
        </Link>
      </div>
    </section>
  );
}
