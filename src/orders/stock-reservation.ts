export type ReservableStockVariant = {
  id: string;
  stock: number;
};

export type StockReservationItem = {
  variantId: string;
  quantity: number;
};

export type StockReservationRecord = StockReservationItem & {
  orderId: string;
  reservedAt: string;
};

export type StockUnavailableItem = {
  variantId: string;
  requestedQuantity: number;
  availableStock: number;
};

export type StockReservationResult =
  | {
      status: "reserved";
      reservations: StockReservationRecord[];
    }
  | {
      status: "insufficient_stock";
      unavailableItems: StockUnavailableItem[];
    };

export type StockReservationReleaseResult = {
  status: "released" | "already_released";
  releasedReservations: StockReservationRecord[];
  remainingReservations: StockReservationRecord[];
};

export type ReserveStockForOrderInput = {
  orderId: string;
  items: readonly StockReservationItem[];
  variants: readonly ReservableStockVariant[];
  existingReservations?: readonly StockReservationRecord[];
  reservedAt?: Date | string;
};

export type ReleaseReservedStockForOrderInput = {
  orderId: string;
  reservations: readonly StockReservationRecord[];
};

export function getAvailableStock(
  variant: ReservableStockVariant,
  reservations: readonly StockReservationRecord[] = []
): number {
  assertNonEmptyString(variant.id, "variant.id");
  assertNonNegativeInteger(variant.stock, "variant.stock");

  const reservedStock = reservations.reduce((total, reservation, index) => {
    assertReservationRecord(reservation, index);

    return reservation.variantId === variant.id
      ? total + reservation.quantity
      : total;
  }, 0);

  return Math.max(0, variant.stock - reservedStock);
}

export function reserveStockForOrder({
  orderId,
  items,
  variants,
  existingReservations = [],
  reservedAt
}: ReserveStockForOrderInput): StockReservationResult {
  assertNonEmptyString(orderId, "orderId");

  const reservationTimestamp = getReservationTimestamp(reservedAt);
  const variantsById = new Map(
    variants.map((variant) => {
      assertNonEmptyString(variant.id, "variant.id");
      assertNonNegativeInteger(variant.stock, `${variant.id}.stock`);

      return [variant.id, variant];
    })
  );
  const requestedQuantities = aggregateRequestedQuantities(items);
  const unavailableItems: StockUnavailableItem[] = [];

  for (const [variantId, requestedQuantity] of requestedQuantities) {
    const variant = variantsById.get(variantId);
    const availableStock = variant
      ? getAvailableStock(variant, existingReservations)
      : 0;

    if (requestedQuantity > availableStock) {
      unavailableItems.push({
        variantId,
        requestedQuantity,
        availableStock
      });
    }
  }

  if (unavailableItems.length > 0) {
    return {
      status: "insufficient_stock",
      unavailableItems
    };
  }

  return {
    status: "reserved",
    reservations: [...requestedQuantities].map(([variantId, quantity]) => ({
      orderId,
      variantId,
      quantity,
      reservedAt: reservationTimestamp
    }))
  };
}

export function releaseReservedStockForOrder({
  orderId,
  reservations
}: ReleaseReservedStockForOrderInput): StockReservationReleaseResult {
  assertNonEmptyString(orderId, "orderId");

  const releasedReservations: StockReservationRecord[] = [];
  const remainingReservations: StockReservationRecord[] = [];

  for (const [index, reservation] of reservations.entries()) {
    assertReservationRecord(reservation, index);

    const clonedReservation = {
      ...reservation
    };

    if (reservation.orderId === orderId) {
      releasedReservations.push(clonedReservation);
    } else {
      remainingReservations.push(clonedReservation);
    }
  }

  return {
    status:
      releasedReservations.length > 0 ? "released" : "already_released",
    releasedReservations,
    remainingReservations
  };
}

function aggregateRequestedQuantities(
  items: readonly StockReservationItem[]
): Map<string, number> {
  const quantities = new Map<string, number>();

  for (const [index, item] of items.entries()) {
    assertNonEmptyString(item.variantId, `items[${index}].variantId`);
    assertPositiveInteger(item.quantity, `items[${index}].quantity`);

    quantities.set(
      item.variantId,
      (quantities.get(item.variantId) ?? 0) + item.quantity
    );
  }

  return quantities;
}

function assertReservationRecord(
  reservation: StockReservationRecord,
  index: number
): void {
  assertNonEmptyString(reservation.orderId, `reservations[${index}].orderId`);
  assertNonEmptyString(reservation.variantId, `reservations[${index}].variantId`);
  assertPositiveInteger(reservation.quantity, `reservations[${index}].quantity`);

  if (Number.isNaN(Date.parse(reservation.reservedAt))) {
    throw new RangeError(`reservations[${index}].reservedAt must be a valid date`);
  }
}

function getReservationTimestamp(value: Date | string | undefined): string {
  if (value === undefined) {
    return new Date().toISOString();
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    throw new RangeError("reservedAt must be a valid date");
  }

  return date.toISOString();
}

function assertNonEmptyString(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new RangeError(`${name} must be a non-empty string`);
  }
}

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}
