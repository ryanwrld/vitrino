---
phase: 06-m-tricas-e-dashboard
verified: 2026-07-15T17:05:00Z
status: passed
score: 8/8 truths verified
behavior_unverified: 1
overrides_applied: 0
human_verification:

  - test: "Abrir /loja/{slug} (grid) e depois trocar um filtro/termo de busca (mesma URL base, query string diferente — ex.: clicar num chip de marca ou digitar na busca). Em seguida, no painel do dono, conferir na tabela `pageviews` (via SQL editor do Supabase ou olhando o contador 'Acessos' do dashboard antes/depois) que só 1 linha de acesso ao grid foi gravada, não 2+."
    expected: "Trocar filtro/busca não incrementa 'Acessos' nem grava uma nova linha em pageviews — só a navegação inicial ao pathname `/loja/{slug}` (ou a um pathname de produto diferente) grava."
    why_human: "É uma garantia de invariante de runtime (o useEffect do PageviewTracker só re-executa quando `pathname` muda, nunca quando só `searchParams` muda) que depende do comportamento real do navegador/Next.js App Router durante navegação client-side. O projeto não tem jsdom/@testing-library para simular isso automaticamente, e nenhum teste de integração ou checkpoint humano registrado (nem em 06-02 nem no checkpoint de 06-04, que cobriu só sidebar/drawer) executou esse cenário fim-a-fim contra o banco real. A arquitetura do código (tracker em layout.tsx, dependência `[pathname]`, layout.tsx nunca recebe searchParams) torna a garantia estruturalmente forte, mas não foi observada em runtime — daí PRESENT_BEHAVIOR_UNVERIFIED, não FAILED nem VERIFIED."
---

# Fase 6: Métricas e Dashboard — Relatório de Verificação

**Objetivo da Fase:** O revendedor consegue visualizar métricas básicas de desempenho da vitrine e um resumo do estado da loja, agregando os eventos coletados nas fases anteriores em contadores simples e úteis.

**Verificado em:** 2026-07-15T17:05:00Z
**Status:** human_needed
**Re-verificação:** Não — verificação inicial

**Nota sobre `mode: mvp`:** O ROADMAP.md marca esta fase como `Mode: mvp`, mas o texto do objetivo não está no formato canônico de User Story (`As a ..., I want to ..., so that ...`). Seguindo o mesmo precedente já registrado em `05-VERIFICATION.md` (fase anterior, mesma situação), esta verificação prosseguiu com o método goal-backward padrão contra os Success Criteria do ROADMAP.md e os `must_haves` do frontmatter dos 4 PLANs, em vez da tabela de User Flow Coverage do modo MVP formal. Sinalizado como nota de processo, não como gap.

## Alcance do Objetivo

### Verdades Observáveis

