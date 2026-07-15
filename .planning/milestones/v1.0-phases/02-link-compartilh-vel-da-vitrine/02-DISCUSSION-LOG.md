# Phase 2: Link Compartilhável da Vitrine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-12
**Phase:** 2-Link Compartilhável da Vitrine
**Areas discussed:** Troca de slug, Tela de configurações, QR Code, Copiar link

---

## Troca de Slug

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-slugify | Converte automaticamente para minúsculas, sem acento, espaços viram hífens | ✓ |
| Validação estrita, sem conversão | Rejeita se não estiver já no formato certo | |
| Você decide | — | |

**User's choice:** Auto-slugify

| Option | Description | Selected |
|--------|-------------|----------|
| Quebra sem redirect | Link antigo dá 404; avisar antes de confirmar | ✓ |
| Redireciona automaticamente | Exige histórico de slugs | |
| Você decide | — | |

**User's choice:** Quebra sem redirect (404)

| Option | Description | Selected |
|--------|-------------|----------|
| Debounce enquanto digita | Feedback ~400ms após parar de digitar | ✓ |
| Só ao clicar salvar | Menos responsivo | |
| Você decide | — | |

**User's choice:** Debounce enquanto digita

| Option | Description | Selected |
|--------|-------------|----------|
| 3–30 caracteres | Cobre a maioria dos nomes de loja | ✓ |
| Sem limite fixo | Só unicidade | |
| Você decide | — | |

**User's choice:** 3–30 caracteres

---

## Tela de Configurações

| Option | Description | Selected |
|--------|-------------|----------|
| Nova rota /configuracoes | Separada do Dashboard | ✓ |
| Dentro do Dashboard | Embutida na mesma página | |
| Você decide | — | |

**User's choice:** Nova rota /configuracoes

| Option | Description | Selected |
|--------|-------------|----------|
| Reusar onboarding-wizard.tsx | Adapta o wizard existente pra modo edição | |
| Form novo do zero | Componente separado, não reaproveita o wizard multi-step | ✓ |
| Você decide | — | |

**User's choice:** Form novo do zero
**Notes:** Lógica de validação/normalização (Zod, normalizeWhatsAppBR) continua reaproveitável — só o componente de form/wizard não é reaproveitado.

| Option | Description | Selected |
|--------|-------------|----------|
| Página única com seções | Loja, WhatsApp, Link/QR no mesmo scroll | ✓ |
| Abas separadas | Mais estrutura, mais cliques | |
| Você decide | — | |

**User's choice:** Página única com seções

| Option | Description | Selected |
|--------|-------------|----------|
| Ação separada com confirmação | Botão + diálogo próprio pro slug | ✓ |
| Tudo no mesmo botão Salvar | Um único submit pra tudo | |
| Você decide | — | |

**User's choice:** Ação separada com confirmação

---

## QR Code

| Option | Description | Selected |
|--------|-------------|----------|
| PNG | Formato universal | ✓ |
| SVG | Vetorial, menos usado por público não-técnico | |
| Você decide | — | |

**User's choice:** PNG

| Option | Description | Selected |
|--------|-------------|----------|
| QR simples, sem logo | Mais confiável de escanear | ✓ |
| Com logo no centro | Exige correção de erro alta, mais risco | |
| Você decide | — | |

**User's choice:** QR simples, sem logo

| Option | Description | Selected |
|--------|-------------|----------|
| Preview na tela + botão baixar | Revendedor confirma visualmente antes | ✓ |
| Download direto, sem preview | — | |
| Você decide | — | |

**User's choice:** Preview na tela + botão baixar

---

## Copiar Link

| Option | Description | Selected |
|--------|-------------|----------|
| Toast "Link copiado!" | Consistente com padrão sonner já usado no projeto | ✓ |
| Mudança inline no botão | Botão muda de texto/ícone temporariamente | |
| Você decide | — | |

**User's choice:** Toast "Link copiado!"

| Option | Description | Selected |
|--------|-------------|----------|
| Link visível + botão copiar | Campo readonly mostrando a URL completa | ✓ |
| Só botão, sem mostrar o texto | — | |
| Você decide | — | |

**User's choice:** Link visível + botão copiar

---

## Claude's Discretion

- Geração do QR Code client-side vs. Route Handler no servidor
- Texto exato de erro de validação do slug
- Mecanismo técnico de debounce (hook customizado vs. lib)

## Deferred Ideas

None — discussion stayed within phase scope.
