---
status: resolved
trigger: "UAT Phase 01: login com wifi desligado mostra 'Email ou senha inválidos' em vez de erro de rede/conexão"
created: 2026-07-11T00:00:00Z
updated: 2026-07-14T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — `signInAction` (src/lib/auth/actions.ts:102-104) faz `if (error) return { error: 'Email ou senha inválidos' }` sem checar `error.name`, colapsando `AuthApiError` (credenciais realmente rejeitadas) e `AuthRetryableFetchError` (fetch() falhou por falta de rede, status 0) na mesma mensagem genérica anti-enumeração.
test: rastreado o caminho de erro em `@supabase/auth-js` (`lib/fetch.js` -> `handleError()` -> `lib/GoTrueClient.js` -> `signInWithPassword` catch block) — confirmado via leitura do código-fonte instalado em node_modules.
expecting: N/A — hipótese confirmada por leitura direta do código-fonte, não requer teste em runtime.
next_action: nenhuma — modo find_root_cause_only, aguardando gap-closure plan para aplicar o fix (não aplicar aqui).

## Symptoms

expected: com wifi desligado, tentar logar em /login deveria mostrar uma mensagem de erro de conexão/rede (algo como "Não foi possível conectar. Verifique sua internet.")
actual: mostra "Email ou senha inválidos" — implica que a senha está errada, quando na verdade a requisição nunca chegou ao servidor Supabase
errors: nenhum erro visível ao usuário além do toast genérico "Email ou senha inválidos"; internamente o erro real é `AuthRetryableFetchError` (name), status 0
reproduction: desligar wifi (mantendo apenas loopback local, já que o dev server roda em localhost) -> ir para /login -> submeter email/senha válidos -> toast mostra mensagem de credenciais inválidas em vez de erro de rede
started: desde a implementação original de signInAction (Plan 01-03) — nunca existiu tratamento diferenciado

## Eliminated

(nenhuma hipótese eliminada — primeira hipótese testada foi confirmada diretamente por leitura de código)

## Evidence

- timestamp: 2026-07-11T00:00:00Z
  checked: src/lib/auth/actions.ts (signInAction, linhas 85-107)
  found: |
    linhas 97-104:
    ```
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return { error: 'Email ou senha inválidos' };
    }
    ```
    Nenhuma inspeção de `error.name`, `error.status`, ou uso de `isAuthApiError`/`isAuthRetryableFetchError`. QUALQUER truthy `error` retorna a mesma string.
  implication: confirma que o catch-all é o ponto único de colapso de todos os tipos de erro.

- timestamp: 2026-07-11T00:00:00Z
  checked: node_modules/@supabase/auth-js/dist/module/lib/errors.js
  found: |
    `AuthApiError extends AuthError` (erro real de API — ex.: "Invalid login credentials", status 400).
    `AuthRetryableFetchError extends CustomAuthError extends AuthError` (erro de rede/fetch, status 0 quando `error.status` é undefined).
    Ambos são exportados junto com `isAuthApiError(error)` e `isAuthRetryableFetchError(error)` — helpers de type-narrowing prontos para uso.
  implication: existe uma forma oficial e já disponível de distinguir os dois tipos de erro sem parsing de string frágil.

- timestamp: 2026-07-11T00:00:00Z
  checked: node_modules/@supabase/auth-js/dist/module/lib/fetch.js (linhas 25-38, 111-126)
  found: |
    `handleError()`: se `error instanceof AuthApiError` faz throw direto; senão, se `error.status` indefinido/ausente OU erro genérico de fetch, faz `throw new AuthRetryableFetchError(_getErrorMessage(error), 0)`.
    Comentário explícito na linha 113: "// fetch failed, likely due to a network or CORS error".
  implication: confirma que uma falha de `fetch()` real (TypeError: fetch failed, típico de wifi desligado) é capturada e relançada como `AuthRetryableFetchError` com status 0 — nunca chega como exceção não tratada.

- timestamp: 2026-07-11T00:00:00Z
  checked: node_modules/@supabase/auth-js/dist/module/GoTrueClient.js (signInWithPassword, linhas 911-960)
  found: |
    O método `signInWithPassword` envolve a chamada em `try/catch`; no catch, `if (isAuthError(error)) return { data: {...}, error }` — ou seja, tanto `AuthApiError` quanto `AuthRetryableFetchError` (ambos subclasses de `AuthError`) são retornados como o campo `error` da tupla `{ data, error }`, nunca lançados como exceção não capturada no nível do Server Action.
  implication: `signInAction` SEMPRE recebe um `error` truthy tanto para credenciais erradas quanto para falta de rede — a única forma de diferenciar é inspecionar `error.name`/`error.status`, o que o código atual não faz.

- timestamp: 2026-07-11T00:00:00Z
  checked: node_modules/@supabase/supabase-js/dist/index.mjs (linha 9)
  found: "`export * from \"@supabase/auth-js\"`" — `isAuthRetryableFetchError`/`isAuthApiError`/`AuthRetryableFetchError` já estão disponíveis via `import { ... } from \"@supabase/supabase-js\"` sem dependência direta adicional em `@supabase/auth-js`.
  implication: o fix pode importar os helpers diretamente do pacote já em uso (`@supabase/supabase-js`), sem novas dependências.

