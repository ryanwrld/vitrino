# Roadmap: Vitrino

## Overview

Vitrino nasce da base para o pico de conversão. Primeiro estabelecemos a fundação multi-tenant (conta do revendedor + isolamento por RLS + rota pública sem auth), depois a configuração da loja — onde travamos a normalização do número de WhatsApp que o fluxo de pedido vai consumir. Em seguida vem o CRUD de produtos com pipeline de mídia, a vitrine pública com filtros e paginação, e então a fase crítica e inegociável: o fluxo de pedido no WhatsApp, testado exaustivamente em uma matriz de dispositivos e navegadores. Por fim, agregamos os eventos coletados em um dashboard de métricas simples. Cada fase entrega uma fatia vertical utilizável e valida as armadilhas específicas identificadas na pesquisa antes da fase seguinte começar.

## Phases

**Numeração de Fases:**
- Fases inteiras (1, 2, 3): trabalho planejado do milestone
- Fases decimais (2.1, 2.2): inserções urgentes (marcadas com INSERTED)

Fases decimais aparecem entre suas fases inteiras vizinhas, em ordem numérica.

- [ ] **Phase 1: Fundação, Conta e Isolamento Multi-Tenant** - Revendedor cria conta e entra, sobre uma base de dados isolada por RLS com rota pública garantidamente sem auth
- [ ] **Phase 2: Painel e Configuração da Loja** - Revendedor configura identidade da loja, link compartilhável (slug/QR) e WhatsApp com número normalizado
- [ ] **Phase 3: CRUD de Produtos e Pipeline de Mídia** - Revendedor cadastra, edita e gerencia produtos com fotos comprimidas e controle de estoque
- [ ] **Phase 4: Vitrine Pública e Filtragem** - Cliente final acessa a vitrine sem login, filtra e navega produtos paginados com estoque atualizado
- [ ] **Phase 5: Fluxo de Pedido no WhatsApp (CRÍTICO)** - Cliente seleciona tamanho e dispara mensagem de pedido pronta no WhatsApp, validada em matriz de dispositivos
- [ ] **Phase 6: Métricas e Dashboard** - Revendedor visualiza acessos, produtos mais vistos, cliques no WhatsApp e resumo da loja

## Phase Details

