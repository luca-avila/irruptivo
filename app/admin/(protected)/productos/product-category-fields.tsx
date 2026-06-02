"use client";

import { useState } from "react";

import type { ProductArea } from "../../../../src/catalog/catalog";
import styles from "../admin.module.css";

type ProductCategoryFieldsProps = {
  initialArea: ProductArea;
  initialClothingSubcategory: string;
  initialSupplementType: string;
};

// Client-side so the area <select> can drive which classification field shows.
// Uses string literals instead of importing PRODUCT_AREA from catalog.ts, which
// transitively pulls node:fs into the bundle and would break the client build.
export function ProductCategoryFields({
  initialArea,
  initialClothingSubcategory,
  initialSupplementType
}: ProductCategoryFieldsProps) {
  const [area, setArea] = useState<ProductArea>(initialArea);

  return (
    <div className={styles.formGrid}>
      <label className={styles.field}>
        <span>Área</span>
        <select
          name="area"
          value={area}
          onChange={(event) => setArea(event.target.value as ProductArea)}
          required
        >
          <option value="clothing">Colección</option>
          <option value="supplement">Suplementos</option>
        </select>
      </label>

      {area === "clothing" ? (
        <label className={styles.field}>
          <span>Subcategoría de indumentaria</span>
          <input
            name="clothingSubcategory"
            type="text"
            defaultValue={initialClothingSubcategory}
            maxLength={60}
          />
        </label>
      ) : (
        <label className={styles.field}>
          <span>Tipo de suplemento</span>
          <input
            name="supplementType"
            type="text"
            defaultValue={initialSupplementType}
            maxLength={60}
          />
        </label>
      )}
    </div>
  );
}
