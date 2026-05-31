import { ArrowRight, CircleOff } from "lucide-react";
import Link from "next/link";

import { listAdminOrders } from "../../../../src/admin/orders";
import styles from "../admin.module.css";

type AdminOrdersPageProps = {
  searchParams?: Promise<{
    vista?: string | string[];
  }>;
};

export default async function AdminOrdersPage({
  searchParams
}: AdminOrdersPageProps) {
  const params = await searchParams;
  const orderList = listAdminOrders({
    filter: getFirstSearchParamValue(params?.vista)
  });

  return (
    <>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Operación</p>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Pedidos</h1>
            <p className={styles.copy}>
              Revisá pedidos pagos en cola y consultá el historial operativo sin
              modificar estados ni importes.
            </p>
          </div>
        </div>
      </header>

      <section className={styles.metricGrid} aria-label="Resumen de pedidos">
        <OrderMetric label="Total" value={orderList.totalOrderCount} />
        <OrderMetric label="En cola" value={orderList.queueOrderCount} />
        <OrderMetric label="Revisión" value={orderList.manualReviewCount} />
      </section>

      <nav className={styles.filterBar} aria-label="Filtros de pedidos">
        {orderList.filters.map((filter) => (
          <Link
            className={styles.filterLink}
            data-active={filter.isActive ? "true" : "false"}
            href={getFilterHref(filter.value)}
            key={filter.value}
          >
            <span>{filter.label}</span>
            <strong>{filter.orderCount}</strong>
          </Link>
        ))}
      </nav>

      {orderList.orders.length > 0 ? (
        <section
          className={styles.orderTablePanel}
          aria-label={`Pedidos: ${orderList.activeFilterLabel}`}
        >
          <div className={styles.orderTableHeader}>
            <span>Pedido</span>
            <span>Cliente</span>
            <span>Estado</span>
            <span>Entrega</span>
            <span>Total</span>
            <span>Acciones</span>
          </div>

          {orderList.orders.map((order) => (
            <article className={styles.orderTableRow} key={order.id}>
              <div>
                <strong>{order.orderNumber}</strong>
                <span>{order.createdAtLabel}</span>
                {order.manualReviewRequired ? (
                  <small>{order.manualReviewLabel}</small>
                ) : null}
              </div>
              <div>
                <span>{order.customerName}</span>
              </div>
              <div>
                <span className={styles.statusPill} data-tone={order.statusTone}>
                  {order.statusLabel}
                </span>
              </div>
              <div>
                <span>{order.deliveryMethodLabel}</span>
                <small>{order.shippingLocationLabel ?? "No aplica"}</small>
              </div>
              <div>
                <strong>{order.totalLabel}</strong>
              </div>
              <div className={styles.rowActions}>
                <Link className={styles.iconLink} href={order.detailHref}>
                  <span>Ver detalle</span>
                  <ArrowRight aria-hidden="true" size={17} strokeWidth={2.1} />
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.emptyPanel} aria-live="polite">
          <CircleOff aria-hidden="true" size={24} strokeWidth={1.9} />
          <h2>{orderList.emptyState?.title ?? "No hay pedidos para mostrar."}</h2>
          <p>
            {orderList.emptyState?.description ??
              "Cuando existan pedidos en este filtro, van a aparecer acá."}
          </p>
        </section>
      )}
    </>
  );
}

function OrderMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getFilterHref(filterValue: string): string {
  return filterValue === "cola"
    ? "/admin/pedidos"
    : `/admin/pedidos?vista=${encodeURIComponent(filterValue)}`;
}

function getFirstSearchParamValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
