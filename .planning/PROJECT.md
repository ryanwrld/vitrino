# Vitrino

## What This Is

Vitrino é um micro-SaaS que transforma o catálogo informal de um revendedor de chuteiras importadas (hoje espalhado em Yupoo em mandarim, pastas do Drive ou fotos soltas no WhatsApp) em uma página de catálogo profissional em português — com produtos, tamanhos disponíveis, preços em BRL e botão de pedido direto no WhatsApp do revendedor. O cliente final escolhe modelo e tamanho na vitrine pública e manda mensagem já pronta, sem o revendedor precisar estar online.

## Core Value

O cliente final consegue escolher um modelo e tamanho na vitrine e disparar uma mensagem de pedido pronta no WhatsApp do revendedor — sem fricção, sem cadastro, sem o revendedor precisar estar online. Se esse fluxo quebrar, travar ou abrir a mensagem errada, o produto não tem valor nenhum.

## Business Context

- **Customer**: Revendedor BR de chuteiras importadas, 20-35 anos, não técnico, já opera via WhatsApp/Instagram
- **Revenue model**: Freemium planejado (Free/Pro), mas **sem cobrança ativa no MVP** — todo revendedor fica no Free no lançamento. Monetização é pós-validação, não v1
- **Success metric**: Nº de revendedores que criam a vitrine e recebem pelo menos 1 pedido via WhatsApp através dela
- **Strategy notes**: Lançamento pensado como validação — poucos revendedores (dezenas) nos primeiros meses, sem pressão de escala imediata

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Cadastro e login do revendedor (email/senha, sem OAuth no MVP)
- [ ] CRUD completo de produtos (nome, marca, solado, categoria, modalidade, preço, tamanhos, até 5 fotos, descrição, status)
- [ ] Configuração da loja (nome, logo, cor de destaque, frase de apresentação)
- [ ] Configuração de WhatsApp (número com validação/formatação, template de mensagem com variáveis)
- [ ] Vitrine pública (sem login) com filtros por marca, solado e modalidade
- [ ] Seleção de tamanho + botão "Pedir agora" abrindo WhatsApp com mensagem pré-formatada e corretamente encodada
- [ ] Link personalizável (slug único) + QR Code para download
- [ ] Métricas básicas (acessos, produtos mais vistos, cliques no botão WhatsApp)
- [ ] Dashboard com métricas resumidas e lista de produtos recentes

### Out of Scope

- Cobrança/gateway de pagamento (Stripe etc.) — monetização adiada para depois da validação do produto
- OAuth login — email/senha é suficiente para o MVP, público não-técnico
- Importação via planilha (CSV) / integração com Yupoo — nice to have de roadmap futuro
- Múltiplos catálogos por revendedor (pronta entrega + sob encomenda separados) — nice to have futuro
- Analytics avançado — contagem simples de eventos (pageview, clique) é suficiente no MVP
- Notificação por email de produto esgotado — roadmap futuro

## Context

**Identidade visual:**
- Paleta: verde escuro `#0D3D2B` (fundo/destaque), verde vibrante `#00C46A` (CTAs, badges disponível), branco `#FFFFFF`, cinza claro `#F5F5F3`, preto suave `#111111`, cinza médio `#6B6B6B`, vermelho suave `#FF4D4D` (badge esgotado)
- Tipografia: Syne 700 para display/títulos, Inter 400/500 para body/interface (Google Fonts). Base 16px, escala 12/14/16/20/28/40px
- Border radius: 12px cards, 8px botões, 999px pills/badges
- Animações: entrada de cards com fade+slide-up e stagger de 80ms; hover com elevação (translateY -4px, 200ms); pulse leve no botão WhatsApp idle; transições suaves em filtros; skeleton loader antes de carregar

**Perfis de acesso:**
- Revendedor (admin): cadastra/gerencia produtos, configura loja e WhatsApp, gera link público, vê métricas básicas
- Cliente final: acessa vitrine pública sem login, filtra, seleciona tamanho, dispara pedido no WhatsApp