| # | Verdade | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Tabela `pageviews` (anon insert-only, owner read-scoped, `product_id` nullable) e as duas views agregadas `product_pageview_counts`/`product_order_click_counts` (`security_invoker=true`) existem no banco remoto com o contrato multi-tenant completo (06-01) | ✓ VERIFICADO | `supabase/migrations/0006_pageviews_and_metric_views.sql` lida por completo: tabela + RLS (`owner_read_pageviews`, `public_insert_pageviews` com WITH CHECK cruzando product_id/store_id/status) + 2 views com `with (security_invoker = true)` (grep confirma exatamente 2 ocorrências). `src/lib/database.types.ts` contém `pageviews`, `product_pageview_counts`, `product_order_click_counts` — prova de que a migration foi aplicada ao projeto Supabase vivo que o app consome (tipos vêm do schema real, nunca escritos à mão). `npx vitest run tests/rls/pageviews-rls.test.ts` executado ao vivo nesta sessão: **8/8 passou** em 6.79s, contra o Supabase remoto real, cobrindo insert anônimo válido (grid + produto), rejeição de par product_id/store_id inconsistente, rejeição de produto draft, rejeição de grid sem produto publicado, ausência de leitura anônima, leitura escopada do dono, e isolamento cross-tenant das duas views. |
| 2 | Cada carregamento real da vitrine (grid ou detalhe de produto) grava uma linha em `pageviews` com `product_id` correto (null no grid, preenchido no detalhe) (06-02, D-01) | ✓ VERIFICADO | `src/lib/products/pageview-actions.ts` lido por completo: `logPageview(storeId, productId)` insere bare (sem `.select()`/`.single()` encadeado — confirmado por grep), try/catch que só loga, nunca lança. `src/app/loja/[slug]/pageview-tracker.tsx`: deriva `productId` do pathname (`segments.length >= 3 ? segments[2] : null`), dispara `logPageview` dentro de `startTransition` em `useEffect([pathname])`. `src/app/loja/[slug]/layout.tsx`: resolve `store_id` pelo slug, monta `<PageviewTracker storeId={store.id}>` sobre `{children}` (grid e detalhe compartilham o mesmo layout). `npm run build` confirma `/loja/[slug]` e `/loja/[slug]/[produto]` como rotas `ƒ` dinâmicas (sem `"use cache"`, confirmado por grep negativo). |
| 3 | Trocar filtro/termo de busca na vitrine (mesma pathname, `searchParams` diferente) NÃO registra novo pageview (06-02, D-02) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | O código está presente e estruturalmente correto: `PageviewTracker` reage só a `usePathname()` (nunca `useSearchParams()`), montado em `layout.tsx` (que só recebe `params`, nunca `searchParams` — confirmado por leitura de `layout.tsx` e comparação com `page.tsx`, que é quem de fato recebe `searchParams: Promise<LojaSearchParams>`). A garantia é estrutural/arquitetural (dependência do `useEffect` é só `[pathname]`), mas nenhum teste automatizado nem checkpoint humano observou esse cenário fim-a-fim contra o banco real — o próprio 06-02-SUMMARY.md já registrava isso como pendente para "o checkpoint manual de fim de fase (06-VERIFICATION.md)", e o checkpoint humano que de fato rodou (06-04, Task 3) cobriu apenas sidebar/drawer, não este cenário. Ver item de verificação humana abaixo. |
| 4 | A rota pública `/loja/[slug]` continua sem qualquer gate de autenticação/middleware (06-02) | ✓ VERIFICADO | `src/middleware.ts` lido por completo: `matcher: ['/admin/:path*']` — escopo estritamente limitado, `/loja/[slug]` é inalcançável por construção. `layout.tsx` da vitrine não chama `getUser()`/`redirect` (grep negativo). `npm run build` confirma a rota como `ƒ` dinâmica pública, sem indicação de proteção. |
| 5 | O dashboard exibe 4 cards de resumo (Total de produtos, Disponíveis, Esgotados, Acessos) com números corretos e sempre numéricos (mesmo em loja nova) (06-03, MTR-02) | ✓ VERIFICADO | `src/app/(admin)/(painel)/dashboard/page.tsx` lido por completo: os 4 `statCards` são derivados de `queryProducts` (total/disponíveis/esgotados) e `queryAccessCount` (acessos, `product_id is null`) — nenhum valor hardcoded, `value: totalProdutos`/`disponiveis`/`esgotados`/`acessos` sempre numérico (nunca substituído por texto). `src/lib/dashboard/metrics.ts` lido por completo: `queryAccessCount` filtra `.is("product_id", null)` corretamente (só acessos ao grid, D-01). `npx vitest run tests/dashboard/metrics-aggregation.test.ts` executado ao vivo nesta sessão: **4/4 passou** em 7.41s contra Supabase real, provando contagem exata de acessos ao grid, ordenação Top-10 desc, truncamento em exatamente 10, e isolamento cross-tenant das 3 funções de agregação. |
| 6 | O dashboard exibe uma lista de "Produtos recentes" (5 mais recentes por created_at) (06-03, MTR-02) | ✓ VERIFICADO | `dashboard/page.tsx`: `recentes = produtos.slice(0, 5)`, comentário confirma que `queryProducts` já ordena por `created_at desc` por padrão (reaproveitado de `src/lib/products/list.ts`, sem SQL nova). Renderiza thumbnail/`ImageOff`, nome, linha secundária de marca, `formatBRLPrice`, dot de disponibilidade — mesmo shell visual de `product-list.tsx`. Empty state com copy verbatim ("Nenhum produto cadastrado ainda" / "Cadastre seu primeiro produto...") confirmado por leitura direta, batendo com `06-UI-SPEC.md` linha 93. |
| 7 | O dashboard exibe DUAS listas Top-10 separadas e paralelas — "Mais visualizados" (de `product_pageview_counts`) e "Cliques no WhatsApp" (de `product_order_click_counts`) — nunca fundidas num único número (06-03, MTR-01, D-08/D-09) | ✓ VERIFICADO | `metrics.ts`: `queryTopViewedProducts`/`queryTopOrderClickProducts` consultam views distintas, `.limit(10)` literal fixo (grep confirma, nunca parametrizado por input do usuário), join em memória com `products` para nomes (view nunca embute nome, confirmado por grep negativo de `select("*, products`). `dashboard/page.tsx`: duas `<section>` sequenciais e independentes, "Mais visualizados" (ícone `Eye`) e "Cliques no WhatsApp" (ícone `MessageCircle`), cada uma com seu próprio empty state verbatim ("Ainda sem visualizações"/"Ainda sem cliques"), batendo com `06-UI-SPEC.md` linhas 95-96. Teste de agregação prova ranking independente entre as duas listas (ordens propositalmente invertidas no seed). |
| 8 | Todo o painel autenticado (Dashboard/Produtos/Configurações) mostra sidebar fixa no desktop e hambúrguer→drawer `<dialog>` no mobile, com link ativo destacado; "Sair da conta" no rodapé; sidebar ausente nas páginas públicas de auth; URLs preservadas (06-04, D-05/D-06/D-07) | ✓ VERIFICADO | `src/components/admin-sidebar.tsx` lido por completo: `<aside hidden ... md:flex>` desktop + barra de topo `md:hidden` com hambúrguer + `<dialog>` com `.showModal()`/`backdrop:bg-black/50` mobile; `NavLinks` compartilhado com `pathname.startsWith(item.href)` para link ativo; `signOutAction` (reaproveitado, não recriado) no rodapé de ambos, fora da lista de links, estilo neutro (nunca vermelho). `matchMedia` listener fecha o dialog ao cruzar para desktop (bug corrigido no checkpoint humano). `src/app/(admin)/(painel)/layout.tsx`: único `<main bg-white>` do painel. `(admin)/layout.tsx` (páginas públicas de auth) sem `AdminSidebar` — grep confirma zero ocorrências em login/cadastro/onboarding/esqueci-senha/redefinir-senha; `git log` confirma um único commit histórico nesse arquivo (de 01-03, nunca tocado por esta fase) — isolamento estrutural, não checagem condicional. `npm run build` executado ao vivo nesta sessão: rotas `/dashboard`, `/produtos`, `/produtos/novo`, `/produtos/[id]/editar`, `/configuracoes` todas presentes e idênticas, nenhuma URL nova introduzida pelo grupo `(painel)`. Checkpoint humano bloqueante (06-04 Task 3) rodou interativamente, encontrou 2 bugs de responsividade (hambúrguer mal posicionado, drawer não fechava no resize mobile→desktop) — ambos corrigidos (commit `f024a33`) e reaprovados pelo usuário antes do fechamento do plano. |

