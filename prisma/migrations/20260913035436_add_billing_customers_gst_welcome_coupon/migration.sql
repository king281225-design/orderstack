-- AlterTable
ALTER TABLE `orders` ADD COLUMN `source` ENUM('STOREFRONT', 'MANUAL') NOT NULL DEFAULT 'STOREFRONT',
    ADD COLUMN `taxCents` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `businessAddress` TEXT NULL,
    ADD COLUMN `gstRate` DOUBLE NULL,
    ADD COLUMN `gstin` VARCHAR(191) NULL,
    ADD COLUMN `welcomeCouponRedeemedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `subscription_purchases` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `tier` ENUM('STARTER', 'ADVANCED', 'BUSINESS') NOT NULL,
    `originalPriceCents` INTEGER NOT NULL,
    `discountCents` INTEGER NOT NULL DEFAULT 0,
    `couponCode` VARCHAR(191) NULL,
    `finalPriceCents` INTEGER NOT NULL,
    `razorpayOrderId` VARCHAR(191) NULL,
    `razorpayPaymentId` VARCHAR(191) NULL,
    `razorpaySubscriptionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `subscription_purchases_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `subscription_purchases` ADD CONSTRAINT `subscription_purchases_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
