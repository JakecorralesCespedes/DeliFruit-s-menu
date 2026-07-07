/* ===================== DATOS DEL MENÚ ===================== */
const MENU = {
  heladeria: [
    { id: "conos", name: "Conos", emoji: "🍦", photo: null,
      options: [["Sencillo", 600], ["Doble", 1200], ["Triple", 1700]] },
    { id: "ensaladas", name: "Ensaladas de frutas", emoji: "🍉", photo: "ensaladas",
      options: [["Sin helado", 1200], ["Personal", 2200], ["Doble", 2700]] },
    { id: "crepas", name: "Crepas", emoji: "🥞", photo: "crepas",
      options: [["Sencilla", 3000], ["Especial", 3200]] },
    { id: "gelatina", name: "Gelatina con helado", emoji: "🍮", photo: "gelatina",
      options: [["Sencilla", 1200], ["Especial", 1700]] },
    { id: "banana-split", name: "Banana Split", emoji: "🍌", photo: null,
      options: [["Dos pelotas", 1700], ["Tres pelotas", 2300]] },
    { id: "banana-hawaiana", name: "Banana Hawaiana", emoji: "🍌", photo: null,
      options: [["Única", 2000]] },
    { id: "pina-hawaiana", name: "Piña Hawaiana", emoji: "🍍", photo: null,
      options: [["Única", 2500]] },
    { id: "helado-especial", name: "Helado Especial", emoji: "🍨", photo: "helado-especial",
      options: [["Único", 1700]] },
    { id: "granizados", name: "Granizados", emoji: "🍧", photo: "granizados",
      options: [["Pequeño", 500], ["Grande", 1000]] },
  ],
  batidos: [
    { id: "b-pina", name: "Piña", emoji: "🍍", price: 1000, photo: "batido-1" },
    { id: "b-sandia", name: "Sandía", emoji: "🍉", price: 1000, photo: "batido-1" },
    { id: "b-mango", name: "Mango", emoji: "🥭", price: 1000, photo: "batido-1" },
    { id: "b-maracuya", name: "Maracuyá", emoji: "🍹", price: 1000, photo: "batido-2" },
    { id: "b-guanabana", name: "Guanábana", emoji: "🍈", price: 1000, photo: "batido-1" },
    { id: "b-frutas", name: "Frutas", emoji: "🍓", price: 1000, photo: "batido-1" },
    { id: "b-verde", name: "Batido Verde", emoji: "🥬", price: 1000, photo: "batido-1" },
    { id: "b-papaya", name: "Papaya", emoji: "🧡", price: 1200, photo: "batido-2" },
    { id: "b-pinacolada", name: "Piña Colada", emoji: "🥥", price: 1200, photo: "batido-2" },
    { id: "b-fresa", name: "Fresa", emoji: "🍓", price: 1200, photo: "batido-2" },
    { id: "b-mora", name: "Mora", emoji: "🫐", price: 1200, photo: "batido-2" },
    { id: "b-chocomani", name: "Chocó maní", emoji: "🍫", price: 1200, photo: "batido-3" },
    { id: "b-proteina", name: "Proteína", emoji: "💪", price: 2000, photo: "batido-3" },
    { id: "b-frappe", name: "Frappé", emoji: "🥤", price: 2000, photo: "batido-3" },
  ],
  milkshakes: [
    { id: "ms-helado", name: "MilkShake de Helado", emoji: "🥛", price: 2000, photo: "ms-helado",
      flavorLabel: "Elegí tu sabor:",
      flavors: ["Amor Fresa", "Amor Mango", "Café", "Chocolate", "Crema Chips", "Frutas",
                "Menta", "Chicle", "Cheescake", "Vainilla", "Oreo", "Coco", "Almendras"] },
    { id: "ms-fruta", name: "MilkShake con Fruta y Helado", emoji: "🍓", price: 2200, photo: "ms-fruta",
      flavorLabel: "Elegí tu fruta:",
      flavors: ["Fresa", "Mora", "Maracuyá", "Melón", "Piña", "Papaya", "Mango"] },
  ],
};

const WHATSAPP = "50661325941";
const fmt = (n) => "₡" + n.toLocaleString("es-CR");

