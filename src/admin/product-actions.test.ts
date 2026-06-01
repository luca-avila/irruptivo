import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductRecord
} from "../catalog/catalog";
import { type ProductImageUploadInput } from "../catalog/product-images";
import { uploadAdminProductImage } from "./product-actions";

const mocks = vi.hoisted(() => ({
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
  deleteProcessedProductImageFiles: mocks.deleteProcessedProductImageFiles,
  processProductImageUpload: mocks.processProductImageUpload
}));

vi.mock("./products", () => ({
  addProductVariant: vi.fn(),
  createProduct: vi.fn(),
  isDuplicateVariantSkuPersistenceError:
    mocks.isDuplicateVariantSkuPersistenceError,
  readAdminProductRecords: mocks.readAdminProductRecords,
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
  });

  it("deletes processed files when image metadata persistence fails after upload processing", async () => {
    const events: string[] = [];
    const image = createProcessedImage();
    mocks.processProductImageUpload.mockResolvedValue({
      ok: true,
      image
    });
    mocks.readAdminProductRecords.mockResolvedValue([createProductRecord()]);
    mocks.saveAdminProductRecords.mockImplementation(async () => {
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
  });
});

function createUploadFormData(): FormData {
  const formData = new FormData();
  formData.set("productId", "irruptivo-training-tee");
  formData.set(
    "image",
    new File([new Uint8Array([1])], "training-tee.jpg", {
      type: "image/jpeg"
    })
  );
  formData.set("alt", "Frente");
  formData.set("associatedColor", "Negro");

  return formData;
}

function createProductRecord(): CatalogProductRecord {
  return {
    id: "irruptivo-training-tee",
    slug: "training-tee-negra",
    name: "Training Tee Negra",
    description: "Remera deportiva de calce relajado para entrenamiento diario.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 26000,
    clothingSubcategory: "Remeras",
    supplementType: null,
    variants: [],
    images: []
  };
}

function createProcessedImage(): ProductImageUploadInput {
  return {
    id: "image-test",
    alt: "Frente",
    associatedColor: "Negro",
    variantId: null,
    renditions: {
      card: {
        path: "products/irruptivo-training-tee/image-test/card.webp",
        width: 640,
        height: 900
      },
      detail: {
        path: "products/irruptivo-training-tee/image-test/detail.webp",
        width: 1200,
        height: 1600
      },
      original: {
        path: "products/irruptivo-training-tee/image-test/original.webp",
        width: 1800,
        height: 2400
      }
    }
  };
}
