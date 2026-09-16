-- Recreate `razorpay_plans` instead of ALTER ... DROP PRIMARY KEY: some
-- MySQL-compatible databases (TiDB, using a clustered index for the primary
-- key) refuse to drop a clustered primary key via ALTER TABLE. This is a
-- pure cache table (3-6 rows), self-healed by getOrCreateRazorpayPlanId if
-- ever missing a row, so a rebuild-and-copy is safe. Existing rows keep
-- their real planId, backfilled to period='MONTHLY' (the only period that
-- existed before annual billing was added).
CREATE TABLE `razorpay_plans_new` (
    `tier` ENUM('STARTER', 'ADVANCED', 'BUSINESS') NOT NULL,
    `period` ENUM('MONTHLY', 'ANNUAL') NOT NULL DEFAULT 'MONTHLY',
    `planId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`tier`, `period`)
);

INSERT INTO `razorpay_plans_new` (`tier`, `period`, `planId`, `createdAt`)
SELECT `tier`, 'MONTHLY', `planId`, `createdAt` FROM `razorpay_plans`;

DROP TABLE `razorpay_plans`;

RENAME TABLE `razorpay_plans_new` TO `razorpay_plans`;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `currentSessionId` VARCHAR(191) NULL;
