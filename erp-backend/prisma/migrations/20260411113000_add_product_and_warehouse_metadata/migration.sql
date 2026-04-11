ALTER TABLE "Product"
ADD COLUMN "description" TEXT,
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'General',
ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'unit';

ALTER TABLE "Warehouse"
ADD COLUMN "description" TEXT;
