import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

import {
  PRODUCT_IMAGE_UPLOAD_LIMIT_BYTES,
  processProductImageUpload
} from "./product-image-processing";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

describe("product image processing", () => {
  it("stores stripped webp renditions on filesystem storage with relative metadata paths", async () => {
    const mediaRoot = await createTempMediaRoot();
    const uploadBuffer = await sharp({
      create: {
        width: 2400,
        height: 1600,
        channels: 3,
        background: "#111111"
      }
    })
      .jpeg({ quality: 92 })
      .toBuffer();
    const file = new File([new Uint8Array(uploadBuffer)], "Remera Negra.jpg", {
      type: "image/jpeg"
    });

    const result = await processProductImageUpload({
      productId: "training-tee",
      file,
      alt: "Remera negra Irruptivo frente",
      associatedColor: "Negro",
      mediaRoot,
      imageId: "image-test"
    });

    expect(result).toMatchObject({
      ok: true,
      image: {
        id: "image-test",
        alt: "Remera negra Irruptivo frente",
        associatedColor: "Negro",
        variantId: null,
        renditions: {
          card: {
            path: "products/training-tee/image-test/card.webp",
            width: 640
          },
          detail: {
            path: "products/training-tee/image-test/detail.webp",
            width: 1200
          },
          original: {
            path: "products/training-tee/image-test/original.webp",
            width: 1800
          }
        }
      }
    });

    if (!result.ok) {
      throw new Error("Expected image processing to succeed");
    }

    for (const rendition of Object.values(result.image.renditions)) {
      expect(path.isAbsolute(rendition.path)).toBe(false);

      const absolutePath = path.join(mediaRoot, rendition.path);
      const fileStat = await stat(absolutePath);
      expect(fileStat.isFile()).toBe(true);

      const metadata = await sharp(absolutePath).metadata();
      expect(metadata.format).toBe("webp");
      expect(metadata.exif).toBeUndefined();
      expect(metadata.icc).toBeUndefined();
      expect(metadata.width).toBe(rendition.width);
      expect(metadata.height).toBe(rendition.height);
    }
  });

  it("rejects files above the configured upload limit before writing renditions", async () => {
    const mediaRoot = await createTempMediaRoot();
    const oversizedFile = new File(
      [new Uint8Array(PRODUCT_IMAGE_UPLOAD_LIMIT_BYTES + 1)],
      "gigante.jpg",
      {
        type: "image/jpeg"
      }
    );

    const result = await processProductImageUpload({
      productId: "training-tee",
      file: oversizedFile,
      alt: "Imagen demasiado grande",
      mediaRoot,
      imageId: "oversized"
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "image_too_large",
        message: "La imagen supera el tamaño máximo permitido."
      }
    });
    await expect(stat(path.join(mediaRoot, "products/training-tee/oversized"))).rejects.toMatchObject({
      code: "ENOENT"
    });
  });
});

async function createTempMediaRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "irruptivo-media-test-"));
  tempRoots.push(root);

  return root;
}
