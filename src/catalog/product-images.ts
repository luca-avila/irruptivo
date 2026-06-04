import {
  getPublicMediaUrl,
  isValidProductMediaPath
} from "../media/product-media";
import {
  type CatalogProductImageRecord,
  type CatalogProductImageRenditionRecord,
  type CatalogProductImageRenditionsRecord,
  type CatalogProductRecord,
  type PublicProductImageView,
  type VariantOptionValues
} from "./catalog";

export type ProductImageRenditionUsage = "card" | "detail" | "original";

export type ProductImageUploadInput = {
  id: string;
  alt: string;
  renditions: CatalogProductImageRenditionsRecord;
  associatedColor?: string | null;
  variantId?: string | null;
};

export type ProductImageManagementErrorCode =
  | "not_found"
  | "image_not_found"
  | "image_validation"
  | "image_too_large"
  | "unsupported_image_type"
  | "image_processing_failed";

export type ProductImageManagementError = {
  code: ProductImageManagementErrorCode;
  message: string;
};

export type ProductImageManagementResult =
  | {
      ok: true;
      product: CatalogProductRecord;
      products: CatalogProductRecord[];
      image?: CatalogProductImageRecord;
    }
  | {
      ok: false;
      error: ProductImageManagementError;
    };

export type PublicImageSetOptions = {
  usage?: ProductImageRenditionUsage;
};

export type VariantAwarePublicImageSetSelection = {
  selectedOptions?: VariantOptionValues;
  selectedVariantId?: string | null;
};

const IMAGE_VALIDATION_MESSAGE =
  "Revisá la imagen, el texto alternativo y la asociación elegida.";

export function uploadProductImage(
  productId: string,
  input: ProductImageUploadInput,
  products: readonly CatalogProductRecord[]
): ProductImageManagementResult {
  const productIndex = products.findIndex((product) => product.id === productId);

  if (productIndex === -1) {
    return getNotFoundError();
  }

  const currentProduct = products[productIndex];

  if (!isValidImageUploadInput(input, currentProduct)) {
    return getImageValidationError();
  }

  if (currentProduct.images.some((image) => image.id === input.id)) {
    return getImageValidationError();
  }

  const detailRendition = input.renditions.detail;
  const image: CatalogProductImageRecord = {
    id: input.id,
    path: detailRendition.path,
    alt: normalizeText(input.alt),
    sortOrder: getNextSortOrder(currentProduct.images),
    width: detailRendition.width,
    height: detailRendition.height,
    renditions: cloneRenditions(input.renditions),
    associatedColor: normalizeOptionalText(input.associatedColor),
    variantId: normalizeOptionalText(input.variantId),
    deletedAt: null
  };
  const nextProduct: CatalogProductRecord = {
    ...currentProduct,
    images: [...currentProduct.images.map(cloneImageRecord), image]
  };
  const nextProducts = cloneProductRecords(products);
  nextProducts[productIndex] = nextProduct;

  return {
    ok: true,
    product: nextProduct,
    products: nextProducts,
    image
  };
}

export function reorderProductImages(
  productId: string,
  orderedImageIds: readonly string[],
  products: readonly CatalogProductRecord[]
): ProductImageManagementResult {
  const productIndex = products.findIndex((product) => product.id === productId);

  if (productIndex === -1) {
    return getNotFoundError();
  }

  const currentProduct = products[productIndex];
  const activeImages = currentProduct.images.filter((image) => !image.deletedAt);
  const activeImageIds = activeImages.map((image) => image.id);

  if (!hasSameUniqueValues(activeImageIds, orderedImageIds)) {
    return getImageValidationError();
  }

  const sortOrderById = new Map(
    orderedImageIds.map((imageId, index) => [imageId, index + 1])
  );
  const nextProduct: CatalogProductRecord = {
    ...currentProduct,
    images: currentProduct.images.map((image) => ({
      ...cloneImageRecord(image),
      sortOrder: sortOrderById.get(image.id) ?? image.sortOrder
    }))
  };
  const nextProducts = cloneProductRecords(products);
  nextProducts[productIndex] = nextProduct;

  return {
    ok: true,
    product: nextProduct,
    products: nextProducts
  };
}

export function softDeleteProductImage(
  productId: string,
  imageId: string,
  products: readonly CatalogProductRecord[],
  getDeletedAt: () => string = () => new Date().toISOString()
): ProductImageManagementResult {
  const productIndex = products.findIndex((product) => product.id === productId);

  if (productIndex === -1) {
    return getNotFoundError();
  }

  const currentProduct = products[productIndex];
  const imageIndex = currentProduct.images.findIndex((image) => image.id === imageId);

  if (imageIndex === -1) {
    return getImageNotFoundError();
  }

  const nextImages = currentProduct.images.map((image, index) =>
    index === imageIndex
      ? {
          ...cloneImageRecord(image),
          deletedAt: image.deletedAt ?? getDeletedAt()
        }
      : cloneImageRecord(image)
  );
  const nextProduct: CatalogProductRecord = {
    ...currentProduct,
    images: nextImages
  };
  const nextProducts = cloneProductRecords(products);
  nextProducts[productIndex] = nextProduct;

  return {
    ok: true,
    product: nextProduct,
    products: nextProducts,
    image: nextImages[imageIndex]
  };
}

