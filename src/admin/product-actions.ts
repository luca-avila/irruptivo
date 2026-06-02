"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  reorderProductImages,
  softDeleteProductImage,
  uploadProductImage,
  type ProductImageManagementErrorCode
} from "../catalog/product-images";
import {
  PRODUCT_STATUS,
  type CatalogProductRecord,
  type ProductArea,
  type ProductStatus
} from "../catalog/catalog";
import { requireAdmin } from "./auth";
import {
  deleteProcessedProductImageFiles,
  processProductImageUpload
} from "./product-image-processing";
import {
  addProductVariant,
  createProduct,
  isDuplicateVariantSkuPersistenceError,
  readAdminProductRecords,
  saveAdminProductRecords,
  setProductStatus,
  updateProduct,
  updateProductVariant,
  type ProductVariantInput,
  type ProductManagementErrorCode
} from "./products";

const ADMIN_PRODUCTS_PATH = "/admin/productos";

export async function createAdminProduct(formData: FormData): Promise<void> {
  await requireAdmin();

  const products = await readAdminProductRecords();
  const result = createProduct(
    {
      name: readStringField(formData, "name"),
      description: readStringField(formData, "description"),
      area: readStringField(formData, "area") as ProductArea,
      clothingSubcategory: readStringField(formData, "clothingSubcategory"),
      supplementType: readStringField(formData, "supplementType"),
      basePriceArs: Number(readStringField(formData, "basePriceArs")),
      // A brand-new product has no variants yet, so it can only be created
      // inactive. It gets activated from the edit page once a variant exists.
      status: PRODUCT_STATUS.inactive
    },
    products
  );

  if (!result.ok) {
    redirect(getCreateErrorRedirect(result.error.code));
  }

  await saveAdminProductRecordsOrRedirect(
    result.products,
    getCreateErrorRedirect("duplicate_variant_sku")
  );
  revalidateCatalogPaths(result.product);

  // Send the admin straight to the edit page to add variants and images.
  redirect(
    `${ADMIN_PRODUCTS_PATH}/${encodeURIComponent(
      result.product.id
    )}/editar?estado=producto-creado`
  );
}

export async function updateAdminProduct(formData: FormData): Promise<void> {
  await requireAdmin();

  const productId = readStringField(formData, "productId");
  const products = await readAdminProductRecords();
  const updateResult = updateProduct(
    productId,
    {
      name: readStringField(formData, "name"),
      description: readStringField(formData, "description"),
      area: readStringField(formData, "area") as ProductArea,
      clothingSubcategory: readStringField(formData, "clothingSubcategory"),
      supplementType: readStringField(formData, "supplementType"),
      basePriceArs: Number(readStringField(formData, "basePriceArs"))
    },
    products
  );

  if (!updateResult.ok) {
    redirect(getEditErrorRedirect(productId, updateResult.error.code));
  }

  const statusResult = setProductStatus(
    productId,
    readStringField(formData, "status") as ProductStatus,
    updateResult.products
  );

  if (!statusResult.ok) {
    redirect(getEditErrorRedirect(productId, statusResult.error.code));
  }

  await saveAdminProductRecordsOrRedirect(
    statusResult.products,
    getEditErrorRedirect(productId, "duplicate_variant_sku")
  );
  revalidateCatalogPaths(statusResult.product);

  redirect(
    `${ADMIN_PRODUCTS_PATH}/${encodeURIComponent(productId)}/editar?estado=producto-actualizado`
  );
}

export async function changeAdminProductStatus(
  formData: FormData
): Promise<void> {
  await requireAdmin();

  const productId = readStringField(formData, "productId");
  const status = readStringField(formData, "status") as ProductStatus;
  const products = await readAdminProductRecords();
  const result = setProductStatus(productId, status, products);

  if (!result.ok) {
    redirect(`${ADMIN_PRODUCTS_PATH}?error=${result.error.code}`);
  }

  await saveAdminProductRecordsOrRedirect(
    result.products,
    `${ADMIN_PRODUCTS_PATH}?error=duplicate_variant_sku`
  );
  revalidateCatalogPaths(result.product);

  // Redirect so the list re-renders with the new status (button/pill flip) and
  // shows the matching feedback banner.
  const stateParam =
    status === PRODUCT_STATUS.active
      ? "producto-activado"
      : "producto-desactivado";
  redirect(`${ADMIN_PRODUCTS_PATH}?estado=${stateParam}`);
}

