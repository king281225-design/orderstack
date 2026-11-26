/**
 * The ONE switch for the public marketing site's Christmas theme
 * (src/app/(marketing)/layout.tsx) — unlike the storefront/dashboard theme,
 * which is gated per-tenant via the "christmasCampaign" Feature
 * (src/lib/plans.ts), the marketing site has no tenant to gate by: it's
 * BhojSetu's own platform site. Flip this back to false (or delete the
 * season entirely) once the campaign ends — every place that reads it
 * reverts to the plain site with no other code change needed.
 */
export const CHRISTMAS_THEME_ENABLED = true;
