import type { CatalogProductVariantRecord } from "./catalog";

export function getAvailableStock(
  variant: Pick<CatalogProductVariantRecord, "stock">
): number {
  assertNonNegativeInteger(variant.stock, "stock");

  return variant.stock;
}

export function setVariantStock<T extends CatalogProductVariantRecord>(
  variant: T,
  stock: number
): T {
  assertNonNegativeInteger(stock, "stock");

  return {
    ...variant,
    stock
  };
}

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}
