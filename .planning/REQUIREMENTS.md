# Requisitos: Vitrino

**Definido em:** 2026-07-10
**Valor Central:** O cliente final consegue escolher um modelo e tamanho na vitrine e disparar uma mensagem de pedido pronta no WhatsApp do revendedor — sem fricção, sem cadastro, sem o revendedor precisar estar online.

## Requisitos v1

Requisitos para o lançamento inicial. Cada um mapeia para fases do roadmap.

### Autenticação

- [ ] **AUTH-01**: Revendedor pode criar conta com email e senha
- [ ] **AUTH-02**: Revendedor pode fazer login e permanecer logado entre sessões (refresh do navegador)
- [ ] **AUTH-03**: Revendedor pode fazer logout de qualquer página do painel
- [ ] **AUTH-04**: Sessão do revendedor é renovada automaticamente durante atividade, com aviso claro antes de expirar (sem perder trabalho não salvo)

### Loja

- [ ] **LOJA-01**: Revendedor pode configurar nome da loja, logo, cor de destaque e frase de apresentação (máx. 100 caracteres)
- [ ] **LOJA-02**: Revendedor pode definir um slug personalizado (vitrino.app/loja/[slug]) com validação de unicidade em tempo real
- [ ] **LOJA-03**: Revendedor pode gerar e baixar QR Code do link da vitrine
- [ ] **LOJA-04**: Revendedor pode copiar o link da vitrine com um clique

### WhatsApp

- [ ] **WPP-01**: Revendedor pode cadastrar o número de WhatsApp, validado e formatado automaticamente para o padrão internacional (ex: 5511999999999)
- [ ] **WPP-02**: Revendedor pode editar o template de mensagem padrão de pedido, com variáveis ({modelo}, {solado}, {tamanho}, {preço})

### Produtos

- [ ] **PROD-01**: Revendedor pode cadastrar produto com nome do modelo, marca, tipo de solado, categoria e modalidade (sob encomenda/pronta entrega/ambos)
- [ ] **PROD-02**: Revendedor pode definir preço em BRL e os tamanhos disponíveis (grid 36-45)
- [ ] **PROD-03**: Revendedor pode fazer upload de até 5 fotos por produto, com compressão automática no cliente e limite de 5MB por imagem
- [ ] **PROD-04**: Revendedor pode marcar produto (ou tamanho específico) como disponível ou esgotado
- [ ] **PROD-05**: Revendedor pode editar e excluir produtos existentes
- [ ] **PROD-06**: Revendedor pode listar, buscar por nome, filtrar (status/marca/solado) e ordenar produtos (mais recente/nome/preço) no painel
- [ ] **PROD-07**: Revendedor recebe feedback visual imediato (toast de sucesso/erro) ao salvar, editar, excluir ou marcar produto como esgotado

### Vitrine Pública

- [ ] **VITR-01**: Cliente final acessa a vitrine pública via link/slug sem necessidade de login ou cadastro
- [ ] **VITR-02**: Cliente final pode filtrar produtos por marca, solado e modalidade
- [ ] **VITR-03**: Estado de estoque (disponível/esgotado) exibido na vitrine reflete o painel do revendedor com delay máximo de segundos
- [ ] **VITR-04**: Vitrine carrega produtos paginados (~20 por carga) em vez de renderizar tudo de uma vez
- [ ] **VITR-05**: Imagem com erro de carregamento exibe um placeholder visual padrão, sem quebrar o layout do card

### Pedido (fluxo de conversão)

- [ ] **PED-01**: Cliente final precisa selecionar um tamanho disponível antes do botão "Pedir agora" ficar ativo/clicável
- [ ] **PED-02**: Tamanhos esgotados não são clicáveis/selecionáveis (visual riscado, `pointer-events: none`)
- [ ] **PED-03**: Botão "Pedir agora" abre o WhatsApp com mensagem pré-preenchida (modelo, solado, tamanho, preço), corretamente codificada via `encodeURIComponent`, testado com acentos e caracteres especiais
- [ ] **PED-04**: Se o cliente clicar em "Pedir agora" sem selecionar tamanho, o sistema exibe feedback claro (shake animation + tooltip "Selecione um tamanho") em vez de abrir mensagem incompleta

### Métricas

