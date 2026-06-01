import { describe, expect, it } from "vitest";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductRecord
} from "../catalog/catalog";
import { type Cart, type CartItem } from "./cart";
import {
  classifyCartIssue,
  refreshExpiredPriceSnapshot,
  validateCart
} from "./cart-validation";

const now = new Date("2026-05-30T12:00:00.000Z");

const products = [
  {
    id: "training-tee",
    slug: "training-tee-negra",
    name: "Training Tee Negra",
    description: "Remera tecnica para entrenar.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 26000,
    clothingSubcategory: "Remeras",
    variants: [
      {
        id: "tee-black-s",
        sku: "TEE-BLK-S",
        name: "Negro / S",
        stock: 4,
        options: {
          color: "Negro",
          size: "S"
        }
      },
      {
        id: "tee-black-m",
        sku: "TEE-BLK-M",
        name: "Negro / M",
        stock: 0,
        options: {
          color: "Negro",
          size: "M"
        }
      }
    ],
    images: []
  },
  {
    id: "archived-tee",
    slug: "remera-archivada",
    name: "Remera Archivada",
    description: "Producto pausado.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.inactive,
    basePriceArs: 24000,
    clothingSubcategory: "Remeras",
    variants: [
      {
        id: "archived-tee-s",
        sku: "TEE-OLD-S",
        name: "Blanco / S",
        stock: 6,
        options: {
          color: "Blanco",
          size: "S"
        }
      }
    ],
    images: []
  }
] satisfies CatalogProductRecord[];

describe("cart invalid state validation", () => {
  it("blocks checkout for inactive products with an item-level issue", () => {
    const cart = getCart([
      {
        productId: "archived-tee",
        variantId: "archived-tee-s",
        sku: "TEE-OLD-S"
      }
    ]);

    const result = validateCart({ cart, products, now });

    expect(result.canCheckout).toBe(false);
    expect(result.items[0]).toMatchObject({
      status: "blocked",
      isCheckoutEligible: false,
      issues: [
        {
          code: "product_inactive",
          severity: "blocking",
          message: "Este producto ya no está disponible. Quitalo del carrito para seguir."
        }
      ]
    });
    expect(result.updatedCart).toEqual(cart);
  });

  it("blocks checkout for missing variants with an item-level issue", () => {
    const result = validateCart({
      cart: getCart([
        {
          variantId: "tee-black-xl",
          sku: "TEE-BLK-XL"
        }
      ]),
      products,
      now
    });

    expect(result.canCheckout).toBe(false);
    expect(result.items[0]).toMatchObject({
      status: "blocked",
      issues: [
        {
          code: "variant_unavailable",
          severity: "blocking",
          message: "Esta variante ya no está disponible. Quitala del carrito para seguir."
        }
      ]
    });
  });

  it("blocks checkout for out-of-stock variants", () => {
    const result = validateCart({
      cart: getCart([
        {
          variantId: "tee-black-m",
          sku: "TEE-BLK-M"
        }
      ]),
      products,
      now
    });

    expect(result.canCheckout).toBe(false);
    expect(result.items[0]).toMatchObject({
      status: "blocked",
      issues: [
        {
          code: "out_of_stock",
          severity: "blocking"
        }
      ]
    });
  });

  it("caps insufficient stock and keeps checkout eligible after correction", () => {
    const result = validateCart({
      cart: getCart([
        {
          quantity: 7
        }
      ]),
      products,
      now
    });

    expect(result.canCheckout).toBe(true);
    expect(result.items[0]).toMatchObject({
      status: "capped",
      quantity: 4,
      isCheckoutEligible: true,
      issues: [
        {
          code: "insufficient_stock",
          severity: "notice",
          message: "Ajustamos la cantidad al stock disponible."
        }
      ]
    });
    expect(result.updatedCart.items[0]).toMatchObject({
      variantId: "tee-black-s",
      quantity: 4
    });
  });

  it("refreshes expired price snapshots to the current server price without a notice", () => {
    const result = validateCart({
      cart: getCart([
        {
          priceSnapshotArs: 24500,
          priceSnapshotAt: "2026-05-29T11:59:59.999Z"
        }
      ]),
      products,
      now
    });

    expect(result.canCheckout).toBe(true);
    expect(result.items[0]).toMatchObject({
      status: "refreshed",
      unitPriceArs: 26000,
      issues: []
    });
    expect(result.updatedCart.items[0]).toMatchObject({
      priceSnapshotArs: 26000,
      priceSnapshotAt: "2026-05-30T12:00:00.000Z"
    });
  });

  it("honors unexpired price snapshots", () => {
    const cart = getCart([
      {
        priceSnapshotArs: 24500,
        priceSnapshotAt: "2026-05-29T12:00:00.000Z"
      }
    ]);

    const result = validateCart({ cart, products, now });

    expect(result.canCheckout).toBe(true);
    expect(result.items[0]).toMatchObject({
      status: "valid",
      unitPriceArs: 24500,
      issues: []
    });
    expect(result.updatedCart).toEqual(cart);
  });

  it("marks checkout ineligible while any blocking issue remains", () => {
    const result = validateCart({
      cart: getCart([
        {},
        {
          variantId: "tee-black-m",
          sku: "TEE-BLK-M"
        }
      ]),
      products,
      now
    });

    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.status)).toEqual(["valid", "blocked"]);
    expect(result.canCheckout).toBe(false);
  });
});

describe("cart issue classification", () => {
  it("classifies blocking and notice issues with Spanish copy", () => {
    expect(classifyCartIssue("product_inactive")).toMatchObject({
      severity: "blocking",
      message: "Este producto ya no está disponible. Quitalo del carrito para seguir."
    });
    expect(classifyCartIssue("insufficient_stock")).toMatchObject({
      severity: "notice",
      message: "Ajustamos la cantidad al stock disponible."
    });
  });
});

describe("price snapshot refresh", () => {
  it("returns a refreshed cart item only after the 24-hour window expires", () => {
    const cartItem = getCartItem({
      priceSnapshotArs: 24500,
      priceSnapshotAt: "2026-05-29T11:59:59.999Z"
    });

    expect(
      refreshExpiredPriceSnapshot({
        cartItem,
        currentUnitPriceArs: 26000,
        now
      })
    ).toEqual({
      wasRefreshed: true,
      unitPriceArs: 26000,
      cartItem: {
        ...cartItem,
        priceSnapshotArs: 26000,
        priceSnapshotAt: "2026-05-30T12:00:00.000Z"
      }
    });
  });
});

function getCart(overrides: Partial<CartItem>[]): Cart {
  return {
    items: overrides.map(getCartItem)
  };
}

function getCartItem(overrides: Partial<CartItem>): CartItem {
  return {
    productId: "training-tee",
    variantId: "tee-black-s",
    sku: "TEE-BLK-S",
    quantity: 1,
    priceSnapshotArs: 26000,
    priceSnapshotAt: "2026-05-30T11:00:00.000Z",
    ...overrides
  };
}
