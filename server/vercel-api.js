import { timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";
import initialMenu from "../shared/initialMenu.json" with { type: "json" };

export const MENU_KEY = "delifruits:menu";
export const ORDER_INDEX_KEY = "delifruits:orders:index";
export const orderKey = (id) => `delifruits:orders:${id}`;

let redisClient;
export function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  if (!redisClient) redisClient = new Redis({ url, token });
  return redisClient;
}

export function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function adminError(request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return { status: 503, error: "Falta configurar ADMIN_PASSWORD en las variables de entorno de Vercel." };
  const provided = request.headers.get("x-admin-password") || "";
  const expectedBuffer = Buffer.from(password);
  const providedBuffer = Buffer.from(provided);
  const valid = expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
  return valid ? null : { status: 401, error: "La contraseña no es correcta." };
}

export function storageError() {
  return json({ error: "Falta conectar Upstash Redis al proyecto de Vercel. Agregá la integración y volvé a desplegar." }, 503);
}

export async function readMenu(redis) {
  const current = await redis.get(MENU_KEY);
  if (current) return current;
  await redis.set(MENU_KEY, initialMenu, { nx: true });
  return await redis.get(MENU_KEY) || initialMenu;
}

export { initialMenu };
