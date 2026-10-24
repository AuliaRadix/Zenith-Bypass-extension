/**
 * Zenith Bypass - Serverless Secure Edge Proxy
 * High-performance, zero-dependency Node.js HTTP/HTTPS Connect Proxy with Basic Authentication.
 * Deployable to Render, Koyeb, Railway, Fly.io, or any VPS/container.
 */

const http = require("http");
const net = require("net");
const url = require("url");

const PORT = parseInt(process.env.PORT, 10) || 8080;
const PROXY_USER = process.env.PROXY_USERNAME || "";
const PROXY_PASS = process.env.PROXY_PASSWORD || "";
const REQUIRE_AUTH = Boolean(PROXY_USER && PROXY_PASS);

/**
 * Validate incoming Proxy-Authorization or Authorization header
 */
function isAuthorized(req) {
  if (!REQUIRE_AUTH) return true;

  const authHeader = req.headers["proxy-authorization"] || req.headers["authorization"];
  if (!authHeader) return false;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "basic") return false;

  try {
    const credentials = Buffer.from(parts[1], "base64").toString("utf8");
    const [user, pass] = credentials.split(":");
    return user === PROXY_USER && pass === PROXY_PASS;
  } catch (err) {
    return false;
  }
}

const server = http.createServer();

/**
 * Handle HTTP CONNECT requests (HTTPS Tunneling)
 */
server.on("connect", (req, clientSocket, head) => {
  if (!isAuthorized(req)) {
    clientSocket.write(
      "HTTP/1.1 407 Proxy Authentication Required\r\n" +
      'Proxy-Authenticate: Basic realm="Zenith Edge Proxy"\r\n' +
      "Content-Length: 0\r\n" +
      "\r\n"
    );
    clientSocket.end();
    return;
  }

  // Parse target host and port
  const [targetHost, targetPortStr] = req.url.split(":");
  const targetPort = parseInt(targetPortStr, 10) || 443;

  if (!targetHost) {
    clientSocket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    clientSocket.end();
    return;
  }

  const serverSocket = net.connect(targetPort, targetHost, () => {
    clientSocket.write(
      "HTTP/1.1 200 Connection Established\r\n" +
      "Proxy-Agent: Zenith-Bypass/1.0.0\r\n" +
      "\r\n"
    );
    if (head && head.length > 0) {
      serverSocket.write(head);
    }
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on("error", (err) => {
    clientSocket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
    clientSocket.end();
  });

  clientSocket.on("error", () => {
    serverSocket.destroy();
  });

  serverSocket.setTimeout(60000, () => {
    serverSocket.end();
  });

  clientSocket.setTimeout(60000, () => {
    clientSocket.end();
  });
});

/**
 * Handle standard HTTP requests and Health Check
 */
server.on("request", (req, res) => {
  // Health check endpoint for monitoring & latency testing
  if (req.url === "/health" || req.url === "/ping" || req.url === "/") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "zenith-bypass-edge",
        authRequired: REQUIRE_AUTH,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      })
    );
    return;
  }

  // Standard forward proxy for plain HTTP
  if (!isAuthorized(req)) {
    res.writeHead(407, {
      'Proxy-Authenticate': 'Basic realm="Zenith Edge Proxy"',
      "Content-Type": "text/plain"
    });
    res.end("Proxy Authentication Required");
    return;
  }

  try {
    const parsed = url.parse(req.url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.path,
      method: req.method,
      headers: { ...req.headers }
    };

    delete options.headers["proxy-authorization"];

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on("error", () => {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end("Bad Gateway");
    });

    req.pipe(proxyReq);
  } catch (err) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad Request");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Zenith Edge Proxy] Listening on port ${PORT}`);
  console.log(`[Zenith Edge Proxy] Authentication: ${REQUIRE_AUTH ? "Enabled (" + PROXY_USER + ")" : "Disabled (Public/Protected via Edge)"}`);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
