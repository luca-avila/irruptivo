import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import Link from "next/link";

import {
  type PaymentResultState,
  type PaymentResultView,
} from "../../payments/payment-result";
import styles from "./payment-result-page.module.css";

type StorefrontPaymentResultPageProps = {
  view: PaymentResultView | null;
};

const stateIcons = {
  success: CheckCircle2,
  failure: AlertCircle,
  pending: Clock3,
  expired: RotateCcw,
} as const satisfies Record<PaymentResultState, typeof CheckCircle2>;

export function StorefrontPaymentResultPage({
  view,
}: StorefrontPaymentResultPageProps) {
  if (!view) {
    return <PaymentResultNotFound />;
  }

  const StatusIcon = stateIcons[view.state];

  return (
    <section className={styles.page}>
      <div className={styles.inner}>
        <Link className={styles.backLink} href="/coleccion">
          <ShoppingBag aria-hidden="true" size={18} strokeWidth={2.1} />
          <span>Volver a la tienda</span>
        </Link>

        <section
          className={styles.panel}
          aria-labelledby="payment-result-title"
        >
          <div
            className={`${styles.statusIcon} ${styles[`${view.state}Icon`]}`}
          >
            <StatusIcon aria-hidden="true" size={28} strokeWidth={2.1} />
          </div>

          <p className={styles.eyebrow}>{view.eyebrow}</p>
          <h1 className={styles.title} id="payment-result-title">
            {view.title}
          </h1>
          <p className={styles.message}>{view.message}</p>

          <dl className={styles.details} aria-label="Resumen del pedido">
            <div>
              <dt>Pedido</dt>
              <dd>{view.order.orderNumber}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{view.statusLabel}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{view.order.totalLabel}</dd>
            </div>
            <div>
              <dt>Entrega</dt>
              <dd>{view.order.deliverySummary}</dd>
            </div>
          </dl>

          <section
            className={styles.nextSteps}
            aria-labelledby="next-steps-title"
          >
            <div className={styles.sectionTitleRow}>
              <Truck aria-hidden="true" size={19} strokeWidth={2.1} />
              <h2 id="next-steps-title">Próximos pasos</h2>
            </div>
            <ul>
              {view.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </section>

          <div className={styles.actions}>
            {view.guestStatusAction ? (
              <Link
                className={styles.primaryAction}
                href={view.guestStatusAction.href}
              >
                <ShieldCheck aria-hidden="true" size={18} strokeWidth={2.1} />
                <span>{view.guestStatusAction.label}</span>
              </Link>
            ) : (
              <Link
                className={styles.primaryAction}
                href={view.primaryAction.href}
              >
                <ShoppingBag aria-hidden="true" size={18} strokeWidth={2.1} />
                <span>{view.primaryAction.label}</span>
              </Link>
            )}
            {view.guestStatusAction ? (
              <Link
                className={styles.secondaryAction}
                href={view.primaryAction.href}
              >
                <ShoppingBag aria-hidden="true" size={18} strokeWidth={2.1} />
                <span>{view.primaryAction.label}</span>
              </Link>
            ) : null}
            <a
              className={styles.secondaryAction}
              href={view.supportAction.href}
            >
              <MessageCircle aria-hidden="true" size={18} strokeWidth={2.1} />
              <span>{view.supportAction.label}</span>
              <ExternalLink aria-hidden="true" size={15} strokeWidth={2.1} />
            </a>
          </div>
        </section>
      </div>
    </section>
  );
}

function PaymentResultNotFound() {
  return (
    <section className={styles.page}>
      <div className={styles.inner}>
        <section className={styles.panel} role="alert">
          <div className={`${styles.statusIcon} ${styles.failureIcon}`}>
            <AlertCircle aria-hidden="true" size={28} strokeWidth={2.1} />
          </div>
          <p className={styles.eyebrow}>Enlace no disponible</p>
          <h1 className={styles.title}>No encontramos este pedido</h1>
          <p className={styles.message}>
            Abrí el enlace completo que te devolvió Mercado Pago. Si el problema
            sigue, escribinos por WhatsApp con el comprobante de pago.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/coleccion">
              <ShoppingBag aria-hidden="true" size={18} strokeWidth={2.1} />
              <span>Volver a la tienda</span>
            </Link>
            <a
              className={styles.secondaryAction}
              href="https://wa.me/5491164176557"
            >
              <MessageCircle aria-hidden="true" size={18} strokeWidth={2.1} />
              <span>Escribir por WhatsApp</span>
              <ExternalLink aria-hidden="true" size={15} strokeWidth={2.1} />
            </a>
          </div>
        </section>
      </div>
    </section>
  );
}
