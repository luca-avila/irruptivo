import { describe, expect, it } from "vitest";

import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductRecord
} from "./catalog";
import {
  getPublicImageSet,
  getVariantAwarePublicImageSet,
  reorderProductImages,
  softDeleteProductImage,
  uploadProductImage
} from "./product-images";

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
        stock: 2,
        options: {
          color: "Negro",
          size: "M"
        }
      }
    ],
    images: []
  },
  {
    id: "whey",
    slug: "whey-chocolate",
    name: "Whey Chocolate",
    description: "Proteina sabor chocolate.",
    area: PRODUCT_AREA.supplement,
    status: PRODUCT_STATUS.active,
    basePriceArs: 31500,
    supplementType: "Proteina",
    variants: [
      {
        id: "whey-pouch-1kg",
        sku: "WHEY-POUCH-1KG",
        name: "Chocolate / 1 kg / Pouch",
        stock: 5,
        options: {
          flavor: "Chocolate",
          weight: "1 kg",
          presentation: "Pouch"
        }
      }
    ],
    images: []
  }
] satisfies CatalogProductRecord[];

describe("product image management", () => {
  it("adds uploaded image metadata with relative rendition paths, dimensions, order, and color association", () => {
    const result = uploadProductImage(
      "training-tee",
      {
        id: "tee-black-main",
        alt: "Remera negra Irruptivo frente",
        associatedColor: "Negro",
        renditions: {
          card: {
            path: "products/training-tee/tee-black-main/card.webp",
            width: 640,
            height: 853,
            byteSize: 18_400,
            mimeType: "image/webp"
          },
          detail: {
            path: "products/training-tee/tee-black-main/detail.webp",
            width: 1200,
            height: 1600,
            byteSize: 48_000,
            mimeType: "image/webp"
          },
          original: {
            path: "products/training-tee/tee-black-main/original.webp",
            width: 1800,
            height: 2400,
            byteSize: 95_000,
            mimeType: "image/webp"
          }
        }
      },
      products
    );

    expect(result).toMatchObject({
      ok: true,
      product: {
        images: [
          {
            id: "tee-black-main",
            alt: "Remera negra Irruptivo frente",
            path: "products/training-tee/tee-black-main/detail.webp",
            sortOrder: 1,
            width: 1200,
            height: 1600,
            associatedColor: "Negro",
            variantId: null,
            deletedAt: null
          }
        ]
      }
    });

    if (!result.ok) {
      throw new Error("Expected image upload metadata to succeed");
    }

    const image = result.product.images[0];

    expect(image.path.startsWith("/")).toBe(false);
    expect(image.renditions?.card.path.startsWith("/")).toBe(false);
    expect(result.product.variants.map((variant) => variant.options?.size)).toEqual([
      "S",
      "M"
    ]);

    expect(getPublicImageSet(result.product.images, { usage: "card" })[0]).toEqual({
      id: "tee-black-main",
      path: "/media/products/training-tee/tee-black-main/card.webp",
      alt: "Remera negra Irruptivo frente",
      width: 640,
      height: 853,
      cardPath: "/media/products/training-tee/tee-black-main/card.webp",
      detailPath: "/media/products/training-tee/tee-black-main/detail.webp",
      originalPath: "/media/products/training-tee/tee-black-main/original.webp",
      associatedColor: "Negro",
      variantId: null
    });
  });

  it("can associate supplement images with a specific variant when packaging differs", () => {
    const result = uploadProductImage(
      "whey",
      {
        id: "whey-pouch-front",
        alt: "Whey chocolate pouch de un kilo",
        variantId: "whey-pouch-1kg",
        renditions: renditionSet("whey", "whey-pouch-front")
      },
      products
    );

    expect(result).toMatchObject({
      ok: true,
      product: {
        images: [
          {
            variantId: "whey-pouch-1kg",
            associatedColor: null
          }
        ]
      }
    });
  });

  it("reorders active gallery images and keeps public image order stable", () => {
    const withFirstImage = uploadProductImage(
      "training-tee",
      {
        id: "first",
        alt: "Primera imagen",
        renditions: renditionSet("training-tee", "first")
      },
      products
    );
    const withSecondImage =
      withFirstImage.ok &&
      uploadProductImage(
        "training-tee",
        {
          id: "second",
          alt: "Segunda imagen",
          renditions: renditionSet("training-tee", "second")
        },
        withFirstImage.products
      );

    if (!withSecondImage || !withSecondImage.ok) {
      throw new Error("Expected image setup to succeed");
    }

    const reordered = reorderProductImages(
      "training-tee",
      ["second", "first"],
      withSecondImage.products
    );

    expect(reordered).toMatchObject({
      ok: true,
      product: {
        images: [
          { id: "first", sortOrder: 2 },
          { id: "second", sortOrder: 1 }
        ]
      }
    });

    if (!reordered.ok) {
      throw new Error("Expected image reorder to succeed");
    }

    expect(
      getPublicImageSet(reordered.product.images, { usage: "detail" }).map(
        (image) => image.id
      )
    ).toEqual(["second", "first"]);
  });

  it("soft-deletes image records without requiring immediate physical deletion", () => {
    const withImage = uploadProductImage(
      "training-tee",
      {
        id: "front",
        alt: "Imagen a eliminar",
        renditions: renditionSet("training-tee", "front")
      },
      products
    );

    if (!withImage.ok) {
      throw new Error("Expected image setup to succeed");
    }

    const deleted = softDeleteProductImage(
      "training-tee",
      "front",
      withImage.products,
      () => "2026-05-30T15:00:00.000Z"
    );

    expect(deleted).toMatchObject({
      ok: true,
      product: {
        images: [
          {
            id: "front",
            deletedAt: "2026-05-30T15:00:00.000Z",
            renditions: {
              original: {
                path: "products/training-tee/front/original.webp"
              }
            }
          }
        ]
      }
    });

    if (!deleted.ok) {
      throw new Error("Expected soft delete to succeed");
    }

    expect(getPublicImageSet(deleted.product.images)).toEqual([]);
  });

  it("does not mutate product records when upload metadata is invalid", () => {
    const result = uploadProductImage(
      "training-tee",
      {
        id: "invalid",
        alt: "",
        renditions: {
          ...renditionSet("training-tee", "invalid"),
          card: {
            path: "/absolute/path.webp",
            width: 640,
            height: 853
          }
        }
      },
      products
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "image_validation",
        message: "Revisá la imagen, el texto alternativo y la asociación elegida."
      }
    });
    expect(products[0].images).toEqual([]);
  });
});

