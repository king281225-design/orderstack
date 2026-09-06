-- AlterTable
ALTER TABLE `tenants` DROP COLUMN `plan`,
    ADD COLUMN `menuDocumentType` VARCHAR(191) NULL,
    ADD COLUMN `menuDocumentUrl` TEXT NULL,
    ADD COLUMN `planTier` ENUM('STARTER', 'ADVANCED', 'BUSINESS') NOT NULL DEFAULT 'STARTER',
    ADD COLUMN `razorpaySubscriptionId` VARCHAR(191) NULL,
    ADD COLUMN `subscriptionStatus` ENUM('NONE', 'ACTIVE', 'PAST_DUE', 'CANCELLED') NOT NULL DEFAULT 'NONE';

