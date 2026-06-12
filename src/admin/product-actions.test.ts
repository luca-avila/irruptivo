import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductImageRecord,
  type CatalogProductRecord
} from "../catalog/catalog";
import { type ProductImageUploadInput } from "../catalog/product-images";
import {
  deleteAdminProduct,
  updateAdminProductImageAssociation,
  uploadAdminProductImage
} from "./product-actions";
import { MAX_IMAGE_UPLOAD_BATCH } from "./product-image-upload-limits";

const mocks = vi.hoisted(() => ({
  deleteProductMediaDirectory: vi.fn(),
  deleteProcessedProductImageFiles: vi.fn(),
  isDuplicateVariantSkuPersistenceError: vi.fn(),
  processProductImageUpload: vi.fn(),
  readAdminProductRecords: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error("NEXT_REDIRECT");
    Object.assign(error, { url });
    throw error;
  }),
  requireAdmin: vi.fn(),
  revalidatePath: vi.fn(),
  createAdminProductImageRecordOnce: vi.fn(),
  deleteAdminProductRecord: vi.fn(),
  saveAdminProductImageRecord: vi.fn(),
  saveAdminProductImageRecords: vi.fn(),
  saveAdminProductRecords: vi.fn()
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("./auth", () => ({
  requireAdmin: mocks.requireAdmin
}));

vi.mock("./product-image-processing", () => ({
  deleteProductMediaDirectory: mocks.deleteProductMediaDirectory,
  deleteProcessedProductImageFiles: mocks.deleteProcessedProductImageFiles,
  processProductImageUpload: mocks.processProductImageUpload
}));

vi.mock("./products", () => ({
  addProductVariant: vi.fn(),
  createAdminProductImageRecordOnce: mocks.createAdminProductImageRecordOnce,
  createProduct: vi.fn(),
  deleteAdminProductRecord: mocks.deleteAdminProductRecord,
  isDuplicateVariantSkuPersistenceError:
    mocks.isDuplicateVariantSkuPersistenceError,
  readAdminProductRecords: mocks.readAdminProductRecords,
  saveAdminProductImageRecord: mocks.saveAdminProductImageRecord,
  saveAdminProductImageRecords: mocks.saveAdminProductImageRecords,
  saveAdminProductRecords: mocks.saveAdminProductRecords,
  setProductStatus: vi.fn(),
  updateProduct: vi.fn(),
  updateProductVariant: vi.fn()
}));

describe("admin product image actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(undefined);
    mocks.isDuplicateVariantSkuPersistenceError.mockReturnValue(false);
    mocks.createAdminProductImageRecordOnce.mockImplementation(
      async (_productId: string, image: CatalogProductImageRecord) => ({
        status: "created",
        image
      })
    );
    mocks.deleteAdminProductRecord.mockResolvedValue(null);
  });

  it("persists a single uploaded image with the stable form upload id", async () => {
    const image = createProcessedImage();
    mocks.processProductImageUpload.mockResolvedValue({
      ok: true,
      image
    });
    mocks.readAdminProductRecords.mockResolvedValue([createProductRecord()]);

    await expect(uploadAdminProductImage(createUploadFormData())).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/admin/productos/irruptivo-training-tee/editar?estado=imagen-subida#image-section-title"
    });

    expect(mocks.processProductImageUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "irruptivo-training-tee",
        alt: "Frente",
        associatedColor: "Negro",
        variantId: "",
        imageId: IMAGE_UPLOAD_ID
      })
    );
    expect(mocks.createAdminProductImageRecordOnce).toHaveBeenCalledWith(
      "irruptivo-training-tee",
      expect.objectContaining({
        id: IMAGE_UPLOAD_ID,
        alt: "Frente",
        sortOrder: 1
      })
    );
    expect(mocks.saveAdminProductRecords).not.toHaveBeenCalled();
  });

  it("treats a repeated upload id as an already completed upload", async () => {
    const image = createProcessedImage();
    mocks.processProductImageUpload.mockResolvedValue({
      ok: true,
      image
    });
    mocks.createAdminProductImageRecordOnce.mockResolvedValue({
      status: "duplicate"
    });
    mocks.readAdminProductRecords.mockResolvedValue([
      createProductRecord({
        images: [createImageRecord()]
      })
    ]);

    await expect(uploadAdminProductImage(createUploadFormData())).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/admin/productos/irruptivo-training-tee/editar?estado=imagen-subida#image-section-title"
    });

    expect(mocks.processProductImageUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        imageId: IMAGE_UPLOAD_ID
      })
    );
    expect(mocks.createAdminProductImageRecordOnce).toHaveBeenCalledWith(
      "irruptivo-training-tee",
      expect.objectContaining({
        id: IMAGE_UPLOAD_ID
      })
    );
    expect(mocks.deleteProcessedProductImageFiles).not.toHaveBeenCalled();
    expect(mocks.saveAdminProductImageRecord).not.toHaveBeenCalled();
    expect(mocks.saveAdminProductRecords).not.toHaveBeenCalled();
  });

  it("rejects uploads without a valid form upload id before processing the file", async () => {
    mocks.readAdminProductRecords.mockResolvedValue([createProductRecord()]);

    await expect(
      uploadAdminProductImage(createUploadFormData({ imageUploadId: "bad-id" }))
    ).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/admin/productos/irruptivo-training-tee/editar?imageAlt=Frente&imageColor=Negro&error=image_validation"
    });

    expect(mocks.processProductImageUpload).not.toHaveBeenCalled();
    expect(mocks.saveAdminProductImageRecord).not.toHaveBeenCalled();
  });

  it("rejects batch uploads when the metadata arrays do not match the file count", async () => {
    const formData = createUploadFormData();
    formData.append(
      "image",
      new File([new Uint8Array([2])], "training-tee-back.jpg", {
        type: "image/jpeg"
      })
    );
    formData.append("imageUploadId", "22222222-2222-4222-8222-222222222222");
    mocks.readAdminProductRecords.mockResolvedValue([createProductRecord()]);

    await expect(uploadAdminProductImage(formData)).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/admin/productos/irruptivo-training-tee/editar?imageAlt=Frente&imageColor=Negro&error=image_validation"
    });

    expect(mocks.processProductImageUpload).not.toHaveBeenCalled();
    expect(mocks.createAdminProductImageRecordOnce).not.toHaveBeenCalled();
  });

  it("rejects batch uploads over the configured limit before processing files", async () => {
    mocks.readAdminProductRecords.mockResolvedValue([createProductRecord()]);

    await expect(
      uploadAdminProductImage(
        createBatchUploadFormData(
          Array.from({ length: MAX_IMAGE_UPLOAD_BATCH + 1 }, (_, index) => ({
            imageUploadId: getUploadId(index + 1),
            alt: `Imagen ${index + 1}`,
            associatedColor: "Negro"
          }))
        )
      )
    ).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/admin/productos/irruptivo-training-tee/editar?imageAlt=Imagen+1&imageColor=Negro&error=image_upload_batch_too_large"
    });

    expect(mocks.processProductImageUpload).not.toHaveBeenCalled();
    expect(mocks.createAdminProductImageRecordOnce).not.toHaveBeenCalled();
  });

  it("leaves repeated upload id ownership decisions to the database claim", async () => {
    const image = createProcessedImage();
    mocks.processProductImageUpload.mockResolvedValue({
      ok: true,
      image
    });
    mocks.createAdminProductImageRecordOnce.mockResolvedValue({
      status: "duplicate"
    });
    mocks.readAdminProductRecords.mockResolvedValue([
      createProductRecord(),
      createProductRecord({
        id: "other-product",
        slug: "other-product",
        images: [createImageRecord()]
      })
    ]);

    await expect(uploadAdminProductImage(createUploadFormData())).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/admin/productos/irruptivo-training-tee/editar?estado=imagen-subida#image-section-title"
    });

    expect(mocks.createAdminProductImageRecordOnce).toHaveBeenCalledWith(
      "irruptivo-training-tee",
      expect.objectContaining({
        id: IMAGE_UPLOAD_ID
      })
    );
    expect(mocks.deleteProcessedProductImageFiles).not.toHaveBeenCalled();
  });

  it("persists successful files and reports a partial batch failure", async () => {
    const firstImage = createProcessedImage({
      id: IMAGE_UPLOAD_ID,
      alt: "Frente"
    });
    const thirdImage = createProcessedImage({
      id: "33333333-3333-4333-8333-333333333333",
      alt: "Detalle"
    });
    mocks.processProductImageUpload
      .mockResolvedValueOnce({
        ok: true,
        image: firstImage
      })
      .mockResolvedValueOnce({
        ok: false,
        error: {
          code: "unsupported_image_type",
          message: "El formato de imagen no está permitido."
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        image: thirdImage
      });
    mocks.readAdminProductRecords.mockResolvedValue([createProductRecord()]);

    await expect(
      uploadAdminProductImage(
        createBatchUploadFormData([
          {
            imageUploadId: IMAGE_UPLOAD_ID,
            alt: "Frente",
            associatedColor: "Negro"
          },
          {
            imageUploadId: "22222222-2222-4222-8222-222222222222",
            alt: "Dorso",
            associatedColor: "Negro"
          },
          {
            imageUploadId: "33333333-3333-4333-8333-333333333333",
            alt: "Detalle",
            associatedColor: "Negro"
          }
        ])
      )
    ).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/admin/productos/irruptivo-training-tee/editar?error=image_batch_partial&subidas=2&total=3&motivo=unsupported_image_type"
    });

    expect(mocks.processProductImageUpload).toHaveBeenCalledTimes(3);
    expect(mocks.createAdminProductImageRecordOnce).toHaveBeenCalledTimes(2);
    expect(mocks.createAdminProductImageRecordOnce).toHaveBeenNthCalledWith(
      1,
      "irruptivo-training-tee",
      expect.objectContaining({ id: IMAGE_UPLOAD_ID, sortOrder: 1 })
    );
    expect(mocks.createAdminProductImageRecordOnce).toHaveBeenNthCalledWith(
      2,
      "irruptivo-training-tee",
      expect.objectContaining({
        id: "33333333-3333-4333-8333-333333333333",
        sortOrder: 2
      })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/admin/productos/irruptivo-training-tee/editar"
    );
  });

  it("deletes processed files when image metadata persistence fails after upload processing", async () => {
    const events: string[] = [];
    const image = createProcessedImage();
    mocks.processProductImageUpload.mockResolvedValue({
      ok: true,
      image
    });
    mocks.readAdminProductRecords.mockResolvedValue([createProductRecord()]);
    mocks.createAdminProductImageRecordOnce.mockImplementation(async () => {
      events.push("save");
      throw new Error("database unavailable");
    });
    mocks.deleteProcessedProductImageFiles.mockImplementation(async () => {
      events.push("delete");
    });

    await expect(uploadAdminProductImage(createUploadFormData())).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/admin/productos/irruptivo-training-tee/editar?imageAlt=Frente&imageColor=Negro&error=image_processing_failed"
    });

    expect(events).toEqual(["save", "delete"]);
    expect(mocks.deleteProcessedProductImageFiles).toHaveBeenCalledWith(image);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.saveAdminProductRecords).not.toHaveBeenCalled();
  });

  it("updates an uploaded collection image color association", async () => {
    mocks.readAdminProductRecords.mockResolvedValue([
      createProductRecord({
        images: [
          {
            ...createImageRecord(),
            associatedColor: null,
            variantId: null
          }
        ]
      })
    ]);

    await expect(
      updateAdminProductImageAssociation(
        createImageAssociationFormData({
          associatedColor: "Negro"
        })
      )
    ).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/admin/productos/irruptivo-training-tee/editar?estado=imagen-asociacion-actualizada#image-section-title"
    });

    expect(mocks.saveAdminProductImageRecord).toHaveBeenCalledWith(
      "irruptivo-training-tee",
      expect.objectContaining({
        id: IMAGE_UPLOAD_ID,
        associatedColor: "Negro",
        variantId: null
      })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/admin/productos/irruptivo-training-tee/editar"
    );
    expect(mocks.createAdminProductImageRecordOnce).not.toHaveBeenCalled();
  });

  it("rejects image association updates with colors outside the product variants", async () => {
    mocks.readAdminProductRecords.mockResolvedValue([
      createProductRecord({
        images: [createImageRecord()]
      })
    ]);

    await expect(
      updateAdminProductImageAssociation(
        createImageAssociationFormData({
          associatedColor: "Rojo"
        })
      )
    ).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/admin/productos/irruptivo-training-tee/editar?error=image_validation"
    });

    expect(mocks.saveAdminProductImageRecord).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("admin product delete action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(undefined);
    mocks.deleteAdminProductRecord.mockResolvedValue(createDeleteResult());
  });

  it("requires an admin session before deleting", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("unauthorized"));

    await expect(deleteAdminProduct(createDeleteFormData())).rejects.toThrow(
      "unauthorized"
    );

    expect(mocks.deleteAdminProductRecord).not.toHaveBeenCalled();
    expect(mocks.deleteProductMediaDirectory).not.toHaveBeenCalled();
    expect(mocks.deleteProcessedProductImageFiles).not.toHaveBeenCalled();
  });

  it("redirects to the product list error when the product does not exist", async () => {
    mocks.deleteAdminProductRecord.mockResolvedValue(null);

    await expect(deleteAdminProduct(createDeleteFormData())).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/admin/productos?error=not_found"
    });

    expect(mocks.deleteAdminProductRecord).toHaveBeenCalledWith(
      "irruptivo-training-tee"
    );
    expect(mocks.deleteProductMediaDirectory).not.toHaveBeenCalled();
    expect(mocks.deleteProcessedProductImageFiles).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("deletes the product media directory, revalidates catalog paths, and redirects with a success notice", async () => {
    const result = createDeleteResult();
    mocks.deleteAdminProductRecord.mockResolvedValue(result);

    await expect(deleteAdminProduct(createDeleteFormData())).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/admin/productos?estado=producto-eliminado"
    });

    expect(mocks.deleteProductMediaDirectory).toHaveBeenCalledTimes(1);
    expect(mocks.deleteProductMediaDirectory).toHaveBeenCalledWith(
      "irruptivo-training-tee"
    );
    expect(mocks.deleteProcessedProductImageFiles).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/productos");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/coleccion");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/admin/productos/irruptivo-training-tee/editar"
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/coleccion/training-tee-negra"
    );
  });

  it("still redirects successfully when file cleanup fails after the database delete", async () => {
    mocks.deleteProductMediaDirectory.mockRejectedValueOnce(
      new Error("missing file")
    );

    await expect(deleteAdminProduct(createDeleteFormData())).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "/admin/productos?estado=producto-eliminado"
    });

    expect(mocks.deleteProductMediaDirectory).toHaveBeenCalledTimes(1);
    expect(mocks.deleteProcessedProductImageFiles).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/productos");
  });
});

