import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPublicBoard, SourceGatewayError } from "./sourceGateway.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(root, "dist");
const port = Number(process.env.PORT ?? 5173);
const development = process.argv.includes("--dev");
const cache = new Map<string, { expiresAt: number; value: Awaited<ReturnType<typeof loadPublicBoard>> }>();
const requestWindows = new Map<string, { startedAt: number; count: number }>();

function setSecurityHeaders(response: ServerResponse) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  const scriptPolicy = development ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'";
  const connectPolicy = "connect-src 'self'";
  response.setHeader("Content-Security-Policy", `default-src 'self'; ${scriptPolicy}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; ${connectPolicy}; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`);
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  setSecurityHeaders(response);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

function withinRateLimit(request: IncomingMessage) {
  const key = request.socket.remoteAddress ?? "local";
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt > 60_000) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= 30;
}

async function handleApi(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: { code: "method_not_allowed", message: "This endpoint is read-only." } });
    return;
  }
  if (!withinRateLimit(request)) {
    sendJson(response, 429, { error: { code: "rate_limited", message: "Too many source checks were requested. Wait a moment and try again." } });
    return;
  }
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const sourceUrl = requestUrl.searchParams.get("sourceUrl") ?? "";
  try {
    const cacheKey = sourceUrl.trim().toLowerCase();
    const cached = cache.get(cacheKey);
    const value = cached && cached.expiresAt > Date.now()
      ? cached.value
      : await loadPublicBoard(sourceUrl);
    if (!cached || cached.expiresAt <= Date.now()) cache.set(cacheKey, { expiresAt: Date.now() + 5 * 60_000, value });
    sendJson(response, 200, value);
  } catch (error) {
    const normalized = error instanceof SourceGatewayError
      ? error
      : new SourceGatewayError("The public board could not be checked safely.");
    sendJson(response, normalized.status, { error: { code: normalized.code, message: normalized.message } });
  }
}

const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

async function serveStatic(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  let requestedPath: string;
  try {
    requestedPath = decodeURIComponent(url.pathname);
  } catch {
    setSecurityHeaders(response);
    response.statusCode = 400;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end("The requested path is invalid.");
    return;
  }
  const candidate = path.resolve(distDirectory, `.${requestedPath}`);
  const safeCandidate = candidate.startsWith(`${distDirectory}${path.sep}`) ? candidate : path.join(distDirectory, "index.html");
  let filePath = safeCandidate;
  try {
    const fileStatus = await stat(filePath);
    if (fileStatus.isDirectory()) filePath = path.join(filePath, "index.html");
  } catch {
    if (path.extname(requestedPath)) {
      setSecurityHeaders(response);
      response.statusCode = 404;
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
      response.end("The requested resource was not found.");
      return;
    }
    filePath = path.join(distDirectory, "index.html");
  }
  setSecurityHeaders(response);
  response.statusCode = 200;
  response.setHeader("Content-Type", mimeTypes[path.extname(filePath)] ?? "application/octet-stream");
  response.setHeader("Cache-Control", path.basename(filePath) === "index.html" ? "no-cache" : "public, max-age=31536000, immutable");
  createReadStream(filePath).on("error", () => {
    if (!response.headersSent) response.statusCode = 500;
    response.end("The application could not be loaded.");
  }).pipe(response);
}

let vite: Awaited<ReturnType<typeof import("vite")["createServer"]>> | null = null;
if (development) {
  const { createServer: createViteServer } = await import("vite");
  vite = await createViteServer({ root, server: { middlewareMode: true, hmr: false }, appType: "spa", configLoader: "native" });
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    if (requestUrl.pathname === "/api/job-sources") {
      await handleApi(request, response);
      return;
    }
    if (vite) {
      setSecurityHeaders(response);
      vite.middlewares(request, response, () => {
        if (!response.writableEnded) sendJson(response, 404, { error: { code: "not_found", message: "The requested resource was not found." } });
      });
      return;
    }
    await serveStatic(request, response);
  } catch {
    if (!response.writableEnded) sendJson(response, 500, { error: { code: "server_error", message: "The request could not be completed safely." } });
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`RoleAxis is available at http://127.0.0.1:${port}\n`);
});
