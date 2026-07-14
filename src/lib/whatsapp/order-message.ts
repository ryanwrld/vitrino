/**
 * Montagem pura e testável da mensagem de pedido do WhatsApp (PED-03,
 * 05-RESEARCH.md Pattern 4). Três funções sem DOM, encadeadas: interpolar o
 * template da loja → anexar a linha de foto (D-06) → codificar a URL final.
 *
 * `{preço}` recebe SEMPRE o valor bruto formatado via `formatBRLPriceInput`
 * ("199,90"), NUNCA `formatBRLPrice` (que prefixa "R$") — o
 * `DEFAULT_MESSAGE_TEMPLATE` já tem "Preço: R$ {preço}" fixo como texto
 * estático; usar `formatBRLPrice` aqui duplicaria o "R$" (05-RESEARCH.md
 * Pitfall 7). Esta é responsabilidade do CHAMADOR (que formata o preço antes
 * de montar `vars`) — este módulo só interpola a string já formatada.
 *
 * O número de WhatsApp NÃO é re-normalizado aqui: `whatsapp_e164` já vem
 * normalizado (E.164 apenas-dígitos) do onboarding da Fase 1
 * (`normalizeWhatsAppBR`, `src/lib/phone/normalize-br.ts`) — a Fase 5 só LÊ
 * esse valor persistido. Re-derivar o telefone no momento do clique é
 * exatamente a Armadilha 2 do 01-RESEARCH.md que este módulo evita por
 * construção (nunca importa `libphonenumber-js` nem `normalizeWhatsAppBR`).
 */

type OrderMessageVars = {
  modelo: string;
  solado: string;
  tamanho: string;
  preco: string;
};

/**
 * Substitui as 4 chaves travadas do template da loja (`{modelo}`, `{solado}`,
 * `{tamanho}`, `{preço}` — o `ç` é literal e casa exatamente com
 * `REQUIRED_TEMPLATE_PLACEHOLDERS` em `src/lib/validation/onboarding.ts`).
 * `replaceAll` cobre o caso (raro, mas possível num template customizado
 * pelo revendedor) de a mesma chave aparecer mais de uma vez.
 */
export function interpolateMessageTemplate(
  template: string,
  vars: OrderMessageVars
): string {
  return template
    .replaceAll("{modelo}", vars.modelo)
    .replaceAll("{solado}", vars.solado)
    .replaceAll("{tamanho}", vars.tamanho)
    .replaceAll("{preço}", vars.preco);
}

/**
 * Interpola o template e anexa a linha "Foto: <url>" (D-06) apenas quando há
 * foto de capa (`fotoUrl` não-null); sem foto, retorna só a base interpolada.
 */
export function buildOrderMessage(
  template: string,
  vars: OrderMessageVars & { fotoUrl: string | null }
): string {
  const base = interpolateMessageTemplate(template, vars);
  return vars.fotoUrl ? `${base}\n\nFoto: ${vars.fotoUrl}` : base;
}

/**
 * Monta a URL final `https://wa.me/<digitos>?text=<encoded>`.
 * `encodeURIComponent` é chamado UMA ÚNICA VEZ, sobre a mensagem completa já
 * composta (template + linha de foto) — nunca sobre sub-pedaços separados.
 * Codificar o template e a URL da foto isoladamente causaria codificação
 * dupla/parcial (bug #6 do catálogo do PROJECT.md; regra rígida do
 * CLAUDE.md).
 */
export function buildWhatsAppUrl(
  phoneE164Digits: string,
  message: string
): string {
  return `https://wa.me/${phoneE164Digits}?text=${encodeURIComponent(message)}`;
}
