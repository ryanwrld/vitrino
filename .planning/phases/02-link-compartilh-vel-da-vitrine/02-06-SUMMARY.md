---
phase: 02-link-compartilh-vel-da-vitrine
plan: 06
subsystem: ui
tags: [qrcode, clipboard-api, canvas, sonner, lucide-react, tdd]

requires:
  - phase: 02-link-compartilh-vel-da-vitrine (plan 02-01)
    provides: "dependências qrcode + lucide-react instaladas e aprovadas no gate de legitimidade"
  - phase: 02-link-compartilh-vel-da-vitrine (plan 02-02)
    provides: "buildStoreUrl (usado no teste de generateQrDataUrl)"
  - phase: 02-link-compartilh-vel-da-vitrine (plan 02-04)
    provides: "/configuracoes route + placeholder QrCodePanel shell substituído por este plano"
provides:
  - "generateQrDataUrl(url): Promise<string> — helper node-testável de geração de QR (src/lib/qr.ts)"
  - "copyText(text): Promise<boolean> — fronteira pura de clipboard, sem toast (src/lib/clipboard.ts)"
  - "QrCodePanel real: preview de QR no canvas, Baixar PNG, Copiar com toast"
affects: []

tech-stack:
  added: []
  patterns:
    - "Fronteira pura testável em Node (copyText) separada do componente que decide a reação de UI (toast) — mesmo racional de T-02-11 do threat_model do plano"
    - "Estado de prontidão (qrReady) derivado no render comparando a URL já desenhada com a URL atual, em vez de setState síncrono no corpo do efeito (mesma correção de react-hooks/set-state-in-effect aplicada em slug-editor.tsx no plan 02-05)"

key-files:
  created:
    - src/lib/qr.ts
    - src/lib/clipboard.ts
    - tests/settings/qr-code.test.ts
    - tests/settings/copy-link.test.ts
  modified:
    - "src/app/(admin)/configuracoes/qr-code-panel.tsx"

key-decisions:
  - "QrCodePanel usa QRCode.toCanvas diretamente (não generateQrDataUrl) porque o botão 'Baixar PNG' precisa ler de volta do <canvas> real do DOM via toDataURL; generateQrDataUrl continua sendo o helper node-testável equivalente, exercitado pela suíte de testes"
  - "readyUrl (string | null) comparado com publicUrl no render, em vez de um boolean setState síncrono no efeito — resolvido antes do commit, seguindo o mesmo padrão de correção já estabelecido no plan 02-05 para a mesma regra de lint (react-hooks/set-state-in-effect)"

patterns-established: []

requirements-completed: [LOJA-03, LOJA-04]

coverage:
  - id: D1
    description: "generateQrDataUrl produz um data URL PNG para a URL pública da vitrine (LOJA-03)"
    requirement: "LOJA-03"
    verification:
      - kind: unit
        ref: "tests/settings/qr-code.test.ts#resolve para uma string data:image/png;base64, para a URL pública da vitrine"
        status: pass
    human_judgment: false
  - id: D2
    description: "copyText escreve o texto exato via navigator.clipboard.writeText e resolve true/false sem lançar (LOJA-04)"
    requirement: "LOJA-04"
    verification:
      - kind: unit
        ref: "tests/settings/copy-link.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "O preview de QR renderiza ao carregar a página (D-11) e o botão 'Baixar PNG' baixa o QR como PNG (D-09)"
    requirement: "LOJA-03"
    verification:
      - kind: other
        ref: "grep toCanvas em qr-code-panel.tsx; npm run build lista /configuracoes como dinâmica sem erros; npx tsc --noEmit e npx eslint limpos"
        status: pass
    human_judgment: true
    rationale: "O render visual do QR no canvas e a leitura por câmera real de um PNG baixado exigem um navegador de verdade e um dispositivo físico — não são prováveis por tipo/grep/build sozinhos (o próprio plano já classifica isso como human-check)."
  - id: D4
    description: "O campo readonly mostra a URL pública completa e 'Copiar' copia exatamente essa URL, mostrando o toast 'Link copiado!' (LOJA-04, D-12, D-13)"
    requirement: "LOJA-04"
    verification:
      - kind: unit
        ref: "tests/settings/copy-link.test.ts (prova o contrato de copyText que o botão consome)"
        status: pass
      - kind: other
        ref: "grep copyText em qr-code-panel.tsx"
        status: pass
    human_judgment: true
    rationale: "Confirmar visualmente o toast 'Link copiado!' e colar o valor copiado numa sessão de navegador real (para provar que a área de transferência do SO recebeu exatamente a URL) é um passo de UAT manual — o unit test já prova o contrato programático que a UI consome."

# Metrics
duration: 15min
completed: 2026-07-12
status: complete
---

# Phase 02 Plan 06: Painel de QR Code + Copiar Link Summary

