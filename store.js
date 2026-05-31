/* ==========================================================
   BREW & BLOOM — DATA STORE (Abstraction Layer)
   ----------------------------------------------------------
   This file is the SINGLE source of truth for reading and
   writing application data (menu, content, payments, users,
   sessions). The rest of the app NEVER touches localStorage
   directly — it goes through `Store.*` methods.

   ----- WHY THIS LAYER EXISTS -----
   Today the data lives in localStorage. Tomorrow you can
   replace the body of each method with calls to Supabase /
   Firebase / your own API. The UI keeps working without
   changes because the function signatures stay the same.

   Search for "BACKEND TODO" markers below to find the spots
   that need to be replaced when you wire a real backend.
   ========================================================== */

/* ==========================================================
   STORAGE KEYS — one place to rename
   ========================================================== */
const STORE_KEYS = {
  menu:     'bb_menu',
  config:   'bb_config',
  payments: 'bb_payments',
  users:    'bb_users',
  session:  'bb_session',
};

/* ==========================================================
   DEFAULT DATA (seeded on first run)
   - Editing these here changes the "factory reset" state.
   - Once an admin saves anything, that overrides these.
   ========================================================== */
const DEFAULT_CONFIG = {
  brandName:    'Brew & Bloom',
  brandTagline: 'Artisan coffee, slow-steeped teas, and buttery pastries — delivered to your door in 30 minutes or less.',
  heroTitle:    'Sip the moment.\nBloom your day.',
  heroEyebrow:  'Freshly roasted • Locally loved',
  heroImage:    'https://loremflickr.com/900/900/coffee,latte,art?lock=1',
  aboutTitle:   'Small batch. Big heart.',
  aboutBody:    "Brew & Bloom started as a weekend pop-up in Quezon City. Today, we hand-roast beans from Benguet and Sagada and partner with local pastry makers to bring you something familiar — and a little surprising — in every cup.",
  aboutImage:   'https://loremflickr.com/700/700/cafe,coffeeshop,interior?lock=20',
  announcement: '☕ Free delivery on orders over ₱500 — within Metro Manila',
  contactPhone: '+63 917 000 0000',
  contactEmail: 'hello@brewandbloom.ph',
  contactAddress: '123 Katipunan Ave, Quezon City',
  hours:        'Open daily, 7am–9pm',
};

/* Payment provider configuration (admin-only — never shown
   to customers). API keys live here for now in localStorage,
   which is INSECURE. In production these must live on the
   server and be referenced by an opaque identifier. */
const DEFAULT_PAYMENTS = {
  gcash:  { enabled: true,  apiKey: '', merchantId: '' },
  maya:   { enabled: true,  apiKey: '', merchantId: '' },
  bank:   { enabled: true,  provider: 'paymongo', apiKey: '' },
  card:   { enabled: true,  provider: 'stripe',   publishableKey: '', secretKey: '' },
  cod:    { enabled: true },
};

const img = (topic, lock, w = 600, h = 420) =>
  `https://loremflickr.com/${w}/${h}/${encodeURIComponent(topic)}?lock=${lock}`;

