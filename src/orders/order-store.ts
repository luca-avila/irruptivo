import { type Prisma } from "@prisma/client";

import { type Cart } from "../cart/cart";
import { type CatalogProductRecord } from "../catalog/catalog";
import {
  DELIVERY_METHOD_LABEL,
  ORDER_STATUSES,
  type DeliveryMethodLabel,
  type OrderStatus
} from "../domain/rules";
import { getDate } from "../shared/date-utils";
import {
  isPrismaKnownError,
  isRecordNotFoundError,
  isUniqueConstraintError
} from "../shared/prisma-utils";
import { prisma, type PrismaClient } from "../db/client";
import {
  createPendingOrderFromCheckout,
  type Order,
  type PendingOrder,
  type PendingOrderCheckoutInput,
  type PendingOrderCreationResult,
  type PendingOrderPaymentPreference
} from "./order-creation";

export type CreatePendingOrderInStoreInput = {
  idempotencyKey: string;
  cart: Cart;
  checkout: PendingOrderCheckoutInput;
  products: readonly CatalogProductRecord[];
  orderId?: string;
  orderNumber?: string;
  guestAccessToken?: string;
  now?: Date | string;
};

export type PendingOrderStoreCreationResult =
  | (Extract<PendingOrderCreationResult, { status: "created" }> & {
      isDuplicate: boolean;
    })
  | Exclude<PendingOrderCreationResult, { status: "created" }>;

export type OrderStoreSnapshot = {
  orders: Order[];
};

export type PaymentReturnOrderLookupInput = {
  orderId: string | null | undefined;
  guestAccessToken: string | null | undefined;
};

export type UpdateOrderStatusInStoreInput = {
  orderId: string;
  status: OrderStatus;
  reason?: string;
  actor?: string;
};

export type UpdateOrderInStoreInput = Order;

export type OrderRecordWithItems = Prisma.OrderGetPayload<{
  include: {
    items: true;
  };
}>;

type OrderStorePrismaClient = PrismaClient | Prisma.TransactionClient;

const orderWithItems = {
  items: true
} as const satisfies Prisma.OrderInclude;

export async function createPendingOrderInStore({
  idempotencyKey,
  cart,
  checkout,
  products,
  orderId,
  orderNumber,
  guestAccessToken,
  now
}: CreatePendingOrderInStoreInput): Promise<PendingOrderStoreCreationResult> {
  const normalizedIdempotencyKey = idempotencyKey.trim();

  if (!normalizedIdempotencyKey) {
    throw new RangeError("idempotencyKey must be a non-empty string");
  }

  const existingOrder = await findOrderByIdempotencyKey(normalizedIdempotencyKey);

  if (existingOrder) {
    return {
      status: "created",
      order: cloneOrder(existingOrder as PendingOrder),
      updatedCart: cloneCart(cart),
      isDuplicate: true
    };
  }

  const result = createPendingOrderFromCheckout({
    cart,
    checkout,
    products,
    orderId,
    orderNumber,
    guestAccessToken,
    now
  });

  if (result.status !== "created") {
    return result;
  }

  try {
    const createdOrder = await prisma.$transaction(async (tx) => {
      await tx.order.create({
        data: getOrderCreateInput({
          order: result.order,
          idempotencyKey: normalizedIdempotencyKey
        })
      });

      await tx.orderItem.createMany({
        data: result.order.items.map((item) => ({
          orderId: result.order.id,
          productId: item.productId,
          productName: item.productName,
          productSlug: item.productSlug,
          productArea: item.productArea,
          variantId: item.variantId,
          variantName: item.variantName,
          sku: item.sku,
          optionColor: item.options.color ?? null,
          optionSize: item.options.size ?? null,
          optionFlavor: item.options.flavor ?? null,
          optionWeight: item.options.weight ?? null,
          optionPresentation: item.options.presentation ?? null,
          optionSummary: item.optionSummary,
          quantity: item.quantity,
          unitPriceArs: item.unitPriceArs,
          lineTotalArs: item.lineTotalArs
        }))
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: result.order.id,
          fromStatus: null,
          toStatus: result.order.status,
          reason: "checkout_created",
          actor: "system"
        }
      });

      return findOrderById(result.order.id, tx);
    });

    if (!createdOrder) {
      throw new Error("Order creation transaction did not return the created order.");
    }

    return {
      status: "created",
      order: cloneOrder(createdOrder as PendingOrder),
      updatedCart: cloneCart(result.updatedCart),
      isDuplicate: false
    };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const duplicateOrder = await findOrderByIdempotencyKey(normalizedIdempotencyKey);

    if (!duplicateOrder) {
      throw error;
    }

    return {
      status: "created",
      order: cloneOrder(duplicateOrder as PendingOrder),
      updatedCart: cloneCart(cart),
      isDuplicate: true
    };
  }
}

