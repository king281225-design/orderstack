-- DropForeignKey
ALTER TABLE `ingredients` DROP FOREIGN KEY `ingredients_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `purchase_lines` DROP FOREIGN KEY `purchase_lines_matchedIngredientId_fkey`;

-- DropForeignKey
ALTER TABLE `recipe_lines` DROP FOREIGN KEY `recipe_lines_ingredientId_fkey`;

-- DropForeignKey
ALTER TABLE `recipe_lines` DROP FOREIGN KEY `recipe_lines_itemId_fkey`;

-- DropForeignKey
ALTER TABLE `recipe_lines` DROP FOREIGN KEY `recipe_lines_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `stock_movements` DROP FOREIGN KEY `stock_movements_ingredientId_fkey`;

-- DropForeignKey
ALTER TABLE `stock_movements` DROP FOREIGN KEY `stock_movements_tenantId_fkey`;

-- DropIndex
DROP INDEX `purchase_lines_matchedIngredientId_idx` ON `purchase_lines`;

-- AlterTable
ALTER TABLE `purchase_lines` DROP COLUMN `matchKind`,
    DROP COLUMN `matchedIngredientId`;

-- DropTable
DROP TABLE `ingredients`;

-- DropTable
DROP TABLE `recipe_lines`;

-- DropTable
DROP TABLE `stock_movements`;

