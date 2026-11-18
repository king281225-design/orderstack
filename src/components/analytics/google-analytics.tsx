import Script from "next/script";

// Google Analytics 4 measurement ID for bhojsetu.in (GA4 property "bhojsetu.in",
// account "BhojSetu"). Can be overridden per environment via
// NEXT_PUBLIC_GA_MEASUREMENT_ID (e.g. set it to an empty string on Vercel
// Preview deployments to keep preview traffic out of the real property).
const DEFAULT_GA_MEASUREMENT_ID = "G-5GR56VBJMS";

export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? DEFAULT_GA_MEASUREMENT_ID;
  if (!id) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
