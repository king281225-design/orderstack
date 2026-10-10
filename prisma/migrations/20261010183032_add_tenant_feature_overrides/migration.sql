-- Per-tenant feature grant/revoke overrides layered on top of planTier. Additive, nullable.
-- Rollback: ALTER TABLE `tenants` DROP COLUMN `featureOverrides`;
ALTER TABLE `tenants` ADD COLUMN `featureOverrides` JSON NULL;
