"use client";

/**
 * Talks to the optional local print agent (see print-agent/ at the repo
 * root) — a small helper program a restaurant can run on its own PC that
 * sends a receipt straight to a thermal printer via raw ESC/POS commands,
 * bypassing Windows' print dialog and paper-size matching entirely. Some
 * generic/clone thermal printer drivers only support a short fixed list of
 * paper sizes and silently fail browser silent-printing (--kiosk-printing)
 * as a result — see the chat history this was built from.
 *
 * Entirely optional and additive: every call site falls back to the
 * existing window.print() flow when the agent isn't reachable (not
 * installed, not running, or a genuinely unsupported browser), so nothing
 * changes for a restaurant that hasn't set it up.
 */
const AGENT_URL = "http://127.0.0.1:9123/print";
const AGENT_TIMEOUT_MS = 1500;

async function tryLocalAgentPrint(escPosBase64: string | undefined): Promise<boolean> {
  if (!escPosBase64) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);
    const res = await fetch(AGENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bytesBase64: escPosBase64 }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/** Use this from a Print button's onClick or an auto-print effect instead of calling window.print() directly. */
export async function printOrFallback(escPosBase64: string | undefined) {
  const printed = await tryLocalAgentPrint(escPosBase64);
  if (!printed) window.print();
}
