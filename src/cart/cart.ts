import {
  assertMoney,
  assertPositiveInteger,
  calculateLineTotal,
  calculateSubtotal
} from "../domain/rules";
import { assertNonEmptyString } from "../shared/string-utils";

export const CART_PRICE_SNAPSHOT_WINDOW_MS = 24 * 60 * 60 * 1000;

export type CartItem = {
  productId: string;
  variantId: string;
  sku: string;
  quantity: number;
  priceSnapshotArs: number;
  priceSnapshotAt: string;
};

export type Cart = {
  items: CartItem[];
};

export type AddCartItemInput = {
  productId: string;
  variantId: string;
  sku: string;
  unitPriceArs: number;
  availableStock: number;
  quantity?: number;
  snapshotAt?: Date | string;
};

export type AddCartItemResult = {
  status: "added" | "stock_limited";
  cart: Cart;
  item: CartItem;
  addedQuantity: number;
};

export type UpdateCartItemQuantityInput = {
  variantId: string;
  quantity: number;
  availableStock: number;
};

export type CartLineTotalInput = {
  unitPriceArs: number;
  quantity: number;
};

export type CartSummary = {
  itemCount: number;
  subtotalArs: number;
  deliveryCostArs: number | null;
  totalArs: number | null;
};

export function addItem(
  cart: Cart,
  {
    productId,
    variantId,
    sku,
    unitPriceArs,
    availableStock,
    quantity = 1,
    snapshotAt
  }: AddCartItemInput
): AddCartItemResult {
  assertNonEmptyString(productId, "productId");
  assertNonEmptyString(variantId, "variantId");
  assertNonEmptyString(sku, "sku");
  assertPositiveInteger(quantity, "quantity");
  assertPositiveInteger(availableStock, "availableStock");
  assertMoney(unitPriceArs, "unitPriceArs");

  const snapshotTimestamp = getSnapshotTimestamp(snapshotAt);
  const existingItem = cart.items.find((item) => item.variantId === variantId);
  const existingQuantity = existingItem
    ? Math.min(existingItem.quantity, availableStock)
    : 0;
  const nextQuantity = Math.min(existingQuantity + quantity, availableStock);
  const addedQuantity = nextQuantity - existingQuantity;
  const status = addedQuantity === quantity ? "added" : "stock_limited";
  const nextItem: CartItem =
    existingItem && addedQuantity === 0 && existingItem.quantity <= availableStock
      ? existingItem
      : {
          productId,
          variantId,
          sku,
          quantity: nextQuantity,
          priceSnapshotArs: unitPriceArs,
          priceSnapshotAt: snapshotTimestamp
        };

  const nextItems = existingItem
    ? cart.items.map((item) => (item.variantId === variantId ? nextItem : item))
    : [...cart.items, nextItem];

  return {
    status,
    cart: {
      items: nextItems
    },
    item: nextItem,
    addedQuantity
  };
}

export function updateQuantity(
  cart: Cart,
  { variantId, quantity, availableStock }: UpdateCartItemQuantityInput
): Cart {
  assertNonEmptyString(variantId, "variantId");
  assertPositiveInteger(quantity, "quantity");
  assertPositiveInteger(availableStock, "availableStock");

  return {
    items: cart.items.map((item) =>
      item.variantId === variantId
        ? {
            ...item,
            quantity: Math.min(quantity, availableStock)
          }
        : item
    )
  };
}

export function removeItem(cart: Cart, variantId: string): Cart {
  assertNonEmptyString(variantId, "variantId");

  return {
    items: cart.items.filter((item) => item.variantId !== variantId)
  };
}

export function getCartCount(cart: Cart): number {
  return cart.items.reduce((count, item) => count + item.quantity, 0);
}

export function getLineTotal(line: CartLineTotalInput): number {
  return calculateLineTotal(line);
}

export function calculateCartSubtotal(
  lines: readonly CartLineTotalInput[]
): number {
  return calculateSubtotal(lines.map(calculateLineTotal));
}

export function getCartSummary(
  lines: readonly CartLineTotalInput[],
  deliveryCostArs: number | null = null
): CartSummary {
  const itemCount = lines.reduce((count, line, index) => {
    assertPositiveInteger(line.quantity, `lines[${index}].quantity`);
    return count + line.quantity;
  }, 0);
  const subtotalArs = calculateCartSubtotal(lines);

  if (deliveryCostArs === null) {
    return {
      itemCount,
      subtotalArs,
      deliveryCostArs: null,
      totalArs: null
    };
  }

  assertMoney(deliveryCostArs, "deliveryCostArs");

  return {
    itemCount,
    subtotalArs,
    deliveryCostArs,
    totalArs: subtotalArs + deliveryCostArs
  };
}

export function serializeCart(cart: Cart): string {
  return JSON.stringify({
    items: cart.items.map((item) => ({ ...item }))
  });
}

export function hydrateCart(rawCart: string | null | undefined): Cart {
  if (!rawCart) {
    return { items: [] };
  }

  try {
    const parsedCart: unknown = JSON.parse(rawCart);
    const rawItems = getRawCartItems(parsedCart);

    return {
      items: rawItems.flatMap((item) => {
        const normalizedItem = normalizeCartItem(item);
        return normalizedItem ? [normalizedItem] : [];
      })
    };
  } catch {
    return { items: [] };
  }
}

function getRawCartItems(parsedCart: unknown): unknown[] {
  if (Array.isArray(parsedCart)) {
    return parsedCart;
  }

  if (
    parsedCart &&
    typeof parsedCart === "object" &&
    "items" in parsedCart &&
    Array.isArray(parsedCart.items)
  ) {
    return parsedCart.items;
  }

  return [];
}

function normalizeCartItem(item: unknown): CartItem | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const productId = getObjectString(item, "productId");
  const variantId = getObjectString(item, "variantId");
  const sku = getObjectString(item, "sku");
  const quantity = getObjectInteger(item, "quantity", { minimum: 1 });
  const priceSnapshotArs = getObjectInteger(item, "priceSnapshotArs", {
    minimum: 0
  });
  const priceSnapshotAt = getObjectString(item, "priceSnapshotAt");

  if (
    !productId ||
    !variantId ||
    !sku ||
    !quantity ||
    priceSnapshotArs === null ||
    !priceSnapshotAt ||
    Number.isNaN(Date.parse(priceSnapshotAt))
  ) {
    return null;
  }

  return {
    productId,
    variantId,
    sku,
    quantity,
    priceSnapshotArs,
    priceSnapshotAt
  };
}

function getObjectString(item: object, key: keyof CartItem): string | null {
  const value = (item as Record<string, unknown>)[key];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getObjectInteger(
  item: object,
  key: keyof CartItem,
  { minimum }: { minimum: number }
): number | null {
  const value = (item as Record<string, unknown>)[key];

  return typeof value === "number" && Number.isInteger(value) && value >= minimum
    ? value
    : null;
}

function getSnapshotTimestamp(snapshotAt: Date | string | undefined): string {
  if (snapshotAt === undefined) {
    return new Date().toISOString();
  }

  const timestamp =
    typeof snapshotAt === "string" ? new Date(snapshotAt) : snapshotAt;

  if (Number.isNaN(timestamp.getTime())) {
    throw new RangeError("snapshotAt must be a valid date");
  }

  return timestamp.toISOString();
}
