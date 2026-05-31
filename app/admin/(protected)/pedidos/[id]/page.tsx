import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  PackageCheck,
  Truck,
  UserRound
} from "lucide-react";
import Link from "next/link";

import { type AdminOrderFulfillmentEditErrorCode } from "../../../../../src/admin/order-fulfillment-edits";
import { transitionAdminOrderFulfillment } from "../../../../../src/admin/order-actions";
import { getAdminOrderDetail } from "../../../../../src/admin/orders";
import styles from "../../admin.module.css";
import { OrderFulfillmentEditForm } from "./order-fulfillment-edit-form";

type AdminOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    estado?: string | string[];
    error?: string | string[];
  }>;
};

export default async function AdminOrderDetailPage({
  params,
  searchParams
}: AdminOrderDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const requestedState = getFirstSearchParamValue(resolvedSearchParams?.estado);
  const requestedError = getFirstSearchParamValue(resolvedSearchParams?.error);
  const detail = getAdminOrderDetail(decodeURIComponent(resolvedParams.id));
  const transitionFeedback = getTransitionFeedback({
    state: requestedState,
    error: isOrderFulfillmentEditErrorCode(requestedError) ? null : requestedError,
    statusLabel: detail?.statusLabel ?? null
  });
  const editFeedback = getOrderFulfillmentEditFeedback({
    state: requestedState,
    error: isOrderFulfillmentEditErrorCode(requestedError) ? requestedError : null
  });

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

      {transitionFeedback ? (
        <section
          className={styles.feedback}
          data-tone={transitionFeedback.tone}
          role={transitionFeedback.tone === "error" ? "alert" : "status"}
        >
          <strong>{transitionFeedback.title}</strong>
          <p>{transitionFeedback.description}</p>
        </section>
      ) : null}

      {editFeedback ? (
        <section
          className={styles.feedback}
          data-tone={editFeedback.tone}
          role={editFeedback.tone === "error" ? "alert" : "status"}
        >
          <strong>{editFeedback.title}</strong>
          <p>{editFeedback.description}</p>
        </section>
      ) : null}

      <section
        className={styles.fulfillmentPanel}
        aria-labelledby="fulfillment-title"
      >
        <div className={styles.fulfillmentHeader}>
          <div>
            <p className={styles.eyebrow}>Cumplimiento</p>
            <h2 id="fulfillment-title">Avance operativo</h2>
          </div>
          <span className={styles.statusPill} data-tone={detail.statusTone}>
            {detail.statusLabel}
          </span>
        </div>

        {detail.fulfillment.actions.length > 0 ? (
          <div className={styles.fulfillmentActionList}>
            {detail.fulfillment.actions.map((action) => (
              <div className={styles.fulfillmentAction} key={action.id}>
                <div>
                  <strong>Siguiente estado: {action.targetStatusLabel}</strong>
                  <p>{action.description}</p>
                </div>
                <form action={transitionAdminOrderFulfillment}>
                  <input type="hidden" name="orderId" value={detail.id} />
                  <input type="hidden" name="actionId" value={action.id} />
                  <button className={styles.primaryButton} type="submit">
                    <PackageCheck aria-hidden="true" size={17} strokeWidth={2.1} />
                    <span>{action.label}</span>
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.formHint}>
            {detail.fulfillment.unavailableReason ??
              "No hay acciones de cumplimiento disponibles."}
          </p>
        )}
      </section>

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

      <OrderFulfillmentEditForm detail={detail} />

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

function getTransitionFeedback({
  state,
  error,
  statusLabel
}: {
  state: string | null;
  error: string | null;
  statusLabel: string | null;
}): {
  tone: "success" | "error";
  title: string;
  description: string;
} | null {
  if (error) {
    return {
      tone: "error",
      title: "No pudimos actualizar el pedido",
      description: getTransitionErrorMessage(error)
    };
  }

  if (state === "estado-actualizado") {
    return {
      tone: "success",
      title: "Estado actualizado",
      description: statusLabel
        ? `El pedido quedó como ${statusLabel}. La cola ya refleja el cambio.`
        : "La cola ya refleja el cambio."
    };
  }

  return null;
}

function getTransitionErrorMessage(error: string): string {
  switch (error) {
    case "accion-invalida":
      return "La acción solicitada no existe. Usá uno de los botones disponibles.";
    case "accion-no-disponible":
      return "Esa acción no corresponde al estado o método de entrega actual.";
    case "estado-pago-bloqueado":
      return "El pedido no tiene un pago confirmado para avanzar en cumplimiento.";
    case "estado-final":
      return "Este pedido ya no tiene pasos de cumplimiento disponibles.";
    case "guardado-fallido":
      return "No pudimos guardar el nuevo estado. Volvé a intentar.";
    case "pedido-no-encontrado":
    default:
      return "No encontramos el pedido para actualizar.";
  }
}

const ORDER_FULFILLMENT_EDIT_ERROR_CODES = new Set<string>([
  "empty_update",
  "field_too_long",
  "immutable_field",
  "invalid_address_line",
  "invalid_city",
  "invalid_email",
  "invalid_full_name",
  "invalid_phone",
  "invalid_postal_code",
  "invalid_province",
  "not_found",
  "order_not_editable",
  "save_failed"
]);

function getOrderFulfillmentEditFeedback({
  state,
  error
}: {
  state: string | null;
  error: AdminOrderFulfillmentEditErrorCode | null;
}): {
  tone: "success" | "error";
  title: string;
  description: string;
} | null {
  if (error) {
    return {
      tone: "error",
      title: "No pudimos guardar los datos",
      description: getOrderFulfillmentEditErrorMessage(error)
    };
  }

  if (state === "fulfillment-actualizado") {
    return {
      tone: "success",
      title: "Datos actualizados",
      description: "Los datos de cumplimiento se guardaron correctamente."
    };
  }

  return null;
}

function getOrderFulfillmentEditErrorMessage(
  error: AdminOrderFulfillmentEditErrorCode
): string {
  switch (error) {
    case "empty_update":
      return "No hay datos de cumplimiento para guardar.";
    case "field_too_long":
      return "Uno de los campos supera el largo permitido.";
    case "immutable_field":
      return "Los ítems, importes, costo de entrega, pago y estado no se pueden editar desde esta pantalla.";
    case "invalid_address_line":
      return "Ingresá una dirección de entrega.";
    case "invalid_city":
      return "Ingresá la ciudad de entrega.";
    case "invalid_email":
      return "Ingresá un email válido.";
    case "invalid_full_name":
      return "Ingresá el nombre del cliente.";
    case "invalid_phone":
      return "Ingresá un teléfono de contacto.";
    case "invalid_postal_code":
      return "Ingresá el código postal.";
    case "invalid_province":
      return "Ingresá la provincia de entrega.";
    case "not_found":
      return "No encontramos el pedido solicitado.";
    case "order_not_editable":
      return "Los datos operativos se pueden editar cuando el pago está confirmado.";
    case "save_failed":
      return "No pudimos guardar los datos del pedido. Volvé a intentar.";
  }
}

function isOrderFulfillmentEditErrorCode(
  error: string | null
): error is AdminOrderFulfillmentEditErrorCode {
  return Boolean(error && ORDER_FULFILLMENT_EDIT_ERROR_CODES.has(error));
}

function getFirstSearchParamValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
