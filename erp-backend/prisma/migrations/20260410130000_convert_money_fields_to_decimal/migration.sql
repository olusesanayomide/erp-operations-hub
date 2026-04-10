-- Convert monetary fields from floating-point to fixed-precision decimals.
-- Rounds existing values to 2 decimal places during conversion.

ALTER TABLE "Product"
ALTER COLUMN "price" TYPE DECIMAL(12, 2)
USING ROUND("price"::numeric, 2);

ALTER TABLE "Order"
ALTER COLUMN "totalAmount" TYPE DECIMAL(14, 2)
USING ROUND("totalAmount"::numeric, 2);

ALTER TABLE "Order"
ALTER COLUMN "totalAmount" SET DEFAULT 0;

ALTER TABLE "OrderItem"
ALTER COLUMN "price" TYPE DECIMAL(12, 2)
USING ROUND("price"::numeric, 2);

ALTER TABLE "Purchase"
ALTER COLUMN "totalAmount" TYPE DECIMAL(14, 2)
USING ROUND("totalAmount"::numeric, 2);

ALTER TABLE "Purchase"
ALTER COLUMN "totalAmount" SET DEFAULT 0;

ALTER TABLE "PurchaseItem"
ALTER COLUMN "price" TYPE DECIMAL(12, 2)
USING ROUND("price"::numeric, 2);
