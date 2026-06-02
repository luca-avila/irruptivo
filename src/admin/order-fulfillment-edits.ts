import { DELIVERY_METHOD, ORDER_STATUS, type OrderStatus } from "../domain/rules";
import { type Order } from "../orders/order-creation";
import {
  findOrderByIdInStore,
  updateOrderInStore
} from "../orders/order-store";

export type AdminOrderFulfillmentEditRepository = {
  findOrderById: (orderId: string) => Promise<Order | null>;
  updateOrder: (order: Order) => Promise<Order | null>;
};

export type AdminOrderFulfillmentEditOptions = {
  orderRepository?: AdminOrderFulfillmentEditRepository;
};

export type AdminOrderFulfillmentEditInput = {
  orderId: string;
  fields: Record<string, unknown>;
};

export type AdminOrderFulfillmentEditErrorCode =
  | "empty_update"
  | "field_too_long"
  | "immutable_field"
  | "invalid_address_line"
  | "invalid_city"
  | "invalid_email"
  | "invalid_full_name"
  | "invalid_phone"
  | "invalid_postal_code"
  | "invalid_province"
  | "not_found"
  | "order_not_editable"
  | "save_failed";

export type AdminOrderFulfillmentEditError = {
  code: AdminOrderFulfillmentEditErrorCode;
  message: string;
  field?: string;
};

export type AdminOrderFulfillmentEditResult =
  | {
      ok: true;
      order: Order;
    }
  | {
      ok: false;
      error: AdminOrderFulfillmentEditError;
    };

const ADMIN_ORDER_MUTABLE_FIELDS = [
  "adminNotes",
  "contact.email",
  "contact.fullName",
  "contact.phone",
  "delivery.notes",
  "delivery.shippingAddress.addressLine",
  "delivery.shippingAddress.city",
  "delivery.shippingAddress.postalCode",
  "delivery.shippingAddress.province"
] as const;

export type AdminOrderMutableField = (typeof ADMIN_ORDER_MUTABLE_FIELDS)[number];

const ADMIN_ORDER_CONTACT_FIELDS = new Set<string>([
  "contact.email",
  "contact.fullName",
  "contact.phone"
]);

const ADMIN_ORDER_SHIPPING_FIELDS = new Set<string>([
  "delivery.shippingAddress.addressLine",
  "delivery.shippingAddress.city",
  "delivery.shippingAddress.postalCode",
  "delivery.shippingAddress.province"
]);

