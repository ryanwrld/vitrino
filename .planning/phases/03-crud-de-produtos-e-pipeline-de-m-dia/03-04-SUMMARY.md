---
phase: 03-crud-de-produtos-e-pipeline-de-m-dia
plan: 04
subsystem: media-pipeline
tags: [nextjs, server-actions, supabase-storage, browser-image-compression, dnd-kit, rls]

# Dependency graph
requires:
  - phase: 03-02
    provides: "saveProduct, getOwnedStore(), product-form.tsx (seção 5 reservada para fotos)"
provides:
  - "validatePhotoFile/photoExtension/uploadAndInsertPhotos (src/lib/products/actions.ts) — validação de magic bytes + 5MB + recontagem server-side compartilhada"
  - "addProductPhotos/updatePhotoOrder/removePhoto (Server Actions dedicadas de foto)"
  - "deleteProductPhotosStorage (helper exportado para o Plan 03-05 usar na exclusão de produto)"
  - "PhotoUploader (src/app/(admin)/produtos/photo-uploader.tsx) — grade de 5 slots, compressão client, drag-and-drop, capa, remoção individual"
affects: [03-05, 03-06]

# Tech tracking
tech-stack:
  added:
    - "browser-image-compression@2.0.2"
    - "@dnd-kit/core@6.3.1"
    - "@dnd-kit/sortable@10.0.0"
    - "@dnd-kit/utilities@3.2.2"
  patterns:
    - "uploadAndInsertPhotos: helper compartilhado por saveProduct (criação) e addProductPhotos (edição) — nunca duas implementações divergentes do mesmo pipeline de validação/recontagem/upload"
    - "updatePhotoOrder em duas fases (offset negativo temporário -> posições finais) para nunca violar UNIQUE(product_id, position) ao reordenar"
    - "PhotoUploader com dois modos (criação: File[] pendente via onPendingFilesChange; edição: Server Actions chamadas imediatamente) sob o mesmo componente"
    - "localSlotId() com fallback não-criptográfico quando crypto.randomUUID() está indisponível (contexto inseguro, ex.: teste via IP local em HTTP)"

key-files:
  created:
    - tests/products/photo-upload.test.ts
    - src/app/(admin)/produtos/photo-uploader.tsx
  modified:
    - src/lib/products/actions.ts
    - src/app/(admin)/produtos/product-form.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "Fotos entram via action dedicada addProductPhotos(productId, formData), reusada tanto no submit de criação (chamada internamente por saveProduct, que aceita formData.getAll('photos')) quanto no modo edição (Plan 03-05)"
  - "updatePhotoOrder usa estratégia de duas fases (offset negativo -> posição final) para respeitar UNIQUE(product_id, position) sem quebrar no meio da operação"
  - "PhotoUploader recarrega fotos salvas via client de browser (createClient + getPublicUrl) após addProductPhotos, em vez de estender o retorno da Server Action só para isso"
  - "[pós-checkpoint, aplicado pelo orquestrador] handleFilesSelected copia o FileList para array ANTES de limpar input.value (Edge/Chromium perdia a seleção); crypto.randomUUID() trocado por localSlotId() com fallback, pois exige contexto seguro (HTTPS/localhost) e falhava testando via IP local em HTTP — commit f8be197"

requirements-completed: [PROD-03, PROD-07]

coverage:
  - id: D1
    description: "validatePhotoFile rejeita magic bytes que não batem com o content-type declarado e arquivos > 5MB, com mensagens do Copywriting Contract"
    requirement: PROD-03
    verification:
      - kind: integration
        ref: "tests/products/photo-upload.test.ts (magic bytes inválidos, >5MB)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Recontagem server-side (existentes + novas) rejeita a 6ª foto sem inserir nada (Pitfall 6, T-03-03)"
    requirement: PROD-03
    verification:
      - kind: integration
        ref: "tests/products/photo-upload.test.ts (limite de 5, recontagem)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Upload persiste position sequencial (0=capa) e storage_path com UUID no formato {owner_id}/{product_id}/{uuid}.{ext}"
    requirement: PROD-03
    verification:
      - kind: integration
        ref: "tests/products/photo-upload.test.ts (3 fotos válidas, position 0/1/2, formato de path)"
        status: pass
    human_judgment: false
  - id: D4
    description: "updatePhotoOrder reordena via UPDATE de position (nunca renomeia blob) e afeta 0 linhas cross-tenant (RLS, T-03-10)"
    requirement: PROD-03
    verification:
      - kind: integration
        ref: "tests/products/photo-upload.test.ts (reorder + cross-tenant)"
        status: pass
    human_judgment: false
  - id: D5
    description: "removePhoto remove a linha (+ storage best-effort) e não afeta/expõe fotos de outra loja (RLS)"
    requirement: PROD-03
    verification:
      - kind: integration
        ref: "tests/products/photo-upload.test.ts (remove + cross-tenant)"
        status: pass
    human_judgment: false
  - id: D6
    description: "PhotoUploader: 5 slots, compressão client (EXIF corrigido), badge Capa só na posição 1, drag handle reordena por toque/mouse/teclado, remover individual, limite de 5 na UI"
    verification: []
    human_judgment: true
    rationale: "EXIF/orientação de câmera real, drag-and-drop por toque e limite de 5 na UI não são cobríveis por teste headless automatizado — verificado no checkpoint humano em dispositivo móvel real (aprovado pelo usuário: EXIF, limite de 5 e drag-and-drop por toque funcionaram)"

