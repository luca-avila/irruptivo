"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "./auth";
import { updateOrderFulfillmentFields } from "./order-fulfillment-edits";

const ADMIN_ORDERS_PATH = "/admin/pedidos";

export async function updateAdminOrderFulfillmentFields(
  formData: FormData
): Promise<void> {
  await requireAdmin();

  const orderId = readStringField(formData, "orderId");
  const fields = readSubmittedFields(formData);
  const result = await updateOrderFulfillmentFields({
    orderId,
    fields
  });
  const detailPath = getOrderDetailPath(orderId);

  if (!result.ok) {
    redirect(`${detailPath}?error=${result.error.code}`);
  }

  revalidatePath(ADMIN_ORDERS_PATH);
  revalidatePath(detailPath);

  redirect(`${detailPath}?estado=fulfillment-actualizado`);
}

function readSubmittedFields(formData: FormData): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const [field, value] of formData.entries()) {
    if (field === "orderId" || field.startsWith("$ACTION_")) {
      continue;
    }

    if (typeof value !== "string") {
      continue;
    }

    fields[field] = value;
  }

  return fields;
}

function readStringField(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

function getOrderDetailPath(orderId: string): string {
  const normalizedOrderId = orderId.trim();

  return normalizedOrderId
    ? `${ADMIN_ORDERS_PATH}/${encodeURIComponent(normalizedOrderId)}`
    : ADMIN_ORDERS_PATH;
}
