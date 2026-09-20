-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `billingPeriod` ENUM('MONTHLY', 'ANNUAL') NULL;

-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `pendingBillingPeriod` ENUM('MONTHLY', 'ANNUAL') NULL;

-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `paidUntil` DATETIME(3) NULL;
