import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  type TestContext
} from "vitest";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductImageRecord,
  type CatalogProductImageRenditionsRecord,
  type CatalogProductRecord
} from "../catalog/catalog";
import { prisma } from "../db/client";
import {
  addProductVariant,
  createProduct,
  createAdminProductImageRecordOnce,
  deleteAdminProductRecord,
  readAdminProductRecords,
  saveAdminProductRecords,
  setProductStatus,
  updateProduct,
  updateProductVariant
} from "./products";

const runId = `${Date.now()}-${process.pid}`;
const productNamePrefix = `Phase3 Admin Repository ${runId}`;
const productIdPrefix = `product-phase3-admin-repository-${runId}`;
let databaseAvailable = false;

describe.skipIf(!process.env.DATABASE_URL)(
  "admin product repository persistence",
  () => {
    beforeAll(async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        databaseAvailable = true;
      } catch {
        databaseAvailable = false;
        return;
      }

      await cleanupTestProducts();
    });

    afterAll(async () => {
      if (databaseAvailable) {
        await cleanupTestProducts();
      }

      await prisma.$disconnect();
    });

    it("round-trips a created product through save and read", async (ctx) => {
      skipIfDatabaseUnavailable(ctx);

      const result = createProduct(
        {
          name: `${productNamePrefix} Round Trip`,
          description: "Producto creado por el test de repositorio.",
          area: PRODUCT_AREA.supplement,
          supplementType: "Proteina",
          basePriceArs: 42500,
          status: PRODUCT_STATUS.inactive
        },
        []
      );

      if (!result.ok) {
        throw new Error("Expected product creation to succeed");
      }

      await saveAdminProductRecords(result.products);

      const persisted = await readPersistedProduct(result.product.id);

      expect(persisted).toMatchObject({
        id: result.product.id,
        slug: result.product.slug,
        name: `${productNamePrefix} Round Trip`,
        description: "Producto creado por el test de repositorio.",
        area: PRODUCT_AREA.supplement,
        status: PRODUCT_STATUS.inactive,
        basePriceArs: 42500,
        clothingSubcategory: null,
        supplementType: "Proteina",
        variants: [],
        images: []
      });
    });

    it("persists added variants with array-index positions and normalized SKUs", async (ctx) => {
      skipIfDatabaseUnavailable(ctx);

      const product = createTestProduct("Variant Position");
      const withFirstVariant = addProductVariant(
        product.id,
        {
          sku: " phase3-pos-a ",
          color: "Negro",
          size: "M",
          stock: 3,
          priceOverrideArs: null
        },
        [product]
      );

      if (!withFirstVariant.ok) {
        throw new Error("Expected first variant creation to succeed");
      }

      const withSecondVariant = addProductVariant(
        product.id,
        {
          sku: "phase3-pos-b",
          color: "Blanco",
          size: "L",
          stock: 5,
          priceOverrideArs: 61000
        },
        withFirstVariant.products
      );

      if (!withSecondVariant.ok) {
        throw new Error("Expected second variant creation to succeed");
      }

      await saveAdminProductRecords(withSecondVariant.products);

      const rows = await prisma.productVariant.findMany({
        where: {
          productId: product.id
        },
        orderBy: {
          position: "asc"
        }
      });

      expect(rows.map((row) => row.position)).toEqual([0, 1]);
      expect(rows.map((row) => row.sku)).toEqual([
        "phase3-pos-a",
        "phase3-pos-b"
      ]);
      expect(rows.map((row) => row.skuNormalized)).toEqual([
        "PHASE3-POS-A",
        "PHASE3-POS-B"
      ]);
    });

    it("persists product metadata and variant updates", async (ctx) => {
      skipIfDatabaseUnavailable(ctx);

      const product = createTestProduct("Metadata Update");
      const withVariant = addProductVariant(
        product.id,
        {
          sku: "phase3-update-original",
          color: "Negro",
          size: "S",
          stock: 2,
          priceOverrideArs: null
        },
        [product]
      );

      if (!withVariant.ok) {
        throw new Error("Expected variant creation to succeed");
      }

      const metadataUpdate = updateProduct(
        product.id,
        {
          name: `${productNamePrefix} Metadata Actualizada`,
          description: "Descripcion actualizada por el test.",
          area: PRODUCT_AREA.clothing,
          clothingSubcategory: "Camperas",
          basePriceArs: 73500
        },
        withVariant.products
      );

      if (!metadataUpdate.ok) {
        throw new Error("Expected product update to succeed");
      }

      const variantId = metadataUpdate.product.variants[0]?.id ?? "";
      const variantUpdate = updateProductVariant(
        product.id,
        variantId,
        {
          sku: "phase3-update-new",
          color: "Gris",
          size: "L",
          stock: 9,
          priceOverrideArs: 76000
        },
        metadataUpdate.products
      );

      if (!variantUpdate.ok) {
        throw new Error("Expected variant update to succeed");
      }

      await saveAdminProductRecords(variantUpdate.products);

      const persisted = await readPersistedProduct(product.id);

      expect(persisted).toMatchObject({
        name: `${productNamePrefix} Metadata Actualizada`,
        description: "Descripcion actualizada por el test.",
        clothingSubcategory: "Camperas",
        basePriceArs: 73500,
        variants: [
          {
            id: variantId,
            sku: "phase3-update-new",
            name: "Gris / L",
            stock: 9,
            priceOverrideArs: 76000,
            options: {
              color: "Gris",
              size: "L"
            }
          }
        ]
      });
    });

    it("persists status changes and keeps the publish rule", async (ctx) => {
      skipIfDatabaseUnavailable(ctx);

      const product = createTestProduct("Status Rule");
      const rejected = setProductStatus(
        product.id,
        PRODUCT_STATUS.active,
        [product]
      );

      expect(rejected).toMatchObject({
        ok: false,
        error: {
          code: "cannot_publish_without_variants"
        }
      });

      const withVariant = addProductVariant(
        product.id,
        {
          sku: "phase3-status-sku",
          color: "Negro",
          size: "XL",
          stock: 1,
          priceOverrideArs: null
        },
        [product]
      );

      if (!withVariant.ok) {
        throw new Error("Expected variant creation to succeed");
      }

      const activated = setProductStatus(
        product.id,
        PRODUCT_STATUS.active,
        withVariant.products
      );

      if (!activated.ok) {
        throw new Error("Expected product activation to succeed");
      }

      await saveAdminProductRecords(activated.products);

      const persisted = await readPersistedProduct(product.id);

      expect(persisted.status).toBe(PRODUCT_STATUS.active);
    });

    it("preserves image metadata when product edits pass through save", async (ctx) => {
      skipIfDatabaseUnavailable(ctx);

      const product = createTestProduct("Image Metadata Keep");
      const withVariant = addProductVariant(
        product.id,
        {
          sku: "phase3-image-sku",
          color: "Negro",
          size: "M",
          stock: 4,
          priceOverrideArs: null
        },
        [product]
      );

      if (!withVariant.ok) {
        throw new Error("Expected variant creation to succeed");
      }

      const variantId = withVariant.product.variants[0]?.id ?? "";
      const productWithImages: CatalogProductRecord = {
        ...withVariant.product,
        images: [
          {
            id: `${product.id}-front`,
            path: "products/phase3/front/detail.webp",
            alt: "Imagen principal de test",
            sortOrder: 1,
            width: 1200,
            height: 1600,
            renditions: createRenditions("front"),
            associatedColor: "Negro",
            variantId,
            deletedAt: null
          },
          {
            id: `${product.id}-deleted`,
            path: "products/phase3/deleted/detail.webp",
            alt: "Imagen eliminada de test",
            sortOrder: 2,
            associatedColor: null,
            variantId: null,
            deletedAt: "2026-05-30T12:00:00.000Z"
          }
        ]
      };

      await saveAdminProductRecords([
        {
          ...productWithImages,
          variants: withVariant.product.variants
        }
      ]);

      const edited = updateProduct(
        product.id,
        {
          name: `${productNamePrefix} Image Metadata Keep Updated`,
          description: "Producto editado sin tocar imagenes.",
          area: PRODUCT_AREA.clothing,
          clothingSubcategory: "Remeras",
          basePriceArs: 59000
        },
        [productWithImages]
      );

      if (!edited.ok) {
        throw new Error("Expected product edit to succeed");
      }

      await saveAdminProductRecords(edited.products);

      const persisted = await readPersistedProduct(product.id);

      expect(persisted.images).toMatchObject([
        {
          id: `${product.id}-front`,
          path: "products/phase3/front/detail.webp",
          alt: "Imagen principal de test",
          sortOrder: 1,
          width: 1200,
          height: 1600,
          renditions: createRenditions("front"),
          associatedColor: "Negro",
          variantId,
          deletedAt: null
        },
        {
          id: `${product.id}-deleted`,
          path: "products/phase3/deleted/detail.webp",
          alt: "Imagen eliminada de test",
          sortOrder: 2,
          renditions: undefined,
          associatedColor: null,
          variantId: null,
          deletedAt: "2026-05-30T12:00:00.000Z"
        }
      ]);
    });

    it("creates only one image row when the same upload id is claimed concurrently", async (ctx) => {
      skipIfDatabaseUnavailable(ctx);

      const product = createTestProduct("Image Claim Same Token");
      await saveAdminProductRecords([product]);

      const image = createImageRecordForProduct(product, "same-token", 99);
      const results = await Promise.all([
        createAdminProductImageRecordOnce(product.id, image),
        createAdminProductImageRecordOnce(product.id, image)
      ]);

      expect(results.map((result) => result.status).sort()).toEqual([
        "created",
        "duplicate"
      ]);

      const rows = await prisma.productImage.findMany({
        where: {
          productId: product.id
        },
        orderBy: {
          sortOrder: "asc"
        }
      });

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: image.id,
        sortOrder: 1
      });
    });

    it("assigns non-colliding sort orders for concurrent distinct image uploads", async (ctx) => {
      skipIfDatabaseUnavailable(ctx);

      const product = createTestProduct("Image Claim Distinct Tokens");
      await saveAdminProductRecords([product]);

      const firstImage = createImageRecordForProduct(product, "first", 99);
      const secondImage = createImageRecordForProduct(product, "second", 99);
      const results = await Promise.all([
        createAdminProductImageRecordOnce(product.id, firstImage),
        createAdminProductImageRecordOnce(product.id, secondImage)
      ]);

      expect(results.map((result) => result.status)).toEqual([
        "created",
        "created"
      ]);

      const rows = await prisma.productImage.findMany({
        where: {
          productId: product.id
        },
        orderBy: [
          {
            sortOrder: "asc"
          },
          {
            id: "asc"
          }
        ]
      });

      expect(rows.map((row) => row.sortOrder)).toEqual([1, 2]);
      expect(new Set(rows.map((row) => row.sortOrder)).size).toBe(2);
    });

    it("hard-deletes a product with cascaded variants and image rows while returning file cleanup data", async (ctx) => {
      skipIfDatabaseUnavailable(ctx);

      const product = createTestProduct("Hard Delete");
      const withVariant = addProductVariant(
        product.id,
        {
          sku: "phase3-delete-sku",
          color: "Negro",
          size: "M",
          stock: 4,
          priceOverrideArs: null
        },
        [product]
      );

      if (!withVariant.ok) {
        throw new Error("Expected variant creation to succeed");
      }

      const activeImage = createImageRecordForProduct(product, "active", 1);
      const deletedImage: CatalogProductImageRecord = {
        ...createImageRecordForProduct(product, "deleted", 2),
        deletedAt: "2026-05-30T12:00:00.000Z"
      };

      await saveAdminProductRecords([
        {
          ...withVariant.product,
          images: [activeImage, deletedImage]
        }
      ]);

      const result = await deleteAdminProductRecord(product.id);

      expect(result).toMatchObject({
        product: {
          id: product.id,
          slug: product.slug,
          images: [
            {
              id: activeImage.id,
              deletedAt: null
            },
            {
              id: deletedImage.id,
              deletedAt: "2026-05-30T12:00:00.000Z"
            }
          ]
        }
      });
      expect(result?.imageFiles.map((image) => image.id)).toEqual([
        activeImage.id,
        deletedImage.id
      ]);

      await expect(
        prisma.product.findUnique({
          where: {
            id: product.id
          }
        })
      ).resolves.toBeNull();
      await expect(
        prisma.productVariant.count({
          where: {
            productId: product.id
          }
        })
      ).resolves.toBe(0);
      await expect(
        prisma.productImage.count({
          where: {
            productId: product.id
          }
        })
      ).resolves.toBe(0);
    });

    it("returns null when hard-deleting an unknown product", async (ctx) => {
      skipIfDatabaseUnavailable(ctx);

      await expect(
        deleteAdminProductRecord(`${productIdPrefix}-unknown`)
      ).resolves.toBeNull();
    });
  }
);

