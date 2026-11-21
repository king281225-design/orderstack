// Twitter needs its own file-convention image, separate from opengraph-image
// — a page that doesn't declare its own `twitter` metadata object otherwise
// keeps inheriting the root layout's hardcoded twitter.images, bypassing
// whatever opengraph-image this segment defines (confirmed by curling the
// live dev server: /pricing's og:image was correct but twitter:image still
// pointed at the old logo until this file existed).
export { default, alt, size, contentType } from "./opengraph-image";
