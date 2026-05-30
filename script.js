/* ==========================================================
   BREW & BLOOM — APP LOGIC
   - Renders menu, handles cart, drawer, item customizer,
     checkout, and payment routing.
   - Each cart line is keyed by item + chosen options so the
     same drink with different mods becomes a separate line.
   - Real payment APIs slot into submitOrder() — see TODOs.
   ========================================================== */

/* ==========================================================
   GLOBAL OPTION CATALOG
   - Edit prices, labels, and which categories each option
     group applies to. Items can opt-out via item.options.
   ========================================================== */
const SIZES = [
  { id: 'sm', label: 'Small  (12oz)', delta:  -15 },
  { id: 'md', label: 'Medium (16oz)', delta:    0, default: true },
  { id: 'lg', label: 'Large  (22oz)', delta:  +25 },
];
const TEMPS = [
  { id: 'hot', label: 'Hot',  delta: 0, default: true },
  { id: 'ice', label: 'Iced', delta: +10 },
];
const MILKS = [
  { id: 'regular', label: 'Whole milk', delta: 0, default: true },
  { id: 'oat',     label: 'Oat milk',   delta: +25 },
  { id: 'almond',  label: 'Almond milk',delta: +25 },
  { id: 'soy',     label: 'Soy milk',   delta: +20 },
  { id: 'skim',    label: 'Skim milk',  delta:   0 },
  { id: 'none',    label: 'No milk',    delta: -10 },
];
const SUGAR = [
  { id: '0',   label: '0%',   delta: 0 },
  { id: '25',  label: '25%',  delta: 0 },
  { id: '50',  label: '50%',  delta: 0, default: true },
  { id: '75',  label: '75%',  delta: 0 },
  { id: '100', label: '100%', delta: 0 },
];
const ADDONS = [
  { id: 'shot',     label: 'Extra espresso shot', delta: +30 },
  { id: 'whip',     label: 'Whipped cream',       delta: +20 },
  { id: 'caramel',  label: 'Caramel drizzle',     delta: +15 },
  { id: 'choco',    label: 'Chocolate sauce',     delta: +15 },
  { id: 'vanilla',  label: 'Vanilla syrup',       delta: +15 },
  { id: 'sea-salt', label: 'Sea salt foam',       delta: +20 },
  { id: 'pearl',    label: 'Tapioca pearls',      delta: +25 },
];

/* ==========================================================
   MENU DATA
   - options: which groups apply (default = all four for drinks).
     pastries skip milk/sugar/temp, etc.
   ========================================================== */
/* ==========================================================
   IMAGE HELPER
   - Hot-links free, topic-tagged photos via loremflickr.
   - `lock` keeps the same image for the same URL on every
     visit so layout doesn't shuffle on reload.
   - If a URL ever fails, the gradient placeholder shows
     through underneath (handled by .placeholder-img CSS).
   ========================================================== */
const img = (topic, lock, w = 600, h = 420) =>
  `https://loremflickr.com/${w}/${h}/${encodeURIComponent(topic)}?lock=${lock}`;

