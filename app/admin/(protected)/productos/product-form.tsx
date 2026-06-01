import Link from "next/link";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductRecord
} from "../../../../src/catalog/catalog";
import {
  getAdminProductAreaLabel,
  getAdminProductStatusLabel
} from "../../../../src/admin/products";
import styles from "../admin.module.css";

type ProductFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  product?: CatalogProductRecord;
};

export function ProductForm({ action, submitLabel, product }: ProductFormProps) {
  const selectedArea = product?.area ?? PRODUCT_AREA.clothing;
  const selectedStatus = product?.status ?? PRODUCT_STATUS.inactive;

  return (
    <form className={styles.formPanel} action={action}>
      {product ? (
        <input type="hidden" name="productId" value={product.id} />
      ) : null}

      {product ? (
        <div className={styles.readOnlyField}>
          <span>Slug</span>
          <code>{product.slug}</code>
          <p>El slug queda fijo después de crear el producto.</p>
        </div>
      ) : null}

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Nombre</span>
          <input
            name="name"
            type="text"
            defaultValue={product?.name ?? ""}
            required
            maxLength={90}
          />
        </label>

        <label className={styles.field}>
          <span>Precio base</span>
          <input
            className={styles.noSpin}
            name="basePriceArs"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            defaultValue={product?.basePriceArs ?? ""}
            required
          />
        </label>
      </div>

      <label className={styles.field}>
        <span>Descripción</span>
        <textarea
          name="description"
          defaultValue={product?.description ?? ""}
          required
          maxLength={600}
          rows={5}
        />
      </label>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Área</span>
          <select name="area" defaultValue={selectedArea} required>
            <option value={PRODUCT_AREA.clothing}>
              {getAdminProductAreaLabel(PRODUCT_AREA.clothing)}
            </option>
            <option value={PRODUCT_AREA.supplement}>
              {getAdminProductAreaLabel(PRODUCT_AREA.supplement)}
            </option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Estado</span>
          <select name="status" defaultValue={selectedStatus} required>
            <option value={PRODUCT_STATUS.inactive}>
              {getAdminProductStatusLabel(PRODUCT_STATUS.inactive)}
            </option>
            <option value={PRODUCT_STATUS.active}>
              {getAdminProductStatusLabel(PRODUCT_STATUS.active)}
            </option>
          </select>
        </label>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Subcategoría de indumentaria</span>
          <input
            name="clothingSubcategory"
            type="text"
            defaultValue={product?.clothingSubcategory ?? ""}
            maxLength={60}
          />
        </label>

        <label className={styles.field}>
          <span>Tipo de suplemento</span>
          <input
            name="supplementType"
            type="text"
            defaultValue={product?.supplementType ?? ""}
            maxLength={60}
          />
        </label>
      </div>

      <p className={styles.formHint}>
        Para activar un producto tiene que existir al menos una variante/SKU.
      </p>

      <div className={styles.formActions}>
        <button className={styles.primaryButton} type="submit">
          {submitLabel}
        </button>
        <Link className={styles.secondaryButton} href="/admin/productos">
          Volver a productos
        </Link>
      </div>
    </form>
  );
}
