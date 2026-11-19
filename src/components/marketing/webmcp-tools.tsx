"use client";

import { useEffect } from "react";

/**
 * WebMCP (https://webmachinelearning.github.io/webmcp/): lets a page hand
 * in-browser AI agents a few structured tools through
 * `navigator.modelContext.registerTool(...)` instead of making them scrape the
 * DOM. Feature-detected — in a browser without WebMCP this does nothing.
 *
 * Only READ-ONLY information tools and plain page navigation are registered.
 * Nothing here creates an account, places an order or submits a form; the
 * signup form is intentionally NOT exposed as a tool, so a person always makes
 * that step themselves. Data is passed in from the server (same source as the
 * pricing page / MCP server) so the browser bundle doesn't carry the blog.
 */

type PageLink = { key: string; title: string; path: string };

type Props = {
  overview: unknown;
  pricing: unknown;
  contact: unknown;
  faqs: { question: string; answer: string }[];
  pages: PageLink[];
};

type ToolResult = { content: { type: "text"; text: string }[] };
type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<ToolResult> | ToolResult;
};
type ModelContextLike = {
  registerTool?: (tool: WebMcpTool) => unknown;
  unregisterTool?: (name: string) => unknown;
};

const text = (value: unknown): ToolResult => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});
const noInput = { type: "object", properties: {}, additionalProperties: false };

export function WebMcpTools({ overview, pricing, contact, faqs, pages }: Props) {
  useEffect(() => {
    const nav = navigator as unknown as { modelContext?: ModelContextLike };
    const doc = document as unknown as { modelContext?: ModelContextLike };
    const mc = nav.modelContext ?? doc.modelContext;
    if (!mc || typeof mc.registerTool !== "function") return;
    const register = mc.registerTool.bind(mc);

    const tools: WebMcpTool[] = [
      {
        name: "get_pricing",
        description: "BhojSetu plans in INR (monthly and annual price, features) and the free-trial terms. Read-only.",
        inputSchema: noInput,
        annotations: { readOnlyHint: true },
        execute: () => text(pricing),
      },
      {
        name: "get_product_overview",
        description: "What BhojSetu is, who it is for, its main features and where to sign up. Read-only.",
        inputSchema: noInput,
        annotations: { readOnlyHint: true },
        execute: () => text(overview),
      },
      {
        name: "search_faq",
        description: "Frequently asked questions about BhojSetu; pass an optional keyword to filter. Read-only.",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string", description: "Optional keyword, e.g. 'QR', 'cost', 'printer'." } },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: (args) => {
          const q = typeof args?.query === "string" ? args.query.trim().toLowerCase() : "";
          const hits = q ? faqs.filter((f) => `${f.question} ${f.answer}`.toLowerCase().includes(q)) : faqs;
          return text(hits);
        },
      },
      {
        name: "get_contact_details",
        description: "How to reach the BhojSetu team: phone/WhatsApp, email, address. Read-only.",
        inputSchema: noInput,
        annotations: { readOnlyHint: true },
        execute: () => text(contact),
      },
      {
        name: "open_page",
        description:
          "Navigate this browser tab to a public BhojSetu page (for example the pricing page or the free-trial signup page). Only navigates; it does not submit anything.",
        inputSchema: {
          type: "object",
          properties: { page: { type: "string", enum: pages.map((p) => p.key), description: "Which page to open." } },
          required: ["page"],
          additionalProperties: false,
        },
        execute: (args) => {
          const target = pages.find((p) => p.key === args?.page);
          if (!target) return text(`Unknown page. Choose one of: ${pages.map((p) => p.key).join(", ")}`);
          window.location.assign(target.path);
          return text(`Opening ${target.title} (${target.path})`);
        },
      },
    ];

    const registered: string[] = [];
    for (const tool of tools) {
      try {
        // Re-registering the same name throws in some implementations (React
        // dev double-effect, client-side navigation between marketing pages).
        try {
          mc.unregisterTool?.(tool.name);
        } catch {}
        register(tool);
        registered.push(tool.name);
      } catch {
        // A tool the browser rejects shouldn't break the page.
      }
    }
    return () => {
      for (const name of registered) {
        try {
          mc.unregisterTool?.(name);
        } catch {}
      }
    };
  }, [overview, pricing, contact, faqs, pages]);

  return null;
}
