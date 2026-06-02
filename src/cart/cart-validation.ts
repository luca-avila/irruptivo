import {
  PRODUCT_STATUS,
  type CatalogProductRecord,
  type CatalogProductVariantRecord
} from "../catalog/catalog";
import { resolveUnitPrice } from "../domain/rules";
import {
  CART_PRICE_SNAPSHOT_WINDOW_MS,
  getLineTotal,
  type Cart,
  type CartItem
} from "./cart";

const CART_ISSUE_CLASSIFICATION = {
  product_unavailable: {
    severity: "blocking",
    message: "Este producto ya no está disponible. Quitalo del carrito para seguir."
  },
  product_inactive: {
    severity: "blocking",
    message: "Este producto ya no está disponible. Quitalo del carrito para seguir."
  },
  variant_unavailable: {
    severity: "blocking",
    message: "Esta variante ya no está disponible. Quitala del carrito para seguir."
  },
  out_of_stock: {
    severity: "blocking",
    message: "Esta variante se quedó sin stock. Quitala del carrito para seguir."
  },
  insufficient_stock: {
    severity: "notice",
    message: "Ajustamos la cantidad al stock disponible."
  }
} as const satisfies Record<
  string,
  {
    severity: CartIssueSeverity;
    message: string;
  }
>;

export type CartIssueCode = keyof typeof CART_ISSUE_CLASSIFICATION;

export type CartIssueSeverity = "blocking" | "notice";

export type CartIssueClassification = {
  code: CartIssueCode;
  severity: CartIssueSeverity;
  message: string;
};

export type CartValidationItemStatus =
  | "valid"
  | "refreshed"
  | "capped"
  | "blocked";

export type CartValidationItem = {
  originalItem: CartItem;
  cartItem: CartItem;
  product: CatalogProductRecord | null;
  variant: CatalogProductVariantRecord | null;
  quantity: number;
  unitPriceArs: number;
  lineTotalArs: number;
  issues: CartIssueClassification[];
  status: CartValidationItemStatus;
  isCheckoutEligible: boolean;
};

export type CartValidationResult = {
  items: CartValidationItem[];
  updatedCart: Cart;
  canCheckout: boolean;
  hasBlockingIssues: boolean;
};

export type CartValidationInput = {
  cart: Cart;
  products: readonly CatalogProductRecord[];
  now?: Date | string;
};

export type PriceSnapshotRefreshInput = {
  cartItem: CartItem;
  currentUnitPriceArs: number;
  now?: Date | string;
};

export type PriceSnapshotRefreshResult = {
  cartItem: CartItem;
  unitPriceArs: number;
  wasRefreshed: boolean;
};

export function validateCart({
  cart,
  products,
  now = new Date()
}: CartValidationInput): CartValidationResult {
  const validationDate = getDate(now, "now");
  const items = cart.items.map((cartItem) =>
    validateCartItem({
      cartItem,
      products,
      now: validationDate
    })
  );
  const hasBlockingIssues = items.some((item) =>
    item.issues.some((issue) => issue.severity === "blocking")
  );

  return {
    items,
    updatedCart: {
      items: items.map((item) => item.cartItem)
    },
    canCheckout: items.length > 0 && !hasBlockingIssues,
    hasBlockingIssues
  };
}

export function refreshExpiredPriceSnapshot({
  cartItem,
  currentUnitPriceArs,
  now = new Date()
}: PriceSnapshotRefreshInput): PriceSnapshotRefreshResult {
  const validationDate = getDate(now, "now");
  const snapshotDate = new Date(cartItem.priceSnapshotAt);
  const snapshotAgeMs = validationDate.getTime() - snapshotDate.getTime();
  const isExpired =
    Number.isNaN(snapshotDate.getTime()) ||
    snapshotAgeMs < 0 ||
    snapshotAgeMs > CART_PRICE_SNAPSHOT_WINDOW_MS;

  if (!isExpired) {
    return {
      cartItem,
      unitPriceArs: cartItem.priceSnapshotArs,
      wasRefreshed: false
    };
  }

  return {
    cartItem: {
      ...cartItem,
      priceSnapshotArs: currentUnitPriceArs,
      priceSnapshotAt: validationDate.toISOString()
    },
    unitPriceArs: currentUnitPriceArs,
    wasRefreshed: true
  };
}

