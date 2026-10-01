-- A Zomato restaurant id and a Swiggy restaurant id for the SAME outlet are
-- different values (confirmed by reading Dyno's real client source, which
-- stores them separately as sid/zid) — the earlier single
-- Tenant.dynoRestaurantId column would have silently broken the moment a
-- second platform was connected. Replaced with one row per (tenant,
-- platform). Drops dynoRestaurantId's data — at the time of this migration
-- only local test tenants had a value set, nothing real.

-- DropIndex
DROP INDEX `tenants_dynoRestaurantId_key` ON `tenants`;

-- AlterTable
ALTER TABLE `tenants` DROP COLUMN `dynoRestaurantId`;

-- CreateTable
CREATE TABLE `dyno_restaurant_links` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `platform` ENUM('ZOMATO', 'SWIGGY', 'MAGICPIN') NOT NULL,
    `externalId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `dyno_restaurant_links_externalId_key`(`externalId`),
    INDEX `dyno_restaurant_links_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `dyno_restaurant_links_tenantId_platform_key`(`tenantId`, `platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dyno_restaurant_links` ADD CONSTRAINT `dyno_restaurant_links_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
