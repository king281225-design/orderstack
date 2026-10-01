-- Delivery-platform order aggregation (Zomato/Swiggy/Magicpin via UrbanPiper)
-- — see CLAUDE.md's aggregation note and prisma/schema.prisma's
-- AggregatorConnection/OrderSource/DeliveryPlatform comments. Additive only:
-- new enum values, two new nullable Order columns, one new table. Each
-- single-column ALTER is its own statement (not combined) for TiDB safety,
-- same convention as the 20260918100000_add_inventory_and_kot migration
-- after the earlier TiDB multi-column-ALTER failure (commit 47c5369).

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `externalOrderId` VARCHAR(191) NULL;
ALTER TABLE `orders` ADD COLUMN `platform` ENUM('ZOMATO', 'SWIGGY', 'MAGICPIN') NULL;
ALTER TABLE `orders` MODIFY `paymentMethod` ENUM('UPI', 'COD', 'CARD', 'RAZORPAY', 'AGGREGATOR') NOT NULL;
ALTER TABLE `orders` MODIFY `source` ENUM('STOREFRONT', 'MANUAL', 'ZOMATO', 'SWIGGY', 'MAGICPIN') NOT NULL DEFAULT 'STOREFRONT';

-- CreateIndex
CREATE UNIQUE INDEX `orders_externalOrderId_key` ON `orders`(`externalOrderId`);

-- CreateTable
CREATE TABLE `aggregator_connections` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `externalStoreId` VARCHAR(191) NOT NULL,
    `apiKeyEncrypted` TEXT NOT NULL,
    `apiSecretEncrypted` TEXT NOT NULL,
    `webhookSecretEncrypted` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `connectedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `aggregator_connections_tenantId_key`(`tenantId`),
    UNIQUE INDEX `aggregator_connections_externalStoreId_key`(`externalStoreId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `aggregator_connections` ADD CONSTRAINT `aggregator_connections_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
