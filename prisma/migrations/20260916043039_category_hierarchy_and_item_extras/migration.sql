-- AlterTable
ALTER TABLE `categories` ADD COLUMN `parentCategoryId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `items` ADD COLUMN `isVeg` BOOLEAN NULL,
    ADD COLUMN `tags` JSON NULL,
    ADD COLUMN `variants` JSON NULL;

-- CreateIndex
CREATE INDEX `categories_parentCategoryId_idx` ON `categories`(`parentCategoryId`);

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_parentCategoryId_fkey` FOREIGN KEY (`parentCategoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
