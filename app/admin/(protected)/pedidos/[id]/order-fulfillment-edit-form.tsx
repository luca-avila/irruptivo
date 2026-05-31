import { Save } from "lucide-react";

import { updateAdminOrderFulfillmentFields } from "../../../../../src/admin/order-fulfillment-edit-actions";
import { type AdminOrderDetailView } from "../../../../../src/admin/orders";
import styles from "../../admin.module.css";

type OrderFulfillmentEditFormProps = {
  detail: AdminOrderDetailView;
};

export function OrderFulfillmentEditForm({
  detail
}: OrderFulfillmentEditFormProps) {
  return (
    <section
      className={styles.orderEditSection}
      aria-labelledby="fulfillment-edit-title"
    >
      <div className={styles.sectionHeader}>
        <h2 id="fulfillment-edit-title">Datos editables de cumplimiento</h2>
        <p>
          Corregí contacto, entrega y notas internas. Los ítems, cantidades,
          importes, costo de entrega y pago quedan solo lectura.
        </p>
      </div>

      {detail.fulfillmentEdit.canEdit ? (
        <form
          className={styles.formPanel}
          action={updateAdminOrderFulfillmentFields}
        >
          <input type="hidden" name="orderId" value={detail.id} />

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Nombre del cliente</span>
              <input
                name="contact.fullName"
                type="text"
                defaultValue={detail.customer.fullName}
                required
                maxLength={120}
              />
            </label>

            <label className={styles.field}>
              <span>Email de contacto</span>
              <input
                name="contact.email"
                type="email"
                defaultValue={detail.customer.email}
                required
                maxLength={160}
              />
            </label>

            <label className={styles.field}>
              <span>Teléfono de contacto</span>
              <input
                name="contact.phone"
                type="tel"
                defaultValue={detail.customer.phone}
                required
                maxLength={60}
              />
            </label>
          </div>

          {detail.delivery.requiresShippingAddress ? (
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Dirección de envío</span>
                <input
                  name="delivery.shippingAddress.addressLine"
                  type="text"
                  defaultValue={detail.delivery.shippingAddress?.addressLine ?? ""}
                  required
                  maxLength={160}
                />
              </label>

              <label className={styles.field}>
                <span>Ciudad</span>
                <input
                  name="delivery.shippingAddress.city"
                  type="text"
                  defaultValue={detail.delivery.shippingAddress?.city ?? ""}
                  required
                  maxLength={80}
                />
              </label>

              <label className={styles.field}>
                <span>Provincia</span>
                <input
                  name="delivery.shippingAddress.province"
                  type="text"
                  defaultValue={detail.delivery.shippingAddress?.province ?? ""}
                  required
                  maxLength={80}
                />
              </label>

              <label className={styles.field}>
                <span>Código postal</span>
                <input
                  name="delivery.shippingAddress.postalCode"
                  type="text"
                  defaultValue={detail.delivery.shippingAddress?.postalCode ?? ""}
                  required
                  maxLength={20}
                />
              </label>
            </div>
          ) : null}

          <label className={styles.field}>
            <span>Notas de entrega o retiro</span>
            <textarea
              name="delivery.notes"
              defaultValue={detail.delivery.notes ?? ""}
              maxLength={500}
              rows={4}
            />
          </label>

          <label className={styles.field}>
            <span>Notas internas</span>
            <textarea
              name="adminNotes"
              defaultValue={detail.fulfillmentEdit.adminNotes ?? ""}
              maxLength={1000}
              rows={5}
            />
          </label>

          <p className={styles.formHint}>
            Las notas internas no se muestran al cliente.
          </p>

          <div className={styles.formActions}>
            <button className={styles.primaryButton} type="submit">
              <Save aria-hidden="true" size={17} strokeWidth={2.1} />
              <span>Guardar datos</span>
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.formPanel}>
          <p className={styles.formHint}>
            {detail.fulfillmentEdit.unavailableReason ??
              "Estos datos no están disponibles para edición."}
          </p>
          <div className={styles.readOnlyField}>
            <span>Notas internas</span>
            <code>
              {detail.fulfillmentEdit.adminNotes ??
                detail.fulfillmentEdit.adminNotesFallback}
            </code>
            <p>No editable para este estado del pedido.</p>
          </div>
        </div>
      )}
    </section>
  );
}
