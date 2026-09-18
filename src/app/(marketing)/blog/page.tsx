import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog",
  description: "Guides on restaurant ordering, QR menus, commission-free direct ordering, and running a restaurant online in India.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blog</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Guides on restaurant ordering, QR menus, and building a direct customer channel.
      </p>

      <div className="mt-10 flex flex-col gap-8">
        {BLOG_POSTS.map((post) => (
          <article key={post.slug} className="border-b border-gray-200 pb-8 dark:border-gray-700">
            <p className="text-xs text-gray-500">
              {new Date(post.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              <Link href={`/blog/${post.slug}`} className="hover:underline">
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 text-gray-700 dark:text-gray-300">{post.description}</p>
            <Link
              href={`/blog/${post.slug}`}
              className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Read more →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
