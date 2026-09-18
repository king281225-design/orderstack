import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeInitScript } from "@/components/theme/theme-init-script";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { WHATSAPP_URL, PHONE_TEL } from "@/lib/contact";
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

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/brand/front-page-logo.png`,
  sameAs: [WHATSAPP_URL],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: PHONE_TEL.replace("tel:", ""),
    contactType: "customer service",
  },
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
