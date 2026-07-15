# Fase 1: Fundação, Conta e Isolamento Multi-Tenant - Log de Discussão

> **Apenas trilha de auditoria.** Não usar como entrada para agentes de planejamento, pesquisa ou execução.
> Decisões estão capturadas no CONTEXT.md — este log preserva as alternativas consideradas.

**Data:** 2026-07-10
**Fase:** 1-Fundação, Conta e Isolamento Multi-Tenant
**Áreas discutidas:** Verificação de email, Recuperação de senha, Aviso de sessão expirando, Pós-cadastro

---

## Verificação de email

Área apresentada mas não selecionada explicitamente para aprofundamento; tratada implicitamente pela decisão de acesso imediato sem bloqueio de verificação (ver D-01 no CONTEXT.md). Considerada e descartada para o MVP.

---

## Recuperação de senha

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Incluir nesta fase | Adicionar "esqueci minha senha" via link de email agora | ✓ |
| Deixar fora do MVP | Revendedor sem acesso até reset manual pelo banco de dados | |
| Deixe-me explicar | Outra abordagem | |

**Escolha do usuário:** Incluir nesta fase (Recomendado)
**Notas:** Gerou novo requisito AUTH-05, não previsto originalmente em REQUIREMENTS.md v1. Adicionado ao arquivo após a discussão.

---

## Aviso de sessão expirando

Usuário inicialmente não entendeu a pergunta ("NÃO ENTENDI A TERCEIRA ALTERNATIVA"). Explicação em texto livre foi fornecida (o que significa "sessão", por que o requisito existe) antes de apresentar novamente as opções.

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Só avisar se falhar | Renovação silenciosa em segundo plano; aviso só se a renovação falhar de verdade | ✓ |
| Sempre mostrar contador | Contador visível de tempo restante de sessão, mesmo funcionando normalmente | |

**Escolha do usuário:** Opção 1 — só avisar se falhar
**Notas:** Usuário pediu explicação em linguagem simples e prática antes de decidir; conceito de "sessão" explicado com analogia ao Instagram.

---

## Pós-cadastro

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Direto pro Dashboard vazio (Recomendado) | Como no documento original — mantém Fase 1 focada em conta/sessão/isolamento | |
| Mini-onboarding primeiro | Antecipa parte da Fase 2 para dentro da Fase 1 | ✓ |
| Deixe-me explicar | Outra ideia | |

**Follow-up — o que entra no onboarding:**

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Só nome da loja + WhatsApp (Recomendado) | Mínimo para a loja existir e o fluxo de pedido funcionar | |
| Tudo da configuração da loja de uma vez | Nome, logo, cor, frase E WhatsApp já no cadastro | ✓ |
| Deixe-me explicar | Outra combinação de campos | |

**Confirmação estrutural:**

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Sim, confirmo | Fase 1 cresce para incluir o wizard completo; Fase 2 vira "editar depois" | ✓ |
| Prefiro manter simples (Recomendado) | Voltar para "apenas nome da loja + WhatsApp"; logo/cor/frase ficam na Fase 2 | |

**Escolha do usuário:** Mini-onboarding com toda a configuração da loja (nome, logo, cor, frase, WhatsApp) antes do Dashboard — confirmado mesmo com o aviso de que isso expande o escopo da Fase 1 e reduz o da Fase 2.
**Notas:** Decisão registrada como nota estrutural em CONTEXT.md; REQUIREMENTS.md atualizado para refletir que LOJA-01, WPP-01 e WPP-02 têm sua UI antecipada para a Fase 1, mesmo mantendo o mapeamento formal de fase original na tabela de rastreabilidade com uma anotação.

---

## Decisão do Claude (discricionário)

- Layout exato do onboarding (tela única vs. wizard multi-step) — decisão de implementação, não de produto.
- Estratégia técnica de sessão (cookies httpOnly do Supabase Auth) — decisão de arquitetura.

## Ideias Adiadas

- Verificação de email obrigatória no cadastro — descartada para o MVP, pode voltar em v2 se abuso de contas virar problema real.
- Ajuste formal do roadmap (`/gsd:phase`) para refletir a expansão de escopo da Fase 1 — sugerido ao usuário, não executado nesta sessão.
