import { notFound } from "next/navigation";

import { updateAdminProduct } from "../../../../../../src/admin/product-actions";
import {
  getAdminProductById,
  readAdminProductRecords,
  type ProductManagementErrorCode
} from "../../../../../../src/admin/products";
import { type ProductImageManagementErrorCode } from "../../../../../../src/catalog/product-images";
import styles from "../../../admin.module.css";
import { ProductImageManagement } from "../../product-image-management";
import { ProductForm } from "../../product-form";
import { VariantManagement } from "../../variant-management";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    estado?: string | string[];
    error?: string | string[];
    imageAlt?: string | string[];
    imageColor?: string | string[];
    imageVariantId?: string | string[];
  }>;
};

export default async function EditProductPage({
  params,
  searchParams
}: EditProductPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const product = getAdminProductById(
    decodeURIComponent(resolvedParams.id),
    await readAdminProductRecords()
  );

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

      <section
        className={styles.generalSection}
        aria-labelledby="general-section-title"
      >
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Información general</p>
          <h2 id="general-section-title">Datos del producto</h2>
          <p>Estos campos aplican a todas las variantes del producto.</p>
        </div>

        <ProductForm
          action={updateAdminProduct}
          product={product}
          submitLabel="Guardar cambios"
        />
      </section>

      <VariantManagement product={product} />

      <ProductImageManagement
        product={product}
        formState={{
          alt: getFirstSearchParamValue(resolvedSearchParams?.imageAlt) ?? "",
          associatedColor:
            getFirstSearchParamValue(resolvedSearchParams?.imageColor) ?? "",
          variantId:
            getFirstSearchParamValue(resolvedSearchParams?.imageVariantId) ?? ""
        }}
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

  if (state === "producto-creado") {
    return {
      tone: "success",
      message:
        "Producto creado (inactivo). Agregá al menos una variante/SKU y sus imágenes; después cambiá el estado a Activo para publicarlo."
    };
  }

  if (state === "producto-actualizado") {
    return { tone: "success", message: "Producto actualizado correctamente." };
  }

  if (state === "variante-creada") {
    return { tone: "success", message: "Variante/SKU creada correctamente." };
  }

  if (state === "variante-actualizada") {
    return {
      tone: "success",
      message: "Variante/SKU actualizada correctamente."
    };
  }

  if (state === "imagen-subida") {
    return { tone: "success", message: "Imagen subida correctamente." };
  }

  if (state === "imagenes-ordenadas") {
    return { tone: "success", message: "Galería reordenada correctamente." };
  }

  if (state === "imagen-eliminada") {
    return { tone: "success", message: "Imagen eliminada de la galería." };
  }

  return null;
}

function getProductErrorMessage(
  error: ProductManagementErrorCode | ProductImageManagementErrorCode
): string {
  switch (error) {
    case "cannot_publish_without_variants":
      return "El producto necesita al menos una variante/SKU para activarse.";
    case "duplicate_variant_sku":
      return "Ya existe una variante/SKU con ese código.";
    case "image_not_found":
      return "No encontramos la imagen solicitada.";
    case "image_too_large":
      return "La imagen supera el tamaño máximo permitido.";
    case "unsupported_image_type":
      return "El formato de imagen no está permitido.";
    case "image_processing_failed":
      return "No pudimos procesar la imagen. Probá con otro archivo.";
    case "image_validation":
      return "Revisá la imagen, el texto alternativo y la asociación elegida.";
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
