-- Dyno (DynoAPIs) turned out to call INTO this app rather than the other
-- way around, so the UrbanPiper-shaped AggregatorConnection model (built on
-- the wrong assumption that this app would need to hold per-tenant API
-- credentials) is replaced with a single Tenant.dynoRestaurantId — the only
-- thing an inbound call from Dyno can be looked up by. The dropped table
-- never held a real row (no tenant ever connected for real), so this is a
-- safe drop, not a destructive-data change.

-- DropForeignKey
ALTER TABLE `aggregator_connections` DROP FOREIGN KEY `aggregator_connections_tenantId_fkey`;

-- DropTable
DROP TABLE `aggregator_connections`;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `aggregatorRawPayload` JSON NULL;

-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `dynoRestaurantId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `tenants_dynoRestaurantId_key` ON `tenants`(`dynoRestaurantId`);
