import { PLAN_DEFINITIONS, PLAN_TIERS, getAnnualPricing } from "@/lib/plans";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import {
  BUSINESS_NAME,
  BUSINESS_FOUNDER,
  BUSINESS_EMAIL,
  BUSINESS_ADDRESS_DISPLAY,
  PHONE_DISPLAY,
  WHATSAPP_URL,
  SUPPORT_RESPONSE_TARGET,
  DEMO_STOREFRONT_SLUG,
} from "@/lib/contact";
import { HOME_FAQS } from "@/lib/home-faqs";
import { BLOG_POSTS } from "@/lib/blog/posts";

/**
 * Everything an AI agent is allowed to learn about BhojSetu, in one place.
 * Read by: the Markdown representation (`Accept: text/markdown`), /llms.txt,
 * the read-only MCP server (/mcp + its Server Card) and the in-browser WebMCP
 * tools. All of it is already public on the marketing site — prices come from
 * PLAN_DEFINITIONS (the same source as /pricing and checkout), never retyped
 * here, so this can't drift from what a visitor is actually charged.
 *
 * Deliberately PUBLIC, READ-ONLY marketing facts only: nothing here touches
 * the database, a session, or any restaurant's private data.
 */

export const SERVER_VERSION = "1.0.0";

export const HOME_TITLE = "BhojSetu — Restaurant Ordering & Billing Software for India";

export const PRODUCT_SUMMARY =
  "BhojSetu is restaurant ordering and billing software for India, built and operated by Rajat Digital Agency. Restaurants get their own online storefront (bhojsetu.in/r/their-name), QR table ordering, KOT by kitchen station, GST-ready billing, inventory with low-stock alerts, and UPI/COD checkout. Flat monthly plans, no per-order commission. 7-day free trial, no credit card required.";

export const KEY_FEATURES = [
  "Online storefront for every restaurant at bhojsetu.in/r/<name> — customers order in the browser, no app to install",
  "QR table ordering for dine-in, with the table number pre-filled at checkout",
  "KOT (kitchen order tickets) split by kitchen station, printable on thermal printers",
  "GST-ready billing and printable invoices, including manual bills for walk-ins",
  "Inventory and stock tracking with low-stock alerts",
  "UPI QR and cash-on-delivery checkout",
  "AI-assisted menu import from a photo or PDF of a paper menu",
  "Live order dashboard with accept → preparing → ready → complete flow",
];

export const NOT_TO_BE_CONFUSED =
  'Not to be confused with "Bhojan Setu" (a different, unrelated product) or the Raja Bhoj Setu bridge in Bhopal.';

const inr = (cents: number) => `₹${(cents / 100).toLocaleString("en-IN")}`;

export type PricingPlan = {
  tier: string;
  name: string;
  monthlyInr: number;
  annualInr: number;
  annualFirstYearInr: number;
  features: string[];
};

export function getPricing(): { currency: "INR"; trial: string; plans: PricingPlan[]; url: string } {
  return {
    currency: "INR",
    trial: "7-day free trial on every new account, no credit card required",
    plans: PLAN_TIERS.filter((t) => PLAN_DEFINITIONS[t].status === "ACTIVE").map((tier) => {
      const def = PLAN_DEFINITIONS[tier];
      const annual = getAnnualPricing(tier);
      return {
        tier,
        name: def.label,
        monthlyInr: def.priceCents / 100,
        annualInr: annual.renewalCents / 100,
        annualFirstYearInr: annual.firstYearCents / 100,
        features: def.features,
      };
    }),
    url: `${SITE_URL}/pricing`,
  };
}

export function getContact() {
  return {
    business: BUSINESS_NAME,
    founder: BUSINESS_FOUNDER,
    phoneAndWhatsApp: PHONE_DISPLAY,
    whatsappUrl: WHATSAPP_URL,
    email: BUSINESS_EMAIL,
    address: BUSINESS_ADDRESS_DISPLAY,
    supportResponseTarget: SUPPORT_RESPONSE_TARGET,
    contactPage: `${SITE_URL}/contact`,
  };
}

export function getOverview() {
  return {
    name: SITE_NAME,
    url: SITE_URL,
    summary: PRODUCT_SUMMARY,
    features: KEY_FEATURES,
    pricing: getPricing(),
    signup: `${SITE_URL}/signup`,
    notToBeConfusedWith: NOT_TO_BE_CONFUSED,
  };
}