const DEFAULT_MENU = [
  { id: 'c1', name: 'Classic Espresso',  category: 'coffee', price: 120, emoji: '☕', rating: 4.9, desc: 'Bold double shot, rich crema.', tag: 'Bestseller',
    img: img('espresso,coffee', 101),
    options: { size: true,  temp: false, milk: false, sugar: true, addons: true } },
  { id: 'c2', name: 'Caramel Macchiato', category: 'coffee', price: 175, emoji: '☕', rating: 4.8, desc: 'Vanilla, caramel, layered milk.',
    img: img('caramel,latte,coffee', 102),
    options: { size: true,  temp: true,  milk: true,  sugar: true, addons: true } },
  { id: 'c3', name: 'Pink Rose Latte',   category: 'coffee', price: 185, emoji: '🌸', rating: 4.9, desc: 'Rose syrup, oat milk, espresso.', tag: 'New',
    img: img('latte,rose,rose', 103),
    options: { size: true,  temp: true,  milk: true,  sugar: true, addons: true } },
  { id: 'c4', name: 'Spanish Latte',     category: 'coffee', price: 165, emoji: '☕', rating: 4.7, desc: 'Sweet condensed milk + espresso.',
    img: img('latte,coffeeart', 104),
    options: { size: true,  temp: true,  milk: true,  sugar: true, addons: true } },
  { id: 't1', name: 'Matcha Bloom',      category: 'tea',    price: 180, emoji: '🍵', rating: 4.9, desc: 'Ceremonial matcha, vanilla cream.', tag: 'New',
    img: img('matcha,green,tea', 201),
    options: { size: true,  temp: true,  milk: true,  sugar: true, addons: true } },
  { id: 't2', name: 'Jasmine Green',     category: 'tea',    price: 140, emoji: '🍵', rating: 4.6, desc: 'Hand-picked jasmine blossoms.',
    img: img('greentea,teacup', 202),
    options: { size: true,  temp: true,  milk: false, sugar: true, addons: true } },
  { id: 't3', name: 'Strawberry Sakura', category: 'tea',    price: 165, emoji: '🌸', rating: 4.8, desc: 'Strawberry, sakura, sparkling.',
    img: img('strawberry,drink', 203),
    options: { size: true,  temp: false, milk: false, sugar: true, addons: true } },
  { id: 'b1', name: 'Cold Brew Original',category: 'cold',   price: 160, emoji: '🧊', rating: 4.8, desc: '12-hour steep, smooth & sweet.',
    img: img('coldbrew,icedcoffee', 301),
    options: { size: true,  temp: false, milk: true,  sugar: true, addons: true } },
  { id: 'b2', name: 'Iced Pink Latte',   category: 'cold',   price: 195, emoji: '🧊', rating: 4.9, desc: 'Strawberry milk + cold espresso.',
    img: img('pink latte,latte', 302),
    options: { size: true,  temp: false, milk: true,  sugar: true, addons: true } },
  { id: 'b3', name: 'Tropical Cold Foam',category: 'cold',   price: 180, emoji: '🧊', rating: 4.7, desc: 'Mango cold foam over black tea.',
    img: img('icedtea,mango', 303),
    options: { size: true,  temp: false, milk: false, sugar: true, addons: true } },
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
  { id: 'd1', name: "Barista's Bundle",  category: 'bundle', price: 420, emoji: '🎁', rating: 5.0, desc: '2 drinks + 1 pastry, save ₱90.', tag: 'Save',
    img: img('coffee,pastry,cafe', 501),
    options: { size: false, temp: false, milk: false, sugar: false, addons: false } },
  { id: 'd2', name: 'Sunrise Set',       category: 'bundle', price: 260, emoji: '🌅', rating: 4.8, desc: 'Espresso + croissant combo.',
    img: img('expresso,coffee,croissant', 502),
    options: { size: false, temp: false, milk: false, sugar: false, addons: false } },
];

/* ==========================================================
   PASSWORD HASHING
   - Uses Web Crypto SHA-256 + a hardcoded "salt".
   - This is NOT production-secure. Hashing client-side is
     fundamentally insecure because the salt is visible to
     anyone who reads this file. It only stops casual snooping
     of the localStorage dump. Replace with server-side bcrypt
     / argon2 the moment you wire a backend.
   ========================================================== */
const PEPPER = 'bb_local_pepper_change_when_wiring_real_backend';

async function hashPassword(plain) {
  const enc = new TextEncoder().encode(plain + PEPPER);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/* ==========================================================
   LOW-LEVEL JSON-IN-LOCALSTORAGE HELPERS
   - The single place where JSON.parse / stringify happens.
   ========================================================== */
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn(`[Store] corrupted ${key}, falling back`, e);
    return fallback;
  }
}
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    // QuotaExceededError happens around 5–10 MB total.
    console.error(`[Store] write failed for ${key} — quota exceeded?`, e);
    return false;
  }
}

/* ==========================================================
   PUBLIC API — used by the rest of the app
   ========================================================== */
