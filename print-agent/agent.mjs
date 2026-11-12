// BhojSetu local print agent — a tiny helper that runs on a restaurant's own
// PC and listens on 127.0.0.1 only. The BhojSetu dashboard (running in the
// browser, even on the live bhojsetu.in domain) posts pre-built ESC/POS
// bytes here; this agent sends them straight to the printer as a RAW print
// job (see rawprint-server.ps1), bypassing Windows' print dialog and paper
// size matching entirely. See src/lib/local-print-agent.ts for the browser
// side and src/lib/escpos.ts for how the bytes are built.
//
// Entirely optional — the dashboard falls back to the normal browser print
// dialog whenever this isn't running. Nothing breaks by not running this.
//
// The actual Win32 printing runs in ONE persistent PowerShell process
// (rawprint-server.ps1), started once below and kept alive for as long as
// this agent runs. An earlier version spawned a fresh PowerShell + recompiled
// its C# helper via Add-Type on every single print request, which could take
// 1-3+ seconds and caused real timeouts/duplicate prints — compiling once at
// startup and reusing the same process for every job after that avoids all
// of that.

import { createServer } from "node:http";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, "config.json"), "utf8"));
const WORKER_SCRIPT = join(__dirname, "rawprint-server.ps1");

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

// --- Persistent print worker -------------------------------------------------

let worker = null;
let workerReady = null;
let rl = null;
/** Jobs are strictly serialized through this one process — one line in, one line out, in order — so concurrent requests never interleave on the same stdin/stdout pipe. */
let jobChain = Promise.resolve();

function startWorker() {
  worker = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", WORKER_SCRIPT]);
  rl = createInterface({ input: worker.stdout });
  workerReady = new Promise((resolve) => {
    rl.once("line", (line) => {
      if (line.trim() === "READY") resolve();
    });
  });
  worker.stderr.on("data", (d) => console.error("[worker stderr]", d.toString().trim()));
  worker.on("exit", (code) => {
    console.error(`print worker exited (code ${code}) — restarting`);
    startWorker();
  });
}
startWorker();

function sendJob(printerName, filePath) {
  const run = () =>
    workerReady.then(
      () =>
        new Promise((resolve) => {
          const onLine = (line) => resolve(line.trim());
          rl.once("line", onLine);
          worker.stdin.write(JSON.stringify({ printerName, filePath }) + "\n");
        }),
    );
  const result = jobChain.then(run, run);
  jobChain = result.then(
    () => {},
    () => {},
  );
  return result;
}

async function sendRaw(printerName, bytes) {
  const tmpFile = join(tmpdir(), `bhojsetu-print-${randomUUID()}.bin`);
  writeFileSync(tmpFile, bytes);
  try {
    const line = await sendJob(printerName, tmpFile);
    return { ok: line === "OK", log: line };
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      // Best-effort cleanup — a leftover temp file isn't worth failing the request over.
    }
  }
}

// --- HTTP server --------------------------------------------------------

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
