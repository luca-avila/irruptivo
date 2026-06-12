import { notFound } from "next/navigation";

import { updateAdminProduct } from "../../../../../../src/admin/product-actions";
import { MAX_IMAGE_UPLOAD_BATCH } from "../../../../../../src/admin/product-image-upload-limits";
import {
  getAdminProductById,
  readAdminProductRecords,
  type ProductManagementErrorCode
} from "../../../../../../src/admin/products";
import { type ProductImageManagementErrorCode } from "../../../../../../src/catalog/product-images";
import styles from "../../../admin.module.css";
import { DeleteProductButton } from "../../delete-product-button";
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
    cantidad?: string | string[];
    subidas?: string | string[];
    total?: string | string[];
    motivo?: string | string[];
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
    error: getFirstSearchParamValue(resolvedSearchParams?.error),
    uploadedCount: getFirstSearchParamValue(resolvedSearchParams?.cantidad),
    batchUploadedCount: getFirstSearchParamValue(resolvedSearchParams?.subidas),
    batchTotalCount: getFirstSearchParamValue(resolvedSearchParams?.total),
    batchFailureReason: getFirstSearchParamValue(resolvedSearchParams?.motivo)
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

      <section
        className={styles.dangerSection}
        aria-labelledby="danger-section-title"
      >
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Zona de peligro</p>
          <h2 id="danger-section-title">Eliminar producto</h2>
          <p>
            Borra el producto de forma permanente, junto con sus variantes e
            imágenes cargadas.
          </p>
        </div>
        <DeleteProductButton productId={product.id} productName={product.name} />
      </section>
    </>
  );
}

function getProductFeedbackMessage({
  state,
  error,
  uploadedCount,
  batchUploadedCount,
  batchTotalCount,
  batchFailureReason
}: {
  state: string | null;
  error: string | null;
  uploadedCount: string | null;
  batchUploadedCount: string | null;
  batchTotalCount: string | null;
  batchFailureReason: string | null;
}): { tone: "success" | "error"; message: string } | null {
  if (error === "image_batch_partial") {
    return {
      tone: "error",
      message: getImageBatchPartialMessage({
        uploadedCount: batchUploadedCount,
        totalCount: batchTotalCount,
        failureReason: batchFailureReason
      })
    };
  }

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

  if (state === "imagenes-subidas") {
    const count = parsePositiveInteger(uploadedCount);

    return {
      tone: "success",
      message:
        count && count > 1
          ? `${count} imágenes subidas correctamente.`
          : "Imágenes subidas correctamente."
    };
  }

  if (state === "imagenes-ordenadas") {
    return { tone: "success", message: "Galería reordenada correctamente." };
  }

  if (state === "imagen-eliminada") {
    return { tone: "success", message: "Imagen eliminada de la galería." };
  }

  if (state === "imagen-asociacion-actualizada") {
    return {
      tone: "success",
      message: "Asociación de imagen actualizada correctamente."
    };
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
    case "image_upload_batch_too_large":
      return `Podés subir hasta ${MAX_IMAGE_UPLOAD_BATCH} imágenes por vez.`;
    case "image_batch_partial":
      return "Algunas imágenes no pudieron subirse.";
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

function getImageBatchPartialMessage({
  uploadedCount,
  totalCount,
  failureReason
}: {
  uploadedCount: string | null;
  totalCount: string | null;
  failureReason: string | null;
}): string {
  const uploaded = parseNonNegativeInteger(uploadedCount);
  const total = parsePositiveInteger(totalCount);
  const reason = failureReason
    ? getProductErrorMessage(
        failureReason as ProductManagementErrorCode | ProductImageManagementErrorCode
      )
    : null;

  const summary =
    typeof uploaded === "number" && total
      ? uploaded > 0
        ? `Se subieron ${uploaded} de ${total} imágenes.`
        : `No se subió ninguna de las ${total} imágenes.`
      : "Algunas imágenes no pudieron subirse.";

  return reason
    ? `${summary} Revisá las restantes. Primer error: ${reason}`
    : `${summary} Revisá las restantes.`;
}

function parsePositiveInteger(value: string | null): number | null {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeInteger(value: string | null): number | null {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}
