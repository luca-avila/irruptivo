import { PackagePlus } from "lucide-react";

import {
  createAdminProductVariant,
  updateAdminProductVariant
} from "../../../../src/admin/product-actions";
import { getAdminProductVariantViews } from "../../../../src/admin/products";
import { type CatalogProductRecord } from "../../../../src/catalog/catalog";
import styles from "../admin.module.css";
import { VariantEditor, VariantFields } from "./variant-editor";

type VariantManagementProps = {
  product: CatalogProductRecord;
};

export function VariantManagement({ product }: VariantManagementProps) {
  const variants = getAdminProductVariantViews(product);

  return (
    <section className={styles.variantSection} aria-labelledby="variant-section-title">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Variantes y stock</p>
          <h2 id="variant-section-title">SKUs vendibles</h2>
          <p>
            Definí las opciones, el stock exacto y el precio efectivo por variante.
          </p>
        </div>
      </div>

      {variants.length > 0 ? (
        <div className={styles.variantList} aria-label="Variantes existentes">
          {variants.map((variant) => (
            <VariantEditor
              product={product}
              variant={variant}
              action={updateAdminProductVariant}
              key={variant.id}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyPanel} aria-live="polite">
          <PackagePlus aria-hidden="true" size={24} strokeWidth={1.9} />
          <h2>Todavía no hay variantes/SKU.</h2>
          <p>Agregá al menos una variante válida para poder activar el producto.</p>
        </div>
      )}

      <div className={styles.variantAddBlock}>
        <h3>Nueva variante/SKU</h3>
        <form className={styles.variantCard} action={createAdminProductVariant}>
          <input type="hidden" name="productId" value={product.id} />

          <VariantFields product={product} />

          <div className={styles.formActions}>
            <button className={styles.primaryButton} type="submit">
              <PackagePlus aria-hidden="true" size={17} strokeWidth={2.1} />
              <span>Agregar variante</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
