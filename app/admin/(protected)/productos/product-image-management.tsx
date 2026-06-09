import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";

import {
  reorderAdminProductImages,
  softDeleteAdminProductImage,
  uploadAdminProductImage
} from "../../../../src/admin/product-actions";
import { getPublicImageSet } from "../../../../src/catalog/product-images";
import {
  PRODUCT_AREA,
  type CatalogProductRecord,
  type PublicProductImageView
} from "../../../../src/catalog/catalog";
import styles from "../admin.module.css";
import {
  ProductImageFileInput,
  ProductImageUploadSubmitButton
} from "./product-image-upload-controls";

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

        <div className={styles.variantFormGrid}>
          <ProductImageFileInput />

          <label className={styles.field}>
            <span>Texto alternativo</span>
            <input
              name="alt"
              type="text"
              defaultValue={formState?.alt ?? ""}
              required
              maxLength={140}
              placeholder="Ej: Remera negra Irruptivo frente"
            />
          </label>

          <ImageAssociationFields product={product} formState={formState} />
        </div>

        <p className={styles.formHint}>
          Formatos permitidos: JPG, PNG, WEBP o AVIF. Tamaño máximo: 8 MB.
        </p>

        <div className={styles.formActions}>
          <ProductImageUploadSubmitButton />
        </div>
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

function ImageAssociationFields({
  product,
  formState
}: ProductImageManagementProps) {
  if (product.area === PRODUCT_AREA.clothing) {
    const colors = getDistinctVariantOptionValues(product, "color");

    return (
      <label className={styles.field}>
        <span>Color visual asociado</span>
        <input
          name="associatedColor"
          type="text"
          list={colors.length > 0 ? "product-image-colors" : undefined}
          defaultValue={formState?.associatedColor ?? ""}
          maxLength={60}
          placeholder="Opcional"
        />
        {colors.length > 0 ? (
          <datalist id="product-image-colors">
            {colors.map((color) => (
              <option value={color} key={color} />
            ))}
          </datalist>
        ) : null}
      </label>
    );
  }

  return (
    <label className={styles.field}>
      <span>Variante asociada</span>
      <select name="variantId" defaultValue={formState?.variantId ?? ""}>
        <option value="">Sin variante específica</option>
        {product.variants.map((variant) => (
          <option value={variant.id} key={variant.id}>
            {variant.name} / {variant.sku}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProductImageCard({
  image,
  imageIds,
  index,
  product,
  productId
}: {
  image: PublicProductImageView;
  imageIds: readonly string[];
  index: number;
  product: CatalogProductRecord;
  productId: string;
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

function getImageAssociationLabel(
  product: CatalogProductRecord,
  image: PublicProductImageView
): string | null {
  if (image.associatedColor) {
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
