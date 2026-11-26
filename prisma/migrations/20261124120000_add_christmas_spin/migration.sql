-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `christmasSpinCouponIds` JSON NULL;

-- CreateTable
CREATE TABLE `christmas_spins` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NULL,
    `deviceId` VARCHAR(191) NULL,
    `couponId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `christmas_spins_tenantId_customerPhone_idx`(`tenantId`, `customerPhone`),
    INDEX `christmas_spins_tenantId_deviceId_idx`(`tenantId`, `deviceId`),
    INDEX `christmas_spins_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `christmas_spins` ADD CONSTRAINT `christmas_spins_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `christmas_spins` ADD CONSTRAINT `christmas_spins_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