duration: ~2h15min (inclui pausa para checkpoint humano em dispositivo móvel)
completed: 2026-07-13
status: complete
---

# Phase 3 Plan 4: Pipeline de Fotos de Produto Summary

**Upload de até 5 fotos por produto com compressão client-side (browser-image-compression, EXIF corrigido), validação de magic bytes + 5MB + recontagem server-side, e reordenação drag-and-drop (@dnd-kit) com capa = posição 1.**

## Performance

- **Duration:** ~2h15min (inclui pausa para checkpoint humano de verificação em dispositivo móvel real; tempo de execução ativa das Tasks 1-3 foi de ~50min)
- **Started:** 2026-07-13T15:19:31Z (após docs do 03-03)
- **Completed:** 2026-07-13T17:xx:00Z
- **Tasks:** 4 (3 automatizadas + 1 checkpoint humano)
- **Files modified:** 6 (2 criados, 4 modificados)

## Accomplishments
- Teste de integração real (`tests/products/photo-upload.test.ts`) cobrindo magic bytes inválidos, arquivo >5MB, recontagem server-side do limite de 5 (Pitfall 6), persistência de `position` sequencial, `updatePhotoOrder` (incl. cross-tenant) e `removePhoto` (incl. cross-tenant) — começou vermelho (Task 1), ficou verde após a Task 2
- `validatePhotoFile`/`photoExtension` (mesmo padrão de `validateLogoFile`) + `uploadAndInsertPhotos`, helper compartilhado entre `saveProduct` (criação) e a nova action `addProductPhotos` (edição) — nunca duas implementações divergentes do pipeline de validação/recontagem/upload
- `updatePhotoOrder`: estratégia de duas fases (offset negativo temporário → posições finais) para nunca violar a constraint `UNIQUE(product_id, position)` ao reordenar
- `removePhoto`: remove a linha + storage best-effort, nunca prossegue "às cegas" se não conseguir ler o `storage_path` (RLS bloqueia cross-tenant)
- `deleteProductPhotosStorage`: helper exportado, pronto para o Plan 03-05 reusar na exclusão de produto (limpeza de blobs órfãos, Pitfall 1)
- `photo-uploader.tsx`: grade de 5 slots (vazio/preenchido/enviando), compressão via `browser-image-compression` (Web Worker, correção EXIF automática — nunca refeita em outra camada), badge "Capa" só na posição 1, drag handle `@dnd-kit/sortable` (mouse/touch/teclado), remover "×" individual, limite de 5 respeitado na UI
- Dois modos no mesmo componente: criação (File[] pendente notificado ao `product-form.tsx` via `onPendingFilesChange`, anexado ao FormData de `saveProduct`) e edição (add/reorder/remove chamam as Server Actions dedicadas imediatamente — infraestrutura pronta para o Plan 03-05)
- Checkpoint humano em dispositivo móvel real aprovado: orientação EXIF correta, limite de 5 fotos, drag-and-drop por toque funcionaram
- 2 correções pós-checkpoint aplicadas pelo orquestrador (ver Deviations) para navegadores reais (Edge/Chromium e teste via IP de rede local em HTTP)

## Task Commits

Each task was committed atomically:

1. **Task 1: Teste de integração (RED) — validação e persistência de fotos** - `0b6e984` (test)
2. **Task 2: Server Actions de foto — validação, upload, reorder, remove** - `6524255` (feat)
3. **Task 3: photo-uploader.tsx — compressão client, 5 slots, drag-and-drop, remover, capa** - `b4b9c48` (feat)
4. **Task 4: [CHECKPOINT] Verificação humana do pipeline de fotos no mobile** - aprovado pelo usuário (sem commit próprio — verificação, não código)

