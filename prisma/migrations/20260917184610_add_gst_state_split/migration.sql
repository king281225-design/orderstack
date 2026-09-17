-- AlterTable
ALTER TABLE `orders` ADD COLUMN `gstRatePercent` DOUBLE NULL;

-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `businessState` VARCHAR(191) NULL;