/** FAQ entries, optionally filtered by a case-insensitive keyword match on question + answer. */
export function searchFaq(query?: string) {
  const q = query?.trim().toLowerCase();
  const items = q ? HOME_FAQS.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(q)) : HOME_FAQS;
  return items.map((f) => ({ question: f.q, answer: f.a }));
}

/** The public pages agents may point people to. Single list for llms.txt, Markdown and WebMCP navigation. */
export const PUBLIC_PAGES: { key: string; title: string; path: string; description: string }[] = [
  { key: "home", title: "Home", path: "/", description: "What BhojSetu is and who it's for" },
  { key: "pricing", title: "Pricing", path: "/pricing", description: "Starter, Advanced and Business plans, monthly or annual" },
  { key: "signup", title: "Start a free trial", path: "/signup", description: "Create a restaurant account — 7-day free trial, no card" },
  { key: "demo", title: "Live demo storefront", path: `/r/${DEMO_STOREFRONT_SLUG}`, description: "A working demo restaurant you can browse and order from" },
  { key: "about", title: "About", path: "/about", description: "Who builds and runs BhojSetu" },
  { key: "contact", title: "Contact", path: "/contact", description: "Phone, WhatsApp, email and address" },
  { key: "blog", title: "Blog", path: "/blog", description: "Guides for Indian restaurant owners" },
  { key: "compare-petpooja", title: "BhojSetu vs Petpooja", path: "/compare/bhojsetu-vs-petpooja", description: "Side-by-side comparison" },
  { key: "compare-dineopen", title: "BhojSetu vs DineOpen", path: "/compare/bhojsetu-vs-dineopen", description: "Side-by-side comparison" },
];

export function getBlogLinks() {
  return BLOG_POSTS.map((p) => ({ title: p.title, url: `${SITE_URL}/blog/${p.slug}`, description: p.description }));
}

/** Markdown for the pages that support `Accept: text/markdown`. */
export function buildMarkdown(page: "home" | "pricing"): string {
  const pricing = getPricing();
  const planTable = [
    "| Plan | Monthly | Annual (first year / renewal) |",
    "|---|---|---|",
    ...pricing.plans.map(
      (p) =>
        `| ${p.name} | ${inr(p.monthlyInr * 100)} | ${inr(p.annualFirstYearInr * 100)} / ${inr(p.annualInr * 100)} |`,
    ),
  ].join("\n");
  const planDetails = pricing.plans
    .map((p) => `### ${p.name} — ${inr(p.monthlyInr * 100)}/month\n\n${p.features.map((f) => `- ${f}`).join("\n")}`)
    .join("\n\n");

  if (page === "pricing") {
    return [
      "# BhojSetu pricing",
      "",
      `> Flat monthly plans for restaurants in India, no per-order commission. ${pricing.trial}.`,
      "",
      planTable,
      "",
      planDetails,
      "",
      `Start a free trial: ${SITE_URL}/signup`,
      `Full details: ${SITE_URL}/pricing`,
      "",
    ].join("\n");
  }

  const faq = HOME_FAQS.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n");
  const pages = PUBLIC_PAGES.map((p) => `- [${p.title}](${SITE_URL}${p.path}): ${p.description}`).join("\n");
  const contact = getContact();
  return [
    `# ${HOME_TITLE}`,
    "",
    `> ${PRODUCT_SUMMARY}`,
    "",
    NOT_TO_BE_CONFUSED,
    "",
    "## What you get",
    "",
    KEY_FEATURES.map((f) => `- ${f}`).join("\n"),
    "",
    "## Pricing",
    "",
    planTable,
    "",
    `${pricing.trial}. Details: ${SITE_URL}/pricing`,
    "",
    "## FAQ",
    "",
    faq,
    "",
    "## Pages",
    "",
    pages,
    "",
    "## Contact",
    "",
    `- ${contact.business} (founder: ${contact.founder})`,
    `- Phone / WhatsApp: ${contact.phoneAndWhatsApp}`,
    `- Email: ${contact.email}`,
    `- Address: ${contact.address}`,
    "",
  ].join("\n");
}
