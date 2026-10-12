import { randomUUID } from "node:crypto";
import { priceOrderLines, validateOrder } from "../shared/order-domain.js";
import { adminError, getRedis, json, orderKey, ORDER_INDEX_KEY, readMenu, storageError } from "../server/vercel-api.js";

const validStatuses = ["pendiente", "en proceso", "entregado"];

export async function GET(request) {
  const authError = adminError(request);
  if (authError) return json({ error: authError.error }, authError.status);
  const redis = getRedis();
  if (!redis) return storageError();

  try {
    const ids = await redis.zrange(ORDER_INDEX_KEY, 0, -1, { rev: true });
    const orders = await Promise.all(ids.map((id) => redis.get(orderKey(id))));
    return json(orders.filter(Boolean));
  } catch {
    return json({ error: "No se pudieron cargar los pedidos." }, 500);
  }
}

export async function POST(request) {
  const redis = getRedis();
  if (!redis) return storageError();

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "El cuerpo de la solicitud no es válido." }, 400);
  }
  if (!validateOrder(body)) {
    return json({ error: "El pedido necesita un nombre y al menos un producto." }, 400);
  }

  try {
    const pricedOrder = priceOrderLines(body.items, await readMenu(redis));
    if (pricedOrder.error) return json({ error: pricedOrder.error }, pricedOrder.status || 400);

    const now = new Date();
    const order = {
      id: `DF-${now.getTime().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      customerName: body.customerName.trim().slice(0, 100),
      customerPhone: typeof body.customerPhone === "string" ? body.customerPhone.trim().slice(0, 40) : "",
      note: typeof body.note === "string" ? body.note.trim().slice(0, 500) : "",
      channel: body.channel,
      items: pricedOrder.lines,
      total: pricedOrder.total,
      status: "pendiente",
      createdAt: now.toISOString(),
    };
    await redis.multi()
      .set(orderKey(order.id), order)
      .zadd(ORDER_INDEX_KEY, { score: now.getTime(), member: order.id })
      .exec();
    return json(order, 201);
  } catch {
    return json({ error: "No se pudo registrar el pedido. Intentá de nuevo." }, 500);
  }
}

export async function PATCH(request) {
  const authError = adminError(request);
  if (authError) return json({ error: authError.error }, authError.status);
  const redis = getRedis();
  if (!redis) return storageError();

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "El cuerpo de la solicitud no es válido." }, 400);
  }
  if (typeof body?.id !== "string" || !validStatuses.includes(body.status)) {
    return json({ error: "El estado o el identificador del pedido no son válidos." }, 400);
  }

  try {
    const order = await redis.get(orderKey(body.id));
    if (!order) return json({ error: "No se encontró el pedido." }, 404);
    const updated = { ...order, status: body.status, updatedAt: new Date().toISOString() };
    await redis.set(orderKey(body.id), updated);
    return json(updated);
  } catch {
    return json({ error: "No se pudo actualizar el pedido." }, 500);
  }
}
