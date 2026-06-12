"use client";

import { ImagePlus } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";

import { MAX_IMAGE_UPLOAD_BATCH } from "../../../../src/admin/product-image-upload-limits";
import { type ProductArea } from "../../../../src/catalog/catalog";
import styles from "../admin.module.css";

type ProductImageFileInputProps = {
  productArea: ProductArea;
  colors: readonly string[];
  variants: readonly {
    id: string;
    name: string;
    sku: string;
  }[];
  formState?: {
    alt: string;
    associatedColor: string;
    variantId: string;
  };
};

type SelectedImageFile = {
  name: string;
  uploadId: string;
};

export function ProductImageFileInput({
  productArea,
  colors,
  variants,
  formState
}: ProductImageFileInputProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedImageFile[]>([]);
  const exceedsBatchLimit = selectedFiles.length > MAX_IMAGE_UPLOAD_BATCH;
  const hasMissingUploadId = selectedFiles.some((file) => !file.uploadId);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(
      Array.from(event.currentTarget.files ?? []).map((file) => ({
        name: file.name,
        uploadId: globalThis.crypto?.randomUUID?.() ?? ""
      }))
    );
  }

  return (
    <>
      <label className={styles.field}>
        <span>Archivos</span>
        <input
          name="image"
          type="file"
          accept="image/avif,image/jpeg,image/png,image/webp"
          multiple
          required
          onChange={handleFileChange}
        />
      </label>

      {selectedFiles.length > 0 ? (
        <div
          className={styles.imageUploadRows}
          aria-label="Datos de las imágenes seleccionadas"
        >
          {selectedFiles.map((file, index) => (
            <div className={styles.imageUploadRow} key={file.uploadId || index}>
              <input type="hidden" name="imageUploadId" value={file.uploadId} />

              <div className={styles.imageUploadFileName}>
                <span>Archivo {index + 1}</span>
                <strong>{file.name}</strong>
              </div>

              <label className={styles.field}>
                <span>Texto alternativo</span>
                <input
                  name="alt"
                  type="text"
                  defaultValue={
                    selectedFiles.length === 1 ? formState?.alt ?? "" : ""
                  }
                  required
                  maxLength={140}
                  placeholder="Ej: Remera negra Irruptivo frente"
                />
              </label>

              <ImageAssociationFields
                productArea={productArea}
                colors={colors}
                variants={variants}
                formState={selectedFiles.length === 1 ? formState : undefined}
              />
            </div>
          ))}
        </div>
      ) : null}

      {exceedsBatchLimit ? (
        <p className={styles.formHint} role="alert">
          Podés subir hasta {MAX_IMAGE_UPLOAD_BATCH} imágenes por vez. Sacá
          algunas de la selección para continuar.
        </p>
      ) : null}

      {hasMissingUploadId ? (
        <p className={styles.formHint} role="alert">
          No pudimos preparar la carga. Volvé a seleccionar los archivos.
        </p>
      ) : null}

      <div className={styles.formActions}>
        <ProductImageUploadSubmitState
          disabled={exceedsBatchLimit || hasMissingUploadId}
          selectedCount={selectedFiles.length}
        />
      </div>
    </>
  );
}

function ImageAssociationFields({
  productArea,
  colors,
  variants,
  formState
}: ProductImageFileInputProps) {
  if (productArea === "clothing") {
    return (
      <label className={styles.field}>
        <span>Color asociado</span>
        <select
          name="associatedColor"
          defaultValue={formState?.associatedColor ?? ""}
        >
          <option value="">Sin color específico</option>
          {colors.map((color) => (
            <option value={color} key={color}>
              {color}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className={styles.field}>
      <span>Variante asociada</span>
      <select name="variantId" defaultValue={formState?.variantId ?? ""}>
        <option value="">Sin variante específica</option>
        {variants.map((variant) => (
          <option value={variant.id} key={variant.id}>
            {variant.name} / {variant.sku}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProductImageUploadSubmitState({
  disabled = false,
  selectedCount
}: {
  disabled?: boolean;
  selectedCount: number;
}) {
  const { pending } = useFormStatus();
  const label =
    selectedCount > 1 ? `Subir ${selectedCount} imágenes` : "Subir imagen";

  return (
    <button
      className={styles.primaryButton}
      type="submit"
      disabled={pending || disabled}
    >
      <ImagePlus aria-hidden="true" size={17} strokeWidth={2.1} />
      <span>{pending ? "Subiendo..." : label}</span>
    </button>
  );
}
