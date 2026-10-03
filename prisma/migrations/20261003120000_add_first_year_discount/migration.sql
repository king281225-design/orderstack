-- First-year annual discount bookkeeping. Additive.
-- Rollback: drop table razorpay_promo_plans; drop tenants.firstYearDiscountAppliedAt, tenants.renewalPlanScheduledAt.
-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `firstYearDiscountAppliedAt` DATETIME(3) NULL;
ALTER TABLE `tenants` ADD COLUMN `renewalPlanScheduledAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `razorpay_promo_plans` (
    `key` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

