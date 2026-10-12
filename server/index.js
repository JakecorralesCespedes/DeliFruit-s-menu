import http from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { timingSafeEqual } from "node:crypto";
import { priceOrderLines, validateOrder } from "../shared/order-domain.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const dist = resolve(root, "dist");

function loadDotEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadDotEnv();

const dataDirectory = resolve(process.env.DATA_DIR || resolve(root, "data"));
const menuPath = resolve(dataDirectory, "menu.json");
const ordersPath = resolve(dataDirectory, "orders.json");
const initialMenuPath = resolve(root, "shared", "initialMenu.json");
mkdirSync(dataDirectory, { recursive: true });

function ensureFile(path, initialValue) {
  if (!existsSync(path)) writeFileSync(path, `${JSON.stringify(initialValue, null, 2)}\n`);
}

ensureFile(menuPath, JSON.parse(readFileSync(initialMenuPath, "utf8")));
ensureFile(ordersPath, []);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  const temporaryPath = `${path}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporaryPath, path);
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 8 * 1024 * 1024) throw Object.assign(new Error("El archivo es demasiado grande."), { status: 413 });
    chunks.push(chunk);
  }
  if (!bytes) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("El cuerpo de la solicitud no es válido."), { status: 400 });
  }
}

function adminAuthorized(request) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) return { ok: false, status: 503, error: "Configurá ADMIN_PASSWORD en el archivo .env para habilitar administración." };
  const provided = request.headers["x-admin-password"];
  if (typeof provided !== "string") return { ok: false, status: 401, error: "Ingresá la contraseña de administración." };
  const expectedBuffer = Buffer.from(configuredPassword);
  const actualBuffer = Buffer.from(provided);
  const matches = expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
  return matches ? { ok: true } : { ok: false, status: 401, error: "La contraseña no es correcta." };
}

function requireAdmin(request, response) {
  const result = adminAuthorized(request);
  if (result.ok) return true;
  sendJson(response, result.status, { error: result.error });
  return false;
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function serveStatic(request, response) {
  if (!existsSync(resolve(dist, "index.html"))) {
    sendJson(response, 404, { error: "La aplicación todavía no está compilada. Ejecutá npm run build." });
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    sendJson(response, 400, { error: "La ruta solicitada no es válida." });
    return;
  }
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  let filePath = resolve(dist, requested);
  if (filePath !== dist && !filePath.startsWith(`${dist}${sep}`)) {
    sendJson(response, 403, { error: "Ruta no permitida." });
    return;
  }
  if (!existsSync(filePath)) {
    if (extname(pathname)) {
      sendJson(response, 404, { error: "No se encontró el archivo." });
      return;
    }
    filePath = resolve(dist, "index.html");
  }
  response.writeHead(200, {
    "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "cache-control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=3600",
  });
  createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  try {
    if (request.method === "GET" && pathname === "/api/health") {
      sendJson(response, 200, { ok: true });
      return;
    }
    if (request.method === "GET" && pathname === "/api/menu") {
      sendJson(response, 200, readJson(menuPath));
      return;
    }
    if (request.method === "PUT" && pathname === "/api/menu") {
      if (!requireAdmin(request, response)) return;
      const menu = await readBody(request);
      if (!Array.isArray(menu.categories) || !Array.isArray(menu.toppings)) {
        sendJson(response, 400, { error: "El menú debe incluir categorías y toppings." });
        return;
      }
      writeJson(menuPath, menu);
      sendJson(response, 200, menu);
      return;
    }
    if (request.method === "GET" && pathname === "/api/orders") {
      if (!requireAdmin(request, response)) return;
      sendJson(response, 200, readJson(ordersPath).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      return;
    }
    if (request.method === "POST" && pathname === "/api/orders") {
      const body = await readBody(request);
      if (!validateOrder(body)) {
        sendJson(response, 400, { error: "El pedido necesita un nombre y al menos un producto." });
        return;
      }
      const pricedOrder = priceOrderLines(body.items, readJson(menuPath));
      if (pricedOrder.error) {
        sendJson(response, pricedOrder.status || 400, { error: pricedOrder.error });
        return;
      }
      const orders = readJson(ordersPath);
      const order = {
        id: `DF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        customerName: body.customerName.trim().slice(0, 100),
        customerPhone: typeof body.customerPhone === "string" ? body.customerPhone.trim().slice(0, 40) : "",
        note: typeof body.note === "string" ? body.note.trim().slice(0, 500) : "",
        channel: body.channel,
        items: pricedOrder.lines,
        total: pricedOrder.total,
        status: "pendiente",
        createdAt: new Date().toISOString(),
      };
      orders.push(order);
      writeJson(ordersPath, orders);
      sendJson(response, 201, order);
      return;
    }
    const orderMatch = pathname.match(/^\/api\/orders\/([^/]+)$/);
    if (request.method === "PATCH" && (pathname === "/api/orders" || orderMatch)) {
      if (!requireAdmin(request, response)) return;
      const body = await readBody(request);
      const orderId = pathname === "/api/orders" ? body.id : decodeURIComponent(orderMatch[1]);
      if (typeof orderId !== "string" || !["pendiente", "en proceso", "entregado"].includes(body.status)) {
        sendJson(response, 400, { error: "El estado del pedido no es válido." });
        return;
      }
      const orders = readJson(ordersPath);
      const order = orders.find((entry) => entry.id === orderId);
      if (!order) {
        sendJson(response, 404, { error: "No se encontró el pedido." });
        return;
      }
      order.status = body.status;
      order.updatedAt = new Date().toISOString();
      writeJson(ordersPath, orders);
      sendJson(response, 200, order);
      return;
    }
    if (pathname.startsWith("/api/")) {
      sendJson(response, 404, { error: "No se encontró esta función." });
      return;
    }
    serveStatic(request, response);
  } catch (error) {
    sendJson(response, error.status || 500, { error: error.status ? error.message : "Ocurrió un error al procesar la solicitud." });
  }
});

const port = Number(process.env.PORT) || 8787;
server.listen(port, "0.0.0.0", () => {
  console.log(`DeliFruit's listo en http://localhost:${port}`);
  if (!process.env.ADMIN_PASSWORD) console.warn("Administración desactivada. Copiá .env.example a .env y configurá ADMIN_PASSWORD.");
});