### Phase 1: Fundação, Conta e Isolamento Multi-Tenant
**Goal**: O revendedor consegue criar conta, entrar, permanecer autenticado e sair do painel, sobre uma base de dados multi-tenant onde cada revendedor só enxerga os próprios dados e a vitrine pública nunca é bloqueada por autenticação.
**Mode:** mvp
**Depends on**: Nada (primeira fase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (o que precisa ser VERDADE):
  1. Revendedor cria conta com email e senha e é levado ao painel autenticado
  2. Revendedor faz login e continua logado após refresh do navegador; faz logout a partir de qualquer página do painel
  3. Sessão é renovada automaticamente durante atividade e avisa claramente antes de expirar, sem perder trabalho não salvo
  4. Teste de isolamento entre dois tenants passa: dados de um revendedor nunca aparecem para outro (RLS habilitado em toda tabela)
  5. Teste de fumaça confirma que `/loja/[slug]` responde sem auth (middleware escopado apenas a `/admin/:path*`) e o slug tem constraint UNIQUE no banco
**Plans**: TBD
**UI hint**: yes

### Phase 2: Painel e Configuração da Loja
**Goal**: O revendedor consegue configurar a identidade da loja, gerar seu link compartilhável (slug único, QR Code, cópia com um clique) e cadastrar o número de WhatsApp normalizado e o template de mensagem — travando a normalização de telefone antes do fluxo de pedido depender dela.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: LOJA-01, LOJA-02, LOJA-03, LOJA-04, WPP-01, WPP-02
**Success Criteria** (o que precisa ser VERDADE):
  1. Revendedor configura nome da loja, logo, cor de destaque e frase de apresentação (máx. 100 caracteres) e vê toast de sucesso ao salvar
  2. Revendedor define um slug personalizado com validação de unicidade em tempo real; slug duplicado é rejeitado com mensagem amigável
  3. Revendedor gera e baixa o QR Code do link e copia o link da vitrine com um clique
  4. Revendedor cadastra o número de WhatsApp normalizado automaticamente para o padrão E.164 (55DDXXXXXXXXX), com confirmação visual do número final; testes unitários cobrem casos malformados
  5. Revendedor edita o template de mensagem padrão com as variáveis {modelo}, {solado}, {tamanho} e {preço}
**Plans**: TBD
**UI hint**: yes

### Phase 3: CRUD de Produtos e Pipeline de Mídia
**Goal**: O revendedor consegue cadastrar, editar, excluir e organizar produtos completos com fotos comprimidas, controlando disponibilidade por produto e por tamanho, sempre com feedback visual imediato.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, PROD-06, PROD-07
**Success Criteria** (o que precisa ser VERDADE):
  1. Revendedor cadastra produto com nome do modelo, marca, tipo de solado, categoria, modalidade, preço em BRL e tamanhos disponíveis (grid 36-45)
  2. Revendedor faz upload de até 5 fotos por produto com compressão automática no cliente, limite rígido de 5MB por imagem e feedback de progresso; orientação EXIF exibida corretamente
  3. Revendedor marca o produto inteiro ou um tamanho específico como disponível ou esgotado
  4. Revendedor edita, exclui, lista, busca por nome, filtra (status/marca/solado) e ordena (mais recente/nome/preço) produtos no painel
  5. Cada ação (salvar, editar, excluir, marcar esgotado) dispara toast de sucesso ou erro imediato
**Plans**: TBD
**UI hint**: yes

### Phase 4: Vitrine Pública e Filtragem
**Goal**: O cliente final consegue acessar a vitrine pública via link/slug sem login, filtrar produtos com estado compartilhável na URL, navegar por carregamento paginado e ver o estado de estoque atualizado, sem layout quebrado por imagens com erro.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: VITR-01, VITR-02, VITR-03, VITR-04, VITR-05
**Success Criteria** (o que precisa ser VERDADE):
  1. Cliente final abre a vitrine pública pelo slug sem necessidade de login ou cadastro
  2. Cliente filtra produtos por marca, solado e modalidade, com os filtros persistidos em parâmetros de query da URL; abrir a URL filtrada nova reproduz a mesma visualização
  3. Estado de estoque (disponível/esgotado) exibido na vitrine reflete o painel do revendedor com delay máximo de segundos
  4. Vitrine carrega produtos paginados (~20 por carga) em vez de renderizar tudo de uma vez, sem reload completo
  5. Imagem com erro de carregamento exibe um placeholder visual padrão sem quebrar o layout do card
**Plans**: TBD
**UI hint**: yes

### Phase 5: Fluxo de Pedido no WhatsApp (CRÍTICO)
**Goal**: O cliente final consegue selecionar um tamanho disponível e disparar uma mensagem de pedido pronta e corretamente codificada no WhatsApp do revendedor — a única conversão que importa — funcionando de forma confiável em toda a matriz obrigatória de dispositivos e navegadores.
**Mode:** mvp
**Depends on**: Phase 2 (número de WhatsApp normalizado), Phase 4
**Requirements**: PED-01, PED-02, PED-03, PED-04
**Success Criteria** (o que precisa ser VERDADE):
  1. Botão "Pedir agora" só fica ativo/clicável depois que um tamanho disponível é selecionado
  2. Tamanhos esgotados não são clicáveis/selecionáveis (visual riscado + `pointer-events: none`), com revalidação no momento do clique (incluindo clique rápido e Enter no teclado)
  3. "Pedir agora" abre o WhatsApp com a mensagem pré-preenchida (modelo, solado, tamanho, preço) codificada via `encodeURIComponent` exatamente uma vez, com acentos e caracteres especiais exibidos corretamente e sem codificação dupla
  4. Clicar em "Pedir agora" sem tamanho selecionado dispara shake animation + tooltip "Selecione um tamanho", nunca abrindo mensagem incompleta
  5. Fallback de copiar mensagem/número para a área de transferência funciona caso o link falhe; clique no WhatsApp é registrado (fire-and-forget)

**Matriz de teste obrigatória (bloqueador de encerramento):**
- Android: Chrome, Samsung Internet, Firefox
- iOS: Safari, Chrome
- In-app: navegador do Instagram, navegador do WhatsApp
- Dados de teste: números reais de WhatsApp BR, nomes de produto acentuados, template multi-linha

**Plans**: TBD
**UI hint**: yes

### Phase 6: Métricas e Dashboard
**Goal**: O revendedor consegue visualizar métricas básicas de desempenho da vitrine e um resumo do estado da loja, agregando os eventos coletados nas fases anteriores em contadores simples e úteis.
**Mode:** mvp
**Depends on**: Phase 4 (pageviews), Phase 5 (cliques no WhatsApp)
**Requirements**: MTR-01, MTR-02
**Success Criteria** (o que precisa ser VERDADE):
  1. Revendedor visualiza métricas básicas: acessos à vitrine, produtos mais visualizados e cliques no botão WhatsApp por produto
  2. Dashboard exibe métricas resumidas (total de produtos, disponíveis, esgotados, acessos) e uma lista de produtos recentes
**Plans**: TBD
**UI hint**: yes

## Progress

**Ordem de Execução:**
As fases executam em ordem numérica: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundação, Conta e Isolamento Multi-Tenant | 0/TBD | Not started | - |
| 2. Painel e Configuração da Loja | 0/TBD | Not started | - |
| 3. CRUD de Produtos e Pipeline de Mídia | 0/TBD | Not started | - |
| 4. Vitrine Pública e Filtragem | 0/TBD | Not started | - |
| 5. Fluxo de Pedido no WhatsApp (CRÍTICO) | 0/TBD | Not started | - |
| 6. Métricas e Dashboard | 0/TBD | Not started | - |
