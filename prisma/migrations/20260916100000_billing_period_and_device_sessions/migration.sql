-- AlterTable
ALTER TABLE `razorpay_plans` DROP PRIMARY KEY,
    ADD COLUMN `period` ENUM('MONTHLY', 'ANNUAL') NOT NULL DEFAULT 'MONTHLY',
    ADD PRIMARY KEY (`tier`, `period`);

-- AlterTable
ALTER TABLE `users` ADD COLUMN `currentSessionId` VARCHAR(191) NULL;

