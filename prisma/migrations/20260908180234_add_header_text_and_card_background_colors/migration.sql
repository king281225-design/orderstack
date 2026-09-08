-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `colorCardBackground` VARCHAR(191) NOT NULL DEFAULT '#ffffff',
    ADD COLUMN `colorHeaderText` VARCHAR(191) NOT NULL DEFAULT '#ffffff';