/* ===================== RENDER DE LISTAS ===================== */
function renderHeladeria() {
  const box = document.getElementById("items-heladeria");
  box.innerHTML = MENU.heladeria.map((item) => {
    const prices = item.options.map(([, p]) => fmt(p)).join(" - ");
    const sizes = item.options.length > 1
      ? `<div class="item__sizes">(${item.options.map(([l]) => l).join(" - ")})</div>` : "";
    return `
      <button class="item" data-cat="heladeria" data-id="${item.id}" data-photo="${item.photo ?? ""}">
        <span class="item__bullet">•</span>
        <div class="item__body">
          <div class="item__name"><span>${item.name}:</span><span class="item__prices">(${prices})</span></div>
          ${sizes}
        </div>
        <span class="item__go">+</span>
      </button>`;
  }).join("");
}

function renderBatidos() {
  const box = document.getElementById("items-batidos");
  box.innerHTML = MENU.batidos.map((item) => `
    <button class="item" data-cat="batidos" data-id="${item.id}" data-photo="${item.photo ?? ""}">
      <span class="item__bullet">•</span>
      <div class="item__body">
        <div class="item__name">
          <span>${item.name}</span><span class="item__dots"></span>
          <span class="item__prices">${fmt(item.price)}</span>
        </div>
      </div>
      <span class="item__go">+</span>
    </button>`).join("");
}

function renderMilkshakes() {
  const box = document.getElementById("items-milkshakes");
  box.innerHTML = MENU.milkshakes.map((item) => `
    <button class="item" data-cat="milkshakes" data-id="${item.id}" data-photo="${item.photo ?? ""}">
      <span class="item__bullet">•</span>
      <div class="item__body">
        <div class="item__name"><span>${item.name}</span><span class="item__prices">(${fmt(item.price)})</span></div>
        <div class="item__sizes">${item.flavors.length} opciones — tocá para elegir</div>
      </div>
      <span class="item__go">+</span>
    </button>`).join("");
}

renderHeladeria();
renderBatidos();
renderMilkshakes();

/* ===================== MODAL DE PRODUCTO ===================== */
const modal = document.getElementById("itemModal");
const modalEmoji = document.getElementById("modalEmoji");
const modalTitle = document.getElementById("modalTitle");
const modalHint = document.getElementById("modalHint");
const modalOptions = document.getElementById("modalOptions");
const modalFlavors = document.getElementById("modalFlavors");
const modalPrice = document.getElementById("modalPrice");
const modalAdd = document.getElementById("modalAdd");
const qtyValue = document.getElementById("qtyValue");

let current = null; // { item, option, flavor, qty }

function findItem(cat, id) {
  return MENU[cat].find((i) => i.id === id);
}

function openItem(cat, id) {
  const item = findItem(cat, id);
  if (!item) return;
  current = { item, option: null, flavor: null, qty: 1 };

  modalEmoji.textContent = item.emoji;
  modalTitle.textContent = item.name;
  qtyValue.textContent = "1";

  // Opciones de tamaño (heladería)
  modalOptions.innerHTML = "";
  if (item.options && item.options.length > 1) {
    modalHint.textContent = "Elegí el tamaño:";
    item.options.forEach(([label, price], i) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.innerHTML = `${label}<span class="chip__price">${fmt(price)}</span>`;
      b.onclick = () => {
        current.option = i;
        [...modalOptions.children].forEach((c) => c.classList.remove("selected"));
        b.classList.add("selected");
        updateModalPrice();
      };
      modalOptions.appendChild(b);
    });
  } else if (item.options) {
    current.option = 0;
    modalHint.textContent = "";
  } else {
    modalHint.textContent = "";
  }

  // Sabores (milkshakes)
  modalFlavors.innerHTML = "";
  if (item.flavors) {
    modalHint.textContent = item.flavorLabel;
    item.flavors.forEach((f) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = f;
      b.onclick = () => {
        current.flavor = f;
        [...modalFlavors.children].forEach((c) => c.classList.remove("selected"));
        b.classList.add("selected");
        updateModalPrice();
      };
      modalFlavors.appendChild(b);
    });
  }

  updateModalPrice();
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function unitPrice() {
  const { item, option } = current;
  if (item.options) return option != null ? item.options[option][1] : null;
  return item.price;
}

function readyToAdd() {
  const { item, option, flavor } = current;
  if (item.options && item.options.length > 1 && option == null) return false;
  if (item.flavors && !flavor) return false;
  return true;
}

function updateModalPrice() {
  const p = unitPrice();
  modalPrice.textContent = p != null ? fmt(p * current.qty) : "—";
  modalAdd.disabled = !readyToAdd();
}

