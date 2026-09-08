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