**`generateQrDataUrl`/`copyText` extraídos como fronteiras puras e node-testáveis (3/3 testes), e o `QrCodePanel` real renderiza o QR no canvas ao carregar, baixa PNG via `<a download>`, e copia a URL pública com toast "Link copiado!" — fechando as três seções de `/configuracoes` desta fase.**

## Nota de Fechamento (Closeout)

**Este plano foi implementado e commitado por um processo fora do fluxo normal de orquestração (anomalia out-of-band, já sinalizada ao usuário), não executado do zero por esta sessão.** Esta sessão atuou exclusivamente em modo de fechamento formal: cada `acceptance_criteria` das duas tasks do `02-06-PLAN.md` foi reverificado individualmente contra o código já commitado (`src/lib/qr.ts`, `src/lib/clipboard.ts`, `src/app/(admin)/configuracoes/qr-code-panel.tsx`, e os dois arquivos de teste), a seção "Artifacts this plan produces" do plano foi conferida artefato-por-artefato, e os comandos de verificação (`npx vitest run tests/settings/qr-code.test.ts tests/settings/copy-link.test.ts`, `npx tsc --noEmit`) foram re-executados de forma independente nesta sessão — todos passando, sem nenhuma regressão ou lacuna encontrada. Nenhum código de implementação foi escrito ou reescrito por esta sessão de fechamento; o único ajuste feito aqui foi de tracking (traçabilidade de requisitos em `REQUIREMENTS.md`, ver "Deviations" abaixo).

### Verificação de `acceptance_criteria` (reconfirmada nesta sessão)

**Task 1 — helpers de QR + clipboard (LOJA-03, LOJA-04):**

| Critério | Resultado |
|---|---|
| `tests/settings/qr-code.test.ts` prova PNG data URL para URL construída | PASS — reexecutado, 1/1 verde |
| `tests/settings/copy-link.test.ts` prova texto exato escrito + `true`/`false` sem lançar | PASS — reexecutado, 2/2 verde |
| `src/lib/clipboard.ts` não importa `sonner` | PASS — confirmado via leitura direta do arquivo |

**Task 2 — painel real (D-09–D-13):**

| Critério | Resultado |
|---|---|
| Preview de QR renderiza no load; "Baixar PNG" baixa PNG; "Copiar" copia `publicUrl` exato e mostra toast "Link copiado!" | PASS — `QRCode.toCanvas` no `useEffect`, download via `canvas.toDataURL` + `<a download>`, `copyText` + `toast.success`/`toast.error` confirmados por leitura de código |
| Botões ícone-only com touch target ≥44×44px | PASS — `p-3` em ambos os botões (Copiar, Baixar PNG) |
| `npx tsc --noEmit` passa | PASS — reexecutado nesta sessão; únicos erros restantes são pré-existentes e fora de escopo em `tests/supabase/server-cookies.test.ts` (débito técnico já registrado, não relacionado a este plano) |

### Verificação de `<artifacts>` (todos presentes)

| Artefato | Status |
|---|---|
| `generateQrDataUrl(url): Promise<string>` — `src/lib/qr.ts` | PASS |
| `copyText(text): Promise<boolean>` — `src/lib/clipboard.ts` | PASS |
| `QrCodePanel` (real) — `qr-code-panel.tsx` | PASS |
| `tests/settings/qr-code.test.ts`, `tests/settings/copy-link.test.ts` | PASS |
| `key_links`: `qr-code-panel` recebe `publicUrl` de `page.tsx` via `buildStoreUrl(store.slug)` | PASS — confirmado em `page.tsx` linha 38/61 |
| `key_links`: `copyText` escreve o `publicUrl` exato; `generateQrDataUrl` codifica a mesma URL | PASS — `copyText(publicUrl)` no painel; `generateQrDataUrl` é o equivalente node-testável (o painel usa `QRCode.toCanvas` diretamente por precisar do `<canvas>` real do DOM para o download, decisão já documentada no plano) |

Nenhum defeito genuíno encontrado. Nenhuma reimplementação foi necessária.

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-12T18:30:11-04:00
- **Completed:** 2026-07-12T18:33:00-04:00
- **Tasks:** 2
- **Files modified:** 5 (4 criados, 1 modificado)

## Accomplishments
- `src/lib/qr.ts`: `generateQrDataUrl(url)` via `QRCode.toDataURL` (nível de correção M, sem logo — D-10), coberto por teste unitário rodando em Node
- `src/lib/clipboard.ts`: `copyText(text)`, fronteira pura sem `sonner` (T-02-11 do threat_model), nunca lança — retorna `false` na rejeição
- `QrCodePanel` real substitui o placeholder: `QRCode.toCanvas` desenha o preview no `<canvas>` ao montar/mudar `publicUrl` (D-11); "Baixar PNG" lê `canvas.toDataURL("image/png")` num `<a download="vitrine-qrcode.png">` temporário (D-09); campo readonly com a URL pública completa (D-13) ao lado do botão "Copiar", que chama `copyText` e mostra `toast.success("Link copiado!")` ou o fallback de erro (D-12)
- Botões ícone-only (`Copiar`, `Baixar PNG`) com padding `p-3` garantindo touch target ≥44×44px (exceção mobile-first do 02-UI-SPEC)
- `npm run build` confirma `/configuracoes` ainda dinâmica (`ƒ`), sem erros; `npx eslint` limpo em `qr-code-panel.tsx` — a mesma regra `react-hooks/set-state-in-effect` sinalizada no plan 02-05 foi corrigida diretamente na implementação (estado `readyUrl` derivado por comparação, nunca `setState` síncrono no corpo do efeito)