**Fluxo de pedido (a conversão que importa):**
Cliente seleciona tamanho disponível → botão "Pedir agora" ativa → abre WhatsApp com mensagem pré-formatada (modelo, solado, tamanho, preço). Se clicar sem selecionar tamanho, deve haver shake animation + tooltip "Selecione um tamanho" — nunca abrir a mensagem incompleta.

**Alertas críticos de desenvolvimento (levar a sério sem exceção):**
1. O fluxo WhatsApp é a única conversão que importa — testar exaustivamente em Android/iOS, Chrome/Safari/Samsung Internet, números com e sem DDI/espaços
2. Mobile é a plataforma principal, não secundária — tudo mobile-first
3. Upload/exibição de imagem deve ser rápido e confiável — feedback visual, limite comunicado, compressão automática no servidor
4. Estado de estoque deve refletir o painel com delay máximo de segundos, nunca minutos
5. O link da vitrine é público — nenhum middleware de autenticação pode interceptar essa rota
6. Mensagem do WhatsApp deve passar por `encodeURIComponent` — testar com acentos e caracteres especiais

**Bugs que não podem ser cometidos (catálogo de erros conhecidos):**
1. Botão "Pedir agora" ativo sem tamanho selecionado
2. Pills de tamanho esgotado clicáveis (precisam de `pointer-events: none` + visual riscado)
3. Slug duplicado sem validação em tempo real
4. Imagem sem fallback visual quando a URL quebra
5. Filtros sem estado persistido na URL (query params) — quebra compartilhamento de link filtrado
6. Upload de imagem sem limite de tamanho (recomendado: 5MB com aviso antes do erro)
7. Número de WhatsApp sem validação/formatação para padrão internacional (`5511999999999`)
8. Vitrine renderizando todos os produtos de uma vez — precisa paginação/infinite scroll (~20 produtos por carga)
9. Ações do painel (salvar, excluir, marcar esgotado) sem feedback visual imediato (toast)
10. Sessão expirando silenciosamente e perdendo trabalho não salvo do revendedor

**Copy principal:**
- CTA: "Criar minha vitrine grátis"
- Headline: "Seu catálogo de chuteiras em português, funcionando 24h"
- Sub: "Pare de mandar foto por foto. Compartilhe um link, receba pedidos prontos no WhatsApp."

**Template padrão de mensagem WhatsApp:**
```
Olá! Vi sua vitrine e tenho interesse no seguinte produto:

Modelo: {modelo}
Solado: {solado}
Tamanho: {tamanho}
Preço: R$ {preço}

Poderia confirmar a disponibilidade?
```

## Constraints

- **Tech stack (sugerido)**: Next.js 14 + Tailwind CSS (frontend), Supabase (auth + banco + storage), Vercel (hospedagem) — validar em research antes de travar
- **Mobile-first**: Cliente final acessa quase sempre via link compartilhado no WhatsApp/Instagram — qualquer feature que quebre no mobile não vai para produção
- **Rota pública sem auth**: A vitrine (`/loja/[slug]`) não pode ter nenhum middleware de autenticação
- **Encoding de URL**: Toda mensagem do WhatsApp precisa passar por `encodeURIComponent`
- **Performance de imagem**: Upload limitado a 5MB, compressão automática no servidor, fallback visual sempre presente
- **Sem cobrança no MVP**: Nenhuma integração de pagamento é necessária nesta fase — ver Business Context

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Sem cobrança/gateway de pagamento no MVP | Validar o produto (revendedores recebendo pedidos) antes de construir monetização | — Pending |
| Stack sugerida: Next.js 14 + Supabase + Vercel | Custo ~$0/mês em tier gratuito até ~500 usuários, velocidade de desenvolvimento | — Pending |
| Mobile-first em toda a interface | Cliente final acessa majoritariamente via link no WhatsApp/Instagram, no celular | — Pending |
| Sem OAuth no MVP, só email/senha | Simplicidade para revendedor não-técnico, reduz escopo de auth | — Pending |
| Lançamento como validação, escala pequena inicial | Poucos revendedores (dezenas) nos primeiros meses, sem pressão de escala | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-10 after initialization*
