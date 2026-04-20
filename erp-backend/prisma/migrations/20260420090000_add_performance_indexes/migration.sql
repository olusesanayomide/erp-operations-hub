-- Add composite indexes for tenant-scoped dashboard and list queries.
CREATE INDEX "Warehouse_tenantId_createdAt_idx" ON "Warehouse"("tenantId", "createdAt");
CREATE INDEX "Product_tenantId_createdAt_idx" ON "Product"("tenantId", "createdAt");
CREATE INDEX "StockMovement_tenantId_createdAt_idx" ON "StockMovement"("tenantId", "createdAt");
CREATE INDEX "StockMovement_tenantId_type_createdAt_idx" ON "StockMovement"("tenantId", "type", "createdAt");
CREATE INDEX "Order_tenantId_createdAt_idx" ON "Order"("tenantId", "createdAt");
CREATE INDEX "Order_tenantId_status_createdAt_idx" ON "Order"("tenantId", "status", "createdAt");
CREATE INDEX "Customer_tenantId_createdAt_idx" ON "Customer"("tenantId", "createdAt");
CREATE INDEX "Supplier_tenantId_createdAt_idx" ON "Supplier"("tenantId", "createdAt");
CREATE INDEX "Purchase_tenantId_createdAt_idx" ON "Purchase"("tenantId", "createdAt");
CREATE INDEX "Purchase_tenantId_status_createdAt_idx" ON "Purchase"("tenantId", "status", "createdAt");
