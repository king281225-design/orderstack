/**
 * Shared layout for every generated opengraph-image.tsx / twitter-image.tsx
 * across the marketing site — same brand gradient (the real --color-indigo-600
 * → --color-violet-600 tokens from globals.css, which are orange despite the
 * "indigo"/"violet" names) and type treatment, different copy per route.
 * Deliberately text-only (no embedded raster logo) — the existing brand PNGs
 * are 500KB-1MB, which would bloat every generated image for no real gain;
 * a wordmark in Satori-rendered text looks crisp and costs nothing.
 */
export function ogImageTemplate({
  heading,
  subheading,
  badge = "7-day free trial · No credit card required",
}: {
  heading: string;
  subheading: string;
  badge?: string | null;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: 80,
        textAlign: "center",
        background: "linear-gradient(135deg, #e85d04 0%, #d9480a 100%)",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: "#ffffff",
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "rgba(255,255,255,0.18)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
          }}
        >
          🍽️
        </div>
        BhojSetu
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 64,
          fontWeight: 800,
          color: "#ffffff",
          lineHeight: 1.15,
          maxWidth: 980,
        }}
      >
        {heading}
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 32,
          color: "rgba(255,255,255,0.92)",
          maxWidth: 880,
          lineHeight: 1.3,
        }}
      >
        {subheading}
      </div>

      {badge && (
        <div
          style={{
            display: "flex",
            marginTop: 12,
            padding: "14px 32px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.16)",
            color: "#ffffff",
            fontSize: 26,
            fontWeight: 600,
          }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_CONTENT_TYPE = "image/png";
