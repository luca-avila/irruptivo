import { ArrowRight, CircleOff, PackagePlus } from "lucide-react";
import Link from "next/link";

import { changeAdminProductStatus } from "../../../../src/admin/product-actions";
import {
  listAdminProducts,
  readAdminProductRecords,
  type ProductManagementErrorCode
} from "../../../../src/admin/products";
import { PRODUCT_STATUS } from "../../../../src/catalog/catalog";
import styles from "../admin.module.css";

type ProductFilter = "todos" | "activos" | "inactivos";

type AdminProductsPageProps = {
  searchParams?: Promise<{
    estado?: string | string[];
    error?: string | string[];
    filtro?: string | string[];
  }>;
};

export default async function AdminProductsPage({
  searchParams
}: AdminProductsPageProps) {
  const params = await searchParams;
  const feedback = getProductFeedbackMessage({
    state: getFirstSearchParamValue(params?.estado),
    error: getFirstSearchParamValue(params?.error)
  });
  const productList = listAdminProducts(await readAdminProductRecords());
  const activeFilter = getActiveProductFilter(
    getFirstSearchParamValue(params?.filtro)
  );
  const visibleProducts = productList.products.filter((product) => {
    if (activeFilter === "activos") {
      return product.status === PRODUCT_STATUS.active;
    }

    if (activeFilter === "inactivos") {
      return product.status === PRODUCT_STATUS.inactive;
    }

    return true;
  });

  return (
    <>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Catálogo</p>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Productos</h1>
            <p className={styles.copy}>
              Creá productos base, editá sus datos comerciales y controlá si
              aparecen publicados en la tienda.
            </p>
          </div>
          <Link className={styles.headerAction} href="/admin/productos/nuevo">
            <PackagePlus aria-hidden="true" size={18} strokeWidth={2.1} />
            <span>Nuevo producto</span>
          </Link>
        </div>
      </header>

      {feedback ? (
        <section className={styles.feedback} data-tone={feedback.tone} role="status">
          {feedback.message}
        </section>
      ) : null}

      <section className={styles.metricGrid} aria-label="Filtrar productos por estado">
        <ProductMetric
          label="Total"
          value={productList.totalProductCount}
          filter="todos"
          activeFilter={activeFilter}
        />
        <ProductMetric
          label="Activos"
          value={productList.activeProductCount}
          filter="activos"
          activeFilter={activeFilter}
        />
        <ProductMetric
          label="Inactivos"
          value={productList.inactiveProductCount}
          filter="inactivos"
          activeFilter={activeFilter}
        />
      </section>

      {productList.products.length === 0 ? (
        <section className={styles.emptyPanel} aria-live="polite">
          <CircleOff aria-hidden="true" size={24} strokeWidth={1.9} />
          <h2>Todavía no hay productos cargados.</h2>
          <p>Creá el primer producto base para preparar el catálogo.</p>
          <Link className={styles.primaryButton} href="/admin/productos/nuevo">
            Nuevo producto
          </Link>
        </section>
      ) : visibleProducts.length === 0 ? (
        <section className={styles.emptyPanel} aria-live="polite">
          <CircleOff aria-hidden="true" size={24} strokeWidth={1.9} />
          <h2>No hay productos {activeFilter} para mostrar.</h2>
          <p>Probá con otro filtro o creá un producto nuevo.</p>
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
              product.status === PRODUCT_STATUS.active
                ? PRODUCT_STATUS.inactive
                : PRODUCT_STATUS.active;
            const statusActionLabel =
              nextStatus === PRODUCT_STATUS.active ? "Activar" : "Desactivar";

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
                  <form action={changeAdminProductStatus}>
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="status" value={nextStatus} />
                    <button className={styles.textButton} type="submit">
                      {statusActionLabel}
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}

function getActiveProductFilter(value: string | null): ProductFilter {
  if (value === "activos" || value === "inactivos") {
    return value;
  }

  return "todos";
}

function ProductMetric({
  label,
  value,
  filter,
  activeFilter
}: {
  label: string;
  value: number;
  filter: ProductFilter;
  activeFilter: ProductFilter;
}) {
  const isActive = activeFilter === filter;

  return (
    <Link
      className={styles.metric}
      href={filter === "todos" ? "/admin/productos" : `/admin/productos?filtro=${filter}`}
      data-active={isActive}
      aria-current={isActive ? "true" : undefined}
      scroll={false}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </Link>
  );
}

function getProductFeedbackMessage({
  state,
  error
}: {
  state: string | null;
  error: string | null;
}): { tone: "success" | "error"; message: string } | null {
  if (error) {
    return {
      tone: "error",
      message: getProductErrorMessage(error as ProductManagementErrorCode)
    };
  }

  switch (state) {
    case "producto-creado":
      return { tone: "success", message: "Producto creado correctamente." };
    case "producto-activado":
      return { tone: "success", message: "Producto activado correctamente." };
    case "producto-desactivado":
      return { tone: "success", message: "Producto desactivado correctamente." };
    default:
      return null;
  }
}

function getProductErrorMessage(error: ProductManagementErrorCode): string {
  switch (error) {
    case "cannot_publish_without_variants":
      return "El producto necesita al menos una variante/SKU para activarse.";
    case "duplicate_variant_sku":
      return "Ya existe una variante/SKU con ese código.";
    case "not_found":
      return "No encontramos el producto solicitado.";
    case "validation":
    default:
      return "Revisá los campos obligatorios y el precio base.";
  }
}

function getFirstSearchParamValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
