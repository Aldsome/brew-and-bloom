# Brew & Bloom — Bug & Concern Report

Last updated: 2026-05-31
Scope: covers the customer site (`index.html`/`script.js`/`style.css`)
and the new admin console (`admin.html`/`admin.js`/`admin.css`/`store.js`).

Severity tags:
- **[CRITICAL]** — security risk or breaks the user experience
- **[HIGH]** — incorrect behavior in a common path
- **[MEDIUM]** — limitation; works but with caveats
- **[LOW]** — cosmetic or edge-case

---

## 1. Authentication & data persistence

### [CRITICAL] All "auth" is fake — data lives in `localStorage`
- Anyone who opens DevTools can read every user record (hashed passwords + emails).
- "Sessions" are just a JSON object with an `expiresAt` field. A user could hand-edit
  their session to flip `role: "customer"` → `role: "admin"` and the app would let
  them in.
- Users can NOT log in from another device — accounts only exist in the browser
  where they registered. This is by far the biggest blocker to "real" registration.
- **Fix:** wire `store.js` to a real auth provider (see `Required.txt`).

### [CRITICAL] Password hashing is not secure
- `hashPassword()` in `store.js` uses SHA-256 + a hardcoded "pepper". This is
  defense-in-depth at best. The pepper is visible in source, and SHA-256 without
  per-user salt is brute-forceable.
- Client-side hashing is **fundamentally** insecure because the salting strategy
  is in code you ship to the attacker.
- **Fix:** move auth to a backend (Supabase, Firebase, Auth0). Let it do
  bcrypt/argon2 server-side. Delete `hashPassword()`.

### [HIGH] Default admin credentials are publicly known
- First-run seeds `admin@admin.com` / `admin1234`. This is printed on
  the login screen as a "first time?" hint.
- If you deploy this without changing the password, anyone who reads `BUGS.md`
  or the login page can sign in as admin.
- **Fix:** force a password change on first login, OR remove the seed entirely
  and require manual admin creation via console.

### [HIGH] "Email verification" is fake
- Registration accepts any email format that matches the regex, even
  `aaa@bbb.cc`. No verification email is sent (impossible from a static site).
- A real backend with SMTP integration is required to send a verification link.

### [MEDIUM] No password reset / "forgot password" flow
- Users have no recovery if they forget their password. The admin can't reset
  another user's password either.
- **Fix:** requires a backend (see Required.txt).

### [MEDIUM] Login form never rate-limits
- An attacker can brute-force the password as fast as `hashPassword()` runs (~ms).
- No back-off, no captcha, no "too many attempts" lockout.

---

## 2. Storage limits

### [HIGH] localStorage quota is small (~5–10 MB)
- Uploading images via the admin's "Upload image" button converts them to data
  URLs and stuffs them into localStorage. A 1 MB image becomes a ~1.4 MB string
  after base64 encoding.
- After ~5 large images, writes start failing silently with `QuotaExceededError`.
- `Store.upsertMenuItem()` does return `false` on quota errors, but the admin UI
  only toasts a generic error.
- **Fix:** swap to a real file storage service (Supabase Storage, Firebase Storage,
  S3, Cloudinary). The admin uploader code is already structured to swap easily.

### [MEDIUM] Per-line cart entries stack indefinitely
- Different customizations of the same drink each create a new cart line. No
  upper bound is enforced.
- A user could programmatically add 100,000 lines and overflow localStorage,
  freezing their own browser.

---

## 3. Payments

### [CRITICAL] No actual payment integration
- Every payment method (GCash / Maya / Bank / Card / COD) just logs to the
  console and shows a "thanks" toast. No money moves.
- "Place Order" submits the form, clears the cart, and pretends success.
- Customers must NEVER be told their order succeeded until the payment provider
  confirms.
- **Fix:** see Required.txt — each provider needs its own SDK integration on a
  backend, plus webhook handling for asynchronous confirmations.

### [CRITICAL] Payment API keys are stored client-side
- The admin "Payments & API" panel writes provider secrets to localStorage. ANY
  page on the same origin (or a malicious browser extension) can read them.
- **Fix:** secrets MUST live on a backend, fetched only at request time by the
  payment service.

### [LOW] Payment method icons are colored pills, not real logos
- Trademark + accessibility concern at scale. Real logos require licensing
  consideration for some providers.

---

## 4. Public site (post-admin-wiring)

### [HIGH] Customer site reads from localStorage only
- The "admin edits flow through to public site" feature only works on the SAME
  browser. A customer on their phone sees the DEFAULT menu, not the admin's
  edits.
- **Fix:** admin needs to write to a shared database that the public site reads
  from. Same backend swap as auth.

