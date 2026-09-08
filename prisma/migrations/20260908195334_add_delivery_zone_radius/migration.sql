-- AlterTable
ALTER TABLE `orders` ADD COLUMN `deliveryDistanceKm` DOUBLE NULL;

-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `deliveryRadiusKm` DOUBLE NULL,
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL;
