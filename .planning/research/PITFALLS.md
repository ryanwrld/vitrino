# Pitfalls Research

**Domain:** Catalog/storefront + WhatsApp-deep-link micro-SaaS (multi-tenant, Brazilian resale market)
**Researched:** 2026-07-10
**Confidence:** MEDIUM (cross-checked across 2-3 independent web sources per topic; no official WhatsApp API doc exists for `wa.me` behavior, so some browser-specific claims stay LOW/anecdotal — flagged inline)

## Validation of the Author's 10 Known Pitfalls

All 10 are real, well-documented failure modes in this category. Assessment of each against research:

| # | Author's pitfall | Validated? | Notes |
|---|---|---|---|
| 1 | Order button active without size selected | **Confirmed, critical** | Baymard/UX research on catalog CTAs: "CTA not clarifying stock status" is a top listed mistake — directly matches. |
| 2 | Sold-out pills still clickable | **Confirmed, critical** | Explicitly called out in e-commerce UX research: "if a size isn't available, it shouldn't be selectable — nor should it waste a click." `pointer-events: none` alone is insufficient — see expanded pitfall below. |
| 3 | Duplicate slugs without validation | **Confirmed** | Classic uniqueness race condition — needs DB-level constraint, not just client-side check (expanded below). |
| 4 | Broken image with no fallback | **Confirmed** | Standard robustness gap; compounded here by Supabase Storage URLs that can 404 after deletion/regen. |
| 5 | Filters not persisted in URL | **Confirmed, well-documented** | Research explicitly flags this: "JavaScript changes the product list without creating persistent URLs" as a top catalog mistake, breaks shareable/filtered links — exactly the WhatsApp/Instagram sharing use case here. |
| 6 | Unrestricted image upload size | **Confirmed** | Compounds into a second, less obvious pitfall: EXIF orientation (see below) — size limit alone doesn't fix visual/perf problems. |
| 7 | Unvalidated/unformatted WhatsApp number | **Confirmed, and understated** | Real-world formatting bugs are more specific than "validate it" — see expanded pitfall on exact `wa.me` number rules below. |
| 8 | No pagination on storefront | **Confirmed** | Matches catalog performance research; also has a mobile-specific angle (unbounded image-heavy grids are much worse on cellular). |
| 9 | Admin actions without toast feedback | **Confirmed** | Standard SaaS admin UX gap, amplified here because primary user is non-technical and will assume "esgotado" click did nothing. |
| 10 | Silent session expiry losing work | **Confirmed** | Common Supabase Auth pitfall — JWT expiry is silent by default unless the client listens for `onAuthStateChange`/refresh failures. |

The author's list is accurate and should be treated as the floor, not the ceiling. Below are the specific mechanisms behind each (so prevention is precise, not just "be careful") plus several additional pitfalls not on the original list.

## Critical Pitfalls

### Pitfall 1: `wa.me` phone number formatting is stricter and more specific than "validate it"

**What goes wrong:**
The revendedor enters their WhatsApp number in the admin panel in whatever format they naturally type it — `(11) 99999-9999`, `11999999999`, `+55 11 99999-9999`, or with a stray leading `0`. If that raw string is concatenated into `https://wa.me/{number}`, the link either opens the wrong chat, opens WhatsApp's contact-not-found screen, or fails to auto-target a specific contact and instead opens WhatsApp with no recipient (silently breaking the entire conversion flow).

**Why it happens:**
`wa.me` has no official validation feedback — a malformed number doesn't error visibly, it just produces a broken or generic chat link. Developers assume "any digits work" because during testing on their own number it happens to work.

**How to avoid:**
- Store the number in a canonical normalized form in the database (E.164-like, digits only, always with country code): `5511999999999`.
- On input, strip everything except digits, then apply Brazil-specific normalization: if the number doesn't start with `55`, prepend it; strip a leading `0` from the DDD if present (common when users copy a local dialing format); validate length (DDD 2 digits + 8 or 9-digit number + `55` = 12 or 13 digits total).
- Never store or use `+`, spaces, dashes or parentheses in the value used to build the `wa.me` URL — these are known to break the link even though they look "correct" to a human.
- Show the revendedor a live preview/confirmation of the formatted number ("Vamos usar +55 11 99999-9999 — confirma?") since this is the single point of failure for every order in the product.

