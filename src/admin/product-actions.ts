"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  PRODUCT_STATUS,
  type ProductArea,
  type ProductStatus
} from "../catalog/catalog";
import { requireAdmin } from "./auth";
import {
  createProduct,
  readAdminProductRecords,
  saveAdminProductRecords,
  setProductStatus,
  updateProduct,
  type ProductManagementErrorCode
} from "./products";

const ADMIN_PRODUCTS_PATH = "/admin/productos";

export async function createAdminProduct(formData: FormData): Promise<void> {
  await requireAdmin();

  const result = createProduct(
    {
      name: readStringField(formData, "name"),
      description: readStringField(formData, "description"),
      area: readStringField(formData, "area") as ProductArea,
      clothingSubcategory: readStringField(formData, "clothingSubcategory"),
      supplementType: readStringField(formData, "supplementType"),
      basePriceArs: Number(readStringField(formData, "basePriceArs")),
      status: readStringField(formData, "status") as ProductStatus
    },
    readAdminProductRecords()
  );

  if (!result.ok) {
    redirect(getCreateErrorRedirect(result.error.code));
  }

  saveAdminProductRecords(result.products);
  revalidateCatalogPaths();

  redirect(`${ADMIN_PRODUCTS_PATH}?estado=producto-creado`);
}

export async function updateAdminProduct(formData: FormData): Promise<void> {
  await requireAdmin();

  const productId = readStringField(formData, "productId");
  const products = readAdminProductRecords();
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

  saveAdminProductRecords(statusResult.products);
  revalidateCatalogPaths();

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
  const result = setProductStatus(productId, status, readAdminProductRecords());

  if (!result.ok) {
    redirect(`${ADMIN_PRODUCTS_PATH}?error=${result.error.code}`);
  }

  saveAdminProductRecords(result.products);
  revalidateCatalogPaths();

  const state =
    status === PRODUCT_STATUS.active ? "producto-activado" : "producto-desactivado";

  redirect(`${ADMIN_PRODUCTS_PATH}?estado=${state}`);
}

function readStringField(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

function getCreateErrorRedirect(errorCode: ProductManagementErrorCode): string {
  return `${ADMIN_PRODUCTS_PATH}/nuevo?error=${errorCode}`;
}

function getEditErrorRedirect(
  productId: string,
  errorCode: ProductManagementErrorCode
): string {
  if (!productId || errorCode === "not_found") {
    return `${ADMIN_PRODUCTS_PATH}?error=${errorCode}`;
  }

  return `${ADMIN_PRODUCTS_PATH}/${encodeURIComponent(
    productId
  )}/editar?error=${errorCode}`;
}

function revalidateCatalogPaths(): void {
  revalidatePath(ADMIN_PRODUCTS_PATH);
  revalidatePath("/coleccion");
  revalidatePath("/suplementos");
  revalidatePath("/buscar");
  revalidatePath("/");
}
