-- Payment source tracking. One statement per ALTER (TiDB-safe).
-- Rollback: drop the four orders columns and two tenants columns below, and
-- MODIFY paymentStatus back to ENUM('PENDING','PAID','FAILED') after moving
-- any CANCELLED/REFUNDED rows to FAILED.
ALTER TABLE `orders` MODIFY `paymentStatus` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING';
ALTER TABLE `orders` ADD COLUMN `paymentSource` VARCHAR(191) NULL;
ALTER TABLE `orders` ADD COLUMN `paymentSourceLabel` VARCHAR(191) NULL;
ALTER TABLE `orders` ADD COLUMN `paymentReference` VARCHAR(191) NULL;
ALTER TABLE `orders` ADD COLUMN `paidAt` DATETIME(3) NULL;
ALTER TABLE `tenants` ADD COLUMN `upiPayeeName` VARCHAR(191) NULL;
ALTER TABLE `tenants` ADD COLUMN `upiProviderName` VARCHAR(191) NULL;
-- Best available approximation for historical paid orders.
UPDATE `orders` SET `paidAt` = `updatedAt` WHERE `paymentStatus` = 'PAID' AND `paidAt` IS NULL;
