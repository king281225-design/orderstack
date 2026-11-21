import { InstagramIcon, FacebookIcon, GoogleIcon } from "@/components/storefront/social-icons";
import { nowMs } from "@/lib/time";

/**
 * Shown on every /r/[slug]/* page (menu, checkout, order status) via the
 * shared layout — reuses whatever the owner already entered in Settings
 * (address, socials, Google rating) rather than adding a separate set of
 * "footer" fields to fill in twice.
 */
export function StorefrontFooter({
  name,
  tagline,
  businessAddress,
  instagramUrl,
  facebookUrl,
  googleReviewUrl,
}: {
  name: string;
  tagline: string | null;
  businessAddress: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  googleReviewUrl: string | null;
}) {
  const hasSocials = Boolean(instagramUrl || facebookUrl || googleReviewUrl);

  return (
    <footer className="mt-6 border-t border-black/10 bg-black/[0.02] px-4 py-6 text-center">
      <p className="text-sm font-semibold text-gray-900">{name}</p>
      {tagline && <p className="text-xs text-gray-500">{tagline}</p>}
      {businessAddress && <p className="mt-1 text-xs text-gray-500">{businessAddress}</p>}

      {hasSocials && (
        <div className="mt-3 flex items-center justify-center gap-3">
          {instagramUrl && (
            <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" title="Instagram">
              <InstagramIcon className="inline-flex h-8 w-8 items-center justify-center rounded-full" />
            </a>
          )}
          {facebookUrl && (
            <a href={facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook" title="Facebook">
              <FacebookIcon className="inline-flex h-8 w-8 items-center justify-center rounded-full" />
            </a>
          )}
          {googleReviewUrl && (
            <a href={googleReviewUrl} target="_blank" rel="noreferrer" aria-label="Rate us on Google" title="Rate us on Google">
              <GoogleIcon className="inline-flex h-8 w-8 items-center justify-center rounded-full shadow-sm" />
            </a>
          )}
        </div>
      )}

      <p className="mt-4 text-[11px] text-gray-500">
        © {new Date(nowMs()).getFullYear()} {name} · Powered by BhojSetu
      </p>
    </footer>
  );
}
