/*
  Warnings:

  - You are about to drop the column `payment_checkout_url` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_created_at` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_external_reference` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_init_point` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_preference_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_provider` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_sandbox_init_point` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `payment_events` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[provider_event_id]` on the table `payment_events` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "payment_preferences" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "preference_id" TEXT NOT NULL,
    "checkout_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_preferences_pkey" PRIMARY KEY ("id")
);

-- Backfill existing Mercado Pago checkout preferences before removing the
-- denormalized order columns. The checkout URL falls back to the old init
-- points only for legacy rows that somehow missed the persisted checkout URL.
INSERT INTO "payment_preferences" (
    "id",
    "order_id",
    "preference_id",
    "checkout_url",
    "created_at"
)
SELECT
    "id",
    "id",
    "payment_preference_id",
    COALESCE("payment_checkout_url", "payment_sandbox_init_point", "payment_init_point"),
    COALESCE("payment_created_at", "created_at")
FROM "orders"
WHERE "payment_preference_id" IS NOT NULL
  AND COALESCE("payment_checkout_url", "payment_sandbox_init_point", "payment_init_point") IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "payment_preferences_order_id_key" ON "payment_preferences"("order_id");

-- DropIndex
DROP INDEX "payment_events_provider_provider_event_id_key";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "payment_checkout_url",
DROP COLUMN "payment_created_at",
DROP COLUMN "payment_external_reference",
DROP COLUMN "payment_init_point",
DROP COLUMN "payment_preference_id",
DROP COLUMN "payment_provider",
DROP COLUMN "payment_sandbox_init_point";

-- AlterTable
ALTER TABLE "payment_events" DROP COLUMN "provider";

-- DropEnum
DROP TYPE "PaymentProvider";

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_event_id_key" ON "payment_events"("provider_event_id");

-- AddForeignKey
ALTER TABLE "payment_preferences" ADD CONSTRAINT "payment_preferences_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