const IMAGE_UPLOAD_ID = "11111111-1111-4111-8111-111111111111";

function createUploadFormData({
  imageUploadId = IMAGE_UPLOAD_ID,
  alt = "Frente",
  associatedColor = "Negro"
}: {
  imageUploadId?: string;
  alt?: string;
  associatedColor?: string;
} = {}): FormData {
  const formData = new FormData();
  formData.set("productId", "irruptivo-training-tee");
  formData.set("imageUploadId", imageUploadId);
  formData.set(
    "image",
    new File([new Uint8Array([1])], "training-tee.jpg", {
      type: "image/jpeg"
    })
  );
  formData.set("alt", alt);
  formData.set("associatedColor", associatedColor);

  return formData;
}

function createBatchUploadFormData(
  entries: readonly {
    imageUploadId: string;
    alt: string;
    associatedColor: string;
  }[]
): FormData {
  const formData = new FormData();
  formData.set("productId", "irruptivo-training-tee");

  for (const [index, entry] of entries.entries()) {
    formData.append("imageUploadId", entry.imageUploadId);
    formData.append(
      "image",
      new File([new Uint8Array([index + 1])], `training-tee-${index + 1}.jpg`, {
        type: "image/jpeg"
      })
    );
    formData.append("alt", entry.alt);
    formData.append("associatedColor", entry.associatedColor);
  }

  return formData;
}

