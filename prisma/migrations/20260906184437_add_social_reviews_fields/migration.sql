-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `facebookUrl` TEXT NULL,
    ADD COLUMN `googleRating` DOUBLE NULL,
    ADD COLUMN `googleReviewCount` INTEGER NULL,
    ADD COLUMN `googleReviewUrl` TEXT NULL,
    ADD COLUMN `instagramUrl` TEXT NULL;
