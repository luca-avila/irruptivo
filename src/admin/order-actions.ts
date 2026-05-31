"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "./auth";
import {
  transitionOrderFulfillmentStatus,
  type AdminOrderTransitionErrorCode
} from "./order-transitions";

const ADMIN_ORDERS_PATH = "/admin/pedidos";

export async function transitionAdminOrderFulfillment(
  formData: FormData
): Promise<void> {
  await requireAdmin();

  const orderId = readStringField(formData, "orderId");
  const actionId = readStringField(formData, "actionId");
  const result = transitionOrderFulfillmentStatus({
    orderId,
    actionId
  });

  revalidatePath(ADMIN_ORDERS_PATH);

  if (orderId.trim()) {
    revalidatePath(getAdminOrderDetailPath(orderId));
  }

  if (!result.ok) {
    redirect(getTransitionErrorRedirect(orderId, result.error.code));
  }

  revalidatePath(getAdminOrderDetailPath(result.order.id));
  redirect(`${getAdminOrderDetailPath(result.order.id)}?estado=estado-actualizado`);
}

function readStringField(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

function getTransitionErrorRedirect(
  orderId: string,
  errorCode: AdminOrderTransitionErrorCode
): string {
  const normalizedOrderId = orderId.trim();
  const errorParam = getTransitionErrorParam(errorCode);

  if (!normalizedOrderId) {
    return `${ADMIN_ORDERS_PATH}?error=${errorParam}`;
  }

  return `${getAdminOrderDetailPath(normalizedOrderId)}?error=${errorParam}`;
}

function getTransitionErrorParam(
  errorCode: AdminOrderTransitionErrorCode
): string {
  switch (errorCode) {
    case "invalid_action":
      return "accion-invalida";
    case "invalid_transition":
      return "accion-no-disponible";
    case "payment_status_locked":
      return "estado-pago-bloqueado";
    case "terminal_status":
      return "estado-final";
    case "update_failed":
      return "guardado-fallido";
    case "order_not_found":
    default:
      return "pedido-no-encontrado";
  }
}

function getAdminOrderDetailPath(orderId: string): string {
  return `${ADMIN_ORDERS_PATH}/${encodeURIComponent(orderId.trim())}`;
}
