-- AlterTable
ALTER TABLE `orders` ADD COLUMN `paymentStatus` ENUM('PENDING', 'PAID', 'FAILED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `razorpayOrderId` VARCHAR(191) NULL,
    ADD COLUMN `razorpayPaymentId` VARCHAR(191) NULL,
    MODIFY `paymentMethod` ENUM('UPI', 'COD', 'RAZORPAY') NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `orders_razorpayOrderId_key` ON `orders`(`razorpayOrderId`);

