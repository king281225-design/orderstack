import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { AUTO_LINKS, MAX_AUTO_LINKS_PER_POST } from "@/lib/blog/links";

/**
 * Per-post linking state: which targets already got a link and how many links
 * were added in total. Create one per post render and pass it to every
 * <RichText> in that post so each target is linked once, at its first mention.
 */
export interface LinkBudget {
  usedHrefs: Set<string>;
  count: number;
}

export function createLinkBudget(): LinkBudget {
  return { usedHrefs: new Set(), count: 0 };
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Longest phrase first so "kitchen order tickets" wins over "KOT"-style short forms.
const COMPILED = AUTO_LINKS.map((l) => ({
  href: l.href,
  regex: new RegExp(
    `\\b(${[...l.phrases].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})\\b`,
    "i",
  ),
}));

const LINK_CLASS =
  "font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300";

/**
 * Plain function (not a component) because it consumes the shared per-post
 * `budget` across calls, in document order. Renders a paragraph, turning the first mention of each AUTO_LINKS phrase
 * into an internal link. Disabled for non-English posts (the English anchor
 * phrases would rarely match, and a half-linked Hindi post reads oddly).
 */
export function renderRichText(
  text: string,
  currentSlug: string,
  budget: LinkBudget,
  enabled = true,
): ReactNode {
  if (!enabled) return text;

  const selfHref = `/blog/${currentSlug}`;
  const parts: ReactNode[] = [];
  let rest = text;
  let key = 0;

  while (budget.count < MAX_AUTO_LINKS_PER_POST) {
    let best: { index: number; length: number; href: string } | null = null;
    for (const c of COMPILED) {
      if (c.href === selfHref || budget.usedHrefs.has(c.href)) continue;
      const m = c.regex.exec(rest);
      if (m && (best === null || m.index < best.index)) {
        best = { index: m.index, length: m[0].length, href: c.href };
      }
    }
    if (!best) break;

    if (best.index > 0) parts.push(<Fragment key={key++}>{rest.slice(0, best.index)}</Fragment>);
    parts.push(
      <Link key={key++} href={best.href} className={LINK_CLASS}>
        {rest.slice(best.index, best.index + best.length)}
      </Link>,
    );
    budget.usedHrefs.add(best.href);
    budget.count += 1;
    rest = rest.slice(best.index + best.length);
  }

  if (rest) parts.push(<Fragment key={key++}>{rest}</Fragment>);
  return parts;
}