export async function readOrderStoreSnapshot(): Promise<OrderStoreSnapshot> {
  const orders = await prisma.order.findMany({
    include: orderWithItems,
    orderBy: {
      createdAt: "asc"
    }
  });

  return {
    orders: orders.map(mapOrderRecordToOrder)
  };
}

export async function findOrderByIdInStore(orderId: string): Promise<Order | null> {
  return findOrderById(orderId);
}

export async function findOrderForPaymentReturn({
  orderId,
  guestAccessToken
}: PaymentReturnOrderLookupInput): Promise<Order | null> {
  const normalizedOrderId = orderId?.trim() ?? "";
  const normalizedGuestAccessToken = guestAccessToken?.trim() ?? "";

  if (!normalizedOrderId || !normalizedGuestAccessToken) {
    return null;
  }

  const order = await prisma.order.findFirst({
    where: {
      id: normalizedOrderId,
      guestAccessToken: normalizedGuestAccessToken
    },
    include: orderWithItems
  });

  return order ? cloneOrder(mapOrderRecordToOrder(order)) : null;
}

export async function storePendingOrderPaymentPreference({
  orderId,
  paymentPreference
}: {
  orderId: string;
  paymentPreference: PendingOrderPaymentPreference;
}): Promise<PendingOrder | null> {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return null;
  }

  const order = await prisma.order.update({
    where: {
      id: normalizedOrderId
    },
    data: {
      paymentProvider: paymentPreference.provider,
      paymentPreferenceId: paymentPreference.preferenceId,
      paymentCheckoutUrl: paymentPreference.checkoutUrl,
      paymentInitPoint: paymentPreference.initPoint,
      paymentSandboxInitPoint: paymentPreference.sandboxInitPoint,
      paymentExternalReference: paymentPreference.externalReference,
      paymentCreatedAt: getDate(paymentPreference.createdAt, "payment.createdAt")
    },
    include: orderWithItems
  }).catch((error: unknown) => {
    if (isRecordNotFoundError(error)) {
      return null;
    }

    throw error;
  });

  return order ? cloneOrder(mapOrderRecordToOrder(order) as PendingOrder) : null;
}

export async function updateOrderStatusInStore({
  orderId,
  status,
  reason = getDefaultStatusReason(status),
  actor = "system"
}: UpdateOrderStatusInStoreInput): Promise<Order | null> {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: {
        id: normalizedOrderId
      },
      select: {
        status: true
      }
    });

    if (!existingOrder) {
      return null;
    }

    await tx.order.update({
      where: {
        id: normalizedOrderId
      },
      data: {
        status
      }
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: normalizedOrderId,
        fromStatus: existingOrder.status,
        toStatus: status,
        reason,
        actor
      }
    });

    return findOrderById(normalizedOrderId, tx);
  });
}

export async function updateOrderInStore(
  order: UpdateOrderInStoreInput
): Promise<Order | null> {
  const normalizedOrderId = order.id.trim();

  if (!normalizedOrderId) {
    return null;
  }

  const updatedOrder = await prisma.order.update({
    where: {
      id: normalizedOrderId
    },
    data: {
      contactFullName: order.contact.fullName,
      contactEmail: order.contact.email,
      contactPhone: order.contact.phone,
      deliveryNotes: order.delivery.notes,
      shipAddressLine: order.delivery.shippingAddress?.addressLine ?? null,
      shipCity: order.delivery.shippingAddress?.city ?? null,
      shipProvince: order.delivery.shippingAddress?.province ?? null,
      shipPostalCode: order.delivery.shippingAddress?.postalCode ?? null,
      adminNotes: order.adminNotes ?? null
    },
    include: orderWithItems
  }).catch((error: unknown) => {
    if (isRecordNotFoundError(error)) {
      return null;
    }

    throw error;
  });

  return updatedOrder ? cloneOrder(mapOrderRecordToOrder(updatedOrder)) : null;
}

export async function resetOrderStoreForTests(): Promise<void> {
  await prisma.$transaction([
    prisma.orderStatusHistory.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany()
  ]);
}

