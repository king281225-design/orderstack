-- Per-tenant override of the free dashboard trial length. Additive, nullable.
-- Rollback: ALTER TABLE `tenants` DROP COLUMN `trialDays`;
ALTER TABLE `tenants` ADD COLUMN `trialDays` INTEGER NULL;
