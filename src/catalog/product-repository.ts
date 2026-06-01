import { type Prisma } from "@prisma/client";

import { prisma } from "../db/client";
import type {
  CatalogProductImageRecord,
  CatalogProductImageRenditionsRecord,
  CatalogProductRecord,
  CatalogProductVariantRecord,
  VariantOptionValues
} from "./catalog";

export type CatalogProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  area: CatalogProductRecord["area"];
  status: CatalogProductRecord["status"];
  basePriceArs: number;
  clothingSubcategory: string | null;
  supplementType: string | null;
  variants: CatalogProductVariantRow[];
  images: CatalogProductImageRow[];
};

type CatalogProductVariantRow = {
  id: string;
  sku: string;
  name: string;
  stock: number;
  position: number;
  priceOverrideArs: number | null;
  optionColor: string | null;
  optionSize: string | null;
  optionFlavor: string | null;
  optionWeight: string | null;
  optionPresentation: string | null;
};

type CatalogProductImageRow = {
  id: string;
  path: string;
  alt: string;
  sortOrder: number;
  width: number | null;
  height: number | null;
  renditions: Prisma.JsonValue | null;
  associatedColor: string | null;
  variantId: string | null;
  deletedAt: Date | null;
};

export async function loadCatalogProducts(): Promise<CatalogProductRecord[]> {
  const products = await prisma.product.findMany({
    include: {
      variants: {
        orderBy: [
          {
            position: "asc"
          },
          {
            id: "asc"
          }
        ]
      },
      images: {
        orderBy: [
          {
            sortOrder: "asc"
          },
          {
            id: "asc"
          }
        ]
      }
    },
    orderBy: [
      {
        createdAt: "asc"
      },
      {
        id: "asc"
      }
    ]
  });

  return products.map(mapProductRowToRecord);
}

export function mapProductRowToRecord(
  row: CatalogProductRow
): CatalogProductRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    area: row.area,
    status: row.status,
    basePriceArs: row.basePriceArs,
    clothingSubcategory: row.clothingSubcategory,
    supplementType: row.supplementType,
    variants: [...row.variants]
      .sort((first, second) => first.position - second.position || first.id.localeCompare(second.id))
      .map(mapVariantRowToRecord),
    images: [...row.images]
      .sort((first, second) => first.sortOrder - second.sortOrder || first.id.localeCompare(second.id))
      .map(mapImageRowToRecord)
  };
}

function mapVariantRowToRecord(
  row: CatalogProductVariantRow
): CatalogProductVariantRecord {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    stock: row.stock,
    priceOverrideArs: row.priceOverrideArs,
    options: getVariantOptions(row)
  };
}

function mapImageRowToRecord(row: CatalogProductImageRow): CatalogProductImageRecord {
  return {
    id: row.id,
    path: row.path,
    alt: row.alt,
    sortOrder: row.sortOrder,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    renditions: mapImageRenditions(row.renditions),
    associatedColor: row.associatedColor,
    variantId: row.variantId,
    deletedAt: row.deletedAt?.toISOString() ?? null
  };
}

function getVariantOptions(row: CatalogProductVariantRow): VariantOptionValues {
  const options: VariantOptionValues = {};

  if (row.optionColor) {
    options.color = row.optionColor;
  }

  if (row.optionSize) {
    options.size = row.optionSize;
  }

  if (row.optionFlavor) {
    options.flavor = row.optionFlavor;
  }

  if (row.optionWeight) {
    options.weight = row.optionWeight;
  }

  if (row.optionPresentation) {
    options.presentation = row.optionPresentation;
  }

  return options;
}

function mapImageRenditions(
  renditions: Prisma.JsonValue | null
): CatalogProductImageRenditionsRecord | undefined {
  if (!renditions || typeof renditions !== "object" || Array.isArray(renditions)) {
    return undefined;
  }

  return renditions as unknown as CatalogProductImageRenditionsRecord;
}
