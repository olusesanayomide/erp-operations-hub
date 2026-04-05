/*
  Warnings:

  - You are about to drop the column `customer` on the `Order` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "customer",
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
