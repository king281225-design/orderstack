-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `customDomain` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `razorpay_plans` (
    `tier` ENUM('STARTER', 'ADVANCED', 'BUSINESS') NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`tier`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `tenants_customDomain_key` ON `tenants`(`customDomain`);