const EDITABLE_AFTER_PAYMENT_STATUSES = new Set<OrderStatus>([
  ORDER_STATUS.paid,
  ORDER_STATUS.preparing,
  ORDER_STATUS.shipped,
  ORDER_STATUS.delivered,
  ORDER_STATUS.readyForPickup,
  ORDER_STATUS.pickedUp
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_MAX_LENGTHS = {
  adminNotes: 1000,
  contactEmail: 160,
  contactFullName: 120,
  contactPhone: 60,
  deliveryNotes: 500,
  shippingAddressLine: 160,
  shippingCity: 80,
  shippingPostalCode: 20,
  shippingProvince: 80
} as const;

const defaultOrderRepository: AdminOrderFulfillmentEditRepository = {
  findOrderById: findOrderByIdInStore,
  updateOrder: updateOrderInStore
};

export function canEditOrderField(field: string, order: Order): boolean {
  if (!isOrderEditableAfterPayment(order)) {
    return false;
  }

  if (
    ADMIN_ORDER_CONTACT_FIELDS.has(field) ||
    field === "delivery.notes" ||
    field === "adminNotes"
  ) {
    return true;
  }

  if (ADMIN_ORDER_SHIPPING_FIELDS.has(field)) {
    return order.delivery.method === DELIVERY_METHOD.shipping;
  }

  return false;
}

export async function updateOrderFulfillmentFields(
  { orderId, fields }: AdminOrderFulfillmentEditInput,
  {
    orderRepository = defaultOrderRepository
  }: AdminOrderFulfillmentEditOptions = {}
): Promise<AdminOrderFulfillmentEditResult> {
  const normalizedOrderId = normalizeText(orderId);

  if (!normalizedOrderId) {
    return getError("not_found");
  }

  const order = await orderRepository.findOrderById(normalizedOrderId);

  if (!order) {
    return getError("not_found");
  }

  if (!isOrderEditableAfterPayment(order)) {
    return getError("order_not_editable");
  }

  const entries = Object.entries(fields);

  if (entries.length === 0) {
    return getError("empty_update");
  }

  for (const [field, value] of entries) {
    if (!canEditOrderField(field, order)) {
      return getError("immutable_field", field);
    }

    if (typeof value !== "string") {
      return getError("immutable_field", field);
    }
  }

  const nextOrder = cloneOrder(order);

  for (const [field, value] of entries) {
    const fieldResult = applyEditableField(nextOrder, field, value as string);

    if (!fieldResult.ok) {
      return fieldResult;
    }
  }

  const addressValidation = validateShippingAddress(nextOrder);

  if (!addressValidation.ok) {
    return addressValidation;
  }

  const updatedOrder = await orderRepository.updateOrder(nextOrder);

  if (!updatedOrder) {
    return getError("save_failed");
  }

  return {
    ok: true,
    order: updatedOrder
  };
}

export function isOrderEditableAfterPayment(order: Order): boolean {
  return EDITABLE_AFTER_PAYMENT_STATUSES.has(order.status);
}

function applyEditableField(
  order: Order,
  field: string,
  value: string
): AdminOrderFulfillmentEditResult {
  switch (field) {
    case "contact.fullName":
      return applyRequiredTextField({
        order,
        value,
        maxLength: FIELD_MAX_LENGTHS.contactFullName,
        emptyCode: "invalid_full_name",
        apply: (normalizedValue) => {
          order.contact.fullName = normalizedValue;
        }
      });
    case "contact.email":
      return applyEmailField(order, value);
    case "contact.phone":
      return applyRequiredTextField({
        order,
        value,
        maxLength: FIELD_MAX_LENGTHS.contactPhone,
        emptyCode: "invalid_phone",
        apply: (normalizedValue) => {
          order.contact.phone = normalizedValue;
        }
      });
    case "delivery.shippingAddress.addressLine":
      return applyShippingAddressTextField({
        order,
        value,
        key: "addressLine",
        maxLength: FIELD_MAX_LENGTHS.shippingAddressLine,
        emptyCode: "invalid_address_line"
      });
    case "delivery.shippingAddress.city":
      return applyShippingAddressTextField({
        order,
        value,
        key: "city",
        maxLength: FIELD_MAX_LENGTHS.shippingCity,
        emptyCode: "invalid_city"
      });
    case "delivery.shippingAddress.province":
      return applyShippingAddressTextField({
        order,
        value,
        key: "province",
        maxLength: FIELD_MAX_LENGTHS.shippingProvince,
        emptyCode: "invalid_province"
      });
    case "delivery.shippingAddress.postalCode":
      return applyShippingAddressTextField({
        order,
        value,
        key: "postalCode",
        maxLength: FIELD_MAX_LENGTHS.shippingPostalCode,
        emptyCode: "invalid_postal_code"
      });
    case "delivery.notes":
      return applyOptionalTextField({
        order,
        value,
        maxLength: FIELD_MAX_LENGTHS.deliveryNotes,
        apply: (normalizedValue) => {
          order.delivery.notes = normalizedValue;
        }
      });
    case "adminNotes":
      return applyOptionalTextField({
        order,
        value,
        maxLength: FIELD_MAX_LENGTHS.adminNotes,
        apply: (normalizedValue) => {
          order.adminNotes = normalizedValue;
        }
      });
    default:
      return getError("immutable_field", field);
  }
}

function applyEmailField(
  order: Order,
  value: string
): AdminOrderFulfillmentEditResult {
  const email = normalizeEmail(value);

  if (!email || !EMAIL_PATTERN.test(email)) {
    return getError("invalid_email", "contact.email");
  }

  if (email.length > FIELD_MAX_LENGTHS.contactEmail) {
    return getError("field_too_long", "contact.email");
  }

  order.contact.email = email;

  return {
    ok: true,
    order
  };
}

function applyRequiredTextField({
  order,
  value,
  maxLength,
  emptyCode,
  apply
}: {
  order: Order;
  value: string;
  maxLength: number;
  emptyCode: AdminOrderFulfillmentEditErrorCode;
  apply: (value: string) => void;
}): AdminOrderFulfillmentEditResult {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return getError(emptyCode);
  }

  if (normalizedValue.length > maxLength) {
    return getError("field_too_long");
  }

  apply(normalizedValue);

  return {
    ok: true,
    order
  };
}

function applyOptionalTextField({
  order,
  value,
  maxLength,
  apply
}: {
  order: Order;
  value: string;
  maxLength: number;
  apply: (value: string | null) => void;
}): AdminOrderFulfillmentEditResult {
  const normalizedValue = normalizeOptionalText(value);

  if (normalizedValue && normalizedValue.length > maxLength) {
    return getError("field_too_long");
  }

  apply(normalizedValue);

  return {
    ok: true,
    order
  };
}

function applyShippingAddressTextField({
  order,
  value,
  key,
  maxLength,
  emptyCode
}: {
  order: Order;
  value: string;
  key: "addressLine" | "city" | "postalCode" | "province";
  maxLength: number;
  emptyCode: AdminOrderFulfillmentEditErrorCode;
}): AdminOrderFulfillmentEditResult {
  if (order.delivery.method !== DELIVERY_METHOD.shipping) {
    return getError("immutable_field", `delivery.shippingAddress.${key}`);
  }

  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return getError(emptyCode, `delivery.shippingAddress.${key}`);
  }

  if (normalizedValue.length > maxLength) {
    return getError("field_too_long", `delivery.shippingAddress.${key}`);
  }

  order.delivery.shippingAddress = {
    addressLine: order.delivery.shippingAddress?.addressLine ?? "",
    city: order.delivery.shippingAddress?.city ?? "",
    postalCode: order.delivery.shippingAddress?.postalCode ?? "",
    province: order.delivery.shippingAddress?.province ?? "",
    [key]: normalizedValue
  };

  return {
    ok: true,
    order
  };
}

