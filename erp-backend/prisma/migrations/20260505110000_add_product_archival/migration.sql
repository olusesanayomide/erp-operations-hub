-- Add product archival state for safe remove behavior.
ALTER TABLE "Product"
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Product_tenantId_archivedAt_idx"
ON "Product"("tenantId", "archivedAt");

ALTER TABLE "Customer"
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Customer_tenantId_archivedAt_idx"
ON "Customer"("tenantId", "archivedAt");

ALTER TABLE "Supplier"
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Supplier_tenantId_archivedAt_idx"
ON "Supplier"("tenantId", "archivedAt");

ALTER TABLE "Warehouse"
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Warehouse_tenantId_archivedAt_idx"
ON "Warehouse"("tenantId", "archivedAt");