const MENU = [
  // ----- Coffee -----
  { id: 'c1', name: 'Classic Espresso',  category: 'coffee', price: 120, emoji: '☕', rating: 4.9, desc: 'Bold double shot, rich crema.', tag: 'Bestseller',
    img: img('espresso,coffee', 101),
    options: { size: true, temp: false, milk: false, sugar: true, addons: true } },
  { id: 'c2', name: 'Caramel Macchiato', category: 'coffee', price: 175, emoji: '☕', rating: 4.8, desc: 'Vanilla, caramel, layered milk.',
    img: img('caramel,latte,coffee', 102),
    options: { size: true, temp: true, milk: true, sugar: true, addons: true } },
  { id: 'c3', name: 'Pink Rose Latte',   category: 'coffee', price: 185, emoji: '🌸', rating: 4.9, desc: 'Rose syrup, oat milk, espresso.', tag: 'New',
    img: img('latte,rose,rose', 103),
    options: { size: true, temp: true, milk: true, sugar: true, addons: true } },
  { id: 'c4', name: 'Spanish Latte',     category: 'coffee', price: 165, emoji: '☕', rating: 4.7, desc: 'Sweet condensed milk + espresso.',
    img: img('latte,coffeeart', 104),
    options: { size: true, temp: true, milk: true, sugar: true, addons: true } },

  // ----- Tea -----
  { id: 't1', name: 'Matcha Bloom',      category: 'tea',    price: 180, emoji: '🍵', rating: 4.9, desc: 'Ceremonial matcha, vanilla cream.', tag: 'New',
    img: img('matcha,green,tea', 201),
    options: { size: true, temp: true, milk: true, sugar: true, addons: true } },
  { id: 't2', name: 'Jasmine Green',     category: 'tea',    price: 140, emoji: '🍵', rating: 4.6, desc: 'Hand-picked jasmine blossoms.',
    img: img('greentea,teacup', 202),
    options: { size: true, temp: true, milk: false, sugar: true, addons: true } },
  { id: 't3', name: 'Strawberry Sakura', category: 'tea',    price: 165, emoji: '🌸', rating: 4.8, desc: 'Strawberry, sakura, sparkling.',
    img: img('strawberry,drink', 203),
    options: { size: true, temp: false, milk: false, sugar: true, addons: true } },

  // ----- Cold Brews ----- (temp fixed to iced)
  { id: 'b1', name: 'Cold Brew Original',category: 'cold',   price: 160, emoji: '🧊', rating: 4.8, desc: '12-hour steep, smooth & sweet.',
    img: img('coldbrew,icedcoffee', 301),
    options: { size: true, temp: false, milk: true, sugar: true, addons: true } },
  { id: 'b2', name: 'Iced Pink Latte',   category: 'cold',   price: 195, emoji: '🧊', rating: 4.9, desc: 'Strawberry milk + cold espresso.',
    img: img('pink latte,latte', 302),
    options: { size: true, temp: false, milk: true, sugar: true, addons: true } },
  { id: 'b3', name: 'Tropical Cold Foam',category: 'cold',   price: 180, emoji: '🧊', rating: 4.7, desc: 'Mango cold foam over black tea.',
    img: img('icedtea,mango', 303),
    options: { size: true, temp: false, milk: false, sugar: true, addons: true } },

  // ----- Pastries ----- (no drink-options)
  { id: 'p1', name: 'Butter Croissant',  category: 'pastry', price: 95,  emoji: '🥐', rating: 4.8, desc: 'Flaky, golden, baked daily.',
    img: img('croissant,bread', 401),
    options: { size: false, temp: false, milk: false, sugar: false, addons: false } },
  { id: 'p2', name: 'Matcha Bun',        category: 'pastry', price: 110, emoji: '🥯', rating: 4.7, desc: 'Soft milk bun with matcha cream.',
    img: img('bun,matcha,', 402),
    options: { size: false, temp: false, milk: false, sugar: false, addons: false } },
  { id: 'p3', name: 'Strawberry Tart',   category: 'pastry', price: 135, emoji: '🍰', rating: 4.9, desc: 'Vanilla custard, fresh berries.',
    img: img('tart,strawberry,dessert', 403),
    options: { size: false, temp: false, milk: false, sugar: false, addons: false } },
  { id: 'p4', name: 'Chocolate Cookie',  category: 'pastry', price: 75,  emoji: '🍪', rating: 4.6, desc: 'Gooey center, sea-salt finish.',
    img: img('cookie,chocolate', 404),
    options: { size: false, temp: false, milk: false, sugar: false, addons: false } },

  // ----- Bundles -----
  { id: 'd1', name: "Barista's Bundle",  category: 'bundle', price: 420, emoji: '🎁', rating: 5.0, desc: '2 drinks + 1 pastry, save ₱90.', tag: 'Save',
    img: img('coffee,pastry,cafe', 501),
    options: { size: false, temp: false, milk: false, sugar: false, addons: false } },
  { id: 'd2', name: 'Sunrise Set',       category: 'bundle', price: 260, emoji: '🌅', rating: 4.8, desc: 'Espresso + croissant combo.',
    img: img('expresso,coffee,croissant', 502),
    options: { size: false, temp: false, milk: false, sugar: false, addons: false } },
];

/* ==========================================================
   CONFIG
   ========================================================== */
const DELIVERY_FEE = 49;
const FREE_DELIVERY_THRESHOLD = 500;
const CURRENCY = '₱';

/* ==========================================================
   FEATURED ITEMS
   - IDs reference MENU entries. Change/reorder to pick what
     appears in the "Featured Today" section. The card pulls
     image, name, and description from MENU automatically.
   - cta:    optional override for the link text
   - blurb:  optional override for the description
   ========================================================== */
