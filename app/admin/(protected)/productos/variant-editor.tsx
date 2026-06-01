"use client";

import { useState } from "react";
import { ChevronDown, Save } from "lucide-react";

import type { CatalogProductRecord } from "../../../../src/catalog/catalog";
import type { AdminProductVariantView } from "../../../../src/admin/products";
import styles from "../admin.module.css";

type VariantEditorProps = {
  product: CatalogProductRecord;
  variant: AdminProductVariantView;
  action: (formData: FormData) => void | Promise<void>;
};

type VariantFieldsProps = {
  product: CatalogProductRecord;
  variant?: AdminProductVariantView;
};

export function VariantEditor({ product, variant, action }: VariantEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  return (
    <div className={styles.variantCard}>
      <button
        type="button"
        className={styles.variantPreview}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <div className={styles.variantCardHeader}>
          <div>
            <strong>{variant.sku}</strong>
            <span>{variant.optionSummary}</span>
          </div>
          <div className={styles.variantMeta} aria-label="Resumen de variante">
            <span>Stock exacto: {variant.stockLabel}</span>
            <span>Precio efectivo: {variant.effectivePriceLabel}</span>
            <span>{variant.availabilityLabel}</span>
          </div>
        </div>
        <ChevronDown
          className={styles.variantChevron}
          data-open={isOpen}
          aria-hidden="true"
          size={20}
          strokeWidth={2}
        />
      </button>

      {isOpen ? (
        <form
          className={styles.variantForm}
          action={action}
          onChange={() => setIsDirty(true)}
        >
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="variantId" value={variant.id} />

          <VariantFields product={product} variant={variant} />

          <div className={styles.formActions}>
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={!isDirty}
            >
              <Save aria-hidden="true" size={17} strokeWidth={2.1} />
              <span>Guardar variante</span>
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export function VariantFields({ product, variant }: VariantFieldsProps) {
  return (
    <>
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
            className={styles.noSpin}
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
    </>
  );
}

function VariantOptionFields({ product, variant }: VariantFieldsProps) {
  if (product.area === "clothing") {
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
