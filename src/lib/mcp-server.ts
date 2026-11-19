import { getContact, getOverview, getPricing, searchFaq, SERVER_VERSION } from "@/lib/agent-info";
import { SITE_NAME } from "@/lib/site";

/**
 * A deliberately tiny, STATELESS, READ-ONLY Model Context Protocol server
 * (Streamable HTTP, JSON responses only — no SSE, no sessions). It exposes the
 * same public marketing facts that are already on the website; there is no
 * database access, no authentication, no write path, and nothing
 * tenant-specific. It exists so agents can ask structured questions
 * ("what does it cost?") and so the MCP Server Card has a real endpoint to
 * point at. Anything that would mutate data (signup, orders) is intentionally
 * NOT a tool — a person does that on the site.
 */

// Newest first. We echo the client's requested version when we support it,
// otherwise answer with our newest (the MCP version-negotiation rule).
export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

type JsonObject = Record<string, unknown>;

export const MCP_TOOLS = [
  {
    name: "get_pricing",
    title: "Get BhojSetu pricing",
    description:
      "Current BhojSetu plans in INR (monthly and annual price, features per plan) and the free-trial terms. Read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "get_product_overview",
    title: "Get a BhojSetu overview",
    description:
      "What BhojSetu is, who it is for, its main features, pricing summary and where to sign up. Read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "search_faq",
    title: "Search BhojSetu FAQ",
    description:
      "Frequently asked questions about BhojSetu. Pass an optional keyword (e.g. 'QR', 'cost', 'printer') to filter; omit it to list them all. Read-only.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Optional keyword to filter questions and answers." } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "get_contact_details",
    title: "Get BhojSetu contact details",
    description: "How to reach the BhojSetu team: phone/WhatsApp, email, address and the support response target. Read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
] as const;

function runTool(name: string, args: JsonObject): unknown | undefined {
  switch (name) {
    case "get_pricing":
      return getPricing();
    case "get_product_overview":
      return getOverview();
    case "search_faq": {
      const q = typeof args.query === "string" ? args.query.slice(0, 200) : undefined;
      return { query: q ?? null, results: searchFaq(q) };
    }
    case "get_contact_details":
      return getContact();
    default:
      return undefined;
  }
}

const rpcError = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const rpcResult = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });

/** Handle ONE JSON-RPC message. Returns null for notifications (no response is sent). */
export function handleMcpMessage(msg: unknown): JsonObject | null {
  if (!msg || typeof msg !== "object" || Array.isArray(msg)) return rpcError(null, -32600, "Invalid Request");
  const m = msg as JsonObject;
  if (m.jsonrpc !== "2.0" || typeof m.method !== "string") return rpcError(m.id, -32600, "Invalid Request");

  const isNotification = !("id" in m) || m.id === undefined || m.id === null;
  const params = (m.params && typeof m.params === "object" && !Array.isArray(m.params) ? m.params : {}) as JsonObject;

  // Notifications and client responses never get a reply.
  if (isNotification) return null;

  switch (m.method) {
    case "initialize": {
      const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      const protocolVersion = (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
        ? requested
        : LATEST_PROTOCOL_VERSION;
      return rpcResult(m.id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "bhojsetu", title: SITE_NAME, version: SERVER_VERSION },
        instructions:
          "Read-only public information about BhojSetu, restaurant ordering and billing software for India. Use get_pricing for plans and prices, search_faq for common questions.",
      });
    }
    case "ping":
      return rpcResult(m.id, {});
    case "tools/list":
      return rpcResult(m.id, { tools: MCP_TOOLS });
    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : "";
      const args = (params.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments)
        ? params.arguments
        : {}) as JsonObject;
      const data = runTool(name, args);
      if (data === undefined) return rpcError(m.id, -32602, `Unknown tool: ${name.slice(0, 80)}`);
      return rpcResult(m.id, {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
        isError: false,
      });
    }
    default:
      return rpcError(m.id, -32601, `Method not found: ${String(m.method).slice(0, 80)}`);
  }
}