**Warning signs:**
- No dedicated phone-formatting utility/tests in the codebase — number is passed straight from a form input to the URL template.
- No unit tests covering: number with parentheses/dashes, number with leading 0, number without country code, number with extra spaces copy-pasted from WhatsApp itself.

**Phase to address:**
Phase covering WhatsApp/store configuration (revendedor settings) — must ship with a normalization function and tests before the storefront's "Pedir agora" button phase begins, since that button depends on this value being correct.

---

### Pitfall 2: `encodeURIComponent` alone doesn't guarantee a working message — template structure matters too

**What goes wrong:**
Portuguese text with accents (ç, ã, é) encodes fine via `encodeURIComponent`, but two related failures are common: (1) building the query string by naive concatenation (`text=` + raw string) instead of using `encodeURIComponent` on the *whole* message including newlines, which breaks multi-line templates; (2) double-encoding (encoding a string that was already encoded upstream, e.g. if Next.js `useSearchParams` or a server round-trip has already URL-decoded/re-encoded it), producing garbled `%2520`-style output that shows as literal percent codes in the WhatsApp message box.

**Why it happens:**
Message construction typically flows: template string with `{modelo}`/`{tamanho}`/`{preço}` placeholders → variable substitution → `encodeURIComponent` → appended to `https://wa.me/{number}?text=`. If substitution happens *after* encoding, or if the price is formatted with a currency symbol/non-breaking space that isn't accounted for, the output is either broken or displays oddly (e.g. `R\$` literal backslash if template escaping isn't handled, or `Pre%C3%A7o` correctly encoded but visually confusing during debugging).

**How to avoid:**
- Build the full plain-text message first (with real newlines, accents, "R$" price) as a single JS string, then call `encodeURIComponent` exactly once on the final assembled string.
- Never encode individual fields separately and concatenate the results — encode after interpolation, not before.
- Test with a manual checklist string containing every accented character used in Portuguese product/sole vocabulary (ã, ç, é, í, ó, ú, õ, â) plus the literal `R$` currency prefix and a real line break, opening the resulting link on an actual device before shipping.
- Watch for messages that also contain `&`, `#`, or `?` in a future free-text field (e.g. custom notes) — these must go through the same single-pass encoding or they'll truncate the query string.

**Warning signs:**
- Message building logic scattered across multiple functions/components instead of one single "build WhatsApp message" utility.
- No test fixture with real Portuguese accented product names (e.g., "Chuteira Society Preço Único").

**Phase to address:**
Storefront conversion flow phase (the "Pedir agora" button + WhatsApp deep link phase) — this is the single most important phase per PROJECT.md; must include automated + manual device testing before phase sign-off.

---

### Pitfall 3: Sold-out pills need more than `pointer-events: none` to be truly unselectable

**What goes wrong:**
A sold-out size pill is styled as disabled and given `pointer-events: none`, but on touch devices this doesn't always prevent focus-based selection (keyboard/accessibility tools, or a fast double-tap race before the disabled style/JS state settles), and — more commonly — the *state* backing "is this size sold out" can be stale: if stock changes on the backend while a customer has the page open, the client-rendered pill may still show as available even though `pointer-events` was correctly applied at initial render.

**Why it happens:**
Developers treat "disabled" as purely a CSS/visual concern, forgetting it's also a data-freshness concern. PROJECT.md itself flags "estado de estoque deve refletir o painel com delay máximo de segundos, nunca minutos" — this pitfall is the concrete failure mode behind that requirement.

