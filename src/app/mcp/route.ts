import { handleMcpMessage } from "@/lib/mcp-server";

// MCP over Streamable HTTP (JSON responses only). See src/lib/mcp-server.ts
// for what this does and, importantly, doesn't expose: public marketing facts
// only, no auth, no database, no writes.
//
// CORS is open (*) on purpose: the data is public and no credentials or
// cookies are involved, and browser-based agents need it. Because there is no
// private state to protect, the spec's Origin-validation concern (DNS
// rebinding against a local server) doesn't apply to this public server.
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, accept, mcp-protocol-version, mcp-session-id",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS, ...extra },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// No server-initiated SSE stream and no sessions: GET/DELETE are not supported.
function notSupported() {
  return json(
    { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Use POST with a JSON-RPC 2.0 message." } },
    405,
    { Allow: "POST, OPTIONS" },
  );
}
export const GET = notSupported;
export const DELETE = notSupported;

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request too large" } }, 413);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }

  // JSON-RPC batch (older protocol revisions allowed arrays).
  if (Array.isArray(parsed)) {
    if (parsed.length === 0 || parsed.length > 20) {
      return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid batch" } }, 400);
    }
    const replies = parsed.map(handleMcpMessage).filter((r) => r !== null);
    return replies.length === 0 ? new Response(null, { status: 202, headers: CORS }) : json(replies);
  }

  const reply = handleMcpMessage(parsed);
  // A notification (or a client response) is acknowledged with 202 and no body.
  if (reply === null) return new Response(null, { status: 202, headers: CORS });
  return json(reply);
}