const FEATURED = [
  { id: 'c3' },                                                    // Pink Rose Latte
  { id: 't1' },                                                    // Matcha Bloom
  { id: 'd1', cta: 'Build yours →', blurb: 'Any 2 drinks + 1 pastry — save up to ₱90.' },
];

/* ==========================================================
   STATE
   - cart is an array of "lines". Each line = { id, lineKey,
     qty, config }. lineKey is a hash of item id + config so
     edits of an existing line stay on that line.
   ========================================================== */
const state = {
  cart: [],          // [{ id, lineKey, qty, config }]
  category: 'all',
  editingLineKey: null, // when set, customizer is editing a cart line
  currentItemId: null,  // item open in the customizer
  pendingQty: 1,
};

/* ==========================================================
   DOM REFERENCES
   ========================================================== */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const menuGrid       = $('#menuGrid');
const cartBadge      = $('#cartBadge');
const cartDrawer     = $('#cartDrawer');
const cartItemsEl    = $('#cartItems');
const cartSubtotalEl = $('#cartSubtotal');
const cartDeliveryEl = $('#cartDelivery');
const cartTotalEl    = $('#cartTotal');
const checkoutBtn    = $('#checkoutBtn');

const checkoutModal     = $('#checkoutModal');
const checkoutSubtotal  = $('#checkoutSubtotal');
const checkoutDelivery  = $('#checkoutDelivery');
const checkoutTotalEl   = $('#checkoutTotal');
const cardFields        = $('#cardFields');
const checkoutForm      = $('#checkoutForm');

const customizerModal = $('#customizerModal');
const czTitle    = $('#customizerTitle');
const czCategory = $('#czCategory');
const czName     = $('#czName');
const czDesc     = $('#czDesc');
const czImage    = $('#czImage');
const czBasePrice = $('#czBasePrice');
const czSizeSection   = $('#czSizeSection');
const czTempSection   = $('#czTempSection');
const czMilkSection   = $('#czMilkSection');
const czSugarSection  = $('#czSugarSection');
const czAddonsSection = $('#czAddonsSection');
const czSizeOptions   = $('#czSizeOptions');
const czTempOptions   = $('#czTempOptions');
const czMilkOptions   = $('#czMilkOptions');
const czSugarOptions  = $('#czSugarOptions');
const czAddonsOptions = $('#czAddonsOptions');
const czNotes  = $('#czNotes');
const czQtyEl  = $('#czQty');
const czTotal  = $('#czTotal');
const czAddLabel = $('#czAddLabel');

const toastEl = $('#toast');

/* ==========================================================
   FORMATTERS
   ========================================================== */
const peso = (n) => `${CURRENCY}${n.toFixed(2)}`;
const deltaLabel = (d) => d === 0 ? '' : (d > 0 ? ` +${peso(d).replace('₱','₱')}` : ` -${peso(Math.abs(d)).replace('₱','₱')}`);

/* ==========================================================
   PRICE / LINE-KEY HELPERS
   ========================================================== */
function getOpt(list, id) { return list.find(o => o.id === id); }

function defaultConfigFor(item) {
  const o = item.options || {};
  return {
    size:   o.size   ? (SIZES.find(s => s.default)?.id || SIZES[0].id) : null,
    temp:   o.temp   ? (TEMPS.find(s => s.default)?.id || TEMPS[0].id) : (item.category === 'cold' ? 'ice' : null),
    milk:   o.milk   ? (MILKS.find(s => s.default)?.id || MILKS[0].id) : null,
    sugar:  o.sugar  ? (SUGAR.find(s => s.default)?.id || SUGAR[0].id) : null,
    addons: o.addons ? [] : [],
    notes:  '',
  };
}

function unitPrice(item, config) {
  let price = item.price;
  if (config.size)   price += getOpt(SIZES, config.size)?.delta || 0;
  if (config.temp)   price += getOpt(TEMPS, config.temp)?.delta || 0;
  if (config.milk)   price += getOpt(MILKS, config.milk)?.delta || 0;
  if (config.sugar)  price += getOpt(SUGAR, config.sugar)?.delta || 0;
  if (config.addons) price += config.addons.reduce((s, id) => s + (getOpt(ADDONS, id)?.delta || 0), 0);
  return price;
}

