import { PackagePlus, Save } from "lucide-react";

import {
  createAdminProductVariant,
  updateAdminProductVariant
} from "../../../../src/admin/product-actions";
import {
  getAdminProductVariantViews,
  type AdminProductVariantView
} from "../../../../src/admin/products";
import {
  PRODUCT_AREA,
  type CatalogProductRecord
} from "../../../../src/catalog/catalog";
import styles from "../admin.module.css";

type VariantManagementProps = {
  product: CatalogProductRecord;
};

type VariantFormProps = {
  product: CatalogProductRecord;
  variant?: AdminProductVariantView;
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
            <VariantForm product={product} variant={variant} key={variant.id} />
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
        <VariantForm product={product} />
      </div>
    </section>
  );
}

function VariantForm({ product, variant }: VariantFormProps) {
  const isEditing = Boolean(variant);
  const action = isEditing ? updateAdminProductVariant : createAdminProductVariant;

  return (
    <form className={styles.variantCard} action={action}>
      <input type="hidden" name="productId" value={product.id} />
      {variant ? (
        <input type="hidden" name="variantId" value={variant.id} />
      ) : null}

      <div className={styles.variantCardHeader}>
        <div>
          <strong>{variant?.sku ?? "SKU nuevo"}</strong>
          <span>{variant?.optionSummary ?? getOptionHelp(product)}</span>
        </div>
        {variant ? (
          <div className={styles.variantMeta} aria-label="Resumen de variante">
            <span>Stock exacto: {variant.stockLabel}</span>
            <span>Precio efectivo: {variant.effectivePriceLabel}</span>
            <span>{variant.availabilityLabel}</span>
          </div>
        ) : null}
      </div>

      <div className={styles.variantFormGrid}>
        <label className={styles.field}>
          <span>SKU</span>
          <input
            name="sku"
            type="text"
            defaultValue={variant?.sku ?? ""}
            required
            maxLength={64}
          />
        </label>

        <label className={styles.field}>
          <span>Stock exacto</span>
          <input
            name="stock"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={variant?.stockCount ?? 0}
            required
          />
        </label>

        <label className={styles.field}>
          <span>Precio override opcional</span>
          <input
            name="priceOverrideArs"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            defaultValue={variant?.priceOverrideArs ?? ""}
            placeholder="Usar precio base"
          />
        </label>
      </div>

      <VariantOptionFields product={product} variant={variant} />

      <div className={styles.formActions}>
        <button className={styles.primaryButton} type="submit">
          {isEditing ? (
            <Save aria-hidden="true" size={17} strokeWidth={2.1} />
          ) : (
            <PackagePlus aria-hidden="true" size={17} strokeWidth={2.1} />
          )}
          <span>{isEditing ? "Guardar variante" : "Agregar variante"}</span>
        </button>
      </div>
    </form>
  );
}

function VariantOptionFields({ product, variant }: VariantFormProps) {
  if (product.area === PRODUCT_AREA.clothing) {
    return (
      <div className={styles.variantFormGrid}>
        <label className={styles.field}>
          <span>Color</span>
          <input
            name="color"
            type="text"
            defaultValue={variant?.options.color ?? ""}
            required
            maxLength={60}
          />
        </label>

        <label className={styles.field}>
          <span>Talle</span>
          <input
            name="size"
            type="text"
            defaultValue={variant?.options.size ?? ""}
            required
            maxLength={40}
          />
        </label>
      </div>
    );
  }

  return (
    <div className={styles.variantFormGrid}>
      <label className={styles.field}>
        <span>Sabor</span>
        <input
          name="flavor"
          type="text"
          defaultValue={variant?.options.flavor ?? ""}
          maxLength={60}
        />
      </label>

      <label className={styles.field}>
        <span>Peso</span>
        <input
          name="weight"
          type="text"
          defaultValue={variant?.options.weight ?? ""}
          maxLength={40}
        />
      </label>

      <label className={styles.field}>
        <span>Presentación</span>
        <input
          name="presentation"
          type="text"
          defaultValue={variant?.options.presentation ?? ""}
          maxLength={60}
        />
      </label>
    </div>
  );
}

function getOptionHelp(product: CatalogProductRecord): string {
  if (product.area === PRODUCT_AREA.clothing) {
    return "Combinación de color y talle";
  }

  return "Sabor, peso o presentación";
}
