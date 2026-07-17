import type { ReactNode } from "react";

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
            <div className="h-[30px] w-[30px] rounded-md bg-primary" aria-hidden="true" />
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
        <div className="relative flex max-w-sm flex-col gap-3.5 p-8 text-white">
          <span className="font-display text-2xl font-extrabold leading-tight">
            Do WhatsApp para uma vitrine profissional.
          </span>
          <span className="text-base leading-normal text-white/85">
            Cadastre seus produtos uma vez e compartilhe um único link. Seus clientes escolhem o
            tamanho e o pedido cai pronto no seu WhatsApp.
          </span>
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
