import { randomUUID } from "node:crypto";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import {
  type ProductImageManagementError,
  type ProductImageUploadInput
} from "../catalog/product-images";
import {
  getConfiguredMediaRoot,
  resolveProductMediaPath
} from "../media/product-media";

export const PRODUCT_IMAGE_UPLOAD_LIMIT_BYTES = 8 * 1024 * 1024;

export type ProductImageProcessingInput = {
  productId: string;
  file: File | null;
  alt: string;
  associatedColor?: string | null;
  variantId?: string | null;
  mediaRoot?: string;
  imageId?: string;
};

export type ProductImageProcessingResult =
  | {
      ok: true;
      image: ProductImageUploadInput;
    }
  | {
      ok: false;
      error: ProductImageManagementError;
    };

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const RENDITION_CONFIG = {
  card: {
    maxWidth: 640,
    maxHeight: 900,
    quality: 82
  },
  detail: {
    maxWidth: 1200,
    maxHeight: 1600,
    quality: 84
  },
  original: {
    maxWidth: 1800,
    maxHeight: 2400,
    quality: 88
  }
} as const;

export async function processProductImageUpload({
  productId,
  file,
  alt,
  associatedColor,
  variantId,
  mediaRoot = getConfiguredMediaRoot(),
  imageId = randomUUID()
}: ProductImageProcessingInput): Promise<ProductImageProcessingResult> {
  if (!file || file.size === 0) {
    return getImageProcessingError("image_validation");
  }

  if (file.size > PRODUCT_IMAGE_UPLOAD_LIMIT_BYTES) {
    return getImageProcessingError("image_too_large");
  }

  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return getImageProcessingError("unsupported_image_type");
  }

  const safeProductId = toSafePathSegment(productId);
  const safeImageId = toSafePathSegment(imageId);

  if (!safeProductId || !safeImageId) {
    return getImageProcessingError("image_validation");
  }

  const baseRelativePath = `products/${safeProductId}/${safeImageId}`;
  const baseAbsolutePath = resolveProductMediaPath(
    mediaRoot,
    `${baseRelativePath}/original.webp`
  );

  if (!baseAbsolutePath) {
    return getImageProcessingError("image_validation");
  }

  const imageDirectory = path.dirname(baseAbsolutePath);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const sourceMetadata = await sharp(buffer).metadata();

    if (!sourceMetadata.width || !sourceMetadata.height) {
      return getImageProcessingError("image_validation");
    }

    await mkdir(imageDirectory, { recursive: true });

    const card = await writeRendition({
      buffer,
      mediaRoot,
      relativePath: `${baseRelativePath}/card.webp`,
      config: RENDITION_CONFIG.card
    });
    const detail = await writeRendition({
      buffer,
      mediaRoot,
      relativePath: `${baseRelativePath}/detail.webp`,
      config: RENDITION_CONFIG.detail
    });
    const original = await writeRendition({
      buffer,
      mediaRoot,
      relativePath: `${baseRelativePath}/original.webp`,
      config: RENDITION_CONFIG.original
    });

    return {
      ok: true,
      image: {
        id: safeImageId,
        alt,
        associatedColor: normalizeOptionalText(associatedColor),
        variantId: normalizeOptionalText(variantId),
        renditions: {
          card,
          detail,
          original
        }
      }
    };
  } catch {
    await rm(imageDirectory, { recursive: true, force: true });

    return getImageProcessingError("image_processing_failed");
  }
}

export async function deleteProcessedProductImageFiles(
  image: ProductImageUploadInput,
  mediaRoot: string = getConfiguredMediaRoot()
): Promise<void> {
  const firstRenditionPath = image.renditions.original.path;
  const absolutePath = resolveProductMediaPath(mediaRoot, firstRenditionPath);

  if (!absolutePath) {
    return;
  }

  await rm(path.dirname(absolutePath), { recursive: true, force: true });
}

export async function deleteProductMediaDirectory(
  productId: string,
  mediaRoot: string = getConfiguredMediaRoot()
): Promise<void> {
  const safeProductId = toSafePathSegment(productId);
  // Reuse the existing file-path validator, then step back to the product dir.
  const guardPath = `products/${safeProductId}/__delete_guard__/guard.webp`;
  const absoluteGuardPath = resolveProductMediaPath(mediaRoot, guardPath);

  if (!absoluteGuardPath) {
    return;
  }

  await rm(path.dirname(path.dirname(absoluteGuardPath)), {
    recursive: true,
    force: true
  });
}

async function writeRendition({
  buffer,
  mediaRoot,
  relativePath,
  config
}: {
  buffer: Buffer;
  mediaRoot: string;
  relativePath: string;
  config: (typeof RENDITION_CONFIG)[keyof typeof RENDITION_CONFIG];
}): Promise<ProductImageUploadInput["renditions"]["card"]> {
  const absolutePath = resolveProductMediaPath(mediaRoot, relativePath);

  if (!absolutePath) {
    throw new Error("Invalid media path");
  }

  await sharp(buffer)
    .rotate()
    .resize({
      width: config.maxWidth,
      height: config.maxHeight,
      fit: "inside",
      withoutEnlargement: true
    })
    .webp({ quality: config.quality })
    .toFile(absolutePath);

  const [metadata, fileStat] = await Promise.all([
    sharp(absolutePath).metadata(),
    stat(absolutePath)
  ]);

  if (!metadata.width || !metadata.height) {
    throw new Error("Invalid processed image metadata");
  }

  return {
    path: relativePath,
    width: metadata.width,
    height: metadata.height,
    byteSize: fileStat.size,
    mimeType: "image/webp"
  };
}

function toSafePathSegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim().replace(/\s+/g, " ") ?? "";

  return normalizedValue || null;
}

function getImageProcessingError(
  code: ProductImageManagementError["code"]
): ProductImageProcessingResult {
  return {
    ok: false,
    error: {
      code,
      message: getImageProcessingErrorMessage(code)
    }
  };
}

function getImageProcessingErrorMessage(
  code: ProductImageManagementError["code"]
): string {
  switch (code) {
    case "image_too_large":
      return "La imagen supera el tamaño máximo permitido.";
    case "unsupported_image_type":
      return "El formato de imagen no está permitido.";
    case "image_processing_failed":
      return "No pudimos procesar la imagen. Probá con otro archivo.";
    case "image_not_found":
      return "No encontramos la imagen solicitada.";
    case "not_found":
      return "No encontramos el producto solicitado.";
    case "image_validation":
    default:
      return "Revisá la imagen, el texto alternativo y la asociación elegida.";
  }
}
