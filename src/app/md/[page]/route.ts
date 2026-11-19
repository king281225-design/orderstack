import { buildMarkdown } from "@/lib/agent-info";

// Markdown representation of the homepage and /pricing. Normally reached via
// src/proxy.ts, which rewrites "/" and "/pricing" here when a client sends
// `Accept: text/markdown`; /md/<page> also works directly.
//
// Caching: the SAME public URL ("/", "/pricing") now has two representations,
// so this must never be stored by a shared cache under that URL (a browser
// would get Markdown) — hence no-store + Vary: Accept. Responses are cheap.
const PAGES = new Set(["home", "pricing"]);

export async function GET(_request: Request, { params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!PAGES.has(page)) {
    return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const body = buildMarkdown(page as "home" | "pricing");
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "private, no-store",
      Vary: "Accept",
      // Rough size hint for agents budgeting context (~4 chars per token).
      "x-markdown-tokens": String(Math.ceil(body.length / 4)),
      "X-Robots-Tag": "noindex",
    },
  });
}
