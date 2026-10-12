import { adminError, getRedis, initialMenu, json, MENU_KEY, readMenu, storageError } from "../server/vercel-api.js";

export async function GET() {
  const redis = getRedis();
  if (!redis) return json(initialMenu);
  try {
    return json(await readMenu(redis));
  } catch {
    return json({ error: "No se pudo cargar el menú guardado." }, 500);
  }
}

export async function PUT(request) {
  const authError = adminError(request);
  if (authError) return json({ error: authError.error }, authError.status);
  const redis = getRedis();
  if (!redis) return storageError();

  let menu;
  try {
    menu = await request.json();
  } catch {
    return json({ error: "El cuerpo de la solicitud no es válido." }, 400);
  }
  if (!Array.isArray(menu?.categories) || !Array.isArray(menu?.toppings)) {
    return json({ error: "El menú debe incluir categorías y toppings." }, 400);
  }

  try {
    await redis.set(MENU_KEY, menu);
    return json(menu);
  } catch {
    return json({ error: "No se pudo guardar el menú. Revisá la conexión con Upstash Redis." }, 500);
  }
}
