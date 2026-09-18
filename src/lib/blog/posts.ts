/**
 * Plain-data blog content — no MDX/CMS pipeline exists yet, and one post
 * doesn't justify adding one. Each post is a typed object rendered by
 * src/app/(marketing)/blog/[slug]/page.tsx; add a new entry here to publish
 * a new post, no new plumbing needed until this actually needs richer
 * formatting (inline links/bold) than plain paragraphs and bullet lists.
 */

export interface BlogSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface BlogFaq {
  q: string;
  a: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date, also used as the display date
  intro: string[];
  sections: BlogSection[];
  faqs: BlogFaq[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "reduce-zomato-swiggy-commission-restaurant",
    title: "How to Reduce Zomato & Swiggy Commission for Your Restaurant",
    description:
      "Aggregator commission eats into every order. Here's what actually drives that cost, and practical ways Indian restaurants are building a direct, commission-free ordering channel alongside Zomato and Swiggy.",
    publishedAt: "2026-09-18",
    intro: [
      "If you run a restaurant in India, you already know the number that keeps showing up smaller than it should on your Zomato or Swiggy payout: your own order total, minus commission, minus payment processing, minus whatever you spent on ads to get listed higher that week.",
      "Aggregators aren't going anywhere, and for a lot of restaurants they're still the biggest source of new customers. But \"biggest source of new customers\" and \"most profitable order\" are two different things — and the gap between them is exactly what this guide is about.",
    ],
    sections: [
      {
        heading: "Why aggregator commission is so high in the first place",
        paragraphs: [
          "It's worth being fair about what you're actually paying for. Zomato and Swiggy run a real logistics network (delivery riders, live tracking, support), a discovery engine (search, recommendations, ratings) that brings you customers who've never heard of you, and payment handling. None of that is free to run, and commission is how they fund it.",
          "The commission percentage itself isn't something we'll quote here as a fixed number — both platforms have changed their rate structures over time, they vary by city and plan, and the only accurate number is whatever your own current agreement says. What's consistent across almost every restaurant we've talked to is the shape of the problem: commission, plus a payment gateway cut, plus optional ad spend to stay visible, adds up to a meaningfully large slice of every order — often enough to turn a busy night into a break-even one.",
        ],
      },
      {
        heading: "The real cost isn't just the commission line item",
        paragraphs: [
          "Three things compound on top of the headline commission rate:",
        ],
        list: [
          "Payment gateway / processing charges on top of the platform's own cut",
          "Ad spend or \"promoted\" placement, which many restaurants end up treating as close to mandatory just to stay visible against competitors on the same street",
          "No direct relationship with the customer — the aggregator owns the phone number, the order history, and the ability to remarket to that customer. You can't message a Zomato customer directly to tell them about tonight's special.",
        ],
      },
      {
        heading: "5 practical ways to cut your dependency on commission",
        paragraphs: [
          "None of these mean dropping Zomato or Swiggy — for most restaurants that's not realistic, and it isn't what this guide is suggesting. The goal is to stop paying commission on orders that don't need to go through an aggregator at all.",
        ],
        list: [
          "Build a direct ordering channel — a link or QR code that goes straight to your own menu, with no middleman taking a cut of the order. Put it on receipts, table tents, packaging, and your Instagram bio.",
          "Use aggregators for discovery, your own channel for retention. A first-time customer might find you on Zomato — but the second, third, and tenth order from that same customer doesn't have to.",
          "Give a small reason to order direct — a modest discount or a free add-on for orders placed through your own link costs you far less than the commission you'd otherwise pay an aggregator on that same order.",
          "For dine-in, put a QR code on the table that opens your own menu directly — no app download, no commission, no waiting for a waiter to take the order down.",
          "Track margin by channel, not just revenue by channel. A ₹500 aggregator order and a ₹500 direct order are not the same ₹500 once commission and gateway fees come out.",
        ],
      },
      {
        heading: "What a direct ordering channel actually looks like",
        paragraphs: [
          "This is the part that used to require a developer, a custom app, or a POS vendor's enterprise sales call. It doesn't anymore. A direct ordering channel for a restaurant is: a branded menu page at your own link, a way for customers to pay (UPI QR code or cash on delivery both work without a payment gateway cut), and a place for you to see and manage incoming orders as they come in.",
          "That's the entire product BhojSetu is built around — a public storefront at your own link (yourrestaurant.bhojsetu.in, or your own domain), QR table ordering for dine-in, UPI/COD checkout with no per-order commission, and a live order dashboard, for a flat monthly fee starting at ₹499. You keep the customer relationship, the order data, and the margin.",
        ],
      },
    ],
    faqs: [
      {
        q: "Should I leave Zomato and Swiggy entirely?",
        a: "For most restaurants, no — aggregators are still a real source of new-customer discovery. The practical approach is running a direct ordering channel alongside them, so repeat customers and dine-in/QR orders don't have to pay aggregator commission at all.",
      },
      {
        q: "How much can a direct ordering channel actually save?",
        a: "It depends entirely on how much of your volume you can shift to direct ordering — every order placed through your own link or table QR code instead of an aggregator keeps the commission that order would otherwise have cost. Repeat customers, who already know and trust you, are usually the easiest to move first.",
      },
      {
        q: "Do I need a developer to set up my own ordering page?",
        a: "No. Platforms like BhojSetu let a restaurant owner sign up, build a menu (by hand, by uploading a photo of a paper menu, or with AI-assisted import), set branding, and get a live storefront link — no code and no developer required.",
      },
      {
        q: "Can customers still pay online without a payment gateway commission?",
        a: "Yes — a UPI QR code is a direct bank-to-bank transfer with no gateway commission. Cash on delivery works the same way it always has. Both are supported on a direct ordering channel without the per-order cut an aggregator or card gateway would take.",
      },
    ],
  },
  {
    slug: "qr-code-table-ordering-guide",
    title: "QR Code Table Ordering for Restaurants: The Complete Guide",
    description:
      "What QR code table ordering actually is, how it works end to end, and what a restaurant needs to set it up — from a customer scanning a code to the kitchen seeing the order.",
    publishedAt: "2026-09-18",
    intro: [
      "Walk into most new restaurants and cafes today and you'll see it on the table before the waiter even gets to you: a small printed square, sometimes with \"Scan to order\" underneath. That's QR code table ordering, and it's gone from a pandemic-era workaround to a standard part of how dine-in works.",
      "This guide covers what it actually is, how it works from a customer's first scan to a plate landing on their table, and what a restaurant genuinely needs to set it up — no jargon, no assuming you've already got a POS system.",
    ],
    sections: [
      {
        heading: "What QR code table ordering actually is",
        paragraphs: [
          "At its simplest: each table gets a unique QR code. A customer scans it with their phone's own camera — no app to download — and it opens a web page showing that restaurant's menu, with the table number already attached. They browse, add items to a cart, and either place the order directly or (depending on how the restaurant has it set up) place it and pay at the same time.",
          "The order lands on the restaurant's own order dashboard or kitchen screen in real time, with the table number attached, so staff know exactly where it's going without anyone having to walk it over.",
        ],
      },
      {
        heading: "How it works, step by step",
        paragraphs: ["The actual flow, from a customer sitting down to their order reaching the kitchen:"],
        list: [
          "Customer sits down and scans the QR code on the table with their phone camera",
          "Their phone's browser opens the restaurant's menu page, with the table number already captured from the code",
          "They browse categories, add items to a cart, and adjust quantities — same as any online store",
          "At checkout, dine-in is pre-selected with the table number already filled in — nothing to type",
          "They place the order (and pay via UPI QR or cash on delivery, if that's offered) — no waiter needed to take it down",
          "The order appears instantly on the restaurant's order dashboard or kitchen display, tagged with the table number",
        ],
      },
      {
        heading: "Why restaurants are adopting it",
        paragraphs: [
          "The appeal isn't just novelty — it solves a handful of real, everyday friction points:",
        ],
        list: [
          "Faster ordering — no waiting for a waiter to be free, especially during a rush",
          "Fewer order mistakes — the customer types their own order instead of it being relayed verbally and written down by hand",
          "Lower staffing pressure — the same floor staff can serve more tables since order-taking isn't tying them up",
          "Easy upsells — a well-organized digital menu with photos tends to encourage add-ons more than a laminated paper one",
          "A menu that's actually easy to update — change a price or mark something sold out from a dashboard, instead of reprinting laminated cards",
        ],
      },
      {
        heading: "Common concerns, addressed honestly",
        paragraphs: [
          "QR ordering isn't a fit for every table or every guest, and it's worth being upfront about the real limits rather than pretending there aren't any.",
        ],
        list: [
          "Older or less phone-comfortable customers — a printed menu (or a staff member offering to help) as a backup covers this; QR ordering doesn't have to be the only option at the table.",
          "Patchy restaurant WiFi — the menu page runs over the customer's own mobile data, not restaurant WiFi, so a weak in-house network doesn't block it.",
          "\"It feels impersonal\" — most restaurants that adopt it keep staff on the floor for service, drinks, and questions; QR ordering replaces order-taking, not hospitality.",
        ],
      },
      {
        heading: "What you actually need to set it up",
        paragraphs: [
          "This is the part that surprises most restaurant owners: it's not a hardware project. There's no special printer, no tablet mounted at every table, no app for staff to learn. What's actually needed is three things — a digital menu, a unique QR code per table that links to it with the table number attached, and somewhere for the resulting orders to land.",
          "In BhojSetu, that's built in end to end: build your menu once, generate a QR code for as many tables as you have from your dashboard (print the grid, done), and every scan opens your storefront with the table pre-filled at checkout. Orders land on your live dashboard or kitchen display the moment they're placed. Setup is typically under 15 minutes for a restaurant that already has its menu written down somewhere.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do customers need to download an app to use QR table ordering?",
        a: "No. Scanning the code opens a normal web page in the phone's existing browser — nothing to install, and it works the same on any smartphone.",
      },
      {
        q: "Does QR ordering replace waiters?",
        a: "No — it replaces order-taking, not service. Most restaurants keep floor staff for serving food and drinks, answering questions, and general hospitality; QR ordering just removes the step of a waiter manually writing down what a table wants.",
      },
      {
        q: "What happens if a customer doesn't want to use it?",
        a: "Nothing stops a restaurant from also offering a printed menu or having a staff member take the order the traditional way at the same table — QR ordering is an additional option, not a requirement.",
      },
      {
        q: "Is QR ordering only useful for dine-in?",
        a: "Dine-in table ordering is the most common use, but the same underlying menu and storefront also work for takeaway and delivery — a restaurant isn't building three separate systems for three order types.",
      },
      {
        q: "How long does it take to set up QR table ordering for a restaurant?",
        a: "With a platform like BhojSetu, typically under 15 minutes once your menu items and prices are ready — sign up, add your menu, generate and print a QR code per table.",
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
