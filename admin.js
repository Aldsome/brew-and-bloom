/* ==========================================================
   BREW & BLOOM — ADMIN CONSOLE LOGIC
   ----------------------------------------------------------
   Auth gate, sidebar nav, menu CRUD, content editor,
   payment-key vault, user management, danger-zone resets.

   All data goes through `Store.*` (see store.js).
   ========================================================== */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ==========================================================
   UTIL — toast + theme
   ========================================================== */
const toastEl = $('#toast');
let toastTimer;
function toast(msg, variant = 'default') {
  toastEl.textContent = msg;
  toastEl.className   = 'toast show ' + variant;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}
function initTheme() {
  const saved = localStorage.getItem('bb-theme');
  applyTheme(saved === 'dark' || saved === 'light'
    ? saved
    : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
}
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem('bb-theme', next);
  applyTheme(next);
}

/* ==========================================================
   AUTH FLOW
   ========================================================== */
function showGate()      { $('#authGate').hidden = false; $('#adminApp').hidden = true; }
function showApp()       { $('#authGate').hidden = true;  $('#adminApp').hidden = false; }

function setError(el, msg) {
  if (!msg) { el.hidden = true; el.textContent = ''; return; }
  el.textContent = msg;
  el.hidden = false;
}

async function bootAuth() {
  await Store.seedIfEmpty();
  const session = Store.getSession();
  if (session) {
    enterApp(session);
  } else {
    showGate();
  }
}

function enterApp(session) {
  $('#userName').textContent = session.name || session.email;
  $('#userAvatar').textContent = (session.name || session.email).charAt(0).toUpperCase();

  // Hide admin-only sections for non-admins
  $$('.admin-only').forEach(el => el.hidden = (session.role !== 'admin'));

  showApp();
  navigate('dashboard');
  refreshDashboard();
}

/* ----- Tabs (login / register) — crossfade via .active ----- */
$$('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const which = tab.dataset.authTab;
    $('#loginForm').classList.toggle('active',    which === 'login');
    $('#registerForm').classList.toggle('active', which === 'register');
  });
});

/* ----- Show/hide password ----- */
$('.pw-toggle')?.addEventListener('click', () => {
  const input = $('#loginForm input[name="password"]');
  input.type = input.type === 'password' ? 'text' : 'password';
});

/* ----- Login ----- */
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('#loginError');
  setError(errEl, '');
  const fd = new FormData(e.target);
  try {
    const session = await Store.login({
      email: fd.get('email'),
      password: fd.get('password'),
    });
    toast(`Welcome back, ${session.name}`, 'success');
    enterApp(session);
    e.target.reset();
  } catch (err) {
    setError(errEl, err.message);
  }
});

/* ----- Register ----- */
$('#registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('#registerError');
  setError(errEl, '');
  const fd = new FormData(e.target);
  try {
    await Store.registerUser({
      email:    fd.get('email'),
      password: fd.get('password'),
      name:     fd.get('name'),
      role:     'customer',
    });
    const session = await Store.login({
      email: fd.get('email'),
      password: fd.get('password'),
    });
    toast(`Account created`, 'success');
    enterApp(session);
    e.target.reset();
  } catch (err) {
    setError(errEl, err.message);
  }
});

/* ----- Logout ----- */
$('#logoutBtn').addEventListener('click', () => {
  Store.logout();
  toast('Signed out');
  showGate();
});

/* ==========================================================
   NAVIGATION (sidebar)
   ========================================================== */
function navigate(sectionId) {
  $$('.panel').forEach(p => p.hidden = (p.dataset.panel !== sectionId));
  $$('.side-link').forEach(l => l.classList.toggle('active', l.dataset.section === sectionId));
  $('#sidebar').classList.remove('open');

  // Lazy-load section contents on first switch
  if (sectionId === 'menu')     renderMenuTable();
  if (sectionId === 'content')  loadContentForm();
  if (sectionId === 'payments') loadPaymentsForm();
  if (sectionId === 'users')    renderUsersTable();
}
$$('.side-link').forEach(l => l.addEventListener('click', () => navigate(l.dataset.section)));

$('#sidebarToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#themeToggleBtn').addEventListener('click', toggleTheme);

/* ==========================================================
   DASHBOARD
   ========================================================== */
async function refreshDashboard() {
  const menu     = Store.getMenu();
  const payments = Store.getPayments();
  const users    = await Store.getUsers();
  const enabledPay = Object.values(payments).filter(p => p.enabled).length;
  const cats = new Set(menu.map(m => m.category));

  $('#statMenu').textContent       = menu.length;
  $('#statCategories').textContent = cats.size;
  $('#statPayments').textContent   = `${enabledPay} / ${Object.keys(payments).length}`;
  $('#statUsers').textContent      = users.length;
}

/* ==========================================================
   MENU CRUD
   ========================================================== */
