-- Create notification tables for tenant-scoped persistent notifications.

CREATE TYPE "NotificationType" AS ENUM (
  'ORDER_CREATED',
  'ORDER_STATUS_CHANGED',
  'PURCHASE_CREATED',
  'PURCHASE_STATUS_CHANGED',
  'PURCHASE_RECEIVED'
);

CREATE TYPE "NotificationEntityType" AS ENUM (
  'ORDER',
  'PURCHASE',
  'SYSTEM'
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entityType" "NotificationEntityType" NOT NULL DEFAULT 'SYSTEM',
  "entityId" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserNotification" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserNotification_notificationId_userId_key" ON "UserNotification"("notificationId", "userId");
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");
CREATE INDEX "Notification_tenantId_createdAt_idx" ON "Notification"("tenantId", "createdAt");
CREATE INDEX "UserNotification_tenantId_idx" ON "UserNotification"("tenantId");
CREATE INDEX "UserNotification_tenantId_userId_readAt_archivedAt_idx" ON "UserNotification"("tenantId", "userId", "readAt", "archivedAt");

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserNotification"
ADD CONSTRAINT "UserNotification_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserNotification"
ADD CONSTRAINT "UserNotification_notificationId_fkey"
FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserNotification"
ADD CONSTRAINT "UserNotification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
