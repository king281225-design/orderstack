-- Dyno's real client ("dapis" — confirmed by reading its shipped source,
-- resources/app/utils.js) treats GET /api/dyno/[restaurantId]/orders/status
-- as a one-time action queue (accept/ready/reject), not a status display —
-- these three timestamps mark "already asked for this action" so the route
-- never asks twice. Each is its own single-column ALTER for TiDB safety,
-- same convention as every other migration in this project.

ALTER TABLE `orders` ADD COLUMN `dynoAcceptRequestedAt` DATETIME(3) NULL;
ALTER TABLE `orders` ADD COLUMN `dynoReadyRequestedAt` DATETIME(3) NULL;
ALTER TABLE `orders` ADD COLUMN `dynoRejectRequestedAt` DATETIME(3) NULL;