const Store = {

  /* ----- Menu ----- */
  getMenu()           { return readJSON(STORE_KEYS.menu, DEFAULT_MENU); },
  setMenu(menu)       { return writeJSON(STORE_KEYS.menu, menu); },
  resetMenu()         { localStorage.removeItem(STORE_KEYS.menu); },

  upsertMenuItem(item) {
    const menu = Store.getMenu();
    const idx  = menu.findIndex(m => m.id === item.id);
    if (idx === -1) menu.push(item);
    else            menu[idx] = item;
    return Store.setMenu(menu);
  },
  deleteMenuItem(id) {
    const menu = Store.getMenu().filter(m => m.id !== id);
    return Store.setMenu(menu);
  },

  /* ----- Site Configuration (banner, hero, about, contact) ----- */
  getConfig()         { return { ...DEFAULT_CONFIG, ...readJSON(STORE_KEYS.config, {}) }; },
  setConfig(patch)    { return writeJSON(STORE_KEYS.config, { ...Store.getConfig(), ...patch }); },
  resetConfig()       { localStorage.removeItem(STORE_KEYS.config); },

  /* ----- Payment Configuration (admin-only) ----- */
  getPayments()       { return { ...DEFAULT_PAYMENTS, ...readJSON(STORE_KEYS.payments, {}) }; },
  setPayments(patch)  { return writeJSON(STORE_KEYS.payments, { ...Store.getPayments(), ...patch }); },

  /* Returns only what's safe for the public site to know —
     "is this payment method enabled?" — never the API keys. */
  getEnabledPaymentMethods() {
    const p = Store.getPayments();
    return Object.fromEntries(
      Object.entries(p).map(([k, v]) => [k, !!v.enabled])
    );
  },

  /* ==========================================================
     USERS + AUTH
     - BACKEND TODO: replace these with calls to Supabase Auth
       (or Firebase Auth / your own /api/* endpoints).
     - Today: users live in localStorage. That means a "user"
       only exists in the browser where they registered — they
       CANNOT log in from another device. This is fine for a
       prototype but is the #1 reason to upgrade.
     ========================================================== */
  async getUsers()    { return readJSON(STORE_KEYS.users, []); },

  async findUser(email) {
    const users = await Store.getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async registerUser({ email, password, name, role = 'customer' }) {
    if (!email || !password)           throw new Error('Email and password are required');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Please enter a valid email');
    if (password.length < 8)           throw new Error('Password must be at least 8 characters');

    const users = await Store.getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account already exists for this email');
    }

    const passwordHash = await hashPassword(password);
    const user = {
      email: email.toLowerCase(),
      passwordHash,
      name: name || email.split('@')[0],
      role,                          // 'admin' | 'customer'
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    writeJSON(STORE_KEYS.users, users);
    return { email: user.email, name: user.name, role: user.role };
  },

  async login({ email, password }) {
    const user = await Store.findUser(email);
    if (!user) throw new Error('No account found for that email');
    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) throw new Error('Incorrect password');

    const session = {
      email:     user.email,
      name:      user.name,
      role:      user.role,
      issuedAt:  Date.now(),
      expiresAt: Date.now() + (1000 * 60 * 60 * 8),   // 8 hours
    };
    writeJSON(STORE_KEYS.session, session);
    return session;
  },

  logout() { localStorage.removeItem(STORE_KEYS.session); },

  getSession() {
    const s = readJSON(STORE_KEYS.session, null);
    if (!s)                       return null;
    if (s.expiresAt < Date.now()) { Store.logout(); return null; }
    return s;
  },

  isAdmin() {
    const s = Store.getSession();
    return !!s && s.role === 'admin';
  },

  async listUsersForAdmin() {
    if (!Store.isAdmin()) return [];
    const users = await Store.getUsers();
    return users.map(u => ({ email: u.email, name: u.name, role: u.role, createdAt: u.createdAt }));
  },

  async setUserRole(email, role) {
    if (!Store.isAdmin()) throw new Error('Admin access required');
    const users = await Store.getUsers();
    const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
    if (!u) throw new Error('User not found');
    u.role = role;
    return writeJSON(STORE_KEYS.users, users);
  },

  /* ==========================================================
     SEED — runs on every boot. Guarantees the default admin
     ALWAYS exists with the default password (admin@admin.com
     / admin1234). If the account was created with a different
     password (manual register, old seed, corruption), this
     resets it so login is reliable in this prototype.
     ----------------------------------------------------------
     Trade-off: you cannot change the default admin's password
     while this seed is active — it'll be reset on next reload.
     If you need a persistent password, change the SEED_ADMIN
     constants below or delete this seed entirely once you've
     created other admin accounts.
     ========================================================== */
  async seedIfEmpty() {
    const SEED_EMAIL    = 'admin@admin.com';
    const SEED_PASSWORD = 'admin1234';
    const SEED_NAME     = 'Admin';

    const users = await Store.getUsers();
    const expectedHash = await hashPassword(SEED_PASSWORD);
    const existing = users.find(u => u.email === SEED_EMAIL);

    if (existing) {
      // Force-sync: role = admin, password = SEED_PASSWORD.
      let changed = false;
      if (existing.role !== 'admin')      { existing.role = 'admin';       changed = true; }
      if (existing.passwordHash !== expectedHash) {
                                            existing.passwordHash = expectedHash; changed = true; }
      if (changed) {
        writeJSON(STORE_KEYS.users, users);
        console.info('[Store] re-synced default admin password to defaults');
      }
      return;
    }

    // Create from scratch.
    users.push({
      email:        SEED_EMAIL,
      passwordHash: expectedHash,
      name:         SEED_NAME,
      role:         'admin',
      createdAt:    new Date().toISOString(),
    });
    writeJSON(STORE_KEYS.users, users);
    console.info(`[Store] seeded default admin: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
  },

  /* ==========================================================
     DANGER: wipes ALL local data and returns to defaults.
     ========================================================== */
  factoryReset() {
    Object.values(STORE_KEYS).forEach(k => localStorage.removeItem(k));
  },
};

/* Make Store usable from <script>-loaded files without modules */
window.Store = Store;
window.DEFAULT_MENU = DEFAULT_MENU;
window.DEFAULT_CONFIG = DEFAULT_CONFIG;
