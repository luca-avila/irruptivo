import { describe, expect, it } from "vitest";

import {
  DELIVERY_METHOD,
  ORDER_STATUS,
  calculateLineTotal,
  calculateOrderTotal,
  calculateSubtotal,
  getAllowedFulfillmentTransitions,
  getAvailabilityLabel,
  getDeliveryCost,
  resolveUnitPrice
} from "./rules";

describe("MVP domain rules", () => {
  it("exposes the MVP order statuses and delivery methods", () => {
    expect(ORDER_STATUS).toEqual({
      pendingPayment: "pending_payment",
      paid: "paid",
      paymentFailed: "payment_failed",
      expired: "expired",
      preparing: "preparing",
      shipped: "shipped",
      delivered: "delivered",
      readyForPickup: "ready_for_pickup",
      pickedUp: "picked_up"
    });

    expect(DELIVERY_METHOD).toEqual({
      shipping: "shipping",
      pickup: "pickup"
    });
  });

  it("returns fixed integer ARS delivery costs", () => {
    expect(getDeliveryCost(DELIVERY_METHOD.shipping)).toBe(5000);
    expect(getDeliveryCost(DELIVERY_METHOD.pickup)).toBe(0);
  });

  it.each([
    [0, "Sin stock"],
    [1, "Ultimas unidades"],
    [3, "Ultimas unidades"],
    [4, "Disponible"]
  ])("maps %i units to the public availability label", (stock, label) => {
    expect(getAvailabilityLabel(stock)).toBe(label);
  });

  it("uses product base price when the variant has no override", () => {
    expect(
      resolveUnitPrice({
        productBasePriceArs: 28000,
        variantPriceOverrideArs: null
      })
    ).toBe(28000);
  });

  it("uses variant price override before product base price", () => {
    expect(
      resolveUnitPrice({
        productBasePriceArs: 28000,
        variantPriceOverrideArs: 31500
      })
    ).toBe(31500);
  });

  it("calculates line totals, subtotals, and order totals as integer ARS", () => {
    const firstLine = calculateLineTotal({ unitPriceArs: 28000, quantity: 2 });
    const secondLine = calculateLineTotal({ unitPriceArs: 12500, quantity: 1 });
    const subtotal = calculateSubtotal([firstLine, secondLine]);

    expect(firstLine).toBe(56000);
    expect(secondLine).toBe(12500);
    expect(subtotal).toBe(68500);
    expect(
      calculateOrderTotal({
        subtotalArs: subtotal,
        deliveryMethod: DELIVERY_METHOD.shipping
      })
    ).toBe(73500);
    expect(
      calculateOrderTotal({
        subtotalArs: subtotal,
        deliveryMethod: DELIVERY_METHOD.pickup
      })
    ).toBe(68500);
  });

  it("allows only immediate fulfillment transitions for shipping orders", () => {
    expect(
      getAllowedFulfillmentTransitions({
        deliveryMethod: DELIVERY_METHOD.shipping,
        currentStatus: ORDER_STATUS.paid
      })
    ).toEqual([ORDER_STATUS.preparing]);
    expect(
      getAllowedFulfillmentTransitions({
        deliveryMethod: DELIVERY_METHOD.shipping,
        currentStatus: ORDER_STATUS.preparing
      })
    ).toEqual([ORDER_STATUS.shipped]);
    expect(
      getAllowedFulfillmentTransitions({
        deliveryMethod: DELIVERY_METHOD.shipping,
        currentStatus: ORDER_STATUS.shipped
      })
    ).toEqual([ORDER_STATUS.delivered]);
  });

  it("allows only immediate fulfillment transitions for pickup orders", () => {
    expect(
      getAllowedFulfillmentTransitions({
        deliveryMethod: DELIVERY_METHOD.pickup,
        currentStatus: ORDER_STATUS.paid
      })
    ).toEqual([ORDER_STATUS.preparing]);
    expect(
      getAllowedFulfillmentTransitions({
        deliveryMethod: DELIVERY_METHOD.pickup,
        currentStatus: ORDER_STATUS.preparing
      })
    ).toEqual([ORDER_STATUS.readyForPickup]);
    expect(
      getAllowedFulfillmentTransitions({
        deliveryMethod: DELIVERY_METHOD.pickup,
        currentStatus: ORDER_STATUS.readyForPickup
      })
    ).toEqual([ORDER_STATUS.pickedUp]);
  });

  it("rejects backward, skipped, and cross-path fulfillment transitions", () => {
    expect(
      getAllowedFulfillmentTransitions({
        deliveryMethod: DELIVERY_METHOD.shipping,
        currentStatus: ORDER_STATUS.paid
      })
    ).not.toContain(ORDER_STATUS.shipped);
    expect(
      getAllowedFulfillmentTransitions({
        deliveryMethod: DELIVERY_METHOD.shipping,
        currentStatus: ORDER_STATUS.shipped
      })
    ).not.toContain(ORDER_STATUS.preparing);
    expect(
      getAllowedFulfillmentTransitions({
        deliveryMethod: DELIVERY_METHOD.shipping,
        currentStatus: ORDER_STATUS.preparing
      })
    ).not.toContain(ORDER_STATUS.readyForPickup);
    expect(
      getAllowedFulfillmentTransitions({
        deliveryMethod: DELIVERY_METHOD.pickup,
        currentStatus: ORDER_STATUS.preparing
      })
    ).not.toContain(ORDER_STATUS.shipped);
  });
});