### [MEDIUM] `applyStoreConfig()` patches the DOM with `innerHTML`
- The hero headline supports `\n` → `<br/>` conversion. If an admin pastes raw
  HTML into the title field (e.g. `<img src=x onerror=alert(1)>`), it executes.
- Low risk because the admin is trusted, but proper escape would be safer.
- **Fix:** Use `textContent` and CSS `white-space: pre-line` instead of `<br/>`.

### [MEDIUM] Visibility-change refresh re-renders every cart
- When the user returns to the public tab, `MENU` is re-read and renderMenu()
  fires. If the admin deleted an item that's currently in the customer's cart,
  the cart still references it but renders no menu card.
- Cart entries for deleted items will say `undefined` because `MENU.find()`
  returns nothing.
- **Fix:** in `updateCart()`, drop lines whose `id` is no longer in MENU and
  toast the customer.

### [LOW] loremflickr can sometimes serve unrelated images
- Topic tags are best-effort. "matcha" might return a green field. Not strictly
  a bug; just a quality note.

---

## 5. Admin console UX

### [HIGH] Item ID is not enforceable as unique across edits
- The "Edit" modal disables the ID field, but on "Add new" the ID is free-form.
  If the admin types an ID that already exists, the form rejects it with an
  error — good — but if they edit the ID via DevTools and POST, validation is
  bypassed. (Low-impact for trusted admins.)

### [MEDIUM] No undo / change history
- Delete is permanent. Edit overwrites without versioning. There's no audit log
  of who changed what.

### [MEDIUM] Image uploader has no compression / resize
- A 4000×3000 phone photo becomes ~3 MB on disk. The uploader warns above 1 MB
  but doesn't shrink. After 1–2 such uploads, localStorage fills up.
- **Fix:** add a client-side resize step (`<canvas>` to 1200×900, JPEG quality
  0.8) before storing the data URL.

### [LOW] Sidebar "active" state doesn't survive page reload
- The admin always lands on Dashboard, not the last panel they used.

### [LOW] Search/filter doesn't persist across navigation
- Switching to Content and back resets the menu search input.

---

## 6. Accessibility & UX

### [MEDIUM] No keyboard trap on modals
- Tab cycles outside the open modal into the underlying page. Screen readers can
  navigate to content that should be blocked.
- **Fix:** focus-trap library or a simple `focusin` listener that bounces focus
  back into the modal.

### [LOW] Color-only differentiation on tags / categories
- "Bestseller" / "New" / "Save" tags use color to signal meaning. Color-blind
  users may not perceive a difference.

### [LOW] Toast text is purely visual
- Screen readers DO catch it because we set `aria-live="polite"`, but a long
  toast may be cut off if it dismisses too fast (current = 2.4 s).

---

## 7. Edge cases tested in this prototype

These are observed behaviors, not crashes — listing for awareness:

- Toggling theme mid-fly-to-cart animation: emoji still arcs in correctly.
- Adding to cart, deleting the item in admin, refocusing public tab: cart line
  goes blank (#4 above).
- Localstorage disabled (private mode in older browsers): the entire admin
  console silently fails to persist anything. No user-visible error yet.
- Two admin tabs open: changes in tab A don't refresh tab B until reload.
- Customizer modal on iOS with Bluetooth keyboard attached: occasional jumpy
  scroll when input focuses. Browser-level issue, not addressable in CSS alone.

---

## 8. Quick wins (low effort, high impact)

1. **Force password change on first login** for the seeded admin
   (`store.js` → check a `mustChangePassword` flag on `login()`).
2. **Drop cart lines for deleted menu items** in `updateCart()`.
3. **Sanitize admin-entered text** before injecting into the public DOM
   (use `textContent` + CSS for line breaks).
4. **Shrink images client-side** before saving to localStorage.
5. **Add a "Sign in as guest"** link from the admin login screen back to
   `index.html` for users who clicked admin by mistake.

---

## 9. Production-readiness checklist

Before deploying this beyond a personal demo:

- [ ] Move auth to a real backend (see `Required.txt`).
- [ ] Move file uploads to a real storage service.
- [ ] Move payment integrations to a real backend.
- [ ] Add HTTPS-only cookies for session (not localStorage).
- [ ] Add CSP headers (block inline scripts, etc.).
- [ ] Add a privacy policy and a terms-of-service page.
- [ ] Add cookie/storage consent for EU/PH compliance.
- [ ] Set up monitoring (Sentry / similar) so errors aren't silent.
- [ ] Set up automated backups for the database.
- [ ] Audit dependencies and lock versions.

---

If you hit something not on this list, add it here and tag the severity.
