// A real photo or PDF of a paper menu routinely runs this big — a
// client-side check surfaces a clear message immediately instead of
// uploading the whole file only for the server's own body-size limit to
// reject it with a raw, confusing error (same reasoning as the existing
// hardcopy-menu-upload form's own guard).
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const MAX_WIZARD_FILES = 10;

// Deliberately isomorphic (no "server-only") — unlike the rest of
// src/lib/ai/menu-import.ts, these two constants are also needed at runtime
// by client components (the Verify step's tag checkboxes/confidence
// threshold), so they live here rather than in that server-only module.
// menu-import.ts imports them from here rather than redefining them.
export const ALLOWED_TAGS = ["Bestseller", "Chef Special", "Spicy", "New", "Recommended", "Combo"] as const;
export type MenuItemTag = (typeof ALLOWED_TAGS)[number];

// Below this, an item is flagged for the owner's review even if it does have
// a price — a genuinely unpriced item is always flagged regardless.
export const REVIEW_CONFIDENCE_THRESHOLD = 0.6;
