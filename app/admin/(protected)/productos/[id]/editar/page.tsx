import { notFound } from "next/navigation";

import { updateAdminProduct } from "../../../../../../src/admin/product-actions";
import {
  getAdminProductById,
  type ProductManagementErrorCode
} from "../../../../../../src/admin/products";
import styles from "../../../admin.module.css";
import { ProductForm } from "../../product-form";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    estado?: string | string[];
    error?: string | string[];
  }>;
};

export default async function EditProductPage({
  params,
  searchParams
}: EditProductPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const product = getAdminProductById(decodeURIComponent(resolvedParams.id));

  if (!product) {
    notFound();
  }

  const feedback = getProductFeedbackMessage({
    state: getFirstSearchParamValue(resolvedSearchParams?.estado),
    error: getFirstSearchParamValue(resolvedSearchParams?.error)
  });

  return (
    <>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Catálogo</p>
        <h1 className={styles.title}>Editar producto</h1>
        <p className={styles.copy}>
          Actualizá los campos comerciales permitidos. El slug público se
          mantiene fijo para evitar cambios accidentales de URL.
        </p>
      </header>

      {feedback ? (
        <section className={styles.feedback} data-tone={feedback.tone} role="status">
          {feedback.message}
        </section>
      ) : null}

      <ProductForm
        action={updateAdminProduct}
        product={product}
        submitLabel="Guardar cambios"
      />
    </>
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

  if (state === "producto-actualizado") {
    return { tone: "success", message: "Producto actualizado correctamente." };
  }

  return null;
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
