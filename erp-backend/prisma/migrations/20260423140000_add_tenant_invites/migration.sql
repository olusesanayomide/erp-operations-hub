-- Add tenant-scoped invitations for admin-controlled onboarding.
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

CREATE TABLE "TenantInvite" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" "UserRole" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TenantInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantInvite_tokenHash_key" ON "TenantInvite"("tokenHash");
CREATE INDEX "TenantInvite_tenantId_idx" ON "TenantInvite"("tenantId");
CREATE INDEX "TenantInvite_tenantId_status_expiresAt_idx" ON "TenantInvite"("tenantId", "status", "expiresAt");
CREATE INDEX "TenantInvite_email_idx" ON "TenantInvite"("email");

ALTER TABLE "TenantInvite"
ADD CONSTRAINT "TenantInvite_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TenantInvite"
ADD CONSTRAINT "TenantInvite_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
