/**
 * Development proxy server for Expo web + API.
 * Listens on PORT (default 5000) immediately and routes:
 *   /api/*  → Express API server (localhost:3000)
 *   everything else → Metro bundler (localhost:METRO_PORT)
 *
 * The proxy starts serving on PORT right away so the webview workflow
 * can open its port without waiting for Metro.  While Metro is still
 * warming up, non-API requests receive a minimal loading page that
 * auto-refreshes every 3 seconds until Metro is ready.
 */

const http = require("http");
const net = require("net");

const PROXY_PORT = parseInt(process.env.PORT || "5000", 10);
const API_PORT = parseInt(process.env.API_PORT || "3000", 10);
const METRO_PORT = parseInt(process.env.METRO_PORT || "18115", 10);

let metroReady = false;

function checkPort(port, host) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ port, host }, () => {
      sock.destroy();
      resolve(true);
    });
    sock.on("error", () => {
      sock.destroy();
      resolve(false);
    });
  });
}

async function pollMetro() {
  while (true) {
    const ok = await checkPort(METRO_PORT, "localhost");
    if (ok) {
      metroReady = true;
      console.log(`Metro ready on port ${METRO_PORT}`);
      break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

function loadingPage(metroPort) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="3">
  <title>Loading TradeLog…</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #111; color: #ddd;
           display: flex; align-items: center; justify-content: center;
           height: 100vh; margin: 0; }
    .box { text-align: center; }
    .spinner { width: 40px; height: 40px; border: 4px solid #333;
               border-top-color: #4ecdc4; border-radius: 50%;
               animation: spin 1s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { color: #888; font-size: 14px; }
  </style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <h2>Starting Metro bundler…</h2>
    <p>This page will refresh automatically.</p>
  </div>
</body>
</html>`;
}

function proxyRequest(req, res, targetPort, stripCors = false) {
  const headers = { ...req.headers, host: `localhost:${targetPort}` };
  if (stripCors) {
    // Strip Origin/Referer so Metro's CORS middleware doesn't block
    // asset/font requests coming from a different domain (expo iframe).
    delete headers.origin;
    delete headers.referer;
  }
  const options = {
    hostname: "localhost",
    port: targetPort,
    path: req.url,
    method: req.method,
    headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const outHeaders = { ...proxyRes.headers };
    if (stripCors) {
      // Allow cross-origin font/asset loads (expo domain → pike domain).
      outHeaders["access-control-allow-origin"] = "*";
      outHeaders["access-control-allow-methods"] = "GET, HEAD, OPTIONS";
    }
    res.writeHead(proxyRes.statusCode, outHeaders);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    console.error(`Proxy error to port ${targetPort}:`, err.message);
    if (!res.headersSent) {
      res.writeHead(502);
      res.end("Bad Gateway");
    }
  });

  req.pipe(proxyReq, { end: true });
}

function start() {
  // Begin polling for Metro in the background
  pollMetro();

  const server = http.createServer((req, res) => {
    const url = req.url || "/";
    const isApi = url.startsWith("/api/") || url === "/api";

    if (isApi) {
      proxyRequest(req, res, API_PORT);
    } else if (!metroReady) {
      res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
      res.end(loadingPage(METRO_PORT));
    } else {
      proxyRequest(req, res, METRO_PORT, true);
    }
  });

  // Support WebSocket upgrades (Metro uses WebSockets for HMR)
  server.on("upgrade", (req, socket, head) => {
    if (!metroReady) {
      socket.destroy();
      return;
    }
    const target = net.createConnection(METRO_PORT, "localhost", () => {
      target.write(
        `${req.method} ${req.url} HTTP/1.1\r\n` +
          Object.entries(req.headers)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\r\n") +
          "\r\n\r\n"
      );
      target.write(head);
      socket.pipe(target);
      target.pipe(socket);
    });
    target.on("error", () => socket.destroy());
    socket.on("error", () => target.destroy());
  });

  server.listen(PROXY_PORT, "0.0.0.0", () => {
    console.log(`Dev proxy listening on port ${PROXY_PORT}`);
    console.log(`  /api/* → localhost:${API_PORT}`);
    console.log(`  other  → localhost:${METRO_PORT} (Metro, ${metroReady ? "ready" : "warming up"})`);
  });
}

start();
