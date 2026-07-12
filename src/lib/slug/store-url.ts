const DEFAULT_SITE_ORIGIN = "https://vitrino.app";

/**
 * Constrói a URL pública completa da vitrine a partir do slug da loja.
 *
 * Lê `NEXT_PUBLIC_SITE_URL` (opcional — cai no origin literal padrão
 * enquanto o app não estiver hospedado, ver `user_setup` do 02-02-PLAN.md)
 * e sempre remove uma barra final da base configurada para nunca produzir
 * `//loja` no resultado.
 */
export function buildStoreUrl(slug: string): string {
  const configuredBase = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const base = configuredBase && configuredBase.length > 0 ? configuredBase : DEFAULT_SITE_ORIGIN;
  const trimmedBase = base.replace(/\/+$/, "");
  return `${trimmedBase}/loja/${slug}`;
}
