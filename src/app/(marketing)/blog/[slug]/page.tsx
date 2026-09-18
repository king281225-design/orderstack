import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog/posts";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqAccordion } from "@/components/shared/faq-accordion";
import { SITE_URL, SITE_NAME } from "@/lib/site";

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
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      publishedTime: post.publishedAt,
    },
    twitter: {
      card: "summary",
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
    dateModified: post.publishedAt,
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

  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <JsonLd data={articleJsonLd} />
      <JsonLd data={faqJsonLd} />

      <Link href="/blog" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
        ← All posts
      </Link>

      <p className="mt-4 text-xs text-gray-500">
        {new Date(post.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{post.title}</h1>

      <div className="mt-6 space-y-4 text-gray-700 dark:text-gray-300">
        {post.intro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {post.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{section.heading}</h2>
          <div className="mt-3 space-y-4 text-gray-700 dark:text-gray-300">
            {section.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {section.list && (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700 dark:text-gray-300">
              {section.list.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {post.faqs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Frequently asked questions</h2>
          <FaqAccordion faqs={post.faqs} columns={2} />
        </section>
      )}

      <div className="mt-12 rounded-xl border border-gray-200 bg-indigo-50 p-6 text-center dark:border-gray-700 dark:bg-indigo-500/10">
        <p className="font-medium text-gray-900 dark:text-white">
          Ready to give your restaurant its own direct ordering channel?
        </p>
        <Link
          href="/signup"
          className="mt-3 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
        >
          Get started free
        </Link>
      </div>
    </article>
  );
}
