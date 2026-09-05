-- AlterTable
ALTER TABLE `orders` ADD COLUMN `tableLabel` VARCHAR(191) NULL,
    MODIFY `fulfillmentType` ENUM('DELIVERY', 'TAKEAWAY', 'DINE_IN') NOT NULL;
