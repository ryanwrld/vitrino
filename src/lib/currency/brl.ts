/**
 * Parser/formatter dedicado de preço em BRL (03-RESEARCH.md Pitfall 3;
 * 03-PATTERNS.md §No Analog Found — não existe precedente direto no
 * codebase, mesmo espírito de `normalizeWhatsAppBR`/`slugify`: uma única
 * fonte de verdade para conversão string<->numeric, nunca `parseFloat` cru
 * sobre o valor digitado).
 *
 * `parseFloat("199,90")` retorna `199` (vírgula não é separador decimal em
 * JS) — um bug silencioso de truncamento. `parseBRLPrice` trata a vírgula
 * como separador decimal e o ponto como separador de milhar antes de
 * converter para `number`, e nunca retorna um valor não-positivo.
 */

/**
 * Converte a string digitada pelo revendedor ("199,90", "R$ 1.299,90", "abc")
 * em um `number` decimal exato o suficiente para `numeric(10,2)` do Postgres.
 * Retorna `null` quando o valor não é um preço válido (não numérico, zero ou
 * negativo) — o chamador (Server Action) trata `null` como erro de validação.
 */
export function parseBRLPrice(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Remove tudo que não seja dígito, vírgula, ponto ou sinal negativo
  // (ex.: "R$", espaços) antes de normalizar separadores.
  const cleaned = trimmed.replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;

  // Ponto é separador de milhar (removido); vírgula é o separador decimal
  // (convertida para ponto, único formato que `Number()` entende).
  const withoutThousandsSeparator = cleaned.replace(/\./g, "");
  const normalized = withoutThousandsSeparator.replace(",", ".");

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;

  return value;
}

/**
 * Formata um `number` (ex.: vindo de `products.price`) como preço BRL para
 * exibição ("R$ 199,90", "R$ 1.299,90"). O espaço não-quebrável (`U+00A0`)
 * que `Intl.NumberFormat` insere entre "R$" e o valor é normalizado para um
 * espaço comum, para previsibilidade em comparações de string/testes.
 */
export function formatBRLPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(value)
    .replace(/ /g, " ");
}
