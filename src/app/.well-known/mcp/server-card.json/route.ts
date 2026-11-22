import { SITE_URL, SITE_NAME } from "@/lib/site";
import { SERVER_VERSION } from "@/lib/agent-info";
import { LATEST_PROTOCOL_VERSION, MCP_TOOLS } from "@/lib/mcp-server";

// MCP Server Card, published at /.well-known/mcp/server-card.json.
// The format is still a moving target (SEP-1649, being superseded by SEP-2127),
// so this follows the shape currently used in the wild — identity at the top
// level plus a serverInfo block, an endpoint/transport, and capabilities — and
// describes ONLY what /mcp really implements (see src/lib/mcp-server.ts):
// read-only tools, no resources/prompts, no authentication.
export const dynamic = "force-static";

export function GET() {
  const endpoint = `${SITE_URL}/mcp`;
  const card = {
    $comment: "MCP Server Card (SEP-1649 draft; the format is still evolving).",
    name: "in.bhojsetu/website",
    title: SITE_NAME,
    version: SERVER_VERSION,
    description:
      "Read-only public information about BhojSetu — restaurant ordering and billing software for India: pricing, features, FAQ and contact details.",
    serverInfo: { name: "bhojsetu", title: SITE_NAME, version: SERVER_VERSION },
    protocolVersion: LATEST_PROTOCOL_VERSION,
    endpoint,
    transport: { type: "streamable-http", endpoint },
    capabilities: { tools: { listChanged: false } },
    authentication: { required: false },
    tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
    documentationUrl: `${SITE_URL}/llms.txt`,
  };
  return new Response(JSON.stringify(card, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
