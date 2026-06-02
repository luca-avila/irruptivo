import {
  PRODUCT_AREA,
  PRODUCT_STATUS,
  type CatalogProductRecord
} from "./catalog";

export const demoCatalogProducts = [
  {
    id: "irruptivo-training-tee",
    slug: "training-tee-negra",
    name: "Training Tee Negra",
    description: "Remera deportiva de calce relajado para entrenamiento diario.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 26000,
    clothingSubcategory: "Remeras",
    variants: [
      {
        id: "training-tee-black-s",
        sku: "TEE-BLK-S",
        name: "Negro / S",
        stock: 4,
        options: {
          color: "Negro",
          size: "S"
        }
      },
      {
        id: "training-tee-black-m",
        sku: "TEE-BLK-M",
        name: "Negro / M",
        stock: 2,
        options: {
          color: "Negro",
          size: "M"
        }
      }
    ],
    images: [
      {
        id: "training-tee-black-front",
        path: "/products/training-tee-negra-01.webp",
        alt: "Remera negra Irruptivo frente",
        sortOrder: 1
      },
      {
        id: "training-tee-black-detail",
        path: "/products/training-tee-negra-02.webp",
        alt: "Detalle de tela de la remera negra Irruptivo",
        sortOrder: 2
      }
    ]
  },
  {
    id: "irruptivo-essential-short",
    slug: "essential-short-negro",
    name: "Essential Short Negro",
    description: "Short liviano para entrenamiento y uso diario.",
    area: PRODUCT_AREA.clothing,
    status: PRODUCT_STATUS.active,
    basePriceArs: 32000,
    clothingSubcategory: "Shorts",
    variants: [
      {
        id: "essential-short-black-m",
        sku: "SHORT-BLK-M",
        name: "Negro / M",
        stock: 0,
        options: {
          color: "Negro",
          size: "M"
        }
      }
    ],
    images: [
      {
        id: "essential-short-black-front",
        path: "/products/essential-short-negro-01.webp",
        alt: "Short negro Irruptivo frente",
        sortOrder: 1
      }
    ]
  },
  {
    id: "creatina-monohidrato",
    slug: "creatina-monohidrato-300g",
    name: "Creatina Monohidrato 300 g",
    description: "Creatina monohidrato en presentacion de 300 gramos.",
    area: PRODUCT_AREA.supplement,
    status: PRODUCT_STATUS.active,
    basePriceArs: 28500,
    supplementType: "Creatina",
    variants: [
      {
        id: "creatina-300g",
        sku: "CREATINA-300G",
        name: "300 g",
        stock: 5,
        priceOverrideArs: 29900,
        options: {
          weight: "300 g"
        }
      }
    ],
    images: [
      {
        id: "creatina-300g-front",
        path: "/products/creatina-monohidrato-300g-01.webp",
        alt: "Creatina monohidrato 300 gramos",
        sortOrder: 1
      }
    ]
  }
] satisfies CatalogProductRecord[];
