-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `pendingPlanTier` ENUM('STARTER', 'ADVANCED', 'BUSINESS') NULL;
