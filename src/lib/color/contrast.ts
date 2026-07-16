/**
 * Decide se o texto sobre uma cor de fundo escolhida pelo revendedor
 * (accent_color, hex livre via `<input type="color">`) deve ser claro ou
 * escuro — sem isso, uma loja com cor de destaque clara/branca (ex.:
 * `#ffffff`) deixa o nome/tagline do hero (`store-hero.tsx`) ilegível
 * (texto branco sobre fundo branco).
 *
 * Usa luminância relativa (fórmula de contraste do WCAG, sRGB linearizado)
 * em vez de uma checagem ingênua tipo "é branco?" — cobre qualquer cor clara
 * (amarelo pastel, cinza claro etc.), não só o caso branco puro.
 */
export function getContrastTextColor(hex: string): "light" | "dark" {
  const rgb = hexToRgb(hex);
  if (!rgb) return "light";

  const luminance = relativeLuminance(rgb);
  // Limiar padrão de contraste WCAG: acima de ~0.5 de luminância relativa, um
  // texto branco perde contraste suficiente para ser considerado ilegível.
  return luminance > 0.5 ? "dark" : "light";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;

  const value = match[1];
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const [rLin, gLin, bLin] = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}