export function mapOrderRecordToOrder(record: OrderRecordWithItems): Order {
  return cloneOrder({
    id: record.id,
    orderNumber: record.orderNumber,
    status: toOrderStatus(record.status),
    createdAt: record.createdAt.toISOString(),
    guestAccessToken: record.guestAccessToken,
    contact: {
      fullName: record.contactFullName,
      email: record.contactEmail,
      phone: record.contactPhone
    },
    delivery: {
      method: record.deliveryMethod,
      methodLabel: toDeliveryMethodLabel(record.deliveryMethodLabel),
      shippingAddress: record.shipAddressLine
        ? {
            addressLine: record.shipAddressLine,
            city: record.shipCity ?? "",
            province: record.shipProvince ?? "",
            postalCode: record.shipPostalCode ?? ""
          }
        : null,
      notes: record.deliveryNotes
    },
    adminNotes: record.adminNotes,
    items: record.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      productArea: item.productArea,
      variantId: item.variantId,
      variantName: item.variantName,
      sku: item.sku,
      options: {
        ...(item.optionColor ? { color: item.optionColor } : {}),
        ...(item.optionSize ? { size: item.optionSize } : {}),
        ...(item.optionFlavor ? { flavor: item.optionFlavor } : {}),
        ...(item.optionWeight ? { weight: item.optionWeight } : {}),
        ...(item.optionPresentation
          ? { presentation: item.optionPresentation }
          : {})
      },
      optionSummary: item.optionSummary,
      quantity: item.quantity,
      unitPriceArs: item.unitPriceArs,
      lineTotalArs: item.lineTotalArs
    })),
    subtotalArs: record.subtotalArs,
    deliveryCostArs: record.deliveryCostArs,
    totalArs: record.totalArs,
    paymentPreference: record.paymentProvider
      ? {
          provider: record.paymentProvider,
          preferenceId: record.paymentPreferenceId ?? "",
          checkoutUrl: record.paymentCheckoutUrl ?? "",
          initPoint: record.paymentInitPoint ?? "",
          sandboxInitPoint: record.paymentSandboxInitPoint,
          externalReference: record.paymentExternalReference ?? "",
          createdAt: record.paymentCreatedAt?.toISOString() ?? ""
        }
      : null
  });
}

async function findOrderById(
  orderId: string,
  client: OrderStorePrismaClient = prisma
): Promise<Order | null> {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return null;
  }

  const order = await client.order.findUnique({
    where: {
      id: normalizedOrderId
    },
    include: orderWithItems
  });

  return order ? cloneOrder(mapOrderRecordToOrder(order)) : null;
}

async function findOrderByIdempotencyKey(
  idempotencyKey: string
): Promise<Order | null> {
  const order = await prisma.order.findUnique({
    where: {
      idempotencyKey
    },
    include: orderWithItems
  });

  return order ? cloneOrder(mapOrderRecordToOrder(order)) : null;
}

function getOrderCreateInput({
  order,
  idempotencyKey
}: {
  order: PendingOrder;
  idempotencyKey: string;
}): Prisma.OrderCreateInput {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    guestAccessToken: order.guestAccessToken,
    idempotencyKey,
    status: order.status,
    createdAt: getDate(order.createdAt, "order.createdAt"),
    contactFullName: order.contact.fullName,
    contactEmail: order.contact.email,
    contactPhone: order.contact.phone,
    deliveryMethod: order.delivery.method,
    deliveryMethodLabel: order.delivery.methodLabel,
    deliveryNotes: order.delivery.notes,
    shipAddressLine: order.delivery.shippingAddress?.addressLine ?? null,
    shipCity: order.delivery.shippingAddress?.city ?? null,
    shipProvince: order.delivery.shippingAddress?.province ?? null,
    shipPostalCode: order.delivery.shippingAddress?.postalCode ?? null,
    adminNotes: order.adminNotes ?? null,
    subtotalArs: order.subtotalArs,
    deliveryCostArs: order.deliveryCostArs,
    totalArs: order.totalArs,
    paymentProvider: null,
    paymentPreferenceId: null,
    paymentCheckoutUrl: null,
    paymentInitPoint: null,
    paymentSandboxInitPoint: null,
    paymentExternalReference: null,
    paymentCreatedAt: null
  };
}

function cloneOrder<T extends Order>(order: T): T {
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
      ? { ...order.paymentPreference }
      : null
  } as T;
}

function cloneCart(cart: Cart): Cart {
  return {
    items: cart.items.map((item) => ({
      ...item
    }))
  };
}

function getDefaultStatusReason(status: OrderStatus): string {
  return `status_${status}`;
}

function toOrderStatus(status: string): OrderStatus {
  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    throw new RangeError(`Unknown order status "${status}".`);
  }

  return status as OrderStatus;
}

function toDeliveryMethodLabel(label: string): DeliveryMethodLabel {
  const labels = Object.values(DELIVERY_METHOD_LABEL);

  if (!labels.includes(label as DeliveryMethodLabel)) {
    throw new RangeError(`Unknown delivery method label "${label}".`);
  }

  return label as DeliveryMethodLabel;
}
