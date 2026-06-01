/*
  Warnings:

  - Added the required column `path` to the `product_images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position` to the `product_variants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "path" TEXT NOT NULL,
ALTER COLUMN "renditions" DROP NOT NULL;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "position" INTEGER NOT NULL;
