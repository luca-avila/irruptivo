import { Prisma, PrismaClient } from "@prisma/client";

import {
  type CatalogProductImageRecord,
  type CatalogProductRecord,
  type CatalogProductVariantRecord
} from "../src/catalog/catalog";
import { demoCatalogProducts } from "../src/catalog/demo-catalog-data";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    for (const product of demoCatalogProducts) {
      await seedProduct(tx, product);
    }
  });

  const seededProductIds = demoCatalogProducts.map((product) => product.id);
  const [productCount, variantCount, imageCount] = await Promise.all([
    prisma.product.count({
      where: {
        id: {
          in: seededProductIds
        }
      }
    }),
    prisma.productVariant.count({
      where: {
        productId: {
          in: seededProductIds
        }
      }
    }),
    prisma.productImage.count({
      where: {
        productId: {
          in: seededProductIds
        }
      }
    })
  ]);

  console.log(
    `Seeded catalog: ${productCount} products, ${variantCount} variants, ${imageCount} images.`
  );
}

async function seedProduct(
  tx: Prisma.TransactionClient,
  product: CatalogProductRecord
) {
  const existingProductWithSlug = await tx.product.findUnique({
    where: {
      slug: product.slug
    }
  });

  if (existingProductWithSlug && existingProductWithSlug.id !== product.id) {
    throw new Error(
      `Cannot seed product ${product.id}: slug ${product.slug} already belongs to ${existingProductWithSlug.id}.`
    );
  }

  await tx.product.upsert({
    where: {
      id: product.id
    },
    update: getProductData(product),
    create: {
      id: product.id,
      ...getProductData(product)
    }
  });

  await Promise.all(
    product.variants.map((variant, position) =>
      tx.productVariant.upsert({
        where: {
          id: variant.id
        },
        update: getVariantData(product.id, variant, position),
        create: {
          id: variant.id,
          ...getVariantData(product.id, variant, position)
        }
      })
    )
  );

  await Promise.all(
    product.images.map((image) =>
      tx.productImage.upsert({
        where: {
          id: image.id
        },
        update: getImageData(product.id, image),
        create: {
          id: image.id,
          ...getImageData(product.id, image)
        }
      })
    )
  );
}

function getProductData(product: CatalogProductRecord) {
  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    area: product.area,
    status: product.status,
    basePriceArs: product.basePriceArs,
    clothingSubcategory: product.clothingSubcategory ?? null,
    supplementType: product.supplementType ?? null
  };
}

function getVariantData(
  productId: string,
  variant: CatalogProductVariantRecord,
  position: number
) {
  const options = variant.options ?? {};

  return {
    productId,
    sku: variant.sku,
    skuNormalized: normalizeSku(variant.sku),
    name: variant.name,
    stock: variant.stock,
    position,
    priceOverrideArs: variant.priceOverrideArs ?? null,
    optionColor: options.color ?? null,
    optionSize: options.size ?? null,
    optionFlavor: options.flavor ?? null,
    optionWeight: options.weight ?? null,
    optionPresentation: options.presentation ?? null
  };
}

function getImageData(productId: string, image: CatalogProductImageRecord) {
  return {
    productId,
    path: image.path,
    alt: image.alt,
    sortOrder: image.sortOrder,
    width: image.width ?? null,
    height: image.height ?? null,
    associatedColor: image.associatedColor ?? null,
    variantId: image.variantId ?? null,
    renditions: image.renditions ?? Prisma.DbNull,
    deletedAt: image.deletedAt ? new Date(image.deletedAt) : null
  };
}

function normalizeSku(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-AR");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
