"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import {
  type PublicProductImageView,
  type VariantOptionValues
} from "../../catalog/catalog";
import styles from "./product-detail-page.module.css";

type ProductGalleryProps = {
  productName: string;
  images: PublicProductImageView[];
  selectedOptions: VariantOptionValues;
};

export function ProductGallery({
  productName,
  images,
  selectedOptions
}: ProductGalleryProps) {
  const imageSetKey = useMemo(
    () => images.map((image) => image.id).join("|"),
    [images]
  );
  const [activeImageId, setActiveImageId] = useState<string | null>(
    images[0]?.id ?? null
  );

  useEffect(() => {
    setActiveImageId(images[0]?.id ?? null);
  }, [imageSetKey]);

  const activeImage =
    images.find((image) => image.id === activeImageId) ?? images[0] ?? null;

  return (
    <section
      className={styles.gallery}
      aria-label={getGalleryLabel(productName, selectedOptions)}
    >
      <div className={styles.heroImageFrame}>
        {activeImage ? (
          <Image
            className={styles.heroImage}
            src={activeImage.path}
            alt={activeImage.alt}
            fill
            priority
            sizes="(min-width: 760px) 58vw, 100vw"
          />
        ) : (
          <div className={styles.imageFallback}>Sin imagen</div>
        )}
      </div>

      {images.length > 1 ? (
        <div className={styles.thumbnailGrid}>
          {images.map((image, index) => {
            const isActive = image.id === activeImage?.id;

            return (
              <button
                className={styles.thumbnail}
                data-active={isActive}
                key={image.id}
                type="button"
                onClick={() => setActiveImageId(image.id)}
                aria-pressed={isActive}
                aria-label={`Ver foto ${index + 1} de ${productName}`}
              >
                <Image
                  src={image.path}
                  alt=""
                  fill
                  sizes="(min-width: 760px) 12vw, 25vw"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function getGalleryLabel(
  productName: string,
  selectedOptions: VariantOptionValues
): string {
  const selectedColor = selectedOptions.color?.trim();

  if (selectedColor) {
    return `Fotos de ${productName} en color ${selectedColor}`;
  }

  return `Fotos de ${productName}`;
}
