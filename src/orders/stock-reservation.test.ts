import { describe, expect, it } from "vitest";

import {
  getAvailableStock,
  reserveStockForOrder,
  type StockReservationRecord
} from "./stock-reservation";

const reservedAt = "2026-05-30T12:00:00.000Z";

describe("stock reservation module", () => {
  it("calculates available stock after existing reservations", () => {
    expect(
      getAvailableStock(
        { id: "tee-black-s", stock: 4 },
        [
          {
            orderId: "order-001",
            variantId: "tee-black-s",
            quantity: 2,
            reservedAt
          },
          {
            orderId: "order-002",
            variantId: "creatina-300g",
            quantity: 1,
            reservedAt
          }
        ]
      )
    ).toBe(2);
  });

  it("reserves stock for every ordered variant without mutating existing reservations", () => {
    const existingReservations: StockReservationRecord[] = [
      {
        orderId: "order-001",
        variantId: "tee-black-s",
        quantity: 1,
        reservedAt
      }
    ];

    const result = reserveStockForOrder({
      orderId: "order-002",
      items: [
        {
          variantId: "tee-black-s",
          quantity: 2
        },
        {
          variantId: "creatina-300g",
          quantity: 1
        }
      ],
      variants: [
        {
          id: "tee-black-s",
          stock: 4
        },
        {
          id: "creatina-300g",
          stock: 5
        }
      ],
      existingReservations,
      reservedAt
    });

    expect(result).toEqual({
      status: "reserved",
      reservations: [
        {
          orderId: "order-002",
          variantId: "tee-black-s",
          quantity: 2,
          reservedAt
        },
        {
          orderId: "order-002",
          variantId: "creatina-300g",
          quantity: 1,
          reservedAt
        }
      ]
    });
    expect(existingReservations).toHaveLength(1);
  });

  it("blocks insufficient stock without returning partial reservations", () => {
    const result = reserveStockForOrder({
      orderId: "order-002",
      items: [
        {
          variantId: "tee-black-s",
          quantity: 3
        },
        {
          variantId: "creatina-300g",
          quantity: 1
        }
      ],
      variants: [
        {
          id: "tee-black-s",
          stock: 4
        },
        {
          id: "creatina-300g",
          stock: 5
        }
      ],
      existingReservations: [
        {
          orderId: "order-001",
          variantId: "tee-black-s",
          quantity: 2,
          reservedAt
        }
      ],
      reservedAt
    });

    expect(result).toEqual({
      status: "insufficient_stock",
      unavailableItems: [
        {
          variantId: "tee-black-s",
          requestedQuantity: 3,
          availableStock: 2
        }
      ]
    });
  });
});