function validateShippingAddress(order: Order): AdminOrderFulfillmentEditResult {
  if (order.delivery.method !== DELIVERY_METHOD.shipping) {
    return {
      ok: true,
      order
    };
  }

  const address = order.delivery.shippingAddress;

  if (!address?.addressLine) {
    return getError("invalid_address_line", "delivery.shippingAddress.addressLine");
  }

  if (!address.city) {
    return getError("invalid_city", "delivery.shippingAddress.city");
  }

  if (!address.province) {
    return getError("invalid_province", "delivery.shippingAddress.province");
  }

  if (!address.postalCode) {
    return getError("invalid_postal_code", "delivery.shippingAddress.postalCode");
  }

  return {
    ok: true,
    order
  };
}

function isAdminOrderMutableField(
  field: string
): field is AdminOrderMutableField {
  return (ADMIN_ORDER_MUTABLE_FIELDS as readonly string[]).includes(field);
}

function getError(
  code: AdminOrderFulfillmentEditErrorCode,
  field?: string
): Extract<AdminOrderFulfillmentEditResult, { ok: false }> {
  return {
    ok: false,
    error: {
      code,
      message: getErrorMessage(code, field),
      field
    }
  };
}

function getErrorMessage(
  code: AdminOrderFulfillmentEditErrorCode,
  field?: string
): string {
  switch (code) {
    case "empty_update":
      return "No hay datos de cumplimiento para guardar.";
    case "field_too_long":
      return "Uno de los campos supera el largo permitido.";
    case "immutable_field":
      return isAdminOrderMutableField(field ?? "")
        ? "Este campo no se puede editar para este pedido."
        : "Este campo no se puede editar desde administración.";
    case "invalid_address_line":
      return "Ingresá una dirección de entrega.";
    case "invalid_city":
      return "Ingresá la ciudad de entrega.";
    case "invalid_email":
      return "Ingresá un email válido.";
    case "invalid_full_name":
      return "Ingresá el nombre del cliente.";
    case "invalid_phone":
      return "Ingresá un teléfono de contacto.";
    case "invalid_postal_code":
      return "Ingresá el código postal.";
    case "invalid_province":
      return "Ingresá la provincia de entrega.";
    case "not_found":
      return "No encontramos el pedido solicitado.";
    case "order_not_editable":
      return "Los datos operativos se pueden editar cuando el pago está confirmado.";
    case "save_failed":
      return "No pudimos guardar los datos del pedido.";
  }
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalizedValue = normalizeText(value);

  return normalizedValue || null;
}

function normalizeEmail(value: string | null | undefined): string {
  return normalizeText(value).toLocaleLowerCase("es-AR");
}

function cloneOrder(order: Order): Order {
  return {
    ...order,
    contact: {
      ...order.contact
    },
    delivery: {
      ...order.delivery,
      shippingAddress: order.delivery.shippingAddress
        ? {
            ...order.delivery.shippingAddress
          }
        : null
    },
    items: order.items.map((item) => ({
      ...item,
      options: {
        ...item.options
      }
    })),
    paymentPreference: order.paymentPreference
      ? {
          ...order.paymentPreference
        }
      : null
  };
}
