import { ArrowDown, ArrowUp, ImagePlus, Save, Trash2 } from "lucide-react";

import {
  reorderAdminProductImages,
  softDeleteAdminProductImage,
  updateAdminProductImageAssociation,
  uploadAdminProductImage
} from "../../../../src/admin/product-actions";
import { getPublicImageSet } from "../../../../src/catalog/product-images";
import {
  type CatalogProductRecord,
  type PublicProductImageView
} from "../../../../src/catalog/catalog";
import styles from "../admin.module.css";
import { ProductImageFileInput } from "./product-image-upload-controls";

type ProductImageManagementProps = {
  product: CatalogProductRecord;
  formState?: {
    alt: string;
    associatedColor: string;
    variantId: string;
  };
};

export function ProductImageManagement({
  product,
  formState
}: ProductImageManagementProps) {
  const images = getPublicImageSet(product.images, { usage: "card" });
  const imageIds = images.map((image) => image.id);
  const colors = getDistinctVariantOptionValues(product, "color");
  const variants = product.variants.map((variant) => ({
    id: variant.id,
    name: variant.name,
    sku: variant.sku
  }));

  return (
    <section className={styles.imageSection} aria-labelledby="image-section-title">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Imágenes</p>
          <h2 id="image-section-title">Galería del producto</h2>
          <p>
            Subí fotos reales, ordenalas para la tienda y eliminá las que no
            deben mostrarse.
          </p>
        </div>
      </div>

      <form
        className={styles.imageUploadPanel}
        action={uploadAdminProductImage}
      >
        <input type="hidden" name="productId" value={product.id} />

        <div className={styles.variantCardHeader}>
          <div>
            <strong>Nueva imagen</strong>
            <span>Se generan versiones para grilla, detalle y alta resolución.</span>
          </div>
        </div>

        <ProductImageFileInput
          productArea={product.area}
          colors={colors}
          variants={variants}
          formState={formState}
        />

        <p className={styles.formHint}>
          Formatos permitidos: JPG, PNG, WEBP o AVIF. Tamaño máximo: 8 MB.
        </p>

      </form>

      {images.length > 0 ? (
        <div className={styles.imageGrid} aria-label="Imágenes cargadas">
          {images.map((image, index) => (
            <ProductImageCard
              image={image}
              imageIds={imageIds}
              index={index}
              product={product}
              productId={product.id}
              colors={colors}
              variants={variants}
              key={image.id}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyPanel} aria-live="polite">
          <ImagePlus aria-hidden="true" size={24} strokeWidth={1.9} />
          <h2>Todavía no hay imágenes cargadas.</h2>
          <p>Subí al menos una foto para mejorar la presentación pública.</p>
        </div>
      )}
    </section>
  );
}

function ProductImageCard({
  image,
  imageIds,
  index,
  product,
  productId,
  colors,
  variants
}: {
  image: PublicProductImageView;
  imageIds: readonly string[];
  index: number;
  product: CatalogProductRecord;
  productId: string;
  colors: readonly string[];
  variants: readonly {
    id: string;
    name: string;
    sku: string;
  }[];
}) {
  const associationLabel = getImageAssociationLabel(product, image);

  return (
    <article className={styles.imageCard}>
      <div className={styles.imagePreview}>
        <img src={image.path} alt={image.alt} loading="lazy" />
      </div>

      <div className={styles.imageCardBody}>
        <div>
          <strong>{image.alt}</strong>
          <span>{getImageMetaLabel(image)}</span>
          {associationLabel ? <span>{associationLabel}</span> : null}
        </div>

        <ImageAssociationForm
          image={image}
          product={product}
          productId={productId}
          colors={colors}
          variants={variants}
        />

        <div className={styles.imageActions}>
          <form action={reorderAdminProductImages}>
            <input type="hidden" name="productId" value={productId} />
            <input
              type="hidden"
              name="imageOrder"
              value={moveImageId(imageIds, index, index - 1).join(",")}
            />
            <button
              className={styles.textButton}
              type="submit"
              disabled={index === 0}
            >
              <ArrowUp aria-hidden="true" size={16} strokeWidth={2.1} />
              <span>Subir</span>
            </button>
          </form>

          <form action={reorderAdminProductImages}>
            <input type="hidden" name="productId" value={productId} />
            <input
              type="hidden"
              name="imageOrder"
              value={moveImageId(imageIds, index, index + 1).join(",")}
            />
            <button
              className={styles.textButton}
              type="submit"
              disabled={index === imageIds.length - 1}
            >
              <ArrowDown aria-hidden="true" size={16} strokeWidth={2.1} />
              <span>Bajar</span>
            </button>
          </form>

          <form action={softDeleteAdminProductImage}>
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="imageId" value={image.id} />
            <button className={styles.textButton} type="submit">
              <Trash2 aria-hidden="true" size={16} strokeWidth={2.1} />
              <span>Eliminar</span>
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

function ImageAssociationForm({
  image,
  product,
  productId,
  colors,
  variants
}: {
  image: PublicProductImageView;
  product: CatalogProductRecord;
  productId: string;
  colors: readonly string[];
  variants: readonly {
    id: string;
    name: string;
    sku: string;
  }[];
}) {
  return (
    <form
      className={styles.imageAssociationForm}
      action={updateAdminProductImageAssociation}
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="imageId" value={image.id} />

      {product.area === "clothing" ? (
        <label className={styles.field}>
          <span>Color asociado</span>
          <select
            name="associatedColor"
            defaultValue={getSelectedImageColorValue(colors, image)}
          >
            <option value="">Sin color específico</option>
            {colors.map((color) => (
              <option value={color} key={color}>
                {color}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className={styles.field}>
          <span>Variante asociada</span>
          <select
            name="variantId"
            defaultValue={getSelectedImageVariantId(variants, image)}
          >
            <option value="">Sin variante específica</option>
            {variants.map((variant) => (
              <option value={variant.id} key={variant.id}>
                {variant.name} / {variant.sku}
              </option>
            ))}
          </select>
        </label>
      )}

      <button className={styles.secondaryButton} type="submit">
        <Save aria-hidden="true" size={16} strokeWidth={2.1} />
        <span>Guardar asociación</span>
      </button>
    </form>
  );
}

function getImageAssociationLabel(
  product: CatalogProductRecord,
  image: PublicProductImageView
): string | null {
  if (product.area === "clothing") {
    if (!image.associatedColor) {
      return null;
    }

    return `Color: ${image.associatedColor}`;
  }

  if (!image.variantId) {
    return null;
  }

  const variant = product.variants.find(
    (candidate) => candidate.id === image.variantId
  );

  return variant
    ? `Variante: ${variant.name} / ${variant.sku}`
    : "Variante asociada no encontrada";
}

function getSelectedImageColorValue(
  colors: readonly string[],
  image: PublicProductImageView
): string {
  const currentColor = image.associatedColor?.trim();

  if (!currentColor) {
    return "";
  }

  return (
    colors.find(
      (color) =>
        color.toLocaleLowerCase("es-AR") ===
        currentColor.toLocaleLowerCase("es-AR")
    ) ?? ""
  );
}

function getSelectedImageVariantId(
  variants: readonly { id: string }[],
  image: PublicProductImageView
): string {
  const variantId = image.variantId?.trim();

  if (!variantId) {
    return "";
  }

  return variants.some((variant) => variant.id === variantId) ? variantId : "";
}

function moveImageId(
  imageIds: readonly string[],
  fromIndex: number,
  toIndex: number
): string[] {
  const nextImageIds = [...imageIds];
  const boundedToIndex = Math.max(0, Math.min(toIndex, imageIds.length - 1));
  const [movedImageId] = nextImageIds.splice(fromIndex, 1);

  if (!movedImageId) {
    return nextImageIds;
  }

  nextImageIds.splice(boundedToIndex, 0, movedImageId);

  return nextImageIds;
}

function getImageMetaLabel(image: PublicProductImageView): string {
  if (image.width && image.height) {
    return `${image.width} x ${image.height}px`;
  }

  return "Dimensiones no registradas";
}

function getDistinctVariantOptionValues(
  product: CatalogProductRecord,
  optionKey: "color"
): string[] {
  const values = new Set<string>();

  for (const variant of product.variants) {
    const value = variant.options?.[optionKey];

    if (value) {
      values.add(value);
    }
  }

  return [...values].sort((first, second) => first.localeCompare(second, "es-AR"));
}
