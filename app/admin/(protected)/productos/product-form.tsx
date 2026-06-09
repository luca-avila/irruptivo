import Link from "next/link";

import {
  PRODUCT_STATUS,
  type CatalogProductRecord
} from "../../../../src/catalog/catalog";
import { getAdminProductStatusLabel } from "../../../../src/admin/products";
import styles from "../admin.module.css";
import { ProductCategoryFields } from "./product-category-fields";

type ProductFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  product?: CatalogProductRecord;
};

const PRODUCT_DESCRIPTION_MAX_LENGTH = 5000;

export function ProductForm({ action, submitLabel, product }: ProductFormProps) {
  const selectedArea = product?.area ?? "clothing";
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
          maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH}
          rows={5}
        />
      </label>

      <ProductCategoryFields
        initialArea={selectedArea}
        initialClothingSubcategory={product?.clothingSubcategory ?? ""}
        initialSupplementType={product?.supplementType ?? ""}
      />

      {product ? (
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
      ) : null}

      <p className={styles.formHint}>
        {product
          ? "Para activar un producto tiene que existir al menos una variante/SKU."
          : "El producto se crea inactivo. Después de crearlo vas a poder cargar variantes e imágenes, y recién ahí activarlo."}
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