function lineKeyOf(itemId, config) {
  return [
    itemId,
    config.size  || '_',
    config.temp  || '_',
    config.milk  || '_',
    config.sugar || '_',
    (config.addons || []).slice().sort().join('+') || '_',
    (config.notes || '').trim().toLowerCase(),
  ].join('|');
}

function configSummary(item, config) {
  const bits = [];
  if (config.size)  bits.push(getOpt(SIZES, config.size).label.split(/\s+/)[0]); // "Small"
  if (config.temp)  bits.push(getOpt(TEMPS, config.temp).label);
  if (config.milk && config.milk !== 'regular') bits.push(getOpt(MILKS, config.milk).label);
  if (config.sugar) bits.push(`${getOpt(SUGAR, config.sugar).label} sugar`);
  if (config.addons?.length) {
    bits.push(config.addons.map(id => getOpt(ADDONS, id).label).join(', '));
  }
  if (config.notes) bits.push(`“${config.notes}”`);
  return bits.join(' • ');
}

/* ==========================================================
   FEATURED RENDERING
   - Source of truth = MENU. Listed by id in FEATURED above.
   - Clicking the card opens the same customizer as the menu,
     so the "Try it →" link is a real action.
   ========================================================== */
function renderFeatured() {
  const host = $('#featuredGrid');
  if (!host) return;
  host.innerHTML = FEATURED.map(f => {
    const item = MENU.find(m => m.id === f.id);
    if (!item) return '';
    const blurb = f.blurb || item.desc;
    const cta   = f.cta   || 'Try it →';
    return `
      <article class="promo-card" data-id="${item.id}">
        <div class="placeholder-img promo-img">
          <img src="${item.img}" alt="${item.name}" loading="lazy"
               onerror="this.style.display='none'">
          <span class="ph-fallback">${item.emoji}</span>
        </div>
        <div class="promo-body">
          <h3>${item.name}</h3>
          <p>${blurb}</p>
          <button type="button" class="link-arrow" data-open="${item.id}">${cta}</button>
        </div>
      </article>
    `;
  }).join('');
}

/* ==========================================================
   MENU RENDERING
   ========================================================== */
function renderMenu() {
  const items = state.category === 'all'
    ? MENU
    : MENU.filter(m => m.category === state.category);

  const canCustomize = (item) => {
    const o = item.options || {};
    return o.size || o.temp || o.milk || o.sugar || o.addons;
  };

  menuGrid.innerHTML = items.map(item => `
    <article class="product-card" data-id="${item.id}">
      <div class="placeholder-img product-img" aria-hidden="true">
        <img src="${item.img}" alt="${item.name}" loading="lazy"
             onerror="this.style.display='none'">
        <span class="ph-fallback" style="font-size:2.4rem">${item.emoji}</span>
      </div>
      <div class="product-meta">
        ${item.tag ? `<span class="tag">${item.tag}</span>` : ''}
        <span class="rating" aria-label="Rating ${item.rating}">★ ${item.rating.toFixed(1)}</span>
      </div>
      <h3>${item.name}</h3>
      <p class="desc">${item.desc}</p>
      <div class="row-bottom">
        <span class="price">${peso(item.price)}</span>
        <button class="add-btn" data-open="${item.id}">
          ${canCustomize(item) ? 'Customize +' : 'Add +'}
        </button>
      </div>
    </article>
  `).join('');
}

/* ==========================================================
   CART HELPERS
   ========================================================== */
function findLine(lineKey) { return state.cart.find(l => l.lineKey === lineKey); }

function addLine(itemId, config, qty = 1) {
  const lineKey = lineKeyOf(itemId, config);
  const existing = findLine(lineKey);
  if (existing) existing.qty += qty;
  else state.cart.push({ id: itemId, lineKey, qty, config });
  updateCart();
}
function updateLine(oldLineKey, itemId, config, qty) {
  const idx = state.cart.findIndex(l => l.lineKey === oldLineKey);
  if (idx === -1) return;
  const newKey = lineKeyOf(itemId, config);
  // If the new key collides with another existing line, merge qty.
  if (newKey !== oldLineKey) {
    const collide = state.cart.find(l => l.lineKey === newKey);
    if (collide) {
      collide.qty += qty;
      state.cart.splice(idx, 1);
    } else {
      state.cart[idx] = { id: itemId, lineKey: newKey, qty, config };
    }
  } else {
    state.cart[idx].qty = qty;
    state.cart[idx].config = config;
  }
  updateCart();
}
function changeQty(lineKey, delta) {
  const line = findLine(lineKey);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) state.cart = state.cart.filter(l => l.lineKey !== lineKey);
  updateCart();
}
function removeLine(lineKey) {
  state.cart = state.cart.filter(l => l.lineKey !== lineKey);
  updateCart();
}
function clearCart() {
  state.cart = [];
  updateCart();
}