export async function createAdminProductVariant(
  formData: FormData
): Promise<void> {
  await requireAdmin();

  const productId = readStringField(formData, "productId");
  const products = await readAdminProductRecords();
  const result = addProductVariant(
    productId,
    readVariantInput(formData),
    products
  );

  if (!result.ok) {
    redirect(getEditErrorRedirect(productId, result.error.code));
  }

  await saveAdminProductRecordsOrRedirect(
    result.products,
    getEditErrorRedirect(productId, "duplicate_variant_sku")
  );
  revalidateCatalogPaths(result.product);

  redirect(
    `${ADMIN_PRODUCTS_PATH}/${encodeURIComponent(productId)}/editar?estado=variante-creada`
  );
}

export async function updateAdminProductVariant(
  formData: FormData
): Promise<void> {
  await requireAdmin();

  const productId = readStringField(formData, "productId");
  const variantId = readStringField(formData, "variantId");
  const products = await readAdminProductRecords();
  const result = updateProductVariant(
    productId,
    variantId,
    readVariantInput(formData),
    products
  );

  if (!result.ok) {
    redirect(getEditErrorRedirect(productId, result.error.code));
  }

  await saveAdminProductRecordsOrRedirect(
    result.products,
    getEditErrorRedirect(productId, "duplicate_variant_sku")
  );
  revalidateCatalogPaths(result.product);

  redirect(
    `${ADMIN_PRODUCTS_PATH}/${encodeURIComponent(
      productId
    )}/editar?estado=variante-actualizada`
  );
}

export async function uploadAdminProductImage(formData: FormData): Promise<void> {
  await requireAdmin();

  const productId = readStringField(formData, "productId");
  const products = await readAdminProductRecords();

  if (!products.some((product) => product.id === productId)) {
    redirect(getEditErrorRedirect(productId, "not_found"));
  }

  const processedImage = await processProductImageUpload({
    productId,
    file: readFileField(formData, "image"),
    alt: readStringField(formData, "alt"),
    associatedColor: readStringField(formData, "associatedColor"),
    variantId: readStringField(formData, "variantId")
  });

  if (!processedImage.ok) {
    redirect(
      getEditErrorRedirect(
        productId,
        processedImage.error.code,
        getImageFormStateParams(formData)
      )
    );
  }

  const result = uploadProductImage(productId, processedImage.image, products);

  if (!result.ok) {
    await deleteProcessedProductImageFiles(processedImage.image);
    redirect(
      getEditErrorRedirect(
        productId,
        result.error.code,
        getImageFormStateParams(formData)
      )
    );
  }

  await saveUploadedProductImageRecordsOrRedirect(
    result.products,
    processedImage.image,
    getEditErrorRedirect(productId, "duplicate_variant_sku"),
    getEditErrorRedirect(
      productId,
      "image_processing_failed",
      getImageFormStateParams(formData)
    )
  );
  revalidateCatalogPaths(result.product);

  redirect(
    `${ADMIN_PRODUCTS_PATH}/${encodeURIComponent(productId)}/editar?estado=imagen-subida`
  );
}

export async function reorderAdminProductImages(
  formData: FormData
): Promise<void> {
  await requireAdmin();

  const productId = readStringField(formData, "productId");
  const orderedImageIds = readStringField(formData, "imageOrder")
    .split(",")
    .map((imageId) => imageId.trim())
    .filter(Boolean);
  const products = await readAdminProductRecords();
  const result = reorderProductImages(productId, orderedImageIds, products);

  if (!result.ok) {
    redirect(getEditErrorRedirect(productId, result.error.code));
  }

  await saveAdminProductRecordsOrRedirect(
    result.products,
    getEditErrorRedirect(productId, "duplicate_variant_sku")
  );
  revalidateCatalogPaths(result.product);

  redirect(
    `${ADMIN_PRODUCTS_PATH}/${encodeURIComponent(
      productId
    )}/editar?estado=imagenes-ordenadas`
  );
}