export function classifyCartIssue(
  code: CartIssueCode
): CartIssueClassification {
  return {
    code,
    ...CART_ISSUE_CLASSIFICATION[code]
  };
}

function validateCartItem({
  cartItem,
  products,
  now
}: {
  cartItem: CartItem;
  products: readonly CatalogProductRecord[];
  now: Date;
}): CartValidationItem {
  const product = products.find((candidate) => candidate.id === cartItem.productId);

  if (!product) {
    return getBlockedCartItem({
      cartItem,
      product: null,
      variant: null,
      issueCode: "product_unavailable"
    });
  }

  const variant =
    product.variants.find((candidate) => candidate.id === cartItem.variantId) ??
    null;

  if (product.status !== PRODUCT_STATUS.active) {
    return getBlockedCartItem({
      cartItem,
      product,
      variant,
      issueCode: "product_inactive"
    });
  }

  if (!variant) {
    return getBlockedCartItem({
      cartItem,
      product,
      variant: null,
      issueCode: "variant_unavailable"
    });
  }

  const currentUnitPriceArs = getCurrentUnitPrice(product, variant);

  if (variant.stock <= 0) {
    return getBlockedCartItem({
      cartItem,
      product,
      variant,
      issueCode: "out_of_stock",
      unitPriceArs: currentUnitPriceArs
    });
  }

  const issues = new Array<CartIssueClassification>();
  const priceRefresh = refreshExpiredPriceSnapshot({
    cartItem,
    currentUnitPriceArs,
    now
  });
  let nextCartItem = priceRefresh.cartItem;
  let nextQuantity = cartItem.quantity;

  if (nextQuantity > variant.stock) {
    nextQuantity = variant.stock;
    nextCartItem = {
      ...nextCartItem,
      quantity: nextQuantity
    };
    issues.push(classifyCartIssue("insufficient_stock"));
  }

  return {
    originalItem: cartItem,
    cartItem: nextCartItem,
    product,
    variant,
    quantity: nextQuantity,
    unitPriceArs: priceRefresh.unitPriceArs,
    lineTotalArs: getLineTotal({
      unitPriceArs: priceRefresh.unitPriceArs,
      quantity: nextQuantity
    }),
    issues,
    status: getCartItemStatus(issues, priceRefresh.wasRefreshed),
    isCheckoutEligible: true
  };
}

function getBlockedCartItem({
  cartItem,
  product,
  variant,
  issueCode,
  unitPriceArs = variant && product
    ? getCurrentUnitPrice(product, variant)
    : cartItem.priceSnapshotArs
}: {
  cartItem: CartItem;
  product: CatalogProductRecord | null;
  variant: CatalogProductVariantRecord | null;
  issueCode: CartIssueCode;
  unitPriceArs?: number;
}): CartValidationItem {
  return {
    originalItem: cartItem,
    cartItem,
    product,
    variant,
    quantity: cartItem.quantity,
    unitPriceArs,
    lineTotalArs: getLineTotal({
      unitPriceArs,
      quantity: cartItem.quantity
    }),
    issues: [classifyCartIssue(issueCode)],
    status: "blocked",
    isCheckoutEligible: false
  };
}

function getCartItemStatus(
  issues: readonly CartIssueClassification[],
  wasPriceRefreshed: boolean
): CartValidationItemStatus {
  if (issues.some((issue) => issue.severity === "blocking")) {
    return "blocked";
  }

  if (issues.some((issue) => issue.code === "insufficient_stock")) {
    return "capped";
  }

  if (wasPriceRefreshed) {
    return "refreshed";
  }

  return "valid";
}

function getCurrentUnitPrice(
  product: CatalogProductRecord,
  variant: CatalogProductVariantRecord
): number {
  return resolveUnitPrice({
    productBasePriceArs: product.basePriceArs,
    variantPriceOverrideArs: variant.priceOverrideArs
  });
}

function getDate(value: Date | string, name: string): Date {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`${name} must be a valid date`);
  }

  return date;
}
