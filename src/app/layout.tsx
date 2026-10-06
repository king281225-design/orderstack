import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeInitScript } from "@/components/theme/theme-init-script";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { WHATSAPP_URL, PHONE_TEL, BUSINESS_NAME, BUSINESS_FOUNDER, BUSINESS_EMAIL, BUSINESS_ADDRESS } from "@/lib/contact";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DEFAULT_TITLE = "BhojSetu — Online Ordering & QR Menu Platform for Restaurants";
const DEFAULT_DESCRIPTION =
  "BhojSetu is a restaurant ordering platform: a public online menu, QR table ordering, a live order dashboard, and UPI/COD checkout — get your restaurant taking orders online in minutes.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: `%s · ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: "/brand/front-page-logo.png" }],
  },
  twitter: {
    card: "summary",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/brand/front-page-logo.png"],
  },
};

// Exported so other pages (e.g. the homepage's SoftwareApplication JSON-LD)
// can reference this exact entity as `publisher: { "@id": ORG_JSON_LD_ID }`
// instead of repeating the Organization's fields inline.
export const ORG_JSON_LD_ID = `${SITE_URL}/#org`;

// The legal operating entity is Rajat Digital Agency; BhojSetu is its
// product/brand name — kept distinct via `brand` (per the visibility audit's
// recommended schema) so this doesn't read as a business named "BhojSetu".
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_JSON_LD_ID,
  name: BUSINESS_NAME,
  brand: { "@type": "Brand", name: SITE_NAME },
  url: SITE_URL,
  logo: `${SITE_URL}/brand/front-page-logo.png`,
  founder: { "@type": "Person", name: BUSINESS_FOUNDER },
  email: BUSINESS_EMAIL,
  telephone: PHONE_TEL.replace("tel:", ""),
  address: {
    "@type": "PostalAddress",
    ...BUSINESS_ADDRESS,
  },
  sameAs: [WHATSAPP_URL],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: PHONE_TEL.replace("tel:", ""),
    contactType: "customer service",
  },
};

// Fit edge-to-edge on notched iPhones/iPads (paired with the safe-area padding
// in globals.css); pinch-zoom stays allowed for accessibility.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeInitScript />
        <JsonLd data={organizationJsonLd} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