export async function softDeleteAdminProductImage(
  formData: FormData
): Promise<void> {
  await requireAdmin();

  const productId = readStringField(formData, "productId");
  const imageId = readStringField(formData, "imageId");
  const products = await readAdminProductRecords();
  const result = softDeleteProductImage(productId, imageId, products);

  if (!result.ok) {
    redirect(getEditErrorRedirect(productId, result.error.code));
  }

  await saveAdminProductRecordsOrRedirect(
    result.products,
    getEditErrorRedirect(productId, "duplicate_variant_sku")
  );
  revalidateCatalogPaths(result.product);

  redirect(
    `${ADMIN_PRODUCTS_PATH}/${encodeURIComponent(productId)}/editar?estado=imagen-eliminada`
  );
}

async function saveAdminProductRecordsOrRedirect(
  products: readonly CatalogProductRecord[],
  duplicateVariantSkuRedirect: string
): Promise<void> {
  try {
    await saveAdminProductRecords(products);
  } catch (error) {
    if (isDuplicateVariantSkuPersistenceError(error)) {
      redirect(duplicateVariantSkuRedirect);
    }

    throw error;
  }
}

async function saveUploadedProductImageRecordsOrRedirect(
  products: readonly CatalogProductRecord[],
  image: Parameters<typeof deleteProcessedProductImageFiles>[0],
  duplicateVariantSkuRedirect: string,
  imagePersistFailureRedirect: string
): Promise<void> {
  try {
    await saveAdminProductRecords(products);
  } catch (error) {
    await deleteProcessedProductImageFiles(image);

    if (isDuplicateVariantSkuPersistenceError(error)) {
      redirect(duplicateVariantSkuRedirect);
    }

    redirect(imagePersistFailureRedirect);
  }
}

function readStringField(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

function readFileField(formData: FormData, name: string): File | null {
  const value = formData.get(name);

  return typeof File !== "undefined" && value instanceof File ? value : null;
}

function readVariantInput(formData: FormData): ProductVariantInput {
  return {
    sku: readStringField(formData, "sku"),
    color: readStringField(formData, "color"),
    size: readStringField(formData, "size"),
    flavor: readStringField(formData, "flavor"),
    weight: readStringField(formData, "weight"),
    presentation: readStringField(formData, "presentation"),
    stock: Number(readStringField(formData, "stock")),
    priceOverrideArs: readOptionalNumberField(formData, "priceOverrideArs")
  };
}

function readOptionalNumberField(formData: FormData, name: string): number | null {
  const value = readStringField(formData, name).trim();

  return value ? Number(value) : null;
}

function getCreateErrorRedirect(errorCode: ProductManagementErrorCode): string {
  return `${ADMIN_PRODUCTS_PATH}/nuevo?error=${errorCode}`;
}

function getEditErrorRedirect(
  productId: string,
  errorCode: ProductManagementErrorCode | ProductImageManagementErrorCode,
  searchParams?: URLSearchParams
): string {
  if (!productId || errorCode === "not_found") {
    return `${ADMIN_PRODUCTS_PATH}?error=${errorCode}`;
  }

  const params = new URLSearchParams(searchParams);
  params.set("error", errorCode);

  return `${ADMIN_PRODUCTS_PATH}/${encodeURIComponent(
    productId
  )}/editar?${params.toString()}`;
}

function getImageFormStateParams(formData: FormData): URLSearchParams {
  const params = new URLSearchParams();
  const alt = readStringField(formData, "alt").trim();
  const associatedColor = readStringField(formData, "associatedColor").trim();
  const variantId = readStringField(formData, "variantId").trim();

  if (alt) {
    params.set("imageAlt", alt);
  }

  if (associatedColor) {
    params.set("imageColor", associatedColor);
  }

  if (variantId) {
    params.set("imageVariantId", variantId);
  }

  return params;
}

function revalidateCatalogPaths(product?: CatalogProductRecord): void {
  revalidatePath(ADMIN_PRODUCTS_PATH);
  revalidatePath("/coleccion");
  revalidatePath("/suplementos");
  revalidatePath("/buscar");
  revalidatePath("/");

  if (!product) {
    return;
  }

  revalidatePath(
    `${ADMIN_PRODUCTS_PATH}/${encodeURIComponent(product.id)}/editar`
  );
  revalidatePath(getProductDetailPath(product));
}

function getProductDetailPath(product: CatalogProductRecord): string {
  if (product.area === "clothing") {
    return `/coleccion/${product.slug}`;
  }

  return `/suplementos/${product.slug}`;
}
