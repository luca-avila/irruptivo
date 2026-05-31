import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  PackageCheck,
  Truck,
  UserRound
} from "lucide-react";
import Link from "next/link";

import { getAdminOrderDetail } from "../../../../../src/admin/orders";
import styles from "../../admin.module.css";

type AdminOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminOrderDetailPage({
  params
}: AdminOrderDetailPageProps) {
  const resolvedParams = await params;
  const detail = getAdminOrderDetail(decodeURIComponent(resolvedParams.id));

  if (!detail) {
    return (
      <>
        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>Operación</p>
          <h1 className={styles.title}>Pedido no encontrado</h1>
          <p className={styles.copy}>
            No encontramos un pedido con ese identificador en la cola
            administrativa.
          </p>
        </header>

        <section className={styles.emptyPanel} role="alert">
          <AlertTriangle aria-hidden="true" size={24} strokeWidth={1.9} />
          <h2>No pudimos abrir el detalle.</h2>
          <p>Volvé al listado para elegir un pedido disponible.</p>
          <Link className={styles.secondaryButton} href="/admin/pedidos">
            Volver a pedidos
          </Link>
        </section>
      </>
    );
  }

  return (
    <>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Operación</p>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>{detail.orderNumber}</h1>
            <p className={styles.copy}>
              Detalle operativo del pedido. Los importes e ítems se muestran
              como datos guardados de compra.
            </p>
          </div>
          <Link className={styles.secondaryButton} href="/admin/pedidos">
            <ArrowLeft aria-hidden="true" size={17} strokeWidth={2.1} />
            <span>Volver</span>
          </Link>
        </div>
      </header>

      {detail.manualReview.required ? (
        <section className={styles.feedback} data-tone="error" role="alert">
          <strong>{detail.manualReview.label}</strong>
          <p>{detail.manualReview.description}</p>
          {detail.manualReview.providerPaymentIds.length > 0 ? (
            <p>
              Pagos informados: {detail.manualReview.providerPaymentIds.join(", ")}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className={styles.detailGrid} aria-label="Datos del pedido">
        <article className={styles.detailPanel}>
          <div className={styles.detailPanelHeader}>
            <UserRound aria-hidden="true" size={19} strokeWidth={2} />
            <h2>Cliente</h2>
          </div>
          <dl className={styles.detailList}>
            <div>
              <dt>Nombre</dt>
              <dd>{detail.customer.fullName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{detail.customer.email}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{detail.customer.phone}</dd>
            </div>
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.detailPanelHeader}>
            <Truck aria-hidden="true" size={19} strokeWidth={2} />
            <h2>Entrega</h2>
          </div>
          <dl className={styles.detailList}>
            <div>
              <dt>Método</dt>
              <dd>{detail.delivery.methodLabel}</dd>
            </div>
            {detail.delivery.shippingAddress ? (
              <>
                <div>
                  <dt>Dirección</dt>
                  <dd>{detail.delivery.shippingAddress.addressLine}</dd>
                </div>
                <div>
                  <dt>Ciudad y provincia</dt>
                  <dd>{detail.delivery.shippingAddress.locationLabel}</dd>
                </div>
                <div>
                  <dt>Código postal</dt>
                  <dd>{detail.delivery.shippingAddress.postalCode}</dd>
                </div>
              </>
            ) : null}
            <div>
              <dt>Notas</dt>
              <dd>{detail.delivery.notes ?? detail.delivery.notesFallback}</dd>
            </div>
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.detailPanelHeader}>
            <PackageCheck aria-hidden="true" size={19} strokeWidth={2} />
            <h2>Estado</h2>
          </div>
          <dl className={styles.detailList}>
            <div>
              <dt>Pedido y pago</dt>
              <dd>
                <span className={styles.statusPill} data-tone={detail.statusTone}>
                  {detail.statusLabel}
                </span>
              </dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{detail.createdAtLabel}</dd>
            </div>
          </dl>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.detailPanelHeader}>
            <CreditCard aria-hidden="true" size={19} strokeWidth={2} />
            <h2>Pago</h2>
          </div>
          <dl className={styles.detailList}>
            <div>
              <dt>Proveedor</dt>
              <dd>{detail.payment.providerLabel}</dd>
            </div>
            <div>
              <dt>Preferencia</dt>
              <dd>{detail.payment.preferenceLabel}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{detail.payment.statusLabel}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className={styles.orderItemsSection} aria-labelledby="items-title">
        <div className={styles.sectionHeader}>
          <h2 id="items-title">Ítems del pedido</h2>
          <p>Datos de producto, variante, precio y cantidad guardados al comprar.</p>
        </div>

        <div className={styles.orderItemList}>
          {detail.items.map((item) => (
            <article className={styles.orderItemCard} key={`${item.sku}`}>
              <div>
                <strong>{item.productName}</strong>
                <span>{item.productAreaLabel}</span>
                <small>{item.productSlug}</small>
              </div>
              <div className={styles.orderItemMeta}>
                <span>{item.variantName}</span>
                <span>{item.optionSummary}</span>
                <span>{item.sku}</span>
              </div>
              <div className={styles.orderItemTotals}>
                <span>{item.quantityLabel}</span>
                <span>{item.unitPriceLabel}</span>
                <strong>{item.lineTotalLabel}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.financialSection} aria-labelledby="financial-title">
        <div className={styles.sectionHeader}>
          <h2 id="financial-title">Importes</h2>
          <p>{detail.financial.readOnlyLabel}</p>
        </div>

        <div className={styles.financialGrid}>
          {detail.financial.fields.map((field) => (
            <div className={styles.readOnlyField} key={field.label}>
              <span>{field.label}</span>
              <code>{field.value}</code>
              <p>{field.isReadOnly ? "No editable desde esta pantalla." : ""}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