function renderMenuTable() {
  const body = $('#menuTableBody');
  const search = $('#menuSearch').value.trim().toLowerCase();
  const cat    = $('#menuCategoryFilter').value;
  const items  = Store.getMenu().filter(it => {
    if (cat && it.category !== cat) return false;
    if (search && !`${it.name} ${it.category}`.toLowerCase().includes(search)) return false;
    return true;
  });

  if (items.length === 0) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--ink-soft)">No items match those filters.</td></tr>`;
    return;
  }

  body.innerHTML = items.map(it => {
    const opts = Object.entries(it.options || {})
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(', ') || '<span class="muted">none</span>';
    return `
      <tr data-id="${it.id}">
        <td><img class="thumb" src="${it.img || ''}" alt="" onerror="this.style.display='none'"></td>
        <td>
          <strong>${escapeHtml(it.name)}</strong>
          <div class="muted small">${escapeHtml(it.desc || '')}</div>
        </td>
        <td>${it.category}</td>
        <td>₱${it.price}</td>
        <td>${it.tag ? `<span class="tag-pill">${escapeHtml(it.tag)}</span>` : '<span class="muted">—</span>'}</td>
        <td class="muted small">${opts}</td>
        <td class="right">
          <div class="row-actions">
            <button class="btn btn-ghost" data-act="edit"   data-id="${it.id}">Edit</button>
            <button class="btn btn-danger" data-act="delete" data-id="${it.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

$('#menuSearch').addEventListener('input', renderMenuTable);
$('#menuCategoryFilter').addEventListener('change', renderMenuTable);

$('#menuTableBody').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.act === 'edit') {
    const item = Store.getMenu().find(m => m.id === id);
    if (item) openItemModal(item);
  }
  if (btn.dataset.act === 'delete') {
    if (confirm(`Delete "${id}"? This cannot be undone.`)) {
      Store.deleteMenuItem(id);
      renderMenuTable();
      refreshDashboard();
      toast('Item deleted');
    }
  }
});

$('#addItemBtn').addEventListener('click', () => openItemModal(null));

/* ----- Item modal ----- */
const itemModal = $('#itemModal');
const itemForm  = $('#itemForm');
let editingItemId = null;

function openItemModal(item) {
  editingItemId = item?.id || null;
  $('#itemModalTitle').textContent = item ? 'Edit item' : 'Add item';
  $('#itemFormError').hidden = true;

  itemForm.reset();
  if (item) {
    itemForm.id.value       = item.id;
    itemForm.id.disabled    = true;
    itemForm.name.value     = item.name;
    itemForm.category.value = item.category;
    itemForm.price.value    = item.price;
    itemForm.emoji.value    = item.emoji || '';
    itemForm.rating.value   = item.rating ?? 5;
    itemForm.tag.value      = item.tag || '';
    itemForm.desc.value     = item.desc || '';
    itemForm.img.value      = item.img || '';
    const o = item.options || {};
    itemForm.opt_size.checked   = !!o.size;
    itemForm.opt_temp.checked   = !!o.temp;
    itemForm.opt_milk.checked   = !!o.milk;
    itemForm.opt_sugar.checked  = !!o.sugar;
    itemForm.opt_addons.checked = !!o.addons;
    $('#itemImagePreview').src = item.img || '';
  } else {
    itemForm.id.disabled = false;
    itemForm.rating.value = '4.8';
    itemForm.emoji.value  = '☕';
    $('#itemImagePreview').src = '';
  }

  itemModal.classList.add('open');
}
function closeItemModal() {
  itemModal.classList.remove('open');
  editingItemId = null;
}
$('#closeItemModal').addEventListener('click', closeItemModal);
$('#cancelItemBtn').addEventListener('click', closeItemModal);
itemModal.addEventListener('click', (e) => {
  if (e.target === itemModal) closeItemModal();
});

itemForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(itemForm);
  const errEl = $('#itemFormError');

  const id = (fd.get('id') || '').toString().trim().toLowerCase();
  if (!id) { setError(errEl, 'ID is required'); return; }

  const existing = Store.getMenu().find(m => m.id === id);
  if (existing && existing.id !== editingItemId) {
    setError(errEl, `An item with id "${id}" already exists`);
    return;
  }

  const item = {
    id,
    name:     fd.get('name').toString().trim(),
    category: fd.get('category'),
    price:    Number(fd.get('price')),
    emoji:    fd.get('emoji') || '☕',
    rating:   Number(fd.get('rating')) || 4.8,
    desc:     fd.get('desc').toString().trim(),
    tag:      fd.get('tag') ? fd.get('tag').toString().trim() : undefined,
    img:      fd.get('img') || '',
    options: {
      size:   itemForm.opt_size.checked,
      temp:   itemForm.opt_temp.checked,
      milk:   itemForm.opt_milk.checked,
      sugar:  itemForm.opt_sugar.checked,
      addons: itemForm.opt_addons.checked,
    },
  };

  const ok = Store.upsertMenuItem(item);
  if (!ok) { setError(errEl, 'Could not save (storage quota exceeded?)'); return; }

  toast(editingItemId ? 'Item updated' : 'Item added', 'success');
  closeItemModal();
  renderMenuTable();
  refreshDashboard();
});

/* ==========================================================
   IMAGE UPLOADERS
   - File inputs convert to data URLs and write into the
     matching text input + preview <img>.
   - Caveat: data URLs eat localStorage quota fast.
   ========================================================== */
$$('.choose-file').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.parentElement.querySelector('.img-file').click();
  });
});
$$('.img-file').forEach(input => {
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast('Image is over 1 MB — consider hosting it externally', 'error');
    }
    const dataUrl = await readAsDataURL(file);
    const wrap = input.closest('.img-uploader');
    const urlInput = wrap.querySelector('input[type="url"]');
    const preview  = wrap.querySelector('.preview');
    urlInput.value = dataUrl;
    preview.src    = dataUrl;
  });
});
function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
// Live preview when typing URL
$$('.img-uploader input[type="url"]').forEach(inp => {
  inp.addEventListener('input', () => {
    const preview = inp.closest('.img-uploader').querySelector('.preview');
    preview.src = inp.value;
  });
});

/* ==========================================================
   CONTENT (banner + hero + about + contact)
   ========================================================== */
function loadContentForm() {
  const cfg = Store.getConfig();
  const form = $('#contentForm');
  Object.entries(cfg).forEach(([k, v]) => {
    const field = form.elements[k];
    if (field) field.value = v;
  });
  $('#heroImagePreview').src  = cfg.heroImage  || '';
  $('#aboutImagePreview').src = cfg.aboutImage || '';
}
$('#saveContentBtn').addEventListener('click', () => {
  const fd = new FormData($('#contentForm'));
  const patch = {};
  for (const [k, v] of fd.entries()) patch[k] = v;
  Store.setConfig(patch);
  toast('Content saved', 'success');
});

/* ==========================================================
   PAYMENTS (admin only)
   ========================================================== */
function loadPaymentsForm() {
  const p = Store.getPayments();
  $$('#paymentsForm [data-pay]').forEach(input => {
    const provider = input.dataset.pay;
    const field    = input.dataset.field;
    const value    = p[provider]?.[field];
    if (input.type === 'checkbox') input.checked = !!value;
    else                            input.value = value || '';
  });
}
$('#savePaymentsBtn').addEventListener('click', () => {
  const current = Store.getPayments();
  $$('#paymentsForm [data-pay]').forEach(input => {
    const provider = input.dataset.pay;
    const field    = input.dataset.field;
    if (!current[provider]) current[provider] = {};
    current[provider][field] = (input.type === 'checkbox') ? input.checked : input.value;
  });
  Store.setPayments(current);
  toast('Payment settings saved', 'success');
  refreshDashboard();
});

/* ==========================================================
   USERS (admin only)
   ========================================================== */
async function renderUsersTable() {
  const users = await Store.listUsersForAdmin();
  const session = Store.getSession();
  const body = $('#usersTableBody');

  if (users.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="muted" style="text-align:center;padding:24px">No users yet.</td></tr>`;
    return;
  }

  body.innerHTML = users.map(u => {
    const isSelf = u.email === session.email;
    return `
      <tr>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${u.role}</td>
        <td class="muted small">${new Date(u.createdAt).toLocaleDateString()}</td>
        <td class="right">
          <div class="row-actions">
            ${u.role === 'admin'
              ? `<button class="btn btn-ghost" ${isSelf ? 'disabled title="Cannot demote yourself"' : ''} data-role="customer" data-email="${u.email}">Demote</button>`
              : `<button class="btn btn-primary" data-role="admin" data-email="${u.email}">Promote</button>`}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}
$('#usersTableBody').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-role]');
  if (!btn) return;
  try {
    await Store.setUserRole(btn.dataset.email, btn.dataset.role);
    toast('Role updated', 'success');
    renderUsersTable();
    refreshDashboard();
  } catch (err) {
    toast(err.message, 'error');
  }
});

/* ==========================================================
   DANGER ZONE
   ========================================================== */
$('#resetMenuBtn').addEventListener('click', () => {
  if (!confirm('Reset menu to factory defaults? Custom items will be lost.')) return;
  Store.resetMenu();
  toast('Menu reset to defaults');
  renderMenuTable();
  refreshDashboard();
});
$('#resetContentBtn').addEventListener('click', () => {
  if (!confirm('Reset content (brand, hero, about, contact) to defaults?')) return;
  Store.resetConfig();
  loadContentForm();
  toast('Content reset to defaults');
});
$('#factoryResetBtn').addEventListener('click', () => {
  if (!confirm('Factory reset wipes ALL admin data on this device including user accounts. Continue?')) return;
  Store.factoryReset();
  toast('Factory reset complete — signing out');
  setTimeout(() => location.reload(), 800);
});

/* ==========================================================
   HELPERS
   ========================================================== */
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==========================================================
   BOOT
   ========================================================== */
initTheme();
bootAuth();
