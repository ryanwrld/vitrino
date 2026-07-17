/**
 * Logotipo do Vitrino — moldura de vitrine (janela de exibição) com uma
 * prateleira e um produto em destaque, no lugar do antigo quadrado azul
 * placeholder. Server component puro, sem estado/interação.
 *
 * Usa `currentColor` em todos os traços/preenchimentos — nunca hex embutido
 * — para herdar a cor do contexto: azul (`text-primary`) no auth de fundo
 * claro, branco (`text-white`) na sidebar escura. Crisp a 28px (grid de
 * 32x32, strokes de 2.5 unidades, só 3 elementos: moldura + prateleira +
 * produto).
 */
export function VitrinoLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="3" y="4" width="26" height="24" rx="6" stroke="currentColor" strokeWidth="2.5" />
      <line x1="6" y1="20" x2="26" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="12" y="10" width="8" height="8" rx="2" fill="currentColor" />
    </svg>
  );
}
