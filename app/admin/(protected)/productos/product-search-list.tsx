"use client";

import { ArrowRight, CircleOff } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { AdminProductListItemView } from "../../../../src/admin/products";
import { productNameMatchesQuery } from "../../../../src/admin/product-search";
import styles from "../admin.module.css";
import { ProductStatusToggle } from "./product-status-toggle";

type ProductSearchListProps = {
  products: AdminProductListItemView[];
};

// Client-side instant search that narrows the already server-filtered product
// list by name. Uses the "active"/"inactive" string literals instead of
// importing PRODUCT_STATUS from catalog.ts, which would pull node:fs into the
// client bundle and break the build.
export function ProductSearchList({ products }: ProductSearchListProps) {
  const [query, setQuery] = useState("");

  const visibleProducts = useMemo(
    () =>
      products.filter((product) =>
        productNameMatchesQuery(product.name, query)
      ),
    [products, query]
  );

  return (
    <>
      <label className={styles.field}>
        <span>Buscar productos por nombre</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre…"
          autoComplete="off"
        />
      </label>

      {visibleProducts.length === 0 ? (
        <section className={styles.emptyPanel} aria-live="polite">
          <CircleOff aria-hidden="true" size={24} strokeWidth={1.9} />
          <h2>No hay productos que coincidan con tu búsqueda.</h2>
          <p>Probá con otro nombre o limpiá la búsqueda.</p>
          <button
            className={styles.textButton}
            type="button"
            onClick={() => setQuery("")}
          >
            Limpiar búsqueda
          </button>
        </section>
      ) : (
        <section className={styles.tablePanel} aria-label="Listado de productos">
          <div className={styles.tableHeader}>
            <span>Producto</span>
            <span>Área</span>
            <span>Estado</span>
            <span>Precio base</span>
            <span>Acciones</span>
          </div>

          {visibleProducts.map((product) => {
            const nextStatus =
              product.status === "active" ? "inactive" : "active";
            const statusActionLabel =
              nextStatus === "active" ? "Activar" : "Desactivar";

            return (
              <article className={styles.tableRow} key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.slug}</span>
                  <small>{product.variantCountLabel}</small>
                  {!product.canActivate ? (
                    <small>Necesita variantes/SKU para activarse.</small>
                  ) : null}
                </div>
                <div>
                  <span>{product.areaLabel}</span>
                  <small>{product.contextLabel}</small>
                </div>
                <div>
                  <span
                    className={styles.statusPill}
                    data-status={product.status}
                  >
                    {product.statusLabel}
                  </span>
                </div>
                <div>{product.basePriceLabel}</div>
                <div className={styles.rowActions}>
                  <Link
                    className={styles.iconLink}
                    href={`/admin/productos/${encodeURIComponent(product.id)}/editar`}
                  >
                    <span>Editar</span>
                    <ArrowRight aria-hidden="true" size={17} strokeWidth={2.1} />
                  </Link>
                  <ProductStatusToggle
                    productId={product.id}
                    nextStatus={nextStatus}
                    label={statusActionLabel}
                  />
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
