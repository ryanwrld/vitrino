/**
 * Lockup de marca sem asset de imagem (Seção 2, item 1 do checklist de UI):
 * badge quadrado com a inicial "V" ao lado do wordmark "Vitrino". Componente
 * de apresentação puro, usado nos fluxos de confiança (login, cadastro,
 * esqueci-senha, redefinir-senha, onboarding) para dar identidade de marca
 * a telas que hoje são idênticas e sem nenhum branding.
 */
export type VitrinoWordmarkProps = {
  className?: string;
};

export function VitrinoWordmark({ className }: VitrinoWordmarkProps) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className ?? ""}`}>
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-lg font-bold text-white"
        aria-hidden="true"
      >
        V
      </span>
      <span className="text-xl font-bold text-brand">Vitrino</span>
    </div>
  );
}