**Correção pós-checkpoint (aplicada pelo orquestrador, fora do fluxo padrão do executor):** `f8be197` (fix) — ver Deviations

**Plan metadata:** (pendente — commit final de docs, ao final deste SUMMARY)

_Note: Task 1/2 seguiram o ciclo TDD RED→GREEN (teste criado vermelho, ficou verde após a Task 2 implementar `addProductPhotos`/`updatePhotoOrder`/`removePhoto`)._

## Files Created/Modified
- `tests/products/photo-upload.test.ts` - teste de integração real (magic bytes, 5MB, recontagem, reorder, remove, cross-tenant)
- `src/lib/products/actions.ts` - `validatePhotoFile`, `photoExtension`, `uploadAndInsertPhotos`, `addProductPhotos`, `updatePhotoOrder`, `removePhoto`, `deleteProductPhotosStorage`; `saveProduct` estendido para aceitar `formData.getAll("photos")`
- `src/app/(admin)/produtos/photo-uploader.tsx` - componente client: grade de 5 slots, compressão, drag-and-drop, capa, remoção
- `src/app/(admin)/produtos/product-form.tsx` - integra `<PhotoUploader />` na seção 5 (Fotos), anexa `pendingPhotoFiles` ao FormData no submit
- `package.json` / `package-lock.json` - `browser-image-compression`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

## Decisions Made
- Fotos entram via action dedicada `addProductPhotos(productId, formData)`, chamada internamente por `saveProduct` no fluxo de criação (mesmo FormData do formulário) e diretamente pelo modo edição (Plan 03-05) — nunca duas implementações do pipeline de validação/recontagem/upload.
- `updatePhotoOrder` usa duas fases (offset negativo temporário → posição final) para nunca violar `UNIQUE(product_id, position)` no meio da operação de reordenação.
- `PhotoUploader` recarrega as fotos salvas via client de browser (`createClient` + `getPublicUrl`) após `addProductPhotos`, em vez de estender o retorno da Server Action só para devolver a URL da foto recém-criada.
- `removePhoto` retorna `{error}` (não `{success}` com 0 efeito) quando a foto pertence a outra loja, porque a leitura do `storage_path` já falha sob RLS antes de qualquer tentativa de delete — comportamento seguro, difere ligeiramente da convenção de `markProductEsgotado`/`updatePhotoOrder` (que retornam `{success}` com 0 linhas afetadas), mas nunca vaza nem corrompe dado de outro tenant.

## Deviations from Plan

### Auto-fixed Issues

Nenhuma durante a execução das Tasks 1-3 (plano seguido conforme especificado, verificado via `npx vitest run tests/products/photo-upload.test.ts`, `npx tsc --noEmit` e `npm run lint` a cada task).

### Correção pós-checkpoint (aplicada pelo orquestrador durante a pausa do checkpoint humano)

**1. [Rule 1 - Bug] Seleção de foto perdida em alguns navegadores (Edge/Chromium)**
- **Found during:** verificação humana da Task 4 (checkpoint mobile)
- **Issue:** `handleFilesSelected` limpava `event.target.value = ""` antes de ler o `FileList` recebido; em alguns navegadores (Edge/Chromium), limpar o `value` esvazia a `FileList` referenciada, fazendo o upload retornar silenciosamente sem processar nenhum arquivo.
- **Fix:** copiar o `FileList` para um array (`Array.from(fileList)`) ANTES de limpar `event.target.value`.
- **Files modified:** `src/app/(admin)/produtos/photo-uploader.tsx`
- **Committed in:** `f8be197` (fix, aplicado pelo orquestrador durante a pausa do checkpoint)

**2. [Rule 1 - Bug] `crypto.randomUUID()` indisponível em contexto inseguro**
- **Found during:** verificação humana da Task 4 (testando via IP de rede local em HTTP puro, necessário para acessar o painel a partir do celular)
- **Issue:** `crypto.randomUUID()` exige contexto seguro (HTTPS ou `localhost`) — falha ao acessar o dev server via IP de rede local em HTTP puro, quebrando a criação do `localId` de slots pendentes (modo criação).
- **Fix:** novo helper `localSlotId()` com fallback não-criptográfico (`Date.now()` + `Math.random()`) quando `crypto.randomUUID` não está disponível. Este id é apenas uma key de UI para um slot ainda não enviado (nunca persiste no banco — o path real de storage continua usando `crypto.randomUUID()` no servidor, `src/lib/products/actions.ts`, onde o contexto é sempre seguro), então o fallback não-criptográfico é suficiente.
- **Files modified:** `src/app/(admin)/produtos/photo-uploader.tsx`
- **Committed in:** `f8be197` (fix, aplicado pelo orquestrador durante a pausa do checkpoint)

