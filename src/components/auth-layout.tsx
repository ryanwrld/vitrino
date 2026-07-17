import type { ReactNode } from "react";
import { VitrinoLogo } from "@/components/vitrino-logo";

/**
 * Layout compartilhado das 4 telas de auth (login/cadastro/esqueci-senha/
 * redefinir-senha) — split-screen com o painel de marca à direita, conforme
 * o Design System (`ui_kits/admin/Auth.jsx`, componente `AuthLayout`). O
 * painel direito é decorativo e escondido no mobile (`hidden md:flex`),
 * mesma convenção de breakpoint do `admin-sidebar.tsx`.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh">
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex items-center gap-2">
            <VitrinoLogo size={30} className="text-primary" />
            <span className="font-display text-lg font-extrabold text-gray-900">Vitrino</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-gray-900">{title}</h1>
            {subtitle && <p className="text-base text-gray-500">{subtitle}</p>}
          </div>

          {children}
          {footer}
        </div>
      </div>

      <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-primary md:flex">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08) 0, transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.06) 0, transparent 40%)",
          }}
          aria-hidden="true"
        />
        <div className="relative flex max-w-sm flex-col items-center gap-8 p-8 text-white">
          <div className="flex flex-col gap-3.5 text-center">
            <span className="font-display text-2xl font-extrabold leading-tight">
              Do WhatsApp para uma vitrine profissional.
            </span>
            <span className="text-base leading-normal text-white/85">
              Cadastre seus produtos uma vez e compartilhe um único link. Seus clientes escolhem o
              tamanho e o pedido cai pronto no seu WhatsApp.
            </span>
          </div>

          {/*
           * Mockup de vitrine em CSS/HTML puro (D-04 do brief de redesign) —
           * decorativo, mostra o produto em ação no split-screen do login.
           * Sem asset externo/imagem; toda a "foto" de produto é um bloco
           * com degradê de tokens do DS. `motion-safe:` garante fallback
           * estático legível sob `prefers-reduced-motion: reduce`.
           */}
          <div
            className="login-mockup relative w-[248px] rotate-[-4deg] rounded-[28px] border border-white/20 bg-white p-3 shadow-md motion-safe:animate-fade-in"
            aria-hidden="true"
          >
            <div className="flex items-center gap-1.5 px-1 pb-2.5">
              <VitrinoLogo size={16} className="text-primary" />
              <span className="text-[11px] font-bold text-gray-900">Chuteiras do Léo</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[{ price: "R$ 349" }, { price: "R$ 289" }, { price: "R$ 419" }, { price: "R$ 259" }].map(
                (item, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-white p-1.5"
                  >
                    <div className="h-12 w-full rounded-md bg-gradient-to-br from-surface-panel to-primary-subtle" />
                    <div className="h-1.5 w-4/5 rounded-full bg-gray-200" />
                    <div className="h-1.5 w-1/2 rounded-full bg-gray-200" />
                    <span className="text-[9px] font-bold text-primary">{item.price}</span>
                  </div>
                ),
              )}
            </div>
            <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-whatsapp px-3.5 py-1.5 text-[10px] font-semibold text-white shadow-sm">
              Pedir agora
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function RequiredMark() {
  return (
    <span className="text-error-solid" aria-hidden="true">
      {" "}
      *
    </span>
  );
}
