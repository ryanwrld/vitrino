---
phase: 02-link-compartilh-vel-da-vitrine
plan: 05
subsystem: ui
tags: [nextjs, react, dialog, debounce, sonner, lucide-react]

requires:
  - phase: 02-link-compartilh-vel-da-vitrine (plan 02-02)
    provides: "slugify(), slugSchema, useDebouncedValue"
  - phase: 02-link-compartilh-vel-da-vitrine (plan 02-03)
    provides: "checkSlugAvailability, updateStoreSlug (src/lib/settings/actions.ts)"
  - phase: 02-link-compartilh-vel-da-vitrine (plan 02-04)
    provides: "/configuracoes route + placeholder SlugEditor shell substituído por este plano"
provides:
  - "SlugEditor real: auto-slugify por tecla, validação de formato síncrona, checagem de disponibilidade debounced (~400ms), diálogo de confirmação nativo antes de trocar o slug"
affects: ["02-06 (QrCodePanel real precisa refletir o slug atualizado via router.refresh())"]

tech-stack:
  added: []
  patterns:
    - "Validação de formato síncrona (Zod, sem debounce) + checagem de rede debounced (useDebouncedValue) — só o round-trip ao servidor é debounced, nunca o feedback de formato"
    - "<dialog> nativo com showModal()/close(): Cancelar via <form method=\"dialog\"> (nunca dispara side-effect), confirmar via onClick explícito no botão destrutivo — única forma de escrita é o onClick, nunca o evento de fechamento do dialog"
    - "Guarda contra resultado obsoleto (stale response) comparando slugify(rawSlug) atual com o debouncedSlug que originou a checagem, antes de aplicar o status"

key-files:
  created: []
  modified:
    - "src/app/(admin)/configuracoes/slug-editor.tsx"

key-decisions:
  - "router.refresh() após updateStoreSlug bem-sucedido, para que o page.tsx (Server Component) rebusque store.slug e propague o novo valor para QrCodePanel/publicUrl sem reload completo"

patterns-established:
  - "Toda ação destrutiva única (fora do fluxo de formulário principal) usa o mesmo molde: <dialog> nativo + Cancelar via method=dialog + confirmar via onClick isolado"

requirements-completed: [LOJA-02]

coverage:
  - id: D1
    description: "Digitar no campo de slug auto-slugifica a cada tecla (minúsculo, sem acento, espaços viram hífen) — D-01"
    requirement: "LOJA-02"
    verification:
      - kind: unit
        ref: "src/lib/slug/slugify.ts já coberto por tests/slug/slugify.test.ts (plan 02-02); slug-editor.tsx aplica slugify(rawSlug) em todo render, sem lógica adicional a testar isoladamente"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D2
    description: "Após ~400ms sem digitar, o campo mostra Verificando/Disponível/'Este link já está em uso.' com base na checagem real (D-03)"
    requirement: "LOJA-02"
    verification:
      - kind: other
        ref: "grep useDebouncedValue + checkSlugAvailability em slug-editor.tsx; checkSlugAvailability já provado contra o RPC real em tests/settings/slug-availability.test.ts (plan 02-03)"
        status: pass
    human_judgment: true
    rationale: "O timing visual exato do debounce (~400ms) e a transição da pill de status em uma sessão real digitando no browser é um julgamento de UX que a automação de tipo/grep não prova por si só — precisa de UAT manual com conta logada."
  - id: D3
    description: "Trocar o slug exige confirmar um dialog nativo que avisa em linguagem simples que o link antigo quebra; cancelar não muda nada (D-04, D-08)"
    requirement: "LOJA-02"
    verification:
      - kind: other
        ref: "grep showModal + updateStoreSlug em slug-editor.tsx; Cancelar usa <form method=\"dialog\"> (não chama updateStoreSlug); confirmar usa onClick explícito (Pitfall 4)"
        status: pass
    human_judgment: true
    rationale: "Confirmar visualmente que Escape/Cancelar não persiste nenhuma mudança e que o texto do diálogo é compreensível para um usuário não-técnico exige interação real em um navegador — não é provável só por inspeção estática do código."

# Metrics
duration: 12min
completed: 2026-07-12
status: complete
---

# Phase 02 Plan 05: Editor de Slug com Disponibilidade em Tempo Real Summary

