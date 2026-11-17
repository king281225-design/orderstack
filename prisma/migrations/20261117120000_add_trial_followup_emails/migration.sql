-- Trial-to-paid follow-up email sequence state. Single-column statements for TiDB safety.
ALTER TABLE `tenants` ADD COLUMN `trialFollowUpStep` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `tenants` ADD COLUMN `trialFollowUpSentAt` DATETIME(3) NULL;
ALTER TABLE `tenants` ADD COLUMN `trialFollowUpsStoppedAt` DATETIME(3) NULL;