document.getElementById("qtyMinus").onclick = () => {
  if (current.qty > 1) current.qty--;
  qtyValue.textContent = current.qty;
  updateModalPrice();
};
document.getElementById("qtyPlus").onclick = () => {
  if (current.qty < 20) current.qty++;
  qtyValue.textContent = current.qty;
  updateModalPrice();
};

modalAdd.onclick = () => {
  if (!readyToAdd()) return;
  const { item, option, flavor, qty } = current;
  let name = item.name;
  if (item.options && item.options.length > 1) name += ` (${item.options[option][0]})`;
  if (flavor) name += ` — ${flavor}`;
  addToCart({ name, price: unitPrice(), qty });
  closeOverlays();
  showToast();
};

/* ===================== FOTOS: hover + lightbox ===================== */
const photos = document.querySelectorAll(".photo");

// Hover en producto → ilumina su foto
document.querySelectorAll(".items").forEach((list) => {
  list.addEventListener("mouseover", (e) => {
    const btn = e.target.closest(".item");
    if (!btn) return;
    const key = btn.dataset.photo;
    photos.forEach((p) => p.classList.toggle("glow", !!key && p.dataset.photo === key));
  });
  list.addEventListener("mouseout", () => photos.forEach((p) => p.classList.remove("glow")));
  list.addEventListener("click", (e) => {
    const btn = e.target.closest(".item");
    if (btn) openItem(btn.dataset.cat, btn.dataset.id);
  });
});

// Click en foto → lightbox
const lightbox = document.getElementById("lightbox");
const lightboxMedia = document.getElementById("lightboxMedia");
const lightboxCaption = document.getElementById("lightboxCaption");

photos.forEach((p) => {
  p.addEventListener("click", () => {
    const img = p.querySelector("img");
    lightboxMedia.style.background = getComputedStyle(p).background;
    lightboxMedia.innerHTML = img
      ? `<img src="${img.src}" alt="${p.querySelector("figcaption").textContent}">`
      : `<span>${p.querySelector(".photo__emoji").textContent}</span>`;
    lightboxCaption.textContent = p.querySelector("figcaption").textContent;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
  });
});

/* ===================== CARRITO ===================== */
const cart = [];
const cartEl = document.getElementById("cart");
const cartList = document.getElementById("cartList");
const cartEmpty = document.getElementById("cartEmpty");
const cartTotal = document.getElementById("cartTotal");
const cartSend = document.getElementById("cartSend");
const cartCount = document.getElementById("cartCount");

function addToCart(line) {
  const same = cart.find((l) => l.name === line.name);
  if (same) same.qty += line.qty;
  else cart.push(line);
  renderCart();
}

function removeFromCart(i) {
  cart.splice(i, 1);
  renderCart();
}

function renderCart() {
  const count = cart.reduce((s, l) => s + l.qty, 0);
  cartCount.textContent = count;
  cartCount.classList.remove("bump");
  void cartCount.offsetWidth; // reinicia la animación
  cartCount.classList.add("bump");

  cartList.innerHTML = cart.map((l, i) => `
    <li>
      <span class="cart__line-name">${l.qty}× ${l.name}</span>
      <span class="cart__line-price">${fmt(l.price * l.qty)}</span>
      <button class="cart__remove" data-i="${i}" aria-label="Quitar">✕</button>
    </li>`).join("");

  const total = cart.reduce((s, l) => s + l.price * l.qty, 0);
  cartEmpty.hidden = cart.length > 0;
  cartTotal.textContent = cart.length ? `Total: ${fmt(total)}` : "";
  cartSend.classList.toggle("disabled", cart.length === 0);

  const lines = cart.map((l) => `• ${l.qty}× ${l.name} — ${fmt(l.price * l.qty)}`);
  const msg = `¡Hola DeliFruit's! 🍧 Quiero hacer este pedido:\n\n${lines.join("\n")}\n\nTotal: ${fmt(total)}`;
  cartSend.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

cartList.addEventListener("click", (e) => {
  const btn = e.target.closest(".cart__remove");
  if (btn) removeFromCart(Number(btn.dataset.i));
});

document.getElementById("cartBtn").onclick = () => {
  cartEl.hidden = false;
  document.body.style.overflow = "hidden";
};

renderCart();

/* ===================== CERRAR OVERLAYS / TOAST ===================== */
function closeOverlays() {
  [modal, lightbox, cartEl].forEach((el) => (el.hidden = true));
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-close]").forEach((el) => (el.onclick = closeOverlays));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeOverlays();
});

const toast = document.getElementById("toast");
let toastTimer;
function showToast() {
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.hidden = true), 1600);
}