function cartTotals() {
  let subtotal = 0, count = 0;
  for (const line of state.cart) {
    const item = MENU.find(m => m.id === line.id);
    if (!item) continue;
    subtotal += unitPrice(item, line.config) * line.qty;
    count += line.qty;
  }
  const delivery = (subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD) ? 0 : DELIVERY_FEE;
  return { subtotal, delivery, total: subtotal + delivery, count };
}

function updateCart() {
  const { subtotal, delivery, total, count } = cartTotals();

  cartBadge.textContent = count;
  cartBadge.style.display = count > 0 ? 'grid' : 'none';

  if (state.cart.length === 0) {
    cartItemsEl.innerHTML = '<p class="empty-state">Your cart is empty. Add something tasty ☕</p>';
  } else {
    cartItemsEl.innerHTML = state.cart.map(line => {
      const item = MENU.find(m => m.id === line.id);
      const u = unitPrice(item, line.config);
      const summary = configSummary(item, line.config);
      return `
        <div class="cart-item" data-key="${line.lineKey}">
          <div class="ph" aria-hidden="true">
            <img src="${item.img}" alt="" loading="lazy" onerror="this.style.display='none'">
            <span class="ph-fallback">${item.emoji}</span>
          </div>
          <div>
            <div class="title">${item.name}</div>
            ${summary ? `<div class="muted small cz-summary">${summary}</div>` : ''}
            <div class="muted small">${peso(u)} each</div>
            <div class="qty-row">
              <button data-dec="${line.lineKey}" aria-label="Decrease quantity">−</button>
              <span>${line.qty}</span>
              <button data-inc="${line.lineKey}" aria-label="Increase quantity">+</button>
              <button class="edit" data-edit="${line.lineKey}">Edit</button>
              <button class="remove" data-rem="${line.lineKey}">Remove</button>
            </div>
          </div>
          <div class="item-price">${peso(u * line.qty)}</div>
        </div>
      `;
    }).join('');
  }

  cartSubtotalEl.textContent = peso(subtotal);
  cartDeliveryEl.textContent = (delivery === 0 && subtotal > 0) ? 'FREE' : peso(delivery);
  cartTotalEl.textContent    = peso(total);

  checkoutSubtotal.textContent = peso(subtotal);
  checkoutDelivery.textContent = (delivery === 0 && subtotal > 0) ? 'FREE' : peso(delivery);
  checkoutTotalEl.textContent  = peso(total);

  checkoutBtn.disabled = count === 0;
}

/* ==========================================================
   CUSTOMIZER MODAL
   ========================================================== */
function buildOptionButtons(container, list, currentId, onPick) {
  container.innerHTML = list.map(o => `
    <button type="button"
            class="cz-opt ${o.id === currentId ? 'active' : ''}"
            data-id="${o.id}">
      <span class="cz-opt-label">${o.label}</span>
      ${o.delta ? `<span class="cz-opt-delta">${o.delta > 0 ? '+' : '-'}${peso(Math.abs(o.delta))}</span>` : ''}
    </button>
  `).join('');
  container.querySelectorAll('.cz-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.cz-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onPick(btn.dataset.id);
    });
  });
}

function buildAddonChecks(container, list, currentIds, onChange) {
  container.innerHTML = list.map(o => `
    <label class="cz-addon ${currentIds.includes(o.id) ? 'active' : ''}">
      <input type="checkbox" value="${o.id}" ${currentIds.includes(o.id) ? 'checked' : ''} />
      <span class="cz-addon-label">${o.label}</span>
      <span class="cz-addon-delta">+${peso(o.delta)}</span>
    </label>
  `).join('');
  container.querySelectorAll('.cz-addon input').forEach(input => {
    input.addEventListener('change', () => {
      input.closest('.cz-addon').classList.toggle('active', input.checked);
      const picked = Array.from(container.querySelectorAll('input:checked')).map(i => i.value);
      onChange(picked);
    });
  });
}