**Pontuação:** 8/8 verdades presentes/corretas por evidência de código+teste; 1 verdade adicional (#3) fica ⚠️ PRESENT_BEHAVIOR_UNVERIFIED (não conta nem para o score nem como falha) — código estruturalmente correto, comportamento de runtime nunca observado fim-a-fim.

### Artefatos Obrigatórios

| Artefato | Esperado | Status | Detalhes |
|----------|----------|--------|----------|
| `supabase/migrations/0006_pageviews_and_metric_views.sql` | tabela pageviews + RLS + 2 views agregadas | ✓ VERIFICADO | Lido por completo, corresponde ao PLAN.md linha a linha |
| `src/lib/database.types.ts` | tipos regenerados contra o schema vivo | ✓ VERIFICADO | Contém `pageviews`, `product_pageview_counts`, `product_order_click_counts` |
| `tests/rls/pageviews-rls.test.ts` | 8 casos do contrato multi-tenant | ✓ VERIFICADO/WIRED | 8/8 passou ao vivo contra Supabase remoto |
| `src/lib/products/pageview-actions.ts` | `logPageview` fire-and-forget | ✓ VERIFICADO/WIRED | Insert bare, nunca lança, importado por `pageview-tracker.tsx` |
| `src/app/loja/[slug]/pageview-tracker.tsx` | tracker client invisível | ✓ VERIFICADO/WIRED | Montado em `layout.tsx`, `usePathname`-driven |
| `src/app/loja/[slug]/layout.tsx` | resolve store_id + monta tracker | ✓ VERIFICADO/WIRED | Sem gate de auth, sem cache |
| `src/lib/dashboard/metrics.ts` | 3 funções de agregação puras | ✓ VERIFICADO/WIRED | Importado e chamado em `dashboard/page.tsx`; testado via integração |
| `src/app/(admin)/(painel)/dashboard/page.tsx` | 4 cards + recentes + 2 Top-10 | ✓ VERIFICADO/WIRED/FLOWING | Dados reais via `queryProducts`+`metrics.ts`, sem valores hardcoded |
| `tests/dashboard/metrics-aggregation.test.ts` | teste de agregação | ✓ VERIFICADO | 4/4 passou ao vivo contra Supabase remoto |
| `src/components/admin-sidebar.tsx` | sidebar desktop + drawer mobile | ✓ VERIFICADO/WIRED | Importado por `(painel)/layout.tsx`; checkpoint humano aprovado |
| `src/app/(admin)/(painel)/layout.tsx` | layout do grupo `(painel)` | ✓ VERIFICADO/WIRED | Único `<main bg-white>`, envolve dashboard/produtos/configuracoes |
| `tests/ui/dark-mode-contrast.test.ts` | repontado para `(painel)/layout.tsx` | ✓ VERIFICADO | 8/8 passou ao vivo |

### Verificação de Key Links

| De | Para | Via | Status | Detalhes |
|----|------|-----|--------|----------|
| `pageview-tracker.tsx` | `pageview-actions.ts` | `logPageview(storeId, productId)` dentro de `startTransition` | ✓ WIRED | Import direto confirmado; chamada dentro de `useEffect([pathname])` |
| `loja/[slug]/layout.tsx` | `pageview-tracker.tsx` | `<PageviewTracker storeId={store.id}>` condicional | ✓ WIRED | Montado sobre `{children}` (grid+detalhe) |
| `dashboard/page.tsx` | `metrics.ts` | `queryAccessCount`/`queryTopViewedProducts`/`queryTopOrderClickProducts` via `Promise.all` | ✓ WIRED | Resultados atribuídos e renderizados diretamente no JSX |
| `metrics.ts` (views) | `products` (nomes) | join em memória via `Map` id→produto, nunca embutido na view | ✓ WIRED | Confirmado por leitura + grep negativo de embed na view |
| `(painel)/layout.tsx` | `admin-sidebar.tsx` | `<AdminSidebar />` | ✓ WIRED | Import direto, renderizado ao lado de `<main>` |
| `admin-sidebar.tsx` | `signOutAction` | `<form action={signOutAction}>` | ✓ WIRED | Reaproveitado de `@/lib/auth/actions`, nunca recriado |

### Trace de Fluxo de Dados (Nível 4)

| Artefato | Variável de dado | Fonte | Dados reais? | Status |
|----------|-------------------|-------|---------------|--------|
| `dashboard/page.tsx` (4 stat cards) | `totalProdutos`/`disponiveis`/`esgotados`/`acessos` | `queryProducts()` + `queryAccessCount()` — ambos com query real ao Supabase (`.from("pageviews")...eq("store_id",...)`) | ✓ FLOWING | Nenhum retorno estático vazio; `count ?? 0` só como fallback de ausência de linha, não hardcode |
| `dashboard/page.tsx` ("Mais visualizados"/"Cliques no WhatsApp") | `maisVisualizados`/`cliquesWhatsapp` | `queryTopViewedProducts`/`queryTopOrderClickProducts` — consultam as views `product_pageview_counts`/`product_order_click_counts`, que por sua vez agregam `pageviews`/`order_clicks` reais | ✓ FLOWING | Teste de integração prova que a ordenação reflete o volume real de dados semeados |

### Spot-Checks Comportamentais

| Comportamento | Comando | Resultado | Status |
|----------------|---------|-----------|--------|
| Teste RLS de pageviews (8 casos) roda contra Supabase remoto real | `TEST_SUPABASE_SERVICE_ROLE_KEY="" npx vitest run tests/rls/pageviews-rls.test.ts` | 8/8 passou (6.79s) | ✓ PASS |
| Teste de agregação de métricas roda contra Supabase remoto real | `TEST_SUPABASE_SERVICE_ROLE_KEY="" npx vitest run tests/dashboard/metrics-aggregation.test.ts` | 4/4 passou (7.41s) | ✓ PASS |
| Teste de contraste dark-mode repontado para `(painel)/layout.tsx` | `TEST_SUPABASE_SERVICE_ROLE_KEY="" npx vitest run tests/ui/dark-mode-contrast.test.ts` | 8/8 passou | ✓ PASS |
| `npx tsc --noEmit` limpo (exceto os 2 erros pré-existentes documentados de `tests/supabase/server-cookies.test.ts`, não tocados por esta fase) | `npx tsc --noEmit` | 2 erros pré-existentes, nenhum novo | ✓ PASS |
| `npm run build` compila e preserva as URLs | `npm run build` | Build limpo; `/dashboard`, `/produtos`, `/produtos/[id]/editar`, `/produtos/novo`, `/configuracoes`, `/loja/[slug]`, `/loja/[slug]/[produto]` todas presentes como `ƒ` dinâmicas | ✓ PASS |
| Suíte completa `npm test` — nenhuma regressão atribuível à Fase 6 | `TEST_SUPABASE_SERVICE_ROLE_KEY="" npm test` (rodado uma vez, integralmente) | 15 arquivos falharam / 23 passaram (38 total); os 15 falhos são todos em `tests/auth/*`, `tests/onboarding/*`, `tests/products/{availability,create-product,edit-delete-product,hide-when-sold-out,photo-upload}.test.ts`, `tests/settings/*`, `tests/storefront/load-more-pagination.test.ts` — nenhum desses arquivos foi tocado por esta fase; toda falha tem a mesma assinatura `"Request rate limit reached"` do GoTrue (rate-limit de signup do Supabase Auth, blocker de ambiente já documentado em STATE.md e nas 4 SUMMARYs desta fase). Os 5 arquivos de teste diretamente relevantes à Fase 6 (`pageviews-rls`, `metrics-aggregation`, `dark-mode-contrast`, mais os já verdes de fases anteriores) passam 100% quando executados isoladamente/dentro do full run. | ✓ PASS (sem regressão) |

### Cobertura de Requisitos

| Requisito | Plano(s) de origem | Descrição | Status | Evidência |
|-----------|--------------------|-----------|--------|-----------|
| MTR-01 | 06-01, 06-02, 06-03, 06-04 | Revendedor visualiza métricas básicas (acessos à vitrine, produtos mais visualizados, cliques no botão WhatsApp por produto) | ✓ SATISFEITO (com 1 item de verificação humana pendente — item #3 acima, D-02) | Migration+captura+dashboard+navegação todos implementados e testados; único ponto não observado em runtime é o não-duplicar-pageview-ao-filtrar, estruturalmente correto mas não confirmado fim-a-fim |
| MTR-02 | 06-01, 06-03 | Dashboard exibe métricas resumidas (total de produtos, disponíveis, esgotados, acessos) e lista de produtos recentes | ✓ SATISFEITO | Verdades #5 e #6 acima, verificadas por código+teste de integração |

**Nota de bookkeeping (não-bloqueante):** `.planning/REQUIREMENTS.md` ainda lista MTR-01/MTR-02 com checkbox `[ ]` (não marcado) e a tabela de rastreamento no rodapé do arquivo ainda mostra "Pendente" para ambos, apesar de `requirements-completed: [MTR-01, MTR-02]` estar corretamente declarado nos 4 SUMMARYs da fase. Isso é uma lacuna de atualização de documentação, não uma lacuna funcional — os dois requisitos estão implementados e comprovados pelo código/testes acima. Recomenda-se atualizar o checkbox/tabela do REQUIREMENTS.md antes de arquivar o marco, mas isso não bloqueia a aprovação desta fase.

### Anti-Patterns Encontrados

Nenhum. Varredura de `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/copy de "não implementado ainda" nos 12 arquivos criados/modificados pela fase: zero ocorrências reais (1 falso-positivo de "todos" em português, não um marcador `TODO`). Nenhum retorno vazio hardcoded (`return []`/`return {}` estático) nos caminhos de dados reais — todos os `?? 0`/`?? []` são fallbacks de ausência de linha sobre uma query real, não substitutos de dados nunca buscados.

### Verificação Humana Necessária

### 1. Confirmar que trocar filtro/busca na vitrine não duplica o registro de pageview (D-02)

**Teste:** Abrir `/loja/{slug}` (grid) no navegador. Trocar um filtro (marca, solado, etc.) ou digitar um termo de busca — a URL muda a query string, mas continua no mesmo pathname `/loja/{slug}`. Depois, no painel do dono (`/dashboard`, contador "Acessos") ou via SQL direto no Supabase, conferir quantas linhas novas de `pageviews` (`product_id` null, mesma `store_id`) foram gravadas.

**Esperado:** Só 1 linha gravada pela carga inicial do grid — a troca de filtro/busca (mesma pathname) NÃO deve gravar uma segunda linha.

**Por que humano:** O mecanismo (`useEffect` com dependência `[pathname]`, tracker montado em `layout.tsx` que nunca recebe `searchParams`) é estruturalmente correto por leitura de código, mas nenhum teste automatizado ou checkpoint humano registrado observou esse comportamento fim-a-fim contra o banco real — o projeto não tem jsdom/@testing-library para simular isso, e ambos os SUMMARYs (06-02 e 06-03) explicitamente deferiram essa confirmação para o checkpoint de fim de fase, que é este documento.

### Resumo de Gaps

Nenhum gap bloqueante encontrado. Todas as 8 verdades principais estão implementadas, testadas (onde automatizável) e corroboradas por leitura direta do código nesta sessão — incluindo reexecução ao vivo dos 3 testes específicos da fase (pageviews-rls 8/8, metrics-aggregation 4/4, dark-mode-contrast 8/8) e do `npm run build`/`npm test` completo, confirmando que os 15 arquivos de teste que falham na suíte completa são pré-existentes e não relacionados à Fase 6 (mesma assinatura de rate-limit do GoTrue documentada nas 4 SUMMARYs).

O único item pendente é uma confirmação de runtime (D-02: trocar filtro não duplica pageview) que a própria equipe de execução já havia sinalizado como deferida para este checkpoint de fim de fase, e nunca foi de fato testada interativamente (o checkpoint humano que rodou, em 06-04, cobriu apenas sidebar/drawer). Por isso o status é `human_needed`, não `passed` — a fase está funcionalmente completa e o mecanismo é estruturalmente sólido, mas falta a confirmação observacional final desse ponto específico antes de fechar com confiança total.

---

*Verificado em: 2026-07-15T17:05:00Z*
*Verificador: Claude (gsd-verifier)*