---

**Total deviations:** 2 correções pós-checkpoint (ambas Rule 1 — bugs de compatibilidade de navegador/contexto descobertos apenas em teste real de dispositivo móvel, não reproduzíveis em teste headless)
**Impact on plan:** Nenhum impacto nos critérios de aceitação do plano — ambas as correções são estritamente dentro do escopo de `photo-uploader.tsx` (já em `files_modified`), sem mudança de arquitetura ou comportamento visível além de corrigir os dois bugs. Confirmado: `npx tsc --noEmit` e `npm run lint` seguem limpos após as correções (mesma contagem pré-existente de problemas fora de escopo).

## Issues Encountered

- **"Request rate limit reached" do Supabase Auth em execuções cumulativas de `npm test`** — comportamento pré-existente da infraestrutura de testes (sem emulador local de Supabase Auth; cada teste de integração faz `signUp` real contra o projeto Supabase remoto), já documentado em `02-05-SUMMARY.md`. Confirmado não-relacionado a esta wave: `npx vitest run tests/products/photo-upload.test.ts` (8/8) e `npx vitest run tests/products/` (16/16) passaram integralmente em execuções isoladas logo após cada task. A suíte completa (`npm test`) foi executada duas vezes ao final desta wave — a primeira com paralelismo padrão (32/101 falhas, 100% delas "Request rate limit reached", zero falhas de lógica de negócio) e a segunda com `--no-file-parallelism` para espaçar os `signUp`s (11/101 falhas, mesma causa exclusiva). Nenhuma falha de asserção de comportamento em nenhuma das execuções — só esgotamento de cota de signup do projeto de teste. Documentado em `deferred-items.md` (Plan 03-04). Não corrigido — fora de escopo; reforça o sinalizado em 02-05-SUMMARY.md para uma futura fase considerar um stub local de Supabase Auth.
- **Ressalva sobre o checkpoint (Task 4), passo 7 do how-to-verify:** o roteiro do checkpoint pedia "salvar o produto e reabrir na edição" para confirmar persistência de ordem — mas a rota `/produtos/[id]/editar` só é entregue no Plan 03-05 (dependente, ainda não executado neste momento da wave). A infraestrutura de edição do `PhotoUploader` (`productId`/`initialPhotos`/chamadas imediatas às Server Actions) já está pronta e não foi exercida ao vivo por essa rota ainda inexistente. Os passos 1-6 (criação, EXIF, limite de 5, drag-and-drop por toque, remoção) foram verificados e aprovados pelo usuário no dispositivo móvel real. Recomenda-se revalidar o passo 7 quando o Plan 03-05 entregar a rota de edição.

## User Setup Required

None - nenhuma configuração externa manual necessária (o bucket `product-images` e as policies de storage já foram aplicados na Wave 1, Plan 03-01).

## Next Phase Readiness
- Pipeline de fotos completo e testado (upload, validação, reorder, remove), com infraestrutura de modo-edição já pronta em `PhotoUploader`/`addProductPhotos`/`updatePhotoOrder`/`removePhoto` para o Plan 03-05 consumir diretamente (passar `productId` + `initialPhotos` reais).
- `deleteProductPhotosStorage` já exportado e pronto para o Plan 03-05 chamar antes/depois do `DELETE FROM products` (limpeza de blobs órfãos, Pitfall 1).
- Nenhum blocker identificado para 03-05, exceto a ressalva já documentada sobre revalidar o passo 7 do checkpoint (persistência de ordem após reabrir em edição) assim que a rota de edição existir.

---
*Phase: 03-crud-de-produtos-e-pipeline-de-m-dia*
*Completed: 2026-07-13*

## Self-Check: PASSED

- FOUND: tests/products/photo-upload.test.ts
- FOUND: src/app/(admin)/produtos/photo-uploader.tsx
- FOUND: src/lib/products/actions.ts
- FOUND: src/app/(admin)/produtos/product-form.tsx
- FOUND: .planning/phases/03-crud-de-produtos-e-pipeline-de-m-dia/03-04-SUMMARY.md
- FOUND: commit 0b6e984 (Task 1)
- FOUND: commit 6524255 (Task 2)
- FOUND: commit b4b9c48 (Task 3)
- FOUND: commit f8be197 (correção pós-checkpoint, aplicada pelo orquestrador)
