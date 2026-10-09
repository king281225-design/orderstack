-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `loyaltyRupeesPerPoint` INTEGER NULL,
    ADD COLUMN `ownerWhatsapp` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `order_revisions` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `editedByUserId` VARCHAR(191) NOT NULL,
    `editedByName` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `beforeSnapshot` JSON NOT NULL,
    `afterSnapshot` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_revisions_tenantId_orderId_createdAt_idx`(`tenantId`, `orderId`, `createdAt`),
    INDEX `order_revisions_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `pointsBalance` INTEGER NOT NULL DEFAULT 0,
    `totalSpentCents` INTEGER NOT NULL DEFAULT 0,
    `orderCount` INTEGER NOT NULL DEFAULT 0,
    `firstOrderAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastOrderAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customers_tenantId_lastOrderAt_idx`(`tenantId`, `lastOrderAt`),
    UNIQUE INDEX `customers_tenantId_phone_key`(`tenantId`, `phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `order_revisions` ADD CONSTRAINT `order_revisions_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_revisions` ADD CONSTRAINT `order_revisions_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

