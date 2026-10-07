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
  /** BCP 47 language tag for this post's body copy. Defaults to "en" when omitted — only set for a non-English post (e.g. "hi"), so the page can set a correct lang attribute on its content for accessibility/SEO instead of inheriting the root layout's hardcoded lang="en". */
  lang?: string;
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
  {
    slug: "restaurant-billing-ordering-software-india-buyers-guide",
    title: "Restaurant Billing & Ordering Software in India: A Practical Buyer's Guide (2026)",
    description:
      "What actually matters when comparing restaurant billing and ordering software in India — pricing models, GST invoicing, KOT, inventory, and a checklist to run before you sign up for anything.",
    publishedAt: "2026-09-28",
    intro: [
      "Search for \"restaurant software\" or \"restaurant billing software India\" and you'll get a long list of vendors, most of them claiming to be the best fit for every restaurant everywhere. That's not a useful way to compare anything — a 20-table dine-in restaurant, a delivery-only cloud kitchen, and a bakery counter need genuinely different things.",
      "This guide skips the marketing language and lays out what to actually check before picking anything: what a real restaurant needs the software to cover, which pricing details tend to hide the real cost, and a practical checklist to run through before you commit.",
    ],
    sections: [
      {
        heading: "What \"restaurant software\" actually needs to cover",
        paragraphs: [
          "The phrase gets used for a lot of different things — a QR menu maker, a POS terminal, an inventory tool, an aggregator's own restaurant dashboard. A genuinely complete platform for a restaurant taking real orders day to day covers all of the following, not just one of them:",
        ],
        list: [
          "A public ordering menu customers can actually order from — not just a PDF or photo of the menu",
          "Dine-in table ordering (usually via a QR code) alongside takeaway and delivery",
          "Billing and invoicing that's GST-ready, not just a total at the bottom of a receipt",
          "Kitchen order tickets (KOT) so the kitchen sees exactly what was ordered, not a verbal relay",
          "Basic inventory/stock tracking, so a sold-out item doesn't get ordered anyway",
          "A way for customers to actually pay — UPI and cash on delivery, at minimum",
        ],
      },
      {
        heading: "Pricing models — the detail that's easy to miss",
        paragraphs: [
          "Two restaurants can pay wildly different real costs for what looks like the same software, and it usually comes down to three things buried below the headline price:",
        ],
        list: [
          "Per-device or per-login limits — some plans charge extra the moment a second staff member needs to log in at the same time, which matters a lot once you have both a counter and a kitchen screen running",
          "Setup or onboarding fees charged separately from the monthly price",
          "A payment gateway commission on top of the software's own fee — a UPI QR code or cash payment has no such cut, but a card/online-payment gateway usually does",
        ],
      },
      {
        heading: "GST billing and invoicing — non-negotiable, not a nice-to-have",
        paragraphs: [
          "A restaurant is a real, taxable business, and \"we'll add GST later\" is a common gap in cheaper or newer tools. Before signing up, check that the platform can actually generate a proper invoice — your business name, address and GSTIN on it, the tax rate applied correctly, and a real invoice number you could hand to a tax auditor without embarrassment. A tool that only prints a plain total isn't billing software, it's a receipt printer.",
        ],
      },
      {
        heading: "Inventory and KOT — where a lot of \"order management\" tools stop short",
        paragraphs: [
          "Plenty of ordering tools handle the customer-facing menu well and stop there. Two things worth checking specifically, because they're the difference between \"an ordering page\" and \"something that runs your kitchen\":",
        ],
        list: [
          "Kitchen Order Tickets (KOT) — does the kitchen get a clear, printed or on-screen ticket per order (ideally split by station — grill, bar, dessert), or does someone have to relay the order verbally?",
          "Stock tracking — does selling an item actually reduce its stock count, and does the system warn you (or hide the item) once it's genuinely out, or is \"sold out\" still something a staff member has to remember and mention?",
        ],
      },
      {
        heading: "A practical checklist before you sign up",
        paragraphs: [
          "Run through this list against any platform you're evaluating, including BhojSetu, before committing:",
        ],
        list: [
          "Can I see a real, working demo storefront — not just screenshots?",
          "Does the printed invoice actually show GST correctly, with my business details?",
          "Is there a genuine free trial, or do I have to pay before I can properly test it?",
          "What exactly changes if I add a second staff login or a second device?",
          "Can customers pay via UPI or cash without an extra payment-gateway cut?",
          "Does dine-in table ordering exist, or only takeaway/delivery?",
        ],
      },
      {
        heading: "Where BhojSetu fits against this checklist",
        paragraphs: [
          "BhojSetu covers every item on that list directly: a real digital menu with QR table ordering for dine-in, GST-ready printable invoices with your business details on them, kitchen order tickets split by station, inventory and stock tracking with low-stock alerts, and UPI QR / Cash on Delivery checkout with no per-order commission. Plans start at ₹499/month with a 7-day free trial — no credit card required to try it. That's one honest data point for this checklist, not a claim that it's the only option worth considering.",
        ],
      },
    ],
    faqs: [
      {
        q: "What's the actual difference between a QR menu tool and full restaurant software?",
        a: "A QR menu tool typically just shows a digital menu — it doesn't take real orders, generate GST invoices, print kitchen tickets, or track stock. Full restaurant software covers ordering, billing, KOT, and inventory together, not just the menu display.",
      },
      {
        q: "Is GST billing mandatory for restaurants in India?",
        a: "GST registration and invoicing requirements depend on your turnover and state rules — this isn't legal advice, and a restaurant should confirm its own obligations with a tax professional. What's true regardless: if you are required to charge GST, your billing software needs to generate a correct, compliant invoice, not just a plain total.",
      },
      {
        q: "Do I need separate POS hardware to use restaurant billing software?",
        a: "No, not necessarily — modern browser-based platforms print bills, invoices, and kitchen tickets straight from a laptop, tablet, or phone to any printer you already have (including thermal/receipt printers), with no dedicated POS terminal required.",
      },
      {
        q: "Can one platform really handle both online ordering and in-person billing?",
        a: "Yes — that's the actual point of a combined platform rather than stitching together a separate ordering tool and a separate billing tool. Both a customer's online order and a walk-in counter sale should land in the same order dashboard and the same invoice/reporting system.",
      },
      {
        q: "How much does restaurant billing software cost in India?",
        a: "It varies by vendor and plan, but as a real reference point, BhojSetu's plans start at ₹499/month for menu, ordering, billing/invoicing, and QR table ordering, with a 7-day free trial to test it before paying anything.",
      },
    ],
  },
  {
    slug: "qr-table-ordering-delhi",
    title: "QR Table Ordering for Cafes and Restaurants in Delhi",
    description:
      "How Delhi restaurants and cafes are putting a QR code on every table instead of printed menus and order pads — what it actually changes for a dine-in customer and for the kitchen, with real Delhi restaurants already running it.",
    publishedAt: "2026-10-06",
    intro: [
      "Walk into almost any newer cafe in Delhi now and the menu is a code on the table, not a laminated card. For the restaurant, the appeal isn't the novelty — it's that a QR code replaces three things at once: the printed menu (which goes out of date the moment a price changes), the waiter taking down a dine-in order by hand, and the walk between the table and the billing counter.",
      "Two real Delhi restaurants already run their dine-in ordering this way on BhojSetu: Urban Bake House in Hari Nagar, and Delhi Dhaba.",
    ],
    sections: [
      {
        heading: "What actually happens when a customer scans the code",
        paragraphs: [
          "Each table gets its own QR code, generated and printed from the restaurant's own dashboard. Scanning it opens that restaurant's menu in the customer's own phone browser — no app to install — with the table number already filled in. The customer browses, adds items, and places the order themselves; it lands straight in the restaurant's live order dashboard and, where the kitchen uses a KOT screen, routes to the right station automatically.",
          "Nothing about this requires replacing how the restaurant already runs service — a table can still flag down a waiter for anything the code doesn't cover, and dine-in sits alongside the same takeaway and delivery flow the restaurant already uses for its storefront link.",
        ],
      },
      {
        heading: "Why this matters more for Delhi specifically",
        paragraphs: [
          "Dense markets and malls with heavy footfall traffic — Hari Nagar, Lajpat Nagar, Connaught Place, GK — are exactly where a slow order-taking process compounds the fastest: every extra minute between a table sitting down and their order reaching the kitchen is a table that turns over slower on a busy Friday night. A printed QR code at the table removes that wait without needing more waitstaff.",
          "It also sidesteps a cost that's specific to delivery, not dine-in: a customer sitting in the restaurant placing a dine-in order through BhojSetu's own storefront link isn't going through Zomato or Swiggy at all, so there's no aggregator commission on that order in the first place.",
        ],
      },
      {
        heading: "What this doesn't replace",
        paragraphs: [
          "A QR code is an ordering channel, not a substitute for service — it works best for a table that wants to order at their own pace, and it still needs a staff member to actually bring the food and handle anything a phone screen can't (a special request, a question about an ingredient, splitting a bill a particular way).",
        ],
      },
    ],
    faqs: [
      {
        q: "Do customers need to download an app to order from a table QR code?",
        a: "No — scanning the code opens the restaurant's menu directly in the phone's own browser. Nothing to install on either side.",
      },
      {
        q: "Does a QR code replace waitstaff?",
        a: "No. It replaces the printed menu and the manual step of a waiter writing down and walking over an order — a staff member still serves the table and handles anything outside what a phone screen can do.",
      },
      {
        q: "Can a restaurant still take walk-in orders at the counter alongside table QR ordering?",
        a: "Yes — dine-in QR orders land in the same order dashboard as counter billing, takeaway, and delivery orders, so staff work from one queue rather than several separate systems.",
      },
      {
        q: "Which Delhi restaurants are already using QR table ordering on BhojSetu?",
        a: "Urban Bake House in Hari Nagar and Delhi Dhaba both run their dine-in ordering this way today.",
      },
    ],
  },
  {
    slug: "best-restaurant-billing-software-india",
    title: "Best Restaurant Billing Software for Small Restaurants in India (2026)",
    description:
      "An honest roundup of restaurant billing and ordering software in India — Petpooja, Posist, DineOpen, myBillBook, QR-only tools, and where BhojSetu fits — with a price table, not just marketing copy.",
    publishedAt: "2026-10-06",
    intro: [
      "Most \"best restaurant software\" roundups are written by the vendor they end up recommending. This one is too — BhojSetu is included, and we're not pretending otherwise — but it's laid out so you can actually tell who else is worth looking at and why, not just take our word for it.",
      "The honest starting point: these tools aren't all solving the same problem. A few are full point-of-sale systems built for large chains, a few are QR-ordering add-ons that sit alongside whatever billing system you already have, and a few (BhojSetu included) try to cover ordering and billing together in one flat-fee product. Picking the \"best\" one depends on which of those you actually are.",
    ],
    sections: [
      {
        heading: "Full POS / restaurant management platforms",
        paragraphs: [
          "These cover billing, KOT, inventory, staff, and usually a lot more — built for restaurants that want one system running the whole back-of-house, often with a dedicated POS terminal.",
        ],
        list: [
          "Petpooja — one of the most widely used restaurant POS platforms in India; billing, KOT, inventory, staff attendance, and dozens of integrations. Pricing isn't published — you get a quote after a demo call; independent estimates put real-world cost (including hardware and setup) well above a flat SaaS subscription. See our full BhojSetu vs Petpooja comparison.",
          "Posist — an enterprise-grade cloud POS, in the market since 2012, built for large multi-outlet chains and QSR brands rather than a single small restaurant; billing, CRM, inventory, recipe/wastage management, and centralized multi-outlet menu control.",
          "DineOpen — a broader \"restaurant operating system\" with an AI agent for voice/chat ordering alongside cloud POS, a waiter app, reservations, and loyalty. Unusually for this category, it does publish pricing — tiers starting around ₹300/month for a single outlet, scaling up for chains. See our full BhojSetu vs DineOpen comparison.",
        ],
      },
      {
        heading: "Simple GST billing tools",
        paragraphs: [
          "myBillBook is a general small-business billing/accounting app with a dedicated restaurant mode — GST-compliant invoicing, basic inventory alerts, order management, and a QR-based digital menu. It's lighter-weight than a full restaurant POS, closer to \"billing software that also happens to handle a restaurant's menu\" than a ground-up restaurant platform.",
        ],
      },
      {
        heading: "QR-ordering-only tools",
        paragraphs: [
          "A separate category worth knowing about: tools that only add QR table ordering on top of whatever billing system a restaurant already runs, rather than replacing it.",
        ],
        list: [
          "Orderzy — QR table ordering with a live kitchen queue and a \"pay one combined bill at the end\" dining-session model; free for the restaurant, with diners paying a small platform fee per order at checkout.",
          "Ahaar Scan — flat-rate QR ordering (from ₹399/month) for dine-in, takeaway, and delivery, with a real-time order dashboard.",
          "Neither of these is a billing/invoicing system on its own — they're an ordering layer meant to sit alongside a restaurant's existing POS or billing tool.",
        ],
      },
      {
        heading: "Where BhojSetu fits",
        paragraphs: [
          "BhojSetu doesn't split ordering and billing into separate tools or separate costs: a public menu link with QR table ordering, GST-ready printable invoices and KOT split by kitchen station, and inventory with low-stock alerts are all included starting at the Starter plan — no separate POS terminal, no per-order commission, no quote-only sales call. Plans start at ₹499/month with a 7-day free trial.",
          "That's the honest pitch: if you're a smaller restaurant that wants ordering and billing together without taking on a full enterprise POS project, BhojSetu is built for exactly that gap. If you're running a large multi-outlet chain that needs deep staff/vendor/recipe management, Posist or Petpooja's broader suites are built for that scale instead.",
        ],
      },
    ],
    faqs: [
      {
        q: "What's actually the cheapest restaurant billing software in India?",
        a: "It depends what you need included. Among tools that publish pricing, BhojSetu starts at ₹499/month with ordering, billing, QR tables, inventory, and KOT all included; DineOpen's entry tier is advertised around ₹300/month but is scoped to a single outlet with more features gated to higher tiers. Petpooja and Posist don't publish pricing, so their real monthly cost (plus hardware and setup) only becomes clear after a sales call.",
      },
      {
        q: "Do I need a full POS system, or is a simpler tool enough?",
        a: "If you're a single-outlet restaurant or cafe mainly focused on getting orders in and bills out correctly, a full enterprise POS (built for multi-outlet chains) is often more system than you need. A flat-fee platform that covers ordering, billing, KOT, and inventory together is usually the better fit at that size.",
      },
      {
        q: "Is a QR-ordering-only tool like Orderzy or Ahaar Scan enough on its own?",
        a: "Not as your only system — they add QR table ordering but aren't a billing/invoicing/GST-compliant system by themselves, so you'd still need a separate billing tool alongside one. A combined platform avoids running two separate systems for the same order.",
      },
      {
        q: "Which of these actually publish their pricing?",
        a: "BhojSetu and DineOpen both publish real pricing on their own sites. Petpooja and Posist are quote-only — you get pricing after a demo/sales call. Ahaar Scan also publishes a flat starting price. Always check the vendor's current pricing page directly, since this changes.",
      },
    ],
  },
  {
    slug: "petpooja-alternatives",
    title: "Petpooja Alternatives for Small Restaurants and Cafes",
    description:
      "If Petpooja's quote-only enterprise POS feels like more system (and sales process) than your restaurant needs, here's what the actual alternatives look like — including BhojSetu.",
    publishedAt: "2026-10-06",
    intro: [
      "Petpooja is a genuinely capable restaurant POS platform, widely used across India — but it's built around a dedicated POS terminal, a sales-assisted demo-call onboarding, and pricing that isn't published, which is a fit for some restaurants and real friction for others, especially a smaller single-outlet place that just wants to start taking orders.",
      "If you're looking at Petpooja and wondering what else is out there, here's an honest map of the actual alternatives, not just a list of names.",
    ],
    sections: [
      {
        heading: "If you want flat, published pricing and no hardware — BhojSetu",
        paragraphs: [
          "BhojSetu covers the same core ground a smaller restaurant actually needs from Petpooja — ordering, GST billing/invoicing, KOT by kitchen station, and inventory — as a browser-based platform with no POS terminal to buy, self-serve sign-up, and flat pricing from ₹499/month published openly on the pricing page. See the full side-by-side in our BhojSetu vs Petpooja comparison.",
        ],
      },
      {
        heading: "If you specifically want AI-driven automation — DineOpen",
        paragraphs: [
          "DineOpen takes a different angle on the same quote-only-pricing complaint — it publishes its pricing too, and adds an AI agent for voice/chat ordering, a waiter app, and reservations on top of cloud POS. Worth a look if that automation is specifically what you're after. See our BhojSetu vs DineOpen comparison.",
        ],
      },
      {
        heading: "If your restaurant is actually enterprise-scale — Posist",
        paragraphs: [
          "If you're running a large multi-outlet chain or QSR brand and the reason you're looking at Petpooja in the first place is deep staff, vendor, and recipe-management tooling at scale, Posist is built for exactly that tier — it's not really a smaller-restaurant alternative, it's a peer enterprise platform.",
        ],
      },
      {
        heading: "If you only need simple GST billing — myBillBook",
        paragraphs: [
          "If your restaurant's actual pain point is just \"I need a proper GST invoice, not a full POS project,\" myBillBook's restaurant mode covers GST-compliant billing, basic inventory alerts, and a QR menu — lighter-weight than a full platform, closer to billing software with a restaurant layer than a ground-up restaurant system.",
        ],
      },
    ],
    faqs: [
      {
        q: "Why look for a Petpooja alternative at all?",
        a: "Common reasons: Petpooja's pricing isn't published so the real cost is only clear after a sales call; it's built around dedicated POS hardware; and its full feature depth (staff attendance, vendor management, multi-outlet tooling) is more than a single small restaurant typically needs day one.",
      },
      {
        q: "Is BhojSetu a direct replacement for Petpooja?",
        a: "Not feature-for-feature — Petpooja's broader suite (payroll/attendance, vendor management) isn't something BhojSetu offers. For the core of running orders and billing at a smaller restaurant, though, BhojSetu covers it without the hardware or sales call.",
      },
      {
        q: "Can I switch from Petpooja without losing my menu?",
        a: "Yes — rebuild your menu by hand, by uploading a photo of your existing paper or printed menu, or with AI-assisted import that reads items in automatically for you to review before saving.",
      },
    ],
  },
  {
    slug: "restaurant-software-cost-india",
    title: "How Much Does Restaurant Software Cost in India?",
    description:
      "Flat subscription, quote-only enterprise pricing, or per-order commission — the three real pricing models behind restaurant software in India, what each actually costs, and what the headline price usually doesn't include.",
    publishedAt: "2026-10-06",
    intro: [
      "\"How much does restaurant software cost\" doesn't have one answer, because the vendors in this market don't price the same way at all. Before comparing any two options on cost, it helps to know which of three pricing models you're actually looking at.",
    ],
    sections: [
      {
        heading: "Model 1: Flat monthly subscription, published upfront",
        paragraphs: [
          "A fixed price per month, listed on the vendor's own pricing page, usually scaling by feature tier rather than order volume. This is the easiest to budget for and the easiest to compare, because the number is the number.",
        ],
        list: [
          "BhojSetu — ₹499 to ₹999/month depending on tier, with menu/ordering/billing/QR tables/inventory/KOT included at every tier",
          "DineOpen — advertised from around ₹300/month for a single outlet, scaling up for multi-outlet chains, with more automation features gated to higher tiers",
          "Ahaar Scan (QR ordering only, not full billing) — from ₹399/month",
        ],
      },
      {
        heading: "Model 2: Quote-only enterprise pricing",
        paragraphs: [
          "No price on the website — you book a demo, a sales team scopes your restaurant, and you get a custom quote. This isn't inherently a red flag (it's standard for enterprise software generally), but it means the real monthly cost is unknown until you're already partway through a sales process, and it typically bundles in costs a flat-fee product wouldn't have in the first place.",
          "Petpooja and Posist both work this way. For Petpooja specifically, independent third-party estimates (not Petpooja's own published figures, since none exist) put real-world monthly cost in a wide ₹3,000–₹12,000+ range once hardware, setup fees, and GST are factored in — treat that as a rough industry estimate to sanity-check a quote against, not a guaranteed number.",
        ],
      },
      {
        heading: "Model 3: Per-order commission, no upfront fee",
        paragraphs: [
          "This is how aggregators like Zomato and Swiggy actually make money — no flat software fee, but a commission cut of every order that goes through their platform. It can look \"free\" because there's no subscription line item, but it scales with your sales rather than staying fixed, and it comes with no direct customer relationship (the aggregator owns the customer's phone number and order history, not you). We've covered this model in more depth in our guide to reducing Zomato/Swiggy commission.",
        ],
      },
      {
        heading: "Costs that hide below the headline price, regardless of model",
        paragraphs: [
          "Whichever model you're comparing, check these specifically before assuming the headline number is the real number:",
        ],
        list: [
          "Per-device or per-login limits — does a second staff login or a second screen (counter + kitchen) cost extra?",
          "Dedicated POS hardware — is a terminal required, and is it included or billed separately?",
          "Payment gateway commission on top of the software's own fee, for card/online payments specifically (UPI and cash typically have no such cut)",
          "Setup/onboarding fees charged once, separately from the recurring price",
          "GST on the subscription itself (18% is standard on SaaS in India) — ask whether a quoted price already includes it",
        ],
      },
    ],
    faqs: [
      {
        q: "Why don't all restaurant software vendors publish their pricing?",
        a: "Enterprise-oriented platforms (Petpooja, Posist) are typically scoped per restaurant — outlet count, hardware needs, integrations — so a single published number wouldn't actually be accurate for most buyers. The tradeoff is that you don't know your real cost until after a sales conversation.",
      },
      {
        q: "Is a per-order commission model ever cheaper than a flat subscription?",
        a: "It can be, at very low order volumes, since there's no fixed monthly cost. It almost always gets more expensive than a flat subscription as volume grows, which is exactly why restaurants with meaningful order volume look for a direct, commission-free ordering channel alongside aggregators.",
      },
      {
        q: "What does BhojSetu actually include at ₹499/month, with nothing extra?",
        a: "Menu management, order management and GST-ready billing/invoicing, QR table ordering, inventory and stock tracking with low-stock alerts, and KOT screens/printing by kitchen station — all included at the Starter tier, with no per-order commission and no required hardware purchase.",
      },
    ],
  },
  {
    slug: "chhote-restaurant-ke-liye-billing-software",
    title: "छोटे रेस्टोरेंट के लिए बिलिंग सॉफ्टवेयर: पूरी गाइड (2026)",
    description:
      "भारत में रेस्टोरेंट बिलिंग और ऑर्डरिंग सॉफ्टवेयर चुनते समय असल में क्या मायने रखता है — प्राइसिंग मॉडल, GST इनवॉइसिंग, KOT, इन्वेंटरी, और साइन अप करने से पहले एक व्यावहारिक चेकलिस्ट।",
    publishedAt: "2026-10-06",
    lang: "hi",
    intro: [
      "\"रेस्टोरेंट सॉफ्टवेयर\" या \"restaurant billing software India\" सर्च करने पर आपको वेंडर्स की एक लंबी लिस्ट मिलेगी, जिनमें से हर कोई खुद को हर रेस्टोरेंट के लिए सबसे सही बताता है। यह तुलना करने का सही तरीका नहीं है — 20 टेबल वाले डाइन-इन रेस्टोरेंट, सिर्फ डिलीवरी करने वाली क्लाउड किचन, और एक बेकरी काउंटर की ज़रूरतें बिल्कुल अलग होती हैं।",
      "यह गाइड मार्केटिंग भाषा छोड़कर सीधे उन बातों पर आती है जो असल में चेक करनी चाहिए — आपके रेस्टोरेंट को सॉफ्टवेयर से क्या-क्या चाहिए, प्राइसिंग में असली लागत कहाँ छुपी होती है, और कमिट करने से पहले एक practical checklist।",
    ],
    sections: [
      {
        heading: "\"रेस्टोरेंट सॉफ्टवेयर\" में असल में क्या होना चाहिए",
        paragraphs: [
          "यह शब्द कई अलग चीज़ों के लिए इस्तेमाल होता है — एक QR मेन्यू मेकर, एक POS टर्मिनल, एक इन्वेंटरी टूल, या किसी एग्रीगेटर का अपना डैशबोर्ड। रोज़ असली ऑर्डर लेने वाले रेस्टोरेंट के लिए एक पूरा प्लेटफ़ॉर्म इन सबको कवर करता है, सिर्फ किसी एक को नहीं:",
        ],
        list: [
          "एक पब्लिक ऑर्डरिंग मेन्यू जिससे ग्राहक असल में ऑर्डर कर सकें — सिर्फ मेन्यू की PDF या फोटो नहीं",
          "डाइन-इन टेबल ऑर्डरिंग (आमतौर पर QR कोड से), टेकअवे और डिलीवरी के साथ",
          "बिलिंग और इनवॉइसिंग जो GST-ready हो — सिर्फ रसीद के नीचे टोटल नहीं",
          "किचन ऑर्डर टिकट (KOT) ताकि किचन को ऑर्डर साफ़-साफ़ दिखे, न कि ज़बानी बताया जाए",
          "बेसिक इन्वेंटरी/स्टॉक ट्रैकिंग, ताकि खत्म हो चुकी चीज़ का ऑर्डर फिर भी न आ जाए",
          "ग्राहक के पेमेंट करने का तरीका — कम से कम UPI और कैश ऑन डिलीवरी",
        ],
      },
      {
        heading: "प्राइसिंग मॉडल — वह डिटेल जो आसानी से छूट जाती है",
        paragraphs: [
          "दो रेस्टोरेंट एक जैसे दिखने वाले सॉफ्टवेयर के लिए बिल्कुल अलग असली कीमत चुका सकते हैं, और इसकी वजह आमतौर पर ये तीन चीज़ें होती हैं जो हेडलाइन प्राइस के नीचे छुपी रहती हैं:",
        ],
        list: [
          "डिवाइस या लॉगिन की लिमिट — कुछ प्लान दूसरे स्टाफ मेंबर के एक साथ लॉगिन करते ही एक्स्ट्रा चार्ज कर देते हैं, जो तब बहुत मायने रखता है जब काउंटर और किचन स्क्रीन दोनों एक साथ चल रही हों",
          "मंथली प्राइस से अलग सेटअप या ऑनबोर्डिंग फीस",
          "सॉफ्टवेयर की अपनी फीस के ऊपर पेमेंट गेटवे कमीशन — UPI QR कोड या कैश पेमेंट पर ऐसा कोई कट नहीं होता, लेकिन कार्ड/ऑनलाइन पेमेंट गेटवे पर अक्सर होता है",
        ],
      },
      {
        heading: "GST बिलिंग और इनवॉइसिंग — यह ज़रूरी है, सिर्फ अच्छी बात नहीं",
        paragraphs: [
          "रेस्टोरेंट एक असली, टैक्स योग्य बिज़नेस है, और \"GST बाद में जोड़ देंगे\" अक्सर सस्ते या नए टूल्स में एक बड़ी कमी होती है। साइन अप करने से पहले चेक करें कि प्लेटफ़ॉर्म असल में सही इनवॉइस बना सकता है — आपका बिज़नेस नाम, एड्रेस और GSTIN उस पर हो, टैक्स रेट सही से लगा हो, और एक असली इनवॉइस नंबर हो जो आप बिना झिझक किसी टैक्स ऑडिटर को दिखा सकें। जो टूल सिर्फ एक प्लेन टोटल प्रिंट करता है, वह बिलिंग सॉफ्टवेयर नहीं, सिर्फ रसीद प्रिंटर है।",
        ],
      },
      {
        heading: "इन्वेंटरी और KOT — जहाँ कई \"ऑर्डर मैनेजमेंट\" टूल्स अधूरे रह जाते हैं",
        paragraphs: [
          "बहुत से ऑर्डरिंग टूल्स ग्राहक वाला मेन्यू पार्ट तो अच्छे से संभाल लेते हैं, लेकिन वहीं रुक जाते हैं। दो चीज़ें खासतौर पर चेक करने लायक हैं:",
        ],
        list: [
          "किचन ऑर्डर टिकट (KOT) — क्या किचन को हर ऑर्डर का साफ़, प्रिंटेड या स्क्रीन पर टिकट मिलता है (हो सके तो स्टेशन के हिसाब से बंटा हुआ — ग्रिल, बार, डेज़र्ट), या किसी को ज़बानी ऑर्डर बताना पड़ता है?",
          "स्टॉक ट्रैकिंग — क्या कोई आइटम बिकने पर उसका स्टॉक काउंट असल में कम होता है, और क्या सिस्टम आपको बताता है (या आइटम को छुपा देता है) जब वह खत्म हो जाए, या \"सोल्ड आउट\" अभी भी स्टाफ को याद रखकर बताना पड़ता है?",
        ],
      },
      {
        heading: "साइन अप करने से पहले एक practical checklist",
        paragraphs: [
          "किसी भी प्लेटफ़ॉर्म को जांचते समय यह लिस्ट इस्तेमाल करें, BhojSetu समेत:",
        ],
        list: [
          "क्या मैं एक असली, काम करने वाला डेमो स्टोरफ्रंट देख सकता हूँ — सिर्फ स्क्रीनशॉट नहीं?",
          "क्या प्रिंटेड इनवॉइस में मेरे बिज़नेस डिटेल्स के साथ GST सही से दिखता है?",
          "क्या असली फ्री ट्रायल है, या टेस्ट करने के लिए पहले पेमेंट करना पड़ता है?",
          "अगर मैं दूसरा स्टाफ लॉगिन या दूसरा डिवाइस जोड़ूं तो असल में क्या बदलता है?",
          "क्या ग्राहक बिना एक्स्ट्रा पेमेंट-गेटवे कट के UPI या कैश से पेमेंट कर सकते हैं?",
          "क्या डाइन-इन टेबल ऑर्डरिंग है, या सिर्फ टेकअवे/डिलीवरी?",
        ],
      },
      {
        heading: "इस checklist पर BhojSetu कहाँ फिट होता है",
        paragraphs: [
          "BhojSetu इस लिस्ट के हर पॉइंट को सीधे कवर करता है: डाइन-इन के लिए QR टेबल ऑर्डरिंग के साथ एक असली डिजिटल मेन्यू, आपके बिज़नेस डिटेल्स के साथ GST-ready प्रिंटेबल इनवॉइस, किचन स्टेशन के हिसाब से बंटे किचन ऑर्डर टिकट, लो-स्टॉक अलर्ट के साथ इन्वेंटरी और स्टॉक ट्रैकिंग, और बिना किसी पर-ऑर्डर कमीशन के UPI QR / कैश ऑन डिलीवरी चेकआउट। प्लान ₹499/महीने से शुरू होते हैं, 7 दिन के फ्री ट्रायल के साथ — टेस्ट करने के लिए क्रेडिट कार्ड की ज़रूरत नहीं।",
        ],
      },
    ],
    faqs: [
      {
        q: "QR मेन्यू टूल और पूरे रेस्टोरेंट सॉफ्टवेयर में असली फर्क क्या है?",
        a: "QR मेन्यू टूल आमतौर पर सिर्फ डिजिटल मेन्यू दिखाता है — यह असली ऑर्डर नहीं लेता, GST इनवॉइस नहीं बनाता, किचन टिकट प्रिंट नहीं करता, और स्टॉक ट्रैक नहीं करता। पूरा रेस्टोरेंट सॉफ्टवेयर ऑर्डरिंग, बिलिंग, KOT, और इन्वेंटरी — सबको साथ कवर करता है, सिर्फ मेन्यू दिखाना नहीं।",
      },
      {
        q: "क्या भारत में रेस्टोरेंट के लिए GST बिलिंग ज़रूरी है?",
        a: "GST रजिस्ट्रेशन और इनवॉइसिंग की ज़रूरत आपके टर्नओवर और राज्य के नियमों पर निर्भर करती है — यह कानूनी सलाह नहीं है, और अपनी असली ज़िम्मेदारी किसी टैक्स प्रोफेशनल से कन्फर्म करें। लेकिन यह हमेशा सच है: अगर आपको GST लगाना ज़रूरी है, तो आपके बिलिंग सॉफ्टवेयर को एक सही, कम्प्लायंट इनवॉइस बनाना आना चाहिए, सिर्फ प्लेन टोटल नहीं।",
      },
      {
        q: "क्या रेस्टोरेंट बिलिंग सॉफ्टवेयर के लिए अलग से POS हार्डवेयर चाहिए?",
        a: "ज़रूरी नहीं — आजकल के ब्राउज़र-बेस्ड प्लेटफ़ॉर्म बिल, इनवॉइस, और किचन टिकट सीधे लैपटॉप, टैबलेट या फ़ोन से किसी भी प्रिंटर पर प्रिंट कर सकते हैं (थर्मल/रसीद प्रिंटर समेत), बिना किसी डेडिकेटेड POS टर्मिनल के।",
      },
      {
        q: "भारत में रेस्टोरेंट बिलिंग सॉफ्टवेयर की कीमत कितनी होती है?",
        a: "यह वेंडर और प्लान पर निर्भर करता है, लेकिन एक असली रेफरेंस पॉइंट के तौर पर, BhojSetu के प्लान ₹499/महीने से शुरू होते हैं — मेन्यू, ऑर्डरिंग, बिलिंग/इनवॉइसिंग, और QR टेबल ऑर्डरिंग के साथ, 7 दिन के फ्री ट्रायल के साथ टेस्ट करने के लिए।",
      },
    ],
  },
  {
    slug: "kitchen-order-tickets-kot-explained",
    title: "Kitchen Order Tickets (KOT) Explained: What Every Restaurant Should Know",
    description:
      "What a KOT actually is, why a verbal or handwritten order breaks down once a kitchen gets busy, and what to look for in a digital KOT system — station routing, timestamps, and print vs screen.",
    publishedAt: "2026-10-07",
    intro: [
      "\"KOT\" shows up on every restaurant software feature list, but it's worth being precise about what it actually is and why it matters, rather than treating it as a checkbox. A Kitchen Order Ticket is the single source of truth between the front of house and the kitchen for exactly what was ordered — and the gap between a restaurant that has one and a restaurant that doesn't shows up fastest on a busy night, not a quiet one.",
    ],
    sections: [
      {
        heading: "What a KOT actually is",
        paragraphs: [
          "A Kitchen Order Ticket is a printed slip or on-screen ticket, generated the moment an order is placed, listing exactly what was ordered, in what quantity, with any notes (no onions, extra spicy), for a specific table or order number. It's handed to or shown to the kitchen so cooking starts from a written record, not a waiter's memory or a shouted relay across a busy kitchen.",
          "The alternative — a waiter remembering or verbally relaying an order — works fine at low volume and breaks down predictably as volume increases: items get missed, modifications get dropped, and two tables' orders get crossed. A KOT isn't solving a theoretical problem; it's solving the specific, well-known failure mode of verbal order-taking at scale.",
        ],
      },
      {
        heading: "Why station routing matters, not just \"a ticket\"",
        paragraphs: [
          "A single printed ticket with every item on it works for a small kitchen with one cook. Once a kitchen has distinct stations — grill, bar, dessert, tandoor — a single mixed ticket means every station has to scan past items that aren't theirs to find the ones that are, which is slower and more error-prone than it needs to be.",
          "A KOT system that routes by station sends the grill items to the grill screen/printer, the drinks to the bar, and so on — each station sees only what it needs to make, and an order with items across three stations becomes three focused tickets instead of one crowded one.",
        ],
      },
      {
        heading: "Print vs screen — both are legitimate, pick based on your kitchen",
        paragraphs: [
          "A printed KOT (thermal/receipt printer at each station) works well when the kitchen is loud, hands are often wet or floury, and a physical slip can be stuck on a rail or spike as a visual record of what's in progress. A screen-based KOT (a tablet or monitor per station) avoids paper entirely and can show live status (new → in progress → ready) without anyone touching a ticket.",
          "Neither is objectively better — it depends on the kitchen's layout and habits. Worth checking before committing to a platform: does it actually support both, or does it lock you into whichever one the vendor built first?",
        ],
      },
      {
        heading: "What to check before assuming a tool has \"KOT\"",
        paragraphs: [
          "\"Has KOT\" on a feature list can mean very different things in practice. Worth confirming specifically:",
        ],
        list: [
          "Does it route by kitchen station, or is it one ticket with everything on it regardless of kitchen layout?",
          "Does a dine-in table order, a takeaway order, and a delivery order all generate a KOT the same way, or only some of them?",
          "Is there a timestamp on the ticket, so the kitchen (and the owner, reviewing later) can see how long an item actually took?",
          "Does cancelling or modifying an order after it's sent update or reprint the KOT, or does the kitchen keep cooking against a stale ticket?",
        ],
      },
      {
        heading: "How this works on BhojSetu",
        paragraphs: [
          "Every order — dine-in (including QR table orders), takeaway, delivery, and manually entered counter bills — generates a KOT automatically, routed by kitchen station if stations are set up, with both a live on-screen kitchen board and 80mm thermal print support per station or for the whole order. It's included at every plan tier, not held back as an add-on.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does a KOT replace a kitchen display system (KDS)?",
        a: "A KOT is the ticket/record itself (printed or on-screen); a kitchen display system is typically a larger board view showing all active tickets across stations at once, often with status tracking. BhojSetu's KOT screens handle the per-station ticket view; its separate Kitchen board (available on the Business plan) adds the larger Kanban-style overview on top.",
      },
      {
        q: "Do I need a thermal printer for KOT, or can it be screen-only?",
        a: "Either works — a thermal/receipt printer at each station, or a tablet/screen showing the live ticket queue. Many kitchens use a mix: print for stations that are hands-dirty or loud, screens where that's less of an issue.",
      },
      {
        q: "Does a manually entered counter order (not through the online menu) still generate a KOT?",
        a: "It should — a walk-in counter sale is still a real kitchen order. On BhojSetu, manual bills created from the dashboard generate a KOT the same way an online order does, including station routing when the line items are picked from the existing menu.",
      },
    ],
  },
  {
    slug: "restaurant-inventory-management-guide-india",
    title: "Restaurant Inventory Management: A Simple Guide for Small Restaurants in India",
    description:
      "Why \"we'll track stock on a notebook\" breaks down, what a restaurant actually needs from inventory software versus a full warehouse system, and how low-stock alerts and recipe-based deduction actually work.",
    publishedAt: "2026-10-07",
    intro: [
      "Inventory management sounds like a bigger, more industrial problem than most small restaurants think they have — which is exactly why so many run it on a notebook, a WhatsApp message to the supplier when something looks low, or pure memory. That works until the day it doesn't: a sold-out item gets ordered anyway, or a popular dish quietly stops being offered because nobody noticed stock was fine until it very suddenly wasn't.",
    ],
    sections: [
      {
        heading: "What \"inventory\" actually means for a restaurant, vs a warehouse",
        paragraphs: [
          "A full warehouse/retail inventory system is built around SKUs, purchase orders, multi-location transfers, and batch/lot tracking — genuinely more machinery than a single restaurant kitchen needs. What a restaurant actually needs is narrower and more specific:",
        ],
        list: [
          "Know how much of each sellable item or ingredient is on hand, right now",
          "Have that number go down automatically as items sell, not rely on someone remembering to update it",
          "Get warned before something runs out, not after a customer's order fails",
          "Optionally, stop customers from even seeing/ordering something that's genuinely at zero stock",
        ],
      },
      {
        heading: "The core mechanic: selling something should move its stock number",
        paragraphs: [
          "This is the part that separates real inventory tracking from a static count somebody updates manually once a week. Every sale — whether it's a customer's online order, a QR table order, or a walk-in counter bill — should reduce the relevant stock count immediately, in the same transaction as the sale itself, not as a separate manual step someone has to remember to do later.",
          "The practical test: if an item sells 20 times in a day, does the stock number reflect that by evening without anyone touching it? If the answer is \"only if someone remembers to update it,\" that's not really inventory tracking yet — it's a count that happens to exist.",
        ],
      },
      {
        heading: "Low-stock alerts — the point where tracking becomes useful",
        paragraphs: [
          "A stock count that only gets checked when someone thinks to look at it is informational at best. The actual value shows up when the system proactively flags an item once it crosses a threshold the owner sets — \"warn me when paneer tikka is down to 5 servings\" — so restocking happens before a customer's order fails, not after.",
          "Some setups go a step further and automatically hide or mark an item unavailable once it hits zero, so it can't be ordered at all until restocked. That's a real tradeoff worth thinking about deliberately rather than defaulting into: it guarantees no customer orders something you can't make, but it also means a stock-count mistake can wrongly hide something you actually have — which is why it's usually worth making this an optional setting, not forced behavior.",
        ],
      },
      {
        heading: "A practical checklist before trusting any inventory feature",
        paragraphs: [
          "If a restaurant platform claims inventory/stock tracking, it's worth checking specifically:",
        ],
        list: [
          "Does a sale actually reduce stock automatically, in real time — or is there a manual \"update stock\" step?",
          "Can you set a low-stock threshold per item, and does the alert actually reach you (dashboard, email) rather than requiring you to check a report?",
          "Does cancelling an order restore the stock it had deducted, or does a cancelled order leave stock permanently wrong?",
          "Does a manually entered counter sale deduct stock the same way an online order does, or only online orders?",
        ],
      },
      {
        heading: "How this works on BhojSetu",
        paragraphs: [
          "Every sellable item can have its own tracked stock count, with a low-stock threshold that triggers a dashboard alert (and an email to the owner, once email is configured). Stock deducts automatically and in the same transaction as the sale — for online orders, QR table orders, and manually entered counter bills alike — and cancelling an order restores the stock it had deducted. An optional setting auto-hides an item once it hits zero stock, off by default so it's a deliberate choice, not a surprise. Restocking (including a photo-scan of a real supplier bill, read automatically) is covered in the dashboard's Inventory section, included at every plan tier.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do I need separate inventory software, or should it be part of my ordering/billing platform?",
        a: "Part of the same platform is almost always better for a restaurant specifically, because the trigger for a stock change (a sale) already happens inside that same system. A separate inventory tool means manually re-entering what already sold, which reintroduces the exact \"someone forgot to update it\" gap that makes notebook tracking unreliable in the first place.",
      },
      {
        q: "What happens if my stock count is wrong — does the system stop taking orders?",
        a: "On BhojSetu, no — stock can go negative rather than blocking a sale outright, since a slightly wrong count shouldn't be able to stop a restaurant from serving a walk-in customer. The optional auto-hide-at-zero setting is the one case where stock does affect what customers can order, and it's opt-in specifically so that tradeoff is a deliberate choice.",
      },
      {
        q: "Can I track ingredient-level stock, or only finished menu items?",
        a: "BhojSetu tracks stock directly on sellable items/products (including raw-material-style products bought and sold by the unit, like a bakery ingredient), rather than a separate recipe-based ingredient-deduction layer — selling a product deducts its own stock directly, which is simpler to reason about for most small restaurants than maintaining a recipe for every dish.",
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