**`SlugEditor` real substitui o placeholder: `slugify()` a cada tecla, `slugSchema` síncrono para formato, `useDebouncedValue` (~400ms) disparando `checkSlugAvailability`, e troca do slug isolada atrás de um `<dialog>` nativo de confirmação que só escreve no banco via `updateStoreSlug` no clique explícito de confirmar.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-12T18:25:50-04:00
- **Completed:** 2026-07-12T18:26:40-04:00
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Input de slug: `slugify(rawSlug)` recalculado a cada tecla (D-01), formato validado síncronamente via `slugSchema` (nunca debounced, só a checagem de rede é — 02-RESEARCH.md Open Question 2)
- `useDebouncedValue(slug, 400)` dispara `checkSlugAvailability` dentro de `useTransition`, com guarda contra resposta obsoleta (compara `slugify(rawSlug)` atual com o `debouncedSlug` que originou a chamada antes de aplicar o resultado)
- Pill de status com a copy exata do 02-UI-SPEC ("Verificando disponibilidade…", "Disponível", "Este link já está em uso.") e ícones `lucide-react` (Loader2/Check/X)
- Botão "Salvar novo link" habilitado só quando `status === "available"`, abrindo um `<dialog>` nativo via `showModal()` com a copy exata do Contrato de Copywriting (título, corpo em linguagem simples sem jargão técnico, "Cancelar"/"Sim, trocar o link")
- `updateStoreSlug` só é chamado a partir do `onClick` explícito do botão destrutivo — o "Cancelar" usa `<form method="dialog">`, que fecha o dialog sem nenhum side-effect (Pitfall 4)
- No sucesso: `toast.success` + `router.refresh()` para o Server Component `page.tsx` rebuscar o slug atualizado e propagar para o painel de QR/URL pública

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Input de slug com auto-slugify + checagem debounced (D-01, D-02, D-03)** - `837c642` (feat)
2. **Task 2: Botão "Salvar novo link" + diálogo de confirmação nativo (D-04, D-08, Pitfall 4)** - `5ff545f` (feat)
3. **Correção de deviation: remove setState síncrono no efeito de checagem** - `584437f` (fix)

**Plan metadata:** (este commit)

## Files Created/Modified
- `src/app/(admin)/configuracoes/slug-editor.tsx` - Editor real do slug: input auto-slugify, pill de status debounced, botão + dialog de confirmação

## Decisions Made
- `router.refresh()` chamado após `updateStoreSlug` bem-sucedido para que o Server Component pai rebusque `store.slug` e propague o novo valor a `QrCodePanel`/`publicUrl` sem recarregar a página inteira

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removidas chamadas síncronas de `setState` dentro do `useEffect`**
- **Encontrado durante:** Verificação pós-execução (`npx eslint`), após ambas as tasks já estarem commitadas
- **Problema:** O código de referência do 02-PATTERNS.md (Pattern 2) chama `setStatus("idle")` e `setStatus("checking")` diretamente como primeira instrução do `useEffect` disparado pelo debounce. A config de ESLint do projeto (`react-hooks/set-state-in-effect`) sinaliza isso como o anti-padrão "adjusting state on prop change", bloqueando um `npx eslint` limpo — um critério de sucesso do plano.
- **Fix:** As transições manuais `"idle"`/`"checking"` foram substituídas por valores derivados diretamente no render: `needsCheck` (formato válido E o slug debounced diverge do atual) e `isCheckPending` (do próprio `useTransition`, que o React já atualiza de forma síncrona ao chamar `startCheckTransition`, sem `setState` manual). As únicas chamadas `setStatus` restantes ficam dentro do callback assíncrono de `checkSlugAvailability` (available/taken), que a regra não sinaliza.
- **Arquivos modificados:** `src/app/(admin)/configuracoes/slug-editor.tsx`
- **Verificação:** `npx tsc --noEmit` e `npx eslint src/app/(admin)/configuracoes/slug-editor.tsx` limpos; comportamento inalterado (a pill de status continua mostrando checking → available/taken com o mesmo debounce de 400ms)
- **Committed in:** `584437f`

---

**Total de deviations:** 1 auto-corrigida (Rule 1 - bug/conformidade de lint)
**Impacto no plano:** Necessário para um `npx eslint` limpo conforme a config de lint deste projeto; sem mudança de comportamento, copy ou escopo.

## Issues Encountered

`npx tsc --noEmit` limpo em ambas as tasks (só os erros pré-existentes e fora de escopo em `tests/supabase/server-cookies.test.ts`, já registrados em `deferred-items.md`). `npm run build` lista `/configuracoes` como rota dinâmica (`ƒ`), sem erros; um `curl` deslogado contra um servidor de dev local confirmou o redirect `307` para `/login` (guard herdado de `requireCompletedOnboarding`, inalterado por este plano).

Execuções repetidas de `npm test` durante a verificação dispararam "Request rate limit reached" do Supabase Auth nos testes de integração de `tests/settings/*.test.ts` (que criam contas reais no projeto Supabase real a cada execução). Isso é um comportamento pré-existente da infraestrutura de testes (sem emulador local de Supabase Auth), não relacionado ao único arquivo modificado por este plano (`slug-editor.tsx`, que não é `files_modified` de nenhum desses testes). Confirmado como não-relacionado rodando `tests/settings/store-settings-update.test.ts` isoladamente (2/2 passaram) antes do rate limit ser atingido por execuções cumulativas nesta mesma sessão. Não corrigido — fora de escopo para este plano de UI; sinalizado para uma futura fase considerar um stub local de Supabase Auth para a suite de testes.

## User Setup Required
None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness
- Plan 02-06 pode substituir o placeholder `QrCodePanel` sabendo que `SlugEditor` já dispara `router.refresh()` no sucesso da troca de slug, então o QR/URL pública vai refletir o novo slug automaticamente sem trabalho extra
- UAT interativo completo (D2/D3 acima) ainda precisa de uma passada manual com uma conta logada de verdade para confirmar o timing do debounce e o comportamento do diálogo em um navegador real — sinalizado como `human_judgment: true` no bloco de coverage para o verifier rotear adequadamente

---
*Phase: 02-link-compartilh-vel-da-vitrine*
*Completed: 2026-07-12*

## Self-Check: PASSED
