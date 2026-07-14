---
status: resolved
trigger: "UAT of Phase 01, plan 01-05 - onboarding wizard form labels/placeholders render nearly invisible (dark text on black background)"
created: 2026-07-11T00:00:00Z
updated: 2026-07-14T00:00:00Z
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - project-wide CSS variable dark-mode media query (leftover create-next-app boilerplate) flips body background to near-black under `prefers-color-scheme: dark`, while all admin form labels use hardcoded literal hex colors (`text-[#111111]`, `text-[#0D3D2B]`) disconnected from the `--foreground`/`--background` theme variables, and `<main>` wrappers never set an explicit background - so labels render near-black-on-near-black whenever the viewer's OS/browser prefers dark mode.
test: read globals.css theme variables + every admin page's `<main>`/label/input classes
expecting: identical anti-pattern (no explicit main bg, hardcoded label hex colors, no color-scheme override) across all admin pages
next_action: none - diagnosis complete, handing to gap-closure plan

## Symptoms

expected: Form labels and placeholders in `/onboarding` (and other admin pages) render with clear, legible contrast regardless of the viewer's system color-scheme preference.
actual: Labels ("Nome da loja", "Logo (opcional)", "Cor de destaque", "Frase de apresentação...", "WhatsApp", "Template da mensagem de pedido") and placeholders render as dark/low-contrast text on a black background - nearly invisible per user screenshot.
errors: none (visual/CSS contrast bug, no console errors)
reproduction: Load `/onboarding` (or `/cadastro`, `/login`, `/dashboard`, `/esqueci-senha`, `/redefinir-senha`) on a device/browser with OS-level dark color-scheme preference enabled (e.g., macOS/iOS system dark mode, Windows dark mode, or a browser forcing dark via `prefers-color-scheme: dark`).
started: Present since scaffold (Plan 01-01 `next.js scaffold` commit `37daeb2`) - the offending `@media (prefers-color-scheme: dark)` block is the default `create-next-app` template CSS, never adapted when the fixed light-only admin design system was built in later plans (01-03, 01-04, 01-05).

## Eliminated

(none - root cause found on first evidence pass, no false leads)

## Evidence

- timestamp: 2026-07-11T00:00:00Z
  checked: src/app/globals.css
  found: |
    ```css
    :root {
      --background: #ffffff;
      --foreground: #171717;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --background: #0a0a0a;
        --foreground: #ededed;
      }
    }
    body {
      background: var(--background);
      color: var(--foreground);
      font-family: Arial, Helvetica, sans-serif;
    }
    ```
    This is the unmodified `create-next-app` boilerplate dark-mode flip. No `color-scheme` meta/CSS property is set anywhere, and no `next-themes`/dark toggle exists in the project (confirmed: CLAUDE.md explicitly says dark mode "not required for current scope").
  implication: Any visitor whose OS/browser prefers dark color scheme gets `body` background flipped to `#0a0a0a` (near-black) and `body` text color flipped to `#ededed` (near-white) automatically, with zero code-level awareness anywhere else in the app.

- timestamp: 2026-07-11T00:00:00Z
  checked: src/app/(admin)/onboarding/onboarding-wizard.tsx (lines 69-164)
  found: |
    `<main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">` (line 69) sets NO explicit background color class - it inherits whatever `body`'s `--background` variable resolves to.
    All labels use hardcoded literal hex Tailwind arbitrary-value classes, not theme tokens:
      - line 79: `<label ... className="text-sm font-medium text-[#111111]">Nome da loja</label>`
      - line 93: same pattern, "Logo (opcional)"
      - line 106: same pattern, "Cor de destaque"
      - line 121: same pattern, "Frase de apresentação..."
      - line 135: same pattern, "WhatsApp"
      - line 152: same pattern, "Template da mensagem de pedido"
      - line 71: h1 `text-[#0D3D2B]` (dark green)
    These hex values (`#111111`, `#0D3D2B`) were chosen assuming a white background and never reference `var(--foreground)` / the `@theme` tokens in globals.css - they are completely disconnected from the dark-mode media query.
    Inputs (lines 87, 101, 113, 129, 143, 159) DO set explicit `bg-white`, but set NO explicit text color - so per Tailwind Preflight's `input { color: inherit; }`, input/placeholder text inherits `color: var(--foreground)` from body, which becomes near-white (`#ededed`) in dark mode - producing a *second*, inverse contrast failure (near-white text on the input's white background) alongside the label failure.
  implication: In light mode (or no OS dark preference) this renders fine (dark labels on inherited white background). In dark mode, `<main>` displays a near-black background (inherited, unstyled) while labels keep their hardcoded near-black text -> near-zero contrast. This exactly matches the reported "dark/low-contrast text on a black background."

