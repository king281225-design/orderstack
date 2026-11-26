/**
 * The ONE switch for the Christmas season. While true:
 * - the public marketing site shows its Christmas theme, and
 * - every restaurant's storefront and dashboard get it too, via the
 *   "christmasCampaign" Feature (src/lib/plans.ts). A super-admin can still
 *   "Force off" a single restaurant.
 *
 * Flip to false once the season ends — everything reverts with no other code
 * change (a restaurant explicitly "Forced on" keeps its theme until that
 * override is cleared).
 */
export const CHRISTMAS_THEME_ENABLED = true;
