import { describe, expect, it } from "vitest";

import {
  addItem,
  calculateCartSubtotal,
  getCartCount,
  getCartSummary,
  getLineTotal,
  hydrateCart,
  removeItem,
  serializeCart,
  updateQuantity,
  type Cart
} from "./cart";

const emptyCart: Cart = {
  items: []
};

describe("guest cart", () => {
  it("adds a valid variant with quantity 1 and a price snapshot", () => {
    const result = addItem(emptyCart, {
      productId: "training-tee",
      variantId: "tee-black-s",
      sku: "TEE-BLK-S",
      unitPriceArs: 26000,
      availableStock: 4,
      snapshotAt: "2026-05-30T12:00:00.000Z"
    });

    expect(result.status).toBe("added");
    expect(result.addedQuantity).toBe(1);
    expect(result.cart.items).toEqual([
      {
        productId: "training-tee",
        variantId: "tee-black-s",
        sku: "TEE-BLK-S",
        quantity: 1,
        priceSnapshotArs: 26000,
        priceSnapshotAt: "2026-05-30T12:00:00.000Z"
      }
    ]);
  });

  it("merges duplicate variant additions and refreshes the price snapshot", () => {
    const cart = addItem(emptyCart, {
      productId: "training-tee",
      variantId: "tee-black-s",
      sku: "TEE-BLK-S",
      unitPriceArs: 26000,
      availableStock: 4,
      snapshotAt: "2026-05-30T12:00:00.000Z"
    }).cart;

    const result = addItem(cart, {
      productId: "training-tee",
      variantId: "tee-black-s",
      sku: "TEE-BLK-S",
      unitPriceArs: 27500,
      availableStock: 4,
      snapshotAt: "2026-05-30T13:00:00.000Z"
    });

    expect(result.status).toBe("added");
    expect(result.cart.items).toHaveLength(1);
    expect(result.cart.items[0]).toMatchObject({
      variantId: "tee-black-s",
      quantity: 2,
      priceSnapshotArs: 27500,
      priceSnapshotAt: "2026-05-30T13:00:00.000Z"
    });
  });

  it("caps duplicate additions at the available stock", () => {
    const cart = {
      items: [
        {
          productId: "training-tee",
          variantId: "tee-black-m",
          sku: "TEE-BLK-M",
          quantity: 2,
          priceSnapshotArs: 26000,
          priceSnapshotAt: "2026-05-30T12:00:00.000Z"
        }
      ]
    } satisfies Cart;

    const result = addItem(cart, {
      productId: "training-tee",
      variantId: "tee-black-m",
      sku: "TEE-BLK-M",
      unitPriceArs: 26000,
      availableStock: 2,
      snapshotAt: "2026-05-30T13:00:00.000Z"
    });

    expect(result.status).toBe("stock_limited");
    expect(result.addedQuantity).toBe(0);
    expect(result.cart.items[0]).toMatchObject({
      variantId: "tee-black-m",
      quantity: 2,
      priceSnapshotArs: 26000,
      priceSnapshotAt: "2026-05-30T12:00:00.000Z"
    });
  });

  it("counts item quantities in the hydrated cart", () => {
    const cart = hydrateCart(
      JSON.stringify({
        items: [
          {
            productId: "training-tee",
            variantId: "tee-black-s",
            sku: "TEE-BLK-S",
            quantity: 2,
            priceSnapshotArs: 26000,
            priceSnapshotAt: "2026-05-30T12:00:00.000Z"
          },
          {
            productId: "essential-short",
            variantId: "short-black-l",
            sku: "SHORT-BLK-L",
            quantity: 1,
            priceSnapshotArs: 32000,
            priceSnapshotAt: "2026-05-30T12:00:00.000Z"
          }
        ]
      })
    );

    expect(getCartCount(cart)).toBe(3);
  });

  it("serializes and hydrates the public localStorage cart shape", () => {
    const cart = addItem(emptyCart, {
      productId: "creatina",
      variantId: "creatina-300g",
      sku: "CREATINA-300G",
      unitPriceArs: 29900,
      availableStock: 5,
      snapshotAt: "2026-05-30T12:00:00.000Z"
    }).cart;

    expect(hydrateCart(serializeCart(cart))).toEqual(cart);
  });

  it("drops malformed localStorage items instead of trusting them", () => {
    const cart = hydrateCart(
      JSON.stringify({
        items: [
          {
            variantId: "tee-black-s",
            quantity: 2
          },
          {
            productId: "training-tee",
            variantId: "tee-black-s",
            sku: "TEE-BLK-S",
            quantity: 1,
            priceSnapshotArs: 26000,
            priceSnapshotAt: "2026-05-30T12:00:00.000Z"
          }
        ]
      })
    );

    expect(cart.items).toHaveLength(1);
    expect(getCartCount(hydrateCart("not-json"))).toBe(0);
  });

  it("updates quantity and recalculates line total and subtotal", () => {
    const cart = getCartWithTwoItems();

    const updatedCart = updateQuantity(cart, {
      variantId: "tee-black-s",
      quantity: 2,
      availableStock: 4
    });

    expect(updatedCart.items[0]).toMatchObject({
      variantId: "tee-black-s",
      quantity: 2
    });
    expect(getLineTotal({ unitPriceArs: 26000, quantity: 2 })).toBe(52000);
    expect(calculateCartSubtotal(getSnapshotCartLines(updatedCart))).toBe(84000);
  });

  it("caps quantity updates at available stock", () => {
    const cart = getCartWithTwoItems();

    const updatedCart = updateQuantity(cart, {
      variantId: "tee-black-s",
      quantity: 5,
      availableStock: 2
    });

    expect(updatedCart.items[0]).toMatchObject({
      variantId: "tee-black-s",
      quantity: 2
    });
    expect(calculateCartSubtotal(getSnapshotCartLines(updatedCart))).toBe(84000);
  });

  it("removes an item and updates count and subtotal", () => {
    const cart = getCartWithTwoItems();

    const updatedCart = removeItem(cart, "tee-black-s");

    expect(updatedCart.items).toHaveLength(1);
    expect(getCartCount(updatedCart)).toBe(1);
    expect(calculateCartSubtotal(getSnapshotCartLines(updatedCart))).toBe(32000);
  });

  it("returns zero subtotal for an empty cart summary", () => {
    expect(getCartSummary([])).toEqual({
      itemCount: 0,
      subtotalArs: 0,
      deliveryCostArs: null,
      totalArs: null
    });
  });

  it("does not force a shipping or pickup cost before delivery method selection", () => {
    expect(getCartSummary(getSnapshotCartLines(getCartWithTwoItems()))).toEqual({
      itemCount: 2,
      subtotalArs: 58000,
      deliveryCostArs: null,
      totalArs: null
    });
  });
});

function getCartWithTwoItems(): Cart {
  return {
    items: [
      {
        productId: "training-tee",
        variantId: "tee-black-s",
        sku: "TEE-BLK-S",
        quantity: 1,
        priceSnapshotArs: 26000,
        priceSnapshotAt: "2026-05-30T12:00:00.000Z"
      },
      {
        productId: "essential-short",
        variantId: "short-black-l",
        sku: "SHORT-BLK-L",
        quantity: 1,
        priceSnapshotArs: 32000,
        priceSnapshotAt: "2026-05-30T12:00:00.000Z"
      }
    ]
  };
}

function getSnapshotCartLines(cart: Cart) {
  return cart.items.map((item) => ({
    unitPriceArs: item.priceSnapshotArs,
    quantity: item.quantity
  }));
}
