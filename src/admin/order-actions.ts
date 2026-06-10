"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "./auth";
import { findOrderByIdInStore } from "../orders/order-store";
import { EMAIL_DELIVERY_RESEND_RECLAIM_AFTER_MS } from "../notifications/order-confirmation-email";
import {
  isFulfillmentUpdateEmailStatus,
  sendFulfillmentUpdateOnce,
  type FulfillmentUpdateEmailResult
} from "../notifications/fulfillment-update-email";
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
  const result = await transitionOrderFulfillmentStatus({
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

export async function resendFulfillmentUpdateEmail(
  formData: FormData
): Promise<void> {
  await requireAdmin();

  const orderId = readStringField(formData, "orderId");
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    redirect(`${ADMIN_ORDERS_PATH}?error=pedido-no-encontrado`);
  }

  const order = await findOrderByIdInStore(normalizedOrderId);

  if (!order) {
    redirect(getTransitionErrorRedirect(normalizedOrderId, "order_not_found"));
  }

  if (!isFulfillmentUpdateEmailStatus(order.status)) {
    redirect(
      `${getAdminOrderDetailPath(normalizedOrderId)}?error=email-no-disponible`
    );
  }

  const result = await sendFulfillmentUpdateOnce(order, {
    reclaimAfterMs: EMAIL_DELIVERY_RESEND_RECLAIM_AFTER_MS
  });

  revalidatePath(ADMIN_ORDERS_PATH);
  revalidatePath(getAdminOrderDetailPath(order.id));

  redirect(
    `${getAdminOrderDetailPath(order.id)}?${getFulfillmentEmailRedirectParam(
      result
    )}`
  );
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

function getFulfillmentEmailRedirectParam(
  result: FulfillmentUpdateEmailResult
): string {
  switch (result.status) {
    case "sent":
      return "estado=email-reenviado";
    case "duplicate":
      return "estado=email-ya-enviado";
    case "configuration_missing":
      return "error=email-configuracion-faltante";
    case "failed":
      return "error=email-envio-fallido";
    case "skipped":
    default:
      return "error=email-no-disponible";
  }
}

function getAdminOrderDetailPath(orderId: string): string {
  return `${ADMIN_ORDERS_PATH}/${encodeURIComponent(orderId.trim())}`;
}
