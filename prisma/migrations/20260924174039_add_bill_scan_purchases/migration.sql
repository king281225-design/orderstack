-- AlterTable
ALTER TABLE `ingredients` ADD COLUMN `aliases` JSON NULL,
    ADD COLUMN `category` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `item_stock_movements` ADD COLUMN `purchaseId` VARCHAR(191) NULL,
    MODIFY `reason` ENUM('PURCHASE', 'ORDER', 'ORDER_CANCEL', 'WASTE', 'ADJUSTMENT', 'PURCHASE_UNDO') NOT NULL;

-- AlterTable
ALTER TABLE `items` ADD COLUMN `aliases` JSON NULL;

-- AlterTable
ALTER TABLE `stock_movements` ADD COLUMN `purchaseId` VARCHAR(191) NULL,
    MODIFY `reason` ENUM('PURCHASE', 'ORDER', 'ORDER_CANCEL', 'WASTE', 'ADJUSTMENT', 'PURCHASE_UNDO') NOT NULL;

-- CreateTable
CREATE TABLE `suppliers` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `suppliers_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `suppliers_tenantId_name_key`(`tenantId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_scans` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `imageUrls` JSON NOT NULL,
    `status` ENUM('PROCESSING', 'READY', 'FAILED') NOT NULL DEFAULT 'PROCESSING',
    `rawModelOutput` JSON NULL,
    `modelName` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `purchase_scans_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchases` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NULL,
    `supplierNameSnapshot` VARCHAR(191) NULL,
    `billNumber` VARCHAR(191) NULL,
    `billDate` DATETIME(3) NULL,
    `subtotalCents` INTEGER NOT NULL,
    `extraChargesCents` INTEGER NOT NULL DEFAULT 0,
    `extraCharges` JSON NULL,
    `grandTotalCents` INTEGER NOT NULL,
    `scanId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `undoneAt` DATETIME(3) NULL,

    UNIQUE INDEX `purchases_purchaseNumber_key`(`purchaseNumber`),
    UNIQUE INDEX `purchases_scanId_key`(`scanId`),
    INDEX `purchases_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    INDEX `purchases_tenantId_supplierId_billNumber_billDate_idx`(`tenantId`, `supplierId`, `billNumber`, `billDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_lines` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `nameOnBill` VARCHAR(191) NOT NULL,
    `matchKind` ENUM('INGREDIENT', 'ITEM') NULL,
    `matchedIngredientId` VARCHAR(191) NULL,
    `matchedItemId` VARCHAR(191) NULL,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `rateCents` INTEGER NOT NULL,
    `lineTotalCents` INTEGER NOT NULL,
    `confidence` ENUM('HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
    `note` VARCHAR(191) NULL,
    `editedByUser` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `purchase_lines_purchaseId_idx`(`purchaseId`),
    INDEX `purchase_lines_tenantId_idx`(`tenantId`),
    INDEX `purchase_lines_matchedIngredientId_idx`(`matchedIngredientId`),
    INDEX `purchase_lines_matchedItemId_idx`(`matchedItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `item_stock_movements_purchaseId_idx` ON `item_stock_movements`(`purchaseId`);

-- CreateIndex
CREATE INDEX `stock_movements_purchaseId_idx` ON `stock_movements`(`purchaseId`);

-- AddForeignKey
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_scans` ADD CONSTRAINT `purchase_scans_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_scanId_fkey` FOREIGN KEY (`scanId`) REFERENCES `purchase_scans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_lines` ADD CONSTRAINT `purchase_lines_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_lines` ADD CONSTRAINT `purchase_lines_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_lines` ADD CONSTRAINT `purchase_lines_matchedIngredientId_fkey` FOREIGN KEY (`matchedIngredientId`) REFERENCES `ingredients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_lines` ADD CONSTRAINT `purchase_lines_matchedItemId_fkey` FOREIGN KEY (`matchedItemId`) REFERENCES `items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
