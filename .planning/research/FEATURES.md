# Feature Research

**Domain:** Catalog/storefront + "click-to-order via WhatsApp" tools (Brazilian micro-SaaS, imported soccer cleats/sneaker resale niche)
**Researched:** 2026-07-10
**Confidence:** MEDIUM-HIGH (BR competitor feature sets confirmed from multiple public sources; niche-specific reseller behavior corroborated but not from primary user interviews)

## Feature Landscape

This niche has three overlapping reference categories, all converging on the same core loop (browse → pick variant → tap → WhatsApp message pre-filled → seller closes deal in chat):

1. **BR "catálogo digital para WhatsApp" tools** — Gopage, Vendizap, Vou Pedir, Linqui. Direct competitors, same customer profile (non-technical BR reseller), same "sem carrinho, sem gateway" mental model at the entry tier.
2. **Global "social commerce via chat" tools** — Catlog (Nigeria/Africa), WhatsApp's own native Business Catalog. Same core mechanic, more mature monetization/payment layers once they scale past MVP.
3. **Link-in-bio tools** — Linktree, Beacons, Stan Store. Not catalog-first, but they are the reference for slug/QR/analytics table stakes since Vitrino's public storefront link behaves like a bio link for Instagram-first sellers.

Nearly every competitor above started exactly where Vitrino's MVP spec is aimed: catalog + WhatsApp button, no payment, no cart. Payment, stock automation, multi-seller, and AI descriptions were all added later, after traction — which validates the project's own MVP/nice-to-have split rather than contradicting it.

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or reseller churns back to raw WhatsApp/Instagram photos.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Product CRUD with photos, price, variant (size) | Every competitor (Gopage, Vendizap, Catlog, native WA Catalog) leads with this; it's the reason the product exists | MEDIUM | Already in spec. Photos are the #1 driver of perceived professionalism vs raw WhatsApp photo dumps |
| Size/variant selection before contact action | Confirmed across Vendizap ("variações disponíveis") and general shoe-resale UX; sizes drive availability, not just SKU | MEDIUM | Spec already treats this as the core conversion — correctly prioritized as P0 |
| One-tap "order now" that opens WhatsApp pre-filled | This is the entire category's value prop across every BR competitor found (Gopage, Vou Pedir, Vendizap all lead with "pedido chega no WhatsApp") | MEDIUM | encodeURIComponent + wa.me deep link correctness is the single highest-risk technical detail across the whole category — every competitor's marketing copy centers on this working flawlessly |
| Out-of-stock indication per variant | Vendizap explicitly calls out stock control ("evita vender algo que não está mais disponível") as core, not optional | LOW-MEDIUM | Confirms spec's "bulk mark sold-out" instinct is right-shaped, just should exist per-variant not only per-product |
| Shareable link + basic branding (logo, name, accent color) | Every competitor customizes store name/logo; this is the "professional storefront" promise vs raw social media | LOW | Spec covers this (loja config) |
| Mobile-first responsive storefront | All BR competitors' target customer discovers the link via Instagram bio / WhatsApp status on phone; desktop is secondary | MEDIUM | Already flagged in PROJECT.md as non-negotiable |
| Filters (brand, category, or equivalent) once catalog >20-30 items | Confirmed indirectly: competitors emphasize "catálogo organizado" and search/highlight features (Catlog's "Best Sellers" tags) once catalogs grow past a screen or two | LOW-MEDIUM | Spec's brand/sole/modalidade filters map directly to this |
| Custom slug / shareable short link | Direct parallel to link-in-bio category (Linktree/Beacons) — a memorable, brandable link is what gets pasted into an Instagram bio | LOW | Spec covers this |
| QR code for the storefront link | Confirmed as standard even in the cheaper/adjacent link-in-bio tier (Beacons offers this free); resellers use QR in physical contexts (feiras, embalagens) even though this is a digital-first niche — low cost to include, expected once present | LOW | Spec covers this — correctly scoped as MVP not nice-to-have, since it's near-zero cost to generate from an existing slug |
| Basic visit/click metrics | Confirmed as baseline in link-in-bio and catalog tools alike (Beacons "basic analytics", Vendizap-adjacent tools) — sellers want to know "is anyone looking at this" | LOW | Spec's "basic metrics" (accesses, most-viewed, WA clicks) matches category norm precisely — do not go deeper than this for MVP |
| Simple signup/login (no OAuth needed) | Confirmed via Gopage/Vendizap onboarding flows — no evidence any BR competitor gates entry behind OAuth; email/password or magic link is the norm for this non-technical audience | LOW | Spec's choice validated |

### Differentiators (Competitive Advantage)

Features that set the product apart within *this specific niche* (imported cleats resale) rather than the generic catalog-tool category. Not required for MVP viability, but where Vitrino can win once validated.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Niche-specific taxonomy (sole type / modalidade / brand as first-class fields, not generic "category") | Generic catalog tools (Gopage, Vendizap) use freeform categories; a sneaker/cleat-specific schema (solado society/campo/futsal, marca, modalidade) is a real wedge for this exact buyer, who currently improvises this info in photo captions | LOW (already schema decision, not new build) | Spec already bakes this into the CRUD — this *is* the differentiator, just not labeled as one. Worth stating explicitly in requirements so it isn't genericized away later |
| Portuguese-first, BRL-native, WhatsApp-BR-number-format UX | Generic international WhatsApp-commerce tools (Catlog, native WA Catalog) are not BR-localized in currency/number formatting/copy tone; existing BR players (Gopage/Vendizap) are the real comparison set, and they're generalist (any product category), not cleats-specific | LOW | This is a positioning differentiator more than a feature; still worth listing since it drives UI/copy decisions (already reflected in PROJECT.md copy) |
| Yupoo/source-photo import assist | Confirmed real pain: Yupoo is literally a Chinese photo-gallery site suppliers use as their wholesale catalog (not a sales channel) — BR resellers today manually screenshot/download photos from Yupoo galleries in Mandarin UI and re-upload to Instagram/WhatsApp one by one. A "paste Yupoo album link → pull photos" import would directly remove the single most repetitive task in this specific workflow | MEDIUM-HIGH | Correctly deferred (spec lists as nice-to-have) — no evidence any competitor does this; it's genuinely bespoke to this niche and worth prioritizing right after MVP validation, since it addresses the literal painpoint named in "What This Is" |
| Duplicate product (create variant/colorway fast) | Not seen as an explicit named feature in competitor marketing, but implied by how sneaker/cleat catalogs work — same model in multiple colorways/soles is the norm, and re-entering all fields per colorway is friction unique to catalogs with many near-identical SKUs (more true here than in generic-goods catalogs) | LOW | Spec correctly places this as should-have; unlike generic catalog tools, this niche has unusually high SKU-variant density (same shoe, N soles x N colors), so it pays off sooner than a generic reseller would need it |
| Multiple catalogs (pronta entrega vs sob encomenda) | Confirmed as a paid-tier differentiator elsewhere (Gopage's Premium/Profissional tiers sell exactly this — multiple independent catalogs) — validates it as real, monetizable value, not a made-up idea | MEDIUM | Correctly deferred to post-MVP; this is literally how an established competitor (Gopage) tiers its paid plans, which validates it as a legitimate Pro-tier candidate later |
| CSV bulk import | Real competitor precedent (bulk/atacado catalog tools target distributors who already have spreadsheets) but Vitrino's target user is an individual reseller managing dozens of SKUs by hand, not hundreds via ERP export — value is real but arrives later, once sellers have enough SKU volume to feel CRUD pain | MEDIUM | Correctly deferred; not table stakes for this specific (individually-run, phone-first) customer segment even though it is table stakes for the wholesale/atacado segment of adjacent tools |

### Anti-Features (Commonly Requested, Often Problematic)

Features that competitors eventually add (once scaled) or that non-technical sellers may ask for, but that would be actively harmful to build during MVP validation for this specific product.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Payment gateway / checkout / cart | Every "grown-up" competitor (Catlog, Vendizap higher tiers, native WA "Cart" for larger businesses) eventually adds this, so sellers may ask "where's the pay button" | For this MVP, the entire value prop is *closing the deal on WhatsApp exactly like the seller already does* — adding checkout before validating demand adds massive scope (PCI-adjacent concerns, refunds, reconciliation) for a segment (imported/possibly gray-market goods, cash/pix-in-chat culture) that overwhelmingly prefers negotiating price/shipping in chat anyway | Keep WhatsApp as 100% of checkout; revisit payments only after "N resellers get ≥1 order" is proven — exactly as PROJECT.md already states |
| Full order/CRM pipeline (order status, history, customer database) | Vendizap/Catlog both build toward this as they mature ("gestão de pedidos"); resellers juggling many chats might genuinely want it | This turns Vitrino into a mini-ERP; the actual order lifecycle happens inside WhatsApp itself (a system Vitrino doesn't own and shouldn't try to shadow) — building an order tracker that isn't the real source of truth (the WhatsApp thread) creates a second, always-stale ledger | Metrics stay at pageview/click level (as scoped); if order tracking becomes a real need later, it should hook into "click sent" events, not attempt to model order state Vitrino can't observe |
| Real-time inventory sync with supplier (Yupoo/1688 stock levels) | Tempting once Yupoo import exists — "why not also sync stock automatically" | Yupoo galleries are photo albums with no stock API; suppliers change stock via WeChat negotiation, not structured data. Attempting "sync" invites silently-wrong availability, which directly violates the project's own critical alert #4 (stock must reflect within seconds, never be stale) | Manual mark-sold-out/available, fast and obvious in the seller dashboard, stays authoritative — never auto-infer from a scraped source |
| Multi-vendor/team accounts, sub-seller logins | Gopage's higher tiers explicitly sell this ("Cadastro de Vendedores", each with own catálogo/WhatsApp) — a plausible upsell ask | Vitrino's target customer today is a solo/small reseller, not an atacado distributor with a sales team; building multi-seller auth/permissions now is solving a problem this segment doesn't have yet, at real complexity cost (roles, per-seller storefront routing) | Defer until/unless customer research post-MVP shows resellers operate distribution teams, not solo shops |
| AI-generated product descriptions | Gopage already markets this ("IA para criar descrições") — an easy "why don't we have that" ask once seen in a competitor | Pure scope inflation for MVP; product descriptions in this niche are short and formulaic (modelo/solado/tamanho/preço) — the differentiator is data completeness and photos, not prose | Provide a simple template/defaults per category instead of generative AI; revisit only if user feedback specifically flags copywriting as a blocker |
| WhatsApp Business API / official Cloud API integration (automated bot replies, chatbot) | The "grown-up" version of this category (aisensy, wati, sleekflow tooling found in research) is built entirely around the paid WhatsApp Business Platform API | Requires Meta Business verification, message-template approval, and per-conversation costs — completely disproportionate for a Free-tier, non-technical solo reseller MVP whose entire ask is "open a wa.me link with prefilled text" | Stick to `wa.me`/`api.whatsapp.com` deep links (zero API, zero approval, zero cost) — this is what every direct BR competitor (Gopage, Vendizap, Vou Pedir) also does at this tier |
| Native WhatsApp catalog (Meta's own product catalog feature) as a replacement for Vitrino's storefront | It's free and built into WhatsApp Business already — "why build a whole product for this" | Native WA Catalog has no BR-specific taxonomy, no custom branding/slug/QR, poor multi-photo browsing UX for variant-heavy goods (up to 500 flat items, no size-filtering, no analytics), and is generally acknowledged (in the research sources) as "no cart, just chat" with limited discovery — this is exactly the gap Vitrino fills, not a reason to abandon the idea | Position Vitrino as the browsing/filtering/branding layer *in front of* the WhatsApp conversation, not a competitor to WhatsApp itself |

## Feature Dependencies

```
Cadastro/login do revendedor
    └──requires──> nothing (foundation)

Configuração de WhatsApp (número + template)
    └──requires──> Cadastro/login

CRUD de produtos (fotos, tamanhos, preço, marca, solado, categoria)
    └──requires──> Cadastro/login

Vitrine pública com filtros
    └──requires──> CRUD de produtos (need products to filter)
    └──requires──> Configuração da loja (nome, logo, cor — for branding)

Seleção de tamanho + botão "Pedir agora"
    └──requires──> CRUD de produtos (tamanhos como dado estruturado)
    └──requires──> Configuração de WhatsApp (número + template)
    └──requires──> Vitrine pública (needs a place to render)

Link personalizável (slug) + QR Code
    └──requires──> Vitrine pública (slug routes to it)

Métricas básicas (acessos, produtos vistos, cliques WA)
    └──requires──> Vitrine pública (nothing to measure without it)
    └──requires──> Botão "Pedir agora" (click event source)

Dashboard com métricas + produtos recentes
    └──requires──> Métricas básicas
    └──requires──> CRUD de produtos

--- Post-MVP layer ---

Duplicate product ──enhances──> CRUD de produtos
Bulk mark-sold-out ──enhances──> CRUD de produtos (per-variant stock)
CSV import ──enhances──> CRUD de produtos (bulk creation path)
Yupoo import ──enhances──> CRUD de produtos (bulk creation path, photo-first)
Multiple catalogs ──requires──> CRUD de produtos + Vitrine pública (needs to be multiplied, non-trivial routing/slug implications)
Pro plan / paid tier ──requires──> stable Free-tier usage data to price against (conflicts with "no billing in MVP" if built prematurely)
```

### Dependency Notes

- **Seleção de tamanho + botão "Pedir agora" requires CRUD de produtos, Configuração de WhatsApp, and Vitrine pública:** this is the single conversion moment the whole product exists for — it cannot be built or tested in isolation; all three prerequisites must land first, and this should be the last MVP piece assembled, tested exhaustively (per PROJECT.md's own alert #1) before anything else ships.
- **Métricas básicas requires the "Pedir agora" click as an event source:** click tracking is not a separate feature to sequence in parallel — it's an instrumentation layer that must be wired into the order button itself, so plan it in the same phase as the order flow, not as an afterthought bolt-on.
- **Multiple catalogs conflicts with a simple slug-per-seller model:** if this is added later (as Gopage's tiering suggests it should be, eventually), the URL/routing design in the MVP phase should leave room for `slug` to map to one-of-N catalogs rather than assuming seller == storefront 1:1. Worth a lightweight future-proofing note in architecture even though the feature itself is deferred.
- **Pro plan / paid tier conflicts with "no billing in MVP":** don't let differentiator features (multiple catalogs, CSV import, advanced analytics) get built as gated-by-plan from day one — that reintroduces billing complexity through the back door. Build them as plain features first; gate behind a plan only after PROJECT.md's monetization decision is actually made.

## MVP Definition

### Launch With (v1)

Minimum viable product — matches the project's own "Active" requirements list, validated against category norms above. No additions needed; category research confirms this list is neither over- nor under-scoped.

- [ ] Cadastro/login do revendedor (email/senha) — foundation, no competitor gates this behind more
- [ ] CRUD completo de produtos (fotos, tamanhos, preço, marca, solado, categoria, modalidade) — the category's non-negotiable core
- [ ] Configuração da loja (nome, logo, cor, frase) — matches "professional storefront" promise every competitor leads with
- [ ] Configuração de WhatsApp (número validado + template com variáveis) — the entire conversion mechanism
- [ ] Vitrine pública com filtros (marca, solado, modalidade) — table stakes once catalog exceeds a handful of items
- [ ] Seleção de tamanho + botão "Pedir agora" (wa.me + encodeURIComponent) — the one flow that must never break
- [ ] Slug personalizável + QR Code — near-zero marginal cost once slug exists, expected by category
- [ ] Métricas básicas (acessos, produtos mais vistos, cliques WA) — baseline in every adjacent category (link-in-bio and catalog tools alike)
- [ ] Dashboard com métricas + produtos recentes — ties it together for the seller's daily check-in habit

### Add After Validation (v1.x)

Features to add once "resellers create a storefront and receive ≥1 WhatsApp order" is proven — matches the project's own SHOULD/NICE list, sequenced by how directly each removes friction discovered in the niche.

- [ ] Click tracking granularity beyond MVP baseline (per-product click funnels) — add once dashboard usage shows sellers actually check metrics regularly
- [ ] Duplicate product — add once sellers report re-entering near-identical colorway/sole variants is tedious (very likely given this niche's SKU density)
- [ ] Bulk mark-sold-out (per-variant, not just per-product) — add as soon as any seller reports stock going stale across many sizes at once
- [ ] Yupoo import assist — add early in this tier; it directly targets the exact pain named in PROJECT.md's "What This Is" (Yupoo galleries in Mandarin) and is the strongest niche-specific differentiator found in this research
- [ ] CSV import — add once a seller's catalog size or migration need (e.g., coming from a spreadsheet) makes manual entry the visible bottleneck

### Future Consideration (v2+)

Features to defer until product-market fit and monetization decisions are made — confirmed by competitor precedent that these arrive only after a tool has scaled past the "just launched" stage.

- [ ] Multiple catálogos por revendedor — defer until routing/slug model can be redesigned deliberately (see dependency note above); Gopage precedent shows this is real Pro-tier value, not wasted effort, just sequenced wrong if built early
- [ ] Analytics avançado (funnels, retention, cohort) — defer; even mature competitors (Beacons "advanced analytics") gate this behind paid tiers, and MVP's basic counters are sufficient to prove the core hypothesis
- [ ] Pro plan / paid tier + billing — explicitly deferred by PROJECT.md itself; category precedent (Gopage ~R$40-240/yr, Vendizap ~R$80/mo) gives useful future pricing anchors once this is revisited
- [ ] Notificação por e-mail de produto esgotado — low value relative to cost; sellers already live in WhatsApp, not email, for this workflow

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Seleção de tamanho + botão "Pedir agora" | HIGH | MEDIUM | P1 |
| CRUD de produtos (fotos, tamanhos, preço, marca, solado) | HIGH | MEDIUM | P1 |
| Configuração de WhatsApp (número + template) | HIGH | LOW | P1 |
| Vitrine pública com filtros | HIGH | MEDIUM | P1 |
| Slug + QR Code | MEDIUM | LOW | P1 |
| Métricas básicas | MEDIUM | LOW | P1 |
| Dashboard resumo | MEDIUM | LOW | P1 |
| Yupoo import assist | HIGH (niche-specific) | HIGH | P2 |
| Duplicate product | MEDIUM | LOW | P2 |
| Bulk mark-sold-out (per variant) | MEDIUM | LOW-MEDIUM | P2 |
| CSV import | MEDIUM | MEDIUM | P2 |
| Multiple catálogos | MEDIUM | MEDIUM-HIGH | P3 |
| Analytics avançado | LOW (for this stage) | MEDIUM-HIGH | P3 |
| Pro plan / billing | LOW (pre-validation) | HIGH | P3 |
| Payment gateway / checkout | LOW (actively counter to positioning) | HIGH | Anti-feature |
| Full CRM/order pipeline | LOW (duplicates WhatsApp itself) | HIGH | Anti-feature |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Gopage (BR, catálogo digital) | Vendizap (BR, catálogo + WhatsApp) | Catlog (Nigeria, WhatsApp commerce) | Native WhatsApp Business Catalog | Our Approach |
|---------|-------------------------------|--------------------------------------|--------------------------------------|-----------------------------------|--------------|
| Product catalog w/ photos | Yes, unlimited products + AI description helper | Yes, with "variações" | Yes, with videos + "Best Sellers" tags | Yes, up to 500 items, no variant filtering | Match core, add niche-specific taxonomy (solado/modalidade) as structured fields, not freeform tags |
| Order via WhatsApp | Yes, core mechanic | Yes, core mechanic ("pedido chega no WhatsApp") | Yes, plus optional in-app payment | Yes (chat-only, no structured pre-fill from a browsing UI) | Match, with pre-filled template + strict encodeURIComponent testing (higher bar than most, per PROJECT.md alerts) |
| Stock/variant control | Not emphasized in marketing | Yes, explicit "controle de estoque" | Yes, "abandoned cart" and inventory tracking | No stock concept beyond manual removal | Match Vendizap's approach: per-variant availability, mark sold-out fast |
| Custom slug/link | Yes (own domain: gopage.bio or catalogo.com.br) | Yes | Yes ("share your store link everywhere") | Fixed wa.me/catalog link, not brandable | Match — slug is table stakes |
| QR Code | Not confirmed in marketing copy | Not confirmed in marketing copy | Not confirmed | No | Include anyway (spec already does) — near-zero cost, matches adjacent link-in-bio category norm even if direct competitors underserve it; potential minor differentiator |
| Analytics | Not emphasized (SEO/keyword feature mentioned instead) | Not emphasized | Yes, detailed sales/customer analytics | No | Match spec's basic-metrics scope; do not over-invest, since even funded competitors keep this shallow at this tier |
| Multiple catalogs | Yes, tiered (1 / 3 / 10 catálogos by plan) | Not confirmed | Not directly, but multi-channel | No | Defer to post-MVP tier exactly as Gopage does — validates it as a legitimate future paid-tier lever |
| Payments | No (pure catalog + WhatsApp tier) | Mentions "opções de pagamento" at higher tier | Yes, core differentiator (local + international currencies) | Limited (some regions) | Explicitly out of scope for MVP, matches Gopage/Vendizap's own entry tier, not an outlier decision |
| Pricing anchor | R$19.90-39.90/mo | R$79.80/mo | ₦6,500-12,500/mo (~R$40-75) | Free (native WhatsApp feature) | Useful anchor for eventual Pro tier: BR market clears at roughly R$20-80/mo for this category |

## Sources

- [Gopage — Catálogo Digital e planos](https://gopage.bio/) — BR direct competitor, pricing/tiering confirmed (R$19.90-39.90/mo tiers, 1/3/10 catálogos by plan)
- [Gopage — Planos](https://gopage.bio/planos/)
- [Vendizap — Plataforma para Vender pelo WhatsApp](https://www.vendizap.com/) — BR direct competitor, stock control and pricing (R$79.80/mo) confirmed
- [Vendizap — Catálogo Online](https://www.vendizap.com/catalogo-online)
- [Vou Pedir — Catálogos interativos para Venda por WhatsApp](https://www.voupedir.net/) — BR direct competitor, "pedir agora" mechanic confirmed
- [Catlog — Manage your business without the chaos](https://www.catlog.shop/) — international analog (Nigeria/Africa), shows post-MVP evolution path (payments, analytics, campaigns)
- [TechCabal — Built around WhatsApp, Catlog wants to improve social commerce in Nigeria](https://techcabal.com/2022/04/07/catlog-wants-to-improve-social-commerce-in-nigeria/)
- [WhatsApp Business Catalog official help](https://faq.whatsapp.com/405903568419894/) — native feature baseline, confirms 500-item cap and no-cart/chat-only model
- [whatsform.com — How to use WhatsApp catalog for your products](https://whatsform.com/blog/whatsapp-catalog-products/)
- [Beacons vs Linktree comparison (Jotform Blog)](https://www.jotform.com/blog/beacons-vs-linktree/) — link-in-bio category norms for slug/QR/analytics
- [QRLynx — Link-in-Bio QR Code + Built-in Analytics Guide](https://qrlynx.com/blog/link-in-bio-qr-code-guide)
- [Yupoo Explained — How China's Photo-Album Trading Sites Work](https://www.replica-jerseys.com/blog/yupoo-explained) — confirms Yupoo is a photo-gallery/catalog tool, not a transactional platform, validating the "Yupoo import" niche pain point
- [repfindsarchive.com — Yupoo Sellers Guide 2026](https://repfindsarchive.com/blog/yupoo-sellers-guide)
- General BR footwear-resale sourcing/margin context: [Avacy — Onde Comprar Tênis para Revender](https://www.avacy.com.br/blog/post/onde-comprar-tenis-para-revender.html), [Nuvemshop — Como escolher o melhor fornecedor de tênis](https://www.nuvemshop.com.br/blog/fornecedor-de-tenis/)

---
*Feature research for: Brazilian micro-SaaS catalog/storefront for imported soccer cleat resellers (WhatsApp-only checkout)*
*Researched: 2026-07-10*
