import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog/posts";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqAccordion } from "@/components/shared/faq-accordion";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { renderRichText, createLinkBudget } from "@/components/blog/rich-text";
import { RELATED_POSTS } from "@/lib/blog/links";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  const url = `${SITE_URL}/blog/${slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: url,
      // hreflang: tells search engines which language this specific post's
      // body copy is in, so a Hindi-language query can surface it directly
      // instead of the (otherwise identical-looking) English posts.
      languages: { [post.lang ?? "en"]: url },
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/brand/front-page-logo.png` } },
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const isHindi = post.lang === "hi";

  // Breadcrumbs: Home > Blog > this post (rich-result eligible + clearer site structure).
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  // Contextual internal links are English-only: the anchor phrases are English.
  const budget = createLinkBudget();
  const linkEnabled = !isHindi;

  const relatedSlugs = RELATED_POSTS[slug] ?? [];
  const related = relatedSlugs
    .map((s) => BLOG_POSTS.find((p) => p.slug === s))
    .filter((p): p is NonNullable<typeof p> => p !== undefined && p.slug !== slug);

  return (
    <article className="mx-auto max-w-3xl px-4 py-16" lang={post.lang ?? "en"}>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={faqJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:underline">
              {isHindi ? "होम" : "Home"}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/blog" className="hover:underline">
              {isHindi ? "ब्लॉग" : "Blog"}
            </Link>
          </li>
        </ol>
      </nav>

      <p className="mt-4 text-xs text-gray-500">
        {new Date(post.publishedAt).toLocaleDateString(isHindi ? "hi-IN" : "en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{post.title}</h1>

      <div className="mt-6 space-y-4 text-gray-700 dark:text-gray-300">
        {post.intro.map((p, i) => (
          <p key={i}>
            {renderRichText(p, slug, budget, linkEnabled)}
          </p>
        ))}
      </div>

      {post.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{section.heading}</h2>
          <div className="mt-3 space-y-4 text-gray-700 dark:text-gray-300">
            {section.paragraphs.map((p, i) => (
              <p key={i}>
                {renderRichText(p, slug, budget, linkEnabled)}
              </p>
            ))}
          </div>
          {section.list && (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700 dark:text-gray-300">
              {section.list.map((item, i) => (
                <li key={i}>
                  {renderRichText(item, slug, budget, linkEnabled)}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {post.faqs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            {isHindi ? "अक्सर पूछे जाने वाले सवाल" : "Frequently asked questions"}
          </h2>
          <FaqAccordion faqs={post.faqs} columns={2} />
        </section>
      )}

      {related.length > 0 && (
        <aside className="mt-12" aria-label={isHindi ? "और पढ़ें" : "Keep reading"}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isHindi ? "और पढ़ें" : "Keep reading"}
          </h2>
          <ul className="mt-3 space-y-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/blog/${r.slug}`}
                  className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {r.title}
                </Link>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{r.description}</p>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <div className="mt-12 rounded-xl border border-gray-200 bg-indigo-50 p-6 text-center dark:border-gray-700 dark:bg-indigo-500/10">
        <p className="font-medium text-gray-900 dark:text-white">
          {isHindi
            ? "अपने रेस्टोरेंट का अपना डायरेक्ट ऑर्डरिंग चैनल शुरू करें"
            : "Ready to give your restaurant its own direct ordering channel?"}
        </p>
        <Link
          href="/signup"
          className="mt-3 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
        >
          {isHindi ? "7 दिन का फ्री ट्रायल शुरू करें" : "Start 7-day free trial"}
        </Link>
      </div>
    </article>
  );
}
