/*
  Warnings:

  - You are about to drop the `stock_reservations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "stock_reservations" DROP CONSTRAINT "stock_reservations_order_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_reservations" DROP CONSTRAINT "stock_reservations_variant_id_fkey";

-- DropTable
DROP TABLE "stock_reservations";