function openCustomizer(itemId, opts = {}) {
  const item = MENU.find(m => m.id === itemId);
  if (!item) return;

  const o = item.options || {};
  const canCustomize = o.size || o.temp || o.milk || o.sugar || o.addons;

  // If no customization at all → just add 1 and toast.
  if (!canCustomize && !opts.editLineKey) {
    addLine(item.id, defaultConfigFor(item), 1);
    showToast(`${item.name} added to cart`, {
      variant: 'success',
      icon: '✓',
      subtitle: 'Tap the cart to checkout',
    });
    flyToCart(item.emoji, opts.sourceEl);
    return;
  }

  // Seed state
  state.currentItemId = item.id;
  state.editingLineKey = opts.editLineKey || null;
  let config;
  let qty = 1;
  if (opts.editLineKey) {
    const line = findLine(opts.editLineKey);
    config = JSON.parse(JSON.stringify(line.config));
    qty = line.qty;
    czTitle.textContent = 'Edit your order';
    czAddLabel.textContent = 'Save changes';
  } else {
    config = defaultConfigFor(item);
    czTitle.textContent = 'Customize your order';
    czAddLabel.textContent = 'Add to cart';
  }
  state.pendingQty = qty;

  // Header info
  czCategory.textContent = item.category.charAt(0).toUpperCase() + item.category.slice(1);
  czName.textContent     = item.name;
  czDesc.textContent     = item.desc;
  czBasePrice.textContent = `Base ${peso(item.price)}`;

  // Swap in the real product image; fall back to emoji on error.
  czImage.innerHTML = `
    <img src="${item.img}" alt="${item.name}" loading="eager"
         onerror="this.style.display='none'">
    <span class="ph-fallback" style="font-size:2.8rem">${item.emoji}</span>
  `;

  // Show / hide sections
  czSizeSection.hidden   = !o.size;
  czTempSection.hidden   = !o.temp;
  czMilkSection.hidden   = !o.milk;
  czSugarSection.hidden  = !o.sugar;
  czAddonsSection.hidden = !o.addons;

  // Build option groups
  if (o.size)   buildOptionButtons(czSizeOptions,   SIZES,   config.size,  v => { config.size  = v; refreshTotal(); });
  if (o.temp)   buildOptionButtons(czTempOptions,   TEMPS,   config.temp,  v => { config.temp  = v; refreshTotal(); });
  if (o.milk)   buildOptionButtons(czMilkOptions,   MILKS,   config.milk,  v => { config.milk  = v; refreshTotal(); });
  if (o.sugar)  buildOptionButtons(czSugarOptions,  SUGAR,   config.sugar, v => { config.sugar = v; refreshTotal(); });
  if (o.addons) buildAddonChecks(czAddonsOptions,   ADDONS,  config.addons || [], v => { config.addons = v; refreshTotal(); });

  czNotes.value = config.notes || '';
  czNotes.oninput = () => { config.notes = czNotes.value; };

  // Qty stepper
  czQtyEl.textContent = state.pendingQty;
  $('#czQtyDec').onclick = () => { if (state.pendingQty > 1) { state.pendingQty--; czQtyEl.textContent = state.pendingQty; refreshTotal(); } };
  $('#czQtyInc').onclick = () => { state.pendingQty++; czQtyEl.textContent = state.pendingQty; refreshTotal(); };

  function refreshTotal() {
    const u = unitPrice(item, config);
    czTotal.textContent = peso(u * state.pendingQty);
  }
  refreshTotal();

  // Submit
  $('#customizerForm').onsubmit = (e) => {
    e.preventDefault();
    if (state.editingLineKey) {
      updateLine(state.editingLineKey, item.id, config, state.pendingQty);
      showToast(`${item.name} updated`, { icon: '✎' });
      closeCustomizer();
    } else {
      addLine(item.id, config, state.pendingQty);
      const qty = state.pendingQty;
      showToast(`${item.name} added to cart`, {
        variant: 'success',
        icon: '✓',
        subtitle: qty > 1
          ? `${qty} × added • tap the cart to checkout`
          : 'Tap the cart to checkout',
      });
      // Read source position BEFORE closing modal (close hides it).
      flyToCart(item.emoji, $('#czAddBtn'));
      closeCustomizer();
    }
  };

  // Open
  customizerModal.classList.add('open');
  customizerModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeCustomizer() {
  customizerModal.classList.remove('open');
  customizerModal.setAttribute('aria-hidden', 'true');
  state.editingLineKey = null;
  state.currentItemId = null;
  // Only release body scroll if checkout isn't also open
  if (!checkoutModal.classList.contains('open')) {
    document.body.style.overflow = '';
  }
}

/* ==========================================================
   DRAWER / CHECKOUT
   ========================================================== */
function openCart()  { cartDrawer.classList.add('open');    cartDrawer.setAttribute('aria-hidden', 'false'); }
function closeCart() { cartDrawer.classList.remove('open'); cartDrawer.setAttribute('aria-hidden', 'true');  }

function openCheckout() {
  if (cartTotals().count === 0) return;
  closeCart();
  checkoutModal.classList.add('open');
  checkoutModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeCheckout() {
  checkoutModal.classList.remove('open');
  checkoutModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ==========================================================
   THEME (night mode)
   - Persists in localStorage; honors system preference on first
     visit.
   ========================================================== */
const THEME_KEY = 'bb-theme';
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = $('#themeToggleBtn');
  if (btn) btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode');
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') return applyTheme(saved);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

/* ==========================================================
   TOAST
   ========================================================== */
let toastTimer;
function showToast(msg, opts = {}) {
  const { variant = 'default', subtitle = '', icon = '' } = opts;

  toastEl.classList.toggle('success', variant === 'success');

  const iconHtml = icon
    ? `<span class="toast-icon" aria-hidden="true">${icon}</span>`
    : '';
  const subtitleHtml = subtitle ? `<small>${subtitle}</small>` : '';
  toastEl.innerHTML = `
    ${iconHtml}
    <span class="toast-text">${msg}${subtitleHtml}</span>
  `;

  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

/* ==========================================================
   FLY-TO-CART ANIMATION
   - Spawns a floating copy of the item emoji at the source
     button, arcs it across the screen toward the cart, and
     shakes the cart on impact.
   - sourceEl = the button the user just pressed (for start xy).
   ========================================================== */
function flyToCart(emoji, sourceEl) {
  const cartBtn = $('#openCartBtn');
  if (!cartBtn) return;

  // No source? Just shake the cart so feedback still happens.
  if (!sourceEl) { shakeCart(); return; }

  const sRect = sourceEl.getBoundingClientRect();
  const cRect = cartBtn.getBoundingClientRect();
  const startX = sRect.left + sRect.width  / 2;
  const startY = sRect.top  + sRect.height / 2;
  const endX   = cRect.left + cRect.width  / 2;
  const endY   = cRect.top  + cRect.height / 2;

  const fly = document.createElement('span');
  fly.className = 'fly-to-cart';
  fly.textContent = emoji || '🛒';
  fly.setAttribute('aria-hidden', 'true');
  fly.style.setProperty('--x0', startX + 'px');
  fly.style.setProperty('--y0', startY + 'px');
  fly.style.setProperty('--tx', (endX - startX) + 'px');
  fly.style.setProperty('--ty', (endY - startY) + 'px');
  document.body.appendChild(fly);

  fly.addEventListener('animationend', () => {
    fly.remove();
    shakeCart();
  }, { once: true });

  // Safety net: if animationend never fires, clean up.
  setTimeout(() => { if (fly.isConnected) { fly.remove(); shakeCart(); } }, 1200);
}

function shakeCart() {
  const btn   = $('#openCartBtn');
  const badge = $('#cartBadge');
  if (!btn || !badge) return;

  btn.classList.remove('shake');
  badge.classList.remove('pulse');
  void btn.offsetWidth; // reflow → restart animation on rapid taps
  btn.classList.add('shake');
  badge.classList.add('pulse');

  setTimeout(() => {
    btn.classList.remove('shake');
    badge.classList.remove('pulse');
  }, 600);
}

/* ==========================================================
   ORDER SUBMISSION
   - Demo flow. Plug real payment APIs at the marked switch.
   ========================================================== */
function submitOrder(formData) {
  const method = formData.get('payment');
  const totals = cartTotals();
  const orderRef = 'BB-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  switch (method) {
    case 'gcash':
      // TODO: GCash via Xendit/PayMongo/Adyen.
      console.log(`[GCash stub] charge ${totals.total} ref ${orderRef}`);
      break;
    case 'maya':
      // TODO: Maya Business Checkout.
      console.log(`[Maya stub] charge ${totals.total} ref ${orderRef}`);
      break;
    case 'bank':
      // TODO: PayMongo / Xendit online banking source.
      console.log(`[Bank stub] charge ${totals.total} ref ${orderRef}`);
      break;
    case 'card':
      // TODO: tokenize via Stripe Elements / PayMongo.
      console.log(`[Card stub] charge ${totals.total} ref ${orderRef}`);
      break;
    case 'cod':
      console.log(`[COD] collect ${totals.total} on delivery, ref ${orderRef}`);
      break;
  }

  showToast(`Order ${orderRef} placed! We'll text you when the rider rolls out 🛵`);
  clearCart();
  closeCheckout();
  checkoutForm.reset();
}

/* ==========================================================
   EVENT WIRING
   ========================================================== */
function bindEvents() {
  // Category chips
  $$('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.category = chip.dataset.category;
      renderMenu();
    });
  });

  // Menu grid (open customizer or quick-add)
  menuGrid.addEventListener('click', (e) => {
    const id = e.target.dataset.open;
    if (id) openCustomizer(id, { sourceEl: e.target });
  });

  // Featured cards — "Try it →" buttons open the same customizer
  const featuredHost = $('#featuredGrid');
  if (featuredHost) {
    featuredHost.addEventListener('click', (e) => {
      const id = e.target.dataset.open;
      if (id) openCustomizer(id, { sourceEl: e.target });
    });
  }

  // Cart drawer controls
  $('#openCartBtn').addEventListener('click', openCart);
  $('#closeCartBtn').addEventListener('click', closeCart);

  // Cart drawer item actions (delegated)
  cartItemsEl.addEventListener('click', (e) => {
    const inc = e.target.dataset.inc;
    const dec = e.target.dataset.dec;
    const rem = e.target.dataset.rem;
    const edt = e.target.dataset.edit;
    if (inc) changeQty(inc, +1);
    if (dec) changeQty(dec, -1);
    if (rem) removeLine(rem);
    if (edt) {
      const line = findLine(edt);
      if (line) openCustomizer(line.id, { editLineKey: edt });
    }
  });

  // Checkout
  checkoutBtn.addEventListener('click', openCheckout);
  $('#closeCheckoutBtn').addEventListener('click', closeCheckout);

  // Customizer close (X)
  $('#closeCustomizerBtn').addEventListener('click', closeCustomizer);

  /* ----- Backdrop-close, drag-safe -----
     Only close when BOTH mousedown and mouseup happen on the
     backdrop. Prevents accidental closure when the user is
     selecting text inside an input and releases the mouse
     outside the input (browser fires `click` on the modal). */
  function bindBackdropClose(modalEl, closeFn) {
    let startedOnBackdrop = false;
    modalEl.addEventListener('mousedown', (e) => {
      startedOnBackdrop = (e.target === modalEl);
    });
    modalEl.addEventListener('mouseup', (e) => {
      if (startedOnBackdrop && e.target === modalEl) closeFn();
      startedOnBackdrop = false;
    });
    // Touch parity
    modalEl.addEventListener('touchstart', (e) => {
      startedOnBackdrop = (e.target === modalEl);
    }, { passive: true });
    modalEl.addEventListener('touchend', (e) => {
      if (startedOnBackdrop && e.target === modalEl) closeFn();
      startedOnBackdrop = false;
    });
  }
  bindBackdropClose(checkoutModal,   closeCheckout);
  bindBackdropClose(customizerModal, closeCustomizer);

  // Theme toggle
  $('#themeToggleBtn').addEventListener('click', toggleTheme);

  // Card-fields toggle on payment change
  checkoutForm.addEventListener('change', (e) => {
    if (e.target.name === 'payment') {
      cardFields.hidden = (e.target.value !== 'card');
    }
  });

  // Submit checkout
  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitOrder(new FormData(checkoutForm));
  });

  // Mobile nav
  const hamburger = $('#hamburger');
  const nav = $('#primaryNav');
  hamburger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      nav.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });

  // Escape closes overlays in priority order
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (customizerModal.classList.contains('open')) closeCustomizer();
    else if (checkoutModal.classList.contains('open')) closeCheckout();
    else if (cartDrawer.classList.contains('open')) closeCart();
  });

  // Footer year
  $('#year').textContent = new Date().getFullYear();
}

/* ==========================================================
   INIT
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderFeatured();
  renderMenu();
  updateCart();
  bindEvents();
});
