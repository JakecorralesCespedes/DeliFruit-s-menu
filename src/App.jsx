import { useEffect, useMemo, useState } from "react";

const WHATSAPP = "50661325941";
const money = (amount) => `₡${Number(amount || 0).toLocaleString("es-CR")}`;
const slug = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "No se pudo completar la solicitud.");
  return payload;
}

function ProductCard({ product, onChoose }) {
  const startPrice = product.options?.length
    ? Math.min(...product.options.map((option) => option.price))
    : product.price;
  const hasPriceRange = product.options?.length > 1;
  return (
    <button className="product-card" onClick={() => onChoose(product)}>
      <span className="product-card__image">
        {product.image ? <img src={product.image} alt={product.name} loading="lazy" /> : <span className="product-card__emoji">{product.emoji || "🍓"}</span>}
        <span className="product-card__plus" aria-hidden="true">+</span>
      </span>
      <span className="product-card__body">
        <span className="product-card__name">{product.name}</span>
        <span className="product-card__description">{product.description || "Preparado con cariño y bien fresco."}</span>
        <span className="product-card__bottom">
          <span className="product-card__price">{hasPriceRange ? `Desde ${money(startPrice)}` : money(startPrice)}</span>
          {product.flavors?.length > 0 && <span className="product-card__custom">Personalizable</span>}
        </span>
      </span>
    </button>
  );
}

