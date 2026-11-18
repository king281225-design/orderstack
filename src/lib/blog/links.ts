/**
 * Internal-linking config for blog posts. The posts themselves are plain
 * strings (no inline-link syntax), so contextual links are added at render
 * time: the first mention of each phrase below becomes a link to the matching
 * page, at most once per post, never to the post's own URL.
 */

export interface AutoLink {
  href: string;
  /** Anchor phrases matched case-insensitively on word boundaries. */
  phrases: string[];
}

export const AUTO_LINKS: AutoLink[] = [
  {
    href: "/blog/kitchen-order-tickets-kot-explained",
    phrases: ["kitchen order tickets", "kitchen order ticket", "KOT"],
  },
  {
    href: "/blog/restaurant-inventory-management-guide-india",
    phrases: ["restaurant inventory management", "inventory management", "low-stock alerts"],
  },
  {
    href: "/blog/qr-code-table-ordering-guide",
    phrases: ["QR code table ordering", "QR table ordering", "QR code ordering"],
  },
  {
    href: "/compare/bhojsetu-vs-petpooja",
    phrases: ["Petpooja"],
  },
  {
    href: "/blog/best-restaurant-billing-software-india",
    phrases: ["restaurant billing software", "billing software"],
  },
  {
    href: "/blog/restaurant-software-cost-india",
    phrases: ["restaurant software cost", "software pricing"],
  },
  {
    href: "/blog/reduce-zomato-swiggy-commission-restaurant",
    phrases: ["aggregator commission", "Zomato and Swiggy commission"],
  },
  {
    href: "/pricing",
    phrases: ["BhojSetu pricing", "flat monthly plan"],
  },
];

/** Max contextual links injected into a single post, so the copy never reads as link-stuffed. */
export const MAX_AUTO_LINKS_PER_POST = 6;

/** Hand-picked "keep reading" posts per slug (topic clusters); falls back to the newest other posts. */
export const RELATED_POSTS: Record<string, string[]> = {
  "reduce-zomato-swiggy-commission-restaurant": [
    "qr-code-table-ordering-guide",
    "best-restaurant-billing-software-india",
    "restaurant-software-cost-india",
  ],
  "qr-code-table-ordering-guide": [
    "qr-table-ordering-delhi",
    "kitchen-order-tickets-kot-explained",
    "reduce-zomato-swiggy-commission-restaurant",
  ],
  "restaurant-billing-ordering-software-india-buyers-guide": [
    "best-restaurant-billing-software-india",
    "restaurant-software-cost-india",
    "petpooja-alternatives",
  ],
  "qr-table-ordering-delhi": [
    "qr-code-table-ordering-guide",
    "kitchen-order-tickets-kot-explained",
    "best-restaurant-billing-software-india",
  ],
  "best-restaurant-billing-software-india": [
    "petpooja-alternatives",
    "restaurant-software-cost-india",
    "restaurant-billing-ordering-software-india-buyers-guide",
  ],
  "petpooja-alternatives": [
    "best-restaurant-billing-software-india",
    "restaurant-software-cost-india",
    "restaurant-billing-ordering-software-india-buyers-guide",
  ],
  "restaurant-software-cost-india": [
    "best-restaurant-billing-software-india",
    "petpooja-alternatives",
    "restaurant-billing-ordering-software-india-buyers-guide",
  ],
  "chhote-restaurant-ke-liye-billing-software": [
    "restaurant-billing-ordering-software-india-buyers-guide",
    "best-restaurant-billing-software-india",
    "qr-code-table-ordering-guide",
  ],
  "kitchen-order-tickets-kot-explained": [
    "restaurant-inventory-management-guide-india",
    "qr-code-table-ordering-guide",
    "restaurant-billing-ordering-software-india-buyers-guide",
  ],
  "restaurant-inventory-management-guide-india": [
    "kitchen-order-tickets-kot-explained",
    "restaurant-billing-ordering-software-india-buyers-guide",
    "best-restaurant-billing-software-india",
  ],
};