- timestamp: 2026-07-11T00:00:00Z
  checked: .planning/phases/01-funda-o-conta-e-isolamento-multi-tenant/01-03-SUMMARY.md (Decisions Made, linha 155; Task doc-comment linhas 80-84)
  found: |
    Decisão documentada: "Mensagens de erro de signInAction são idênticas tanto para email malformado quanto para credenciais erradas ('Email ou senha inválidos') — nunca diferenciar, para não vazar se a validação de formato falhou vs. a senha está errada."
    O escopo da decisão é explicitamente sobre CREDENCIAIS (formato de email vs. senha errada) — nenhuma menção a falhas de rede/conectividade em nenhum lugar do SUMMARY, do PLAN ou do comentário de código-fonte (linhas 80-84 de actions.ts).
  implication: a mensagem genérica anti-enumeração foi projetada deliberadamente SÓ para o caso onde a requisição chegou ao Supabase e este rejeitou a credencial (ou onde o zod local rejeitou o formato). Falha de rede é um caso que a decisão original nunca considerou — não é um trade-off de segurança intencional, é uma lacuna (o catch-all ficou amplo demais e engoliu um caso que não deveria).

## Resolution

root_cause: |
  `src/lib/auth/actions.ts`, linhas 102-104 dentro de `signInAction`:
  ```ts
  if (error) {
    return { error: 'Email ou senha inválidos' };
  }
  ```
  Este bloco trata QUALQUER valor truthy de `error` retornado por `supabase.auth.signInWithPassword(...)` como uma rejeição de credencial, sem checar `error.name` (ou usar os helpers `isAuthApiError`/`isAuthRetryableFetchError` exportados por `@supabase/supabase-js`, que re-exporta tudo de `@supabase/auth-js`). Quando não há conectividade de rede, a chamada `fetch()` interna do `@supabase/auth-js` falha e é capturada por `handleError()` (`node_modules/@supabase/auth-js/dist/module/lib/fetch.js:111-114`), que a relança como `AuthRetryableFetchError` com `status: 0` — não como `AuthApiError`. `GoTrueClient.signInWithPassword` captura esse erro internamente (`isAuthError(error)` é true para ambos os tipos, pois `AuthRetryableFetchError` também estende `AuthError`) e o retorna normalmente no campo `error` da tupla `{ data, error }`, em vez de lançar uma exceção. Ou seja: o Server Action nunca vê uma exceção de rede não tratada — ele vê um objeto `error` com `.name === 'AuthRetryableFetchError'`, indistinguível do `.name === 'AuthApiError'` de credenciais erradas SEM inspecionar o campo `.name`/`.status`. Como o código só faz `if (error)`, ambos os casos caem na mesma mensagem.

fix: |
  NÃO É CONFLITO com o padrão anti-enumeração — são escopos diferentes. A mensagem genérica "Email ou senha inválidos" deve continuar sendo usada para QUALQUER falha real de credencial (para não vazar se o email existe), mas isso nunca cobriu, por design, o caso de "a requisição nem saiu do servidor". Fix recomendado (mínimo, sem enfraquecer a mitigação anti-enumeração):

  ```ts
  import { isAuthRetryableFetchError } from "@supabase/supabase-js";
  // ...
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (isAuthRetryableFetchError(error)) {
      return { error: "Não foi possível conectar. Verifique sua internet e tente novamente." };
    }
    return { error: 'Email ou senha inválidos' };
  }
  ```

  Checar `isAuthRetryableFetchError(error)` PRIMEIRO (antes do fallback genérico) preserva 100% o comportamento anti-enumeração para toda falha de credencial real (`AuthApiError`, incluindo "Invalid login credentials", rate limiting de auth, etc. continuam retornando a mensagem genérica) e adiciona uma mensagem distinta e honesta apenas para o caso de rede/conectividade — que não carrega nenhuma informação sobre a existência da conta, então não há risco de enumeração ao diferenciá-lo.

  Mesma lacuna existe em `signUpAction` (linha 52-54) — `signUpError?.message ?? "Não foi possível criar a conta..."` usa `signUpError.message` diretamente (não colapsa tudo numa string fixa), então já tende a repassar `AuthRetryableFetchError`'s message ("fetch failed" ou similar) ao usuário, o que também não é uma mensagem clara de "sem conexão" — vale considerar o mesmo tratamento ali para consistência, mas o bug relatado é especificamente sobre `signInAction`.

verification: |
  Fix já havia sido aplicado em signInAction no commit b0e1fb3 (Plan 01-07), mas este arquivo
  nunca foi atualizado para status: resolved (bookkeeping desatualizado, achado ao revisar
  progresso em 2026-07-14). A mesma lacuna em signUpAction (mencionada na seção Resolution
  original) foi fechada agora: signUpAction também checa isAuthRetryableFetchError antes do
  fallback genérico. `npx tsc --noEmit` limpo nos arquivos alterados; `npx vitest run tests/auth/`
  12/12 passou.
files_changed: ["src/lib/auth/actions.ts"]