function ProductDialog({ product, toppings, onClose, onAdd }) {
  const [optionIndex, setOptionIndex] = useState(0);
  const [flavor, setFlavor] = useState("");
  const [toppingIds, setToppingIds] = useState([]);
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    setOptionIndex(0);
    setFlavor("");
    setToppingIds([]);
    setQuantity(1);
  }, [product]);
  if (!product) return null;

  const option = product.options?.[optionIndex];
  const selectedToppings = toppings.filter((topping) => toppingIds.includes(topping.id));
  const unitPrice = (option?.price ?? product.price ?? 0) + selectedToppings.reduce((sum, topping) => sum + Number(topping.price || 0), 0);
  const needsFlavor = Boolean(product.flavors?.length);
  const ready = !needsFlavor || Boolean(flavor);
  const toggleTopping = (id) => setToppingIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="product-title">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Cerrar">×</button>
        <div className="product-dialog__visual">
          {product.image ? <img src={product.image} alt="" /> : <span>{product.emoji || "🍓"}</span>}
        </div>
        <div className="product-dialog__content">
          <span className="eyebrow">A tu manera</span>
          <h2 id="product-title">{product.name}</h2>
          <p>{product.description || "Preparado con cariño y bien fresco."}</p>

          {!!product.options?.length && <fieldset className="choice-group">
            <legend>{product.options.length > 1 ? "Elegí una presentación" : "Presentación"}</legend>
            {product.options.map((item, index) => <label className={`choice-row ${optionIndex === index ? "is-selected" : ""}`} key={`${item.name}-${index}`}>
              <input type="radio" name="product-option" checked={optionIndex === index} onChange={() => setOptionIndex(index)} />
              <span>{item.name}</span><strong>{money(item.price)}</strong>
            </label>)}
          </fieldset>}

          {!!product.flavors?.length && <fieldset className="choice-group">
            <legend>Elegí tu sabor</legend>
            <div className="flavor-grid">{product.flavors.map((item) => <button className={`flavor-chip ${flavor === item ? "is-selected" : ""}`} key={item} onClick={() => setFlavor(item)}>{item}</button>)}</div>
          </fieldset>}

          {!!toppings.length && <fieldset className="choice-group">
            <legend>Agregá toppings <span className="legend-note">(opcional)</span></legend>
            <div className="topping-list">{toppings.map((topping) => <label className="topping-row" key={topping.id}>
              <input type="checkbox" checked={toppingIds.includes(topping.id)} onChange={() => toggleTopping(topping.id)} />
              <span>{topping.name}</span><strong>+ {money(topping.price)}</strong>
            </label>)}</div>
          </fieldset>}

          <div className="dialog-footer">
            <div className="quantity-control" aria-label="Cantidad">
              <button onClick={() => setQuantity((count) => Math.max(1, count - 1))} aria-label="Restar">−</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity((count) => Math.min(20, count + 1))} aria-label="Sumar">+</button>
            </div>
            <button className="button button--primary" disabled={!ready} onClick={() => onAdd({ product, option, flavor, selectedToppings, quantity, unitPrice })}>
              Agregar · {money(unitPrice * quantity)}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function CartPanel({ cart, onClose, onRemove, onCheckout }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const total = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  async function submit(event) {
    event.preventDefault();
    if (!cart.length || !customerName.trim() || sending) return;
    const channel = event.nativeEvent.submitter?.value === "whatsapp" ? "whatsapp" : "web";
    const whatsappWindow = channel === "whatsapp" ? window.open("about:blank", "_blank") : null;
    setSending(true);
    try {
      const savedOrder = await onCheckout({ customerName, customerPhone, note, items: cart, total, channel });
      const lines = cart.map((line) => `• ${line.quantity}× ${line.productName}${line.details ? ` (${line.details})` : ""} — ${money(line.unitPrice * line.quantity)}`);
      const message = `¡Hola DeliFruit's! 🍓 Quiero hacer este pedido:\n\n${lines.join("\n")}\n\nTotal: ${money(total)}\nNombre: ${customerName.trim()}${customerPhone.trim() ? `\nTeléfono: ${customerPhone.trim()}` : ""}${note.trim() ? `\nNota: ${note.trim()}` : ""}`;
      if (channel === "whatsapp") {
        const whatsappUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
        if (whatsappWindow) whatsappWindow.location.href = whatsappUrl;
        else window.open(whatsappUrl, "_blank");
        onClose();
      } else {
        setConfirmation(savedOrder);
      }
      setCustomerName("");
      setCustomerPhone("");
      setNote("");
    } catch (error) {
      whatsappWindow?.close();
      window.alert(error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="overlay overlay--right" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="cart-panel" role="dialog" aria-modal="true" aria-label="Tu pedido">
        <div className="panel-heading">
          <div><span className="eyebrow">Ya casi</span><h2>Tu pedido <span className="cart-count">{cart.reduce((sum, line) => sum + line.quantity, 0)}</span></h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        {confirmation ? <div className="order-confirmation"><span className="order-confirmation__check">✓</span><span className="eyebrow">Pedido recibido</span><h3>¡Gracias, {confirmation.customerName}!</h3><p>Ya recibimos tu pedido. Empezaremos a prepararlo pronto.</p><div className="order-confirmation__code"><small>Número de pedido</small><strong>{confirmation.id}</strong></div><button className="button button--primary" onClick={onClose}>Volver al menú</button></div> : !cart.length ? <div className="cart-empty"><span>🍓</span><h3>Tu bolsa está vacía</h3><p>Elegí algo rico del menú y aquí lo vas a encontrar.</p></div> : <>
          <div className="cart-lines">{cart.map((line) => <article className="cart-line" key={line.id}>
            <span className="cart-line__emoji">{line.emoji}</span>
            <div className="cart-line__body"><strong>{line.quantity}× {line.productName}</strong>{line.details && <small>{line.details}</small>}<span>{money(line.unitPrice * line.quantity)}</span></div>
            <button className="remove-button" onClick={() => onRemove(line.id)} aria-label={`Quitar ${line.productName}`}>×</button>
          </article>)}</div>
          <div className="cart-total"><span>Total</span><strong>{money(total)}</strong></div>
          <form className="checkout-form" onSubmit={submit}>
            <label>Tu nombre<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="¿Cómo te llamás?" autoComplete="name" required maxLength="100" /></label>
            <label>Teléfono <span className="legend-note">(opcional)</span><input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="8888-8888" autoComplete="tel" maxLength="40" /></label>
            <label>Nota para el pedido <span className="legend-note">(opcional)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Algún detalle que debamos saber…" rows="2" maxLength="500" /></label>
            <div className="checkout-actions">
              <button className="button button--primary checkout-web" type="submit" name="channel" value="web" disabled={sending || !cart.length}>{sending ? "Registrando pedido…" : "Confirmar por la página"}<span>✓</span></button>
              <button className="button button--whatsapp" type="submit" name="channel" value="whatsapp" disabled={sending || !cart.length}>{sending ? "Registrando pedido…" : "Enviar también por WhatsApp"}<span>↗</span></button>
            </div>
            <p className="checkout-hint">En ambas opciones el pedido queda registrado para darle seguimiento.</p>
          </form>
        </>}
      </aside>
    </div>
  );
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Seleccioná un archivo de imagen."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la foto."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("No se pudo abrir la foto."));
      image.onload = () => {
        const maxDimension = 1400;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const freshProductForm = (categoryId) => ({ categoryId, name: "", emoji: "🍓", description: "", price: "", optionsText: "", flavorsText: "", image: "" });

function ProductEditor({ categories, item, onCancel, onSave }) {
  const [form, setForm] = useState(() => item ? {
    categoryId: item.categoryId,
    name: item.name,
    emoji: item.emoji || "🍓",
    description: item.description || "",
    price: item.price ?? "",
    optionsText: item.options?.map((option) => `${option.name}: ${option.price}`).join(", ") || "",
    flavorsText: item.flavors?.join(", ") || "",
    image: item.image || "",
  } : freshProductForm(categories[0]?.id));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  async function selectImage(file) {
    if (!file) return;
    try { update("image", await compressImage(file)); setError(""); }
    catch (imageError) { setError(imageError.message); }
  }
  async function submit(event) {
    event.preventDefault();
    setError("");
    const options = form.optionsText.split(/[,\n]/).map((entry) => entry.trim()).filter(Boolean).map((entry) => {
      const [name, value] = entry.split(":");
      return { name: name?.trim(), price: Number(value?.trim().replace(/[^\d.]/g, "")) };
    });
    const flavors = form.flavorsText.split(",").map((entry) => entry.trim()).filter(Boolean);
    const price = Number(String(form.price).replace(/[^\d.]/g, ""));
    if (!form.name.trim()) return setError("Escribí el nombre del producto.");
    if (!options.length && (!Number.isFinite(price) || price < 0)) return setError("Ingresá un precio válido.");
    if (options.some((option) => !option.name || !Number.isFinite(option.price) || option.price < 0)) return setError("Revisá las opciones. Usá el formato: Nombre: precio.");
    setSaving(true);
    try {
      await onSave({
        id: item?.id || `${slug(form.name)}-${makeId().slice(0, 6)}`,
        name: form.name.trim(), emoji: form.emoji.trim() || "🍓", description: form.description.trim(),
        image: form.image,
        ...(options.length ? { options } : { price }),
        ...(flavors.length ? { flavors } : {}),
      }, form.categoryId, item?.categoryId);
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  return <form className="editor-card" onSubmit={submit}>
    <div className="editor-heading"><div><span className="eyebrow">Menú</span><h3>{item ? "Editar producto" : "Nuevo producto"}</h3></div><button type="button" className="icon-button" onClick={onCancel} aria-label="Cerrar">×</button></div>
    <div className="editor-grid">
      <label>Categoría<select value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label>Nombre<input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Ej. Sundae de fresa" required maxLength="80" /></label>
      <label>Emoji<input className="emoji-input" value={form.emoji} onChange={(event) => update("emoji", event.target.value)} maxLength="8" /></label>
      <label className="editor-grid__wide">Descripción<textarea value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Una descripción breve para el menú" rows="2" maxLength="180" /></label>
      <label className="editor-grid__wide">Opciones y precios <span className="legend-note">(separá por coma; ejemplo: Sencillo: 1200, Doble: 1800)</span><input value={form.optionsText} onChange={(event) => update("optionsText", event.target.value)} placeholder="Sencillo: 1200, Doble: 1800" /></label>
      <label>Precio único <span className="legend-note">(si no hay opciones)</span><input type="number" min="0" step="50" value={form.price} onChange={(event) => update("price", event.target.value)} placeholder="1200" /></label>
      <label className="editor-grid__wide">Sabores <span className="legend-note">(opcional, separados por coma)</span><input value={form.flavorsText} onChange={(event) => update("flavorsText", event.target.value)} placeholder="Fresa, Mango, Chocolate" /></label>
      <div className="image-editor editor-grid__wide">
        <div>{form.image ? <img src={form.image} alt="Vista previa del producto" /> : <span>📷</span>}<div><strong>Foto del producto</strong><small>La imagen se ajusta para que cargue rápido.</small></div></div>
        <label className="button button--soft file-button">{form.image ? "Cambiar foto" : "Agregar foto"}<input type="file" accept="image/*" onChange={(event) => selectImage(event.target.files?.[0])} /></label>
        {!!form.image && <button type="button" className="text-button" onClick={() => update("image", "")}>Quitar foto</button>}
      </div>
    </div>
    {error && <p className="form-error">{error}</p>}
    <div className="editor-actions"><button type="button" className="button button--soft" onClick={onCancel}>Cancelar</button><button className="button button--primary" disabled={saving}>{saving ? "Guardando…" : item ? "Guardar cambios" : "Agregar al menú"}</button></div>
  </form>;
}

function AdminPanel({ menu, setMenu, close, password, setPassword }) {
  const [tab, setTab] = useState("pedidos");
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("todos");
  const [loginValue, setLoginValue] = useState("");
  const [loginError, setLoginError] = useState("");
  const [panelError, setPanelError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState(null);
  const [productForm, setProductForm] = useState(false);
  const [toppingForm, setToppingForm] = useState({ id: "", name: "", price: "" });

  async function fetchOrders(key = password) {
    const payload = await api("/api/orders", { headers: { "x-admin-password": key } });
    setOrders(payload);
  }
  useEffect(() => {
    if (!password) return;
    fetchOrders().catch((error) => { setPassword(""); sessionStorage.removeItem("df-admin-key"); setLoginError(error.message); });
    const timer = window.setInterval(() => fetchOrders().catch(() => {}), 30000);
    return () => window.clearInterval(timer);
  }, [password]);

  async function login(event) {
    event.preventDefault(); setLoginError("");
    try {
      await fetchOrders(loginValue);
      setPassword(loginValue); sessionStorage.setItem("df-admin-key", loginValue); setLoginValue("");
    } catch (error) { setLoginError(error.message); }
  }

  async function saveMenu(next) {
    setBusy(true); setPanelError("");
    try {
      const saved = await api("/api/menu", { method: "PUT", headers: { "x-admin-password": password }, body: JSON.stringify(next) });
      setMenu(saved); setProductForm(false); setEditor(null); setToppingForm({ id: "", name: "", price: "" });
    } catch (error) { setPanelError(error.message); throw error; }
    finally { setBusy(false); }
  }

  async function updateStatus(order, status) {
    setPanelError("");
    try {
      const updated = await api(`/api/orders/${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { "x-admin-password": password }, body: JSON.stringify({ status }) });
      setOrders((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error) { setPanelError(error.message); }
  }

  function saveProduct(product, categoryId, oldCategoryId) {
    const categories = menu.categories.map((category) => {
      if (category.id === oldCategoryId) return { ...category, products: category.products.filter((entry) => entry.id !== product.id) };
      if (category.id === categoryId) return { ...category, products: [...category.products.filter((entry) => entry.id !== product.id), product] };
      return category;
    });
    return saveMenu({ ...menu, categories });
  }

  async function deleteProduct(category, product) {
    if (!window.confirm(`¿Quitar “${product.name}” del menú?`)) return;
    await saveMenu({ ...menu, categories: menu.categories.map((item) => item.id === category.id ? { ...item, products: item.products.filter((entry) => entry.id !== product.id) } : item) });
  }

  async function saveTopping(event) {
    event.preventDefault();
    const topping = { id: toppingForm.id || `${slug(toppingForm.name)}-${makeId().slice(0, 5)}`, name: toppingForm.name.trim(), price: Number(toppingForm.price) };
    if (!topping.name || !Number.isFinite(topping.price) || topping.price < 0) return;
    try { await saveMenu({ ...menu, toppings: toppingForm.id ? menu.toppings.map((entry) => entry.id === toppingForm.id ? topping : entry) : [...menu.toppings, topping] }); }
    catch { /* The panel displays the save error. */ }
  }

  async function deleteTopping(topping) {
    if (!window.confirm(`¿Quitar el topping “${topping.name}”?`)) return;
    await saveMenu({ ...menu, toppings: menu.toppings.filter((entry) => entry.id !== topping.id) });
  }

  const counts = useMemo(() => ({
    pendientes: orders.filter((order) => order.status === "pendiente").length,
    proceso: orders.filter((order) => order.status === "en proceso").length,
    entregados: orders.filter((order) => order.status === "entregado").length,
  }), [orders]);
  const filteredOrders = filter === "todos" ? orders : orders.filter((order) => order.status === filter);

  return <div className="admin-overlay" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <section className="admin-shell" role="dialog" aria-modal="true" aria-label="Administración de DeliFruit's">
      <header className="admin-header"><a className="brand" href="#top" onClick={(event) => event.preventDefault()}><img className="brand__logo brand__logo--admin" src="/img/delifruits-logo.png" alt="DeliFruit's" /><span className="admin-brand-label">Administración</span></a><button className="icon-button" onClick={close} aria-label="Cerrar administración">×</button></header>
      {!password ? <form className="admin-login" onSubmit={login}>
        <span className="admin-login__icon">🔐</span><span className="eyebrow">Acceso privado</span><h1>Hola, qué bueno verte.</h1><p>Ingresá tu contraseña para administrar el menú y los pedidos.</p>
        <label>Contraseña<input type="password" autoFocus value={loginValue} onChange={(event) => setLoginValue(event.target.value)} placeholder="Tu contraseña de administración" required /></label>
        {loginError && <p className="form-error">{loginError}</p>}
        <button className="button button--primary" disabled={!loginValue}>Entrar al panel <span>→</span></button>
        <small>Configurá tu clave en el archivo .env del servidor.</small>
      </form> : <>
        <div className="admin-welcome"><div><span className="eyebrow">Tu negocio, al día</span><h1>Panel de administración</h1></div><button className="text-button" onClick={() => { setPassword(""); sessionStorage.removeItem("df-admin-key"); }}>Cerrar sesión</button></div>
        <div className="admin-stats">
          <button className={`stat-card ${tab === "pedidos" ? "stat-card--active" : ""}`} onClick={() => { setTab("pedidos"); setFilter("pendiente"); }}><span>Por preparar</span><strong>{counts.pendientes}</strong><small>pedidos pendientes</small></button>
          <button className={`stat-card ${tab === "pedidos" && filter === "en proceso" ? "stat-card--active" : ""}`} onClick={() => { setTab("pedidos"); setFilter("en proceso"); }}><span>En proceso</span><strong>{counts.proceso}</strong><small>pedidos en preparación</small></button>
          <button className="stat-card" onClick={() => { setTab("pedidos"); setFilter("entregado"); }}><span>Entregados</span><strong>{counts.entregados}</strong><small>pedidos completados</small></button>
        </div>
        <nav className="admin-tabs" aria-label="Secciones administrativas">
          <button className={tab === "pedidos" ? "is-active" : ""} onClick={() => setTab("pedidos")}>Pedidos <span>{counts.pendientes || ""}</span></button>
          <button className={tab === "productos" ? "is-active" : ""} onClick={() => setTab("productos")}>Productos</button>
          <button className={tab === "toppings" ? "is-active" : ""} onClick={() => setTab("toppings")}>Toppings</button>
        </nav>
        <main className="admin-content">
          {panelError && <p className="form-error form-error--banner">{panelError}</p>}
          {tab === "pedidos" && <section>
            <div className="content-heading"><div><span className="eyebrow">Atención al cliente</span><h2>Pedidos</h2></div><button className="button button--soft" onClick={() => fetchOrders().catch((error) => setPanelError(error.message))}>↻ Actualizar</button></div>
            <div className="order-filters">{[["todos", "Todos"], ["pendiente", "Pendientes"], ["en proceso", "En proceso"], ["entregado", "Entregados"]].map(([id, label]) => <button key={id} className={filter === id ? "is-active" : ""} onClick={() => setFilter(id)}>{label}</button>)}</div>
            {!filteredOrders.length ? <div className="admin-empty"><span>✨</span><h3>Todo al día</h3><p>{filter === "todos" ? "Cuando llegue un pedido, aparecerá aquí." : "No hay pedidos en esta lista."}</p></div> : <div className="orders-grid">{filteredOrders.map((order) => <article className="order-card" key={order.id}>
              <div className="order-card__top"><div><span className="order-id">{order.id}</span><span className={`status-pill status-pill--${slug(order.status)}`}>{order.status}</span><span className="order-channel">{order.channel === "whatsapp" ? "WhatsApp" : "Página"}</span></div><time>{new Date(order.createdAt).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" })}</time></div>
              <h3>{order.customerName}</h3>{order.customerPhone && <p className="order-contact">☎ {order.customerPhone}</p>}
              <ul className="order-items">{order.items.map((item, index) => <li key={`${item.productName}-${index}`}><span>{item.quantity}× {item.productName}{item.details && <small>{item.details}</small>}</span><strong>{money(item.unitPrice * item.quantity)}</strong></li>)}</ul>
              {order.note && <p className="order-note"><strong>Nota:</strong> {order.note}</p>}
              <div className="order-card__bottom"><span>Total <strong>{money(order.total)}</strong></span>{order.status === "pendiente" ? <button className="button button--primary button--small" onClick={() => updateStatus(order, "en proceso")}>Empezar pedido →</button> : order.status === "en proceso" ? <button className="button button--success button--small" onClick={() => updateStatus(order, "entregado")}>Marcar entregado ✓</button> : <span className="delivered-check">✓ Entregado</span>}</div>
            </article>)}</div>}
          </section>}

          {tab === "productos" && <section>
            <div className="content-heading"><div><span className="eyebrow">Catálogo</span><h2>Productos</h2></div><button className="button button--primary" onClick={() => { setEditor(null); setProductForm(true); }}>+ Nuevo producto</button></div>
            {productForm && <ProductEditor categories={menu.categories} item={editor} onCancel={() => { setProductForm(false); setEditor(null); }} onSave={saveProduct} />}
            {menu.categories.map((category) => <section className="product-admin-section" key={category.id}><h3>{category.name}<span>{category.products.length}</span></h3><div className="product-admin-list">{category.products.map((product) => <article className="product-admin-row" key={product.id}>
              <span className="product-admin-row__thumb">{product.image ? <img src={product.image} alt="" /> : product.emoji || "🍓"}</span><div className="product-admin-row__info"><strong>{product.name}</strong><small>{product.options?.length ? product.options.map((option) => `${option.name} ${money(option.price)}`).join(" · ") : money(product.price)}</small></div>
              <button className="text-button" onClick={() => { setEditor({ ...product, categoryId: category.id }); setProductForm(true); }}>Editar</button><button className="text-button text-button--danger" disabled={busy} onClick={() => deleteProduct(category, product).catch((error) => setPanelError(error.message))}>Quitar</button>
            </article>)}</div></section>)}
          </section>}

          {tab === "toppings" && <section>
            <div className="content-heading"><div><span className="eyebrow">Un toque extra</span><h2>Toppings</h2></div></div>
            <p className="section-description">Administrá los extras que tus clientes pueden agregar a sus productos.</p>
            <form className="topping-editor" onSubmit={saveTopping}><label>Nombre<input value={toppingForm.name} onChange={(event) => setToppingForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Almendras" required /></label><label>Precio en colones<input type="number" min="0" step="50" value={toppingForm.price} onChange={(event) => setToppingForm((current) => ({ ...current, price: event.target.value }))} placeholder="300" required /></label><button className="button button--primary" disabled={busy}>{toppingForm.id ? "Guardar" : "+ Agregar topping"}</button>{!!toppingForm.id && <button type="button" className="text-button" onClick={() => setToppingForm({ id: "", name: "", price: "" })}>Cancelar</button>}</form>
            <div className="topping-admin-list">{menu.toppings.map((topping) => <article className="topping-admin-row" key={topping.id}><span className="topping-admin-row__icon">✦</span><div><strong>{topping.name}</strong><small>{money(topping.price)}</small></div><button className="text-button" onClick={() => setToppingForm({ id: topping.id, name: topping.name, price: String(topping.price) })}>Editar</button><button className="text-button text-button--danger" disabled={busy} onClick={() => deleteTopping(topping).catch((error) => setPanelError(error.message))}>Quitar</button></article>)}</div>
          </section>}
        </main>
      </>}
    </section>
  </div>;
}

export default function App() {
  const [menu, setMenu] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => sessionStorage.getItem("df-admin-key") || "");
  const [toast, setToast] = useState("");

  useEffect(() => {
    api("/api/menu").then((result) => { setMenu(result); setActiveCategory(result.categories[0]?.id || ""); }).catch((error) => setLoadError(error.message));
  }, []);
  useEffect(() => { if (menu) setActiveCategory((current) => menu.categories.some((category) => category.id === current) ? current : menu.categories[0]?.id || ""); }, [menu]);
  useEffect(() => {
    function closeOnEscape(event) { if (event.key === "Escape") { setSelectedProduct(null); setCartOpen(false); setAdminOpen(false); } }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const category = menu?.categories.find((item) => item.id === activeCategory);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  function addToCart({ product, option, flavor, selectedToppings, quantity, unitPrice }) {
    const details = [option?.name, flavor, selectedToppings.map((topping) => topping.name).join(", ")].filter(Boolean).join(" · ");
    setCart((current) => [...current, {
      id: makeId(), productId: product.id, productName: product.name, emoji: product.emoji || "🍓",
      optionName: option?.name || "", flavor: flavor || "", toppings: selectedToppings.map(({ id, name, price }) => ({ id, name, price })),
      details, quantity, unitPrice,
    }]);
    setSelectedProduct(null);
    setToast(`${product.name} agregado a tu pedido`);
    window.setTimeout(() => setToast(""), 2400);
  }

  async function submitOrder(order) {
    const savedOrder = await api("/api/orders", { method: "POST", body: JSON.stringify(order) });
    setCart([]);
    return savedOrder;
  }

  return <>
    <header className="site-header" id="top">
      <a className="brand" href="#top" aria-label="DeliFruit's, inicio"><img className="brand__logo" src="/img/delifruits-logo.png" alt="DeliFruit's · 6132-5941" /></a>
      <nav className="main-nav" aria-label="Menú principal">{menu?.categories.map((item) => <button key={item.id} className={activeCategory === item.id ? "is-active" : ""} onClick={() => { setActiveCategory(item.id); document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" }); }}>{item.name}</button>)}</nav>
      <div className="header-actions"><button className="admin-link" onClick={() => setAdminOpen(true)}><span>⌘</span> Administración</button><button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`Abrir pedido, ${cartCount} productos`}><span>Tu pedido</span><span className="cart-button__icon">♧</span><span className="cart-button__count">{cartCount}</span></button></div>
    </header>

    <main>
      {loadError ? <section className="startup-error"><span>🍓</span><h1>No pudimos conectar con el menú</h1><p>{loadError}</p><p>Iniciá el servidor de la tienda y recargá esta página.</p><code>npm run api</code></section> : !menu ? <div className="loading-state"><span className="loading-orb">🍓</span><p>Preparando algo rico…</p></div> : <>
        <section className="hero">
          <div className="hero__copy"><span className="hero-tag"><span></span> Hecho fresco todos los días</span><h1>Un antojo rico<br />te <em>cambia el día.</em></h1><p>Frutas frescas, helados cremosos y mezclas hechas al momento. ¿Qué se te antoja hoy?</p><button className="button button--primary hero__cta" onClick={() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })}>Explorar el menú <span>↓</span></button><div className="hero-note"><span>✳</span> Preparado con cariño en Costa Rica</div></div>
          <div className="hero__art"><div className="hero__blob"></div><div className="hero__photo"><img src="/img/heladeria-crepa.jpg" alt="Crepa fresca de DeliFruit's" /><span className="hero__photo-label">El antojo<br />de hoy <b>↗</b></span></div><span className="hero-sticker hero-sticker--one">🍓</span><span className="hero-sticker hero-sticker--two">✦</span><span className="hero-caption">Momentos frescos, sabores felices</span></div>
        </section>

        <section className="menu-section" id="menu">
          <div className="menu-heading"><div><span className="eyebrow">Algo rico te espera</span><h2>Elegí tu antojo</h2></div><span className="menu-heading__aside">Deslizá, elegí y disfrutá <span>♡</span></span></div>
          <div className="category-tabs" role="tablist" aria-label="Categorías del menú">{menu.categories.map((item) => <button key={item.id} role="tab" aria-selected={activeCategory === item.id} className={activeCategory === item.id ? "is-active" : ""} onClick={() => setActiveCategory(item.id)}>{item.name}<span>{item.products.length}</span></button>)}</div>
          {category && <section className="category-content" role="tabpanel" key={category.id}><div className="category-heading"><div><span className="eyebrow">{category.eyebrow || "Recién preparado para vos"}</span><h3>{category.name}</h3></div><span>{category.products.length} opciones</span></div>{category.products.length ? <div className="product-grid">{category.products.map((product) => <ProductCard key={product.id} product={product} onChoose={setSelectedProduct} />)}</div> : <div className="admin-empty"><span>🍓</span><h3>Muy pronto</h3><p>Estamos preparando nuevos productos.</p></div>}</section>}
        </section>

        <section className="fresh-strip"><span className="fresh-strip__icon">✳</span><div><span className="eyebrow">El sabor de lo recién hecho</span><h2>Frescura que se siente.<br /><em>Felicidad que se comparte.</em></h2></div><p>Elegí tu combinación favorita. Nosotros la preparamos al momento, con fruta fresca y mucho cariño.</p><span className="fresh-strip__fruit">🍍</span></section>
      </>}
    </main>

    <footer className="site-footer"><a className="brand" href="#top" aria-label="DeliFruit's, inicio"><img className="brand__logo brand__logo--footer" src="/img/delifruits-logo.png" alt="DeliFruit's · 6132-5941" /></a><a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer">Hablemos por WhatsApp ↗</a><span>© {new Date().getFullYear()} DeliFruit's · Hecho con cariño</span></footer>

    {selectedProduct && <ProductDialog product={selectedProduct} toppings={menu?.toppings || []} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />}
    {cartOpen && <CartPanel cart={cart} onClose={() => setCartOpen(false)} onRemove={(id) => setCart((current) => current.filter((line) => line.id !== id))} onCheckout={submitOrder} />}
    {adminOpen && <AdminPanel menu={menu || { categories: [], toppings: [] }} setMenu={setMenu} close={() => setAdminOpen(false)} password={adminPassword} setPassword={setAdminPassword} />}
    {toast && <div className="toast" role="status">✓ {toast}</div>}
  </>;
}
