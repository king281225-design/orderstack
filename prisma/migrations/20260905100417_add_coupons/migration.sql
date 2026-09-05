-- AlterTable
-- subtotalCents added nullable first, then backfilled from the existing
-- totalCents (every pre-coupons order's total *was* its subtotal — no
-- discounts existed yet), then made NOT NULL. Generating this straight from
-- `prisma migrate diff` would emit a bare `NOT NULL` add, which fails
-- against a table that already has rows.
ALTER TABLE `orders` ADD COLUMN `couponCode` VARCHAR(191) NULL,
    ADD COLUMN `couponId` VARCHAR(191) NULL,
    ADD COLUMN `discountCents` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `subtotalCents` INTEGER NULL;

UPDATE `orders` SET `subtotalCents` = `totalCents` WHERE `subtotalCents` IS NULL;

ALTER TABLE `orders` MODIFY COLUMN `subtotalCents` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `coupons` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `discountType` ENUM('PERCENT', 'FIXED') NOT NULL,
    `discountValue` INTEGER NOT NULL,
    `minOrderCents` INTEGER NOT NULL DEFAULT 0,
    `maxRedemptions` INTEGER NULL,
    `redemptionCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `coupons_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `coupons_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `orders_couponId_idx` ON `orders`(`couponId`);

-- AddForeignKey
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
