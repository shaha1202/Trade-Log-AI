/**
 * expo-wrapper.js
 *
 * Starts a lightweight HTTP server on PORT (18115) immediately so Replit's
 * workflow health check passes, then starts Metro on METRO_INNER_PORT (18116)
 * in the background.  Once Metro is ready the lightweight server proxies all
 * requests to it so the canvas/Expo-domain iframe shows the real app.
 *
 * Usage (from the dev script):
 *   node server/expo-wrapper.js
 */

const http = require("http");
const net = require("net");
const { spawn } = require("child_process");

const PORT = parseInt(process.env.PORT || "18115", 10);
const METRO_INNER_PORT = parseInt(process.env.METRO_INNER_PORT || "18116", 10);

let metroReady = false;

function loadingPage() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="3">
  <title>Starting TradeLog…</title>
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

function proxyRequest(req, res, targetPort) {
  const headers = { ...req.headers, host: `localhost:${targetPort}` };
  // Strip Origin/Referer so Metro's CORS middleware does not block
  // asset requests (fonts, images) coming from the expo domain iframe.
  delete headers.origin;
  delete headers.referer;
  const options = {
    hostname: "localhost",
    port: targetPort,
    path: req.url,
    method: req.method,
    headers,
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end("Bad Gateway: " + err.message);
    }
  });
  req.pipe(proxyReq, { end: true });
}

function checkPort(port) {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, host: "localhost" }, () => {
      s.destroy();
      resolve(true);
    });
    s.on("error", () => {
      s.destroy();
      resolve(false);
    });
  });
}

async function pollMetro() {
  while (true) {
    if (await checkPort(METRO_INNER_PORT)) {
      metroReady = true;
      console.log(`[expo-wrapper] Metro ready on port ${METRO_INNER_PORT}`);
      break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

function startMetro() {
  const env = {
    ...process.env,
    PORT: String(METRO_INNER_PORT),
    METRO_INNER_PORT: undefined,
  };

  const child = spawn(
    "pnpm",
    ["exec", "expo", "start", "--localhost", "--port", String(METRO_INNER_PORT)],
    {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    }
  );

  child.on("error", (err) => {
    console.error("[expo-wrapper] Failed to start Metro:", err.message);
    process.exit(1);
  });

  child.on("exit", (code) => {
    console.log(`[expo-wrapper] Metro exited with code ${code}`);
    process.exit(code ?? 0);
  });

  return child;
}

// Start Metro in background and poll for readiness
startMetro();
pollMetro();

// Start the proxy server immediately on PORT
const server = http.createServer((req, res) => {
  if (!metroReady) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(loadingPage());
  } else {
    proxyRequest(req, res, METRO_INNER_PORT);
  }
});

server.on("upgrade", (req, socket, head) => {
  if (!metroReady) {
    socket.destroy();
    return;
  }
  const target = net.createConnection(METRO_INNER_PORT, "localhost", () => {
    const filteredHeaders = Object.entries(req.headers).filter(
      ([k]) => k !== "origin" && k !== "referer"
    );
    target.write(
      `${req.method} ${req.url} HTTP/1.1\r\n` +
        filteredHeaders.map(([k, v]) => `${k}: ${v}`).join("\r\n") +
        "\r\n\r\n"
    );
    target.write(head);
    socket.pipe(target);
    target.pipe(socket);
  });
  target.on("error", () => socket.destroy());
  socket.on("error", () => target.destroy());
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[expo-wrapper] Proxy listening on port ${PORT} (Metro warming up on ${METRO_INNER_PORT})`);
});

process.on("SIGTERM", () => {
  server.close();
  process.exit(0);
});
