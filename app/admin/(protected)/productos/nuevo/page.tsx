import { createAdminProduct } from "../../../../../src/admin/product-actions";
import { type ProductManagementErrorCode } from "../../../../../src/admin/products";
import styles from "../../admin.module.css";
import { ProductForm } from "../product-form";

type NewProductPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
  }>;
};

export default async function NewProductPage({
  searchParams
}: NewProductPageProps) {
  const params = await searchParams;
  const error = getFirstSearchParamValue(params?.error);

  return (
    <>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Catálogo</p>
        <h1 className={styles.title}>Nuevo producto</h1>
        <p className={styles.copy}>
          Cargá los datos base del producto. Las variantes, stock e imágenes se
          gestionan en slices posteriores.
        </p>
      </header>

      {error ? (
        <section className={styles.feedback} data-tone="error" role="status">
          {getProductErrorMessage(error as ProductManagementErrorCode)}
        </section>
      ) : null}

      <ProductForm action={createAdminProduct} submitLabel="Crear producto" />
    </>
  );
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