function createImageAssociationFormData({
  associatedColor = "",
  variantId = ""
}: {
  associatedColor?: string;
  variantId?: string;
} = {}): FormData {
  const formData = new FormData();
  formData.set("productId", "irruptivo-training-tee");
  formData.set("imageId", IMAGE_UPLOAD_ID);

  if (associatedColor) {
    formData.set("associatedColor", associatedColor);
  }

  if (variantId) {
    formData.set("variantId", variantId);
  }

  return formData;
}

function getUploadId(index: number): string {
  const paddedIndex = String(index).padStart(12, "0");

  return `11111111-1111-4111-8111-${paddedIndex}`;
}

function createDeleteFormData(): FormData {
  const formData = new FormData();
  formData.set("productId", "irruptivo-training-tee");

  return formData;
}

function createProductRecord({
  id = "irruptivo-training-tee",
  slug = "training-tee-negra",
  images = []
}: {
  id?: string;
  slug?: string;
  images?: CatalogProductImageRecord[];
} = {}): CatalogProductRecord {
  return {
    id,
    slug,
    name: "Training Tee Negra",
    description: "Remera deportiva de calce relajado para entrenamiento diario.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 26000,
    clothingSubcategory: "Remeras",
    supplementType: null,
    variants: [
      {
        id: "tee-black-s",
        sku: "TEE-BLK-S",
        name: "Negro / S",
        stock: 4,
        options: {
          color: "Negro",
          size: "S"
        }
      },
      {
        id: "tee-black-m",
        sku: "TEE-BLK-M",
        name: "Negro / M",
        stock: 2,
        options: {
          color: "Negro",
          size: "M"
        }
      }
    ],
    images
  };
}

