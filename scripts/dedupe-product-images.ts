import { createHash } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import { type ProductImage } from "@prisma/client";

import { prisma } from "../src/db/client";
import {
  getConfiguredMediaRoot,
  resolveProductMediaPath
} from "../src/media/product-media";

type DuplicateGroup = {
  key: string;
  productId: string;
  contentHash: string;
  associatedColor: string | null;
  variantId: string | null;
  rows: HashedProductImage[];
};

type HashedProductImage = {
  row: ProductImage;
  contentHash: string;
  renditionPaths: string[];
  mediaDirectories: string[];
};

type SkippedImage = {
  id: string;
  productId: string;
  reason: string;
};

const RENDITION_USAGES = ["card", "detail", "original"] as const;

async function main() {
  const options = parseOptions(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const mediaRoot = getConfiguredMediaRoot();
  const rows = await prisma.productImage.findMany({
    orderBy: [
      {
        productId: "asc"
      },
      {
        sortOrder: "asc"
      },
      {
        id: "asc"
      }
    ]
  });
  const skippedImages: SkippedImage[] = [];
  const hashedImages: HashedProductImage[] = [];

  for (const row of rows) {
    const result = await hashProductImage(row, mediaRoot);

    if (!result) {
      skippedImages.push({
        id: row.id,
        productId: row.productId,
        reason: "renditions missing or media file unreadable"
      });
      continue;
    }

    hashedImages.push(result);
  }

  const duplicateGroups = findDuplicateGroups(hashedImages);
  const duplicateRows = duplicateGroups.flatMap((group) =>
    getRowsToDelete(group).map((image) => image.row)
  );
  const duplicateIds = new Set(duplicateRows.map((row) => row.id));
  const survivingRows = rows.filter((row) => !duplicateIds.has(row.id));
  const referencedMediaDirectories = getReferencedMediaDirectories(
    survivingRows,
    mediaRoot
  );
  const mediaDirectoriesToDelete = getSafeMediaDirectoriesToDelete(
    duplicateGroups,
    referencedMediaDirectories
  );

  printPlan({
    apply: options.apply,
    mediaRoot,
    scannedCount: rows.length,
    skippedImages,
    duplicateGroups,
    mediaDirectoriesToDelete
  });

  if (!options.apply) {
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (duplicateIds.size > 0) {
      await tx.productImage.deleteMany({
        where: {
          id: {
            in: [...duplicateIds]
          }
        }
      });
    }

    const remainingRows = await tx.productImage.findMany({
      orderBy: [
        {
          productId: "asc"
        },
        {
          sortOrder: "asc"
        },
        {
          id: "asc"
        }
      ]
    });

    for (const [productId, productRows] of groupRowsByProduct(remainingRows)) {
      for (const [index, row] of productRows.entries()) {
        const nextSortOrder = index + 1;

        if (row.sortOrder === nextSortOrder) {
          continue;
        }

        await tx.productImage.update({
          where: {
            id: row.id
          },
          data: {
            sortOrder: nextSortOrder
          }
        });
      }

      console.log(
        `Renormalized sort_order for productId=${productId} count=${productRows.length}`
      );
    }
  });

  for (const directory of mediaDirectoriesToDelete) {
    await rm(directory, { recursive: true, force: true });
    console.log(`Deleted media directory: ${directory}`);
  }

  await prisma.$disconnect();
}

function parseOptions(args: string[]): { apply: boolean; help: boolean } {
  const validArgs = new Set(["--apply", "--dry-run", "--help", "-h"]);
  const unknownArg = args.find((arg) => !validArgs.has(arg));

  if (unknownArg) {
    throw new Error(`Unknown argument: ${unknownArg}`);
  }

  return {
    apply: args.includes("--apply"),
    help: args.includes("--help") || args.includes("-h")
  };
}

function printUsage(): void {
  console.log(`Usage:
  npx tsx scripts/dedupe-product-images.ts [--dry-run]
  npx tsx scripts/dedupe-product-images.ts --apply

Default mode is --dry-run. The duplicate key is:
  productId + sha256(card.webp + detail.webp + original.webp) + associatedColor + variantId`);
}

async function hashProductImage(
  row: ProductImage,
  mediaRoot: string
): Promise<HashedProductImage | null> {
  const renditionPaths = getRenditionPaths(row);

  if (!renditionPaths) {
    return null;
  }

  const hash = createHash("sha256");
  const mediaDirectories = new Set<string>();

  for (const usage of RENDITION_USAGES) {
    const relativePath = renditionPaths[usage];
    const absolutePath = resolveProductMediaPath(mediaRoot, relativePath);

    if (!absolutePath) {
      return null;
    }

    const file = await readFile(absolutePath).catch(() => null);

    if (!file) {
      return null;
    }

    hash.update(usage);
    hash.update("\0");
    hash.update(file);
    hash.update("\0");
    mediaDirectories.add(path.dirname(absolutePath));
  }

  return {
    row,
    contentHash: hash.digest("hex"),
    renditionPaths: RENDITION_USAGES.map((usage) => renditionPaths[usage]),
    mediaDirectories: [...mediaDirectories].sort()
  };
}

