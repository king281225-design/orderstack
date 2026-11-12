// BhojSetu local print agent — a tiny helper that runs on a restaurant's own
// PC and listens on 127.0.0.1 only. The BhojSetu dashboard (running in the
// browser, even on the live bhojsetu.in domain) posts pre-built ESC/POS
// bytes here; this agent sends them straight to the printer as a RAW print
// job (see rawprint.ps1), bypassing Windows' print dialog and paper-size
// matching entirely. See src/lib/local-print-agent.ts for the browser side
// and src/lib/escpos.ts for how the bytes are built.
//
// Entirely optional — the dashboard falls back to the normal browser print
// dialog whenever this isn't running. Nothing breaks by not running this.

import { createServer } from "node:http";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, "config.json"), "utf8"));
const RAWPRINT_PS1 = join(__dirname, "rawprint.ps1");

function corsHeaders(origin) {
  const allowed = config.allowedOrigins.includes(origin) ? origin : config.allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    // Chrome's Private Network Access check — a page on a public https
    // origin calling a loopback address needs this on both the preflight
    // and the real response, or the fetch is blocked before it gets here.
    "Access-Control-Allow-Private-Network": "true",
  };
}

function sendRaw(printerName, bytes) {
  return new Promise((resolve) => {
    const tmpFile = join(tmpdir(), `bhojsetu-print-${randomUUID()}.bin`);
    writeFileSync(tmpFile, bytes);
    const ps = spawn("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      RAWPRINT_PS1,
      "-PrinterName",
      printerName,
      "-FilePath",
      tmpFile,
    ]);
    let out = "";
    ps.stdout.on("data", (d) => (out += d.toString()));
    ps.stderr.on("data", (d) => (out += d.toString()));
    ps.on("close", (code) => {
      try {
        unlinkSync(tmpFile);
      } catch {
        // Best-effort cleanup — a leftover temp file isn't worth failing the request over.
      }
      resolve({ ok: code === 0 && out.includes("OK"), log: out.trim() });
    });
  });
}

const server = createServer((req, res) => {
  const origin = req.headers.origin ?? "";
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { ...headers, "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, printerName: config.printerName }));
    return;
  }

  if (req.method === "POST" && req.url === "/print") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { bytesBase64 } = JSON.parse(body);
        if (typeof bytesBase64 !== "string" || bytesBase64.length === 0) {
          res.writeHead(400, { ...headers, "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "missing bytesBase64" }));
          return;
        }
        const bytes = Buffer.from(bytesBase64, "base64");
        const result = await sendRaw(config.printerName, bytes);
        console.log(new Date().toISOString(), result.ok ? "printed OK" : `FAILED: ${result.log}`);
        res.writeHead(result.ok ? 200 : 500, { ...headers, "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("print request error:", err);
        res.writeHead(500, { ...headers, "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      }
    });
    return;
  }

  res.writeHead(404, headers);
  res.end();
});

// 127.0.0.1 only — never 0.0.0.0 — this must not be reachable from the
// network, only from the browser on this same PC.
server.listen(config.port, "127.0.0.1", () => {
  console.log(`BhojSetu print agent listening on http://127.0.0.1:${config.port} (printer: ${config.printerName})`);
});