- timestamp: 2026-07-11T00:00:00Z
  checked: src/app/(admin)/cadastro/page.tsx, login/page.tsx, dashboard/page.tsx, esqueci-senha/page.tsx, redefinir-senha/page.tsx
  found: |
    Identical anti-pattern in every single admin page checked:
      - `<main>` never sets an explicit background class (relies on inherited body background)
      - Labels/headings use the same hardcoded hex classes: `text-[#111111]` (labels), `text-[#0D3D2B]` (h1/links), `text-[#6B6B6B]` (subtext), `text-[#FF4D4D]` (errors)
      - Inputs uniformly use `bg-white` with no explicit text color, inheriting `color: var(--foreground)`
    Confirmed present in: cadastro/page.tsx (lines 39, 41, 42, 49, 63), login/page.tsx (lines 37, 39, 40, 45, 59), dashboard/page.tsx (lines 16, 18, 19, 25), esqueci-senha/page.tsx (lines 44, 46, 47, 54), redefinir-senha/page.tsx (lines 52, 54, 55, 60, 74).
  implication: This is a project-wide styling defect, not isolated to the onboarding wizard. Every admin/auth page built in Plans 01-03/01-04/01-05 shares the exact same vulnerability and will exhibit the identical near-invisible-text bug for any real user with system dark-mode preference enabled (a very common default on macOS/iOS/Windows). The onboarding wizard is simply the one caught by UAT with a screenshot.

- timestamp: 2026-07-11T00:00:00Z
  checked: `grep -lE "prefers-color-scheme|color-scheme|dark:|next-themes" across src/`
  found: Only `src/app/page.tsx` (the unrelated default Next.js landing/demo page at `/`, not part of the admin flow) and `src/app/globals.css` reference dark mode / `dark:` variants. No admin/auth page, no shared layout, and no root `layout.tsx` sets `color-scheme` or any dark-mode-aware class.
  implication: Confirms there is no intentional dark theme support anywhere in the admin surface - the dark-mode flip is purely inherited boilerplate CSS with no corresponding design, and nothing overrides/disables it for the admin routes.

## Resolution

root_cause: |
  `src/app/globals.css` (lines 15-20) retains the unmodified `create-next-app` scaffold's
  `@media (prefers-color-scheme: dark) { :root { --background: #0a0a0a; --foreground: #ededed; } }`
  block, which flips the `<body>` background to near-black for any visitor whose OS/browser
  prefers a dark color scheme. Meanwhile, every admin page (onboarding-wizard.tsx and all of
  cadastro, login, dashboard, esqueci-senha, redefinir-senha `page.tsx` files) renders its
  `<main>` wrapper with no explicit background class (inheriting body's variable-driven
  background) and styles all labels/headings with hardcoded literal hex Tailwind arbitrary
  values (`text-[#111111]`, `text-[#0D3D2B]`, etc.) that are completely disconnected from the
  `--foreground`/`--background` CSS variables - i.e. they were designed assuming a permanent
  white background and never adapted when Next.js's default dark-mode media query was left
  in place. The project has no `next-themes`/dark-mode toggle and no `color-scheme` override,
  so the flip is silent and purely OS-driven. Result: near-black label text on a near-black
  inherited background whenever `prefers-color-scheme: dark` is active. A related, inverse
  contrast bug affects input text/placeholders: inputs explicitly set `bg-white` but no text
  color, so they inherit `color: var(--foreground)` (near-white in dark mode) via Tailwind
  Preflight's `input { color: inherit }`, producing near-white text on a white input background.
fix: |
  Applied in commit c0ef0a8 (Plan 01-06): removed the `@media (prefers-color-scheme: dark)`
  block from globals.css and set `color-scheme: light` explicitly on `:root`, so the app no
  longer flips background/foreground under OS dark-mode preference. `<main>` wrappers also
  carry explicit `bg-white`. This file was never updated to status: resolved (bookkeeping
  gap, found while reviewing project progress on 2026-07-14).
verification: confirmed by reading current globals.css and onboarding-wizard.tsx — no dark-mode media query remains, color-scheme: light is set, <main> has explicit bg-white.
files_changed: ["src/app/globals.css"]