function createProcessedImage({
  id = IMAGE_UPLOAD_ID,
  alt = "Frente"
}: {
  id?: string;
  alt?: string;
} = {}): ProductImageUploadInput {
  return {
    id,
    alt,
    associatedColor: "Negro",
    variantId: null,
    renditions: {
      card: {
        path: `products/irruptivo-training-tee/${id}/card.webp`,
        width: 640,
        height: 900
      },
      detail: {
        path: `products/irruptivo-training-tee/${id}/detail.webp`,
        width: 1200,
        height: 1600
      },
      original: {
        path: `products/irruptivo-training-tee/${id}/original.webp`,
        width: 1800,
        height: 2400
      }
    }
  };
}

function createImageRecord(): CatalogProductImageRecord {
  return {
    id: IMAGE_UPLOAD_ID,
    path: `products/irruptivo-training-tee/${IMAGE_UPLOAD_ID}/detail.webp`,
    alt: "Frente",
    sortOrder: 1,
    width: 1200,
    height: 1600,
    renditions: createProcessedImage().renditions,
    associatedColor: "Negro",
    variantId: null,
    deletedAt: null
  };
}

function createDeleteResult(): CatalogProductRecord {
  const deletedImage: ProductImageUploadInput = {
    ...createProcessedImage(),
    id: "22222222-2222-4222-8222-222222222222",
    renditions: {
      card: {
        path: "products/irruptivo-training-tee/soft-deleted/card.webp",
        width: 640,
        height: 900
      },
      detail: {
        path: "products/irruptivo-training-tee/soft-deleted/detail.webp",
        width: 1200,
        height: 1600
      },
      original: {
        path: "products/irruptivo-training-tee/soft-deleted/original.webp",
        width: 1800,
        height: 2400
      }
    }
  };

  return createProductRecord({
    images: [
      createImageRecord(),
      {
        id: deletedImage.id,
        path: deletedImage.renditions.detail.path,
        alt: "Imagen eliminada",
        sortOrder: 2,
        width: deletedImage.renditions.detail.width,
        height: deletedImage.renditions.detail.height,
        renditions: deletedImage.renditions,
        associatedColor: null,
        variantId: null,
        deletedAt: "2026-05-30T12:00:00.000Z"
      }
    ]
  });
}