- [ ] **MTR-01**: Revendedor visualiza métricas básicas (acessos à vitrine, produtos mais visualizados, cliques no botão WhatsApp por produto)
- [ ] **MTR-02**: Dashboard exibe métricas resumidas (total de produtos, disponíveis, esgotados, acessos) e lista de produtos recentes

## Requisitos v2

Adiados para depois da validação do MVP ("revendedores criam vitrine e recebem ≥1 pedido pelo WhatsApp"). Rastreados mas não no roadmap atual.

### Produtos (pós-MVP)

- **PROD-v2-01**: Duplicar produto (agiliza cadastro de variações de cor/solado)
- **PROD-v2-02**: Marcar todos os tamanhos de um produto como esgotado com um clique
- **PROD-v2-03**: Importação de produtos via planilha (CSV)
- **PROD-v2-04**: Assistente de importação a partir de álbuns do Yupoo (cola link do álbum → puxa fotos) — diferencial mais forte específico do nicho identificado na pesquisa

### Métricas (pós-MVP)

- **MTR-v2-01**: Rastreamento de clique granular por funil de produto

## Fora de Escopo

Explicitamente excluído do MVP. Documentado para evitar scope creep.

| Funcionalidade | Motivo |
|---------|--------|
| Gateway de pagamento / checkout / carrinho | Monetização adiada até validar que revendedores recebem pedidos reais — decisão do usuário registrada no PROJECT.md |
| Pipeline completo de CRM/pedidos (status, histórico, base de clientes) | O WhatsApp já é o sistema real de gestão do pedido; duplicar isso cria um segundo registro sempre desatualizado |
| Sincronização automática de estoque com fornecedor (Yupoo/1688) | Fornecedores não expõem API de estoque estruturada; auto-inferir estoque de uma fonte raspada viola o requisito de estoque sempre confiável |
| Contas multi-vendedor / equipe | Perfil de cliente atual é revendedor solo/pequeno, não distribuidor com equipe de vendas |
| Descrições de produto geradas por IA | Descrições neste nicho são curtas e formulaicas; o diferencial real é completude de dados e fotos, não prosa |
| Integração com WhatsApp Business API oficial (chatbot, respostas automáticas) | Exige verificação Meta Business e custo por conversa — desproporcional para revendedor solo no tier gratuito |
| Múltiplos catálogos por revendedor (pronta entrega vs. sob encomenda separados) | Requer redesenho deliberado do modelo de slug/roteamento; adiar até pós-MVP |
| Notificação por e-mail de produto esgotado | Revendedor vive no WhatsApp, não no e-mail, para esse fluxo de trabalho |
| Analytics avançado (funis, retenção, cohort) | Contadores básicos (acessos, cliques, mais vistos) bastam para provar a hipótese central do MVP |
| OAuth login | Email/senha é suficiente para esse público não-técnico; reduz escopo de auth |
| Plano Pro com cobrança real | Adiado até o produto ser validado — ver Business Context no PROJECT.md |

## Rastreabilidade

Quais fases cobrem quais requisitos. Atualizado durante a criação do roadmap.

| Requisito | Fase | Status |
|-----------|------|--------|
| AUTH-01 | — | Pendente |
| AUTH-02 | — | Pendente |
| AUTH-03 | — | Pendente |
| AUTH-04 | — | Pendente |
| LOJA-01 | — | Pendente |
| LOJA-02 | — | Pendente |
| LOJA-03 | — | Pendente |
| LOJA-04 | — | Pendente |
| WPP-01 | — | Pendente |
| WPP-02 | — | Pendente |
| PROD-01 | — | Pendente |
| PROD-02 | — | Pendente |
| PROD-03 | — | Pendente |
| PROD-04 | — | Pendente |
| PROD-05 | — | Pendente |
| PROD-06 | — | Pendente |
| PROD-07 | — | Pendente |
| VITR-01 | — | Pendente |
| VITR-02 | — | Pendente |
| VITR-03 | — | Pendente |
| VITR-04 | — | Pendente |
| VITR-05 | — | Pendente |
| PED-01 | — | Pendente |
| PED-02 | — | Pendente |
| PED-03 | — | Pendente |
| PED-04 | — | Pendente |
| MTR-01 | — | Pendente |
| MTR-02 | — | Pendente |

**Cobertura:**
- Requisitos v1: 28 total
- Mapeados para fases: 0 (aguardando roadmap)
- Não mapeados: 28 ⚠️

---
*Requisitos definidos: 2026-07-10*
*Última atualização: 2026-07-10 após definição inicial*