function skipIfDatabaseUnavailable(ctx: TestContext): void {
  ctx.skip(
    !databaseAvailable,
    "DATABASE_URL is set but the database is unavailable"
  );
}

function createTestProduct(nameSuffix: string): CatalogProductRecord {
  const result = createProduct(
    {
      name: `${productNamePrefix} ${nameSuffix}`,
      description: "Producto base para test de repositorio.",
      area: PRODUCT_AREA.clothing,
      clothingSubcategory: "Remeras",
      basePriceArs: 56000,
      status: PRODUCT_STATUS.inactive
    },
    []
  );

  if (!result.ok) {
    throw new Error("Expected test product creation to succeed");
  }

  return result.product;
}

async function readPersistedProduct(
  productId: string
): Promise<CatalogProductRecord> {
  const product = (await readAdminProductRecords()).find(
    (currentProduct) => currentProduct.id === productId
  );

  if (!product) {
    throw new Error(`Expected persisted product ${productId} to exist`);
  }

  return product;
}

async function cleanupTestProducts(): Promise<void> {
  await prisma.product.deleteMany({
    where: {
      id: {
        startsWith: productIdPrefix
      }
    }
  });
}

function createRenditions(
  imageId: string
): CatalogProductImageRenditionsRecord {
  return {
    card: {
      path: `products/phase3/${imageId}/card.webp`,
      width: 640,
      height: 853,
      byteSize: 12000,
      mimeType: "image/webp"
    },
    detail: {
      path: `products/phase3/${imageId}/detail.webp`,
      width: 1200,
      height: 1600,
      byteSize: 32000,
      mimeType: "image/webp"
    },
    original: {
      path: `products/phase3/${imageId}/original.webp`,
      width: 1800,
      height: 2400,
      byteSize: 76000,
      mimeType: "image/webp"
    }
  };
}

function createImageRecordForProduct(
  product: CatalogProductRecord,
  imageId: string,
  sortOrder: number
): CatalogProductImageRecord {
  const fullImageId = `${product.id}-${imageId}`;

  return {
    id: fullImageId,
    path: `products/${product.id}/${fullImageId}/detail.webp`,
    alt: "Imagen de test",
    sortOrder,
    width: 1200,
    height: 1600,
    renditions: {
      card: {
        path: `products/${product.id}/${fullImageId}/card.webp`,
        width: 640,
        height: 853,
        byteSize: 12000,
        mimeType: "image/webp"
      },
      detail: {
        path: `products/${product.id}/${fullImageId}/detail.webp`,
        width: 1200,
        height: 1600,
        byteSize: 32000,
        mimeType: "image/webp"
      },
      original: {
        path: `products/${product.id}/${fullImageId}/original.webp`,
        width: 1800,
        height: 2400,
        byteSize: 76000,
        mimeType: "image/webp"
      }
    },
    associatedColor: "Negro",
    variantId: null,
    deletedAt: null
  };
}
