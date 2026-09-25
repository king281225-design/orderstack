-- AlterTable
ALTER TABLE `items` ADD COLUMN `lowStockAlertedAt` DATETIME(3) NULL,
    ADD COLUMN `lowStockThreshold` DECIMAL(14, 3) NULL,
    ADD COLUMN `purchasePriceCents` INTEGER NULL,
    ADD COLUMN `sku` VARCHAR(64) NULL,
    ADD COLUMN `stockQty` DECIMAL(14, 3) NULL,
    ADD COLUMN `trackStock` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `orders` MODIFY `paymentMethod` ENUM('UPI', 'COD', 'CARD', 'RAZORPAY') NOT NULL;

-- CreateTable
CREATE TABLE `item_stock_movements` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `delta` DECIMAL(14, 3) NOT NULL,
    `reason` ENUM('PURCHASE', 'ORDER', 'ORDER_CANCEL', 'WASTE', 'ADJUSTMENT') NOT NULL,
    `note` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `item_stock_movements_tenantId_idx`(`tenantId`),
    INDEX `item_stock_movements_itemId_createdAt_idx`(`itemId`, `createdAt`),
    INDEX `item_stock_movements_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `items_tenantId_sku_key` ON `items`(`tenantId`, `sku`);

-- AddForeignKey
ALTER TABLE `item_stock_movements` ADD CONSTRAINT `item_stock_movements_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_stock_movements` ADD CONSTRAINT `item_stock_movements_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

