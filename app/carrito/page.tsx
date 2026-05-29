import Link from "next/link";

export default function CartPage() {
  return (
    <section className="page-shell">
      <div className="page-panel">
        <p className="eyebrow">Carrito</p>
        <h1 className="page-title">Revisión del carrito.</h1>
        <p className="page-copy">
          Entrada pública al carrito local del visitante. La experiencia de
          revisión, totales y pago se implementa en próximos pasos.
        </p>
        <Link className="primary-link" href="/envios-y-cambios">
          Ver envíos y cambios
        </Link>
      </div>
    </section>
  );
}