function getRenditionPaths(
  row: ProductImage
): Record<(typeof RENDITION_USAGES)[number], string> | null {
  const renditions = row.renditions;

  if (!renditions || typeof renditions !== "object" || Array.isArray(renditions)) {
    return null;
  }

  const paths: Partial<Record<(typeof RENDITION_USAGES)[number], string>> = {};

  for (const usage of RENDITION_USAGES) {
    const rendition = (renditions as Record<string, unknown>)[usage];

    if (!rendition || typeof rendition !== "object" || Array.isArray(rendition)) {
      return null;
    }

    const relativePath = (rendition as Record<string, unknown>).path;

    if (typeof relativePath !== "string" || relativePath.length === 0) {
      return null;
    }

    paths[usage] = relativePath;
  }

  if (!paths.card || !paths.detail || !paths.original) {
    return null;
  }

  return {
    card: paths.card,
    detail: paths.detail,
    original: paths.original
  };
}

function findDuplicateGroups(
  images: readonly HashedProductImage[]
): DuplicateGroup[] {
  const groupedImages = new Map<string, DuplicateGroup>();

  for (const image of images) {
    const key = getDuplicateKey(image.row, image.contentHash);
    const existingGroup = groupedImages.get(key);

    if (existingGroup) {
      existingGroup.rows.push(image);
      continue;
    }

    groupedImages.set(key, {
      key,
      productId: image.row.productId,
      contentHash: image.contentHash,
      associatedColor: image.row.associatedColor,
      variantId: image.row.variantId,
      rows: [image]
    });
  }

  return [...groupedImages.values()]
    .filter((group) => group.rows.length > 1)
    .map((group) => ({
      ...group,
      rows: [...group.rows].sort(compareImagesForKeep)
    }));
}

function getDuplicateKey(row: ProductImage, contentHash: string): string {
  return [
    row.productId,
    contentHash,
    row.associatedColor ?? "",
    row.variantId ?? ""
  ].join("\0");
}

function compareImagesForKeep(
  first: HashedProductImage,
  second: HashedProductImage
): number {
  return first.row.sortOrder - second.row.sortOrder || first.row.id.localeCompare(second.row.id);
}

function getRowsToDelete(group: DuplicateGroup): HashedProductImage[] {
  return group.rows.slice(1);
}

function getReferencedMediaDirectories(
  rows: readonly ProductImage[],
  mediaRoot: string
): Set<string> {
  const referencedDirectories = new Set<string>();

  for (const row of rows) {
    const renditionPaths = getRenditionPaths(row);

    if (!renditionPaths) {
      continue;
    }

    for (const relativePath of Object.values(renditionPaths)) {
      const absolutePath = resolveProductMediaPath(mediaRoot, relativePath);

      if (absolutePath) {
        referencedDirectories.add(path.dirname(absolutePath));
      }
    }
  }

  return referencedDirectories;
}

function getSafeMediaDirectoriesToDelete(
  duplicateGroups: readonly DuplicateGroup[],
  referencedMediaDirectories: ReadonlySet<string>
): string[] {
  const directories = new Set<string>();

  for (const group of duplicateGroups) {
    for (const image of getRowsToDelete(group)) {
      for (const directory of image.mediaDirectories) {
        if (!referencedMediaDirectories.has(directory)) {
          directories.add(directory);
        }
      }
    }
  }

  return [...directories].sort();
}

function printPlan({
  apply,
  mediaRoot,
  scannedCount,
  skippedImages,
  duplicateGroups,
  mediaDirectoriesToDelete
}: {
  apply: boolean;
  mediaRoot: string;
  scannedCount: number;
  skippedImages: readonly SkippedImage[];
  duplicateGroups: readonly DuplicateGroup[];
  mediaDirectoriesToDelete: readonly string[];
}): void {
  const rowsToDelete = duplicateGroups.flatMap(getRowsToDelete);

  console.log(`Mode: ${apply ? "apply" : "dry-run"}`);
  console.log(`Media root: ${mediaRoot}`);
  console.log(`Images scanned: ${scannedCount}`);
  console.log(`Images skipped: ${skippedImages.length}`);
  console.log(`Duplicate groups: ${duplicateGroups.length}`);
  console.log(`Rows to delete: ${rowsToDelete.length}`);
  console.log(`Media directories to delete: ${mediaDirectoriesToDelete.length}`);

  for (const skippedImage of skippedImages) {
    console.log(
      `SKIP productId=${skippedImage.productId} imageId=${skippedImage.id} reason="${skippedImage.reason}"`
    );
  }

  for (const group of duplicateGroups) {
    const [keptImage] = group.rows;

    console.log(
      `DUPLICATE productId=${group.productId} hash=${group.contentHash} associatedColor=${group.associatedColor ?? "(none)"} variantId=${group.variantId ?? "(none)"}`
    );
    console.log(
      `  KEEP imageId=${keptImage.row.id} sortOrder=${keptImage.row.sortOrder}`
    );

    for (const image of getRowsToDelete(group)) {
      console.log(
        `  DELETE imageId=${image.row.id} sortOrder=${image.row.sortOrder} directories=${image.mediaDirectories.join(",")}`
      );
    }
  }
}

function groupRowsByProduct(
  rows: readonly ProductImage[]
): Array<[string, ProductImage[]]> {
  const groups = new Map<string, ProductImage[]>();

  for (const row of rows) {
    const productRows = groups.get(row.productId) ?? [];
    productRows.push(row);
    groups.set(row.productId, productRows);
  }

  return [...groups.entries()];
}

main().catch(async (error) => {
  await prisma.$disconnect();
  console.error(error);
  process.exitCode = 1;
});