export function getPublicImageSet(
  images: readonly CatalogProductImageRecord[],
  options: PublicImageSetOptions = {}
): PublicProductImageView[] {
  const usage = options.usage ?? "detail";

  return images
    .filter((image) => !image.deletedAt)
    .map(cloneImageRecord)
    .sort(
      (first, second) =>
        first.sortOrder - second.sortOrder || first.id.localeCompare(second.id)
    )
    .map((image) => getPublicImageView(image, usage));
}

export function getVariantAwarePublicImageSet(
  images: readonly CatalogProductImageRecord[],
  selection: VariantAwarePublicImageSetSelection = {},
  options: PublicImageSetOptions = {}
): PublicProductImageView[] {
  const fullImageSet = getPublicImageSet(images, options);
  const selectedVariantId = normalizeOptionalText(selection.selectedVariantId);

  if (selectedVariantId) {
    const variantImages = fullImageSet.filter(
      (image) => normalizeOptionalText(image.variantId) === selectedVariantId
    );

    if (variantImages.length > 0) {
      return variantImages;
    }
  }

  const selectedColor = normalizeImageMatchText(selection.selectedOptions?.color);

  if (selectedColor) {
    const colorImages = fullImageSet.filter(
      (image) => normalizeImageMatchText(image.associatedColor) === selectedColor
    );

    if (colorImages.length > 0) {
      return colorImages;
    }
  }

  return fullImageSet;
}

function getPublicImageView(
  image: CatalogProductImageRecord,
  usage: ProductImageRenditionUsage
): PublicProductImageView {
  const selectedRendition = image.renditions?.[usage];
  const cardRendition = image.renditions?.card;
  const detailRendition = image.renditions?.detail;
  const originalRendition = image.renditions?.original;
  const path = selectedRendition?.path ?? image.path;

  return {
    id: image.id,
    path: getPublicImagePath(path),
    alt: image.alt,
    width: selectedRendition?.width ?? image.width,
    height: selectedRendition?.height ?? image.height,
    cardPath: cardRendition ? getPublicImagePath(cardRendition.path) : undefined,
    detailPath: detailRendition
      ? getPublicImagePath(detailRendition.path)
      : undefined,
    originalPath: originalRendition
      ? getPublicImagePath(originalRendition.path)
      : undefined,
    associatedColor: image.associatedColor ?? null,
    variantId: image.variantId ?? null
  };
}

function getPublicImagePath(path: string): string {
  return path.startsWith("/") ? path : getPublicMediaUrl(path);
}

function isValidImageUploadInput(
  input: ProductImageUploadInput,
  product: CatalogProductRecord
): boolean {
  const normalizedAlt = normalizeText(input.alt);

  if (!normalizeText(input.id) || normalizedAlt.length === 0) {
    return false;
  }

  if (input.variantId && !product.variants.some((variant) => variant.id === input.variantId)) {
    return false;
  }

  return Object.values(input.renditions).every(isValidRendition);
}

function isValidRendition(
  rendition: CatalogProductImageRenditionRecord | undefined
): rendition is CatalogProductImageRenditionRecord {
  return Boolean(
    rendition &&
      isValidProductMediaPath(rendition.path) &&
      Number.isInteger(rendition.width) &&
      rendition.width > 0 &&
      Number.isInteger(rendition.height) &&
      rendition.height > 0
  );
}

function getNextSortOrder(images: readonly CatalogProductImageRecord[]): number {
  return (
    images.reduce(
      (maxSortOrder, image) => Math.max(maxSortOrder, image.sortOrder),
      0
    ) + 1
  );
}

function hasSameUniqueValues(
  currentValues: readonly string[],
  nextValues: readonly string[]
): boolean {
  if (currentValues.length !== nextValues.length) {
    return false;
  }

  const currentSet = new Set(currentValues);
  const nextSet = new Set(nextValues);

  if (currentSet.size !== currentValues.length || nextSet.size !== nextValues.length) {
    return false;
  }

  return currentValues.every((value) => nextSet.has(value));
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim().replace(/\s+/g, " ") ?? "";

  return normalizedValue || null;
}

function normalizeImageMatchText(value: string | null | undefined): string | null {
  return normalizeOptionalText(value)?.toLocaleLowerCase("es-AR") ?? null;
}

function cloneProductRecords(
  products: readonly CatalogProductRecord[]
): CatalogProductRecord[] {
  return products.map((product) => ({
    ...product,
    variants: product.variants.map((variant) => ({
      ...variant,
      options: variant.options ? { ...variant.options } : undefined
    })),
    images: product.images.map(cloneImageRecord)
  }));
}

function cloneImageRecord(
  image: CatalogProductImageRecord
): CatalogProductImageRecord {
  return {
    ...image,
    renditions: image.renditions ? cloneRenditions(image.renditions) : undefined
  };
}

function cloneRenditions(
  renditions: CatalogProductImageRenditionsRecord
): CatalogProductImageRenditionsRecord {
  return {
    card: { ...renditions.card },
    detail: { ...renditions.detail },
    original: { ...renditions.original }
  };
}

function getNotFoundError(): ProductImageManagementResult {
  return {
    ok: false,
    error: {
      code: "not_found",
      message: "No encontramos el producto solicitado."
    }
  };
}

function getImageNotFoundError(): ProductImageManagementResult {
  return {
    ok: false,
    error: {
      code: "image_not_found",
      message: "No encontramos la imagen solicitada."
    }
  };
}

function getImageValidationError(): ProductImageManagementResult {
  return {
    ok: false,
    error: {
      code: "image_validation",
      message: IMAGE_VALIDATION_MESSAGE
    }
  };
}
