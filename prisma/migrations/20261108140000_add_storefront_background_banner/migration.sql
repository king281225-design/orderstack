-- Hand-placed for the same reason as the earlier loyalty/scheduling
-- migrations this session — an unrelated pre-existing drift issue blocks
-- `prisma migrate dev` from running normally against this dev database.
ALTER TABLE `tenants` ADD COLUMN `backgroundImageUrl` TEXT NULL;
ALTER TABLE `tenants` ADD COLUMN `bannerImageUrl` TEXT NULL;
