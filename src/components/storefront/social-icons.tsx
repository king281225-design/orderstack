/**
 * Small, real (not emoji) glyphs for the storefront's socials row — plain
 * "Instagram"/"Facebook" text links read as an afterthought; a recognizable
 * icon in each platform's own color reads as a real presence. Inline SVG,
 * no icon-font/library dependency for two shapes.
 */

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        background: "linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[55%] w-[55%]" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="white" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
      </svg>
    </span>
  );
}

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <span className={className} style={{ backgroundColor: "#1877F2" }}>
      <svg viewBox="0 0 24 24" fill="white" className="h-[55%] w-[55%]" aria-hidden>
        <path d="M13.5 21v-7.5H16l.5-3H13.5V8.5c0-.9.25-1.5 1.55-1.5H16.5V4.3c-.27-.04-1.2-.12-2.28-.12-2.26 0-3.8 1.38-3.8 3.9V10.5H8v3h2.42V21h3.08z" />
      </svg>
    </span>
  );
}

/**
 * Google's own four-color "G" mark (the same glyph Google uses on its own
 * sign-in buttons) — shown on a plain white disc with a hairline border,
 * since the logo itself already carries the color; a solid brand-color
 * background (like Instagram/Facebook above) isn't how Google's own
 * guidelines present it.
 */
export function GoogleIcon({ className }: { className?: string }) {
  return (
    <span className={className} style={{ backgroundColor: "white", border: "1px solid #e5e7eb" }}>
      <svg viewBox="0 0 48 48" className="h-[55%] w-[55%]" aria-hidden>
        <path
          fill="#FFC107"
          d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20c11.045 0 20-8.955 20-20 0-1.341-.138-2.65-.389-3.917z"
        />
        <path
          fill="#FF3D00"
          d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C40.971 35.205 44 30 44 24c0-1.341-.138-2.65-.389-3.917z"
        />
      </svg>
    </span>
  );
}
