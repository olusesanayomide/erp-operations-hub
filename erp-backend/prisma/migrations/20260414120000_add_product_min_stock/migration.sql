-- Add per-product minimum stock thresholds.

ALTER TABLE "Product"
ADD COLUMN "minStock" INTEGER NOT NULL DEFAULT 10;
