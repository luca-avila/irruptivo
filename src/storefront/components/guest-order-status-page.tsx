import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MessageCircle,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Truck,
  UserRound
} from "lucide-react";
import Link from "next/link";

import {
  type GuestOrderStatusOrder,
  type GuestOrderStatusTone
} from "../../orders/guest-order-status";
import { contactLink } from "../navigation";
import styles from "./guest-order-status-page.module.css";

type StorefrontGuestOrderStatusPageProps = {
  order: GuestOrderStatusOrder | null;
};

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires"
});

export function StorefrontGuestOrderStatusPage({
  order
}: StorefrontGuestOrderStatusPageProps) {
  if (!order) {
    return <GuestOrderNotFoundState />;
  }

  const formattedDate = formatOrderDate(order.createdAt);

  return (
    <section className={styles.statusPage}>
      <div className={styles.inner}>
        <Link className={styles.backLink} href="/">
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={2} />
          <span>Volver a la tienda</span>
        </Link>

        <header className={styles.header}>
          <p className={styles.eyebrow}>Estado del pedido</p>
          <div className={styles.headerLine}>
            <h1>Pedido {order.orderNumber}</h1>
            <span className={styles.statusBadge} data-tone={order.status.tone}>
              {order.status.label}
            </span>
          </div>
          <p className={styles.subtitle}>
            Consulta privada y de solo lectura. Guardá este enlace para volver a
            revisar el estado.
          </p>
          {formattedDate ? (
            <p className={styles.createdAt}>Creado el {formattedDate}</p>
          ) : null}
        </header>

        <div className={styles.layout}>
          <main className={styles.mainColumn}>
            <section className={styles.statusPanel} aria-labelledby="order-status-title">
              <div className={styles.statusIcon} data-tone={order.status.tone}>
                <StatusIcon tone={order.status.tone} />
              </div>
              <div className={styles.statusCopy}>
                <p className={styles.panelEyebrow}>Estado actual</p>
                <h2 id="order-status-title">{order.status.label}</h2>
                <p>{order.status.description}</p>
                <strong>{order.status.nextStep}</strong>
              </div>
            </section>

            <section className={styles.panel} aria-labelledby="order-items-title">
              <div className={styles.panelHeader}>
                <ReceiptText aria-hidden="true" size={21} strokeWidth={2} />
                <div>
                  <p className={styles.panelEyebrow}>Detalle</p>
                  <h2 id="order-items-title">Productos del pedido</h2>
                </div>
              </div>

              <ul className={styles.itemList}>
                {order.items.map((item) => (
                  <li className={styles.item} key={`${item.sku}-${item.optionSummary}`}>
                    <div className={styles.itemMain}>
                      <h3>{item.productName}</h3>
                      <p>{item.optionSummary}</p>
                      <span>SKU {item.sku}</span>
                    </div>
                    <div className={styles.itemNumbers}>
                      <span>{item.quantity} u.</span>
                      <span>{priceFormatter.format(item.unitPriceArs)} c/u</span>
                      <strong>{priceFormatter.format(item.lineTotalArs)}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </main>

          <aside className={styles.sideColumn} aria-label="Resumen del pedido">
            <section className={styles.panel} aria-labelledby="order-total-title">
              <div className={styles.panelHeader}>
                <ShieldCheck aria-hidden="true" size={21} strokeWidth={2} />
                <div>
                  <p className={styles.panelEyebrow}>Pago</p>
                  <h2 id="order-total-title">Total</h2>
                </div>
              </div>

              <dl className={styles.totalList}>
                <div>
                  <dt>Subtotal</dt>
                  <dd>{priceFormatter.format(order.totals.subtotalArs)}</dd>
                </div>
                <div>
                  <dt>Entrega</dt>
                  <dd>{priceFormatter.format(order.totals.deliveryCostArs)}</dd>
                </div>
                <div className={styles.totalRow}>
                  <dt>Total</dt>
                  <dd>{priceFormatter.format(order.totals.totalArs)}</dd>
                </div>
              </dl>
            </section>

            <section className={styles.panel} aria-labelledby="order-delivery-title">
              <div className={styles.panelHeader}>
                <Truck aria-hidden="true" size={21} strokeWidth={2} />
                <div>
                  <p className={styles.panelEyebrow}>Entrega</p>
                  <h2 id="order-delivery-title">{order.delivery.methodLabel}</h2>
                </div>
              </div>

              <p className={styles.deliverySummary}>{order.delivery.summary}</p>
              {order.delivery.shippingAddress ? (
                <dl className={styles.detailList}>
                  <div>
                    <dt>Dirección</dt>
                    <dd>{order.delivery.shippingAddress.addressLine}</dd>
                  </div>
                  <div>
                    <dt>Ciudad</dt>
                    <dd>{order.delivery.shippingAddress.city}</dd>
                  </div>
                  <div>
                    <dt>Provincia</dt>
                    <dd>{order.delivery.shippingAddress.province}</dd>
                  </div>
                  <div>
                    <dt>Código postal</dt>
                    <dd>{order.delivery.shippingAddress.postalCode}</dd>
                  </div>
                </dl>
              ) : null}
              {order.delivery.notes ? (
                <p className={styles.notes}>Notas: {order.delivery.notes}</p>
              ) : null}
            </section>

            <section className={styles.panel} aria-labelledby="order-contact-title">
              <div className={styles.panelHeader}>
                <UserRound aria-hidden="true" size={21} strokeWidth={2} />
                <div>
                  <p className={styles.panelEyebrow}>Contacto</p>
                  <h2 id="order-contact-title">Datos del pedido</h2>
                </div>
              </div>

              <dl className={styles.detailList}>
                <div>
                  <dt>Nombre</dt>
                  <dd>{order.contact.fullName}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{order.contact.email}</dd>
                </div>
                <div>
                  <dt>Teléfono</dt>
                  <dd>{order.contact.phone}</dd>
                </div>
              </dl>

              <a
                className={styles.contactAction}
                href={contactLink.href}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle aria-hidden="true" size={18} strokeWidth={2.1} />
                <span>Escribir por WhatsApp</span>
                <ExternalLink aria-hidden="true" size={16} strokeWidth={2.1} />
              </a>
              <p className={styles.supportCopy}>
                Incluí el número {order.orderNumber} para que podamos ubicarlo.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}

function GuestOrderNotFoundState() {
  return (
    <section className={styles.statusPage}>
      <div className={styles.inner}>
        <section className={styles.emptyState} role="alert">
          <AlertCircle aria-hidden="true" size={36} strokeWidth={2.1} />
          <p className={styles.panelEyebrow}>Enlace de pedido</p>
          <h1>No encontramos ese pedido</h1>
          <p>
            El enlace puede estar incompleto o no corresponder a un pedido
            disponible. No se mostró información privada.
          </p>
          <div className={styles.emptyActions}>
            <a
              className={styles.contactAction}
              href={contactLink.href}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle aria-hidden="true" size={18} strokeWidth={2.1} />
              <span>Consultar por WhatsApp</span>
              <ExternalLink aria-hidden="true" size={16} strokeWidth={2.1} />
            </a>
            <Link className={styles.secondaryAction} href="/">
              Volver a la tienda
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}

function StatusIcon({ tone }: { tone: GuestOrderStatusTone }) {
  if (tone === "danger") {
    return <AlertCircle aria-hidden="true" size={28} strokeWidth={2.1} />;
  }

  if (tone === "success") {
    return <CheckCircle2 aria-hidden="true" size={28} strokeWidth={2.1} />;
  }

  if (tone === "progress") {
    return <PackageCheck aria-hidden="true" size={28} strokeWidth={2.1} />;
  }

  return <Clock3 aria-hidden="true" size={28} strokeWidth={2.1} />;
}

function formatOrderDate(value: string): string | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return dateFormatter.format(date);
}
