-- Multi-store Business. Additive only; every existing tenant keeps businessId NULL.
-- Rollback: drop FKs tenants_businessId_fkey, businesses_ownerUserId_fkey; drop tenants.businessId, table businesses, index orders_tenantId_createdAt_idx.
-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `businessId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `businesses` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ownerUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `businesses_ownerUserId_key`(`ownerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `orders_tenantId_createdAt_idx` ON `orders`(`tenantId`, `createdAt`);

-- AddForeignKey
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `businesses` ADD CONSTRAINT `businesses_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

