-- Add multi-tenant support with a shared database and tenant-scoped data.
-- Existing records are migrated into one default tenant.

CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

INSERT INTO "Tenant" ("id", "name", "slug", "status")
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'default', 'ACTIVE');

ALTER TABLE "User"
ADD COLUMN "tenantId" TEXT,
ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Warehouse"
ADD COLUMN "tenantId" TEXT;

ALTER TABLE "Product"
ADD COLUMN "tenantId" TEXT;

ALTER TABLE "InventoryItem"
ADD COLUMN "tenantId" TEXT;

ALTER TABLE "StockMovement"
ADD COLUMN "tenantId" TEXT;

ALTER TABLE "Order"
ADD COLUMN "tenantId" TEXT;

ALTER TABLE "Customer"
ADD COLUMN "tenantId" TEXT;

ALTER TABLE "Supplier"
ADD COLUMN "tenantId" TEXT;

ALTER TABLE "Purchase"
ADD COLUMN "tenantId" TEXT;

UPDATE "User" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Warehouse" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Product" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "InventoryItem" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "StockMovement" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Order" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Customer" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Supplier" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Purchase" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Warehouse" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryItem" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "StockMovement" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Supplier" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Purchase" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_sku_key";
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_email_key";
ALTER TABLE "Purchase" DROP CONSTRAINT IF EXISTS "Purchase_purchaseOrder_key";
ALTER TABLE "InventoryItem" DROP CONSTRAINT IF EXISTS "InventoryItem_productId_warehouseId_key";

CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");
CREATE UNIQUE INDEX "Customer_tenantId_email_key" ON "Customer"("tenantId", "email");
CREATE UNIQUE INDEX "Purchase_tenantId_purchaseOrder_key" ON "Purchase"("tenantId", "purchaseOrder");
CREATE UNIQUE INDEX "InventoryItem_tenantId_productId_warehouseId_key" ON "InventoryItem"("tenantId", "productId", "warehouseId");

ALTER TABLE "User"
ADD CONSTRAINT "User_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Warehouse"
ADD CONSTRAINT "Warehouse_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryItem"
ADD CONSTRAINT "InventoryItem_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Supplier"
ADD CONSTRAINT "Supplier_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Purchase"
ADD CONSTRAINT "Purchase_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
