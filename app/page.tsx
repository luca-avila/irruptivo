import Link from "next/link";

export default function HomePage() {
  return (
    <section className="page-shell">
      <div className="page-panel">
        <p className="eyebrow">Tienda</p>
        <h1 className="page-title">IRRUPTIVO</h1>
        <p className="page-copy">
          Entrada pensada primero para celular para navegar la colección, suplementos,
          búsqueda, carrito y páginas de confianza del MVP.
        </p>
        <Link className="primary-link" href="/coleccion">
          Ver colección
        </Link>
      </div>
    </section>
  );
}