describe("variant-aware public image sets", () => {
  it("returns selected color images by associatedColor in public sort order", () => {
    const imageSet = getVariantAwarePublicImageSet(
      [
        imageRecord("general", 1),
        imageRecord("blue-back", 3, { associatedColor: "Azul   Noche" }),
        imageRecord("blue-front", 2, { associatedColor: " azul noche " }),
        imageRecord("red-front", 4, { associatedColor: "Rojo" })
      ],
      {
        selectedOptions: {
          color: "azul noche"
        }
      }
    );

    expect(imageSet.map((image) => image.id)).toEqual(["blue-front", "blue-back"]);
  });

  it("prefers selected variantId images over selected color images", () => {
    const imageSet = getVariantAwarePublicImageSet(
      [
        imageRecord("black-color-front", 1, { associatedColor: "Negro" }),
        imageRecord("black-size-detail", 3, {
          associatedColor: "Negro",
          variantId: "tee-black-m"
        }),
        imageRecord("black-size-main", 2, {
          associatedColor: "Negro",
          variantId: "tee-black-m"
        })
      ],
      {
        selectedOptions: {
          color: "Negro"
        },
        selectedVariantId: "tee-black-m"
      }
    );

    expect(imageSet.map((image) => image.id)).toEqual([
      "black-size-main",
      "black-size-detail"
    ]);
  });

  it("falls back to selected color images when the selected variant has no tagged images", () => {
    const imageSet = getVariantAwarePublicImageSet(
      [
        imageRecord("general", 1),
        imageRecord("red-front", 4, { associatedColor: "Rojo" }),
        imageRecord("black-back", 3, { associatedColor: "Negro" }),
        imageRecord("black-front", 2, { associatedColor: "Negro" })
      ],
      {
        selectedOptions: {
          color: "Negro"
        },
        selectedVariantId: "tee-black-xl"
      }
    );

    expect(imageSet.map((image) => image.id)).toEqual([
      "black-front",
      "black-back"
    ]);
  });

  it("falls back to the full product image set when the selected color has no tagged images", () => {
    const imageSet = getVariantAwarePublicImageSet(
      [
        imageRecord("general", 2),
        imageRecord("red-front", 1, { associatedColor: "Rojo" })
      ],
      {
        selectedOptions: {
          color: "Verde"
        }
      }
    );

    expect(imageSet.map((image) => image.id)).toEqual(["red-front", "general"]);
  });

  it("returns the full product image set when there is no selection", () => {
    const imageSet = getVariantAwarePublicImageSet(
      [
        imageRecord("second", 2, { associatedColor: "Negro" }),
        imageRecord("first", 1)
      ],
      {}
    );

    expect(imageSet.map((image) => image.id)).toEqual(["first", "second"]);
  });

  it("keeps products with only untagged images unchanged", () => {
    const imageSet = getVariantAwarePublicImageSet(
      [imageRecord("detail", 2), imageRecord("main", 1)],
      {
        selectedOptions: {
          color: "Negro"
        },
        selectedVariantId: "tee-black-s"
      }
    );

    expect(imageSet.map((image) => image.id)).toEqual(["main", "detail"]);
  });
});

function renditionSet(productId: string, imageId: string) {
  return {
    card: {
      path: `products/${productId}/${imageId}/card.webp`,
      width: 640,
      height: 853
    },
    detail: {
      path: `products/${productId}/${imageId}/detail.webp`,
      width: 1200,
      height: 1600
    },
    original: {
      path: `products/${productId}/${imageId}/original.webp`,
      width: 1800,
      height: 2400
    }
  };
}

function imageRecord(
  id: string,
  sortOrder: number,
  tags: {
    associatedColor?: string | null;
    variantId?: string | null;
  } = {}
) {
  return {
    id,
    path: `products/training-tee/${id}.webp`,
    alt: `Foto ${id}`,
    sortOrder,
    associatedColor: tags.associatedColor,
    variantId: tags.variantId
  };
}
