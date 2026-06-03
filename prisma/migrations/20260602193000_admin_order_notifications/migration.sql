-- Add the delivery kind with a default first so existing rows are backfilled
-- before the unique constraint changes from order-only to order + kind.
ALTER TABLE "email_deliveries"
ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'buyer_confirmation';

DROP INDEX "email_deliveries_order_id_key";

CREATE UNIQUE INDEX "email_deliveries_order_id_kind_key"
ON "email_deliveries"("order_id", "kind");

CREATE TABLE "store_settings" (
    "id" TEXT NOT NULL,
    "admin_notification_email" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);
