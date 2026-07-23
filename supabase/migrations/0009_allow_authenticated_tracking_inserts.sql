-- Migration: corrige o tracking de pageviews/order_clicks nunca gravar
-- quando o VISITANTE está autenticado (achado ao vivo, 2026-07-23).
--
-- As policies de insert de `pageviews` (0006) e `order_clicks` (0005) foram
-- escritas `to anon` — cobrem o cliente final real (nunca loga), mas
-- deixam de cobrir o próprio revendedor quando ele visita/testa sua vitrine
-- pública NO MESMO NAVEGADOR em que está logado no painel admin: a sessão
-- carrega o JWT dele, a requisição usa o papel `authenticated`, e não existe
-- nenhuma policy de insert para esse papel — RLS nega em silêncio
-- (`logPageview`/`logOrderClick` só logam o erro via console.error, nunca
-- lançam, então nada trava visualmente, só o dado nunca chega).
--
-- Fix: `ALTER POLICY ... TO public` amplia o mesmo WITH CHECK (inalterado)
-- para valer nos dois papéis (anon + authenticated) — nunca reescreve a
-- condição de segurança em si, só quem ela se aplica.

alter policy "public_insert_pageviews" on pageviews to public;
alter policy "public_insert_order_clicks" on order_clicks to public;
