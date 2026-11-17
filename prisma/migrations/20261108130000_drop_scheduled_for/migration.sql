-- Removes Order.scheduledFor — the "schedule for later" demo feature was
-- reverted at the user's request (2026-11-08) before it shipped past local
-- preview. Hand-placed for the same reason as the migration that added it
-- (an unrelated pre-existing drift issue blocks `prisma migrate dev`).
ALTER TABLE `orders` DROP COLUMN `scheduledFor`;
