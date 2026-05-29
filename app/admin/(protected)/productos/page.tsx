import { ArrowRight, CircleOff, PackagePlus } from "lucide-react";
import Link from "next/link";

import { changeAdminProductStatus } from "../../../../src/admin/product-actions";
import {
  listAdminProducts,
  type ProductManagementErrorCode
} from "../../../../src/admin/products";
import { PRODUCT_STATUS } from "../../../../src/catalog/catalog";
import styles from "../admin.module.css";

type AdminProductsPageProps = {
  searchParams?: Promise<{
    estado?: string | string[];
    error?: string | string[];
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
  const productList = listAdminProducts();

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

      <section className={styles.metricGrid} aria-label="Resumen de productos">
        <ProductMetric label="Total" value={productList.totalProductCount} />
        <ProductMetric label="Activos" value={productList.activeProductCount} />
        <ProductMetric label="Inactivos" value={productList.inactiveProductCount} />
      </section>

      {productList.products.length > 0 ? (
        <section className={styles.tablePanel} aria-label="Listado de productos">
          <div className={styles.tableHeader}>
            <span>Producto</span>
            <span>Área</span>
            <span>Estado</span>
            <span>Precio base</span>
            <span>Acciones</span>
          </div>

          {productList.products.map((product) => {
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
      ) : (
        <section className={styles.emptyPanel} aria-live="polite">
          <CircleOff aria-hidden="true" size={24} strokeWidth={1.9} />
          <h2>Todavía no hay productos cargados.</h2>
          <p>Creá el primer producto base para preparar el catálogo.</p>
          <Link className={styles.primaryButton} href="/admin/productos/nuevo">
            Nuevo producto
          </Link>
        </section>
      )}
    </>
  );
}

function ProductMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
