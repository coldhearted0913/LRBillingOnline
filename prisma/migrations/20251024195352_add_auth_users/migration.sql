/*
  Warnings:

  - You are about to drop the column `created_at` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `details` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `ip_address` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `new_value` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `old_value` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `resource_id` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `resource_type` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `submission_status` on the `lrs` table. All the data in the column will be lost.
  - You are about to drop the column `submitted_at` on the `lrs` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `last_login` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `backups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `deletion_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `export_jobs` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `resource` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `audit_logs` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "deletion_requests" DROP CONSTRAINT "deletion_requests_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "deletion_requests" DROP CONSTRAINT "deletion_requests_lr_id_fkey";

-- DropForeignKey
ALTER TABLE "deletion_requests" DROP CONSTRAINT "deletion_requests_requested_by_fkey";

-- DropForeignKey
ALTER TABLE "export_jobs" DROP CONSTRAINT "export_jobs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "lrs" DROP CONSTRAINT "lrs_created_by_fkey";

-- DropForeignKey
ALTER TABLE "lrs" DROP CONSTRAINT "lrs_updated_by_fkey";

-- DropIndex
DROP INDEX "audit_logs_created_at_idx";

-- DropIndex
DROP INDEX "audit_logs_user_id_idx";

-- DropIndex
DROP INDEX "lrs_created_by_idx";

-- DropIndex
DROP INDEX "lrs_updated_by_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "created_at",
DROP COLUMN "details",
DROP COLUMN "ip_address",
DROP COLUMN "new_value",
DROP COLUMN "old_value",
DROP COLUMN "resource_id",
DROP COLUMN "resource_type",
DROP COLUMN "user_id",
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "newValue" TEXT,
ADD COLUMN     "oldValue" TEXT,
ADD COLUMN     "resource" TEXT NOT NULL,
ADD COLUMN     "resourceId" TEXT,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "lrs" DROP COLUMN "submission_status",
DROP COLUMN "submitted_at";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "is_active",
DROP COLUMN "last_login",
DROP COLUMN "password_hash",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "password" TEXT,
ALTER COLUMN "role" SET DEFAULT 'WORKER';

-- DropTable
DROP TABLE "backups";

-- DropTable
DROP TABLE "deletion_requests";

-- DropTable
DROP TABLE "export_jobs";

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