## Task Commits

Cada task foi commitada atomicamente, seguindo RED → GREEN (TDD) na Task 1:

1. **Task 1: Helpers de QR + clipboard com testes unitários (LOJA-03, LOJA-04)**
   - `3b4ed40` test: testes falhos de `generateQrDataUrl`/`copyText` (RED)
   - `2872202` feat: implementação dos dois helpers (GREEN)
2. **Task 2: Painel real de QR/copy (D-09–D-13)** - `3cc7a16` (feat)

**Plan metadata:** (este commit)

## Files Created/Modified
- `src/lib/qr.ts` - `generateQrDataUrl(url): Promise<string>`
- `src/lib/clipboard.ts` - `copyText(text): Promise<boolean>`, sem import de `sonner`
- `tests/settings/qr-code.test.ts`, `tests/settings/copy-link.test.ts` - 3 testes unitários, todos verdes
- `src/app/(admin)/configuracoes/qr-code-panel.tsx` - Painel real: preview de QR, Baixar PNG, Copiar com toast

## Decisions Made
- `QrCodePanel` usa `QRCode.toCanvas` diretamente em vez de `generateQrDataUrl` — precisa do `<canvas>` real do DOM para o botão "Baixar PNG" ler de volta via `toDataURL`; `generateQrDataUrl` continua sendo o helper equivalente testável em Node, exercitado pela suíte de testes
- Estado `readyUrl` (comparado com `publicUrl` no render) usado em vez de um boolean com `setState` síncrono no efeito, evitando o mesmo erro de lint (`react-hooks/set-state-in-effect`) já corrigido no plan 02-05 — resolvido diretamente na implementação, sem precisar de um commit de correção separado

## Deviations from Plan

Nenhum defeito de implementação encontrado — plano executado (fora de banda) exatamente como escrito. A escolha de `readyUrl` derivado (em vez de um boolean `setState` síncrono) segue a mesma disciplina já estabelecida no fix do plan 02-05 para a mesma regra de lint — aplicada proativamente ali, não uma correção pós-commit.

### Auto-fixed Issues (fechamento desta sessão)

**1. [Rule 2 - tracking] Tabela de rastreabilidade em `REQUIREMENTS.md` desatualizada para LOJA-03/LOJA-04**
- **Encontrado durante:** fechamento formal desta sessão (checagem de "Artifacts this plan produces" / requirements)
- **Problema:** os checkboxes `- [x] LOJA-03` / `- [x] LOJA-04` na seção "Requisitos v1" já estavam marcados, mas a tabela "Rastreabilidade" no fim do arquivo ainda listava ambos como `Pendente` — o commit de fechamento anterior (`194e57c`, fora de banda) atualizou `STATE.md`/`ROADMAP.md` mas não tocou `REQUIREMENTS.md`.
- **Fix:** `gsd-tools query requirements.mark-complete LOJA-03 LOJA-04` para sincronizar a tabela de rastreabilidade com os checkboxes já marcados.
- **Arquivos modificados:** `.planning/REQUIREMENTS.md`
- **Commit:** (ver commit de fechamento desta sessão)

## Issues Encountered
Nenhum. `npx tsc --noEmit`, `npx eslint` e `npm run build` limpos (só os erros pré-existentes e fora de escopo em `tests/supabase/server-cookies.test.ts`, já registrados em `deferred-items.md`). Um `curl` deslogado contra um servidor de dev local confirmou o redirect `307` para `/login` em `/configuracoes` (guard inalterado por este plano).

## User Setup Required
None - nenhuma configuração de serviço externo necessária.

## Next Phase Readiness
- As três seções de `/configuracoes` (Loja+WhatsApp, editor de slug, QR/copiar link) estão todas com implementação real — a Fase 2 (Link Compartilhável da Vitrine) está funcionalmente completa
- UAT interativo completo (D3/D4 acima — preview visual do QR, leitura por câmera real, colar o link copiado) ainda precisa de uma passada manual com uma conta logada de verdade, sinalizado como `human_judgment: true` no bloco de coverage
- Nenhum bloqueio identificado para o encerramento da Fase 2

---
*Phase: 02-link-compartilh-vel-da-vitrine*
*Completed: 2026-07-12*

## Self-Check: PASSED
