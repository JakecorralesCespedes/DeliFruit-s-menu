export function validateOrder(order) {
  return order && typeof order.customerName === "string" && order.customerName.trim().length > 0
    && Array.isArray(order.items) && order.items.length > 0 && order.items.length <= 50
    && ["web", "whatsapp"].includes(order.channel);
}

export function priceOrderLines(items, menu) {
  const products = menu.categories.flatMap((category) => category.products);
  const lines = [];
  for (const item of items) {
    if (!item || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      return { error: "La cantidad de un producto no es válida." };
    }
    const product = products.find((entry) => entry.id === item.productId);
    if (!product) return { error: "Un producto cambió o ya no está disponible. Actualizá el menú y volvé a intentarlo.", status: 409 };
    const options = Array.isArray(product.options) ? product.options : [];
    const selectedOption = options.length ? options.find((option) => option.name === item.optionName) : null;
    if (options.length && !selectedOption) return { error: "Una presentación cambió. Actualizá el menú y volvé a intentarlo.", status: 409 };
    const flavors = Array.isArray(product.flavors) ? product.flavors : [];
    if ((flavors.length && !flavors.includes(item.flavor)) || (!flavors.length && item.flavor)) {
      return { error: "Un sabor cambió. Actualizá el menú y volvé a intentarlo.", status: 409 };
    }
    const selectedIds = Array.isArray(item.toppings) ? item.toppings.map((topping) => topping.id) : [];
    if (new Set(selectedIds).size !== selectedIds.length) return { error: "Un topping aparece más de una vez." };
    const toppings = (menu.toppings || []).filter((topping) => selectedIds.includes(topping.id));
    if (toppings.length !== selectedIds.length) return { error: "Un topping cambió. Actualizá el menú y volvé a intentarlo.", status: 409 };
    const unitPrice = Number(selectedOption?.price ?? product.price ?? 0) + toppings.reduce((sum, topping) => sum + Number(topping.price || 0), 0);
    if (Number(item.unitPrice) !== unitPrice) return { error: "Cambió el precio de un producto. Actualizá el menú y volvé a intentarlo.", status: 409 };
    const details = [selectedOption?.name, item.flavor || "", toppings.map((topping) => topping.name).join(", ")].filter(Boolean).join(" · ");
    lines.push({
      productId: product.id,
      productName: product.name,
      emoji: product.emoji || "🍓",
      optionName: selectedOption?.name || "",
      flavor: item.flavor || "",
      toppings: toppings.map(({ id, name, price }) => ({ id, name, price })),
      details,
      quantity: item.quantity,
      unitPrice,
    });
  }
  return { lines, total: lines.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) };
}
