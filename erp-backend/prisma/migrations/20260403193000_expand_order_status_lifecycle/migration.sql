-- Expand order lifecycle from DRAFT/CONFIRMED/COMPLETED/CANCELLED
-- to DRAFT/CONFIRMED/PICKED/SHIPPED/DELIVERED/CANCELLED.
-- Existing COMPLETED orders are migrated to DELIVERED.

CREATE TYPE "OrderStatus_new" AS ENUM (
  'DRAFT',
  'CONFIRMED',
  'PICKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED'
);

ALTER TABLE "Order"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Order"
ALTER COLUMN "status" TYPE "OrderStatus_new"
USING (
  CASE
    WHEN "status"::text = 'COMPLETED' THEN 'DELIVERED'
    ELSE "status"::text
  END
)::"OrderStatus_new";

ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";

ALTER TABLE "Order"
ALTER COLUMN "status" SET DEFAULT 'DRAFT';