**How to avoid:**
- Disable at the data layer (component doesn't render the pill as selectable in application state, not just in CSS) — the "selected size" state must reject sold-out sizes even if a stale click event fires.
- Re-validate size availability at click-time (not just render-time) before opening the WhatsApp link — a cheap client-side check against the last-fetched product data, or a fresh fetch if the product page has been open a while.
- Combine `pointer-events: none`, `aria-disabled="true"`, `tabindex="-1"`, and a strikethrough/visual treatment — belt and suspenders, since mobile browsers vary in how consistently they respect `pointer-events` on touch vs. click-simulated events.

**Warning signs:**
- Size availability computed once on page load and never re-checked before the CTA fires.
- No test for "click sold-out pill rapidly" or "click sold-out pill via keyboard Enter after Tab".

**Phase to address:**
Storefront + order flow phase — same phase as Pitfall 1/2 (the conversion flow), since it's part of the same "never send an incomplete/wrong order" guarantee.

---

### Pitfall 4: Slug uniqueness needs a database constraint, not just a pre-save check

**What goes wrong:**
"Validação em tempo real" (real-time validation) in the admin UI checks if a slug is taken via a debounced query, then the user submits. Between the check and the actual insert, another revendedor (or a duplicate tab/retry from the same user) can grab the same slug — a classic TOCTOU (time-of-check-to-time-of-use) race. Without a unique constraint at the database level, this produces two stores sharing one public URL, which is silent data corruption (one store overwrites/shadows the other depending on query order) rather than a visible error.

**Why it happens:**
Client-side/API-level "is this slug free?" checks feel sufficient during manual testing (only one person testing at a time), so the missing DB constraint isn't caught until real concurrent usage.

**How to avoid:**
- Add a `UNIQUE` constraint on the slug column in Postgres/Supabase from the first migration — this is a five-minute fix that eliminates the entire failure class.
- Keep the real-time client-side check for UX (instant feedback), but treat the DB constraint as the actual source of truth; catch the unique-violation error on insert and surface a friendly "esse link já está em uso" message.
- Auto-generate a slug suggestion from store name + random suffix as a fallback when the requested slug collides, rather than blocking the user.

**Warning signs:**
- Migration/schema file has no `UNIQUE` index on the slug column.
- Slug check endpoint queries then a separate insert happens with no transaction or constraint tying them together.

**Phase to address:**
Store setup / onboarding phase (where slug is first created) — must be in the initial schema migration, not retrofitted later once real stores exist (retrofitting a unique constraint onto a table with existing duplicates requires manual data cleanup).

---

### Pitfall 5: Supabase RLS misconfiguration — silent, not loud

**What goes wrong:**
Two opposite and equally dangerous failure modes, both common in Supabase multi-tenant apps: (a) forgetting to enable RLS on a table at all leaves every revendedor's products/orders/settings publicly readable and writable through the Supabase REST/JS client, with no error to alert you; (b) enabling RLS but writing an incomplete policy (or none) makes queries silently return empty results — the app "looks broken" (empty product lists, saves that appear to succeed but write nothing) with no thrown error, which is often misdiagnosed as a frontend bug and wastes debugging time, or worse, gets "fixed" by loosening the policy too far.

**Why it happens:**
Supabase tables default to RLS-disabled on creation. Multi-tenant boundary here is "products/settings belong to revendedor X" — if the isolation policy is missing or wrong, tenant A can potentially read/write tenant B's catalog data through direct API calls, even though the UI never exposes it. This is invisible in solo developer testing because the dev's own test account has implicit access to everything in the dev database.

**How to avoid:**
- Enable RLS on every table the moment it's created — make this part of the migration template/checklist, not an afterthought.
- Write policies keyed on `auth.uid()` matching a `revendedor_id`/`owner_id` column, and add an index on that column (missing indexes on RLS-referenced columns are called out as the top RLS performance killer at even modest scale).
- For the public storefront (`/loja/[slug]`), the *read* path for products/store-settings needs an explicit public-read policy (since there's no authenticated user on that route) — this is a distinct policy from the admin's authenticated read/write policy on the same table. Don't accidentally lock out the public route while securing the admin route, and don't accidentally leave admin-only fields (e.g., cost price, if ever added) exposed through that same public-read policy.
- Test isolation with two real seeded accounts (not one dev superuser) before shipping — create Store A and Store B, verify Store A's authenticated session cannot fetch/mutate Store B's rows via direct API calls, not just via the UI.
- Do not use `raw_user_meta_data`/JWT custom claims as an authorization source — they're user-editable; always check against a server-side table.

**Warning signs:**
- Any Supabase table without RLS enabled in the schema.
- Product list appearing empty for an authenticated revendedor with no console error (classic "RLS enabled, no policy" symptom).
- Only one seeded test account used throughout development.

**Phase to address:**
Data layer / auth foundation phase (early, before any CRUD phase ships) — this is foundational and must be verified before the storefront public-route phase, since the public route's RLS policy is architecturally different from the admin's.

---

### Pitfall 6: Public storefront route accidentally gated by auth middleware

**What goes wrong:**
PROJECT.md explicitly flags this risk: "nenhum middleware de autenticação pode interceptar essa rota." The concrete failure mode: a Next.js middleware matcher written broadly (e.g., matching all routes except a hand-maintained allowlist) silently starts requiring auth on `/loja/[slug]` after an unrelated change elsewhere adds a new protected route, because the exclusion list wasn't updated. A second variant: Supabase-auth-in-middleware throws/redirects on *any* auth check failure (including "no session, but that's fine because this route doesn't need one"), redirecting anonymous storefront visitors to a login page.

**Why it happens:**
Middleware matcher configs are easy to get subtly wrong, and the failure is invisible until someone tests the public link in an incognito/logged-out session — which non-technical revendedores testing their own store (already logged into the admin panel) will never naturally do.

**How to avoid:**
- Design the middleware matcher as an allowlist of protected routes (e.g., `/dashboard/*`, `/admin/*`) rather than a denylist of public exceptions — safer default is "public unless explicitly protected."
- Treat auth-check errors in middleware as "not authenticated" (allow through to public routes, block only genuinely protected ones) rather than as hard failures that redirect everything.
- Add an automated smoke test (even a simple curl/fetch in CI) that hits `/loja/test-slug` with zero cookies and asserts a 200, not a redirect — run this on every deploy given how easy it is to regress.
- Be aware Next.js middleware-only authorization has had real bypass vulnerabilities (CVE-2025-29927, header-based bypass) — the lesson generalizes: never rely on middleware as the *only* authorization layer for genuinely protected routes either; re-check server-side.

**Warning signs:**
- Middleware `matcher` config uses a broad pattern with manually maintained exceptions.
- No test that loads the public storefront route with no auth cookies present.

**Phase to address:**
Foundation/routing phase (whichever phase sets up the auth middleware) — flag explicitly in that phase's acceptance criteria: "public storefront route verified accessible with zero session state."

---

### Pitfall 7: Image upload — size limit alone doesn't solve the real-world upload problem

**What goes wrong:**
The author's pitfall #6 (unrestricted upload size) is necessary but not sufficient. Two related, less obvious problems: (a) modern phone cameras produce 3-10MB photos even under a "5MB limit" is borderline — many phones exceed it on a single shot, so the limit alone causes upload failures for the exact non-technical users this product targets, without compression the limit just shifts the pain to "upload rejected, try again with a smaller photo" which a non-technical revendedor won't know how to do; (b) EXIF orientation — photos from phones held in different orientations embed a rotation flag that most browsers (all except Safari/iOS) ignore when rendering via `<img>`, so a rotated product photo displays sideways or upside-down in admin preview and/or the public storefront depending on which browser renders it, inconsistently between devices.

**Why it happens:**
Developers test uploads from their own desktop with pre-sized images, missing the mobile-camera-source case that's the actual primary use case here (revendedor photographing chuteiras with a phone).

**How to avoid:**
- Compress client-side before upload (canvas-based resize to a max dimension like 1600px + JPEG quality ~80) so the 5MB limit is rarely hit and uploads are fast on mobile data — communicate the limit *before* the user picks a file, not after a failed upload.
- Additionally compress/normalize server-side (or via Supabase's built-in image transformation/imgproxy) as a second safety net independent of client behavior — do not rely solely on client-side compression, since it can be skipped (e.g., API called directly) or fail silently on some browsers.
- Strip/normalize EXIF orientation server-side so the stored image is always upright regardless of source device — never rely on `<img>` rendering to respect EXIF, since it's inconsistently honored across browsers (iOS Safari does, most others historically don't).
- Validate file type server-side (magic-byte/content-type check), not just by file extension — a `.jpg` extension doesn't guarantee JPEG content.

**Warning signs:**
- Upload flow tested only with pre-sized images from a desktop file picker, never a live phone camera capture.
- No image processing step between upload and storage — raw bytes stored as-is.
- Product photos appearing correctly in admin preview (desktop) but sideways on the public storefront (mobile), or vice versa.

**Phase to address:**
Product CRUD / image upload phase — must include compression + EXIF normalization in the upload pipeline design, not bolt it on after a bug report.

---

### Pitfall 8: In-app browsers (Instagram, Facebook) and WKWebView-based wrappers can break the `wa.me` hand-off

**What goes wrong:**
The realistic sharing path for a storefront link is: revendedor posts the link on Instagram bio/story, or shares it in a WhatsApp status; end customer taps it and lands on the storefront *inside Instagram's in-app browser* (not real Safari/Chrome). From inside these embedded webviews, `wa.me` links can fail to hand off to the native WhatsApp app — sometimes opening a generic App Store page, sometimes doing nothing, sometimes working fine depending on OS/app version. This is one of the highest-risk, least-controllable links in the whole conversion chain, precisely because Instagram is a very likely traffic source for this product's customers.

**Why it happens:**
In-app browsers are restricted WebViews that don't always implement the same universal-link/URL-scheme handoff behavior as the system browser; this is an OS/app-vendor behavior outside the product's control, and it changes across iOS/Android/app versions without notice (confidence: LOW/anecdotal — no official spec covers this, behavior reports are inconsistent across sources and versions).

**How to avoid:**
- Add a persistent "abrir no navegador" (open in browser) affordance or detect known in-app-browser user agents and show a one-tap "open in Safari/Chrome" prompt before the customer reaches the size-selection step, since the failure is much more likely when triggered from inside a webview.
- Use the plain `https://wa.me/...` universal link format (not the deprecated `whatsapp://send?...` custom scheme, which has even worse compatibility) as the primary link — it degrades more gracefully (falls back to web.whatsapp.com or an app store prompt on desktop) than scheme-based deep links.
- Treat this as a known, testable limitation to document for the revendedor rather than a solvable engineering problem: test the actual flow from an Instagram bio link tap on both a real Android and real iOS device before launch, and set expectations that this is the one link in the flow with cross-platform inconsistency outside the product's control.

**Warning signs:**
- The only testing done is opening the storefront link directly in Safari/Chrome, never via a share sheet from Instagram/WhatsApp status.
- No fallback UI for "WhatsApp didn't open" (e.g., a manual copy of the number + message as backup).

**Phase to address:**
Storefront conversion flow phase — add explicit device/context test matrix (Chrome, Safari, Samsung Internet, Instagram in-app browser, WhatsApp status in-app browser) × (Android, iOS) as an acceptance criterion, not just browser testing.

---

### Pitfall 9: Silent Supabase Auth token expiry loses unsaved admin work

**What goes wrong:**
Supabase Auth JWTs expire (default ~1 hour access token). If the admin app doesn't proactively listen for `onAuthStateChange`/`TOKEN_REFRESHED`/`SIGNED_OUT` events and handle refresh failures gracefully, a revendedor mid-edit (e.g., filling in a new product's description and prices) can have their session silently expire; the save request then fails (401) with no clear message, and depending on how errors are handled, the form data can be lost on the subsequent forced redirect to login.

**Why it happens:**
Session refresh is usually "invisible" and works fine in short testing sessions; the failure only shows up when a real user leaves a tab open and comes back later (very plausible for a revendedor filling out a large product catalog over an extended session), which developers rarely replicate in testing.

**How to avoid:**
- Persist form state to local storage/draft on every meaningful change (or before any network call) so a forced re-login never destroys in-progress work — the "esgotado com delay máximo de segundos" and other real-time expectations already imply the app should be resilient to interruptions.
- Handle 401s from Supabase explicitly: attempt a silent token refresh first; if that fails, show a clear "sua sessão expirou, faça login novamente" message *before* discarding any in-memory form state, and restore the draft after re-login rather than dropping it.
- Extend/refresh the session proactively on user activity rather than relying purely on passive expiry handling.

**Warning signs:**
- No `onAuthStateChange` listener wired up in the admin app.
- Forms with no autosave/draft persistence, and a generic redirect-to-login on any 401.

**Phase to address:**
Admin dashboard/CRUD phase (any phase with forms) — establish a shared "protected form" pattern (draft-persist + graceful session handling) early so every subsequent CRUD phase inherits it rather than re-solving it per feature.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Slug uniqueness checked only client-side, no DB constraint | Ships faster | Silent duplicate-store data corruption once two revendedores sign up concurrently | Never — add the constraint in the first migration, costs nothing |
| Client-side-only image compression (no server-side pass) | Faster to build | Bypassed by direct API calls or browsers where canvas compression silently fails; storage bloat | Only acceptable temporarily in earliest MVP with a hard follow-up phase already scheduled |
| Using `whatsapp://send?...` custom scheme instead of `https://wa.me/` | Feels more "native" | Worse cross-browser/cross-app compatibility, no graceful desktop fallback | Never for the primary CTA |
| Loosening an RLS policy to "authenticated users can read all rows" to unblock a bug | Immediate unblock | Full cross-tenant data leak | Never, even temporarily — fix the actual policy instead |
| Skipping EXIF normalization at launch ("looks fine in my testing") | Saves a dependency/processing step | Random sideways product photos reported by real users on random devices, hard to reproduce/debug later | Acceptable only if paired with client-side canvas re-encode (which incidentally strips EXIF as a side effect) — verify this is actually happening, don't assume |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-------------------|
| `wa.me` deep links | Building the URL with raw phone number and un-normalized message, or double-encoding an already-encoded string | Normalize phone to digits-only E.164-like format server-side; build the full message string once, then `encodeURIComponent` exactly once |
| Supabase Storage | Storing images with public URLs but no path scoping by `revendedor_id`, breaking storage RLS policies that key off path segments | Structure storage paths as `{revendedor_id}/{product_id}/{filename}` and write storage policies that check the first path segment against `auth.uid()` |
| Supabase Auth (client) | No listener for token refresh failure/expiry, causing silent 401s | Wire `onAuthStateChange`, handle `SIGNED_OUT`/refresh failure with a graceful re-login flow that preserves in-progress form state |
| Next.js middleware + Supabase | Treating any auth-check error as "redirect to login," including on public routes | Explicitly branch: protected route + no session → redirect; public route + any auth state → always allow through |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Storefront renders all products in one query/page | Slow initial load on mobile data, large image payload | Paginate/infinite-scroll ~20 products per load (per PROJECT.md), lazy-load images below the fold | Noticeable even at 40-50 products; painful for stores with 100+ SKUs (common for a full imported-cleats catalog) |
| No image compression/resizing pipeline | Multi-MB photos served directly to mobile clients on cellular data | Client + server compression, responsive image sizes via Supabase transformation/imgproxy | Breaks UX immediately for any store with more than a handful of products, worse on 4G/limited data plans typical of the target user's customers |
| Missing indexes on RLS-referenced columns (e.g., `revendedor_id`) | Query latency climbs as row counts grow across all tenants combined | Add indexes on every column referenced inside an RLS policy from the first migration | Becomes noticeable once total row count across all tenants reaches the low thousands, not per-tenant thousands |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| RLS disabled or policy-less table | Full cross-tenant data read/write via direct Supabase API calls, bypassing the UI entirely | Enable RLS on every table at creation; test with two real seeded tenant accounts, not one dev superuser |
| Using JWT `raw_user_meta_data`/custom claims for authorization decisions | User can edit their own metadata client-side in some configurations, escalating privilege | Authorize against a server-side table (e.g., `revendedores` row ownership), never trust client-editable JWT fields |
| Public storefront route exposing admin-only product fields (e.g., future cost price/margin fields) through the same public-read RLS policy used for customer-facing fields | Sensitive business data (cost, margin) leaked to any visitor via API inspection, even if hidden in the UI | Use column-level exposure discipline or separate public vs. admin views/RPCs rather than one blanket "public can read products" policy once sensitive fields are added |
| Trusting file extension for uploaded images | Malicious file uploaded with `.jpg` extension but different content | Validate content-type/magic bytes server-side before accepting/storing an upload |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|------------------|
| Sold-out size visually distinct but still technically selectable via race/stale state | Customer sends an order for a size that doesn't exist, revendedor has to awkwardly decline, damaging trust in the tool | Disable at the data/state layer, re-validate at click-time, not just CSS |
| No feedback after "Pedir agora" is clicked and WhatsApp is opening (e.g., no loading/transition state) | Customer double-clicks, potentially opening two chats or feeling like nothing happened, especially on slower networks/in-app browsers | Immediate micro-feedback (button state change) plus fallback message if the deep link doesn't resolve within a beat |
| Admin CRUD actions (save/delete/mark sold-out) with no toast/confirmation | Non-technical revendedor assumes the action failed and repeats it, causing duplicate writes or confusion | Toast/confirmation on every mutating action, plus optimistic UI updates for perceived speed |
| Filters reset on navigation/share | Customer curates a filtered view (e.g., "Nike, solado society") and shares that link, recipient lands on the unfiltered full catalog | Persist filters in URL query params so shared/filtered links are shareable and bookmarkable |

## "Looks Done But Isn't" Checklist

- [ ] **WhatsApp order flow:** Tested only on the developer's own phone number/browser — verify on real Android + iOS, Chrome + Safari + Samsung Internet, and via an Instagram in-app browser tap, not just direct browser navigation.
- [ ] **Phone number formatting:** Accepts "any digits" — verify against parentheses, dashes, leading zero, missing country code, and copy-pasted numbers with non-breaking spaces.
- [ ] **Multi-tenant isolation:** Verified only with one dev account — verify with two real seeded revendedor accounts confirming Store A cannot read/write Store B's data via direct API calls.
- [ ] **Image upload:** Tested only with pre-sized desktop images — verify with an actual phone camera photo (large file, EXIF rotation, portrait orientation) uploaded from a real mobile browser.
- [ ] **Public storefront route:** Tested only while logged into the admin — verify in an incognito/logged-out session that `/loja/[slug]` loads with zero auth cookies present.
- [ ] **Filter/URL state:** Filters "work" during the session — verify that a filtered URL, freshly loaded with no prior client state (e.g., pasted into a new tab), reproduces the same filtered view.
- [ ] **Session expiry handling:** "Login works" — verify what happens to an in-progress product form after leaving the tab idle past token expiry and returning to save.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|-----------------|
| Duplicate slug already live in production | MEDIUM | Add unique constraint (will fail if dupes exist), manually resolve existing duplicate (rename one), then deploy constraint + friendly collision UI |
| Cross-tenant RLS data leak discovered post-launch | HIGH | Immediately lock down/disable the offending policy, audit logs for any actual cross-tenant access during the exposure window, notify affected revendedores per data protection obligations, then redeploy corrected + tested policies |
| Sideways/rotated product photos already stored | LOW-MEDIUM | Backfill script: re-process existing stored images through the EXIF-normalize + compress pipeline, re-upload corrected versions |
| Broken WhatsApp links reported by early users (bad phone format) | LOW | Run a one-off normalization script across existing stored phone numbers, add validation going forward, notify affected revendedores to re-confirm their number |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| wa.me phone number formatting | Store/WhatsApp configuration phase | Unit tests covering all malformed-input cases; manual link test on a real device before phase sign-off |
| Message encoding (accents, double-encoding) | Storefront order flow phase | Manual device test with full Portuguese accent set + real line breaks in the template |
| Sold-out pill still selectable | Storefront order flow phase | Automated test: rapid click + keyboard Enter on a disabled pill never triggers the CTA |
| Duplicate slugs | Store setup/onboarding phase (initial schema) | DB-level unique constraint present in migration; concurrent-insert test |
| Broken image fallback | Product CRUD / storefront rendering phase | Visual test with an intentionally broken image URL |
| Filters not in URL | Storefront filtering phase | Load a filtered URL fresh (new tab, no prior state) and confirm the filter is applied |
| Unrestricted/uncompressed image upload | Product CRUD / image upload phase | Upload test with a real large phone-camera photo; verify final stored size and upright orientation |
| Supabase RLS gaps | Data layer / auth foundation phase (before any CRUD phase) | Two-tenant isolation test: Store A cannot access Store B's data via direct API |
| Public route gated by middleware | Foundation/routing phase | Automated smoke test hitting the public storefront route with zero auth cookies |
| Silent session expiry | Admin dashboard/CRUD phase (shared form pattern) | Manual test: idle past token expiry, then attempt a save, confirm draft is preserved |
| In-app browser wa.me handoff failures | Storefront order flow phase | Manual test matrix: Instagram in-app browser + WhatsApp status in-app browser, both platforms |
| Admin actions without feedback | Admin dashboard/CRUD phase | UX review checklist: every mutating action has a toast/confirmation |

## Sources

- [How to Generate a WhatsApp Deep Link with a Pre-Populated Message — Meta for Developers Community](https://developers.facebook.com/community/threads/957849225969148/)
- [WhatsApp Link: How to Create, Share & Use One — Spur](https://www.spurnow.com/en/blogs/whatsapp-link)
- [International number formats that do and don't work in WhatsApp Click to Chat — Technically Product](https://www.technicallyproduct.co.uk/messaging/international-number-formats-that-do-and-dont-work-in-whatsapp-click-to-chat/)
- [About international phone number format — WhatsApp Help Center](https://faq.whatsapp.com/1294841057948784)
- [How To Normalize International Phone Numbers For WhatsApp — Wassenger](https://wassenger.com/blog/en/how-to-normalize-international-phone-numbers-for-whatsapp)
- [How to correctly enter international numbers for WhatsApp — GREEN-API](https://green-api.com/en/blog/how-to-correctly-enter-international-numbers-for-whatsapp/)
- [Supabase RLS Guide 2026 — designrevision.com](https://designrevision.com/blog/supabase-row-level-security)
- [Enforcing Row Level Security in Supabase: Multi-Tenant Architecture — DEV Community](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)
- [Supabase RLS Best Practices: Production Patterns for Secure Multi-Tenant Apps — makerkit.dev](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Row-Level Security in Supabase: Multi-Tenant SaaS from Day One — DEV Community](https://dev.to/issuecapture/row-level-security-in-supabase-multi-tenant-saas-from-day-one-4lon)
- [Client-side image compression with Supabase Storage — mikeesto.com](https://mikeesto.com/posts/supabaseimagecompression/)
- [Storage Image Transformations — Supabase Docs](https://supabase.com/docs/guides/storage/serving/image-transformations)
- [Supabase Storage in Practice: File Uploads, Access Control, CDN — BetterLink Blog](https://eastondev.com/blog/en/posts/dev/20260409-supabase-storage-en/)
- [Support Android Intents for deep-linking URLs in Samsung Internet — GitHub Issue #74](https://github.com/SamsungInternet/support/issues/74)
- [Deeplinks not working in Samsung Internet — Samsung Developer Forums](https://forum.developer.samsung.com/t/deeplinks-not-working-in-samsung-internet/24292)
- [Deep Links Crash Course Part 3: Troubleshooting — Android Developers Medium](https://medium.com/androiddevelopers/deep-links-crash-course-part-3-troubleshooting-your-deep-links-61329fecb93)
- [Product List UX Best Practices 2025 — Baymard Institute](https://baymard.com/blog/current-state-product-list-and-filtering)
- [Ecommerce Filter UX Design Patterns That Convert — BTNG.studio](https://www.btng.studio/articles/top-ecommerce-ux-filter-design-patterns-practical-tips-for-2025/)
- [How to not "sell out" in UX design — UX School Medium](https://medium.com/ux-school/how-to-not-sell-out-in-ux-design-b256bdd525)
- [eCommerce Product Catalog: Common Mistakes + How To Fix Them — ConvertCart](https://www.convertcart.com/blog/ecommerce-product-catalog-management-mistakes)
- [Understanding Next.js's middleware vulnerability — LogRocket Blog](https://blog.logrocket.com/understanding-next-js-middleware-vulnerability/)
- [CVE-2025-29927: Next.js Middleware Authorization Bypass — ProjectDiscovery Blog](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass)
- [Fix Supabase Auth Errors in Middleware — iloveblogs.blog](https://www.iloveblogs.blog/post/handle-supabase-auth-errors-middleware)
- [image orientation on the web — justmarkup](https://justmarkup.com/articles/2019-10-21-image-orientation/)
- [Handle image rotation on mobile — Wassa Medium](https://medium.com/wassa/handle-image-rotation-on-mobile-266b7bd5a1e6)
- [Eliminating Mobile Upload Bugs: EXIF Rotations & Transparency in Pillow — aldianfazrihady.com](https://www.aldianfazrihady.com/en/blog/bec707c5-a0df-4b20-94cf-dc71f980338a/mobile-upload-bugs-exif-rotations-transparency-pillow/)

---
*Pitfalls research for: Vitrino — catalog/storefront + WhatsApp deep-link micro-SaaS*
*Researched: 2026-07-10*
