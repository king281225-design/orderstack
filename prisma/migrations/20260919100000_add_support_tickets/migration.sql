-- CreateTable
CREATE TABLE `support_tickets` (
    `id` VARCHAR(191) NOT NULL,
    `ticketNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` VARCHAR(191) NOT NULL,
    `createdByEmail` VARCHAR(191) NOT NULL,
    `contactName` VARCHAR(191) NOT NULL,
    `contactPhone` VARCHAR(191) NOT NULL,
    `contactEmail` VARCHAR(191) NOT NULL,
    `preferredContact` ENUM('PHONE', 'WHATSAPP', 'EMAIL') NOT NULL DEFAULT 'PHONE',
    `bestTime` VARCHAR(191) NULL,
    `category` ENUM('TECHNICAL_ISSUE', 'ORDER_PROBLEM', 'PAYMENT_BILLING', 'MENU_HELP', 'QR_TABLES', 'ACCOUNT_LOGIN', 'FEATURE_REQUEST', 'GENERAL_ENQUIRY') NOT NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `area` VARCHAR(191) NULL,
    `orderNumber` INTEGER NULL,
    `subject` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `screenshotUrl` TEXT NULL,
    `userAgent` VARCHAR(191) NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `adminResponse` TEXT NULL,
    `respondedAt` DATETIME(3) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `support_tickets_ticketNumber_key`(`ticketNumber`),
    INDEX `support_tickets_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    INDEX `support_tickets_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

